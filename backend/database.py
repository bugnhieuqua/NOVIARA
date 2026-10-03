# -*- coding: utf-8 -*-
"""
============================================================================
NOVIARA BACKEND - POSTGRESQL DATABASE CLIENT
============================================================================
Hệ thống CSDL chuẩn sử dụng PostgreSQL qua thư viện psycopg 3 ConnectionPool.
Toàn bộ truy vấn được quản lý thread-safe, tự động commit/rollback transaction.
============================================================================
"""

import os
import re
import logging
from contextlib import contextmanager
from typing import Generator, Any, List, Dict, Optional

from backend.config import DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME

logger = logging.getLogger(__name__)

_pg_pool = None


def get_pg_pool():
    """Khởi tạo và quản lý Connection Pool cho PostgreSQL."""
    global _pg_pool
    if _pg_pool is None:
        try:
            import psycopg
            from psycopg.rows import dict_row
            from psycopg_pool import ConnectionPool

            # Ưu tiên dùng DATABASE_URL (Supabase Pooler / Cloud Postgres)
            # Nếu không có thì kết hợp từ các biến DB_* riêng lẻ
            database_url = os.environ.get("DATABASE_URL", "").strip()
            if database_url:
                conn_info = database_url
                logger.info("Using DATABASE_URL for PostgreSQL connection.")
            else:
                conn_info = f"host={DB_HOST} port={DB_PORT} user={DB_USER} password={DB_PASSWORD} dbname={DB_NAME}"
                logger.info(f"Using individual DB_* variables for PostgreSQL on {DB_HOST}:{DB_PORT}.")

            _pg_pool = ConnectionPool(
                conninfo=conn_info,
                min_size=0,
                max_size=10,
                open=True,
                timeout=30.0,
                kwargs={"row_factory": dict_row}
            )
            logger.info("PostgreSQL connection pool initialized successfully.")
        except Exception as e:
            logger.error(f"Lỗi khởi tạo PostgreSQL connection pool: {e}")
            raise
    return _pg_pool


class SmartDict(dict):
    """
    Dictionary thông minh hỗ trợ truy cập khóa không phân biệt hoa thường
    đảm bảo tương thích giữa các quy ước đặt tên cột của PostgreSQL và Frontend.
    """
    def __getitem__(self, key):
        if key in self:
            return super().__getitem__(key)
        if isinstance(key, str):
            k_lower = key.lower()
            for k, v in self.items():
                if k.lower() == k_lower:
                    return v
        return super().__getitem__(key)

    def get(self, key, default=None):
        try:
            return self[key]
        except KeyError:
            return default

    def __contains__(self, key):
        if super().__contains__(key):
            return True
        if isinstance(key, str):
            k_lower = key.lower()
            return any(k.lower() == k_lower for k in self.keys())
        return False


def adapt_sql(query: str) -> str:
    """
    Chuẩn hóa câu lệnh SQL cho PostgreSQL:
    1. Chuyển đổi placeholder '?' sang '%s'
    2. Chuyển đổi 'INSERT OR IGNORE INTO' sang 'INSERT INTO ... ON CONFLICT DO NOTHING'
    3. Bọc ngoặc kép các alias camelCase sau 'AS' (ví dụ 'AS isSurveyActive' -> 'AS "isSurveyActive"')
       để PostgreSQL bảo toàn định dạng thuộc tính trả về cho React Frontend.
    """
    q = query
    # Chuyển đổi INSERT OR IGNORE INTO an toàn cho PostgreSQL
    if re.search(r'(?i)\binsert\s+or\s+ignore\s+into\b', q):
        q = re.sub(r'(?i)\binsert\s+or\s+ignore\s+into\b', 'INSERT INTO', q)
        if 'on conflict' not in q.lower():
            q = q.rstrip(' ;\n\t') + ' ON CONFLICT DO NOTHING'

    q = q.replace("?", "%s")
    # Giữ nguyên camelCase cho các alias sau AS
    q = re.sub(r'(?i)\bas\s+([a-zA-Z_][a-zA-Z0-9_]*[A-Z][a-zA-Z0-9_]*)', r'AS "\1"', q)
    return q


class PGConnectionWrapper:
    """
    Wrapper bao quanh psycopg connection:
    - Tự động chuyển đổi placeholder '?' sang '%s'
    - Tự động bọc alias camelCase để bảo toàn tên trường
    - Quản lý commit, rollback, cursor an toàn
    """
    def __init__(self, raw_conn):
        self._conn = raw_conn

    def execute(self, query: str, params: Any = None):
        adapted_query = adapt_sql(query)
        if params is None or (isinstance(params, (tuple, list)) and len(params) == 0):
            return self._conn.execute(adapted_query)
        if isinstance(params, list):
            params = tuple(params)
        return self._conn.execute(adapted_query, params)

    def executescript(self, sql_script: str):
        return self._conn.execute(sql_script)

    def commit(self):
        self._conn.commit()

    def rollback(self):
        self._conn.rollback()

    def cursor(self, *args, **kwargs):
        return self._conn.cursor(*args, **kwargs)

    def __getattr__(self, name):
        return getattr(self._conn, name)


@contextmanager
def get_db_connection() -> Generator[Any, None, None]:
    """
    Context manager cung cấp kết nối CSDL PostgreSQL từ Connection Pool.
    Tự động commit nếu thành công, rollback nếu có exception.
    """
    pool = get_pg_pool()
    with pool.connection() as raw_conn:
        wrapped = PGConnectionWrapper(raw_conn)
        try:
            yield wrapped
            wrapped.commit()
        except Exception:
            wrapped.rollback()
            raise


def query_all(query: str, params: tuple = ()) -> List[Dict[str, Any]]:
    """Thực thi câu truy vấn SELECT và trả về danh sách các SmartDict."""
    with get_db_connection() as conn:
        cursor = conn.execute(query, params)
        rows = cursor.fetchall()
        return [SmartDict(dict(row)) for row in rows]


def query_one(query: str, params: tuple = ()) -> Optional[Dict[str, Any]]:
    """Thực thi câu truy vấn SELECT và trả về 1 SmartDict duy nhất hoặc None."""
    with get_db_connection() as conn:
        cursor = conn.execute(query, params)
        row = cursor.fetchone()
        return SmartDict(dict(row)) if row else None


def execute_commit(query: str, params: tuple = ()) -> int:
    """Thực thi INSERT / UPDATE / DELETE và trả về rowcount hoặc lastrowid."""
    with get_db_connection() as conn:
        cursor = conn.execute(query, params)
        last_id = getattr(cursor, "lastrowid", None)
        return last_id if last_id else cursor.rowcount
