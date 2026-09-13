from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from app.core.config import settings

class Base(DeclarativeBase):
    pass

db_url = settings.DATABASE_URL
if db_url.startswith("postgresql://"):
    db_url = db_url.replace("postgresql://", "postgresql+asyncpg://", 1)
elif db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql+asyncpg://", 1)

engine = create_async_engine(
    db_url,
    echo=False,
    future=True
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False
)

async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()

async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

        from sqlalchemy import text
        is_postgres = "postgres" in db_url.lower()

        # Schema auto-migration list across all models to ensure 100% column sync
        if is_postgres:
            pg_alter_queries = [
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;",
                "ALTER TABLE jobs ADD COLUMN IF NOT EXISTS assigned_recruiter_id VARCHAR(36);",
                "ALTER TABLE jobs ADD COLUMN IF NOT EXISTS requirements_version INTEGER DEFAULT 1;",
                "ALTER TABLE jobs ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;",
                "ALTER TABLE candidates ADD COLUMN IF NOT EXISTS original_filename VARCHAR(512) DEFAULT '';",
                "ALTER TABLE candidates ADD COLUMN IF NOT EXISTS stored_filename VARCHAR(512) DEFAULT '';",
                "ALTER TABLE candidates ADD COLUMN IF NOT EXISTS email VARCHAR(255);",
                "ALTER TABLE candidates ADD COLUMN IF NOT EXISTS name_extraction_status VARCHAR(50) DEFAULT 'extracted';",
                "ALTER TABLE candidates ADD COLUMN IF NOT EXISTS scored_under_requirements_version INTEGER DEFAULT 1;",
                "ALTER TABLE candidates ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;",
                "ALTER TABLE evaluations ADD COLUMN IF NOT EXISTS job_id VARCHAR(36);",
                "ALTER TABLE evaluations ADD COLUMN IF NOT EXISTS final_score DOUBLE PRECISION;",
                "ALTER TABLE evaluations ADD COLUMN IF NOT EXISTS mandatory_score DOUBLE PRECISION;",
                "ALTER TABLE evaluations ADD COLUMN IF NOT EXISTS experience_score DOUBLE PRECISION;",
                "ALTER TABLE evaluations ADD COLUMN IF NOT EXISTS education_score DOUBLE PRECISION;",
                "ALTER TABLE evaluations ADD COLUMN IF NOT EXISTS preferred_score DOUBLE PRECISION;",
                "ALTER TABLE evaluations ADD COLUMN IF NOT EXISTS cert_score DOUBLE PRECISION;",
                "ALTER TABLE evaluations ADD COLUMN IF NOT EXISTS explanation TEXT;",
                "ALTER TABLE evaluations ADD COLUMN IF NOT EXISTS strengths_json JSONB;",
                "ALTER TABLE evaluations ADD COLUMN IF NOT EXISTS gaps_json JSONB;",
                "ALTER TABLE evaluations ADD COLUMN IF NOT EXISTS approval_status VARCHAR(50) DEFAULT 'pending';",
                "ALTER TABLE evaluations ADD COLUMN IF NOT EXISTS approved_by VARCHAR(36);",
                "ALTER TABLE evaluations ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;",
                "ALTER TABLE evaluations ADD COLUMN IF NOT EXISTS rejection_note TEXT;",
                "ALTER TABLE evaluations ADD COLUMN IF NOT EXISTS stage VARCHAR(50) DEFAULT 'screened';",
                "ALTER TABLE evaluations ADD COLUMN IF NOT EXISTS pipeline_stage VARCHAR(50) DEFAULT 'SCREENED';"
            ]
            for query in pg_alter_queries:
                try:
                    await conn.execute(text(query))
                except Exception:
                    pass
        else:
            sqlite_alter_queries = [
                "ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT 1;",
                "ALTER TABLE jobs ADD COLUMN assigned_recruiter_id VARCHAR(36);",
                "ALTER TABLE jobs ADD COLUMN requirements_version INTEGER DEFAULT 1;",
                "ALTER TABLE jobs ADD COLUMN deleted_at DATETIME;",
                "ALTER TABLE candidates ADD COLUMN original_filename VARCHAR(512) DEFAULT '';",
                "ALTER TABLE candidates ADD COLUMN stored_filename VARCHAR(512) DEFAULT '';",
                "ALTER TABLE candidates ADD COLUMN email VARCHAR(255);",
                "ALTER TABLE candidates ADD COLUMN name_extraction_status VARCHAR(50) DEFAULT 'extracted';",
                "ALTER TABLE candidates ADD COLUMN scored_under_requirements_version INTEGER DEFAULT 1;",
                "ALTER TABLE candidates ADD COLUMN deleted_at DATETIME;",
                "ALTER TABLE evaluations ADD COLUMN job_id VARCHAR(36);",
                "ALTER TABLE evaluations ADD COLUMN final_score FLOAT;",
                "ALTER TABLE evaluations ADD COLUMN mandatory_score FLOAT;",
                "ALTER TABLE evaluations ADD COLUMN experience_score FLOAT;",
                "ALTER TABLE evaluations ADD COLUMN education_score FLOAT;",
                "ALTER TABLE evaluations ADD COLUMN preferred_score FLOAT;",
                "ALTER TABLE evaluations ADD COLUMN cert_score FLOAT;",
                "ALTER TABLE evaluations ADD COLUMN explanation TEXT;",
                "ALTER TABLE evaluations ADD COLUMN strengths_json JSON;",
                "ALTER TABLE evaluations ADD COLUMN gaps_json JSON;",
                "ALTER TABLE evaluations ADD COLUMN approval_status VARCHAR(50) DEFAULT 'pending';",
                "ALTER TABLE evaluations ADD COLUMN approved_by VARCHAR(36);",
                "ALTER TABLE evaluations ADD COLUMN approved_at DATETIME;",
                "ALTER TABLE evaluations ADD COLUMN rejection_note TEXT;",
                "ALTER TABLE evaluations ADD COLUMN stage VARCHAR(50) DEFAULT 'screened';",
                "ALTER TABLE evaluations ADD COLUMN pipeline_stage VARCHAR(50) DEFAULT 'SCREENED';"
            ]
            for query in sqlite_alter_queries:
                try:
                    await conn.execute(text(query))
                except Exception:
                    pass

