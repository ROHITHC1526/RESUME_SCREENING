import logging
from typing import Dict, Any

logger = logging.getLogger(__name__)

def send_candidate_notification_email(
    candidate_email: str,
    candidate_first_name: str,
    job_title: str,
    company_name: str = "TechCorp",
    custom_subject: str = None,
    custom_body: str = None
) -> Dict[str, Any]:
    """
    Sends a candidate notification email.
    In development/demo mode, this formats and logs the outbound email.
    """
    if not candidate_email:
        raise ValueError("Candidate email address is missing")

    first_name = candidate_first_name or "Candidate"
    
    subject = custom_subject or f"Update regarding your application for {job_title} at {company_name}"
    body = custom_body or (
        f"Dear {first_name},\n\n"
        f"Your resume has been shortlisted for further consideration for the {job_title} role at {company_name}. "
        f"Our talent acquisition team will be in touch with next steps shortly.\n\n"
        f"Best regards,\n"
        f"{company_name} Talent Acquisition Team"
    )
    
    # Replace template placeholders if custom body was supplied
    subject = subject.replace("{candidate_first_name}", first_name).replace("{job_title}", job_title).replace("{company_name}", company_name)
    body = body.replace("{candidate_first_name}", first_name).replace("{job_title}", job_title).replace("{company_name}", company_name)

    logger.info(f"[OUTBOUND EMAIL] To: {candidate_email} | Subject: {subject}\nBody:\n{body}")

    return {
        "status": "sent",
        "recipient": candidate_email,
        "subject": subject,
        "body": body
    }
