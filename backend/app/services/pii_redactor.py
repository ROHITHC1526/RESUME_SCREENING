import re
import uuid
from typing import Tuple, Dict, Any

class PIIRedactor:
    """
    Strips and masks PII and protected demographic attributes from resume text
    before passing it downstream to AI scoring agents.
    """

    EMAIL_PATTERN = re.compile(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b')
    PHONE_PATTERN = re.compile(r'(\+?\d{1,3}[\s.-]?)?\(?\d{2,4}\)?[\s.-]?\d{3,4}(?:[\s.-]?\d{3,4})?')
    URL_PATTERN = re.compile(r'https?://\S+|www\.\S+|linkedin\.com/\S+|github\.com/\S+')
    AGE_PATTERN = re.compile(r'\b(age[:\s]+\d{1,2}|\d{1,2}\s*years?\s*old|date\s*of\s*birth[:\s]+[^\n]+|dob[:\s]+[^\n]+|born\s+in\s+\d{4})\b', re.IGNORECASE)
    GENDER_PATTERN = re.compile(r'\b(gender[:\s]+(male|female|non-binary|other)|sex[:\s]+(male|female)|pronouns[:\s]+(he/him|she/her|they/them))\b', re.IGNORECASE)
    MARITAL_PATTERN = re.compile(r'\b(marital\s*status[:\s]+(single|married|divorced|widowed)|married|single\s+status)\b', re.IGNORECASE)
    NATIONALITY_PATTERN = re.compile(r'\b(nationality[:\s]+[^\n]+|citizenship[:\s]+[^\n]+|visa\s*status[:\s]+[^\n]+|us\s*citizen|green\s*card\s*holder)\b', re.IGNORECASE)
    RELIGION_PATTERN = re.compile(r'\b(religion[:\s]+[^\n]+|christian|muslim|hindu|jewish|buddhist|sikh|atheist)\b', re.IGNORECASE)
    DISABILITY_PATTERN = re.compile(r'\b(disability\s*status[:\s]+[^\n]+|disabled|handicapped|wheelchair)\b', re.IGNORECASE)

    @classmethod
    def extract_contact_info(cls, text: str) -> Dict[str, Any]:
        """
        Extracts candidate full name and email address from raw unredacted resume text.
        This metadata is used exclusively for candidate file storage naming and transactional email notifications.
        It is NEVER passed to the LLM scoring pipeline.
        """
        emails = cls.EMAIL_PATTERN.findall(text)
        extracted_email = emails[0] if emails else None

        extracted_name = None
        lines = [line.strip() for line in text.strip().split('\n') if line.strip()]
        if lines:
            first_line = lines[0]
            # Check if first line resembles a human name (e.g. "Jane Smith", "Jordan Patel")
            # Exclude lines with email, phone numbers, or section titles
            if (len(first_line) < 40 and 
                not cls.EMAIL_PATTERN.search(first_line) and 
                not any(kw in first_line.lower() for kw in ['resume', 'curriculum', 'cv', 'experience', 'education', 'skills', 'contact', 'summary'])):
                # Clean name: remove special chars
                clean_name = re.sub(r'[^a-zA-Z\s]', '', first_line).strip()
                if len(clean_name.split()) in [2, 3]:
                    extracted_name = clean_name

        return {
            "extracted_name": extracted_name,
            "extracted_email": extracted_email
        }

    @classmethod
    def redact(cls, text: str, candidate_id: str = None) -> Tuple[str, Dict[str, Any]]:

        if not candidate_id:
            candidate_id = f"CANDIDATE_{uuid.uuid4().hex[:8].upper()}"

        redacted_text = text
        report = {
            "candidate_token": candidate_id,
            "items_redacted": {
                "emails": 0,
                "phones": 0,
                "urls": 0,
                "age_dob": 0,
                "gender": 0,
                "marital_status": 0,
                "nationality": 0,
                "religion": 0,
                "disability": 0
            }
        }

        # Redact emails
        emails = cls.EMAIL_PATTERN.findall(redacted_text)
        report["items_redacted"]["emails"] = len(emails)
        redacted_text = cls.EMAIL_PATTERN.sub("[EMAIL REDACTED]", redacted_text)

        # Redact phones
        phones = cls.PHONE_PATTERN.findall(redacted_text)
        report["items_redacted"]["phones"] = len(phones)
        redacted_text = cls.PHONE_PATTERN.sub("[PHONE REDACTED]", redacted_text)

        # Redact URLs
        urls = cls.URL_PATTERN.findall(redacted_text)
        report["items_redacted"]["urls"] = len(urls)
        redacted_text = cls.URL_PATTERN.sub("[URL REDACTED]", redacted_text)

        # Redact Age / DOB
        ages = cls.AGE_PATTERN.findall(redacted_text)
        report["items_redacted"]["age_dob"] = len(ages)
        redacted_text = cls.AGE_PATTERN.sub("[AGE/DOB REDACTED]", redacted_text)

        # Redact Gender
        genders = cls.GENDER_PATTERN.findall(redacted_text)
        report["items_redacted"]["gender"] = len(genders)
        redacted_text = cls.GENDER_PATTERN.sub("[GENDER REDACTED]", redacted_text)

        # Redact Marital Status
        maritals = cls.MARITAL_PATTERN.findall(redacted_text)
        report["items_redacted"]["marital_status"] = len(maritals)
        redacted_text = cls.MARITAL_PATTERN.sub("[MARITAL STATUS REDACTED]", redacted_text)

        # Redact Nationality
        nationalities = cls.NATIONALITY_PATTERN.findall(redacted_text)
        report["items_redacted"]["nationality"] = len(nationalities)
        redacted_text = cls.NATIONALITY_PATTERN.sub("[NATIONALITY REDACTED]", redacted_text)

        # Redact Religion
        religions = cls.RELIGION_PATTERN.findall(redacted_text)
        report["items_redacted"]["religion"] = len(religions)
        redacted_text = cls.RELIGION_PATTERN.sub("[RELIGION REDACTED]", redacted_text)

        # Redact Disability
        disabilities = cls.DISABILITY_PATTERN.findall(redacted_text)
        report["items_redacted"]["disability"] = len(disabilities)
        redacted_text = cls.DISABILITY_PATTERN.sub("[DISABILITY REDACTED]", redacted_text)

        # Mask top line / potential candidate name if it looks like a header name
        lines = redacted_text.strip().split('\n')
        if lines:
            first_line = lines[0].strip()
            # If first line is short and doesn't contain obvious keywords, replace with token header
            if len(first_line) < 40 and not any(kw in first_line.lower() for kw in ['resume', 'curriculum', 'cv', 'experience', 'education', 'skills']):
                lines[0] = f"Candidate Identifier: {candidate_id}"
                redacted_text = '\n'.join(lines)

        return redacted_text, report
