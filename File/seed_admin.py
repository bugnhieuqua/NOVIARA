#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
NOVIARA - Script Khởi Tạo & Quản Lý Tài Khoản Bảo Mật
Hỗ trợ cả PostgreSQL (noavira) và SQLite.
Cho phép xóa sạch toàn bộ tài khoản cũ và tự tạo tài khoản Admin / Giảng viên trực tiếp.
"""
import sys
import os
import argparse
from pathlib import Path

# Cấu hình encoding UTF-8 cho console Windows
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

# Đảm bảo đường dẫn gốc dự án NOVIARA được nạp vào sys.path
ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from backend.config import DB_ENGINE, DB_HOST, DB_PORT, DB_NAME, DB_USER
from backend.database import get_db_connection, query_all, query_one, execute_commit
from backend.auth_utils import hash_password, verify_password
from backend.models import init_db


def ensure_db_ready():
    """Đảm bảo bảng CSDL đã được khởi tạo."""
    init_db(seed=True)


def reset_all_accounts():
    """Xóa sạch toàn bộ tài khoản người dùng trong CSDL."""
    ensure_db_ready()
    with get_db_connection() as conn:
        conn.execute("UPDATE classes SET lecturer_id = 'GV-DEFAULT' WHERE lecturer_id IS NOT NULL;")
        conn.execute("UPDATE grouping_sessions SET lecturer_id = NULL WHERE lecturer_id IS NOT NULL;")
        conn.execute("DELETE FROM accounts;")
    print("[OK] Đã xóa sạch toàn bộ tài khoản trong cơ sở dữ liệu!")


def list_accounts():
    """Liệt kê danh sách tài khoản hiện có trong hệ thống."""
    ensure_db_ready()
    accounts = query_all("SELECT id, username, email, name, role, department, created_at, last_login FROM accounts ORDER BY created_at ASC")
    return accounts


def setup_admin_account(username: str, email: str, name: str, password: str, department: str = "Ban Giám Hiệu / Quản Trị Hệ Thống"):
    """
    TẠO HOẶC CẬP NHẬT TÀI KHOẢN ADMIN:
    Mật khẩu được băm một chiều an toàn qua PBKDF2-HMAC-SHA256 (100,000 vòng lặp).
    """
    ensure_db_ready()
    username = username.strip().lower()
    email = email.strip().lower()

    if not username or not password:
        print("[!] Lỗi: Tên đăng nhập và mật khẩu không được để trống!")
        return None

    # Kiểm tra xem tài khoản đã có chưa
    existing = query_one("SELECT id, username FROM accounts WHERE LOWER(username) = ? OR LOWER(email) = ?", (username, email))
    pwd_hash = hash_password(password)

    if existing:
        execute_commit("""
            UPDATE accounts 
            SET password_hash = ?, role = 'admin', name = ?, department = ?, is_default_password = FALSE, must_change_password = FALSE 
            WHERE id = ?
        """, (pwd_hash, name, department, existing["id"]))
        acc_id = existing["id"]
        action = "CẬP NHẬT MẬT KHẨU ADMIN"
    else:
        acc_id = "ADMIN-MASTER"
        execute_commit("""
            INSERT INTO accounts 
            (id, username, password_hash, name, email, department, role, is_default_password, must_change_password)
            VALUES (?, ?, ?, ?, ?, ?, 'admin', FALSE, FALSE)
        """, (acc_id, username, pwd_hash, name, email, department))
        action = "KHỞI TẠO MỚI ADMIN"

    print("\n" + "="*70)
    print(f"[OK] {action} THÀNH CÔNG!")
    print("="*70)
    print(f"  • CSDL Sử Dụng : {DB_ENGINE.upper()} ({DB_NAME} tại {DB_HOST}:{DB_PORT})")
    print(f"  • Mã tài khoản : {acc_id}")
    print(f"  • Vai trò      : Quản Trị Viên (System Admin)")
    print(f"  • Tên hiển thị : {name}")
    print(f"  • Tên đăng nhập: {username}")
    print(f"  • Email        : {email}")
    print(f"  • Mật khẩu gốc : {password} (Dùng để đăng nhập giao diện NOVIARA)")
    print(f"  • Mã băm CSDL  : {pwd_hash[:35]}... (PBKDF2 An toàn 100%)")
    print("="*70 + "\n")
    return acc_id


def admin_create_lecturer(username: str, email: str, name: str, password: str, dept: str = "Khoa Công Nghệ Thông Tin"):
    """
    TẠO TÀI KHOẢN GIẢNG VIÊN:
    Mật khẩu cũng được băm bảo mật PBKDF2.
    """
    ensure_db_ready()
    username = username.strip().lower()
    email = email.strip().lower()

    if not username or not password:
        print("[!] Lỗi: Tên đăng nhập và mật khẩu không được để trống!")
        return None

    existing = query_one("SELECT id FROM accounts WHERE LOWER(username) = ? OR LOWER(email) = ?", (username, email))
    pwd_hash = hash_password(password)

    if existing:
        execute_commit("""
            UPDATE accounts 
            SET password_hash = ?, name = ?, department = ?, role = 'lecturer' 
            WHERE id = ?
        """, (pwd_hash, name, dept, existing["id"]))
        acc_id = existing["id"]
        action = "CẬP NHẬT TÀI KHOẢN GIẢNG VIÊN"
    else:
        import time
        acc_id = f"GV-{int(time.time())}"
        execute_commit("""
            INSERT INTO accounts 
            (id, username, password_hash, name, email, department, role, is_default_password, must_change_password)
            VALUES (?, ?, ?, ?, ?, ?, 'lecturer', FALSE, FALSE)
        """, (acc_id, username, pwd_hash, name, email, dept))
        action = "TẠO MỚI GIẢNG VIÊN"

    print("\n" + "="*70)
    print(f"[OK] {action} THÀNH CÔNG!")
    print("="*70)
    print(f"  • Mã tài khoản : {acc_id}")
    print(f"  • Vai trò      : Giảng Viên (Lecturer)")
    print(f"  • Tên hiển thị : {name}")
    print(f"  • Tên đăng nhập: {username}")
    print(f"  • Email        : {email}")
    print(f"  • Mật khẩu gốc : {password} (Dùng để đăng nhập giao diện NOVIARA)")
    print(f"  • Khoa/Bộ môn  : {dept}")
    print("="*70 + "\n")
    return acc_id


def reset_lecturer_password_by_email(email: str, default_password: str = "@Noviara123") -> bool:
    """
    ĐẶT LẠI MẬT KHẨU MẶC ĐỊNH CHO GIẢNG VIÊN QUA GMAIL/EMAIL:
    - Tìm tài khoản giảng viên theo email (LOWER(email)).
    - Băm mật khẩu mặc định an toàn bằng PBKDF2-HMAC-SHA256 (100,000 vòng lặp).
    - Cập nhật is_default_password = TRUE, must_change_password = TRUE.
    - Giảng viên sẽ phải đổi mật khẩu ở lần đăng nhập tiếp theo.
    """
    ensure_db_ready()
    email = (email or "").strip().lower()
    if not email:
        print("[!] Lỗi: Email không được để trống!")
        return False

    acc = query_one("""
        SELECT id, username, name, email, role, department 
        FROM accounts 
        WHERE LOWER(email) = ? AND role = 'lecturer'
    """, (email,))

    if not acc:
        any_acc = query_one("SELECT id, username, name, email, role FROM accounts WHERE LOWER(email) = ?", (email,))
        if any_acc:
            print(f"[!] Lỗi: Tài khoản '{any_acc['email']}' có vai trò là '{any_acc['role']}', không phải Giảng viên (lecturer)!")
        else:
            print(f"[!] Lỗi: Không tìm thấy tài khoản Giảng viên với Email: '{email}'")
        return False

    pwd_hash = hash_password(default_password)
    execute_commit("""
        UPDATE accounts 
        SET password_hash = ?, is_default_password = TRUE, must_change_password = TRUE
        WHERE id = ?
    """, (pwd_hash, acc["id"]))

    print("\n" + "="*70)
    print(" [OK] ĐẶT LẠI MẬT KHẨU MẶC ĐỊNH THÀNH CÔNG CHO GIẢNG VIÊN!")
    print("="*70)
    print(f"  • Mã giảng viên      : {acc['id']}")
    print(f"  • Họ và tên          : {acc['name']}")
    print(f"  • Tên đăng nhập      : {acc['username']}")
    print(f"  • Gmail / Email      : {acc['email']}")
    print(f"  • Mật khẩu mặc định  : {default_password}")
    print(f"  • Đổi pass bắt buộc  : CÓ (must_change_password = TRUE)")
    print(f"  • Trạng thái         : Giảng viên sẽ được yêu cầu đổi mật khẩu ngay khi đăng nhập.")
    print("="*70 + "\n")
    return True


def main():
    parser = argparse.ArgumentParser(description="NOVIARA Account Management Tool")
    parser.add_argument("--reset", action="store_true", help="Xóa sạch toàn bộ tài khoản đang có trong CSDL")
    parser.add_argument("--list", action="store_true", help="Xem danh sách tài khoản hiện tại")
    parser.add_argument("--reset-pass", "--reset-lecturer-pass", dest="reset_lecturer_email", help="Đặt lại mật khẩu mặc định cho giảng viên qua Gmail/Email")
    parser.add_argument("--default-pass", default="@Noviara123", help="Mật khẩu mặc định cần đặt lại (mặc định: @Noviara123)")
    parser.add_argument("--role", choices=["admin", "lecturer"], help="Vai trò tài khoản cần tạo")
    parser.add_argument("--username", help="Tên đăng nhập")
    parser.add_argument("--email", help="Email tài khoản")
    parser.add_argument("--name", help="Họ và tên hiển thị")
    parser.add_argument("--password", help="Mật khẩu tài khoản")
    parser.add_argument("--dept", help="Khoa / Phòng ban")

    args = parser.parse_args()

    ensure_db_ready()

    if args.reset:
        reset_all_accounts()
        return

    if args.list:
        accs = list_accounts()
        print(f"\nDanh sách tài khoản ({len(accs)} tài khoản trong CSDL {DB_NAME}):")
        for a in accs:
            print(f" - [{a['role'].upper()}] {a['username']} ({a['email']}) - Tên: {a['name']}")
        return

    if args.reset_lecturer_email:
        reset_lecturer_password_by_email(args.reset_lecturer_email, args.default_pass)
        return

    # Nếu người dùng truyền đầy đủ tham số qua CLI
    if args.username and args.password:
        role = args.role or "admin"
        email = args.email or f"{args.username}@noviara.edu.vn"
        name = args.name or args.username
        dept = args.dept or ("Ban Quản Trị" if role == "admin" else "Khoa Công Nghệ Thông Tin")
        if role == "admin":
            setup_admin_account(args.username, email, name, args.password, dept)
        else:
            admin_create_lecturer(args.username, email, name, args.password, dept)
        return

    # Chế độ tương tác dòng lệnh (Interactive Menu)
    while True:
        print("\n" + "="*70)
        print("       NOVIARA - CÔNG CỤ TỰ KHỞI TẠO & QUẢN TRỊ TÀI KHOẢN CSDL")
        print(f"       Đang kết nối: {DB_ENGINE.upper()} -> {DB_NAME} (host: {DB_HOST}:{DB_PORT})")
        print("="*70)
        print("  1. Khởi tạo / Cập nhật tài khoản Quản trị viên (Admin)")
        print("  2. Tạo mới tài khoản Giảng viên (Lecturer)")
        print("  3. Đặt lại mật khẩu mặc định cho Giảng viên qua Gmail")
        print("  4. Xem danh sách tài khoản hiện tại")
        print("  5. Xóa sạch toàn bộ tài khoản (Reset DB)")
        print("  0. Thoát")
        print("-"*70)

        choice = input("Vui lòng chọn chức năng [0-5]: ").strip()

        if choice == "1":
            print("\n--- CẤU HÌNH TÀI KHOẢN ADMIN ---")
            in_user = input("1. Tên đăng nhập Admin: ").strip()
            while not in_user:
                in_user = input("   [!] Vui lòng nhập tên đăng nhập Admin: ").strip()
            in_email = input(f"2. Email Admin [{in_user}@noviara.edu.vn]: ").strip() or f"{in_user}@noviara.edu.vn"
            in_name = input("3. Họ tên Admin [Quản Trị Viên]: ").strip() or "Quản Trị Viên"
            in_dept = input("4. Phòng ban [Ban Quản Trị Hệ Thống]: ").strip() or "Ban Quản Trị Hệ Thống"
            in_pass = input("5. Mật khẩu Admin: ").strip()
            while not in_pass:
                in_pass = input("   [!] Vui lòng nhập mật khẩu Admin: ").strip()
            setup_admin_account(in_user, in_email, in_name, in_pass, in_dept)

        elif choice == "2":
            print("\n--- TẠO TÀI KHOẢN GIẢNG VIÊN ---")
            lec_user = input("1. Tên đăng nhập Giảng viên: ").strip()
            while not lec_user:
                lec_user = input("   [!] Vui lòng nhập tên đăng nhập: ").strip()
            lec_email = input(f"2. Email Giảng viên [{lec_user}@noviara.edu.vn]: ").strip() or f"{lec_user}@noviara.edu.vn"
            lec_name = input("3. Họ tên Giảng viên: ").strip() or "Giảng Viên"
            lec_dept = input("4. Khoa / Bộ môn [Khoa CNTT]: ").strip() or "Khoa Công Nghệ Thông Tin"
            lec_pass = input("5. Mật khẩu Giảng viên [@Noviara123]: ").strip() or "@Noviara123"
            admin_create_lecturer(lec_user, lec_email, lec_name, lec_pass, lec_dept)

        elif choice == "3":
            print("\n--- ĐẶT LẠI MẬT KHẨU MẶC ĐỊNH CHO GIẢNG VIÊN QUA GMAIL ---")
            lec_gmail = input("Nhập Gmail / Email của Giảng viên cần đặt lại pass: ").strip()
            while not lec_gmail:
                lec_gmail = input("   [!] Vui lòng nhập Gmail / Email: ").strip()
            def_pass = input("Mật khẩu mặc định mới [@Noviara123]: ").strip() or "@Noviara123"
            reset_lecturer_password_by_email(lec_gmail, def_pass)

        elif choice == "4":
            accs = list_accounts()
            print(f"\nDanh sách tài khoản ({len(accs)} tài khoản trong CSDL {DB_NAME}):")
            for a in accs:
                must_ch = " [Yêu cầu đổi pass]" if a.get("must_change_password") else ""
                print(f" - [{a['role'].upper()}] {a['username']} ({a['email']}) - Tên: {a['name']}{must_ch}")

        elif choice == "5":
            confirm = input("⚠️ Bạn có chắc chắn muốn XÓA SẠCH toàn bộ tài khoản? (y/N): ").strip().lower()
            if confirm in ['y', 'yes']:
                reset_all_accounts()

        elif choice in ["0", "q", "exit"]:
            print("\nĐã thoát chương trình quản lý tài khoản NOVIARA.")
            break
        else:
            print("[!] Lựa chọn không hợp lệ, vui lòng chọn từ 0 đến 5.")


if __name__ == '__main__':
    main()

