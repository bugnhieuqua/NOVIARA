import os
import sys

if hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass
if hasattr(sys.stderr, 'reconfigure'):
    try:
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass
from pathlib import Path
from fastapi import FastAPI, APIRouter
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

# Thêm root dir vào sys.path
ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from backend.config import HOST, PORT
from backend.models import init_db
from backend.routers.ga_router import router as ga_router
from backend.routers.ai_router import router as ai_router
from backend.routers.students_router import router as students_router
from backend.routers.benchmark_router import router as benchmark_router
from backend.routers.export_router import router as export_router
from backend.routers.classes_router import router as classes_router
from backend.routers.surveys_router import router as surveys_router
from backend.routers.auth_router import router as auth_router
from backend.routers.sessions_router import router as sessions_router
from backend.routers.events_router import router as events_router

app = FastAPI(
    title="NOVIARA AI Engine API",
    description="Python FastAPI Backend for NOVIARA - Multi-objective Genetic Algorithm, Database & AI Explanations",
    version="2.0.0"
)

# Cấu hình CORS mở rộng cho React Frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Gắn tiền tố chung /api
api_router = APIRouter(prefix="/api")
api_router.include_router(ga_router)
api_router.include_router(ai_router)
api_router.include_router(students_router)
api_router.include_router(benchmark_router)
api_router.include_router(export_router)
api_router.include_router(classes_router)
api_router.include_router(surveys_router)
api_router.include_router(auth_router)
api_router.include_router(sessions_router)
api_router.include_router(events_router)

app.include_router(api_router)


@app.on_event("startup")
async def on_startup():
    """Khởi tạo cấu trúc các bảng CSDL SQLite khi server khởi động."""
    init_db(seed=False)



@app.get("/")
async def root():
    return {
        "status": "healthy",
        "service": "NOVIARA AI Python Backend",
        "version": "2.0.0",
        "endpoints": [
            "/api/ga/run",
            "/api/ga/stream",
            "/api/ai/explain-group",
            "/api/ai/lecturer-agent",
            "/api/students/upload",
            "/api/students/template",
            "/api/benchmark/compare",
            "/api/export/excel",
            "/api/export/csv",
            "/api/classes",
            "/api/surveys/submit",
            "/api/surveys/lookup/{student_id}"
        ]
    }


@app.get("/api/health")
async def health_check():
    return {"status": "ok", "timestamp": os.path.getmtime(__file__)}


@app.get("/api/system/status")
async def system_status():
    return {
        "status": "online",
        "system": "NOVIARA AI",
        "ai_active": True,
        "engine": "FastAPI + Genetic Algorithm (DEAP/NumPy)",
        "version": "2.0.0"
    }


from pydantic import BaseModel
from typing import Optional
from fastapi import HTTPException

class FacultyPayload(BaseModel):
    name: str
    code: Optional[str] = ""
    description: Optional[str] = ""


@app.get("/api/departments")
async def get_departments():
    """
    Truy vấn trực tiếp từ bảng departments trong SQLite.
    Đồng thời tự động bổ sung các khoa tồn tại trong classes hoặc accounts nếu chưa có trong departments.
    """
    from backend.database import query_all, execute_commit
    import time

    rows = query_all("SELECT id, code, name, description, created_at FROM departments ORDER BY name ASC")
    existing_names = {r["name"].strip().lower() for r in rows if r.get("name")}

    # Kiểm tra thêm từ classes và accounts nếu có khoa cũ chưa ghi vào departments
    legacy_rows = query_all("""
        SELECT DISTINCT department as name FROM classes WHERE department IS NOT NULL AND TRIM(department) != ''
        UNION
        SELECT DISTINCT department as name FROM accounts WHERE department IS NOT NULL AND TRIM(department) != ''
    """)

    for leg in legacy_rows:
        dept_name = (leg.get("name") or "").strip()
        if dept_name and dept_name.lower() not in existing_names:
            dept_id = f"DEPT-{int(time.time())}-{abs(hash(dept_name)) % 1000}"
            # Sinh mã khoa tự động từ chữ cái đầu
            code = "".join([w[0].upper() for w in dept_name.split() if w])[:6] or f"D{int(time.time()) % 1000}"
            execute_commit("""
                INSERT OR IGNORE INTO departments (id, code, name, description)
                VALUES (?, ?, ?, ?)
            """, (dept_id, code, dept_name, f"Khoa {dept_name}"))
            rows.append({
                "id": dept_id,
                "code": code,
                "name": dept_name,
                "description": f"Khoa {dept_name}",
                "created_at": time.strftime("%Y-%m-%d %H:%M:%S")
            })
            existing_names.add(dept_name.lower())

    return {"departments": rows}


