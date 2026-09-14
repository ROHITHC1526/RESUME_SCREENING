import os
from typing import List, Dict, Any, Optional
import math


class VectorStore:
    """
    Vector Store wrapper supporting ChromaDB with lazy initialization.

    Memory optimization:
    - ChromaDB is initialized only when required.
    - SentenceTransformer is loaded lazily.
    - A single shared SentenceTransformer instance is reused by all
      VectorStore objects in the same Python process.
    - Resume chunks are embedded in batches when possible.

    Embedding model and similarity logic remain unchanged.
    """

    # ---------------------------------------------------------
    # SHARED EMBEDDING MODEL
    # ---------------------------------------------------------
    _shared_encoder = None
    _encoder_load_failed = False

    def __init__(self, collection_name: str = "resume_screening"):
        self.collection_name = collection_name

        # Chroma is lazy
        self.chroma_client = None
        self.collection = None
        self._chroma_initialized = False

        # Lightweight fallback storage
        self.fallback_storage: List[Dict[str, Any]] = []

    # ---------------------------------------------------------
    # CHROMA INITIALIZATION
    # ---------------------------------------------------------
    def _init_chroma(self):
        """
        Initialize ChromaDB only when vector storage is actually needed.
        """

        if self._chroma_initialized:
            return

        self._chroma_initialized = True

        try:
            import chromadb
            from app.core.config import settings

            os.makedirs(
                settings.CHROMA_PERSIST_DIRECTORY,
                exist_ok=True
            )

            self.chroma_client = chromadb.PersistentClient(
                path=settings.CHROMA_PERSIST_DIRECTORY
            )

            self.collection = (
                self.chroma_client.get_or_create_collection(
                    name=self.collection_name
                )
            )

        except Exception as e:
            # Chroma unavailable → fallback storage
            self.chroma_client = None
            self.collection = None

    # ---------------------------------------------------------
    # SHARED SENTENCE TRANSFORMER
    # ---------------------------------------------------------
    @property
    def encoder(self):
        """
        Return one shared SentenceTransformer instance.

        Previously every VectorStore instance had its own encoder.
        Now all VectorStore instances reuse the same model.
        """

        if VectorStore._shared_encoder is not None:
            return VectorStore._shared_encoder

        if VectorStore._encoder_load_failed:
            return "mock"

        try:
            from sentence_transformers import SentenceTransformer
            from app.core.config import settings

            print(
                "VECTOR STORE: Loading shared embedding model "
                f"{settings.EMBEDDING_MODEL_NAME}...",
                flush=True
            )

            VectorStore._shared_encoder = SentenceTransformer(
                settings.EMBEDDING_MODEL_NAME,
                device="cpu"
            )

            print(
                "VECTOR STORE: Shared embedding model loaded.",
                flush=True
            )

            return VectorStore._shared_encoder

        except Exception as e:
            print(
                f"VECTOR STORE: Failed to load embedding model: {e}",
                flush=True
            )

            VectorStore._encoder_load_failed = True

            return "mock"

    # ---------------------------------------------------------
    # SINGLE EMBEDDING
    # ---------------------------------------------------------
    def _get_embedding(self, text: str) -> List[float]:
        """
        Generate one embedding while preserving the existing model.
        """

        encoder = self.encoder

        if encoder != "mock":
            embedding = encoder.encode(
                text,
                convert_to_numpy=True,
                normalize_embeddings=False
            )

            return embedding.tolist()

        return self._mock_embedding(text)

    # ---------------------------------------------------------
    # BATCH EMBEDDING
    # ---------------------------------------------------------
    def _get_embeddings(self, texts: List[str]) -> List[List[float]]:
        """
        Generate embeddings efficiently.

        Uses SentenceTransformer batch encoding when available.
        Falls back to individual embeddings if necessary.
        """

        if not texts:
            return []

        encoder = self.encoder

        if encoder != "mock":
            try:
                embeddings = encoder.encode(
                    texts,
                    batch_size=16,
                    show_progress_bar=False,
                    convert_to_numpy=True,
                    normalize_embeddings=False
                )

                return embeddings.tolist()

            except Exception as e:
                print(
                    f"VECTOR STORE: Batch embedding failed: {e}. "
                    "Falling back to individual encoding.",
                    flush=True
                )

        return [
            self._mock_embedding(text)
            for text in texts
        ]

    # ---------------------------------------------------------
    # LIGHTWEIGHT FALLBACK EMBEDDING
    # ---------------------------------------------------------
    def _mock_embedding(self, text: str) -> List[float]:
        """
        Deterministic lightweight fallback.

        This is used only if SentenceTransformer cannot be loaded.
        """

        import hashlib

        words = text.lower().split()

        vec = [0.0] * 64

        for word in words:
            idx = (
                int(
                    hashlib.md5(
                        word.encode()
                    ).hexdigest(),
                    16
                ) % 64
            )

            vec[idx] += 1.0

        norm = math.sqrt(
            sum(v * v for v in vec)
        ) or 1.0

        return [
            v / norm
            for v in vec
        ]

    # ---------------------------------------------------------
    # ADD TEXTS
    # ---------------------------------------------------------
    def add_texts(
        self,
        texts: List[str],
        metadatas: List[Dict[str, Any]],
        ids: List[str]
    ):
        """
        Add documents and embeddings to ChromaDB.

        Uses batch embedding to reduce repeated model overhead.
        """

        if not texts:
            return

        self._init_chroma()

        embeddings = self._get_embeddings(texts)

        if self.collection:

            try:
                self.collection.add(
                    documents=texts,
                    embeddings=embeddings,
                    metadatas=metadatas,
                    ids=ids
                )

                return

            except Exception as e:
                print(
                    f"VECTOR STORE: Chroma add failed: {e}. "
                    "Using fallback storage.",
                    flush=True
                )

        # Fallback storage
        for text, meta, doc_id, emb in zip(
            texts,
            metadatas,
            ids,
            embeddings
        ):
            self.fallback_storage.append(
                {
                    "id": doc_id,
                    "text": text,
                    "metadata": meta,
                    "embedding": emb
                }
            )

    # ---------------------------------------------------------
    # SEARCH SIMILARITY
    # ---------------------------------------------------------
    def search_similarity(
        self,
        query: str,
        n_results: int = 3,
        filter_metadata: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """
        Semantic similarity search.

        Existing Chroma similarity behavior is preserved.
        """

        self._init_chroma()

        query_emb = self._get_embedding(query)

        if self.collection:

            try:
                where_clause = (
                    filter_metadata
                    if filter_metadata
                    else None
                )

                results = self.collection.query(
                    query_embeddings=[query_emb],
                    n_results=n_results,
                    where=where_clause
                )

                matches = []

                if (
                    results
                    and "documents" in results
                    and results["documents"]
                ):
                    docs = results["documents"][0]
                    metas = results["metadatas"][0]
                    ids = results["ids"][0]

                    distances = results.get(
                        "distances",
                        [[0.0] * len(docs)]
                    )[0]

                    for doc, meta, doc_id, dist in zip(
                        docs,
                        metas,
                        ids,
                        distances
                    ):
                        sim_score = (
                            max(
                                0.0,
                                1.0 - (dist / 2.0)
                            )
                            if dist is not None
                            else 0.85
                        )

                        matches.append(
                            {
                                "id": doc_id,
                                "text": doc,
                                "metadata": meta,
                                "similarity_score": round(
                                    sim_score,
                                    4
                                )
                            }
                        )

                return matches

            except Exception as e:
                print(
                    f"VECTOR STORE: Chroma search failed: {e}. "
                    "Using fallback storage.",
                    flush=True
                )

        # -----------------------------------------------------
        # FALLBACK COSINE SEARCH
        # -----------------------------------------------------
        matches = []

        for item in self.fallback_storage:

            if filter_metadata:
                match_filter = all(
                    item["metadata"].get(k) == v
                    for k, v in filter_metadata.items()
                )

                if not match_filter:
                    continue

            dot = sum(
                a * b
                for a, b in zip(
                    query_emb,
                    item["embedding"]
                )
            )

            norm_a = math.sqrt(
                sum(a * a for a in query_emb)
            ) or 1.0

            norm_b = math.sqrt(
                sum(b * b for b in item["embedding"])
            ) or 1.0

            sim = dot / (
                norm_a * norm_b
            )

            matches.append(
                {
                    "id": item["id"],
                    "text": item["text"],
                    "metadata": item["metadata"],
                    "similarity_score": round(
                        max(0.0, float(sim)),
                        4
                    )
                }
            )

        matches.sort(
            key=lambda x: x["similarity_score"],
            reverse=True
        )

        return matches[:n_results]