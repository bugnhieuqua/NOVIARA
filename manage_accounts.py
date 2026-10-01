#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
NOVIARA Security & Account CLI Tool
Công cụ quản lý tài khoản và băm mật khẩu bảo mật cho hệ thống NOVIARA.
"""
import sys
import os
import argparse
from pathlib import Path

# Đảm bảo mã hóa UTF-8 cho stdout trên mọi nền tảng
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

# Đảm bảo đường dẫn gốc import được backend
ROOT_DIR = Path(__file__).resolve().parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from backend.database import get_db_connection, query_all, query_one, execute_commit
from backend.auth_utils import hash_password, verify_password
from backend.models import init_db


def ensure_db_ready():
    init_db(seed=False)


def clean_demo_accounts():
    """Xóa sạch các tài khoản demo mặc định trong CSDL."""
    ensure_db_ready()
    with get_db_connection() as conn:
        conn.execute("UPDATE classes SET lecturer_id = 'GV-SYSTEM' WHERE lecturer_id IN ('ADMIN-01', 'GV-01');")
        conn.execute("""
            DELETE FROM accounts 
            WHERE id IN ('ADMIN-01', 'GV-01') 
               OR email IN ('admin@NOVIARA.edu.vn', 'giangvien@NOVIARA.edu.vn')
               OR username IN ('admin', 'giangvien')
        """)
    print("[OK] Đã xóa sạch toàn bộ tài khoản demo mặc định khỏi Cơ sở Dữ liệu!")


def create_account(role: str, username: str, email: str, name: str, password: str, department: str = ""):
    """Tạo tài khoản mới với mật khẩu được băm một chiều an toàn."""
    ensure_db_ready()
    username = username.strip().lower()
    email = email.strip().lower()
    
    # Kiểm tra trùng lặp
    existing = query_one("SELECT id, username, email FROM accounts WHERE LOWER(username) = ? OR LOWER(email) = ?", (username, email))
    if existing:
        print(f"[!] Lỗi: Tên đăng nhập '{username}' hoặc Email '{email}' đã tồn tại trên hệ thống!")
        return False

    # Băm mật khẩu
    pwd_hash = hash_password(password)
    prefix = "ADMIN" if role == "admin" else "GV"
    import time
    acc_id = f"{prefix}-{int(time.time())}"

    dept = department.strip() if department else ""

    execute_commit("""
        INSERT INTO accounts 
        (id, username, password_hash, name, email, department, role, is_default_password, must_change_password)
        VALUES (?, ?, ?, ?, ?, ?, ?, FALSE, FALSE)
    """, (acc_id, username, pwd_hash, name, email, dept, role))

    print("\n" + "="*60)
    print(f"[OK] TẠO TÀI KHOẢN {role.upper()} THÀNH CÔNG!")
    print("="*60)
    print(f"  • Mã tài khoản : {acc_id}")
    print(f"  • Họ và tên    : {name}")
    print(f"  • Tên đăng nhập: {username}")
    print(f"  • Email        : {email}")
    print(f"  • Vai trò      : {role}")
    print(f"  • Mật khẩu gốc : {password} (ĐÃ ĐƯỢC BĂM AN TOÀN)")
    print(f"  • Mã Hash lưu  : {pwd_hash[:35]}... (Chuỗi PBKDF2-SHA256)")
    print("="*60 + "\n")
    return True


def change_account_password(ident: str, new_password: str):
    """Đổi mật khẩu cho một tài khoản hiện có."""
    ensure_db_ready()
    account = query_one("SELECT id, name, username, email FROM accounts WHERE LOWER(username) = ? OR LOWER(email) = ?", (ident.lower(), ident.lower()))
    if not account:
        print(f"[!] Lỗi: Không tìm thấy tài khoản với mã/email: '{ident}'")
        return False

    pwd_hash = hash_password(new_password)
    execute_commit("""
        UPDATE accounts 
        SET password_hash = ?, is_default_password = FALSE, must_change_password = FALSE 
        WHERE id = ?
    """, (pwd_hash, account["id"]))

    print("\n[OK] ĐỔI MẬT KHẨU THÀNH CÔNG!")
    print(f"  • Tài khoản    : {account['name']} ({account['username']})")
    print(f"  • Mật khẩu mới : {new_password}")
    print(f"  • Chuỗi Hash   : {pwd_hash[:35]}...\n")
    return True


def list_accounts():
    """Liệt kê toàn bộ tài khoản hiện có trong CSDL (Không lộ mật khẩu)."""
    ensure_db_ready()
    accounts = query_all("SELECT id, name, username, email, role, department, created_at, last_login FROM accounts ORDER BY role, id")
    if not accounts:
        print("\n[i] Hiện tại chưa có tài khoản nào trong Cơ sở Dữ liệu.")
        print("    Bạn có thể dùng tùy chọn tạo tài khoản mới bên dưới.\n")
        return

    print("\n" + "="*85)
    print(f"{'ID':<15} | {'VAI TRÒ':<10} | {'USERNAME':<15} | {'HỌ VÀ TÊN':<25} | {'EMAIL'}")
    print("="*85)
    for a in accounts:
        print(f"{a['id']:<15} | {a['role']:<10} | {a['username']:<15} | {a['name']:<25} | {a['email']}")
    print("="*85 + "\n")


def interactive_menu():
    """Giao diện dòng lệnh tương tác trực tiếp."""
    while True:
        print("\n========================================================")
        print("     NOVIARA - QUẢN LÝ BẢO MẬT & TÀI KHOẢN (CLI)")
        print("========================================================")
        print("  1. Xem danh sách tài khoản hiện có")
        print("  2. Tạo tài khoản QUẢN TRỊ VIÊN (Admin) mới")
        print("  3. Tạo tài khoản GIẢNG VIÊN (Lecturer) mới")
        print("  4. Đổi mật khẩu cho một tài khoản")
        print("  5. XÓA SẠCH các tài khoản demo mặc định cũ")
        print("  0. Thoát")
        print("--------------------------------------------------------")
        
        try:
            choice = input("Nhập lựa chọn của bạn [0-5]: ").strip()
        except (KeyboardInterrupt, EOFError):
            print("\nĐã thoát.")
            break

        if choice == '1':
            list_accounts()
        elif choice == '2':
            print("\n--- TẠO TÀI KHOẢN QUẢN TRỊ VIÊN (ADMIN) ---")
            name = input("Họ và tên Admin: ").strip() or "Quản Trị Viên"
            username = input("Tên đăng nhập (username): ").strip()
            email = input("Email: ").strip()
            password = input("Mật khẩu: ").strip()
            if username and email and password:
                create_account('admin', username, email, name, password)
            else:
                print("[!] Vui lòng nhập đầy đủ username, email và password!")
        elif choice == '3':
            print("\n--- TẠO TÀI KHOẢN GIẢNG VIÊN (LECTURER) ---")
            name = input("Họ và tên Giảng viên: ").strip() or "Giảng Viên Bộ Môn"
            username = input("Tên đăng nhập (username): ").strip()
            email = input("Email: ").strip()
            password = input("Mật khẩu: ").strip()
            dept = input("Khoa / Bộ môn (Mặc định: Khoa CNTT): ").strip() or "Khoa Công Nghệ Thông Tin"
            if username and email and password:
                create_account('lecturer', username, email, name, password, dept)
            else:
                print("[!] Vui lòng nhập đầy đủ username, email và password!")
        elif choice == '4':
            ident = input("Nhập username hoặc email của tài khoản cần đổi pass: ").strip()
            new_pass = input("Nhập mật khẩu mới: ").strip()
            if ident and new_pass:
                change_account_password(ident, new_pass)
            else:
                print("[!] Không được để trống thông tin!")
        elif choice == '5':
            clean_demo_accounts()
        elif choice == '0':
            print("Tạm biệt!")
            break
        else:
            print("[!] Lựa chọn không hợp lệ. Vui lòng nhập từ 0 đến 5.")


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description="NOVIARA Account Security Tool")
    subparsers = parser.add_subparsers(dest="command")

    # Command: list
    subparsers.add_parser("list", help="Danh sách tài khoản")

    # Command: clean-demo
    subparsers.add_parser("clean-demo", help="Xóa sạch các tài khoản demo cũ")

    # Command: create-admin
    p_admin = subparsers.add_parser("create-admin", help="Tạo tài khoản admin")
    p_admin.add_argument("--username", required=True, help="Tên đăng nhập")
    p_admin.add_argument("--email", required=True, help="Email")
    p_admin.add_argument("--name", default="Quản Trị Viên", help="Họ tên")
    p_admin.add_argument("--password", required=True, help="Mật khẩu")

    # Command: create-lecturer
    p_lec = subparsers.add_parser("create-lecturer", help="Tạo tài khoản giảng viên")
    p_lec.add_argument("--username", required=True, help="Tên đăng nhập")
    p_lec.add_argument("--email", required=True, help="Email")
    p_lec.add_argument("--name", default="Giảng Viên", help="Họ tên")
    p_lec.add_argument("--password", required=True, help="Mật khẩu")
    p_lec.add_argument("--dept", default="Khoa Công Nghệ Thông Tin", help="Khoa/Bộ môn")

    # Command: set-password
    p_pwd = subparsers.add_parser("set-password", help="Đổi mật khẩu tài khoản")
    p_pwd.add_argument("--user", required=True, help="Username hoặc Email")
    p_pwd.add_argument("--password", required=True, help="Mật khẩu mới")

    args = parser.parse_args()

    if args.command == "list":
        list_accounts()
    elif args.command == "clean-demo":
        clean_demo_accounts()
    elif args.command == "create-admin":
        create_account('admin', args.username, args.email, args.name, args.password)
    elif args.command == "create-lecturer":
        create_account('lecturer', args.username, args.email, args.name, args.password, args.dept)
    elif args.command == "set-password":
        change_account_password(args.user, args.password)
    else:
        interactive_menu()
