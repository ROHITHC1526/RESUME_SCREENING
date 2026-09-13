import asyncio
import logging
from typing import Dict, Any, List
from arq.connections import RedisSettings
from app.core.config import settings
from app.db.session import AsyncSessionLocal
from app.models.models import Job, Candidate, Evaluation, Ranking, AuditLog
from app.agents.pipeline import pipeline_app
from app.agents.ranking_agent import rank_candidates
from app.services.parsers import parse_document
from sqlalchemy import select
import uuid
import re

logger = logging.getLogger(__name__)

# In-memory status tracker for task polling when Redis is operating locally
TASK_STATUSES: Dict[str, Dict[str, Any]] = {}

async def process_resume_batch_task(ctx: dict, job_id: str, file_items: List[Dict[str, Any]], task_id: str):
    """
    ARQ Async worker task for batch resume parsing, redaction, evaluation, and candidate ranking.
    """
    TASK_STATUSES[task_id] = {
        "status": "processing",
        "total": len(file_items),
        "processed": 0,
        "results": []
    }

    try:
        async with AsyncSessionLocal() as db:
            # Fetch Job details
            stmt = select(Job).where(Job.id == job_id)
            res = await db.execute(stmt)
            job = res.scalar_one_or_none()

            if not job:
                TASK_STATUSES[task_id]["status"] = "failed"
                TASK_STATUSES[task_id]["error"] = "Job not found"
                return

            # Fetch existing active candidates for full pool re-ranking
            c_stmt = select(Candidate).where(Candidate.job_id == job_id, Candidate.deleted_at == None)
            c_res = await db.execute(c_stmt)
            existing_cands = c_res.scalars().all()

            evaluated_candidates = []
            for ec in existing_cands:
                e_stmt = select(Evaluation).where(Evaluation.candidate_id == ec.id)
                e_res = await db.execute(e_stmt)
                e_rec = e_res.scalar_one_or_none()
                if e_rec:
                    evaluated_candidates.append({
                        "candidate_db_id": ec.id,
                        "token": ec.redacted_name_token,
                        "match_percentage": e_rec.match_percentage,
                        "recommendation": e_rec.recommendation,
                        "matched_mandatory": e_rec.matched_mandatory,
                        "total_experience_years": ec.parsed_json.get("experience_years", 0.0) if ec.parsed_json else 0.0
                    })

            for item in file_items:
                original_filename = item.get("filename", "resume.pdf")
                file_bytes = item.get("content_bytes", b"")

                try:
                    raw_text = parse_document(file_bytes, original_filename)

                    # Invoke LangGraph pipeline
                    initial_state = {
                        "job_id": job_id,
                        "candidate_id": f"cand_{job_id[:6]}_{TASK_STATUSES[task_id]['processed']+1}",
                        "raw_jd_text": job.raw_jd_text,
                        "raw_resume_text": raw_text,
                        "mandatory_skills": job.mandatory_skills or [],
                        "preferred_skills": job.preferred_skills or [],
                        "min_experience_years": job.min_experience_years or 0.0
                    }

                    final_state = await pipeline_app.ainvoke(initial_state)

                    extracted_name = final_state.get("extracted_name")
                    extracted_email = final_state.get("extracted_email")
                    name_status = final_state.get("name_extraction_status", "failed")

                    # Candidate file naming convention: {FirstName}_{LastName}_{JobID-or-ShortJobTitle}_{ShortUUID}.{ext}
                    ext = original_filename.split('.')[-1] if '.' in original_filename else 'pdf'
                    short_uuid = uuid.uuid4().hex[:6]
                    clean_job = re.sub(r'[^a-zA-Z0-9]', '', job.title)[:12] or "Job"

                    if extracted_name:
                        parts = extracted_name.strip().split()
                        first_name = parts[0]
                        last_name = parts[-1] if len(parts) > 1 else "Candidate"
                        stored_filename = f"{first_name}_{last_name}_{clean_job}_{short_uuid}.{ext}"
                    else:
                        stored_filename = f"Unnamed_Candidate_{short_uuid}.{ext}"

                    # Create Candidate record
                    cand = Candidate(
                        job_id=job_id,
                        redacted_name_token=final_state.get("pii_report", {}).get("candidate_token", f"Candidate {TASK_STATUSES[task_id]['processed']+1}"),
                        file_path=stored_filename,
                        original_filename=original_filename,
                        stored_filename=stored_filename,
                        email=extracted_email,
                        name_extraction_status=name_status,
                        scored_under_requirements_version=job.requirements_version,
                        parsed_json={
                            "skills": final_state.get("parsed_skills", []),
                            "experience_years": final_state.get("total_experience_years", 0.0),
                            "education": final_state.get("education", []),
                            "certifications": final_state.get("certifications", []),
                            "work_experience": final_state.get("work_experience", []),
                            "extracted_name": extracted_name
                        },
                        pii_redaction_report=final_state.get("pii_report", {})
                    )
                    db.add(cand)
                    await db.flush()

                    # Determine reviewer status: flag if name extraction failed/ambiguous
                    rev_status = final_state.get("reviewer_status", "validated")
                    rev_notes = final_state.get("reviewer_notes", "")
                    if name_status in ["failed", "ambiguous"]:
                        rev_status = "flagged"
                        rev_notes = (rev_notes + " Name extraction failed or ambiguous - manual review required.").strip()

                    # Create Evaluation record
                    eval_record = Evaluation(
                        candidate_id=cand.id,
                        job_id=job_id,
                        match_percentage=final_state.get("match_percentage", 0.0),
                        final_score=final_state.get("match_percentage", 0.0),
                        mandatory_score=final_state.get("mandatory_score", 0.0),
                        experience_score=final_state.get("experience_score", 0.0),
                        education_score=final_state.get("education_score", 0.0),
                        preferred_score=final_state.get("preferred_score", 0.0),
                        cert_score=final_state.get("cert_score", 0.0),
                        recommendation=final_state.get("recommendation", "Moderate Match"),
                        explanation=f"Evaluated match score {final_state.get('match_percentage', 0.0)}% under requirement version {job.requirements_version}",
                        matched_mandatory=final_state.get("matched_mandatory", []),
                        missing_mandatory=final_state.get("missing_mandatory", []),
                        matched_preferred=final_state.get("matched_preferred", []),
                        missing_preferred=final_state.get("missing_preferred", []),
                        strengths=final_state.get("strengths", []),
                        strengths_json=final_state.get("strengths", []),
                        gaps=final_state.get("gaps", []),
                        gaps_json=final_state.get("gaps", []),
                        evidence=final_state.get("evidence", []),
                        reviewer_status=rev_status,
                        reviewer_notes=rev_notes,
                        approval_status="pending",
                        stage="screened",
                        pipeline_stage="SCREENED"
                    )
                    db.add(eval_record)
                    await db.flush()

                    eval_dict = {
                        "candidate_db_id": cand.id,
                        "token": cand.redacted_name_token,
                        "match_percentage": final_state.get("match_percentage", 0.0),
                        "recommendation": final_state.get("recommendation", "Moderate Match"),
                        "matched_mandatory": final_state.get("matched_mandatory", []),
                        "total_experience_years": final_state.get("total_experience_years", 0.0)
                    }
                    evaluated_candidates.append(eval_dict)

                    TASK_STATUSES[task_id]["processed"] += 1

                except Exception as file_err:
                    # One bad file must not kill the whole batch - log it, record it, keep going
                    logger.error(f"Failed to process file '{original_filename}' in task {task_id}: {file_err}", exc_info=True)
                    TASK_STATUSES[task_id]["processed"] += 1
                    TASK_STATUSES[task_id]["results"].append({
                        "filename": original_filename,
                        "status": "failed",
                        "error": str(file_err)
                    })
                    continue

            # Delete existing rankings for job to re-calculate clean ranks across full active pool
            del_r_stmt = select(Ranking).where(Ranking.job_id == job_id)
            existing_ranks_res = await db.execute(del_r_stmt)
            for r_to_del in existing_ranks_res.scalars().all():
                await db.delete(r_to_del)
            await db.flush()

            # Calculate Rankings for the full job pool
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

            TASK_STATUSES[task_id]["status"] = "completed"
            TASK_STATUSES[task_id]["results"] = ranked_list

    except Exception as e:
        # Catches anything outside the per-file loop (DB connection issues, job lookup, ranking, commit, etc.)
        logger.error(f"Resume batch processing task {task_id} failed: {e}", exc_info=True)
        TASK_STATUSES[task_id]["status"] = "failed"
        TASK_STATUSES[task_id]["error"] = str(e)


class WorkerSettings:
    functions = [process_resume_batch_task]
    redis_settings = RedisSettings.from_dsn(settings.REDIS_URL)