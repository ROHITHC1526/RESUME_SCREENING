from datetime import datetime, timezone
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.session import get_db
from app.models.models import Job, Candidate, User, AuditLog
from app.api.deps import get_current_user
from app.agents.jd_agent import job_description_agent

router = APIRouter(prefix="/api/jobs", tags=["Jobs"])

class AnalyzeJDRequest(BaseModel):
    raw_jd_text: str

class CreateJobRequest(BaseModel):
    title: str
    raw_jd_text: Optional[str] = ""
    mandatory_skills: Optional[List[str]] = None
    preferred_skills: Optional[List[str]] = None
    min_experience_years: Optional[float] = None
    education_requirements: Optional[List[str]] = None
    role_summary: Optional[str] = None

class UpdateJobRequest(BaseModel):
    title: Optional[str] = None
    raw_jd_text: Optional[str] = None
    mandatory_skills: Optional[List[str]] = None
    preferred_skills: Optional[List[str]] = None
    min_experience_years: Optional[float] = None
    education_requirements: Optional[List[str]] = None
    rescreen_candidates: Optional[bool] = False

class DeleteJobRequest(BaseModel):
    confirm_title: str

def serialize_job(job: Job) -> dict:
    return {
        "id": job.id,
        "recruiter_id": job.recruiter_id,
        "assigned_recruiter_id": job.assigned_recruiter_id,
        "title": job.title,
        "raw_jd_text": job.raw_jd_text,
        "mandatory_skills": job.mandatory_skills or [],
        "preferred_skills": job.preferred_skills or [],
        "min_experience_years": job.min_experience_years or 0.0,
        "education_requirements": job.education_requirements or [],
        "role_summary": job.role_summary or "",
        "requirements_version": job.requirements_version or 1,
        "deleted_at": job.deleted_at.isoformat() if job.deleted_at else None,
        "created_at": job.created_at.isoformat() if job.created_at else None
    }

@router.post("/analyze-jd")
async def analyze_jd_endpoint(
    req: AnalyzeJDRequest,
    current_user: User = Depends(get_current_user)
):
    try:
        jd_text = req.raw_jd_text.strip()
        if not jd_text:
            return {
                "mandatory_skills": [],
                "preferred_skills": [],
                "min_experience_years": 0.0,
                "education_requirements": [],
                "certification_requirements": [],
                "role_summary": ""
            }
        jd_state = await job_description_agent({
            "job_id": "temp_preview",
            "raw_jd_text": jd_text
        })
        return {
            "mandatory_skills": jd_state.get("mandatory_skills", []),
            "preferred_skills": jd_state.get("preferred_skills", []),
            "min_experience_years": jd_state.get("min_experience_years", 0.0),
            "education_requirements": jd_state.get("education_requirements", []),
            "certification_requirements": jd_state.get("certification_requirements", []),
            "role_summary": jd_state.get("role_summary", "")
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"JD Analysis failed: {str(e)}"
        )

@router.post("", status_code=status.HTTP_201_CREATED)
async def create_job(
    req: CreateJobRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        jd_text = (req.raw_jd_text or req.title).strip()
        
        # If recruiter already customized mandatory/preferred skills in wizard, use them
        if req.mandatory_skills is not None:
            final_mandatory = req.mandatory_skills
            final_preferred = req.preferred_skills or []
            final_min_exp = req.min_experience_years if req.min_experience_years is not None else 0.0
            final_edu = req.education_requirements or []
            final_role_summary = req.role_summary or f"Role for {req.title.strip()}"
        else:
            # Trigger JD Agent to extract structured requirements
            jd_state = await job_description_agent({
                "job_id": "temp",
                "raw_jd_text": jd_text
            })
            final_mandatory = jd_state.get("mandatory_skills", [])
            final_preferred = jd_state.get("preferred_skills", [])
            final_min_exp = req.min_experience_years if req.min_experience_years is not None else jd_state.get("min_experience_years", 0.0)
            final_edu = req.education_requirements or jd_state.get("education_requirements", [])
            final_role_summary = jd_state.get("role_summary", "")

        job = Job(
            recruiter_id=current_user.id,
            title=req.title.strip(),
            raw_jd_text=jd_text,
            mandatory_skills=final_mandatory,
            preferred_skills=final_preferred,
            min_experience_years=final_min_exp,
            education_requirements=final_edu,
            role_summary=final_role_summary,
            requirements_version=1
        )

        db.add(job)
        await db.flush()

        audit = AuditLog(
            user_id=current_user.id,
            action="JOB_CREATED",
            target_type="job",
            target_id=job.id,
            metadata_json={"title": job.title}
        )
        db.add(audit)
        await db.commit()

        return serialize_job(job)
    except HTTPException:
        await db.rollback()
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Job creation failed: {str(e)}"
        )

