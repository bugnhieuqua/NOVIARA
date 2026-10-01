# -*- coding: utf-8 -*-
import sys
if sys.stdout: sys.stdout.reconfigure(encoding='utf-8')
import urllib.request
from pathlib import Path
from PIL import Image

puml_balanced = """@startuml
skinparam actorStyle stickman
skinparam packageStyle rectangle
skinparam roundcorner 12
skinparam shadowing false
skinparam defaultFontName Arial
skinparam defaultFontSize 11

skinparam actor {
    BackgroundColor #FEF3C7
    BorderColor #B45309
    FontColor #0F172A
    FontStyle bold
}

skinparam usecase {
    BackgroundColor #EEF2FF
    BorderColor #4F46E5
    FontColor #0F172A
}

skinparam rectangle {
    BackgroundColor #F8FAFC
    BorderColor #64748B
    FontColor #0F172A
    FontStyle bold
}

left to right direction

actor "Quản trị viên\\n(Admin)" as Admin
actor "Giảng viên\\n(Lecturer)" as Lecturer
actor "Sinh viên\\n(Student)" as Student
actor "Khách vãng lai\\n(Guest)" as Guest

rectangle "Hệ Thống Phân Nhóm Tự Động NOVIARA" {
    
    package "Phân hệ 1: Xác Thực & Quản Trị" {
        usecase "UC-01: Đăng nhập PBKDF2" as UC01
        usecase "UC-02: Đổi MK bắt buộc" as UC02
        usecase "UC-03: Quản trị tài khoản" as UC03
    }

    package "Phân hệ 2: Quản Lý Lớp & Khảo Sát" {
        usecase "UC-04: Quản lý lớp học" as UC04
        usecase "UC-05: Đóng / Mở khảo sát" as UC05
        usecase "UC-06: Làm khảo sát DISC" as UC06
        usecase "UC-07: Xem tiến độ nộp bài" as UC07
    }

    package "Phân hệ 3: Nhập Liệu Sinh Viên" {
        usecase "UC-08: Nạp danh sách Excel" as UC08
        usecase "UC-09: Quản lý tệp nạp BLOB" as UC09
        usecase "UC-10: Hồ sơ SV & Radar" as UC10
    }

    package "Phân hệ 4: Phân Nhóm Di Truyền GA" {
        usecase "UC-11: Cấu hình trọng số GA" as UC11
        usecase "UC-12: Thực thi phân nhóm GA" as UC12
        usecase "UC-13: Giám sát hội tụ GA" as UC13
    }

    package "Phân hệ 5: Tinh Chỉnh Nhóm & AI" {
        usecase "UC-14: Bổ nhiệm Trưởng nhóm" as UC14
        usecase "UC-15: Hoán đổi thành viên" as UC15
        usecase "UC-16: Phân tích Gemini AI" as UC16
    }

    package "Phân hệ 6: Công Bố & Tra Cứu" {
        usecase "UC-17: Công bố kết quả SSE" as UC17
        usecase "UC-18: Tra cứu theo MSSV" as UC18
    }

    UC01 ..> UC02 : <<include>>
    UC12 ..> UC11 : <<include>>
    UC12 ..> GA : <<include>>
    UC16 ..> AI : <<include>>
}

actor "Lõi GA Engine\\n<<Service>>" as GA
actor "Gemini AI\\n<<Service>>" as AI

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
@enduml
"""

out_file = Path("File/File dữ liệu/images/usecase_actors_diagram.png")
req = urllib.request.Request(
    'https://kroki.io/plantuml/png',
    data=puml_balanced.encode('utf-8'),
    headers={'Content-Type': 'text/plain; charset=utf-8', 'User-Agent': 'Mozilla/5.0'}
)

with urllib.request.urlopen(req, timeout=25) as resp:
    data = resp.read()
    with open(out_file, 'wb') as f:
        f.write(data)

im = Image.open(out_file)
print(f"Ket xuat thanh cong! Kich thuoc: {im.size} (Width x Height), Dung luong: {len(data):,} bytes")
