import re
from typing import List, Dict, Any, Optional
from app.agents.state import PipelineState, SkillMatchDict
from app.services.vector_store import VectorStore

TECH_ALIASES: Dict[str, List[str]] = {
    "python": ["python", "python3", "python programming", "py", "django", "flask", "fastapi"],
    "fastapi": ["fastapi", "fast api"],
    "django": ["django", "django rest framework", "drf"],
    "flask": ["flask"],
    "postgresql": ["postgresql", "postgres", "psql", "postgre sql"],
    "docker": ["docker", "docker container", "containerization", "dockerfile", "docker-compose"],
    "kubernetes": ["kubernetes", "k8s", "kubectl"],
    "aws": ["aws", "amazon web services", "amazon cloud", "aws cloud", "s3", "ec2", "lambda"],
    "gcp": ["gcp", "google cloud", "google cloud platform", "google cloud services"],
    "azure": ["azure", "microsoft azure", "azure cloud"],
    "redis": ["redis", "redis cache"],
    "node.js": ["node.js", "nodejs", "node js", "node"],
    "node js": ["node js", "node.js", "nodejs", "node"],
    "node": ["node", "node.js", "nodejs", "node js"],
    "express.js": ["express.js", "expressjs", "express js", "express"],
    "express": ["express", "express.js", "expressjs", "express js"],
    "react": ["react", "react.js", "reactjs", "react native", "react router"],
    "react.js": ["react.js", "reactjs", "react", "react native"],
    "reactjs": ["reactjs", "react.js", "react", "react native"],
    "next.js": ["next.js", "nextjs", "next js"],
    "vue.js": ["vue.js", "vuejs", "vue"],
    "angular": ["angular", "angularjs", "angular 2+"],
    "typescript": ["typescript", "ts"],
    "javascript": ["javascript", "js", "ecmascript", "es6"],
    "tailwind": ["tailwind", "tailwindcss", "tailwind css"],
    "tailwind css": ["tailwind css", "tailwind", "tailwindcss"],
    "rest api": ["rest api", "rest apis", "restful api", "restful apis", "restful", "rest", "api development"],
    "graphql": ["graphql", "gql", "apollo graphql"],
    "mongodb": ["mongodb", "mongo", "mongoose", "nosql"],
    "mysql": ["mysql", "mariadb"],
    "sql": ["sql", "rdbms", "relational database", "sqlalchemy", "mysql", "postgresql", "sqlite", "tsql", "plsql"],
    "nosql": ["nosql", "mongodb", "dynamodb", "couchdb", "cassandra"],
    "ci/cd": ["ci/cd", "cicd", "continuous integration", "github actions", "jenkins", "gitlab ci", "continuous deployment"],
    "git": ["git", "github", "gitlab", "bitbucket", "version control"],
    "microservices": ["microservices", "microservice", "microservice architecture", "distributed systems"],
    "machine learning": ["machine learning", "ml", "deep learning", "artificial intelligence", "ai", "data science"],
    "deep learning": ["deep learning", "neural networks", "machine learning", "ml"],
    "artificial intelligence": ["artificial intelligence", "ai", "machine learning", "ml"],
    "ai": ["ai", "artificial intelligence", "machine learning", "ml", "generative ai", "llm"],
    "pytorch": ["pytorch", "torch"],
    "tensorflow": ["tensorflow", "tf", "keras"],
    "html": ["html", "html5"],
    "css": ["css", "css3", "sass", "scss"],
    "redux": ["redux", "redux toolkit", "rtk query"],
    "kafka": ["kafka", "apache kafka"],
    "rabbitmq": ["rabbitmq", "rabbit mq"],
    "java": ["java", "j2ee", "spring", "spring boot"],
    "spring boot": ["spring boot", "spring", "springboot"],
    "c++": ["c++", "cpp"],
    "c#": ["c#", "csharp", ".net", "dotnet"],
    ".net": [".net", "dotnet", "c#", "asp.net"],
    "golang": ["golang", "go programming", "go lang", "go"],
    "go": ["golang", "go programming", "go lang"],
    "linux": ["linux", "ubuntu", "debian", "centos", "unix", "bash", "shell scripting"],
    "socket.io": ["socket.io", "socketio", "websockets", "websocket"],
    "prisma": ["prisma", "prisma orm"]
}

def normalize_skill(name: str) -> str:
    """Normalize skill name: lowercase, strip punctuation & extra spaces."""
    return re.sub(r'[\.\-\_\/\s]+', '', name.lower().strip())

def get_skill_search_terms(name: str) -> List[str]:
    """Return all known alias keywords and formatting variations for a given skill name."""
    clean = name.strip()
    low = clean.lower()
    norm = normalize_skill(clean)
    
    terms = [clean, low]
    
    # Auto-generate variations: e.g. "node js" -> "node.js", "nodejs", "node-js"
    if " " in low:
        terms.append(low.replace(" ", ""))
        terms.append(low.replace(" ", "."))
        terms.append(low.replace(" ", "-"))
    if "." in low:
        terms.append(low.replace(".", " "))
        terms.append(low.replace(".", ""))
    
    # Check known aliases
    for canonical, aliases in TECH_ALIASES.items():
        norm_canonical = normalize_skill(canonical)
        if norm == norm_canonical or low in aliases or canonical in low:
            for a in aliases:
                if a not in terms:
                    terms.append(a)
                    
    return list(dict.fromkeys(terms))


