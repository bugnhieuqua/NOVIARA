import io
import re
import json
import time
from typing import List, Dict, Any, Optional
import urllib.request
import pandas as pd
from pydantic import BaseModel
from fastapi import APIRouter, UploadFile, File, HTTPException, Response
from backend.services.preprocessing_service import parse_student_file
from backend.database import get_db_connection, query_all, query_one
from backend.routers.events_router import emit_event

router = APIRouter(prefix="/students", tags=["Students Data & Import"])


class GSheetImportRequest(BaseModel):
    url: str
    class_id: Optional[str] = None


@router.post("/import-gsheet")
async def import_students_from_gsheet(req: GSheetImportRequest):
    """Nạp danh sách sinh viên trực tiếp từ đường link Google Sheets công khai."""
    url = (req.url or "").strip()
    if not url:
        raise HTTPException(status_code=400, detail="Vui lòng cung cấp đường link Google Sheets.")

    # BẮT BUỘC PHẢI CÓ LỚP HỌC MỚI ĐƯỢC NẠP DANH SÁCH SINH VIÊN
    existing_classes = query_all("SELECT id, name FROM classes")
    if not existing_classes:
        raise HTTPException(
            status_code=400,
            detail="Chưa có lớp học nào trong hệ thống! Bắt buộc phải tạo lớp học trước khi nạp dữ liệu sinh viên."
        )

    target_class_id = req.class_id
    if target_class_id:
        cls_check = query_one("SELECT id FROM classes WHERE id = ?", (target_class_id,))
        if not cls_check:
            raise HTTPException(status_code=404, detail=f"Không tìm thấy lớp học với mã {target_class_id}")
    else:
        target_class_id = existing_classes[0]["id"]

    # Trích xuất Sheet ID
    patterns = [
        r'/spreadsheets/d/([a-zA-Z0-9_-]+)',
        r'spreadsheets/d/([a-zA-Z0-9_-]+)',
        r'^([a-zA-Z0-9_-]{20,})$',
    ]
    sheet_id = None
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            sheet_id = match.group(1)
            break

    if not sheet_id:
        raise HTTPException(
            status_code=400,
            detail="Không tìm thấy ID bảng tính trong liên kết. Vui lòng dùng link dạng: https://docs.google.com/spreadsheets/d/..."
        )

    # Trích xuất GID (trang tính cụ thể nếu có)
    gid_match = re.search(r'[#&?]gid=([0-9]+)', url)
    gid = int(gid_match.group(1)) if gid_match else 0

    csv_url = f"https://docs.google.com/spreadsheets/d/{sheet_id}/export?format=csv&gid={gid}"

    try:
        request_obj = urllib.request.Request(
            csv_url,
            headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
        )
        with urllib.request.urlopen(request_obj, timeout=15) as resp:
            content = resp.read()

        if not content or len(content) < 10:
            raise HTTPException(
                status_code=400,
                detail="Bảng tính Google Sheets rỗng hoặc chưa được chia sẻ quyền 'Bất kỳ ai có liên kết đều có thể xem'."
            )

        result = parse_student_file(content, f"GoogleSheet_{sheet_id}.csv")

        # Phát realtime event sau khi import Google Sheets thành công
        students_count = len(result.get("students", []))
        if students_count > 0:
            emit_event("students_updated", {
                "classId": target_class_id,
                "count": students_count,
                "source": "gsheet_import"
            })

        return result
    except HTTPException:
        raise
    except urllib.error.HTTPError as e:
        if e.code in (403, 404):
            raise HTTPException(
                status_code=400,
                detail="Không thể truy cập Google Sheets (Lỗi quyền 403/404). Vui lòng đảm bảo bảng tính đã được BẬT quyền 'Bất kỳ ai có đường liên kết đều có thể xem' (Anyone with the link can view)."
            )
        raise HTTPException(status_code=400, detail=f"Lỗi khi tải từ Google Sheets: HTTP {e.code}")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Lỗi kết nối tới Google Sheets: {str(e)}")


