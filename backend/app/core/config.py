from pathlib import Path
from typing import Optional

from pydantic_settings import BaseSettings, SettingsConfigDict


# Project root:
# RESUME PRO @/
# ├── .env
# ├── backend/
# └── frontend/
BASE_DIR = Path(__file__).resolve().parents[3]


class Settings(BaseSettings):

    PROJECT_NAME: str = "Agentic AI Resume Screening & Candidate Ranking System"

    ENV: str = "development"

    SECRET_KEY: str

    ALGORITHM: str = "HS256"

    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # PostgreSQL
    DATABASE_URL: str

    # Redis
    REDIS_URL: str

    # AI
    LLM_PROVIDER: str = "gemini"

    GEMINI_API_KEY: Optional[str] = None

    GEMINI_MODEL: str = "gemini-3.6-flash"

    OPENAI_API_KEY: Optional[str] = None

    ANTHROPIC_API_KEY: Optional[str] = None

    # Vector DB
    CHROMA_PERSIST_DIRECTORY: str = "./chroma_db"

    EMBEDDING_MODEL_NAME: str = "all-MiniLM-L6-v2"

    model_config = SettingsConfigDict(
        env_file=BASE_DIR / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()