from fastapi import APIRouter

router = APIRouter(tags=["System"])

@router.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "Agentic AI Resume Screening & Candidate Ranking System",
        "version": "1.0.0"
    }
