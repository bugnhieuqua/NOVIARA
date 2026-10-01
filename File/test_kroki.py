# -*- coding: utf-8 -*-
import urllib.request

code = """@startuml
skinparam actorStyle stickman
actor "Quản trị viên" as Admin
actor "Giảng viên" as Lecturer
actor "Sinh viên" as Student

(UC-01: Đăng nhập hệ thống) as UC1
(UC-02: Phân nhóm tự động) as UC2

Admin --> UC1
Lecturer --> UC1
Lecturer --> UC2
@enduml"""

req = urllib.request.Request(
    'https://kroki.io/plantuml/png',
    data=code.encode('utf-8'),
    headers={'Content-Type': 'text/plain; charset=utf-8', 'User-Agent': 'Mozilla/5.0'}
)
try:
    with urllib.request.urlopen(req, timeout=12) as resp:
        data = resp.read()
        with open('test_actor.png', 'wb') as f:
            f.write(data)
        print(f"Kroki PlantUML stickman SUCCESS: {len(data)} bytes")
except Exception as e:
    print(f"Error: {e}")