@router.post("/upload")
async def upload_students_file(file: UploadFile = File(...), class_id: Optional[str] = None):
    """Tải lên file Excel/CSV, lưu tệp vào CSDL SQLite và tự động trích xuất hồ sơ sinh viên bền vững."""
    if not file.filename:
        raise HTTPException(status_code=400, detail="Không có tệp nào được chọn.")

    # BẮT BUỘC PHẢI CÓ LỚP HỌC MỚI ĐƯỢC TẢI TỆP LÊN
    existing_classes = query_all("SELECT id, name FROM classes")
    if not existing_classes:
        raise HTTPException(
            status_code=400,
            detail="Chưa có lớp học nào trong hệ thống! Bắt buộc phải tạo lớp học trước khi tải file sinh viên lên."
        )

    target_class_id = class_id
    if target_class_id:
        cls_check = query_one("SELECT id FROM classes WHERE id = ?", (target_class_id,))
        if not cls_check:
            raise HTTPException(status_code=404, detail=f"Không tìm thấy lớp học với mã {target_class_id}")
    else:
        target_class_id = existing_classes[0]["id"]

    fn_lower = file.filename.lower()
    if not (fn_lower.endswith('.xlsx') or fn_lower.endswith('.xls') or fn_lower.endswith('.csv')):
        raise HTTPException(status_code=400, detail="Định dạng tệp không hợp lệ. Vui lòng chọn .xlsx, .xls hoặc .csv.")

    try:
        content = await file.read()
        result = parse_student_file(content, file.filename)

        # Lưu file và danh sách sinh viên bền vững vào CSDL SQLite
        file_id = f"FILE-{int(time.time())}"
        file_size = len(content)
        file_type = file.filename.split('.')[-1].upper()
        students_list = result.get("students", [])
        total_records = len(students_list)

        with get_db_connection() as conn:
            # 1. Lưu bản ghi tệp vào bảng uploaded_files
            conn.execute("""
                INSERT INTO uploaded_files
                (id, filename, file_size, file_type, total_records, file_content, class_id, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                ON CONFLICT (id) DO UPDATE SET
                    filename = EXCLUDED.filename,
                    file_size = EXCLUDED.file_size,
                    file_type = EXCLUDED.file_type,
                    total_records = EXCLUDED.total_records,
                    file_content = EXCLUDED.file_content,
                    class_id = EXCLUDED.class_id,
                    created_at = CURRENT_TIMESTAMP
            """, (file_id, file.filename, file_size, file_type, total_records, content, target_class_id))

            # 2. Lưu từng sinh viên vào bảng students và bảng class_students
            for s in students_list:
                s_id = s.get("id")
                if s_id:
                    disc = s.get("disc", {})
                    conn.execute("""
                        INSERT INTO students 
                        (student_id, name, email, phone, gender, gpa, primary_skill, secondary_skill, disc_dominant, is_leader_candidate, profile_json)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        ON CONFLICT (student_id) DO UPDATE SET
                            name = EXCLUDED.name,
                            email = EXCLUDED.email,
                            phone = EXCLUDED.phone,
                            gender = EXCLUDED.gender,
                            gpa = EXCLUDED.gpa,
                            primary_skill = EXCLUDED.primary_skill,
                            secondary_skill = EXCLUDED.secondary_skill,
                            disc_dominant = EXCLUDED.disc_dominant,
                            is_leader_candidate = EXCLUDED.is_leader_candidate,
                            profile_json = EXCLUDED.profile_json
                    """, (
                        s_id,
                        s.get("name") or s_id,
                        s.get("email") or "",
                        s.get("phone") or "",
                        s.get("gender") or "Nam",
                        s.get("gpa") or 3.0,
                        s.get("primarySkill") or "backend",
                        s.get("secondarySkill") or "frontend",
                        disc.get("dominant") or "S",
                        bool(s.get("isLeaderCandidate")),
                        json.dumps(s)
                    ))

                    # Gán trực tiếp sinh viên vào lớp học
                    conn.execute("""
                        INSERT INTO class_students 
                        (class_id, student_id, gpa, source)
                        VALUES (?, ?, ?, 'import_excel')
                        ON CONFLICT (class_id, student_id) DO UPDATE SET
                            gpa = EXCLUDED.gpa,
                            source = EXCLUDED.source
                    """, (target_class_id, s_id, s.get("gpa") or 3.0))

        result["file_id"] = file_id
        result["class_id"] = target_class_id
        result["saved_to_db"] = True

        # Phát realtime event đến tất cả client khi có sinh viên mới
        emit_event("students_updated", {
            "classId": target_class_id,
            "count": total_records,
            "source": "excel_upload"
        })

        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Lỗi khi đọc và lưu file: {str(e)}")