@router.get("")
async def list_jobs(
    include_deleted: bool = False,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    stmt = select(Job)

    if current_user.role != "admin":
        stmt = stmt.where((Job.recruiter_id == current_user.id) | (Job.assigned_recruiter_id == current_user.id))

    if not include_deleted or current_user.role != "admin":
        stmt = stmt.where(Job.deleted_at == None)

    stmt = stmt.order_by(Job.created_at.desc())
    res = await db.execute(stmt)
    jobs = res.scalars().all()
    return [serialize_job(j) for j in jobs]

@router.get("/{job_id}")
async def get_job_detail(
    job_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    stmt = select(Job).where(Job.id == job_id)
    res = await db.execute(stmt)
    job = res.scalar_one_or_none()

    if not job or (job.deleted_at and current_user.role != "admin"):
        raise HTTPException(status_code=404, detail="Job not found")

    # Scope check for recruiters
    if current_user.role != "admin" and job.recruiter_id != current_user.id and job.assigned_recruiter_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to access this job")

    return serialize_job(job)

@router.patch("/{job_id}")
async def update_job(
    job_id: str,
    req: UpdateJobRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    stmt = select(Job).where(Job.id == job_id)
    res = await db.execute(stmt)
    job = res.scalar_one_or_none()

    if not job or (job.deleted_at and current_user.role != "admin"):
        raise HTTPException(status_code=404, detail="Job not found")

    # Access check: Admin or job owner
    if current_user.role != "admin" and job.recruiter_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to modify this job")

    job.requirements_version += 1

    if req.title: job.title = req.title.strip()
    if req.min_experience_years is not None: job.min_experience_years = req.min_experience_years
    if req.mandatory_skills is not None: job.mandatory_skills = req.mandatory_skills
    if req.preferred_skills is not None: job.preferred_skills = req.preferred_skills
    if req.education_requirements is not None: job.education_requirements = req.education_requirements

    if req.raw_jd_text:
        job.raw_jd_text = req.raw_jd_text.strip()
        if req.mandatory_skills is None:
            jd_state = await job_description_agent({"job_id": job.id, "raw_jd_text": req.raw_jd_text})
            job.mandatory_skills = jd_state.get("mandatory_skills", [])
            job.preferred_skills = jd_state.get("preferred_skills", [])
            if req.education_requirements is None:
                job.education_requirements = jd_state.get("education_requirements", [])

    if req.rescreen_candidates:
        c_stmt = select(Candidate).where(Candidate.job_id == job_id, Candidate.deleted_at == None)
        c_res = await db.execute(c_stmt)
        cands = c_res.scalars().all()
        for c in cands:
            c.scored_under_requirements_version = job.requirements_version

    audit = AuditLog(
        user_id=current_user.id,
        action="JOB_REQUIREMENTS_UPDATED",
        target_type="job",
        target_id=job.id,
        metadata_json={
            "title": job.title,
            "version": job.requirements_version,
            "rescreened": req.rescreen_candidates
        }
    )
    db.add(audit)
    await db.commit()

    return serialize_job(job)

@router.delete("/{job_id}")
async def delete_job(
    job_id: str,
    req: DeleteJobRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    stmt = select(Job).where(Job.id == job_id)
    res = await db.execute(stmt)
    job = res.scalar_one_or_none()

    if not job or job.deleted_at:
        raise HTTPException(status_code=404, detail="Job not found")

    # Scope check: Admin can delete any job, Recruiter can only delete job they created
    if current_user.role != "admin" and job.recruiter_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this job")

    # Require explicit confirmation matching job title
    if req.confirm_title.strip().lower() != job.title.strip().lower():
        raise HTTPException(status_code=400, detail="Confirmation title does not match job title")

    job.deleted_at = datetime.now(timezone.utc)

    # Soft delete associated candidate records
    c_stmt = select(Candidate).where(Candidate.job_id == job_id)
    c_res = await db.execute(c_stmt)
    cands = c_res.scalars().all()
    for c in cands:
        c.deleted_at = datetime.now(timezone.utc)

    audit = AuditLog(
        user_id=current_user.id,
        action="JOB_DELETED",
        target_type="job",
        target_id=job.id,
        metadata_json={"title": job.title}
    )
    db.add(audit)
    await db.commit()

    return {"message": f"Job '{job.title}' and its candidates soft deleted successfully"}
