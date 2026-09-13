import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

class Settings(BaseSettings):
    PROJECT_NAME: str = "Agentic AI Resume Screening & Candidate Ranking System"
    ENV: str = "development"
    SECRET_KEY: str = "super-secret-jwt-key-change-in-production-min-32-chars-long"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # DB - Defaults to SQLite for immediate run, PostgreSQL supported via env var
    DATABASE_URL: str = "sqlite+aiosqlite:///./resume_ai.db"
    REDIS_URL: str = "redis://localhost:6379/0"

    # LLM & Embeddings
    LLM_PROVIDER: str = "mock"  # mock, openai, anthropic
    OPENAI_API_KEY: Optional[str] = None
    ANTHROPIC_API_KEY: Optional[str] = None

    CHROMA_PERSIST_DIRECTORY: str = "./chroma_db"
    EMBEDDING_MODEL_NAME: str = "all-MiniLM-L6-v2"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

settings = Settings()
