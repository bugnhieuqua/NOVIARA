# -*- coding: utf-8 -*-
"""
============================================================================
NOVIARA BACKEND - SYSTEM CONSTANTS
============================================================================
Tập trung toàn bộ hằng số hệ thống, giá trị mặc định và enum chuỗi
để tránh hardcode và đảm bảo tính nhất quán trên toàn bộ ứng dụng.
============================================================================
"""

# Mật khẩu khởi tạo mặc định cho tài khoản
DEFAULT_PASSWORD = "Noviara@123"

# Các vai trò người dùng trong hệ thống
ROLE_ADMIN = "admin"
ROLE_LECTURER = "lecturer"
VALID_ROLES = [ROLE_ADMIN, ROLE_LECTURER]

# Cấu hình mã xác thực OTP gửi qua Gmail
OTP_EXPIRATION_SECONDS = 60  # 1 phút
MAX_OTP_ATTEMPTS = 5
OTP_LENGTH = 6

# Cấu hình AI Engine mặc định
DEFAULT_GEMINI_MODEL = "gemini-3.6-flash"

# Trạng thái phiên phân nhóm
SESSION_STATUS_DRAFT = "draft"
SESSION_STATUS_RUNNING = "running"
SESSION_STATUS_COMPLETED = "completed"
SESSION_STATUS_PUBLISHED = "published"
