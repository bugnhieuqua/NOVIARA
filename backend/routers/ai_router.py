from fastapi import APIRouter, HTTPException
from backend.schemas import ExplainGroupRequest, GroupExplanationSchema, AIAgentLecturerRequest
from backend.services.ai_service import explain_group_ai, process_lecturer_agent_ai

router = APIRouter(prefix="/ai", tags=["AI Explainer & Agent"])


@router.post("/explain-group", response_model=GroupExplanationSchema)
async def explain_group_endpoint(req: ExplainGroupRequest):
    """Sinh phân tích giải thích nhóm (Synergy, Rủi ro, Khuyến nghị, DISC) bằng Hybrid Rule + Gemini AI."""
    if not req.members:
        raise HTTPException(status_code=400, detail="Nhóm không có thành viên.")
    
    explanation = await explain_group_ai(req)
    return explanation


@router.post("/lecturer-agent")
async def lecturer_agent_endpoint(req: AIAgentLecturerRequest):
    """AI Agent bóc tách danh sách giảng viên, nhận diện Khoa/Bộ môn tự động."""
    result = await process_lecturer_agent_ai(req)
    return result
