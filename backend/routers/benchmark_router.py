from fastapi import APIRouter, HTTPException
from backend.schemas import BenchmarkRequest
from backend.services.benchmark_service import benchmark_algorithms

router = APIRouter(prefix="/benchmark", tags=["Benchmark & Algorithm Comparison"])


@router.post("/compare")
async def compare_algorithms_endpoint(req: BenchmarkRequest):
    if not req.students:
        raise HTTPException(status_code=400, detail="Danh sách sinh viên rỗng.")
    
    result = benchmark_algorithms(req)
    return result
