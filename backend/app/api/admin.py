from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.db.session import get_db
from app.models.models import User, Job, Candidate, Evaluation, AuditLog, Ranking
from app.api.deps import require_role
from app.core.security import get_password_hash

router = APIRouter(prefix="/api/admin", tags=["Admin"], dependencies=[Depends(require_role(["admin"]))])

class CreateRecruiterRequest(BaseModel):
    email: str
    password: str
    full_name: str

class UpdateRecruiterRequest(BaseModel):
    is_active: Optional[bool] = None

class AssignJobRequest(BaseModel):
    recruiter_id: str

@router.post("/recruiters")
async def create_recruiter(
    req: CreateRecruiterRequest,
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(require_role(["admin"]))
):
    stmt = select(User).where(User.email == req.email)
    res = await db.execute(stmt)
    if res.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Account with this email already exists")

    recruiter = User(
        email=req.email,
        hashed_password=get_password_hash(req.password),
        full_name=req.full_name,
        role="recruiter",
        is_active=True
    )
    db.add(recruiter)
    await db.flush()

    audit = AuditLog(
        user_id=admin_user.id,
        action="RECRUITER_CREATED",
        target_type="user",
        target_id=recruiter.id,
        metadata_json={"email": recruiter.email, "full_name": recruiter.full_name}
    )
    db.add(audit)
    await db.commit()

    return {
        "id": recruiter.id,
        "email": recruiter.email,
        "full_name": recruiter.full_name,
        "role": recruiter.role,
        "is_active": recruiter.is_active,
        "created_at": recruiter.created_at
    }

@router.get("/recruiters")
async def list_recruiters(
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(require_role(["admin"]))
):
    stmt = select(User).order_by(User.created_at.desc())
    res = await db.execute(stmt)
    users = res.scalars().all()

    output = []
    for u in users:
        j_stmt = select(func.count(Job.id)).where((Job.recruiter_id == u.id) | (Job.assigned_recruiter_id == u.id), Job.deleted_at == None)
        j_res = await db.execute(j_stmt)
        job_count = j_res.scalar() or 0

        output.append({
            "id": u.id,
            "email": u.email,
            "full_name": u.full_name,
            "role": u.role,
            "is_active": u.is_active,
            "job_count": job_count,
            "created_at": u.created_at
        })
    return output

@router.patch("/recruiters/{recruiter_id}")
async def update_recruiter(
    recruiter_id: str,
    req: UpdateRecruiterRequest,
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(require_role(["admin"]))
):
    stmt = select(User).where(User.id == recruiter_id)
    res = await db.execute(stmt)
    recruiter = res.scalar_one_or_none()

    if not recruiter:
        raise HTTPException(status_code=404, detail="Recruiter not found")

    if req.is_active is not None:
        recruiter.is_active = req.is_active

    audit = AuditLog(
        user_id=admin_user.id,
        action="RECRUITER_UPDATED",
        target_type="user",
        target_id=recruiter.id,
        metadata_json={"is_active": recruiter.is_active}
    )
    db.add(audit)
    await db.commit()

    return {
        "id": recruiter.id,
        "email": recruiter.email,
        "full_name": recruiter.full_name,
        "role": recruiter.role,
        "is_active": recruiter.is_active
    }

@router.get("/jobs")
async def list_organization_jobs(
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(require_role(["admin"]))
):
    stmt = select(Job).where(Job.deleted_at == None).order_by(Job.created_at.desc())
    res = await db.execute(stmt)
    jobs = res.scalars().all()

    output = []
    for j in jobs:
        u_stmt = select(User).where(User.id == j.recruiter_id)
        u_res = await db.execute(u_stmt)
        recruiter = u_res.scalar_one_or_none()

        c_stmt = select(func.count(Candidate.id)).where(Candidate.job_id == j.id, Candidate.deleted_at == None)
        c_res = await db.execute(c_stmt)
        cand_count = c_res.scalar() or 0

        p_stmt = select(func.count(Evaluation.id)).join(Candidate).where(Candidate.job_id == j.id, Candidate.deleted_at == None, Evaluation.approval_status == "pending")
        p_res = await db.execute(p_stmt)
        pending_count = p_res.scalar() or 0

        output.append({
            "id": j.id,
            "title": j.title,
            "raw_jd_text": j.raw_jd_text,
            "recruiter_id": j.recruiter_id,
            "recruiter_name": recruiter.full_name if recruiter else "Unknown Recruiter",
            "assigned_recruiter_id": j.assigned_recruiter_id,
            "min_experience_years": j.min_experience_years,
            "mandatory_skills": j.mandatory_skills,
            "candidate_count": cand_count,
            "pending_approval_count": pending_count,
            "deleted_at": j.deleted_at,
            "created_at": j.created_at
        })
    return output

