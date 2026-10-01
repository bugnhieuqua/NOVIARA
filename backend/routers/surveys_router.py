# -*- coding: utf-8 -*-
import json
import time
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from backend.database import query_all, query_one, execute_commit

router = APIRouter(prefix="/surveys", tags=["Surveys"])


class DiscScoresPayload(BaseModel):
    D: float = 0.0
    I: float = 0.0
    S: float = 0.0
    C: float = 0.0


class DiscProfilePayload(BaseModel):
    dominant: str = "D"
    secondary: Optional[str] = None
    scores: DiscScoresPayload = Field(default_factory=DiscScoresPayload)


class SubmitSurveyPayload(BaseModel):
    id: Optional[str] = None
    classId: str
    className: Optional[str] = ""
    studentId: str
    studentName: str
    email: Optional[str] = ""
    gender: str = "Nam"
    gpa: float = 3.0
    phone: Optional[str] = ""
    primarySkill: str = "frontend"
    secondarySkill: str = "backend"
    isLeaderCandidate: bool = False
    disc: DiscProfilePayload
    answers: Optional[Dict[str, Any]] = Field(default_factory=dict)
    preferredTeammates: Optional[List[str]] = Field(default_factory=list)
    avoidTeammates: Optional[List[str]] = Field(default_factory=list)


@router.post("/submit", status_code=status.HTTP_201_CREATED)
async def submit_survey(payload: SubmitSurveyPayload):
    """
    Tiếp nhận bài khảo sát của sinh viên và lưu vào Cơ sở dữ liệu SQLite:
    1. Kiểm tra lớp học tồn tại và trạng thái khảo sát đang mở.
    2. Upsert hồ sơ sinh viên vào bảng students.
    3. Ghi danh vào bảng class_students.
    4. Upsert kết quả nộp bài vào bảng survey_submissions.
    """
    # 1. Kiểm tra lớp học
    cls = query_one("SELECT id, name, is_survey_active FROM classes WHERE id = ?", (payload.classId,))
    if not cls:
        raise HTTPException(status_code=404, detail=f"Không tìm thấy lớp học với mã {payload.classId}")

    if not cls["is_survey_active"]:
        raise HTTPException(status_code=403, detail="Đợt khảo sát cho lớp này hiện đang tạm đóng bởi Giảng viên.")

    # 2. Chuẩn hóa MSSV
    student_id = payload.studentId.strip().upper()
    student_name = payload.studentName.strip()
    if not student_id or not student_name:
        raise HTTPException(status_code=422, detail="Mã số sinh viên và Họ tên không được để trống.")

    # Upsert bảng students
    execute_commit("""
        INSERT INTO students (student_id, name, email, phone, gender)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(student_id) DO UPDATE SET
            name = excluded.name,
            email = COALESCE(excluded.email, students.email),
            phone = COALESCE(excluded.phone, students.phone),
            gender = excluded.gender
    """, (student_id, student_name, payload.email, payload.phone, payload.gender))

    # Upsert bảng class_students
    execute_commit("""
        INSERT INTO class_students (class_id, student_id, gpa, source)
        VALUES (?, ?, ?, 'survey')
        ON CONFLICT(class_id, student_id) DO UPDATE SET
            gpa = excluded.gpa
    """, (payload.classId, student_id, payload.gpa))

    # 3. Tạo ID bài nộp nếu chưa có
    sub_id = payload.id or f"SUB-{int(time.time() * 1000)}"

    disc_scores = payload.disc.scores
    execute_commit("""
        INSERT INTO survey_submissions (
            id, class_id, student_id, student_name, email, phone, gender, gpa,
            primary_skill, secondary_skill, is_leader_candidate,
            disc_d, disc_i, disc_s, disc_c, disc_dominant, disc_secondary,
            answers_json, preferred_teammates_json, avoid_teammates_json
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(class_id, student_id) DO UPDATE SET
            student_name = excluded.student_name,
            email = excluded.email,
            phone = excluded.phone,
            gender = excluded.gender,
            gpa = excluded.gpa,
            primary_skill = excluded.primary_skill,
            secondary_skill = excluded.secondary_skill,
            is_leader_candidate = excluded.is_leader_candidate,
            disc_d = excluded.disc_d,
            disc_i = excluded.disc_i,
            disc_s = excluded.disc_s,
            disc_c = excluded.disc_c,
            disc_dominant = excluded.disc_dominant,
            disc_secondary = excluded.disc_secondary,
            answers_json = excluded.answers_json,
            preferred_teammates_json = excluded.preferred_teammates_json,
            avoid_teammates_json = excluded.avoid_teammates_json,
            submitted_at = CURRENT_TIMESTAMP
    """, (
        sub_id, payload.classId, student_id, student_name, payload.email, payload.phone, payload.gender, payload.gpa,
        payload.primarySkill, payload.secondarySkill, 1 if payload.isLeaderCandidate else 0,
        disc_scores.D, disc_scores.I, disc_scores.S, disc_scores.C,
        payload.disc.dominant, payload.disc.secondary,
        json.dumps(payload.answers),
        json.dumps(payload.preferredTeammates),
        json.dumps(payload.avoidTeammates)
    ))

    return {
        "success": True,
        "message": f"Nộp bài khảo sát thành công cho sinh viên {student_name} ({student_id})",
        "submissionId": sub_id,
        "classId": payload.classId,
        "studentId": student_id,
        "discProfile": {
            "dominant": payload.disc.dominant,
            "secondary": payload.disc.secondary,
            "scores": disc_scores.dict()
        }
    }


