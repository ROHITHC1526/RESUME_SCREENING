from sqlalchemy import false
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.db.session import init_db
from app.api import auth, jobs, candidates, health, admin
from app.db.session import AsyncSessionLocal
from app.models.models import User
from app.core.security import get_password_hash
from sqlalchemy import select

async def seed_admin_user():
    async with AsyncSessionLocal() as db:
        stmt = select(User).where(User.role == "admin")
        res = await db.execute(stmt)
        admin = res.scalars().first()
        if not admin:
            admin_user = User(
                email="admin@techcorp.io",
                hashed_password=get_password_hash("AdminPass123!"),
                full_name="System Owner (Admin)",
                role="admin",
                is_active=True
            )
            db.add(admin_user)
            await db.commit()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize DB tables on startup
    await init_db()
    await seed_admin_user()
    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0",
    description="Agentic AI Resume Screening & Candidate Ranking System API",
    lifespan=lifespan
)

# CORS Middleware setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
    "http://localhost:5173",
    "https://resume-screening-liard.vercel.app",
],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Routers
app.include_router(health.router)
app.include_router(auth.router)
app.include_router(jobs.router)
app.include_router(candidates.router)
app.include_router(admin.router)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=False)
