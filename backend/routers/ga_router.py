import json
from fastapi import APIRouter, HTTPException
from sse_starlette.sse import EventSourceResponse
from backend.schemas import GARunRequest, GARunResponse
from backend.services.ga_service import FastGAEngine

router = APIRouter(prefix="/ga", tags=["Genetic Algorithm"])


@router.post("/run", response_model=GARunResponse)
async def run_ga_sync(req: GARunRequest):
    """Chạy giải thuật di truyền phân nhóm đồng bộ và trả về toàn bộ kết quả."""
    if not req.students:
        raise HTTPException(status_code=400, detail="Danh sách sinh viên rỗng.")
    
    if req.config.targetGroupCount <= 0:
        raise HTTPException(status_code=400, detail="Số nhóm mục tiêu phải lớn hơn 0.")

    engine = FastGAEngine(req.students, req.config)
    result = engine.run_sync()
    return result


@router.post("/stream")
async def run_ga_stream(req: GARunRequest):
    """Chạy giải thuật di truyền dạng streaming Server-Sent Events (SSE)."""
    if not req.students:
        raise HTTPException(status_code=400, detail="Danh sách sinh viên rỗng.")

    engine = FastGAEngine(req.students, req.config)

    async def event_generator():
        async for event in engine.run_streaming():
            yield {
                "event": "message",
                "data": json.dumps(event, ensure_ascii=False)
            }

    return EventSourceResponse(event_generator())
