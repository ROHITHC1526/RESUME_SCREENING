import os
import math
import re
from difflib import SequenceMatcher
from typing import List, Dict, Any, Optional


class VectorStore:
    """
    Memory-safe vector store.

    LOCAL:
        Uses SentenceTransformer + ChromaDB when
        VECTOR_STORE_LIGHTWEIGHT is disabled.

    RENDER / LOW MEMORY:
        Uses lightweight pure-Python lexical similarity.
        This avoids loading Torch, SentenceTransformers,
        and ChromaDB into the Render 512 MB instance.

    IMPORTANT:
        The LLM/Groq analysis is NOT changed.
        Only the optional vector retrieval layer changes.
    """

    # Shared lightweight storage so different VectorStore
    # instances can see the same collections in one process.
    _lightweight_collections: Dict[str, List[Dict[str, Any]]] = {}

    # Shared SentenceTransformer for LOCAL mode only.
    _shared_encoder = None
    _encoder_load_failed = False

    def __init__(self, collection_name: str = "resume_screening"):
        self.collection_name = collection_name

        # Detect lightweight mode.
        self.lightweight_mode = (
            os.getenv("VECTOR_STORE_LIGHTWEIGHT", "false")
            .strip()
            .lower()
            in ("1", "true", "yes", "on")
        )

        self.chroma_client = None
        self.collection = None
        self._chroma_initialized = False

        # Shared lightweight collection
        if collection_name not in VectorStore._lightweight_collections:
            VectorStore._lightweight_collections[collection_name] = []

        self.fallback_storage = VectorStore._lightweight_collections[
            collection_name
        ]

    # =========================================================
    # CHROMA INITIALIZATION - LOCAL ONLY
    # =========================================================

    def _init_chroma(self):
        """
        Initialize ChromaDB only in full/local mode.
        Never load ChromaDB when lightweight mode is enabled.
        """

        if self.lightweight_mode:
            return

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

            print(
                "VECTOR STORE: ChromaDB enabled.",
                flush=True
            )

        except Exception as e:
            self.chroma_client = None
            self.collection = None

            print(
                f"VECTOR STORE: ChromaDB unavailable: {e}",
                flush=True
            )

    # =========================================================
    # SENTENCE TRANSFORMER - LOCAL ONLY
    # =========================================================

    @property
    def encoder(self):
        """
        Load SentenceTransformer only in full/local mode.

        In lightweight mode this property never imports:
            - torch
            - sentence_transformers
        """

        if self.lightweight_mode:
            return "mock"

        if VectorStore._shared_encoder is not None:
            return VectorStore._shared_encoder

        if VectorStore._encoder_load_failed:
            return "mock"

        try:
            from sentence_transformers import SentenceTransformer
            from app.core.config import settings

            print(
                "VECTOR STORE: Loading local embedding model "
                f"{settings.EMBEDDING_MODEL_NAME}...",
                flush=True
            )

            VectorStore._shared_encoder = SentenceTransformer(
                settings.EMBEDDING_MODEL_NAME,
                device="cpu"
            )

            print(
                "VECTOR STORE: Local embedding model loaded.",
                flush=True
            )

            return VectorStore._shared_encoder

        except Exception as e:
            print(
                f"VECTOR STORE: Embedding model failed: {e}",
                flush=True
            )

            VectorStore._encoder_load_failed = True

            return "mock"

    # =========================================================
    # TEXT NORMALIZATION
    # =========================================================

    @staticmethod
    def _tokens(text: str) -> List[str]:
        """
        Lightweight tokenizer.

        No external ML libraries are required.
        """

        if not text:
            return []

        text = text.lower()

        # Preserve useful technical terms:
        # c++, c#, .net, node.js, aws, etc.
        tokens = re.findall(
            r"[a-zA-Z0-9]+(?:[.+#-][a-zA-Z0-9]+)*",
            text
        )

        # Remove extremely common English words.
        stop_words = {
            "the",
            "and",
            "or",
            "a",
            "an",
            "to",
            "of",
            "in",
            "on",
            "for",
            "with",
            "is",
            "are",
            "be",
            "as",
            "at",
            "by",
            "from",
            "this",
            "that",
            "using",
            "use",
            "used",
            "experience",
            "required",
            "preferred",
            "knowledge",
            "skill",
            "skills",
            "developer",
            "development",
        }

        return [
            token
            for token in tokens
            if token not in stop_words
            and len(token) > 1
        ]

    # =========================================================
    # LIGHTWEIGHT SIMILARITY
    # =========================================================

    @classmethod
    def _lightweight_similarity(
        cls,
        query: str,
        document: str
    ) -> float:
        """
        Lightweight similarity score.

        Combines:
            1. Token overlap
            2. Sequence similarity
            3. Technical phrase matching

        Returns 0.0 - 1.0.
        """

        query_tokens = cls._tokens(query)
        doc_tokens = cls._tokens(document)

        if not query_tokens or not doc_tokens:
            return 0.0

        query_set = set(query_tokens)
        doc_set = set(doc_tokens)

        # Jaccard overlap
        intersection = query_set & doc_set
        union = query_set | doc_set

        jaccard = (
            len(intersection) / len(union)
            if union
            else 0.0
        )

        # Query coverage
        coverage = (
            len(intersection) / len(query_set)
            if query_set
            else 0.0
        )

        # Sequence similarity
        query_normalized = " ".join(query_tokens)
        doc_normalized = " ".join(doc_tokens)

        sequence_score = SequenceMatcher(
            None,
            query_normalized,
            doc_normalized
        ).ratio()

        # Technical phrase matching
        phrase_score = 0.0

        query_lower = query.lower()
        doc_lower = document.lower()

        if query_lower in doc_lower:
            phrase_score = 1.0
        else:
            # Check multi-word phrases
            query_words = query_lower.split()

            if len(query_words) >= 2:
                matched_phrases = 0

                for i in range(len(query_words) - 1):
                    phrase = (
                        query_words[i]
                        + " "
                        + query_words[i + 1]
                    )

                    if phrase in doc_lower:
                        matched_phrases += 1

                possible = max(1, len(query_words) - 1)

                phrase_score = (
                    matched_phrases / possible
                )

        # Weighted score
        score = (
            (coverage * 0.45)
            + (jaccard * 0.25)
            + (sequence_score * 0.15)
            + (phrase_score * 0.15)
        )

        return min(
            1.0,
            max(
                0.0,
                float(score)
            )
        )

    # =========================================================
    # EMBEDDING - LOCAL ONLY
    # =========================================================

    def _get_embedding(self, text: str) -> List[float]:
        """
        Full embedding in LOCAL mode.

        Lightweight mode intentionally does not create
        real embeddings because that would require heavy ML
        dependencies.
        """

        encoder = self.encoder

        if encoder != "mock":

            embedding = encoder.encode(
                text,
                convert_to_numpy=True,
                normalize_embeddings=False
            )

            return embedding.tolist()

        # Deterministic lightweight vector.
        import hashlib

        words = self._tokens(text)

        vec = [0.0] * 64

        for word in words:

            idx = (
                int(
                    hashlib.md5(
                        word.encode()
                    ).hexdigest(),
                    16
                )
                % 64
            )

            vec[idx] += 1.0

        norm = math.sqrt(
            sum(
                value * value
                for value in vec
            )
        ) or 1.0

        return [
            value / norm
            for value in vec
        ]

    # =========================================================
    # ADD TEXTS
    # =========================================================

    def add_texts(
        self,
        texts: List[str],
        metadatas: List[Dict[str, Any]],
        ids: List[str]
    ):
        """
        Add documents.

        Lightweight mode:
            Stores text + metadata only.

        Local mode:
            Uses ChromaDB + SentenceTransformer.
        """

        if not texts:
            return

        # -----------------------------------------------------
        # RENDER / LIGHTWEIGHT MODE
        # -----------------------------------------------------

        if self.lightweight_mode:

            for text, meta, doc_id in zip(
                texts,
                metadatas,
                ids
            ):

                self.fallback_storage.append(
                    {
                        "id": doc_id,
                        "text": text,
                        "metadata": meta
                    }
                )

            print(
                f"VECTOR STORE: Lightweight mode stored "
                f"{len(texts)} documents in "
                f"'{self.collection_name}'.",
                flush=True
            )

            return

        # -----------------------------------------------------
        # LOCAL FULL MODE
        # -----------------------------------------------------

        self._init_chroma()

        embeddings = [
            self._get_embedding(text)
            for text in texts
        ]

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
                    f"VECTOR STORE: Chroma add failed: {e}",
                    flush=True
                )

        # Local fallback
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

    # =========================================================
    # SEARCH
    # =========================================================

    def search_similarity(
        self,
        query: str,
        n_results: int = 3,
        filter_metadata: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """
        Search documents.

        Lightweight mode:
            Pure Python similarity.

        Local mode:
            ChromaDB semantic similarity.
        """

        # -----------------------------------------------------
        # RENDER / LIGHTWEIGHT SEARCH
        # -----------------------------------------------------

        if self.lightweight_mode:

            matches = []

            for item in self.fallback_storage:

                if filter_metadata:

                    match_filter = all(
                        item["metadata"].get(k) == v
                        for k, v in filter_metadata.items()
                    )

                    if not match_filter:
                        continue

                score = self._lightweight_similarity(
                    query,
                    item["text"]
                )

                matches.append(
                    {
                        "id": item["id"],
                        "text": item["text"],
                        "metadata": item["metadata"],
                        "similarity_score": round(
                            score,
                            4
                        )
                    }
                )

            matches.sort(
                key=lambda x: x["similarity_score"],
                reverse=True
            )

            return matches[:n_results]

        # -----------------------------------------------------
        # LOCAL FULL MODE
        # -----------------------------------------------------

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
                    f"VECTOR STORE: Chroma search failed: {e}",
                    flush=True
                )

        # -----------------------------------------------------
        # LOCAL FALLBACK COSINE SEARCH
        # -----------------------------------------------------

        matches = []

        for item in self.fallback_storage:

            if "embedding" not in item:
                continue

            if filter_metadata:

                match_filter = all(
                    item["metadata"].get(k) == v
                    for k, v in filter_metadata.items()
                )

                if not match_filter:
                    continue

            item_embedding = item["embedding"]

            dot = sum(
                a * b
                for a, b in zip(
                    query_emb,
                    item_embedding
                )
            )

            norm_a = math.sqrt(
                sum(
                    a * a
                    for a in query_emb
                )
            ) or 1.0

            norm_b = math.sqrt(
                sum(
                    b * b
                    for b in item_embedding
                )
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
                        max(
                            0.0,
                            float(sim)
                        ),
                        4
                    )
                }
            )

        matches.sort(
            key=lambda x: x["similarity_score"],
            reverse=True
        )

        return matches[:n_results]