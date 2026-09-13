from app.agents.state import PipelineState

async def reviewer_agent(state: PipelineState) -> PipelineState:
    evidence = state.get("evidence", [])
    matched_mandatory = state.get("matched_mandatory", [])
    missing_mandatory = state.get("missing_mandatory", [])
    match_percentage = state.get("match_percentage", 0.0)

    status = "validated"
    notes = "All scoring claims are backed by extracted text evidence."

    # Verification 1: High match score with zero mandatory matches -> flag
    if match_percentage > 70.0 and len(matched_mandatory) == 0 and len(state.get("mandatory_skills", [])) > 0:
        status = "flagged"
        notes = "Flagged: High match score assigned despite 0 matched mandatory skills."

    # Verification 2: Evidence array is empty -> flag
    elif not evidence:
        status = "flagged"
        notes = "Flagged: Scoring lacks supporting text evidence array."

    # Verification 3: High match score despite missing multiple mandatory skills -> flag
    elif match_percentage > 85.0 and len(missing_mandatory) > 1:
        status = "flagged"
        notes = "Flagged: Exceptional match score assigned despite multiple missing mandatory skills."

    return {
        **state,
        "reviewer_status": status,
        "reviewer_notes": notes
    }
