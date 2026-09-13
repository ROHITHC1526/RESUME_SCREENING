import pytest
import asyncio
from app.agents.pipeline import pipeline_app
from app.agents.ranking_agent import rank_candidates
from app.services.pii_redactor import PIIRedactor

@pytest.mark.asyncio
async def test_candidate_acceptance_criteria():
    raw_jd = """
    We are seeking a Senior Backend Engineer.
    Mandatory Requirements:
    - Python programming language
    - FastAPI framework
    - Machine Learning experience
    - Minimum 2 years of professional software engineering experience

    Preferred Skills:
    - PostgreSQL
    - Redis
    """

    sample_resume = """
    Jane Smith
    Contact: jane.smith@techcorp.io | +1-555-0199
    Location: San Francisco, CA | Age: 28

    PROFESSIONAL SUMMARY
    Backend Software Engineer with 3 years of hands-on experience building scalable applications.

    SKILLS
    Python, FastAPI, Machine Learning, PostgreSQL, Redis, Docker, Git

    WORK EXPERIENCE
    Software Engineer | AI Solutions Inc. | 2021 - Present (3 years)
    - Engineered high-performance microservices using Python and FastAPI.
    - Implemented Machine Learning models for candidate matching algorithms.
    - Managed relational databases with PostgreSQL and cached session tokens in Redis.
    """

    initial_state = {
        "job_id": "test_job_101",
        "candidate_id": "cand_jane_doe_101",
        "raw_jd_text": raw_jd,
        "raw_resume_text": sample_resume
    }

    # Execute LangGraph Pipeline
    final_state = await pipeline_app.ainvoke(initial_state)

    # 1. Assert PII Redaction was executed
    assert "jane.smith@techcorp.io" not in final_state["redacted_resume_text"]
    assert "+1-555-0199" not in final_state["redacted_resume_text"]

    # 2. Assert Mandatory Skills Matched
    matched_skills = [m["skill"] for m in final_state["matched_mandatory"]]
    for req_skill in ["Python", "FastAPI", "Machine Learning"]:
        assert any(req_skill.lower() in m.lower() for m in matched_skills), f"Skill '{req_skill}' should be matched"

    # 3. Assert Evidence Text Exists for each matched mandatory skill
    for match in final_state["matched_mandatory"]:
        assert match["evidence_text"] is not None and len(match["evidence_text"]) > 0

    # 4. Assert Experience Strength with exact evidence snippet
    experience_strengths = [
        s for s in final_state["strengths"] if "experience" in s["title"].lower() or "experience" in s["evidence"].lower()
    ]
    assert len(experience_strengths) > 0
    exp_evidence = experience_strengths[0]["evidence"]
    assert "3" in exp_evidence and "2" in exp_evidence, f"Experience evidence should show 3 years >= 2 years, got: {exp_evidence}"

    # 5. Assert Classification Tier is Strong Match
    assert final_state["recommendation"] == "Strong Match"
    assert final_state["match_percentage"] >= 80.0

    # 6. Assert Reviewer Validation
    assert final_state["reviewer_status"] == "validated"

    # 7. Test Candidate Ranking
    ranked = rank_candidates([final_state])
    assert len(ranked) == 1
    assert ranked[0]["rank"] == 1
    assert "Rank #1" in ranked[0]["justification"]

    print("\n✅ ACCEPTANCE TEST PASSED! Candidate classified as Strong Match with full text evidence.")

if __name__ == "__main__":
    asyncio.run(test_candidate_acceptance_criteria())