@router.get("/classes/{class_id}/submissions")
async def get_class_submissions(class_id: str):
    """Lấy danh sách tất cả các bài nộp khảo sát của 1 lớp học phần."""
    sql = """
        SELECT 
            ss.id, ss.class_id as classId, c.name as className,
            ss.student_id as studentId, ss.student_name as studentName,
            ss.email, ss.phone, ss.gender, ss.gpa,
            ss.primary_skill as primarySkill, ss.secondary_skill as secondarySkill,
            ss.is_leader_candidate as isLeaderCandidate,
            ss.disc_d as discD, ss.disc_i as discI, ss.disc_s as discS, ss.disc_c as discC,
            ss.disc_dominant as discDominant, ss.disc_secondary as discSecondary,
            ss.submitted_at as submittedAt
        FROM survey_submissions ss
        JOIN classes c ON ss.class_id = c.id
        WHERE ss.class_id = ?
        ORDER BY ss.submitted_at DESC
    """
    rows = query_all(sql, (class_id,))
    # Format kết quả đúng chuẩn TypeScript SurveySubmission
    formatted = []
    for r in rows:
        formatted.append({
            "id": r["id"],
            "classId": r["classId"],
            "className": r["className"],
            "studentId": r["studentId"],
            "studentName": r["studentName"],
            "email": r["email"] or "",
            "phone": r["phone"] or "",
            "gender": r["gender"],
            "gpa": r["gpa"],
            "primarySkill": r["primarySkill"],
            "secondarySkill": r["secondarySkill"],
            "isLeaderCandidate": bool(r["isLeaderCandidate"]),
            "disc": {
                "dominant": r["discDominant"],
                "secondary": r["discSecondary"],
                "scores": {
                    "D": r["discD"],
                    "I": r["discI"],
                    "S": r["discS"],
                    "C": r["discC"]
                }
            },
            "submittedAt": str(r["submittedAt"])
        })
    return formatted


@router.get("/lookup/{student_id}")
async def lookup_student_survey_and_group(student_id: str):
    """
    Tra cứu thông tin nộp khảo sát và phân nhóm đã công bố của sinh viên theo MSSV.
    """
    sid = student_id.strip().upper()
    student = query_one("SELECT * FROM students WHERE student_id = ?", (sid,))
    if not student:
        raise HTTPException(status_code=404, detail=f"Không tìm thấy dữ liệu sinh viên với MSSV {sid}")

    # Lấy thông tin bài nộp khảo sát gần nhất
    sub = query_one("""
        SELECT ss.*, c.name as class_name 
        FROM survey_submissions ss
        JOIN classes c ON ss.class_id = c.id
        WHERE ss.student_id = ?
        ORDER BY ss.submitted_at DESC LIMIT 1
    """, (sid,))

    # Lấy thông tin nhóm (nếu có phiên đã published)
    group_info = query_one("""
        SELECT g.*, gs.title as session_title, ge.summary as explanation_summary,
               ge.leadership_analysis, ge.disc_synergy
        FROM group_members gm
        JOIN groups g ON gm.group_id = g.id
        JOIN grouping_sessions gs ON g.session_id = gs.id
        LEFT JOIN group_explanations ge ON g.id = ge.group_id
        WHERE gm.student_id = ? AND gs.status = 'published'
        ORDER BY gs.created_at DESC LIMIT 1
    """, (sid,))

    teammates = []
    if group_info:
        # Lấy danh sách thành viên trong nhóm
        members = query_all("""
            SELECT s.student_id, s.name, s.email, s.gender, gm.is_leader, gm.assigned_role,
                   ss.primary_skill, ss.disc_dominant
            FROM group_members gm
            JOIN students s ON gm.student_id = s.student_id
            LEFT JOIN survey_submissions ss ON s.student_id = ss.student_id
            WHERE gm.group_id = ?
        """, (group_info["id"],))
        teammates = members

    return {
        "student": dict(student),
        "survey": dict(sub) if sub else None,
        "group": dict(group_info) if group_info else None,
        "teammates": teammates
    }