async def skill_matcher_agent(state: PipelineState) -> PipelineState:
    job_id = state.get("job_id", "default_job")
    candidate_id = state.get("candidate_id", "cand_default")
    mandatory_skills = state.get("mandatory_skills", [])
    preferred_skills = state.get("preferred_skills", [])
    parsed_skills = state.get("parsed_skills", [])
    raw_resume = state.get("raw_resume_text", "")
    redacted_resume = state.get("redacted_resume_text", "")
    work_exp = state.get("work_experience", [])
    projects = state.get("projects", [])

    vector_store = VectorStore(collection_name=f"resume_{candidate_id}")

    matched_mandatory: List[SkillMatchDict] = []
    missing_mandatory: List[str] = []

    matched_preferred: List[SkillMatchDict] = []
    missing_preferred: List[str] = []

    # Normalized set of parsed skills from resume
    parsed_skills_lower = set()
    for s in parsed_skills:
        if isinstance(s, dict):
            n = s.get("name") or s.get("skill") or ""
            if n:
                parsed_skills_lower.add(str(n).lower().strip())
                parsed_skills_lower.add(normalize_skill(str(n)))
        elif s:
            parsed_skills_lower.add(str(s).lower().strip())
            parsed_skills_lower.add(normalize_skill(str(s)))

    # Combine resume lines from both raw and redacted text to ensure 100% recall
    combined_resume_text = (raw_resume + "\n" + redacted_resume).strip()
    resume_lines = [l.strip() for l in combined_resume_text.split("\n") if l.strip()]

    def find_skill_evidence(skill_name: str) -> Optional[Dict[str, Any]]:
        clean_skill = str(skill_name).strip()
        if not clean_skill:
            return None

        search_terms = get_skill_search_terms(clean_skill)
        norm_target = normalize_skill(clean_skill)

        # 1. Search in parsed_skills from LLM resume extraction
        for p in parsed_skills_lower:
            if norm_target == p or any(normalize_skill(t) == p for t in search_terms):
                # Search verbatim in resume lines
                for idx, line in enumerate(resume_lines):
                    if any(re.search(rf"\b{re.escape(t)}\b", line, re.IGNORECASE) for t in search_terms):
                        return {
                            "skill": clean_skill,
                            "evidence_text": line,
                            "similarity_score": 0.98,
                            "source_location": f"Resume line {idx + 1}"
                        }
                return {
                    "skill": clean_skill,
                    "evidence_text": f"Candidate possesses verified skill: {clean_skill}",
                    "similarity_score": 0.95,
                    "source_location": "Skills Section"
                }

        # 2. Search verbatim in resume lines with word boundaries or pattern match
        for term in search_terms:
            pattern = rf"(?:^|[\s,;:\(\)\[\]•\-\/]){re.escape(term)}(?:$|[\s,;:\(\)\[\]•\-\/])"
            for idx, line in enumerate(resume_lines):
                if re.search(pattern, line, re.IGNORECASE) or re.search(rf"\b{re.escape(term)}\b", line, re.IGNORECASE):
                    return {
                        "skill": clean_skill,
                        "evidence_text": line,
                        "similarity_score": 0.96,
                        "source_location": f"Resume line {idx + 1}"
                    }

        # 3. Search work experience descriptions
        for exp in work_exp:
            desc = f"{exp.get('title', '')} at {exp.get('company', '')}: {exp.get('description', '')}"
            if any(re.search(rf"\b{re.escape(t)}\b", desc, re.IGNORECASE) for t in search_terms):
                return {
                    "skill": clean_skill,
                    "evidence_text": desc.strip(),
                    "similarity_score": 0.94,
                    "source_location": f"Work Experience ({exp.get('title', 'Role')})"
                }

        # 4. Search projects
        for proj in projects:
            proj_str = str(proj)
            if any(re.search(rf"\b{re.escape(t)}\b", proj_str, re.IGNORECASE) for t in search_terms):
                return {
                    "skill": clean_skill,
                    "evidence_text": proj_str.strip(),
                    "similarity_score": 0.93,
                    "source_location": "Projects"
                }

        # 5. Vector store semantic search
        query_results = vector_store.search_similarity(
            query=f"Hands-on experience and proficiency with {clean_skill}",
            n_results=3,
            filter_metadata={"candidate_id": candidate_id}
        )
        for match in query_results:
            match_text = match.get("text", "")
            if any(re.search(rf"\b{re.escape(t)}\b", match_text, re.IGNORECASE) for t in search_terms) or \
               (match.get("similarity_score", 0.0) >= 0.88 and any(t in match_text.lower() for t in search_terms)):
                return {
                    "skill": clean_skill,
                    "evidence_text": match_text.strip(),
                    "similarity_score": float(match.get("similarity_score", 0.90)),
                    "source_location": f"Resume chunk (line {match['metadata'].get('line_num', 1)})"
                }

        return None

    # Check ALL Mandatory Skills
    for skill in mandatory_skills:
        evidence = find_skill_evidence(skill)
        if evidence:
            matched_mandatory.append(evidence)
        else:
            missing_mandatory.append(skill)

    # Check ALL Preferred / Optional Skills
    for skill in preferred_skills:
        evidence = find_skill_evidence(skill)
        if evidence:
            matched_preferred.append(evidence)
        else:
            missing_preferred.append(skill)

    return {
        **state,
        "matched_mandatory": matched_mandatory,
        "missing_mandatory": missing_mandatory,
        "matched_preferred": matched_preferred,
        "missing_preferred": missing_preferred
    }
