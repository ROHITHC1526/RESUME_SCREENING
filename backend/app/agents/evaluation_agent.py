from typing import List, Dict, Any
from app.agents.state import PipelineState

async def candidate_evaluation_agent(state: PipelineState) -> PipelineState:
    mandatory_skills = state.get("mandatory_skills", [])
    matched_mandatory = state.get("matched_mandatory", [])
    missing_mandatory = state.get("missing_mandatory", [])

    preferred_skills = state.get("preferred_skills", [])
    matched_preferred = state.get("matched_preferred", [])

    min_exp_years = state.get("min_experience_years", 0.0)
    total_exp_years = state.get("total_experience_years", 0.0)

    education = state.get("education", [])

    # 1. Mandatory skill coverage score (50% weight)
    mandatory_score = 0.0
    if mandatory_skills:
        mandatory_score = (len(matched_mandatory) / len(mandatory_skills)) * 50.0
    else:
        mandatory_score = 50.0

    # 2. Experience sufficiency score (25% weight)
    exp_score = 0.0
    if min_exp_years > 0:
        ratio = min(1.0, total_exp_years / min_exp_years)
        exp_score = ratio * 25.0
    else:
        exp_score = 25.0

    # 3. Preferred skill coverage score (15% weight)
    preferred_score = 0.0
    if preferred_skills:
        preferred_score = (len(matched_preferred) / len(preferred_skills)) * 15.0
    else:
        preferred_score = 15.0

    # 4. Education & certification alignment (10% weight)
    edu_score = 10.0 if education else 5.0

    # Total Match Percentage calculation
    match_percentage = round(mandatory_score + exp_score + preferred_score + edu_score, 2)

    # Classify Recommendation Tier
    if match_percentage >= 80.0:
        recommendation = "Strong Match"
    elif match_percentage >= 50.0:
        recommendation = "Moderate Match"
    else:
        recommendation = "Low Match"

    # Consolidate evidence, strengths, and gaps
    strengths: List[Dict[str, Any]] = []
    gaps: List[Dict[str, Any]] = []
    evidence: List[Dict[str, Any]] = []

    # Mandatory skill matches as strengths with evidence
    for match in matched_mandatory:
        s_item = {
            "title": f"Matched Mandatory Skill: {match['skill']}",
            "evidence": match["evidence_text"],
            "source": match.get("source_location", "Resume")
        }
        strengths.append(s_item)
        evidence.append(s_item)

    # Experience strength/gap with evidence
    if total_exp_years >= min_exp_years:
        exp_evidence = f"relevant_experience: {total_exp_years} years >= {min_exp_years} years required"
        exp_item = {
            "title": f"Experience Requirement Satisfied ({total_exp_years} yrs)",
            "evidence": exp_evidence,
            "source": "Work History Analysis"
        }
        strengths.append(exp_item)
        evidence.append(exp_item)
    else:
        gap_item = {
            "title": f"Experience Gap",
            "evidence": f"Candidate has {total_exp_years} years experience vs. {min_exp_years} years required",
            "source": "Work History Analysis"
        }
        gaps.append(gap_item)

    # Preferred skill matches as strengths
    for match in matched_preferred:
        pref_item = {
            "title": f"Matched Preferred Skill: {match['skill']}",
            "evidence": match["evidence_text"],
            "source": match.get("source_location", "Resume")
        }
        strengths.append(pref_item)
        evidence.append(pref_item)

    # Missing mandatory skills as gaps
    for skill in missing_mandatory:
        gap_item = {
            "title": f"Missing Mandatory Skill: {skill}",
            "evidence": f"No text snippet or semantically similar experience found for required skill '{skill}'",
            "source": "Skill Gap Analysis"
        }
        gaps.append(gap_item)

    return {
        **state,
        "match_percentage": match_percentage,
        "mandatory_score": mandatory_score,
        "experience_score": exp_score,
        "education_score": edu_score,
        "preferred_score": preferred_score,
        "cert_score": 0.0,
        "recommendation": recommendation,
        "strengths": strengths,
        "gaps": gaps,
        "evidence": evidence
    }
