import uuid
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.db.session import get_db
from app.models.models import Job, Candidate, Evaluation, Ranking, User, AuditLog, Notification
from app.api.deps import get_current_user, require_role
from app.worker import process_resume_batch_task, TASK_STATUSES
from app.services.email_service import send_candidate_notification_email
from app.agents.ranking_agent import rank_candidates

router = APIRouter(prefix="/api/jobs/{job_id}/candidates", tags=["Candidates"])

class OverrideRequest(BaseModel):
    new_rank: Optional[int] = None
    override_reason: str

class RejectRequest(BaseModel):
    note: Optional[str] = None

class UpdateStageRequest(BaseModel):
    stage: str # screened, approved, interview_requested, interviewed, hired, rejected

class NotifyCandidateRequest(BaseModel):
    custom_subject: Optional[str] = None
    custom_body: Optional[str] = None

@router.post("/upload")
async def upload_resumes_batch(
    job_id: str,
    files: List[UploadFile] = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    stmt = select(Job).where(Job.id == job_id, Job.deleted_at == None)
    res = await db.execute(stmt)
    job = res.scalar_one_or_none()

    if not job:
        raise HTTPException(status_code=404, detail="Job posting not found")

    file_items = []
    for f in files:
        content = await f.read()
        file_items.append({
            "filename": f.filename,
            "content_bytes": content
        })

    task_id = f"task_{uuid.uuid4().hex[:10]}"

    # Execute processing in background task
    import asyncio
    asyncio.create_task(process_resume_batch_task(ctx={}, job_id=job_id, file_items=file_items, task_id=task_id))

    return {
        "message": f"Queued processing for {len(files)} resumes",
        "task_id": task_id,
        "job_id": job_id
    }

@router.get("/upload-status/{task_id}")
async def get_upload_status(job_id: str, task_id: str):
    if task_id not in TASK_STATUSES:
        return {"status": "processing", "processed": 0, "total": 1}
    return TASK_STATUSES[task_id]

@router.get("")
async def list_ranked_candidates(
    job_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Fetch active non-deleted candidates
    stmt = select(Candidate).where(Candidate.job_id == job_id, Candidate.deleted_at == None)
    res = await db.execute(stmt)
    candidates = res.scalars().all()

    # Find highest match percentage across active candidate pool
    eval_list = []
    for cand in candidates:
        e_stmt = select(Evaluation).where(Evaluation.candidate_id == cand.id)
        e_res = await db.execute(e_stmt)
        evaluation = e_res.scalar_one_or_none()
        if evaluation:
            eval_list.append(evaluation)

    max_match = max([e.match_percentage for e in eval_list]) if eval_list else 0.0

    cand_list = []
    for cand in candidates:
        # Fetch evaluation
        e_stmt = select(Evaluation).where(Evaluation.candidate_id == cand.id)
        e_res = await db.execute(e_stmt)
        evaluation = e_res.scalar_one_or_none()

        # Fetch ranking
        r_stmt = select(Ranking).where(Ranking.candidate_id == cand.id)
        r_res = await db.execute(r_stmt)
        ranking = r_res.scalar_one_or_none()

        # Derived property: is_top_candidate
        is_top = False
        if evaluation:
            is_top = (
                evaluation.match_percentage == max_match and
                len(evaluation.missing_mandatory or []) == 0 and
                evaluation.reviewer_status == "validated"
            )

        cand_list.append({
            "id": cand.id,
            "job_id": cand.job_id,
            "redacted_name_token": cand.redacted_name_token,
            "file_path": cand.file_path,
            "stored_filename": cand.stored_filename or cand.file_path,
            "original_filename": cand.original_filename or cand.file_path,
            "email": cand.email,
            "name_extraction_status": cand.name_extraction_status,
            "extracted_name": cand.parsed_json.get("extracted_name") if cand.parsed_json else None,
            "parsed_json": cand.parsed_json or {},
            "created_at": cand.created_at,
            "evaluation": {
                "match_percentage": evaluation.match_percentage if evaluation else 0.0,
                "recommendation": evaluation.recommendation if evaluation else "Low Match",
                "matched_mandatory": evaluation.matched_mandatory if evaluation else [],
                "missing_mandatory": evaluation.missing_mandatory if evaluation else [],
                "matched_preferred": evaluation.matched_preferred if evaluation else [],
                "missing_preferred": evaluation.missing_preferred if evaluation else [],
                "strengths": evaluation.strengths if evaluation else [],
                "gaps": evaluation.gaps if evaluation else [],
                "evidence": evaluation.evidence if evaluation else [],
                "reviewer_status": evaluation.reviewer_status if evaluation else "validated",
                "reviewer_notes": evaluation.reviewer_notes if evaluation else "",
                "approval_status": evaluation.approval_status if evaluation else "pending",
                "approved_by": evaluation.approved_by if evaluation else None,
                "approved_at": evaluation.approved_at if evaluation else None,
                "rejection_note": evaluation.rejection_note if evaluation else None,
                "stage": evaluation.stage if evaluation else "screened",
                "is_top_candidate": is_top
            } if evaluation else None,
            "ranking": {
                "rank": ranking.rank if ranking else 999,
                "justification": ranking.justification if ranking else "Unranked",
                "is_manual_override": ranking.is_manual_override if ranking else False,
                "override_reason": ranking.override_reason if ranking else None
            } if ranking else None
        })

    # Sort by rank ascending
    cand_list.sort(key=lambda x: x["ranking"]["rank"] if x["ranking"] else 999)
    return cand_list

@router.get("/{candidate_id}")
async def get_candidate_dossier(
    job_id: str,
    candidate_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    stmt = select(Candidate).where(Candidate.id == candidate_id, Candidate.job_id == job_id, Candidate.deleted_at == None)
    res = await db.execute(stmt)
    candidate = res.scalar_one_or_none()

    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")

    e_stmt = select(Evaluation).where(Evaluation.candidate_id == candidate.id)
    e_res = await db.execute(e_stmt)
    evaluation = e_res.scalar_one_or_none()

    r_stmt = select(Ranking).where(Ranking.candidate_id == candidate.id)
    r_res = await db.execute(r_stmt)
    ranking = r_res.scalar_one_or_none()

    # Compute is_top_candidate
    max_stmt = select(func.max(Evaluation.match_percentage)).join(Candidate).where(Candidate.job_id == job_id, Candidate.deleted_at == None)
    max_res = await db.execute(max_stmt)
    max_match = max_res.scalar() or 0.0

    is_top = False
    if evaluation:
        is_top = (
            evaluation.match_percentage == max_match and
            len(evaluation.missing_mandatory or []) == 0 and
            evaluation.reviewer_status == "validated"
        )

    return {
        "candidate": candidate,
        "evaluation": {
            "match_percentage": evaluation.match_percentage if evaluation else 0.0,
            "recommendation": evaluation.recommendation if evaluation else "Low Match",
            "matched_mandatory": evaluation.matched_mandatory if evaluation else [],
            "missing_mandatory": evaluation.missing_mandatory if evaluation else [],
            "matched_preferred": evaluation.matched_preferred if evaluation else [],
            "missing_preferred": evaluation.missing_preferred if evaluation else [],
            "strengths": evaluation.strengths if evaluation else [],
            "gaps": evaluation.gaps if evaluation else [],
            "evidence": evaluation.evidence if evaluation else [],
            "reviewer_status": evaluation.reviewer_status if evaluation else "validated",
            "reviewer_notes": evaluation.reviewer_notes if evaluation else "",
            "approval_status": evaluation.approval_status if evaluation else "pending",
            "approved_by": evaluation.approved_by if evaluation else None,
            "approved_at": evaluation.approved_at if evaluation else None,
            "rejection_note": evaluation.rejection_note if evaluation else None,
            "stage": evaluation.stage if evaluation else "screened",
            "is_top_candidate": is_top
        } if evaluation else None,
        "ranking": ranking
    }

@router.delete("/{candidate_id}")
async def delete_candidate(
    job_id: str,
    candidate_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    stmt = select(Candidate).where(Candidate.id == candidate_id, Candidate.job_id == job_id, Candidate.deleted_at == None)
    res = await db.execute(stmt)
    cand = res.scalar_one_or_none()

    if not cand:
        raise HTTPException(status_code=404, detail="Candidate not found")

    cand.deleted_at = datetime.now(timezone.utc)

    # Delete existing ranking for this candidate
    r_stmt = select(Ranking).where(Ranking.candidate_id == cand.id)
    r_res = await db.execute(r_stmt)
    ranking = r_res.scalar_one_or_none()
    if ranking:
        await db.delete(ranking)

    audit = AuditLog(
        user_id=current_user.id,
        action="CANDIDATE_DELETED",
        target_type="candidate",
        target_id=cand.id,
        metadata_json={
            "job_id": job_id,
            "token": cand.redacted_name_token,
            "stored_filename": cand.stored_filename
        }
    )
    db.add(audit)
    await db.flush()

    # Re-calculate rankings for remaining active candidate pool
    c_stmt = select(Candidate).where(Candidate.job_id == job_id, Candidate.deleted_at == None)
    c_res = await db.execute(c_stmt)
    remaining_cands = c_res.scalars().all()

    evaluated_candidates = []
    for rc in remaining_cands:
        e_stmt = select(Evaluation).where(Evaluation.candidate_id == rc.id)
        e_res = await db.execute(e_stmt)
        e_rec = e_res.scalar_one_or_none()
        if e_rec:
            evaluated_candidates.append({
                "candidate_db_id": rc.id,
                "token": rc.redacted_name_token,
                "match_percentage": e_rec.match_percentage,
                "recommendation": e_rec.recommendation,
                "matched_mandatory": e_rec.matched_mandatory,
                "total_experience_years": rc.parsed_json.get("experience_years", 0.0) if rc.parsed_json else 0.0
            })

    # Delete old rankings for remaining candidates
    del_r_stmt = select(Ranking).where(Ranking.job_id == job_id)
    old_ranks_res = await db.execute(del_r_stmt)
    for r_to_del in old_ranks_res.scalars().all():
        await db.delete(r_to_del)
    await db.flush()

    if evaluated_candidates:
        ranked_list = rank_candidates(evaluated_candidates)
        for r_item in ranked_list:
            ranking_record = Ranking(
                job_id=job_id,
                candidate_id=r_item["candidate_db_id"],
                rank=r_item["rank"],
                justification=r_item["justification"]
            )
            db.add(ranking_record)

    await db.commit()

    return {
        "message": f"Candidate '{cand.redacted_name_token}' removed successfully",
        "candidate_id": cand.id
    }

@router.post("/{candidate_id}/approve")
async def approve_candidate(
    job_id: str,
    candidate_id: str,
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(require_role(["admin"]))
):
    stmt = select(Candidate).where(Candidate.id == candidate_id, Candidate.job_id == job_id, Candidate.deleted_at == None)
    res = await db.execute(stmt)
    cand = res.scalar_one_or_none()

    if not cand:
        raise HTTPException(status_code=404, detail="Candidate not found")

    e_stmt = select(Evaluation).where(Evaluation.candidate_id == cand.id)
    e_res = await db.execute(e_stmt)
    eval_rec = e_res.scalar_one_or_none()

    if not eval_rec:
        raise HTTPException(status_code=404, detail="Candidate evaluation not found")

    now = datetime.now(timezone.utc)
    eval_rec.approval_status = "approved"
    eval_rec.approved_by = admin_user.id
    eval_rec.approved_at = now
    eval_rec.stage = "approved"

    # Fetch Job recruiter to create in-app notification
    j_stmt = select(Job).where(Job.id == job_id)
    j_res = await db.execute(j_stmt)
    job = j_res.scalar_one_or_none()

    if job:
        notif = Notification(
            recipient_user_id=job.recruiter_id,
            message=f"Candidate {cand.redacted_name_token} has been APPROVED for job '{job.title}' by Admin.",
            related_job_id=job_id,
            related_candidate_id=candidate_id
        )
        db.add(notif)

    audit = AuditLog(
        user_id=admin_user.id,
        action="CANDIDATE_APPROVED",
        target_type="candidate",
        target_id=cand.id,
        metadata_json={
            "job_id": job_id,
            "candidate_token": cand.redacted_name_token,
            "approved_by": admin_user.full_name
        }
    )
    db.add(audit)
    await db.commit()

    return {
        "message": f"Candidate '{cand.redacted_name_token}' approved successfully",
        "approval_status": eval_rec.approval_status,
        "stage": eval_rec.stage
    }

@router.post("/{candidate_id}/reject")
async def reject_candidate(
    job_id: str,
    candidate_id: str,
    req: RejectRequest,
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(require_role(["admin"]))
):
    stmt = select(Candidate).where(Candidate.id == candidate_id, Candidate.job_id == job_id, Candidate.deleted_at == None)
    res = await db.execute(stmt)
    cand = res.scalar_one_or_none()

    if not cand:
        raise HTTPException(status_code=404, detail="Candidate not found")

    e_stmt = select(Evaluation).where(Evaluation.candidate_id == cand.id)
    e_res = await db.execute(e_stmt)
    eval_rec = e_res.scalar_one_or_none()

    if not eval_rec:
        raise HTTPException(status_code=404, detail="Candidate evaluation not found")

    now = datetime.now(timezone.utc)
    eval_rec.approval_status = "rejected"
    eval_rec.rejection_note = req.note or "Rejected during admin review"
    eval_rec.stage = "rejected"

    audit = AuditLog(
        user_id=admin_user.id,
        action="CANDIDATE_REJECTED",
        target_type="candidate",
        target_id=cand.id,
        metadata_json={
            "job_id": job_id,
            "candidate_token": cand.redacted_name_token,
            "note": eval_rec.rejection_note
        }
    )
    db.add(audit)
    await db.commit()

    return {
        "message": f"Candidate '{cand.redacted_name_token}' rejected",
        "approval_status": eval_rec.approval_status,
        "stage": eval_rec.stage
    }

@router.patch("/{candidate_id}/stage")
async def update_candidate_stage(
    job_id: str,
    candidate_id: str,
    req: UpdateStageRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    stmt = select(Candidate).where(Candidate.id == candidate_id, Candidate.job_id == job_id, Candidate.deleted_at == None)
    res = await db.execute(stmt)
    cand = res.scalar_one_or_none()

    if not cand:
        raise HTTPException(status_code=404, detail="Candidate not found")

    e_stmt = select(Evaluation).where(Evaluation.candidate_id == cand.id)
    e_res = await db.execute(e_stmt)
    eval_rec = e_res.scalar_one_or_none()

    if not eval_rec:
        raise HTTPException(status_code=404, detail="Candidate evaluation not found")

    eval_rec.stage = req.stage

    audit = AuditLog(
        user_id=current_user.id,
        action="CANDIDATE_STAGE_UPDATED",
        target_type="candidate",
        target_id=cand.id,
        metadata_json={"new_stage": req.stage}
    )
    db.add(audit)
    await db.commit()

    return {"message": "Candidate stage updated", "stage": eval_rec.stage}

@router.post("/{candidate_id}/notify")
async def notify_candidate(
    job_id: str,
    candidate_id: str,
    req: NotifyCandidateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    stmt = select(Candidate).where(Candidate.id == candidate_id, Candidate.job_id == job_id, Candidate.deleted_at == None)
    res = await db.execute(stmt)
    cand = res.scalar_one_or_none()

    if not cand:
        raise HTTPException(status_code=404, detail="Candidate not found")

    e_stmt = select(Evaluation).where(Evaluation.candidate_id == cand.id)
    e_res = await db.execute(e_stmt)
    eval_rec = e_res.scalar_one_or_none()

    if not eval_rec or eval_rec.approval_status != "approved":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot notify candidate before Admin has granted explicit approval"
        )

    if not cand.email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No email address found in resume — cannot notify"
        )

    j_stmt = select(Job).where(Job.id == job_id)
    j_res = await db.execute(j_stmt)
    job = j_res.scalar_one_or_none()
    job_title = job.title if job else "Position"

    first_name = cand.parsed_json.get("extracted_name") if cand.parsed_json else None
    if first_name and " " in first_name:
        first_name = first_name.split()[0]

    email_res = send_candidate_notification_email(
        candidate_email=cand.email,
        candidate_first_name=first_name or "Candidate",
        job_title=job_title,
        company_name="TechCorp",
        custom_subject=req.custom_subject,
        custom_body=req.custom_body
    )

    audit = AuditLog(
        user_id=current_user.id,
        action="CANDIDATE_NOTIFIED",
        target_type="candidate",
        target_id=cand.id,
        metadata_json={
            "recipient_email": cand.email,
            "job_title": job_title,
            "subject": email_res.get("subject")
        }
    )
    db.add(audit)
    await db.commit()

    return {
        "message": f"Transactional email sent to candidate at {cand.email}",
        "email_details": email_res
    }

@router.post("/{candidate_id}/override")
async def override_candidate_ranking(
    job_id: str,
    candidate_id: str,
    req: OverrideRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    r_stmt = select(Ranking).where(Ranking.candidate_id == candidate_id, Ranking.job_id == job_id)
    r_res = await db.execute(r_stmt)
    ranking = r_res.scalar_one_or_none()

    if not ranking:
        raise HTTPException(status_code=404, detail="Candidate ranking record not found")

    old_rank = ranking.rank
    if req.new_rank is not None:
        ranking.rank = req.new_rank
    ranking.is_manual_override = True
    ranking.override_reason = req.override_reason

    audit = AuditLog(
        user_id=current_user.id,
        action="RANKING_MANUAL_OVERRIDE",
        target_type="ranking",
        target_id=ranking.id,
        metadata_json={
            "candidate_id": candidate_id,
            "old_rank": old_rank,
            "new_rank": ranking.rank,
            "reason": req.override_reason
        }
    )
    db.add(audit)
    await db.commit()

    return {
        "message": "Candidate ranking override recorded successfully",
        "ranking": ranking
    }