@router.patch("/jobs/{job_id}/assign")
async def assign_job(
    job_id: str,
    req: AssignJobRequest,
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(require_role(["admin"]))
):
    stmt = select(Job).where(Job.id == job_id)
    res = await db.execute(stmt)
    job = res.scalar_one_or_none()

    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    rec_stmt = select(User).where(User.id == req.recruiter_id)
    rec_res = await db.execute(rec_stmt)
    target_recruiter = rec_res.scalar_one_or_none()

    if not target_recruiter:
        raise HTTPException(status_code=404, detail="Target recruiter not found")

    job.assigned_recruiter_id = target_recruiter.id

    audit = AuditLog(
        user_id=admin_user.id,
        action="JOB_REASSIGNED",
        target_type="job",
        target_id=job.id,
        metadata_json={"assigned_recruiter_id": target_recruiter.id, "recruiter_name": target_recruiter.full_name}
    )
    db.add(audit)
    await db.commit()

    return {"message": "Job reassigned successfully", "job_id": job.id, "assigned_recruiter_id": target_recruiter.id}

@router.get("/approvals")
async def get_approval_queue(
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(require_role(["admin"]))
):
    """
    Returns all candidates across the organization awaiting Admin approval.
    """
    stmt = select(Candidate, Evaluation, Job, User).join(
        Evaluation, Candidate.id == Evaluation.candidate_id
    ).join(
        Job, Candidate.job_id == Job.id
    ).join(
        User, Job.recruiter_id == User.id
    ).where(
        Candidate.deleted_at == None,
        Job.deleted_at == None,
        Evaluation.approval_status == "pending"
    ).order_by(Evaluation.match_percentage.desc())

    res = await db.execute(stmt)
    rows = res.all()

    queue = []
    for cand, eval_rec, job, recruiter in rows:
        max_stmt = select(func.max(Evaluation.match_percentage)).join(Candidate).where(Candidate.job_id == job.id, Candidate.deleted_at == None)
        max_res = await db.execute(max_stmt)
        max_match = max_res.scalar() or 0.0

        is_top = (
            eval_rec.match_percentage == max_match and
            len(eval_rec.missing_mandatory or []) == 0 and
            eval_rec.reviewer_status == "validated"
        )

        queue.append({
            "candidate_id": cand.id,
            "job_id": job.id,
            "job_title": job.title,
            "recruiter_name": recruiter.full_name,
            "redacted_name_token": cand.redacted_name_token,
            "stored_filename": cand.stored_filename or cand.file_path,
            "original_filename": cand.original_filename or cand.file_path,
            "extracted_name": cand.parsed_json.get("extracted_name") if cand.parsed_json else None,
            "email": cand.email,
            "parsed_json": cand.parsed_json,
            "match_percentage": eval_rec.match_percentage,
            "recommendation": eval_rec.recommendation,
            "matched_mandatory": eval_rec.matched_mandatory,
            "missing_mandatory": eval_rec.missing_mandatory,
            "matched_preferred": eval_rec.matched_preferred,
            "missing_preferred": eval_rec.missing_preferred,
            "strengths": eval_rec.strengths,
            "gaps": eval_rec.gaps,
            "evidence": eval_rec.evidence,
            "reviewer_status": eval_rec.reviewer_status,
            "reviewer_notes": eval_rec.reviewer_notes,
            "approval_status": eval_rec.approval_status,
            "is_top_candidate": is_top,
            "created_at": cand.created_at
        })

    return queue

@router.get("/audit-logs")
async def list_audit_logs(
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(require_role(["admin"]))
):
    stmt = select(AuditLog).order_by(AuditLog.created_at.desc()).limit(limit)
    res = await db.execute(stmt)
    logs = res.scalars().all()

    output = []
    for l in logs:
        user_name = "System"
        if l.user_id:
            u_stmt = select(User).where(User.id == l.user_id)
            u_res = await db.execute(u_stmt)
            u_rec = u_res.scalar_one_or_none()
            if u_rec:
                user_name = u_rec.full_name

        output.append({
            "id": l.id,
            "user_id": l.user_id,
            "user_name": user_name,
            "action": l.action,
            "target_type": l.target_type,
            "target_id": l.target_id,
            "metadata": l.metadata_json,
            "created_at": l.created_at
        })
    return output
