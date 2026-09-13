from typing import List, Dict, Any, Optional, TypedDict

class SkillMatchDict(TypedDict):
    skill: str
    evidence_text: str
    similarity_score: float
    source_location: str

class PipelineState(TypedDict, total=False):
    job_id: str
    candidate_id: str
    raw_jd_text: str
    raw_resume_text: str
    redacted_resume_text: str
    pii_report: Dict[str, Any]
    extracted_name: Optional[str]
    extracted_email: Optional[str]
    name_extraction_status: str


    # JD Agent Outputs
    mandatory_skills: List[str]
    preferred_skills: List[str]
    min_experience_years: float
    education_requirements: List[str]
    role_summary: str

    # Resume Parser Outputs
    parsed_skills: List[str]
    work_experience: List[Dict[str, Any]]
    total_experience_years: float
    education: List[str]
    projects: List[str]
    certifications: List[str]

    # Skill Matcher Outputs
    matched_mandatory: List[SkillMatchDict]
    missing_mandatory: List[str]
    matched_preferred: List[SkillMatchDict]
    missing_preferred: List[str]

    # Evaluation Agent Outputs
    match_percentage: float
    recommendation: str  # "Strong Match", "Moderate Match", "Low Match"
    strengths: List[Dict[str, Any]]
    gaps: List[Dict[str, Any]]
    evidence: List[Dict[str, Any]]

    # Reviewer Agent Outputs
    reviewer_status: str  # "validated", "flagged"
    reviewer_notes: str

    # Ranking Agent Output
    rank: Optional[int]
    justification: Optional[str]
