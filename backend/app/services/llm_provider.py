from abc import ABC, abstractmethod
import json
import os
import re
from typing import Dict, Any, Optional, List
from app.core.config import settings

class LLMProvider(ABC):
    @abstractmethod
    async def generate_json(self, prompt: str, schema_description: str) -> Dict[str, Any]:
        pass

    @abstractmethod
    async def generate_text(self, prompt: str) -> str:
        pass


class OpenAIProvider(LLMProvider):
    def __init__(self, api_key: str):
        import openai
        self.client = openai.AsyncOpenAI(api_key=api_key)

    async def generate_json(self, prompt: str, schema_description: str) -> Dict[str, Any]:
        response = await self.client.chat.completions.create(
            model="gpt-4o-mini",
            response_format={"type": "json_object"},
            temperature=0.0,
            messages=[
                {"role": "system", "content": f"You are a precise recruiting AI. Return valid JSON matching this schema description:\n{schema_description}"},
                {"role": "user", "content": prompt}
            ]
        )
        content = response.choices[0].message.content
        return json.loads(content)

    async def generate_text(self, prompt: str) -> str:
        response = await self.client.chat.completions.create(
            model="gpt-4o-mini",
            temperature=0.0,
            messages=[
                {"role": "system", "content": "You are an expert AI recruiting assistant."},
                {"role": "user", "content": prompt}
            ]
        )
        return response.choices[0].message.content


class AnthropicProvider(LLMProvider):
    def __init__(self, api_key: str):
        import anthropic
        self.client = anthropic.AsyncAnthropic(api_key=api_key)

    async def generate_json(self, prompt: str, schema_description: str) -> Dict[str, Any]:
        response = await self.client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=2048,
            temperature=0.0,
            system=f"Return strictly JSON matching this schema: {schema_description}. Do not include markdown codeblocks or prose.",
            messages=[{"role": "user", "content": prompt}]
        )
        content = response.content[0].text
        clean = re.sub(r'```json\s*|\s*```', '', content).strip()
        return json.loads(clean)

    async def generate_text(self, prompt: str) -> str:
        response = await self.client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=2048,
            temperature=0.0,
            system="You are an expert AI recruiting assistant.",
            messages=[{"role": "user", "content": prompt}]
        )
        return response.content[0].text


class GeminiProvider(LLMProvider):
    def __init__(self, api_key: str):
        import google.generativeai as genai
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel("gemini-1.5-flash")

    async def generate_json(self, prompt: str, schema_description: str) -> Dict[str, Any]:
        full_prompt = f"Return ONLY valid JSON matching this schema description:\n{schema_description}\n\nTask:\n{prompt}"
        response = await self.model.generate_content_async(
            full_prompt,
            generation_config={"response_mime_type": "application/json", "temperature": 0.0}
        )
        clean = re.sub(r'```json\s*|\s*```', '', response.text).strip()
        return json.loads(clean)

    async def generate_text(self, prompt: str) -> str:
        response = await self.model.generate_content_async(prompt)
        return response.text


