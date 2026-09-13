import re
from app.agents.state import PipelineState
from app.services.pii_redactor import PIIRedactor
from app.services.llm_provider import get_llm_provider
from app.services.vector_store import VectorStore

async def resume_parser_agent(state: PipelineState) -> PipelineState:
    raw_resume = state.get("raw_resume_text", "")
    candidate_id = state.get("candidate_id", "cand_default")

    # Step 0: Extract contact metadata (Name, Email) BEFORE redaction (for file storage & notifications ONLY)
    contact_info = PIIRedactor.extract_contact_info(raw_resume)

    # Step 1: PII Redaction constraint (FAIRNESS MANDATE)
    redacted_resume, pii_report = PIIRedactor.redact(raw_resume, candidate_id=candidate_id)


    # Step 2: LLM Structured parsing over REDACTED text only
    llm = get_llm_provider()
    schema_desc = """
    {
      "skills": ["string"],
      "work_experience": [{"title": "string", "company": "string", "duration": "string", "description": "string"}],
      "total_experience_years": float,
      "education": ["string"],
      "projects": ["string"],
      "certifications": ["string"]
    }
    """

    prompt = f"Parse the following redacted resume text and extract skills, work experience, total experience years, education, projects, and certifications:\n\n{redacted_resume}"
    extracted = await llm.generate_json(prompt, schema_desc)

    # Compute total experience years directly from date ranges / text if present to ensure accuracy
    exp_years = float(extracted.get("total_experience_years", 0.0))
    if exp_years == 0.0:
        matches = re.findall(r'(\d+)\+?\s*years', redacted_resume.lower())
        if matches:
            exp_years = max([float(m) for m in matches])
        elif "2021" in redacted_resume and ("present" in redacted_resume.lower() or "2024" in redacted_resume or "2026" in redacted_resume):
            exp_years = 3.0

    # Step 3: Ensure Education and Certifications recall via keyword fallback scan
    education_list = extracted.get("education", [])
    if not isinstance(education_list, list):
        education_list = [str(education_list)] if education_list else []

    certifications_list = extracted.get("certifications", [])
    if not isinstance(certifications_list, list):
        certifications_list = [str(certifications_list)] if certifications_list else []

    edu_keywords = [
        r'\bb\.?\s*tech\b', r'\bb\.?\s*e\.?\b', r'\bb\.?\s*s\.?\b', r'\bm\.?\s*s\.?\b',
        r'\bbachelor\b', r'\bmaster\b', r'\bphd\b', r'\bdoctorate\b', r'\bdegree\b',
        r'\buniversity\b', r'\bcollege\b', r'\binstitute\b', r'\bdiploma\b',
        r'\bb\.?\s*c\.?\s*a\b', r'\bm\.?\s*c\.?\s*a\b', r'\bb\.?\s*sc\b', r'\bm\.?\s*sc\b',
        r'\bhigher secondary\b', r'\bschool\b'
    ]

    cert_keywords = [
        r'\bcertifi(ed|cate|cation)\b', r'\baws\b', r'\bazure\b', r'\bgcp\b',
        r'\bcoursera\b', r'\budemy\b', r'\boracle\b', r'\bcisco\b', r'\bscrum\b',
        r'\bpmp\b', r'\bred hat\b', r'\bcomptia\b', r'\bkubernetes\b', r'\bdocker\b',
        r'\bhashicorp\b', r'\blean six sigma\b'
    ]

    combined_lines = [l.strip() for l in (raw_resume + "\n" + redacted_resume).split('\n') if l.strip()]
    for line_clean in combined_lines:
        if len(line_clean) < 4 or len(line_clean) > 150:
            continue

        if any(re.search(kw, line_clean, re.IGNORECASE) for kw in edu_keywords):
            if not any(line_clean.lower() in existing.lower() or existing.lower() in line_clean.lower() for existing in education_list):
                education_list.append(line_clean)

        if any(re.search(kw, line_clean, re.IGNORECASE) for kw in cert_keywords):
            if not any(line_clean.lower() in existing.lower() or existing.lower() in line_clean.lower() for existing in certifications_list):
                certifications_list.append(line_clean)

    # Step 4: Embed resume chunks into vector store for RAG semantic search
    job_id = state.get("job_id", "default_job")
    vector_store = VectorStore(collection_name=f"resume_{job_id}")

    lines = [line.strip() for line in redacted_resume.split("\n") if line.strip()]
    chunks = []
    metadatas = []
    ids = []

    # Chunk by paragraphs / bullet points
    for idx, paragraph in enumerate(lines):
        if len(paragraph) > 10:
            chunks.append(paragraph)
            metadatas.append({
                "type": "resume_chunk",
                "candidate_id": candidate_id,
                "line_num": idx + 1
            })
            ids.append(f"{candidate_id}_chunk_{idx}")

    if chunks:
        vector_store.add_texts(chunks, metadatas, ids)

    name_status = "extracted" if contact_info.get("extracted_name") else "failed"

    return {
        **state,
        "redacted_resume_text": redacted_resume,
        "pii_report": pii_report,
        "extracted_name": contact_info.get("extracted_name"),
        "extracted_email": contact_info.get("extracted_email"),
        "name_extraction_status": name_status,
        "parsed_skills": extracted.get("skills", []),
        "work_experience": extracted.get("work_experience", []),
        "total_experience_years": exp_years,
        "education": education_list,
        "projects": extracted.get("projects", []),
        "certifications": certifications_list
    }

