import re
from typing import List, Any, Dict
from app.agents.state import PipelineState
from app.services.pii_redactor import PIIRedactor
from app.services.llm_provider import get_llm_provider
from app.services.vector_store import VectorStore

def extract_structured_education(text: str, llm_extracted: List[Any]) -> List[str]:
    results = []
    
    # 1. Add valid LLM extracted items
    for item in (llm_extracted or []):
        clean = str(item).strip()
        if clean and len(clean) > 3:
            clean = re.sub(r'\[.*?\]', '', clean).strip()
            clean = re.sub(r'[\s,;:\|]+$', '', clean).strip()
            if clean and not any(clean.lower() == r.lower() for r in results):
                results.append(clean)
                
    # 2. Degree + Major / Specialization Regex
    degree_regex = re.compile(
        r'\b(?:B\.?\s*Tech(?:\.?|\b)|BTech\b|B\.?\s*E\.?\b|Bachelor(?:\'s)?(?:\s+of\s+[A-Za-z]+)?|B\.?\s*Sc\.?\b|BSc\b|B\.?\s*S\.?\b|BCA\b|B\.?\s*Com\b|B\.?\s*A\.?\b|'
        r'M\.?\s*Tech(?:\.?|\b)|MTech\b|M\.?\s*E\.?\b|Master(?:\'s)?(?:\s+of\s+[A-Za-z]+)?|M\.?\s*Sc\.?\b|MSc\b|M\.?\s*S\.?\b|MCA\b|MBA\b|'
        r'Ph\.?D\b|Doctorate\b|Diploma\b|Intermediate\b|Higher\s+Secondary\b|Senior\s+Secondary\b|12th(?:\s+Grade|\s+Class)?|10th(?:\s+Grade|\s+Class)?)'
        r'(?:\s+(?:in|[-–—:]|\/|\()?\s*[A-Za-z0-9\s&/\(\)\.-]+?(?=\s*(?:\[|\n|,|;|\.|$|learning|skilled|experience|cgpa|gpa|\b20\d\d\b)))?',
        re.IGNORECASE
    )

    # 3. College / University / Institute / School Regex
    univ_regex = re.compile(
        r'([^\n,;]*?(?:University|College|Institute|Academy|School|Vidyalaya|Autonomous)[^\n]*)',
        re.IGNORECASE
    )

    # Scan for degrees
    for m in degree_regex.finditer(text):
        deg = m.group(0).strip()
        deg = re.sub(r'\[.*?\]', '', deg).strip()
        deg = re.sub(r'[\s,;:\|]+$', '', deg).strip()
        if len(deg) >= 3 and not any(k in deg.lower() for k in ['learning', 'skilled', 'experience', 'react', 'python', 'java', 'sql']):
            if not any(deg.lower() in r.lower() or r.lower() in deg.lower() for r in results):
                results.append(deg)

    # Scan for universities / colleges
    for m in univ_regex.finditer(text):
        univ = m.group(0).strip()
        univ = re.sub(r'\[.*?\]', '', univ).strip()
        univ = re.sub(r'[\s,;:\|]+$', '', univ).strip()
        if 6 <= len(univ) <= 150 and not any(k in univ.lower() for k in ['learning', 'skilled', 'experience', 'react', 'python', 'java']):
            if not any(univ.lower() in r.lower() or r.lower() in univ.lower() for r in results):
                results.append(univ)

    return results


def extract_structured_certifications(text: str, llm_extracted: List[Any]) -> List[str]:
    results = []
    
    # 1. Add valid LLM extracted items
    for item in (llm_extracted or []):
        clean = str(item).strip()
        if clean and len(clean) > 3:
            clean = re.sub(r'\[.*?\]', '', clean).strip()
            clean = re.sub(r'[\s,;:\|]+$', '', clean).strip()
            if clean and not any(clean.lower() == r.lower() for r in results):
                results.append(clean)
                
    # 2. Certifications Pattern
    cert_regex = re.compile(
        r'(?:AWS|Amazon\s*Web\s*Services|Azure|Microsoft|Google\s+Cloud|GCP|Oracle|Cisco|Red\s*Hat|Docker|Kubernetes|CKA|CKAD|PMP|Scrum\s*Master|Certified|Certification|Coursera|Udemy|HackerRank|NPTEL|CompTIA)'
        r'[^\n,;]*(?:Certified|Practitioner|Associate|Professional|Specialist|Developer|Architect|Master|Administrator|Certification|Course|Credentials|\d{4})[^\n,;\|]*',
        re.IGNORECASE
    )

    for m in cert_regex.finditer(text):
        cert = m.group(0).strip()
        cert = re.sub(r'\[.*?\]', '', cert).strip()
        cert = re.sub(r'[\s,;:\|]+$', '', cert).strip()
        if len(cert) >= 5 and not any(k in cert.lower() for k in ['experience', 'work history', 'skills']):
            if not any(cert.lower() in r.lower() or r.lower() in cert.lower() for r in results):
                results.append(cert)

    return results


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

    prompt = (
        "TASK: Thoroughly parse the following redacted candidate resume and extract all structured attributes.\n\n"
        "1. SKILLS: Extract ALL technical skills, tools, programming languages, databases, frameworks, libraries, APIs, and platforms.\n"
        "2. WORK EXPERIENCE: Extract all work experience entries (title, company, duration, responsibilities/achievements).\n"
        "3. TOTAL EXPERIENCE: Calculate total relevant years of industry/professional experience as a float.\n"
        "4. EDUCATION (CRITICAL): Extract ALL educational qualifications, degrees, diplomas, high school/intermediate, majors, branches, and colleges/universities. Examples:\n"
        "   - 'B.Tech in Computer Science and Engineering (AI & ML)', 'B.TECH CSE(AI AND ML)', 'Bachelor of Technology'\n"
        "   - 'B.E. in Information Technology', 'B.Sc Computer Science', 'MCA', 'M.Tech'\n"
        "   - Include college/university name, CGPA/marks, and graduation years if present.\n"
        "   - DO NOT return an empty list if any degree or university is mentioned anywhere in the resume.\n"
        "5. CERTIFICATIONS (CRITICAL): Extract ALL certifications, licenses, and credentials (e.g. 'AWS Certified Cloud Practitioner - Amazon Web Services (AWS)', 'Azure Fundamentals', 'Google Cloud Certified', 'Docker Certified').\n"
        "6. PROJECTS: Extract project titles and implementation descriptions.\n\n"
        f"REDACTED_RESUME_START\n{redacted_resume}\nREDACTED_RESUME_END"
    )
    extracted = await llm.generate_json(prompt, schema_desc)

    # Compute total experience years directly from date ranges / text if present to ensure accuracy
    exp_years = float(extracted.get("total_experience_years", 0.0) or 0.0)
    if exp_years == 0.0:
        matches = re.findall(r'(\d+(?:\.\d+)?)\+?\s*(?:years?|yrs?)', redacted_resume.lower())
        if matches:
            exp_years = max([float(m) for m in matches])
        elif "2021" in redacted_resume and any(k in redacted_resume.lower() for k in ["present", "2024", "2025", "2026"]):
            exp_years = 3.5

    # Step 3: Clean & enhance Education and Certifications lists from both LLM extraction and text patterns
    combined_text = (raw_resume + "\n" + redacted_resume).strip()
    education_list = extract_structured_education(combined_text, extracted.get("education", []))
    certifications_list = extract_structured_certifications(combined_text, extracted.get("certifications", []))

    # Step 4: Embed resume chunks into vector store for RAG semantic search
    vector_store = VectorStore(collection_name=f"resume_{candidate_id}")

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

