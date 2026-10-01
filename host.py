import os
import sys
from sqlalchemy import create_engine
from dotenv import load_dotenv

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

load_dotenv()

# Lấy biến môi trường
DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")
DB_HOST = os.getenv("DB_HOST")
DB_PORT = os.getenv("DB_PORT")
DB_NAME = os.getenv("DB_NAME")

# Tạo chuỗi kết nối
# SỬA DÒNG NÀY: Đổi psycopg2 thành psycopg
DATABASE_URL = f"postgresql+psycopg://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

# Khởi tạo engine
engine = create_engine(DATABASE_URL)

# In ra để kiểm tra kết nối thành công
try:
    with engine.connect() as connection:
        print("✅ Kết nối PostgreSQL thành công!")
except Exception as e:
    print(f"❌ Lỗi kết nối: {e}")