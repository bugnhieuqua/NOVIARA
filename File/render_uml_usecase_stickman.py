# -*- coding: utf-8 -*-
"""
Script kết xuất Sơ đồ Use Case chuẩn quốc tế UML 2.5 với TÁC NHÂN HÌNH NGƯỜI (Stickman Actors)
Lưu vào: File/File dữ liệu/images/usecase_actors_diagram.png
"""
import sys
if sys.stdout:
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass
import urllib.request
from pathlib import Path

puml_code = """@startuml
skinparam actorStyle stickman
skinparam packageStyle rectangle
skinparam roundcorner 12
skinparam shadowout false
skinparam defaultFontName Arial
skinparam defaultFontSize 11

skinparam actor {
    BackgroundColor #FEF3C7
    BorderColor #B45309
    FontColor #1E293B
    FontStyle bold
}

skinparam usecase {
    BackgroundColor #EEF2FF
    BorderColor #4F46E5
    FontColor #0F172A
    ArrowColor #334155
}

skinparam rectangle {
    BackgroundColor #F8FAFC
    BorderColor #64748B
    FontColor #0F172A
    FontStyle bold
}

left to right direction

' --- DANH MỤC 4 TÁC NHÂN NGƯỜI DÙNG (HUMAN ACTORS - HÌNH NGƯỜI CHUẨN UML) ---
actor "Quản trị viên\\n(System Admin)" as Admin
actor "Giảng viên\\n(Lecturer)" as Lecturer
actor "Sinh viên\\n(Student)" as Student
actor "Khách vãng lai\\n(Guest)" as Guest

' --- HỆ THỐNG BIÊN GIỚI NOVIARA (SYSTEM BOUNDARY) ---
rectangle "Hệ Thống Phân Nhóm Tự Động NOVIARA" {
    
    package "Phân hệ 1: Xác Thực & Quản Trị" {
        usecase "UC-01: Đăng nhập hệ thống\\n(Xác thực PBKDF2)" as UC01
        usecase "UC-02: Bắt buộc đổi\\nmật khẩu khởi tạo" as UC02
        usecase "UC-03: Quản lý tài khoản\\nGiảng viên CRUD" as UC03
    }

    package "Phân hệ 2: Quản Lý Lớp & Khảo Sát" {
        usecase "UC-04: Quản lý lớp học phần" as UC04
        usecase "UC-05: Đóng / Mở cổng\\nkhảo sát trực tuyến" as UC05
        usecase "UC-06: Làm bài trắc nghiệm\\nDISC & Kỹ năng" as UC06
        usecase "UC-07: Xem tiến độ nộp bài" as UC07
    }

    package "Phân hệ 3: Nhập Liệu & Tệp Nạp" {
        usecase "UC-08: Nhập danh sách SV\\ntừ Excel / CSV" as UC08
        usecase "UC-09: Quản lý lịch sử tệp nạp\\n(File Tracking BLOB)" as UC09
        usecase "UC-10: Xem hồ sơ sinh viên\\n& Radar năng lực" as UC10
    }

    package "Phân hệ 4: Phân Nhóm GA Tự Động" {
        usecase "UC-11: Cấu hình tham số\\n& Trọng số Fitness" as UC11
        usecase "UC-12: Thực thi phân nhóm\\ntự động GA" as UC12
        usecase "UC-13: Giám sát đường cong\\nhội tụ Fitness" as UC13
    }

    package "Phân hệ 5: Tinh Chỉnh Nhóm & AI" {
        usecase "UC-14: Bổ nhiệm & Đổi\\nTrưởng nhóm (Leader)" as UC14
        usecase "UC-15: Hoán đổi thành viên\\nthủ công giữa các nhóm" as UC15
        usecase "UC-16: Tham vấn Trợ lý\\nSư phạm Gemini AI" as UC16
    }

    package "Phân hệ 6: Công Bố & Tra Cứu" {
        usecase "UC-17: Công bố kết quả\\nphân nhóm qua SSE" as UC17
        usecase "UC-18: Sinh viên tra cứu\\nnhóm theo MSSV" as UC18
    }

    ' Quan hệ Include
    UC01 ..> UC02 : <<include>>
    UC12 ..> UC11 : <<include>>
}

' --- TÁC NHÂN HỆ THỐNG / DỊCH VỤ NGOÀI (EXTERNAL ACTORS) ---
actor "Lõi GA Engine\\n<<Service Engine>>" as GA
actor "Google Gemini AI\\n<<AI Service>>" as AI

' --- MỐI QUAN HỆ TÁC NHÂN -> USE CASE ---
Admin --> UC01
Admin --> UC03

Lecturer --> UC01
Lecturer --> UC04
Lecturer --> UC05
Lecturer --> UC07
Lecturer --> UC08
Lecturer --> UC09
Lecturer --> UC10
Lecturer --> UC12
Lecturer --> UC13
Lecturer --> UC14
Lecturer --> UC15
Lecturer --> UC16
Lecturer --> UC17

Student --> UC06
Student --> UC18

Guest --> UC06

' Tác nhân hệ thống thực thi / hỗ trợ
UC12 --> GA
UC16 --> AI

@enduml
"""

out_file = Path("File/File dữ liệu/images/usecase_actors_diagram.png")
req = urllib.request.Request(
    'https://kroki.io/plantuml/png',
    data=puml_code.encode('utf-8'),
    headers={'Content-Type': 'text/plain; charset=utf-8', 'User-Agent': 'Mozilla/5.0'}
)

print("Dang ket xuat So do Use Case chuan UML voi HINH NGUOI (Stickman Actors)...")
with urllib.request.urlopen(req, timeout=25) as resp:
    data = resp.read()
    with open(out_file, 'wb') as f:
        f.write(data)
    print(f"XUAT BAN THANH CONG: {out_file.resolve()} ({len(data):,} bytes)")
