import uuid
from datetime import datetime, timezone
from typing import Optional, Any
from sqlalchemy import String, Text, Float, Integer, Boolean, DateTime, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.session import Base

def generate_uuid() -> str:
    return str(uuid.uuid4())

class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(50), default="recruiter") # recruiter, admin
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    jobs: Mapped[list["Job"]] = relationship("Job", back_populates="recruiter", foreign_keys="[Job.recruiter_id]", cascade="all, delete-orphan")


class Job(Base):
    __tablename__ = "jobs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    recruiter_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    assigned_recruiter_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("users.id"), nullable=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    raw_jd_text: Mapped[str] = mapped_column(Text, nullable=False)
    mandatory_skills: Mapped[Optional[Any]] = mapped_column(JSON, default=list)
    preferred_skills: Mapped[Optional[Any]] = mapped_column(JSON, default=list)
    min_experience_years: Mapped[float] = mapped_column(Float, default=0.0)
    education_requirements: Mapped[Optional[Any]] = mapped_column(JSON, default=list)
    role_summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    requirements_version: Mapped[int] = mapped_column(Integer, default=1)
    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    recruiter: Mapped["User"] = relationship("User", back_populates="jobs", foreign_keys=[recruiter_id])
    candidates: Mapped[list["Candidate"]] = relationship("Candidate", back_populates="job", cascade="all, delete-orphan")
    rankings: Mapped[list["Ranking"]] = relationship("Ranking", back_populates="job", cascade="all, delete-orphan")


class Candidate(Base):
    __tablename__ = "candidates"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    job_id: Mapped[str] = mapped_column(String(36), ForeignKey("jobs.id"), nullable=False)
    redacted_name_token: Mapped[str] = mapped_column(String(255), nullable=False)
    file_path: Mapped[str] = mapped_column(String(512), nullable=False)
    original_filename: Mapped[str] = mapped_column(String(512), default="")
    stored_filename: Mapped[str] = mapped_column(String(512), default="")
    email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    name_extraction_status: Mapped[str] = mapped_column(String(50), default="extracted") # extracted, failed, ambiguous
    scored_under_requirements_version: Mapped[int] = mapped_column(Integer, default=1)
    parsed_json: Mapped[Optional[Any]] = mapped_column(JSON, default=dict)
    pii_redaction_report: Mapped[Optional[Any]] = mapped_column(JSON, default=dict)
    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    job: Mapped["Job"] = relationship("Job", back_populates="candidates")
    evaluation: Mapped[Optional["Evaluation"]] = relationship("Evaluation", back_populates="candidate", uselist=False, cascade="all, delete-orphan")
    ranking: Mapped[Optional["Ranking"]] = relationship("Ranking", back_populates="candidate", uselist=False, cascade="all, delete-orphan")


class Evaluation(Base):
    __tablename__ = "evaluations"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    candidate_id: Mapped[str] = mapped_column(String(36), ForeignKey("candidates.id"), nullable=False, unique=True)
    job_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("jobs.id"), nullable=True)
    match_percentage: Mapped[float] = mapped_column(Float, nullable=False)
    final_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    mandatory_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    experience_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    education_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    preferred_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    cert_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    recommendation: Mapped[str] = mapped_column(String(50), nullable=False) # Strong Match, Moderate Match, Low Match
    explanation: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    matched_mandatory: Mapped[Optional[Any]] = mapped_column(JSON, default=list)
    missing_mandatory: Mapped[Optional[Any]] = mapped_column(JSON, default=list)
    matched_preferred: Mapped[Optional[Any]] = mapped_column(JSON, default=list)
    missing_preferred: Mapped[Optional[Any]] = mapped_column(JSON, default=list)
    strengths: Mapped[Optional[Any]] = mapped_column(JSON, default=list)
    strengths_json: Mapped[Optional[Any]] = mapped_column(JSON, default=list)
    gaps: Mapped[Optional[Any]] = mapped_column(JSON, default=list)
    gaps_json: Mapped[Optional[Any]] = mapped_column(JSON, default=list)
    evidence: Mapped[Optional[Any]] = mapped_column(JSON, default=list)
    reviewer_status: Mapped[str] = mapped_column(String(50), default="validated") # validated, flagged
    reviewer_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    approval_status: Mapped[str] = mapped_column(String(50), default="pending") # pending, approved, rejected
    approved_by: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    approved_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    rejection_note: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    stage: Mapped[str] = mapped_column(String(50), default="screened") # screened, approved, interview_requested, interviewed, hired, rejected
    pipeline_stage: Mapped[Optional[str]] = mapped_column(String(50), default="SCREENED")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    candidate: Mapped["Candidate"] = relationship("Candidate", back_populates="evaluation")


class Ranking(Base):
    __tablename__ = "rankings"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    job_id: Mapped[str] = mapped_column(String(36), ForeignKey("jobs.id"), nullable=False)
    candidate_id: Mapped[str] = mapped_column(String(36), ForeignKey("candidates.id"), nullable=False, unique=True)
    rank: Mapped[int] = mapped_column(Integer, nullable=False)
    justification: Mapped[str] = mapped_column(Text, nullable=False)
    is_manual_override: Mapped[bool] = mapped_column(Boolean, default=False)
    override_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    job: Mapped["Job"] = relationship("Job", back_populates="rankings")
    candidate: Mapped["Candidate"] = relationship("Candidate", back_populates="ranking")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    user_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    action: Mapped[str] = mapped_column(String(100), nullable=False)
    target_type: Mapped[str] = mapped_column(String(100), nullable=False)
    target_id: Mapped[str] = mapped_column(String(100), nullable=False)
    metadata_json: Mapped[Optional[Any]] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    recipient_user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    related_job_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    related_candidate_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    read_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

