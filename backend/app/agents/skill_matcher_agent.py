import re
from typing import List, Dict, Any, Optional
from app.agents.state import PipelineState, SkillMatchDict
from app.services.vector_store import VectorStore

async def skill_matcher_agent(state: PipelineState) -> PipelineState:
    job_id = state.get("job_id", "default_job")
    candidate_id = state.get("candidate_id", "cand_default")
    mandatory_skills = state.get("mandatory_skills", [])
    preferred_skills = state.get("preferred_skills", [])
    parsed_skills = state.get("parsed_skills", [])
    redacted_resume = state.get("redacted_resume_text", "")

    vector_store = VectorStore(collection_name=f"resume_{job_id}")

    matched_mandatory: List[SkillMatchDict] = []
    missing_mandatory: List[str] = []

    matched_preferred: List[SkillMatchDict] = []
    missing_preferred: List[str] = []

    # Helper function to find best evidence snippet for a skill
    def find_skill_evidence(skill_name: str) -> Optional[Dict[str, Any]]:
        # Vector similarity search over candidate's resume chunks
        query_results = vector_store.search_similarity(
            query=f"Experience and proficiency with {skill_name}",
            n_results=3,
            filter_metadata={"candidate_id": candidate_id}
        )

        for match in query_results:
            if match.get("similarity_score", 0.0) >= 0.55 or skill_name.lower() in match.get("text", "").lower():
                return {
                    "skill": skill_name,
                    "evidence_text": match["text"],
                    "similarity_score": float(match.get("similarity_score", 0.90)),
                    "source_location": f"Resume chunk (line {match['metadata'].get('line_num', 1)})"
                }

        # Regex / text search fallback across resume lines
        for idx, line in enumerate(redacted_resume.split("\n")):
            if skill_name.lower() in line.lower():
                return {
                    "skill": skill_name,
                    "evidence_text": line.strip(),
                    "similarity_score": 0.95,
                    "source_location": f"Resume line {idx + 1}"
                }

        return None

    # Check Mandatory Skills
    for skill in mandatory_skills:
        evidence = find_skill_evidence(skill)
        if evidence:
            matched_mandatory.append(evidence)
        else:
            missing_mandatory.append(skill)

    # Check Preferred Skills
    for skill in preferred_skills:
        evidence = find_skill_evidence(skill)
        if evidence:
            matched_preferred.append(evidence)
        else:
            missing_preferred.append(skill)

    return {
        **state,
        "matched_mandatory": matched_mandatory,
        "missing_mandatory": missing_mandatory,
        "matched_preferred": matched_preferred,
        "missing_preferred": missing_preferred
    }
