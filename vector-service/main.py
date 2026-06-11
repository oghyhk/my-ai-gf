from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import chromadb
import uuid
import os

app = FastAPI(title="AI Companion Vector Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize ChromaDB with persistent storage
CHROMA_DIR = os.path.join(os.path.dirname(__file__), "chroma_data")
client = chromadb.PersistentClient(path=CHROMA_DIR)

COLLECTION_NAME = "memory_fragments"

def get_collection():
    return client.get_or_create_collection(
        name=COLLECTION_NAME,
        metadata={"hnsw:space": "cosine"}
    )


class StoreRequest(BaseModel):
    content: str
    embedding: list[float]
    metadata: Optional[dict] = None


class SearchRequest(BaseModel):
    embedding: list[float]
    n_results: int = 20


class StoreResponse(BaseModel):
    id: str


class SearchResult(BaseModel):
    id: str
    content: str
    metadata: dict
    distance: float


class SearchResponse(BaseModel):
    results: list[SearchResult]


@app.post("/store", response_model=StoreResponse)
async def store_vector(req: StoreRequest):
    try:
        collection = get_collection()
        doc_id = str(uuid.uuid4())
        
        collection.add(
            ids=[doc_id],
            embeddings=[req.embedding],
            documents=[req.content],
            metadatas=[req.metadata or {}],
        )
        
        return StoreResponse(id=doc_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/search", response_model=SearchResponse)
async def search_vectors(req: SearchRequest):
    try:
        collection = get_collection()
        
        if collection.count() == 0:
            return SearchResponse(results=[])
        
        n = min(req.n_results, collection.count())
        
        results = collection.query(
            query_embeddings=[req.embedding],
            n_results=n,
            include=["documents", "metadatas", "distances"],
        )
        
        items = []
        if results["ids"] and results["ids"][0]:
            for i, doc_id in enumerate(results["ids"][0]):
                items.append(SearchResult(
                    id=doc_id,
                    content=results["documents"][0][i] if results["documents"] else "",
                    metadata=results["metadatas"][0][i] if results["metadatas"] else {},
                    distance=results["distances"][0][i] if results["distances"] else 0.0,
                ))
        
        return SearchResponse(results=items)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/collection")
async def clear_collection():
    try:
        client.delete_collection(COLLECTION_NAME)
        return {"status": "cleared"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/health")
async def health():
    collection = get_collection()
    return {"status": "ok", "count": collection.count()}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
