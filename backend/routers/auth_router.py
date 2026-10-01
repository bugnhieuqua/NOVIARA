# -*- coding: utf-8 -*-
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from typing import Optional, List
from backend.database import query_one, execute_commit
from backend.auth_utils import hash_password, verify_password

router = APIRouter(prefix="/auth", tags=["Authentication"])


class LoginPayload(BaseModel):
    usernameOrEmail: str
    password: str
    role: Optional[str] = None  # 'admin' | 'lecturer'


class ChangePasswordPayload(BaseModel):
    accountId: str
    oldPassword: str
    newPassword: str


@router.post("/login")
async def login(payload: LoginPayload):
    """
    Xác thực đăng nhập tài khoản Quản trị viên hoặc Giảng viên qua CSDL SQLite:
    1. Tìm tài khoản theo email hoặc username.
    2. So khớp mật khẩu đã băm (Hashed password).
    3. Cập nhật thời điểm đăng nhập gần nhất (last_login).
    4. Trả về thông tin an toàn (loại bỏ hash).
    """
    ident = payload.usernameOrEmail.strip().lower()
    if not ident or not payload.password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Vui lòng nhập đầy đủ Email/Tên đăng nhập và Mật khẩu."
        )

    # Tìm tài khoản theo email hoặc username
    account = query_one("""
        SELECT id, username, password_hash, name, email, phone, department, role,
               is_default_password, must_change_password
        FROM accounts
        WHERE LOWER(email) = ? OR LOWER(username) = ?
    """, (ident, ident))

    if not account:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Tài khoản không tồn tại trên hệ thống."
        )

    # Kiểm tra vai trò nếu có yêu cầu
    if payload.role and account["role"] != payload.role:
        role_label = "Quản trị viên" if payload.role == "admin" else "Giảng viên"
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Tài khoản này không có quyền truy cập với vai trò {role_label}."
        )

    # Xác minh mật khẩu
    is_valid = verify_password(payload.password, account["password_hash"])
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Mật khẩu đăng nhập không chính xác."
        )

    # Cập nhật last_login
    execute_commit("UPDATE accounts SET last_login = CURRENT_TIMESTAMP WHERE id = ?", (account["id"],))

    return {
        "success": True,
        "account": {
            "id": account["id"],
            "name": account["name"],
            "email": account["email"],
            "username": account["username"],
            "phone": account["phone"] or "",
            "department": account["department"] or "",
            "role": account["role"],
            "isDefaultPassword": bool(account["is_default_password"]),
            "mustChangePassword": bool(account["must_change_password"])
        }
    }


@router.post("/change-password")
async def change_password(payload: ChangePasswordPayload):
    """
    Đổi mật khẩu tài khoản và tắt cờ bắt buộc đổi mật khẩu lần đầu.
    """
    account = query_one("SELECT id, password_hash FROM accounts WHERE id = ?", (payload.accountId,))
    if not account:
        raise HTTPException(status_code=404, detail="Không tìm thấy tài khoản.")

    if not verify_password(payload.oldPassword, account["password_hash"]):
        raise HTTPException(status_code=400, detail="Mật khẩu hiện tại không chính xác.")

    if len(payload.newPassword) < 6:
        raise HTTPException(status_code=400, detail="Mật khẩu mới phải có ít nhất 6 ký tự.")

    new_hash = hash_password(payload.newPassword)
    execute_commit("""
        UPDATE accounts
        SET password_hash = ?, is_default_password = FALSE, must_change_password = FALSE
        WHERE id = ?
    """, (new_hash, payload.accountId))

    return {"success": True, "message": "Đổi mật khẩu thành công."}


class CreateLecturerPayload(BaseModel):
    name: str
    email: str
    username: str
    department: Optional[str] = ""
    phone: Optional[str] = ""
    password: Optional[str] = "@Noviara123"
    mustChangePassword: Optional[bool] = True


@router.get("/lecturers")
async def get_all_lecturers():
    """Admin lấy danh sách toàn bộ Giảng viên từ CSDL (Không lộ mật khẩu)."""
    from backend.database import query_all
    rows = query_all("""
        SELECT id, name, email, username, phone, department, role,
               is_default_password as isDefaultPassword,
               must_change_password as mustChangePassword,
               created_at as createdAt, last_login as lastLogin
        FROM accounts
        WHERE role = 'lecturer'
        ORDER BY created_at DESC
    """)
    for r in rows:
        r["isDefaultPassword"] = bool(r["isDefaultPassword"])
        r["mustChangePassword"] = bool(r["mustChangePassword"])
    return rows


