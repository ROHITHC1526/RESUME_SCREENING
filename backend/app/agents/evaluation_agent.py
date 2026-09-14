from typing import List, Dict, Any
from app.agents.state import PipelineState

async def candidate_evaluation_agent(state: PipelineState) -> PipelineState:
    mandatory_skills = state.get("mandatory_skills", [])
    matched_mandatory = state.get("matched_mandatory", [])
    missing_mandatory = state.get("missing_mandatory", [])

    preferred_skills = state.get("preferred_skills", [])
    matched_preferred = state.get("matched_preferred", [])
    missing_preferred = state.get("missing_preferred", [])

    min_exp_years = float(state.get("min_experience_years", 0.0) or 0.0)
    total_exp_years = float(state.get("total_experience_years", 0.0) or 0.0)

    education = state.get("education", [])
    certifications = state.get("certifications", [])
    work_exp = state.get("work_experience", [])
    projects = state.get("projects", [])
    raw_resume = state.get("raw_resume_text", "")
    redacted_resume = state.get("redacted_resume_text", "")

    # =========================================================================
    # 1. SCORING ENGINE (Mandatory, Optional, Experience, Education, Certs)
    # =========================================================================
    # A. Mandatory skill score (Up to 55%)
    mandatory_score = 0.0
    if mandatory_skills:
        mandatory_score = (len(matched_mandatory) / len(mandatory_skills)) * 55.0
    else:
        # If no mandatory skills specified, allocate base depending on optional skills
        mandatory_score = 30.0 if matched_preferred else 15.0

    # B. Preferred / Optional skill score (Up to 20%)
    preferred_score = 0.0
    if preferred_skills:
        preferred_score = (len(matched_preferred) / len(preferred_skills)) * 20.0
    else:
        # If no optional skills defined in job, award proportional bonus based on extra skills found
        preferred_score = 15.0 if not mandatory_skills else 5.0

    # C. Experience score (Up to 15%)
    exp_score = 0.0
    if min_exp_years > 0:
        ratio = min(1.0, total_exp_years / min_exp_years)
        exp_score = ratio * 15.0
    else:
        exp_score = 12.0 if total_exp_years > 0 else 5.0

    # D. Education & Certifications (Up to 10% total: 5% edu + 5% cert)
    edu_score = 5.0 if education else 0.0
    cert_score = 5.0 if certifications else 0.0

    # Total Dynamic Score Calculation
    raw_match = mandatory_score + preferred_score + exp_score + edu_score + cert_score
    if mandatory_skills and len(matched_mandatory) == 0:
        match_percentage = round(min(20.0, raw_match), 1)
    else:
        match_percentage = round(min(100.0, raw_match), 1)

    # Classify Recommendation Tier
    if match_percentage >= 75.0:
        recommendation = "Strong Match"
    elif match_percentage >= 45.0:
        recommendation = "Moderate Match"
    else:
        recommendation = "Low Match"

    # =========================================================================
    # 2. CANDIDATE STRENGTHS (Qualitative Competency & Architectural Insights)
    # =========================================================================
    strengths: List[Dict[str, Any]] = []

    # Strength 1: Core Mandatory Competency Synthesis
    if matched_mandatory:
        matched_mand_names = [m["skill"] for m in matched_mandatory]
        mand_coverage_pct = round((len(matched_mandatory) / len(mandatory_skills) * 100)) if mandatory_skills else 100
        strengths.append({
            "title": f"Core Technical Proficiency ({len(matched_mandatory)}/{len(mandatory_skills or matched_mandatory)} Mandatory Skills Verified - {mand_coverage_pct}%)",
            "evidence": f"Demonstrated practical expertise across required core technologies ({', '.join(matched_mand_names)}) with verified implementations in candidate profile.",
            "source": "Core Skill Competency Matrix"
        })

    # Strength 2: Optional / Bonus Stack Alignment
    if matched_preferred:
        matched_pref_names = [m["skill"] for m in matched_preferred]
        strengths.append({
            "title": f"Secondary & Optional Stack Versatility ({len(matched_preferred)} Bonus Skills Matched)",
            "evidence": f"Broadens technical delivery with verified bonus competencies ({', '.join(matched_pref_names)}), reducing onboarding overhead and enabling cross-functional agility.",
            "source": "Optional Skillset Assessment"
        })

    # Strength 3: Experience & Seniority Depth
    if total_exp_years >= min_exp_years and (total_exp_years > 0 or min_exp_years > 0):
        strengths.append({
            "title": f"Professional Experience Requirement Satisfied ({total_exp_years} Years Demonstrated)",
            "evidence": f"Candidate provides {total_exp_years} years of relevant industry experience, meeting or surpassing the required baseline threshold of {min_exp_years} years.",
            "source": "Work History Analysis"
        })
    elif total_exp_years > 0:
        strengths.append({
            "title": f"Demonstrated Industry Experience ({total_exp_years} Years)",
            "evidence": f"Candidate possesses {total_exp_years} years of hands-on professional software engineering / domain experience.",
            "source": "Work History Analysis"
        })

    # Strength 4: Project Track Record & System Implementations
    if projects:
        proj_highlights = "; ".join([str(p) for p in projects[:3]])
        strengths.append({
            "title": f"Proven Project Delivery & Architecture Track Record ({len(projects)} Key Projects)",
            "evidence": f"Demonstrates hands-on engineering execution across tangible projects: {proj_highlights}.",
            "source": "Project Portfolio Evaluation"
        })
    elif work_exp:
        roles_summary = ", ".join([f"{e.get('title', 'Engineer')} at {e.get('company', 'Organization')}" for e in work_exp[:3]])
        strengths.append({
            "title": "Demonstrated Professional Work History",
            "evidence": f"Candidate has documented engineering tenure across: {roles_summary}.",
            "source": "Work Experience Evaluation"
        })

    # Strength 5: Academic & Certified Credentials
    if education or certifications:
        creds = []
        if education:
            creds.extend([str(e) for e in education[:2]])
        if certifications:
            creds.extend([str(c) for c in certifications[:2]])
        strengths.append({
            "title": "Verified Academic & Professional Credentials",
            "evidence": f"Holds relevant recognized background: {', '.join(creds)}.",
            "source": "Education & Credential Audit"
        })

    # =========================================================================
    # 3. CANDIDATE GAPS (Missing Mandatory & Optional Requirements)
    # =========================================================================
    gaps: List[Dict[str, Any]] = []

    # Missing mandatory skills as high-priority gaps
    for skill in missing_mandatory:
        gaps.append({
            "title": f"Missing Mandatory Skill: {skill}",
            "evidence": f"No verifiable evidence or hands-on reference found for '{skill}' in candidate resume.",
            "source": "Mandatory Skill Gap Analysis"
        })

    # Missing preferred / optional skills
    for skill in missing_preferred:
        gaps.append({
            "title": f"Missing Optional Skill: {skill}",
            "evidence": f"Candidate resume does not mention optional bonus competency '{skill}'.",
            "source": "Optional Skill Gap Analysis"
        })

    # Experience shortfall gap if applicable
    if min_exp_years > 0 and total_exp_years < min_exp_years:
        gaps.append({
            "title": f"Experience Shortfall ({total_exp_years} yrs vs. {min_exp_years} yrs required)",
            "evidence": f"Candidate has {total_exp_years} years of documented experience against the required minimum of {min_exp_years} years.",
            "source": "Experience Gap Analysis"
        })

    # =========================================================================
    # 4. VERBATIM RESUME EVIDENCE SPANS (Rich, multi-sentence, comprehensive)
    # =========================================================================
    evidence: List[Dict[str, Any]] = []

    # A. Verbatim evidence for Matched Mandatory Skills
    for match in matched_mandatory:
        evidence.append({
            "title": f"Matched Mandatory Skill: {match['skill']}",
            "evidence": match["evidence_text"],
            "source": match.get("source_location", "Resume Text")
        })

    # B. Verbatim evidence for Matched Optional Skills
    for match in matched_preferred:
        evidence.append({
            "title": f"Matched Optional Skill: {match['skill']}",
            "evidence": match["evidence_text"],
            "source": match.get("source_location", "Resume Text")
        })

    # C. Verbatim Work Experience Spans
    for exp in work_exp:
        title = exp.get("title", "Role")
        company = exp.get("company", "Company")
        duration = exp.get("duration", "")
        desc = exp.get("description", "")
        exp_header = f"{title} at {company}" + (f" ({duration})" if duration else "")
        body_text = f"{exp_header}: {desc}" if desc else exp_header
        evidence.append({
            "title": f"Work Experience Span: {exp_header}",
            "evidence": body_text,
            "source": f"Work History ({company})"
        })

    # D. Verbatim Project Descriptions
    for proj in projects:
        proj_str = str(proj).strip()
        if proj_str:
            evidence.append({
                "title": f"Project Accomplishment Span: {proj_str[:45]}...",
                "evidence": proj_str,
                "source": "Projects Section"
            })

    # E. Verbatim Education Spans
    for edu in education:
        edu_str = str(edu).strip()
        if edu_str:
            evidence.append({
                "title": f"Academic Qualification Span: {edu_str[:40]}",
                "evidence": edu_str,
                "source": "Education Section"
            })

    # F. Verbatim Certification Spans
    for cert in certifications:
        cert_str = str(cert).strip()
        if cert_str:
            evidence.append({
                "title": f"Certification Credential Span: {cert_str[:40]}",
                "evidence": cert_str,
                "source": "Certifications Section"
            })

    # G. Additional Rich Context Excerpts from Resume Lines if available
    lines = [l.strip() for l in (redacted_resume or raw_resume).split('\n') if l.strip()]
    for idx, l in enumerate(lines[:15]):
        l_low = l.lower()
        if any(k in l_low for k in ["summary", "profile", "objective", "competencies", "highlights", "overview"]) and len(l) > 20:
            evidence.append({
                "title": f"Resume Profile & Summary Excerpt (Line {idx + 1})",
                "evidence": l,
                "source": f"Resume Line {idx + 1}"
            })
            break

    return {
        **state,
        "match_percentage": match_percentage,
        "mandatory_score": round(mandatory_score, 1),
        "experience_score": round(exp_score, 1),
        "education_score": round(edu_score, 1),
        "preferred_score": round(preferred_score, 1),
        "missing_mandatory": missing_mandatory,
        "missing_preferred": missing_preferred,
        "cert_score": round(cert_score, 1),
        "recommendation": recommendation,
        "strengths": strengths,
        "gaps": gaps,
        "evidence": evidence
    }

