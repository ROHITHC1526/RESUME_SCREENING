import re
from app.agents.state import PipelineState
from app.services.llm_provider import get_llm_provider
from app.services.vector_store import VectorStore

async def job_description_agent(state: PipelineState) -> PipelineState:
    raw_jd = state.get("raw_jd_text", "")
    llm = get_llm_provider()

    schema_desc = """
    {
      "mandatory_skills": ["string"],
      "preferred_skills": ["string"],
      "min_experience_years": float,
      "education_requirements": ["string"],
      "role_summary": "string"
    }
    """

    prompt = f"TASK: Extract technical requirements.\n\nJOB_DESCRIPTION_START\n{raw_jd}\nJOB_DESCRIPTION_END"
    extracted = await llm.generate_json(prompt, schema_desc)

    # Rule-based fallback verification for min_experience_years if LLM returned 0
    if extracted.get("min_experience_years", 0) == 0:
        exp_match = re.search(r'(\d+)\+?\s*years?', raw_jd.lower())
        if exp_match:
            extracted["min_experience_years"] = float(exp_match.group(1))

    # Embed JD requirement chunks into vector store
    job_id = state.get("job_id", "default_job")
    vector_store = VectorStore(collection_name=f"jd_{job_id}")

    chunks = []
    metadatas = []
    ids = []

    for i, skill in enumerate(extracted.get("mandatory_skills", [])):
        chunks.append(f"Mandatory Requirement: {skill}")
        metadatas.append({"type": "jd_requirement", "category": "mandatory", "skill": skill})
        ids.append(f"jd_mand_{i}")

    for i, skill in enumerate(extracted.get("preferred_skills", [])):
        chunks.append(f"Preferred Requirement: {skill}")
        metadatas.append({"type": "jd_requirement", "category": "preferred", "skill": skill})
        ids.append(f"jd_pref_{i}")

    if chunks:
        vector_store.add_texts(chunks, metadatas, ids)

    return {
        **state,
        "mandatory_skills": extracted.get("mandatory_skills", []),
        "preferred_skills": extracted.get("preferred_skills", []),
        "min_experience_years": float(extracted.get("min_experience_years", 0.0)),
        "education_requirements": extracted.get("education_requirements", []),
        "role_summary": extracted.get("role_summary", "Software Engineering Position")
    }
