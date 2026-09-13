from langgraph.graph import StateGraph, END
from app.agents.state import PipelineState
from app.agents.jd_agent import job_description_agent
from app.agents.resume_parser_agent import resume_parser_agent
from app.agents.skill_matcher_agent import skill_matcher_agent
from app.agents.evaluation_agent import candidate_evaluation_agent
from app.agents.reviewer_agent import reviewer_agent

def create_resume_screening_pipeline():
    """
    Constructs and compiles the LangGraph state machine workflow for candidate resume screening.
    Nodes:
    1. JD Agent (if raw_jd_text provided) -> mandatory/preferred skills extraction & embedding
    2. Resume Parser Agent -> PII Redaction + extraction + chunk embedding
    3. Skill Matcher Agent -> Semantic RAG search & evidence extraction
    4. Evaluation Agent -> Weighted scoring formula + tier classification
    5. Reviewer Agent -> Evidence verification & flagging
    """
    workflow = StateGraph(PipelineState)

    # Add Nodes
    workflow.add_node("jd_agent", job_description_agent)
    workflow.add_node("resume_parser", resume_parser_agent)
    workflow.add_node("skill_matcher", skill_matcher_agent)
    workflow.add_node("evaluation_agent", candidate_evaluation_agent)
    workflow.add_node("reviewer_agent", reviewer_agent)

    # Define Workflow Edges
    workflow.set_entry_point("jd_agent")
    workflow.add_edge("jd_agent", "resume_parser")
    workflow.add_edge("resume_parser", "skill_matcher")
    workflow.add_edge("skill_matcher", "evaluation_agent")
    workflow.add_edge("evaluation_agent", "reviewer_agent")
    workflow.add_edge("reviewer_agent", END)

    app = workflow.compile()
    return app

pipeline_app = create_resume_screening_pipeline()
