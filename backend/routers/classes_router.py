# -*- coding: utf-8 -*-
import json
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
from typing import List, Optional
from backend.database import query_all, query_one, execute_commit, get_db_connection
from backend.routers.events_router import emit_event

router = APIRouter(prefix="/classes", tags=["Classes"])


class CreateClassPayload(BaseModel):
    id: Optional[str] = None
    code: str
    name: str
    semester: str = "Đại học"
    department: Optional[str] = ""
    description: Optional[str] = ""
    lecturerId: Optional[str] = None
    lecturerName: Optional[str] = ""
    isSurveyActive: bool = False
    surveyTitle: Optional[str] = ""


class UpdateSurveyStatusPayload(BaseModel):
    isSurveyActive: bool
    surveyTitle: Optional[str] = None


@router.get("")
async def get_all_classes(lecturer_id: Optional[str] = None):
    """
    Lấy danh sách tất cả các lớp học phần kèm thống kê số lượng
    sinh viên đã ghi danh và số lượng sinh viên đã nộp khảo sát DISC.
    Có thể lọc theo giảng viên phụ trách (lecturer_id).
    """
    params = ()
    where_clause = ""
    if lecturer_id:
        where_clause = "WHERE c.lecturer_id = ?"
        params = (lecturer_id,)

    sql = f"""
        SELECT 
            c.id, c.code, c.name, c.semester, c.department, c.description,
            c.lecturer_id as lecturerId,
            a.name as lecturerName,
            c.is_survey_active as isSurveyActive,
            c.survey_title as surveyTitle,
            c.created_at as createdAt,
            (SELECT COUNT(*) FROM class_students cs WHERE cs.class_id = c.id) as studentCount,
            (SELECT COUNT(*) FROM survey_submissions ss WHERE ss.class_id = c.id) as surveyStudentCount
        FROM classes c
        LEFT JOIN accounts a ON c.lecturer_id = a.id
        {where_clause}
        ORDER BY c.created_at DESC
    """
    rows = query_all(sql, params)
    # Chuẩn hóa boolean
    for r in rows:
        r["isSurveyActive"] = bool(r["isSurveyActive"])
        if r["studentCount"] == 0 and r["surveyStudentCount"] > 0:
            r["studentCount"] = r["surveyStudentCount"]
    return rows


@router.get("/{class_id}")
async def get_class_detail(class_id: str):
    """Lấy thông tin chi tiết của 1 lớp học phần."""
    sql = """
        SELECT 
            c.id, c.code, c.name, c.semester, c.department, c.description,
            c.lecturer_id as lecturerId,
            a.name as lecturerName,
            c.is_survey_active as isSurveyActive,
            c.survey_title as surveyTitle,
            c.created_at as createdAt,
            (SELECT COUNT(*) FROM class_students cs WHERE cs.class_id = c.id) as studentCount,
            (SELECT COUNT(*) FROM survey_submissions ss WHERE ss.class_id = c.id) as surveyStudentCount
        FROM classes c
        LEFT JOIN accounts a ON c.lecturer_id = a.id
        WHERE c.id = ?
    """
    row = query_one(sql, (class_id,))
    if not row:
        raise HTTPException(status_code=404, detail="Không tìm thấy lớp học phần")
    row["isSurveyActive"] = bool(row["isSurveyActive"])
    return row


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_class(payload: CreateClassPayload):
    """Tạo mới một lớp học phần."""
    class_id = payload.id
    if not class_id:
        import time
        class_id = f"CLASS-{int(time.time())}"

    # Kiểm tra tài khoản giảng viên nếu có truyền vào
    lecturer = query_one("SELECT id FROM accounts WHERE id = ?", (payload.lecturerId,)) if payload.lecturerId else None
    actual_lecturer_id = lecturer["id"] if lecturer else None

    sql = """
        INSERT INTO classes 
        (id, code, name, semester, department, description, lecturer_id, is_survey_active, survey_title)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """
    try:
        execute_commit(sql, (
            class_id, payload.code, payload.name, payload.semester,
            payload.department, payload.description, actual_lecturer_id,
            bool(payload.isSurveyActive),
            payload.surveyTitle or f"Bảng khảo sát {payload.name}"
        ))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Lỗi tạo lớp học: {str(e)}")

    result = await get_class_detail(class_id)

    # Phát realtime event đến tất cả client khi có lớp mới
    emit_event("classes_updated", {"action": "created", "classId": class_id, "className": payload.name})

    return result