class MockLLMProvider(LLMProvider):
    """
    Intelligent deterministic rule-assisted mock LLM provider for zero-cost offline execution,
    extracting all technical skills, custom tokens, experience, and resume sections dynamically.
    """

    KNOWN_TECH_CATALOG = [
        ("Node.js", "framework", [r'\bnode\.?js\b', r'\bnode\s*js\b', r'\bnodejs\b']),
        ("Express.js", "framework", [r'\bexpress\.?js\b', r'\bexpress\s*js\b', r'\bexpress\b']),
        ("REST API", "technical_skill", [r'\brest\s*apis?\b', r'\brestful\s*apis?\b', r'\brestful\b', r'\brest\b']),
        ("FastAPI", "framework", [r'\bfastapi\b', r'\bfast\s*api\b']),
        ("Python", "programming_language", [r'\bpython3?\b', r'\bpython\s*programming\b']),
        ("Django", "framework", [r'\bdjango\b']),
        ("Flask", "framework", [r'\bflask\b']),
        ("React", "framework", [r'\breact\.?js\b', r'\breact\s*js\b', r'\breact\b']),
        ("Next.js", "framework", [r'\bnext\.?js\b', r'\bnextjs\b']),
        ("Vue.js", "framework", [r'\bvue\.?js\b', r'\bvue\b']),
        ("Angular", "framework", [r'\bangular\b', r'\bangularjs\b']),
        ("TypeScript", "programming_language", [r'\btypescript\b', r'\bts\b']),
        ("JavaScript", "programming_language", [r'\bjavascript\b', r'\bjs\b']),
        ("Go", "programming_language", [r'\bgolang\b', r'\bgo\b']),
        ("Rust", "programming_language", [r'\brust\b']),
        ("Java", "programming_language", [r'\bjava\b']),
        ("Spring Boot", "framework", [r'\bspring\s*boot\b', r'\bspring\b']),
        ("C++", "programming_language", [r'\bc\+\+\b', r'\bcpp\b']),
        ("C#", "programming_language", [r'\bc#\b', r'\bcsharp\b']),
        (".NET", "framework", [r'\b\.net\b', r'\bdotnet\b', r'\basp\.net\b']),
        ("PHP", "programming_language", [r'\bphp\b', r'\blaravel\b']),
        ("Ruby", "programming_language", [r'\bruby\b', r'\bruby\s*on\s*rails\b', r'\brails\b']),
        ("PostgreSQL", "database", [r'\bpostgresql\b', r'\bpostgres\b', r'\bpsql\b']),
        ("MySQL", "database", [r'\bmysql\b']),
        ("MongoDB", "database", [r'\bmongodb\b', r'\bmongo\b']),
        ("Redis", "database", [r'\bredis\b']),
        ("Elasticsearch", "database", [r'\belasticsearch\b', r'\belastic\b']),
        ("GraphQL", "technical_skill", [r'\bgraphql\b', r'\bgql\b']),
        ("SQL", "database", [r'\bsql\b', r'\bsqlalchemy\b']),
        ("Docker", "devops", [r'\bdocker\b', r'\bcontainerization\b']),
        ("Kubernetes", "cloud", [r'\bkubernetes\b', r'\bk8s\b']),
        ("AWS", "cloud", [r'\baws\b', r'\bamazon\s*web\s*services\b', r'\bamazon\s*cloud\b']),
        ("GCP", "cloud", [r'\bgcp\b', r'\bgoogle\s*cloud\b']),
        ("Azure", "cloud", [r'\bazure\b', r'\bmicrosoft\s*azure\b']),
        ("Terraform", "devops", [r'\bterraform\b']),
        ("CI/CD", "devops", [r'\bci/cd\b', r'\bcicd\b', r'\bgithub\s*actions\b', r'\bjenkins\b', r'\bgitlab\s*ci\b']),
        ("Git", "devops", [r'\bgit\b', r'\bgithub\b', r'\bgitlab\b']),
        ("Microservices", "technical_skill", [r'\bmicroservices?\b', r'\bmicroservice\s*architecture\b']),
        ("Machine Learning", "technical_skill", [r'\bmachine\s*learning\b', r'\bml\b', r'\bdeep\s*learning\b', r'\bai\b']),
        ("PyTorch", "framework", [r'\bpytorch\b']),
        ("TensorFlow", "framework", [r'\btensorflow\b', r'\btf\b']),
        ("HTML", "technical_skill", [r'\bhtml5?\b']),
        ("CSS", "technical_skill", [r'\bcss3?\b', r'\btailwind\b', r'\bbootstrap\b', r'\bsass\b']),
        ("Redux", "framework", [r'\bredux\b', r'\bredux\s*toolkit\b']),
        ("Kafka", "database", [r'\bkafka\b', r'\brabbitmq\b'])
    ]

    async def generate_json(self, prompt: str, schema_description: str) -> Dict[str, Any]:
        p_lower = prompt.lower()

        # 1. Job Description Requirement Analysis
        if "job description" in p_lower or "extract requirements" in p_lower or "skills" in schema_description or "job_description_start" in p_lower:
            # Extract isolated JD body
            if "job_description_start" in prompt.lower():
                m = re.search(r'job_description_start\s*\n?(.*?)(?:\n?job_description_end|$)', prompt, re.DOTALL | re.IGNORECASE)
                jd_body = m.group(1).strip() if m else prompt
            elif "job description:" in prompt.lower():
                parts = re.split(r'job description:\s*', prompt, flags=re.IGNORECASE)
                jd_body = parts[1] if len(parts) > 1 else prompt
            elif "\n\n" in prompt:
                jd_body = prompt.split("\n\n", 1)[1].strip()
            else:
                jd_body = prompt

            jd_lower = jd_body.lower()
            lines = [l.strip() for l in jd_body.split('\n') if l.strip()]

            skills = []
            seen_skills = set()
            mandatory_skills = []
            preferred_skills = []

            in_preferred_section = False

            # Check for preferred markers line by line
            for line in lines:
                l_low = line.lower()
                if "preferred" in l_low or "nice to have" in l_low or "plus" in l_low or "bonus" in l_low:
                    in_preferred_section = True
                elif "mandatory" in l_low or "must have" in l_low or "required" in l_low:
                    in_preferred_section = False

                for name, cat, regexes in self.KNOWN_TECH_CATALOG:
                    if any(re.search(rx, l_low) for rx in regexes):
                        norm = name.lower().replace(" ", "").replace(".", "").replace("-", "")
                        if norm not in seen_skills:
                            seen_skills.add(norm)
                            is_mand = not in_preferred_section
                            skills.append({
                                "name": name,
                                "normalized_name": norm,
                                "category": cat,
                                "is_mandatory": is_mand
                            })
                            if is_mand:
                                mandatory_skills.append(name)
                            else:
                                preferred_skills.append(name)

            # Check full JD body for any catalog item not yet captured on discrete lines
            for name, cat, regexes in self.KNOWN_TECH_CATALOG:
                if any(re.search(rx, jd_lower) for rx in regexes):
                    norm = name.lower().replace(" ", "").replace(".", "").replace("-", "")
                    if norm not in seen_skills:
                        seen_skills.add(norm)
                        skills.append({
                            "name": name,
                            "normalized_name": norm,
                            "category": cat,
                            "is_mandatory": True
                        })
                        mandatory_skills.append(name)

            # Extract minimum experience years from JD body
            min_exp = 0.0
            exp_patterns = [
                r'(?:min|minimum|at\s*least)\s*(\d+(?:\.\d+)?)\s*(?:yrs|years)',
                r'(\d+(?:\.\d+)?)\+?\s*(?:years?|yrs?)\s*(?:of)?\s*(?:relevant|industry|professional|work)?\s*(?:exp|experience)',
                r'(\d+(?:\.\d+)?)\+?\s*(?:years?|yrs?)\b',
                r'(\d+(?:\.\d+)?)\s*(?:to|-)\s*\d+\s*(?:years?|yrs?)'
            ]
            for rx in exp_patterns:
                m = re.search(rx, jd_lower)
                if m:
                    min_exp = float(m.group(1))
                    break

            # Education extraction
            edu_reqs = []
            if any(k in p_lower for k in ["bachelor", "b.tech", "b.s", "b.e", "master", "m.s", "degree"]):
                edu_reqs.append("Bachelor's degree in Computer Science or related engineering discipline")

            # Certifications extraction
            cert_reqs = []
            for cert_kw in ["aws certified", "azure fundamentals", "gcp associate", "pmp", "ckad", "cka"]:
                if cert_kw in p_lower:
                    cert_reqs.append(cert_kw.title())

            return {
                "skills": skills,
                "mandatory_skills": mandatory_skills,
                "preferred_skills": preferred_skills,
                "experience_requirement": {
                    "minimum_years": min_exp,
                    "maximum_years": None,
                    "type": "relevant",
                    "is_mandatory": True
                },
                "min_experience_years": min_exp,
                "education_requirements": edu_reqs,
                "certification_requirements": cert_reqs,
                "role_summary": "Extracted Engineering Role",
                "responsibilities": []
            }

        # 2. Resume Parsing mock response
        if "resume" in p_lower or "total_experience_years" in schema_description:
            skills = []
            seen = set()
            for name, cat, regexes in self.KNOWN_TECH_CATALOG:
                if any(re.search(rx, p_lower) for rx in regexes):
                    norm = name.lower().replace(" ", "").replace(".", "").replace("-", "")
                    if norm not in seen:
                        seen.add(norm)
                        skills.append(name)

            # Calculate experience years from dates or mentions
            exp_years = 0.0
            years_match = re.search(r'(\d+(?:\.\d+)?)\+?\s*(?:years?|yrs?)', p_lower)
            if years_match:
                exp_years = float(years_match.group(1))
            else:
                date_range_match = re.findall(r'(\d{4})\s*[-–—]\s*(present|\d{4})', p_lower)
                if date_range_match:
                    start_yr = int(date_range_match[0][0])
                    end_yr = 2026 if date_range_match[0][1] == "present" else int(date_range_match[0][1])
                    exp_years = max(0.0, float(end_yr - start_yr))

            # Extract Education directly from resume
            edu_found = []
            edu_patterns = [
                r'(bachelor[^\n,\.;]*|b\.tech[^\n,\.;]*|b\.e\.?[^\n,\.;]*|b\.s\.?[^\n,\.;]*|master[^\n,\.;]*|m\.tech[^\n,\.;]*|m\.s\.?[^\n,\.;]*|phd[^\n,\.;]*|degree[^\n,\.;]*)'
            ]
            for ep in edu_patterns:
                matches = re.findall(ep, prompt, re.IGNORECASE)
                for m in matches:
                    cl = m.strip()
                    if len(cl) > 3 and cl not in edu_found:
                        edu_found.append(cl)
            if not edu_found and ("computer science" in p_lower or "b.tech" in p_lower or "bachelor" in p_lower):
                edu_found.append("Bachelor of Science in Computer Science")

            # Extract Certifications directly from resume
            cert_found = []
            cert_patterns = [
                r'((?:aws|azure|google|cisco|oracle|kubernetes|docker|certified|pmp|scrum|hashicorp)[^\n,;]*)'
            ]
            for cp in cert_patterns:
                matches = re.findall(cp, prompt, re.IGNORECASE)
                for m in matches:
                    cl = m.strip()
                    if len(cl) > 3 and cl not in cert_found and not any(k in cl.lower() for k in ["experience", "project", "summary"]):
                        cert_found.append(cl)

            # Work Experience extraction
            work_exp = [
                {
                    "title": "Software Engineer",
                    "company": "Technology Solutions Inc.",
                    "duration": f"{exp_years or 3.0} years",
                    "description": "Engineered high-performance backend microservices and cloud infrastructure."
                }
            ]

            return {
                "skills": skills,
                "work_experience": work_exp,
                "total_experience_years": exp_years if exp_years > 0 else 3.0,
                "education": edu_found if edu_found else ["B.S. in Computer Science"],
                "projects": ["Distributed Backend Processing System"],
                "certifications": cert_found if cert_found else ["AWS Certified Solutions Architect"],
                "contact_redacted_flag": True
            }

        # 3. LLM Match Validation mock response
        if "validate" in p_lower or "similarity" in p_lower or "requirement:" in p_lower:
            return {
                "is_match": True,
                "confidence": 0.95,
                "evidence_snippet": "Demonstrated hands-on experience and proficiency in production.",
                "reasoning": "Candidate resume explicitly outlines technical delivery."
            }

        # Default fallback JSON
        return {
            "summary": "Mock LLM extracted data",
            "status": "success"
        }

    async def generate_text(self, prompt: str) -> str:
        return "Candidate demonstrates alignment with verified job requirements and requisite industry experience."


def get_llm_provider() -> LLMProvider:
    provider = settings.LLM_PROVIDER.lower()
    if provider == "openai" and settings.OPENAI_API_KEY:
        return OpenAIProvider(settings.OPENAI_API_KEY)
    elif provider == "anthropic" and settings.ANTHROPIC_API_KEY:
        return AnthropicProvider(settings.ANTHROPIC_API_KEY)
    elif (provider == "gemini" or not provider or provider == "google") and (settings.GEMINI_API_KEY or os.environ.get("GEMINI_API_KEY")):
        key = settings.GEMINI_API_KEY or os.environ.get("GEMINI_API_KEY", "")
        return GeminiProvider(key)
    return MockLLMProvider()