@app.post("/api/departments")
async def create_department(payload: FacultyPayload):
    """Tạo hoặc cập nhật Khoa / Đơn vị mới trực tiếp vào bảng departments trong SQLite."""
    from backend.database import execute_commit, query_one
    import time

    name = payload.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Tên khoa không được để trống.")

    code = payload.code.strip().upper() if payload.code else f"D{int(time.time()) % 1000}"
    desc = payload.description or ""

    existing = query_one("SELECT id FROM departments WHERE LOWER(name) = LOWER(?)", (name,))
    if existing:
        dept_id = existing["id"]
        execute_commit("""
            UPDATE departments SET code = ?, description = ? WHERE id = ?
        """, (code, desc, dept_id))
    else:
        dept_id = f"DEPT-{int(time.time())}"
        execute_commit("""
            INSERT INTO departments (id, code, name, description)
            VALUES (?, ?, ?, ?)
        """, (dept_id, code, name, desc))

    return {"success": True, "department": {"id": dept_id, "code": code, "name": name, "description": desc}}


@app.put("/api/departments/{dept_id}")
async def update_department(dept_id: str, payload: FacultyPayload):
    """Cập nhật thông tin mã khoa, tên khoa, mô tả vào bảng departments trong SQLite."""
    from backend.database import execute_commit, query_one

    row = query_one("SELECT * FROM departments WHERE id = ?", (dept_id,))
    if not row:
        row = query_one("SELECT * FROM departments WHERE code = ? OR LOWER(name) = LOWER(?)", (dept_id, dept_id))
    if not row:
        raise HTTPException(status_code=404, detail="Không tìm thấy Khoa / Đơn vị để cập nhật.")

    real_id = row["id"]
    old_name = row["name"]
    new_name = payload.name.strip() if payload.name else old_name
    new_code = (payload.code.strip().upper() if payload.code else (row["code"] or "")).upper()
    new_desc = payload.description if payload.description is not None else (row["description"] or "")

    execute_commit("""
        UPDATE departments
        SET name = ?, code = ?, description = ?
        WHERE id = ?
    """, (new_name, new_code, new_desc, real_id))

    # Đồng bộ nếu đổi tên khoa sang bảng classes và accounts
    if new_name != old_name:
        execute_commit("UPDATE classes SET department = ? WHERE department = ?", (new_name, old_name))
        execute_commit("UPDATE accounts SET department = ? WHERE department = ?", (new_name, old_name))

    return {
        "success": True,
        "department": {
            "id": real_id,
            "code": new_code,
            "name": new_name,
            "description": new_desc
        }
    }


@app.delete("/api/departments/{dept_id}")
async def delete_department(dept_id: str):
    """Xóa Khoa / Đơn vị khỏi bảng departments trong SQLite."""
    from backend.database import execute_commit, query_one

    row = query_one("SELECT id FROM departments WHERE id = ?", (dept_id,))
    if not row:
        row = query_one("SELECT id FROM departments WHERE code = ? OR LOWER(name) = LOWER(?)", (dept_id, dept_id))
    if not row:
        raise HTTPException(status_code=404, detail="Không tìm thấy Khoa / Đơn vị để xóa.")

    execute_commit("DELETE FROM departments WHERE id = ?", (row["id"],))
    return {"success": True}


# Endpoint tương thích ngược cho client cũ
@app.get("/api/faculties")
async def get_faculties():
    """Tương thích ngược: trả về danh sách khoa cùng mã khoa và id."""
    depts_res = await get_departments()
    depts = depts_res.get("departments", [])
    faculty_names = [d["name"] for d in depts]
    return {"faculties": faculty_names, "departments": depts}


@app.post("/api/faculties")
async def create_faculty(payload: FacultyPayload):
    """Tương thích ngược: chuyển tiếp sang create_department."""
    return await create_department(payload)



if __name__ == "__main__":
    uvicorn.run("backend.main:app", host=HOST, port=PORT, reload=True)
