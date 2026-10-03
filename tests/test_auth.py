# -*- coding: utf-8 -*-
import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

import pytest
from fastapi.testclient import TestClient
from backend.main import app
from backend.auth_utils import hash_password, verify_password
from backend.database import execute_commit, query_one

client = TestClient(app)


def test_password_hashing_and_verification():
    """Kiểm tra thuật toán băm và xác minh mật khẩu PBKDF2."""
    raw_pwd = "MySecretPassword2026@!"
    hashed = hash_password(raw_pwd)
    
    assert hashed.startswith("pbkdf2:sha256:100000$")
    assert verify_password(raw_pwd, hashed) is True
    assert verify_password("WrongPassword", hashed) is False
    assert verify_password("", hashed) is False


def test_auth_login_flow():
    """Kiểm tra luồng đăng nhập qua API với mật khẩu băm."""
    test_user = "test_admin"
    test_email = "test_admin@NOVIARA.edu.vn"
    test_pass = "SecureAdminPass#2026"
    test_hash = hash_password(test_pass)

    # Dọn dẹp nếu có
    execute_commit("DELETE FROM accounts WHERE username = ?", (test_user,))

    # Chèn tài khoản test với mật khẩu băm
    execute_commit("""
        INSERT INTO accounts 
        (id, username, password_hash, name, email, role, is_default_password, must_change_password)
        VALUES ('TEST-ADMIN-01', ?, ?, 'Admin Kiểm Thử', ?, 'admin', FALSE, FALSE)
    """, (test_user, test_hash, test_email))

    # 1. Đăng nhập sai mật khẩu -> 401
    res_fail = client.post("/api/auth/login", json={
        "usernameOrEmail": test_user,
        "password": "WrongPassword123",
        "role": "admin"
    })
    assert res_fail.status_code == 401

    # 2. Đăng nhập đúng mật khẩu bằng username -> 200
    res_ok_user = client.post("/api/auth/login", json={
        "usernameOrEmail": test_user,
        "password": test_pass,
        "role": "admin"
    })
    assert res_ok_user.status_code == 200
    data = res_ok_user.json()
    assert data["success"] is True
    assert data["account"]["username"] == test_user
    assert "password_hash" not in data["account"]

    # 3. Đăng nhập đúng mật khẩu bằng email -> 200
    res_ok_email = client.post("/api/auth/login", json={
        "usernameOrEmail": test_email,
        "password": test_pass,
        "role": "admin"
    })
    assert res_ok_email.status_code == 200

    # 4. Đăng nhập sai vai trò (đăng nhập vào cổng giảng viên) -> 403
    res_wrong_role = client.post("/api/auth/login", json={
        "usernameOrEmail": test_user,
        "password": test_pass,
        "role": "lecturer"
    })
    assert res_wrong_role.status_code == 403

    # Dọn dẹp
    execute_commit("DELETE FROM accounts WHERE username = ?", (test_user,))


def test_admin_create_lecturer_with_hashed_password():
    """Kiểm tra Admin tạo tài khoản Giảng viên và mật khẩu được băm an toàn trong CSDL."""
    lec_payload = {
        "name": "ThS. Đỗ Tuấn Anh",
        "email": "tuananh.do@NOVIARA.edu.vn",
        "username": "tuananh.do",
        "department": "Khoa Công Nghệ Thông Tin",
        "phone": "0987111222",
        "password": "LecturerSecurePass#2026",
        "mustChangePassword": True
    }

    # Đảm bảo Khoa Công Nghệ Thông Tin tồn tại theo nguyên tắc 'Có khoa mới có giảng viên'
    execute_commit("""
        INSERT INTO departments (id, code, name, description)
        VALUES ('DEPT-CNTT-TEST', 'CNTT', 'Khoa Công Nghệ Thông Tin', 'Khoa CNTT')
        ON CONFLICT (name) DO NOTHING
    """)

    # Xóa trước nếu tồn tại
    execute_commit("DELETE FROM accounts WHERE username = ?", (lec_payload["username"],))

    # Admin tạo giảng viên
    res = client.post("/api/auth/lecturers", json=lec_payload)
    assert res.status_code == 201
    created = res.json()
    assert created["success"] is True
    assert created["account"]["username"] == lec_payload["username"]
    lec_id = created["account"]["id"]

    # Kiểm tra trong CSDL PostgreSQL: Mật khẩu PHẢI là chuỗi băm PBKDF2, không được lưu plaintext
    db_acc = query_one("SELECT password_hash, must_change_password FROM accounts WHERE id = ?", (lec_id,))
    assert db_acc is not None
    assert db_acc["password_hash"].startswith("pbkdf2:sha256:100000$")
    assert db_acc["password_hash"] != lec_payload["password"]
    assert verify_password(lec_payload["password"], db_acc["password_hash"]) is True

    # Kiểm tra Giảng viên đăng nhập bằng mật khẩu này
    res_login = client.post("/api/auth/login", json={
        "usernameOrEmail": lec_payload["username"],
        "password": lec_payload["password"],
        "role": "lecturer"
    })
    assert res_login.status_code == 200
    assert res_login.json()["account"]["mustChangePassword"] is True

    # Dọn dẹp
    client.delete(f"/api/auth/lecturers/{lec_id}")
    execute_commit("DELETE FROM departments WHERE id = 'DEPT-CNTT-TEST'")


if __name__ == '__main__':
    pytest.main([__file__, "-v"])