@router.get("/template")
async def download_student_template():
    """Tải file Excel mẫu với các cột chuẩn hóa của hệ thống NOVIARA."""
    sample_data = [
        {
            "MSSV": "SV2024001",
            "Họ và tên": "Nguyễn Văn An",
            "Giới tính": "Nam",
            "GPA": 3.65,
            "Lớp": "CNTT-K24A",
            "Lập trình": 4.5,
            "CSDL": 4.0,
            "Web": 4.2,
            "UI_UX": 3.0,
            "DISC_D": 75,
            "DISC_I": 60,
            "DISC_S": 40,
            "DISC_C": 55,
            "Là Leader": "Có",
            "Email": "an.nv@uni.edu.vn",
            "SĐT": "0912345678"
        },
        {
            "MSSV": "SV2024002",
            "Họ và tên": "Trần Thị Bình",
            "Giới tính": "Nữ",
            "GPA": 3.80,
            "Lớp": "CNTT-K24A",
            "Lập trình": 3.8,
            "CSDL": 4.8,
            "Web": 3.5,
            "UI_UX": 4.5,
            "DISC_D": 45,
            "DISC_I": 70,
            "DISC_S": 65,
            "DISC_C": 60,
            "Là Leader": "Không",
            "Email": "binh.tt@uni.edu.vn",
            "SĐT": "0987654321"
        }
    ]
    df = pd.DataFrame(sample_data)
    buffer = io.BytesIO()
    with pd.ExcelWriter(buffer, engine='openpyxl') as writer:
        df.to_excel(writer, sheet_name='Danh sách sinh viên', index=False)

    excel_bytes = buffer.getvalue()
    return Response(
        content=excel_bytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=NOVIARA_Student_Template.xlsx"}
    )


class BulkStudentsRequest(BaseModel):
    students: List[Dict[str, Any]]
    classId: Optional[str] = None


@router.post("/bulk")
async def save_bulk_students(req: BulkStudentsRequest):
    """Lưu danh sách sinh viên nạp từ tệp Excel/CSV/Google Sheets vào CSDL SQLite bền vững."""
    from backend.database import get_db_connection
    with get_db_connection() as conn:
        for s in req.students:
            s_id = s.get("id")
            if not s_id:
                continue
            disc = s.get("disc", {})
            raw_gender = str(s.get("gender") or "Nam").strip().lower()
            gender = "Nữ" if raw_gender in ("nữ", "nu", "female", "f") else "Nam"
            conn.execute("""
                INSERT INTO students 
                (student_id, name, email, phone, gender, gpa, primary_skill, secondary_skill, disc_dominant, is_leader_candidate, profile_json)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT (student_id) DO UPDATE SET
                    name = EXCLUDED.name,
                    email = EXCLUDED.email,
                    phone = EXCLUDED.phone,
                    gender = EXCLUDED.gender,
                    gpa = EXCLUDED.gpa,
                    primary_skill = EXCLUDED.primary_skill,
                    secondary_skill = EXCLUDED.secondary_skill,
                    disc_dominant = EXCLUDED.disc_dominant,
                    is_leader_candidate = EXCLUDED.is_leader_candidate,
                    profile_json = EXCLUDED.profile_json
            """, (
                s_id,
                s.get("name") or s_id,
                s.get("email") or "",
                s.get("phone") or "",
                gender,
                s.get("gpa") or 3.0,
                s.get("primarySkill") or "backend",
                s.get("secondarySkill") or "frontend",
                disc.get("dominant") or "S",
                bool(s.get("isLeaderCandidate")),
                json.dumps(s)
            ))
            if req.classId:
                skills = s.get("skills", {})
                conn.execute("""
                    INSERT INTO class_students
                    (class_id, student_id, gpa, skill_frontend, skill_backend, skill_database, source)
                    VALUES (?, ?, ?, ?, ?, ?, 'import_excel')
                    ON CONFLICT (class_id, student_id) DO UPDATE SET
                        gpa = EXCLUDED.gpa,
                        skill_frontend = EXCLUDED.skill_frontend,
                        skill_backend = EXCLUDED.skill_backend,
                        skill_database = EXCLUDED.skill_database,
                        source = EXCLUDED.source
                """, (
                    req.classId, s_id, s.get("gpa") or 3.0,
                    skills.get("frontend", 3.0),
                    skills.get("backend", 3.0),
                    skills.get("database", 3.0)
                ))
    return {"success": True, "count": len(req.students)}


@router.get("/files")
async def get_uploaded_files():
    """Lấy danh sách các file dữ liệu đã nạp lưu trong CSDL SQLite."""
    from backend.database import query_all
    return query_all("""
        SELECT id, filename, file_size, file_type, total_records, created_at 
        FROM uploaded_files 
        ORDER BY created_at DESC
    """)


