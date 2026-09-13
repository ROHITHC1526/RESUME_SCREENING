from app.services.pii_redactor import PIIRedactor

def test_pii_redaction():
    sample_resume = """
    John Doe
    Email: john.doe@example.com | Phone: +1 (555) 123-4567
    LinkedIn: linkedin.com/in/johndoe | Age: 29 years old
    Gender: Male | Marital Status: Single | Nationality: US Citizen

    SUMMARY
    Senior Software Engineer with 3 years of experience building Python and FastAPI applications.

    SKILLS
    - Python, FastAPI, Machine Learning, PostgreSQL, Redis, Docker

    EXPERIENCE
    Senior Backend Engineer | TechCorp | 2021 - Present (3 years)
    - Developed high-throughput async microservices using Python and FastAPI.
    - Implemented Machine Learning models for predictive analytics.
    """

    redacted_text, report = PIIRedactor.redact(sample_resume, candidate_id="CANDIDATE_TEST123")

    assert "john.doe@example.com" not in redacted_text
    assert "+1 (555) 123-4567" not in redacted_text
    assert "john.doe" not in redacted_text
    assert "John Doe" not in redacted_text
    assert "[EMAIL REDACTED]" in redacted_text
    assert "[PHONE REDACTED]" in redacted_text
    assert "Candidate Identifier: CANDIDATE_TEST123" in redacted_text

    assert report["candidate_token"] == "CANDIDATE_TEST123"
    assert report["items_redacted"]["emails"] == 1
    assert report["items_redacted"]["phones"] == 1
    assert report["items_redacted"]["age_dob"] == 1
    assert report["items_redacted"]["gender"] == 1
    assert report["items_redacted"]["marital_status"] == 1
    assert report["items_redacted"]["nationality"] == 1

    # Ensure professional content is completely preserved
    assert "Senior Backend Engineer" in redacted_text
    assert "Python" in redacted_text
    assert "FastAPI" in redacted_text
    assert "Machine Learning" in redacted_text
    print("PIIRedactor test passed successfully!")

if __name__ == "__main__":
    test_pii_redaction()
