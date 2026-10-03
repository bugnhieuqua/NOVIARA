# -*- coding: utf-8 -*-
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from typing import Optional, List
from backend.database import query_one, execute_commit
from backend.auth_utils import hash_password, verify_password
from backend.constants import (
    DEFAULT_PASSWORD,
    ROLE_ADMIN,
    ROLE_LECTURER,
    OTP_EXPIRATION_SECONDS,
    MAX_OTP_ATTEMPTS,
    OTP_LENGTH
)

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
    Xác thực đăng nhập tài khoản Quản trị viên hoặc Giảng viên qua CSDL:
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
    password: Optional[str] = DEFAULT_PASSWORD
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
        r["isDefaultPassword"] = bool(r.get("isDefaultPassword"))
        r["mustChangePassword"] = bool(r.get("mustChangePassword"))
        if r.get("createdAt") is not None:
            r["createdAt"] = str(r["createdAt"])[:19]
        else:
            r["createdAt"] = ""
        if r.get("lastLogin") is not None:
            r["lastLogin"] = str(r["lastLogin"])[:19]
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

    raw_pass = payload.password.strip() if (payload.password and payload.password.strip()) else DEFAULT_PASSWORD
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
    newPassword: Optional[str] = DEFAULT_PASSWORD


@router.post("/lecturers/{lecturer_id}/reset-password")
async def admin_reset_lecturer_password(lecturer_id: str, payload: ResetLecturerPasswordPayload):
    """Admin đặt lại mật khẩu cho Giảng viên (Mật khẩu mới được băm bảo mật)."""
    from backend.database import query_one, execute_commit
    acc = query_one("SELECT id, name, username FROM accounts WHERE id = ? AND role = 'lecturer'", (lecturer_id,))
    if not acc:
        raise HTTPException(status_code=404, detail="Không tìm thấy tài khoản Giảng viên.")

    raw_pass = payload.newPassword.strip() if (payload.newPassword and payload.newPassword.strip()) else DEFAULT_PASSWORD
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
    newPassword: Optional[str] = DEFAULT_PASSWORD


@router.post("/lecturers/reset-by-email")
async def admin_reset_lecturer_by_email(payload: ResetByEmailPayload):
    """Admin đặt lại mật khẩu cho Giảng viên qua Email/Gmail."""
    from backend.database import query_one, execute_commit
    email = payload.email.strip().lower()
    acc = query_one("SELECT id, name, username, email FROM accounts WHERE LOWER(email) = ? AND role = 'lecturer'", (email,))
    if not acc:
        raise HTTPException(status_code=404, detail=f"Không tìm thấy tài khoản Giảng viên với Email: {email}")

    raw_pass = payload.newPassword.strip() if (payload.newPassword and payload.newPassword.strip()) else DEFAULT_PASSWORD
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


# =========================================================
# QUẢN LÝ GỬI MÃ OTP QUA GMAIL CHO ĐĂNG NHẬP LẦN ĐẦU
# =========================================================
import random
import time
import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

logger = logging.getLogger(__name__)

# Bộ nhớ lưu trữ OTP: {email: {"otp": str, "expires": float, "attempts": int}}
_otp_store = {}