@router.get("")
async def get_all_students(class_id: Optional[str] = None, lecturer_id: Optional[str] = None):
    """Lấy danh sách tất cả sinh viên từ CSDL kèm hồ sơ đầy đủ (hỗ trợ lọc theo class_id hoặc lecturer_id)."""
    from backend.database import query_all
    if class_id:
        rows = query_all("""
            SELECT s.*, cs.class_id, cs.gpa as class_gpa FROM students s 
            JOIN class_students cs ON s.student_id = cs.student_id 
            WHERE cs.class_id = ?
        """, (class_id,))
    elif lecturer_id:
        rows = query_all("""
            SELECT s.*, cs.class_id, cs.gpa as class_gpa FROM students s 
            JOIN class_students cs ON s.student_id = cs.student_id 
            JOIN classes c ON cs.class_id = c.id
            WHERE c.lecturer_id = ?
            ORDER BY s.student_id ASC
        """, (lecturer_id,))
    else:
        rows = query_all("""
            SELECT s.*, cs.class_id, cs.gpa as class_gpa FROM students s 
            LEFT JOIN class_students cs ON s.student_id = cs.student_id 
            ORDER BY s.student_id ASC
        """)

    students = []
    seen = set()
    for r in rows:
        cid = r.get("class_id") or ""
        key = (r["student_id"], cid) if cid else r["student_id"]
        if key in seen:
            continue
        seen.add(key)

        s_obj = None
        if r.get("profile_json"):
            try:
                s_obj = json.loads(r["profile_json"])
            except Exception:
                pass
        
        if not s_obj:
            dominant = r.get("disc_dominant") or "S"
            primary = r.get("primary_skill") or "backend"
            secondary = r.get("secondary_skill") or "frontend"
            s_obj = {
                "id": r["student_id"],
                "name": r["name"],
                "email": r.get("email") or "",
                "phone": r.get("phone") or "",
                "gender": r.get("gender") or "Nam",
                "gpa": r.get("class_gpa") or r.get("gpa") or 3.0,
                "primarySkill": primary,
                "secondarySkill": secondary,
                "isLeaderCandidate": bool(r.get("is_leader_candidate")),
                "disc": {
                    "dominant": dominant,
                    "scores": {
                        "D": 85 if dominant == 'D' else 40,
                        "I": 85 if dominant == 'I' else 40,
                        "S": 85 if dominant == 'S' else 40,
                        "C": 85 if dominant == 'C' else 40,
                    }
                },
                "skills": {
                    "frontend": 5 if primary == 'frontend' else (4 if secondary == 'frontend' else 3),
                    "backend": 5 if primary == 'backend' else (4 if secondary == 'backend' else 3),
                    "database": 5 if primary == 'database' else (4 if secondary == 'database' else 3),
                    "uiux": 5 if primary == 'uiux' else 3,
                    "mobile": 3, "devops": 3, "aiml": 3, "qa": 3, "presentation": 3, "management": 3
                }
            }

        s_obj["classId"] = cid or "CLASS-01"
        students.append(s_obj)
    return students


@router.delete("/{student_id}")
async def delete_student(student_id: str):
    """Xóa 1 sinh viên vĩnh viễn khỏi CSDL và các quan hệ lớp học / khảo sát / nhóm."""
    with get_db_connection() as conn:
        conn.execute("DELETE FROM group_members WHERE student_id = ?", (student_id,))
        conn.execute("DELETE FROM survey_submissions WHERE student_id = ?", (student_id,))
        conn.execute("DELETE FROM class_students WHERE student_id = ?", (student_id,))
        conn.execute("DELETE FROM students WHERE student_id = ?", (student_id,))

    emit_event("students_updated", {"action": "deleted", "studentId": student_id})
    return {"success": True, "deletedId": student_id}


@router.delete("")
async def clear_students(class_id: Optional[str] = None):
    """Xóa sinh viên khỏi lớp học hoặc xóa toàn bộ sinh viên khỏi hệ thống."""
    with get_db_connection() as conn:
        if class_id:
            conn.execute("DELETE FROM survey_submissions WHERE class_id = ?", (class_id,))
            conn.execute("DELETE FROM class_students WHERE class_id = ?", (class_id,))
            conn.execute("""
                DELETE FROM students 
                WHERE student_id NOT IN (SELECT student_id FROM class_students)
            """)
        else:
            conn.execute("DELETE FROM group_members")
            conn.execute("DELETE FROM survey_submissions")
            conn.execute("DELETE FROM class_students")
            conn.execute("DELETE FROM students")

    emit_event("students_updated", {"action": "cleared", "classId": class_id})
    return {"success": True, "classId": class_id}


