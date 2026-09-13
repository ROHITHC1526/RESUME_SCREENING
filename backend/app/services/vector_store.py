import os
from typing import List, Dict, Any, Optional
import math

class VectorStore:
    """
    Vector Store wrapper supporting ChromaDB with an in-memory/cosine similarity adapter
    fallback for instant execution.
    """

    def __init__(self, collection_name: str = "resume_screening"):
        self.collection_name = collection_name
        self.chroma_client = None
        self.collection = None
        self.fallback_storage: List[Dict[str, Any]] = []

        try:
            import chromadb
            from app.core.config import settings
            os.makedirs(settings.CHROMA_PERSIST_DIRECTORY, exist_ok=True)
            self.chroma_client = chromadb.PersistentClient(path=settings.CHROMA_PERSIST_DIRECTORY)
            self.collection = self.chroma_client.get_or_create_collection(name=collection_name)
        except Exception:
            # Fallback to internal list storage if Chroma native binaries missing
            pass

        self._encoder = None

    @property
    def encoder(self):
        if self._encoder is None:
            try:
                from sentence_transformers import SentenceTransformer
                from app.core.config import settings
                self._encoder = SentenceTransformer(settings.EMBEDDING_MODEL_NAME)
            except Exception:
                self._encoder = "mock"
        return self._encoder

    def _get_embedding(self, text: str) -> List[float]:
        if self.encoder != "mock":
            return self.encoder.encode(text).tolist()
        else:
            # Hash-based deterministic pseudo-vector for lightweight offline test mode
            import hashlib
            words = text.lower().split()
            vec = [0.0] * 64
            for i, w in enumerate(words):
                idx = int(hashlib.md5(w.encode()).hexdigest(), 16) % 64
                vec[idx] += 1.0
            norm = math.sqrt(sum(v*v for v in vec)) or 1.0
            return [v/norm for v in vec]

    def add_texts(self, texts: List[str], metadatas: List[Dict[str, Any]], ids: List[str]):
        embeddings = [self._get_embedding(t) for t in texts]

        if self.collection:
            try:
                self.collection.add(
                    documents=texts,
                    embeddings=embeddings,
                    metadatas=metadatas,
                    ids=ids
                )
                return
            except Exception:
                pass

        for text, meta, doc_id, emb in zip(texts, metadatas, ids, embeddings):
            self.fallback_storage.append({
                "id": doc_id,
                "text": text,
                "metadata": meta,
                "embedding": emb
            })

    def search_similarity(
        self,
        query: str,
        n_results: int = 3,
        filter_metadata: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        query_emb = self._get_embedding(query)

        if self.collection:
            try:
                where_clause = filter_metadata if filter_metadata else None
                results = self.collection.query(
                    query_embeddings=[query_emb],
                    n_results=n_results,
                    where=where_clause
                )
                matches = []
                if results and "documents" in results and results["documents"]:
                    docs = results["documents"][0]
                    metas = results["metadatas"][0]
                    ids = results["ids"][0]
                    distances = results.get("distances", [[0.0]*len(docs)])[0]
                    for doc, meta, doc_id, dist in zip(docs, metas, ids, distances):
                        sim_score = max(0.0, 1.0 - (dist / 2.0)) if dist is not None else 0.85
                        matches.append({
                            "id": doc_id,
                            "text": doc,
                            "metadata": meta,
                            "similarity_score": round(sim_score, 4)
                        })
                return matches
            except Exception:
                pass

        # Fallback cosine search
        matches = []
        for item in self.fallback_storage:
            if filter_metadata:
                match_filter = all(item["metadata"].get(k) == v for k, v in filter_metadata.items())
                if not match_filter:
                    continue

            # Cosine similarity
            dot = sum(a * b for a, b in zip(query_emb, item["embedding"]))
            norm_a = math.sqrt(sum(a * a for a in query_emb)) or 1.0
            norm_b = math.sqrt(sum(b * b for b in item["embedding"])) or 1.0
            sim = dot / (norm_a * norm_b)

            matches.append({
                "id": item["id"],
                "text": item["text"],
                "metadata": item["metadata"],
                "similarity_score": round(max(0.0, float(sim)), 4)
            })

        matches.sort(key=lambda x: x["similarity_score"], reverse=True)
        return matches[:n_results]
