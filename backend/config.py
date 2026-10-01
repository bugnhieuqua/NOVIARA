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

# Đọc model AI từ env (mặc định gemini-3.6-flash)
raw_model = os.getenv("GEMINI_MODEL", "gemini-3.6-flash").strip()
if raw_model in ["3.6", "gemini 3.6", "gemini-3.6"]:
    GEMINI_MODEL = "gemini-3.6-flash"
else:
    GEMINI_MODEL = raw_model

PORT = int(os.getenv("PORT", "8000"))
HOST = os.getenv("HOST", "0.0.0.0")

# Cấu hình Cơ sở dữ liệu (PostgreSQL mặc định, SQLite dự phòng)
DB_ENGINE = os.getenv("DB_ENGINE", "postgres").strip().lower()
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = int(os.getenv("DB_PORT", "5432"))
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")
DB_NAME = os.getenv("DB_NAME", "noavira")