def send_gmail_otp(to_email: str, recipient_name: str, otp_code: str) -> bool:
    """Gửi mã OTP 6 chữ số qua Gmail SMTP tới email người dùng."""
    from backend.config import SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, EMAIL_FROM

    subject = f"[NOVIARA] Mã xác thực OTP kích hoạt tài khoản: {otp_code}"
    html_content = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
        <div style="text-align: center; margin-bottom: 20px;">
            <h2 style="color: #047857; margin: 0;">NOVIARA - Hệ Thống Phân Nhóm Đồ Án</h2>
            <p style="color: #64748b; font-size: 13px; margin-top: 4px;">Xác thực tài khoản và thiết lập mật khẩu lần đầu</p>
        </div>
        <p>Kính gửi <strong>{recipient_name or 'Thầy/Cô'}</strong>,</p>
        <p>Hệ thống ghi nhận yêu cầu đăng nhập và kích hoạt tài khoản lần đầu cho hòm thư <strong>{to_email}</strong>.</p>
        <div style="background-color: #f0fdf4; border: 2px dashed #059669; padding: 20px; text-align: center; border-radius: 12px; margin: 24px 0;">
            <span style="font-size: 13px; color: #475569; display: block; margin-bottom: 6px;">Mã xác thực OTP của Thầy/Cô là:</span>
            <span style="font-size: 32px; font-weight: bold; font-family: monospace; letter-spacing: 8px; color: #047857;">{otp_code}</span>
            <span style="font-size: 12px; color: #94a3b8; display: block; margin-top: 8px;">(Mã có hiệu lực trong vòng 5 phút)</span>
        </div>
        <p style="color: #e11d48; font-size: 13px;">⚠️ <strong>Lưu ý an toàn:</strong> Tuyệt đối không chia sẻ mã này cho bất kỳ ai khác.</p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
        <p style="color: #94a3b8; font-size: 11px; text-align: center;">Thư này được gửi tự động từ hệ thống NOVIARA. Vui lòng không trả lời thư này.</p>
    </div>
    """

    if SMTP_USER and SMTP_PASSWORD:
        try:
            from email.utils import parseaddr, formataddr

            # Chuẩn hóa địa chỉ người gửi (bóc tách email sạch, tránh trùng lặp)
            _, parsed_addr = parseaddr(EMAIL_FROM)
            clean_from_email = parsed_addr or SMTP_USER
            from_header = formataddr(("NOVIARA System", clean_from_email))

            clean_to_email = to_email.strip().lower()

            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = from_header
            msg["To"] = clean_to_email

            part_text = MIMEText(f"Mã OTP xác thực đổi mật khẩu lần đầu của bạn là: {otp_code} (hiệu lực 5 phút).", "plain", "utf-8")
            part_html = MIMEText(html_content, "html", "utf-8")
            msg.attach(part_text)
            msg.attach(part_html)

            with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=10.0) as server:
                server.starttls()
                server.login(SMTP_USER, SMTP_PASSWORD)
                server.sendmail(clean_from_email, [clean_to_email], msg.as_string())
            logger.info(f"Đã gửi thư OTP qua Gmail SMTP thành công từ {clean_from_email} tới {clean_to_email}")
            return True
        except Exception as e:
            logger.error(f"Lỗi khi gửi thư SMTP qua {SMTP_HOST}: {e}")
            return False
    else:
        logger.info(f"[GMAIL DISPATCH] Mã OTP xác thực cho {to_email}: {otp_code} (Chưa cấu hình SMTP_USER trong .env)")
        return True


class SendOtpPayload(BaseModel):
    email: str
    name: Optional[str] = ""


@router.post("/send-otp")
async def send_otp(payload: SendOtpPayload):
    """
    Gửi mã OTP 6 chữ số đến hòm thư Gmail của người dùng.
    TUYỆT ĐỐI KHÔNG TRẢ MÃ VỀ JSON MÀN HÌNH ĐỂ ĐẢM BẢO BẢO MẬT.
    """
    email = payload.email.strip().lower()
    if not email:
        raise HTTPException(status_code=400, detail="Vui lòng cung cấp địa chỉ Email/Gmail hợp lệ.")

    acc = query_one("SELECT id, name FROM accounts WHERE LOWER(email) = ? OR LOWER(username) = ?", (email, email))
    rec_name = payload.name or (acc["name"] if acc else "Thầy/Cô")

    # Sinh mã OTP ngẫu nhiên
    otp_code = str(random.randint(10 ** (OTP_LENGTH - 1), (10 ** OTP_LENGTH) - 1))
    _otp_store[email] = {
        "otp": otp_code,
        "expires": time.time() + OTP_EXPIRATION_SECONDS,
        "attempts": 0
    }

    # Gửi qua Gmail
    success = send_gmail_otp(email, rec_name, otp_code)
    from backend.config import SMTP_USER, SMTP_PASSWORD
    if not success and SMTP_USER and SMTP_PASSWORD:
        raise HTTPException(
            status_code=500,
            detail=f"Máy chủ gửi email báo lỗi khi chuyển tiếp tới '{email}'. Vui lòng kiểm tra lại hòm thư."
        )

    return {
        "success": True,
        "message": f"Mã xác thực 6 chữ số đã được gửi tới hòm thư: {email}. Vui lòng kiểm tra Gmail."
    }


class VerifyOtpPayload(BaseModel):
    email: str
    otp: str


@router.post("/verify-otp")
async def verify_otp(payload: VerifyOtpPayload):
    """Xác thực mã OTP trước khi cho phép chuyển sang bước nhập mật khẩu mới."""
    email = payload.email.strip().lower()
    user_otp = payload.otp.strip()

    if not email or not user_otp:
        raise HTTPException(status_code=400, detail="Vui lòng nhập đầy đủ mã OTP.")

    stored = _otp_store.get(email)
    if not stored:
        raise HTTPException(status_code=400, detail="Mã OTP chưa được gửi hoặc đã hết hạn. Vui lòng bấm 'Gửi lại mã'.")

    if time.time() > stored["expires"]:
        _otp_store.pop(email, None)
        raise HTTPException(status_code=400, detail="Mã OTP đã hết hạn (5 phút). Vui lòng yêu cầu mã mới.")

    stored["attempts"] += 1
    if stored["attempts"] > MAX_OTP_ATTEMPTS:
        _otp_store.pop(email, None)
        raise HTTPException(status_code=400, detail=f"Nhập sai mã OTP quá {MAX_OTP_ATTEMPTS} lần. Vui lòng gửi lại mã mới.")

    if user_otp != stored["otp"]:
        raise HTTPException(status_code=400, detail="Mã OTP không chính xác. Vui lòng kiểm tra lại Gmail.")

    return {"success": True, "message": "Xác thực mã OTP thành công."}


class FirstTimeChangePasswordPayload(BaseModel):
    email: str
    otp: str
    newPassword: str


@router.post("/first-time-change-password")
async def first_time_change_password(payload: FirstTimeChangePasswordPayload):
    """
    Xác thực mã OTP gửi qua Gmail và cập nhật mật khẩu lần đầu trực tiếp vào CSDL.
    """
    email = payload.email.strip().lower()
    user_otp = payload.otp.strip()

    if not email or not user_otp or not payload.newPassword:
        raise HTTPException(status_code=400, detail="Vui lòng điền đầy đủ Email, mã OTP và Mật khẩu mới.")

    stored = _otp_store.get(email)
    if not stored:
        raise HTTPException(status_code=400, detail="Mã OTP chưa được gửi hoặc đã hết hạn. Vui lòng bấm 'Gửi lại mã'.")

    if time.time() > stored["expires"]:
        _otp_store.pop(email, None)
        raise HTTPException(status_code=400, detail="Mã OTP đã hết hạn (5 phút). Vui lòng yêu cầu mã mới.")

    stored["attempts"] += 1
    if stored["attempts"] > MAX_OTP_ATTEMPTS:
        _otp_store.pop(email, None)
        raise HTTPException(status_code=400, detail=f"Bạn đã nhập sai mã OTP quá {MAX_OTP_ATTEMPTS} lần. Vui lòng gửi lại mã mới.")

    if user_otp != stored["otp"]:
        raise HTTPException(status_code=400, detail="Mã OTP không chính xác. Vui lòng kiểm tra lại hòm thư Gmail.")

    if len(payload.newPassword) < 8:
        raise HTTPException(status_code=400, detail="Mật khẩu mới phải có tối thiểu 8 ký tự.")

    # Tìm tài khoản để cập nhật
    acc = query_one("SELECT id, name, username, email, department, role FROM accounts WHERE LOWER(email) = ? OR LOWER(username) = ?", (email, email))
    if not acc:
        raise HTTPException(status_code=404, detail="Không tìm thấy tài khoản người dùng.")

    new_hash = hash_password(payload.newPassword)
    execute_commit("""
        UPDATE accounts 
        SET password_hash = ?, is_default_password = FALSE, must_change_password = FALSE 
        WHERE id = ?
    """, (new_hash, acc["id"]))

    # Xóa OTP sau khi sử dụng thành công
    _otp_store.pop(email, None)

    return {
        "success": True,
        "message": "Kích hoạt và cập nhật mật khẩu mới thành công.",
        "account": {
            "id": acc["id"],
            "name": acc["name"],
            "username": acc["username"],
            "email": acc["email"],
            "department": acc.get("department") or "",
            "role": acc["role"],
            "isDefaultPassword": False,
            "mustChangePassword": False
        }
    }