@router.post("/lecturers", status_code=status.HTTP_201_CREATED)
async def admin_create_lecturer(payload: CreateLecturerPayload):
    """Admin tạo tài khoản Giảng viên mới (Quy định: Có khoa mới có giảng viên)."""
    import time
    from backend.database import query_one, execute_commit

    # Quy định hệ thống: Phải có Khoa mới có Giảng viên
    dept_name = (payload.department or "").strip()
    if not dept_name:
        raise HTTPException(
            status_code=400,
            detail="Quy định hệ thống: 'Có khoa mới có giảng viên'. Vui lòng chọn Khoa / Đơn vị cho Giảng viên."
        )

    dept_check = query_one(
        "SELECT id, name FROM departments WHERE LOWER(name) = LOWER(?) OR LOWER(code) = LOWER(?)",
        (dept_name, dept_name)
    )
    if not dept_check:
        raise HTTPException(
            status_code=400,
            detail=f"Khoa '{dept_name}' không tồn tại trong hệ thống. Vui lòng tạo Khoa trước khi thêm Giảng viên."
        )

    username = payload.username.strip().lower()
    email = payload.email.strip().lower()

    existing = query_one(
        "SELECT id FROM accounts WHERE LOWER(username) = ? OR LOWER(email) = ?",
        (username, email)
    )
    if existing:
        raise HTTPException(status_code=400, detail="Tên đăng nhập hoặc Email này đã tồn tại.")

    raw_pass = payload.password or "@Noviara123"
    pwd_hash = hash_password(raw_pass)
    acc_id = f"GV-{int(time.time())}"

    execute_commit("""
        INSERT INTO accounts 
        (id, username, password_hash, name, email, phone, department, role, is_default_password, must_change_password)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'lecturer', TRUE, ?)
    """, (
        acc_id, username, pwd_hash, payload.name, email,
        payload.phone or "", dept_check["name"],
        bool(payload.mustChangePassword)
    ))

    return {
        "success": True,
        "message": f"Tạo tài khoản Giảng viên {payload.name} thuộc khoa {dept_check['name']} thành công.",
        "account": {
            "id": acc_id,
            "name": payload.name,
            "email": email,
            "username": username,
            "phone": payload.phone or "",
            "department": dept_check["name"],
            "role": "lecturer",
            "isDefaultPassword": True,
            "mustChangePassword": bool(payload.mustChangePassword)
        },
        "initialPassword": raw_pass
    }


@router.delete("/lecturers/{lecturer_id}")
async def admin_delete_lecturer(lecturer_id: str):
    """Admin xóa tài khoản Giảng viên (Đảm bảo gỡ ràng buộc an toàn ở classes và sessions)."""
    from backend.database import query_one, execute_commit
    acc = query_one("SELECT id FROM accounts WHERE id = ? AND role = 'lecturer'", (lecturer_id,))
    if not acc:
        raise HTTPException(status_code=404, detail="Không tìm thấy tài khoản Giảng viên.")

    # Gỡ bỏ liên kết an toàn trước khi xóa để không bị lỗi khóa ngoại
    execute_commit("UPDATE classes SET lecturer_id = NULL WHERE lecturer_id = ?", (lecturer_id,))
    execute_commit("UPDATE grouping_sessions SET lecturer_id = NULL WHERE lecturer_id = ?", (lecturer_id,))
    execute_commit("DELETE FROM accounts WHERE id = ? AND role = 'lecturer'", (lecturer_id,))
    return {"success": True, "deletedId": lecturer_id}


class BulkDeleteLecturersPayload(BaseModel):
    ids: List[str]


@router.post("/lecturers/bulk-delete")
async def admin_bulk_delete_lecturers(payload: BulkDeleteLecturersPayload):
    """Admin xóa nhiều tài khoản Giảng viên cùng lúc."""
    from backend.database import execute_commit
    if not payload.ids:
        return {"success": True, "count": 0}

    deleted_count = 0
    for l_id in payload.ids:
        execute_commit("UPDATE classes SET lecturer_id = NULL WHERE lecturer_id = ?", (l_id,))
        execute_commit("UPDATE grouping_sessions SET lecturer_id = NULL WHERE lecturer_id = ?", (l_id,))
        rows = execute_commit("DELETE FROM accounts WHERE id = ? AND role = 'lecturer'", (l_id,))
        if rows:
            deleted_count += 1

    return {"success": True, "deletedCount": deleted_count}


class ResetLecturerPasswordPayload(BaseModel):
    newPassword: Optional[str] = "@Noviara123"


@router.post("/lecturers/{lecturer_id}/reset-password")
async def admin_reset_lecturer_password(lecturer_id: str, payload: ResetLecturerPasswordPayload):
    """Admin đặt lại mật khẩu cho Giảng viên (Mật khẩu mới được băm bảo mật)."""
    from backend.database import query_one, execute_commit
    acc = query_one("SELECT id, name, username FROM accounts WHERE id = ? AND role = 'lecturer'", (lecturer_id,))
    if not acc:
        raise HTTPException(status_code=404, detail="Không tìm thấy tài khoản Giảng viên.")

    raw_pass = payload.newPassword or "@Noviara123"
    new_hash = hash_password(raw_pass)

    execute_commit("""
        UPDATE accounts 
        SET password_hash = ?, is_default_password = TRUE, must_change_password = TRUE 
        WHERE id = ?
    """, (new_hash, lecturer_id))

    return {
        "success": True,
        "message": f"Đặt lại mật khẩu cho giảng viên {acc['name']} thành công.",
        "newPassword": raw_pass
    }


class ResetByEmailPayload(BaseModel):
    email: str
    newPassword: Optional[str] = "@Noviara123"


@router.post("/lecturers/reset-by-email")
async def admin_reset_lecturer_by_email(payload: ResetByEmailPayload):
    """Admin đặt lại mật khẩu cho Giảng viên qua Email/Gmail."""
    from backend.database import query_one, execute_commit
    email = payload.email.strip().lower()
    acc = query_one("SELECT id, name, username, email FROM accounts WHERE LOWER(email) = ? AND role = 'lecturer'", (email,))
    if not acc:
        raise HTTPException(status_code=404, detail=f"Không tìm thấy tài khoản Giảng viên với Email: {email}")

    raw_pass = payload.newPassword or "@Noviara123"
    new_hash = hash_password(raw_pass)

    execute_commit("""
        UPDATE accounts 
        SET password_hash = ?, is_default_password = TRUE, must_change_password = TRUE 
        WHERE id = ?
    """, (new_hash, acc["id"]))

    return {
        "success": True,
        "message": f"Đặt lại mật khẩu mặc định thành công cho Giảng viên {acc['name']}.",
        "newPassword": raw_pass,
        "email": acc["email"]
    }