@router.patch("/{class_id}/survey-status")
async def toggle_survey_status(class_id: str, payload: UpdateSurveyStatusPayload):
    """Bật/Tắt đợt khảo sát DISC cho sinh viên của lớp học phần."""
    cls = query_one("SELECT id, name, survey_title FROM classes WHERE id = ?", (class_id,))
    if not cls:
        raise HTTPException(status_code=404, detail="Không tìm thấy lớp học phần")

    survey_title = payload.surveyTitle or cls["survey_title"] or f"Bảng khảo sát {cls['name']}"
    sql = """
        UPDATE classes 
        SET is_survey_active = ?, survey_title = ?
        WHERE id = ?
    """
    execute_commit(sql, (bool(payload.isSurveyActive), survey_title, class_id))
    return await get_class_detail(class_id)


@router.delete("/{class_id}")
async def delete_class(class_id: str):
    """Xóa một lớp học phần và toàn bộ các dữ liệu liên quan trong CSDL."""
    cls = query_one("SELECT id FROM classes WHERE id = ?", (class_id,))
    if not cls:
        raise HTTPException(status_code=404, detail="Không tìm thấy lớp học phần")

    with get_db_connection() as conn:
        conn.execute("DELETE FROM class_students WHERE class_id = ?", (class_id,))
        conn.execute("DELETE FROM survey_submissions WHERE class_id = ?", (class_id,))
        conn.execute("DELETE FROM uploaded_files WHERE class_id = ?", (class_id,))
        conn.execute("DELETE FROM grouping_sessions WHERE class_id = ?", (class_id,))
        conn.execute("DELETE FROM classes WHERE id = ?", (class_id,))

    # Phát realtime event khi xóa lớp
    emit_event("classes_updated", {"action": "deleted", "classId": class_id})

    return {"success": True, "deletedId": class_id}


@router.get("/{class_id}/students")
async def get_class_students(class_id: str):
    """
    Lấy danh sách sinh viên thuộc lớp học phần từ CSDL.
    Tổng hợp cả từ sinh viên nạp trong lớp (class_students) và bài nộp khảo sát (survey_submissions).
    """
    cls = query_one("SELECT id, name FROM classes WHERE id = ?", (class_id,))
    if not cls:
        raise HTTPException(status_code=404, detail="Không tìm thấy lớp học phần")

    with get_db_connection() as conn:
        rows = conn.execute("""
            SELECT s.*, cs.gpa as class_gpa
            FROM students s
            JOIN class_students cs ON s.student_id = cs.student_id
            WHERE cs.class_id = ?
        """, (class_id,)).fetchall()

        sub_rows = conn.execute("""
            SELECT ss.*
            FROM survey_submissions ss
            WHERE ss.class_id = ?
        """, (class_id,)).fetchall()

    student_map = {}
    for r in rows:
        m = dict(r)
        profile = {}
        if m.get("profile_json"):
            try:
                profile = json.loads(m["profile_json"])
            except Exception:
                pass
        student_map[m["student_id"]] = {
            "id": m["student_id"],
            "name": m["name"],
            "email": m["email"] or "",
            "phone": m["phone"] or "",
            "gender": m["gender"] or "Nam",
            "gpa": m.get("class_gpa") or m.get("gpa") or 3.0,
            "classId": class_id,
            "primarySkill": m.get("primary_skill") or profile.get("primarySkill", "backend"),
            "secondarySkill": m.get("secondary_skill") or profile.get("secondarySkill", "frontend"),
            "isLeaderCandidate": bool(m.get("is_leader_candidate")),
            "skills": profile.get("skills", {"frontend": 3, "backend": 3, "database": 3, "uiux": 3}),
            "disc": profile.get("disc", {"dominant": m.get("disc_dominant") or "S", "scores": {"D": 40, "I": 40, "S": 40, "C": 40}})
        }

    for sr in sub_rows:
        s_id = sr["student_id"]
        if s_id not in student_map:
            dominant = sr["disc_dominant"] or "S"
            student_map[s_id] = {
                "id": s_id,
                "name": sr["student_name"],
                "email": sr["email"] or "",
                "phone": sr["phone"] or "",
                "gender": sr["gender"] or "Nam",
                "gpa": sr["gpa"] or 3.0,
                "classId": class_id,
                "primarySkill": sr["primary_skill"],
                "secondarySkill": sr["secondary_skill"],
                "isLeaderCandidate": bool(sr["is_leader_candidate"]),
                "skills": {"frontend": 3, "backend": 3, "database": 3, "uiux": 3},
                "disc": {
                    "dominant": dominant,
                    "scores": {
                        "D": sr["disc_d"],
                        "I": sr["disc_i"],
                        "S": sr["disc_s"],
                        "C": sr["disc_c"]
                    }
                }
            }

    return list(student_map.values())
