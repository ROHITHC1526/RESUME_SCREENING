import re
from typing import List, Dict, Any
from app.agents.state import PipelineState
from app.services.llm_provider import get_llm_provider
from app.services.vector_store import VectorStore

async def job_description_agent(state: PipelineState) -> PipelineState:
    # If the job already has explicit mandatory or preferred skills configured (e.g. by recruiter in wizard),
    # preserve them and do NOT overwrite them!
    existing_mandatory = state.get("mandatory_skills")
    existing_preferred = state.get("preferred_skills")
    has_configured_skills = (existing_mandatory is not None and len(existing_mandatory) > 0) or \
                            (existing_preferred is not None and len(existing_preferred) > 0)

    raw_jd = state.get("raw_jd_text", "")
    job_id = state.get("job_id", "default_job")

    if has_configured_skills:
        mandatory_skills = [s.strip() for s in (existing_mandatory or []) if s and str(s).strip()]
        preferred_skills = [s.strip() for s in (existing_preferred or []) if s and str(s).strip()]
        min_exp = float(state.get("min_experience_years", 0.0) or 0.0)
        edu_reqs = state.get("education_requirements", [])
        cert_reqs = state.get("certification_requirements", [])
        role_summary = state.get("role_summary", "Configured Job Requirements")
    else:
        llm = get_llm_provider()

        schema_desc = """
        {
          "mandatory_skills": ["string"],
          "preferred_skills": ["string"],
          "min_experience_years": float,
          "education_requirements": ["string"],
          "certification_requirements": ["string"],
          "role_summary": "string"
        }
        """

        prompt = (
            "TASK: Thoroughly analyze the following raw Job Description text. "
            "Extract ALL technical requirements, programming languages, frameworks, databases, "
            "cloud platforms, DevOps tools, libraries, APIs, and domain skills. "
            "Do NOT invent or omit skills mentioned in the JD. "
            "Distinguish between mandatory ('must have', 'required', core qualifications) and "
            "preferred ('nice to have', 'plus', 'bonus', 'optional') skills. "
            "Extract the minimum years of experience as a number (e.g. 3.0 for '3+ years', 'minimum 3 years', '3-5 years'). "
            "Extract any education requirements (e.g. Bachelor's in CS) and certification requirements (e.g. AWS Certified) mentioned in the JD.\n\n"
            f"JOB_DESCRIPTION_START\n{raw_jd}\nJOB_DESCRIPTION_END"
        )
        
        extracted = await llm.generate_json(prompt, schema_desc)

        # Experience fallback extraction if LLM returned 0.0 but text mentions experience
        min_exp = float(extracted.get("min_experience_years", 0.0) or 0.0)
        if min_exp == 0.0 and raw_jd:
            exp_patterns = [
                r'(?:min|minimum|at\s*least)\s*(\d+(?:\.\d+)?)\s*(?:yrs|years)',
                r'(\d+(?:\.\d+)?)\+?\s*(?:years?|yrs?)\s*(?:of)?\s*(?:relevant|industry|professional|work)?\s*(?:exp|experience)',
                r'(\d+(?:\.\d+)?)\+?\s*(?:years?|yrs?)\b',
                r'(\d+(?:\.\d+)?)\s*(?:to|-)\s*\d+\s*(?:years?|yrs?)'
            ]
            for rx in exp_patterns:
                m = re.search(rx, raw_jd.lower())
                if m:
                    min_exp = float(m.group(1))
                    break

        # Clean skill lists
        mandatory_skills = [s.strip() for s in extracted.get("mandatory_skills", []) if s and str(s).strip()]
        preferred_skills = [s.strip() for s in extracted.get("preferred_skills", []) if s and str(s).strip()]
        edu_reqs = extracted.get("education_requirements", [])
        cert_reqs = extracted.get("certification_requirements", [])
        role_summary = extracted.get("role_summary", "Role extracted from Job Description")

    # Embed JD requirement chunks into vector store
    vector_store = VectorStore(collection_name=f"jd_{job_id}")

    chunks = []
    metadatas = []
    ids = []

    for i, skill in enumerate(mandatory_skills):
        chunks.append(f"Mandatory Requirement: {skill}")
        metadatas.append({"type": "jd_requirement", "category": "mandatory", "skill": skill})
        ids.append(f"jd_mand_{i}")

    for i, skill in enumerate(preferred_skills):
        chunks.append(f"Preferred Requirement: {skill}")
        metadatas.append({"type": "jd_requirement", "category": "preferred", "skill": skill})
        ids.append(f"jd_pref_{i}")

    if chunks:
        vector_store.add_texts(chunks, metadatas, ids)

    return {
        **state,
        "mandatory_skills": mandatory_skills,
        "preferred_skills": preferred_skills,
        "min_experience_years": min_exp,
        "education_requirements": edu_reqs,
        "certification_requirements": cert_reqs,
        "role_summary": role_summary
    }
