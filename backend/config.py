import os
from pathlib import Path
from dotenv import load_dotenv

# Tự động nạp .env và .env.local từ thư mục gốc
ROOT_DIR = Path(__file__).resolve().parent.parent
env_path = ROOT_DIR / ".env"
env_local_path = ROOT_DIR / ".env.local"

if env_local_path.exists():
    load_dotenv(dotenv_path=env_local_path)
elif env_path.exists():
    load_dotenv(dotenv_path=env_path)

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")

from backend.constants import DEFAULT_GEMINI_MODEL

# Đọc model AI từ env (mặc định DEFAULT_GEMINI_MODEL)
raw_model = os.getenv("GEMINI_MODEL", DEFAULT_GEMINI_MODEL).strip()
if raw_model in ["3.6", "gemini 3.6", "gemini-3.6"]:
    GEMINI_MODEL = DEFAULT_GEMINI_MODEL
else:
    GEMINI_MODEL = raw_model

PORT = int(os.getenv("PORT", "8000"))
HOST = os.getenv("HOST", "0.0.0.0")

# Cấu hình Cơ sở dữ liệu chuẩn PostgreSQL
DB_ENGINE = "postgres"
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = int(os.getenv("DB_PORT", "5432"))
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")
DB_NAME = os.getenv("DB_NAME", "noavira")

# Cấu hình gửi thư OTP qua Gmail SMTP
SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
EMAIL_FROM = os.getenv("EMAIL_FROM", SMTP_USER or "noreply@noviara.edu.vn")


