# Agentic AI Resume Screening & Candidate Ranking System

A production-grade full-stack platform that leverages a multi-agent AI pipeline (powered by **LangGraph**) to parse, evaluate, and rank candidate resumes against job descriptions with zero demographic bias and 100% text-backed explainability.

---

## 🏛 System Architecture

```
┌─────────────┐      ┌──────────────────────────────────────────────┐
│   Frontend   │◄────►│                FastAPI Backend                │
│ React + TS   │      │                                                │
└─────────────┘      │  ┌────────────┐  ┌──────────────────────────┐ │
                      │  │ Auth Layer │  │   Agent Orchestrator     │ │
                      │  │ (JWT)      │  │   (LangGraph state graph)│ │
                      │  └────────────┘  └──────────────────────────┘ │
                      │        │                     │                │
                      │  ┌─────▼─────┐   ┌──────────▼───────────┐    │
                      │  │ PostgreSQL │   │  Agent Pipeline:      │    │
                      │  │ (users,    │   │  1. JD Agent          │    │
                      │  │  jobs,     │   │  2. Resume Parser     │    │
                      │  │  candidates│   │  3. Skill Matcher     │    │
                      │  │  scores)   │   │  4. Evaluation Agent  │    │
                      │  └────────────┘   │  5. Ranking Agent     │    │
                      │  ┌────────────┐   │  6. Reviewer Agent    │    │
                      │  │ Redis      │   └───────────┬───────────┘    │
                      │  │ (cache,    │               │                │
                      │  │  queue,    │   ┌───────────▼───────────┐    │
                      │  │  sessions) │   │  Vector DB (ChromaDB)  │    │
                      │  └────────────┘   │  - JD embeddings       │    │
                      │                   │  - Resume chunk embeds │    │
                      │                   │  - RAG retrieval       │    │
                      │                   └────────────────────────┘    │
                      └──────────────────────────────────────────────┘
```

---

## 🚀 Key Features

1. **Fairness & PII Redaction Constraint**: Candidate name, email, phone number, age, gender, marital status, nationality, religion, and disability status are scrubbed by `PIIRedactor` before any text reaches downstream scoring agents.
2. **LangGraph Agent Pipeline**: 6 specialized nodes execute sequential state transitions:
   - **JD Agent**: Extracts mandatory/preferred skills and embeds requirement chunks.
   - **Resume Parser Agent**: Redacts PII, computes total experience years, and embeds text chunks.
   - **Skill Matcher Agent**: Performs semantic RAG similarity search (`sentence-transformers/all-MiniLM-L6-v2`) and extracts exact text evidence spans.
   - **Evaluation Agent**: Calculates weighted score (50% Mandatory Skills, 25% Experience, 15% Preferred Skills, 10% Education) and classifies match tier (`Strong Match`, `Moderate Match`, `Low Match`).
   - **Ranking Agent**: Deterministic sorting with tie-breakers and natural language justifications.
   - **Reviewer Agent**: Validates evidence backing and flags unverified claims (`validated` vs `flagged`).
3. **Editorial Recruitment Case-File Design**: Distinctive React UI featuring an ink navy + paper off-white theme, animated agent pipeline SVG illustration, Recharts score breakdowns, and audit-logged recruiter manual overrides.

---

## 🛠 Tech Stack

- **Backend**: Python 3.11+, FastAPI, Async SQLAlchemy 2.0, LangGraph, Pydantic v2, ChromaDB, ARQ + Redis, JWT Auth (`passlib[bcrypt]`).
- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, TanStack Query, Zustand, Recharts, Lucide React icons.
- **Testing**: Pytest & pytest-asyncio automated test suite including acceptance criteria assertion.

---

## 💻 Local Quick Start

### 1. Backend Setup

```bash
cd backend
python -m venv venv
# On Windows:
venv\Scripts\activate
# On Linux/Mac:
source venv/bin/activate

pip install -r requirements.txt
python -m app.main
```
The FastAPI backend will start at `http://localhost:8000`.
- Interactive OpenAPI Docs: `http://localhost:8000/docs`

### 2. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```
The React frontend web server will start at `http://localhost:3000`.

### 3. Docker Compose (Full Stack)

```bash
docker-compose up --build
```

---

## 🧪 Running Automated Tests & Acceptance Test

Run the full pytest suite to verify acceptance criteria (Python + FastAPI + ML candidate with 3 yrs experience classified as **Strong Match** with text evidence):

```bash
cd backend
pytest tests/test_acceptance.py -v
pytest tests/test_pii_redactor.py -v
```

---

## 🚢 Deployment Specifications

- **Backend Service (Render)**: Deploy Docker service pointing to `backend/Dockerfile` with env variables `DATABASE_URL` (Managed PostgreSQL), `REDIS_URL`, and `SECRET_KEY`.
- **Worker Service (Render)**: Deploy separate Render background worker with command `arq app.worker.WorkerSettings`.
- **Frontend (Vercel)**: Deploy `frontend/` directory with Build Command `npm run build` and Output Directory `dist`.
