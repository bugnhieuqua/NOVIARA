import sys
import os
import json

# Add root and backend directory to sys.path
sys.path.insert(0, os.path.abspath('.'))
sys.path.insert(0, os.path.abspath('backend'))

from backend.models import init_db
from fastapi.testclient import TestClient
from backend.main import app

init_db(seed=False)
client = TestClient(app)

print("=== 1. TEST TẠO LỚP HỌC (BẮT BUỘC) ===")
client.delete("/api/classes/CLASS-CNTT-01")
client.delete("/api/sessions/GA-CNTT-SESSION-01")

class_payload = {
    "id": "CLASS-CNTT-01",
    "name": "Lớp Công Nghệ Thông Tin 01",
    "code": "CNTT01",
    "department": "Khoa Công Nghệ Thông Tin",
    "semester": "Học kỳ 1 - 2024-2025",
    "description": "Lớp chuyên ngành CNTT"
}
res = client.post("/api/classes", json=class_payload)
print("Create Class Status:", res.status_code)
assert res.status_code in (200, 201), f"Failed: {res.text}"

print("=== 2. TEST NẠP DỮ LIỆU SINH VIÊN CHO LỚP (NGUỒN 2 HOẶC 3) ===")
students_payload = [
    {
        "id": "SV240001",
        "name": "Nguyễn Văn An",
        "email": "an.nv@edu.vn",
        "phone": "0912345678",
        "gender": "Nam",
        "gpa": 3.75,
        "primarySkill": "backend",
        "secondarySkill": "database",
        "isLeaderCandidate": True,
        "disc": {"dominant": "D", "scores": {"D": 85, "I": 50, "S": 40, "C": 45}},
        "skills": {"frontend": 3, "backend": 5, "database": 4, "uiux": 3, "mobile": 2, "devops": 3, "aiml": 2, "qa": 3, "presentation": 3, "management": 4}
    },
    {
        "id": "SV240002",
        "name": "Trần Thị Bình",
        "email": "binh.tt@edu.vn",
        "phone": "0987654321",
        "gender": "Nữ",
        "gpa": 3.82,
        "primarySkill": "frontend",
        "secondarySkill": "uiux",
        "isLeaderCandidate": False,
        "disc": {"dominant": "I", "scores": {"D": 40, "I": 85, "S": 55, "C": 40}},
        "skills": {"frontend": 5, "backend": 3, "database": 3, "uiux": 5, "mobile": 3, "devops": 2, "aiml": 2, "qa": 3, "presentation": 4, "management": 3}
    },
    {
        "id": "SV240003",
        "name": "Lê Hoàng Cường",
        "email": "cuong.lh@edu.vn",
        "phone": "0933112233",
        "gender": "Nam",
        "gpa": 3.20,
        "primarySkill": "database",
        "secondarySkill": "backend",
        "isLeaderCandidate": False,
        "disc": {"dominant": "S", "scores": {"D": 35, "I": 45, "S": 85, "C": 50}},
        "skills": {"frontend": 2, "backend": 4, "database": 5, "uiux": 2, "mobile": 2, "devops": 3, "aiml": 2, "qa": 3, "presentation": 2, "management": 2}
    },
    {
        "id": "SV240004",
        "name": "Phạm Minh Dung",
        "email": "dung.pm@edu.vn",
        "phone": "0944556677",
        "gender": "Nữ",
        "gpa": 3.50,
        "primarySkill": "qa",
        "secondarySkill": "frontend",
        "isLeaderCandidate": False,
        "disc": {"dominant": "C", "scores": {"D": 45, "I": 40, "S": 50, "C": 88}},
        "skills": {"frontend": 4, "backend": 2, "database": 3, "uiux": 3, "mobile": 2, "devops": 2, "aiml": 2, "qa": 5, "presentation": 3, "management": 3}
    }
]

res_bulk = client.post("/api/students/bulk", json={"students": students_payload, "classId": "CLASS-CNTT-01"})
print("Bulk students status:", res_bulk.status_code, res_bulk.json())
assert res_bulk.status_code == 200

print("=== 3. TEST TRUY VẤN SINH VIÊN THEO LỚP ===")
res_cls_students = client.get("/api/classes/CLASS-CNTT-01/students")
print("Class students count:", len(res_cls_students.json()))
assert len(res_cls_students.json()) >= 4

print("=== 4. TEST TẠO VÀ CÔNG BỐ PHIÊN PHÂN NHÓM THEO LỚP ===")
session_payload = {
    "id": "GA-CNTT-SESSION-01",
    "title": "Phiên phân nhóm Đồ án — Lớp Công Nghệ Thông Tin 01",
    "classId": "CLASS-CNTT-01",
    "className": "Lớp Công Nghệ Thông Tin 01",
    "status": "published",
    "totalStudents": 4,
    "overallFitness": 96.5,
    "executionTimeMs": 120,
    "config": {
        "targetGroupCount": 1,
        "minMembers": 4,
        "maxMembers": 4,
        "fitnessWeights": {"skillBalance": 35, "discDiversity": 25, "gpaBalance": 20, "genderBalance": 10, "constraintSatisfaction": 10},
        "constraints": {"requireLeaderPerGroup": True, "balanceGender": True, "respectPreferences": False, "forceNoPairingClashes": False},
        "gaHyperparameters": {"populationSize": 80, "generations": 100, "crossoverRate": 0.85, "mutationRate": 0.08, "selectionMethod": "tournament", "elitismCount": 4}
    },
    "groups": [
        {
            "id": "GRP-01",
            "name": "Nhóm 1 - Hệ thống AI",
            "topic": "Hệ thống AI Phân tích Dữ liệu",
            "members": students_payload,
            "fitnessScore": 96.5,
            "avgGpa": 3.57,
            "leaderId": "SV240001",
            "leaderName": "Nguyễn Văn An",
            "genderRatio": {"male": 2, "female": 2},
            "discDistribution": {"D": 1, "I": 1, "S": 1, "C": 1},
            "roleAssignments": {"SV240001": "Leader & Backend", "SV240002": "UI/UX & Frontend", "SV240003": "Database", "SV240004": "QA Lead"}
        }
    ]
}

res_save = client.post("/api/sessions", json=session_payload)
print("Save session status:", res_save.status_code)
assert res_save.status_code == 201

print("=== 5. TEST XUẤT VÀ LƯU GOOGLE SHEETS URL VÀO CSDL ===")
res_sheets = client.patch(
    "/api/sessions/GA-CNTT-SESSION-01/sheets-url",
    json={"url": "https://docs.google.com/spreadsheets/d/1TEST_SHEET_ID_CNTT/edit"}
)
print("Save Google Sheets URL status:", res_sheets.status_code, res_sheets.json())
assert res_sheets.status_code == 200

print("=== 6. TEST SINH VIÊN XEM DANH SÁCH LỚP ĐÃ CÔNG BỐ ===")
res_pub_classes = client.get("/api/sessions/published/classes")
pub_classes = res_pub_classes.json()
print("Published classes:", [c["name"] for c in pub_classes])
assert any(c["id"] == "CLASS-CNTT-01" for c in pub_classes), "CLASS-CNTT-01 not in published classes!"

print("=== 7. TEST SINH VIÊN NHẤN VÀO LỚP ĐỂ XEM NHÓM ===")
res_pub_session = client.get("/api/sessions/published?class_id=CLASS-CNTT-01")
pub_session = res_pub_session.json()
print("Loaded published session:", pub_session["title"], "Status:", pub_session["status"], "SheetsUrl:", pub_session.get("googleSheetsUrl"))
assert pub_session["status"] == "published"
assert pub_session["googleSheetsUrl"] == "https://docs.google.com/spreadsheets/d/1TEST_SHEET_ID_CNTT/edit"
assert len(pub_session["groups"]) == 1
assert len(pub_session["groups"][0]["members"]) == 4

print("\n>>> ALL TESTS PASSED SUCCESSFULLY! Chuẩn hóa CSDL và Công bố theo lớp hoàn tất 100%!")

# TỰ ĐỘNG DỌN DẸP DỮ LIỆU TEST ĐỂ CSDL HOÀN TOÀN SẠCH
client.delete("/api/sessions/GA-CNTT-SESSION-01")
client.delete("/api/classes/CLASS-CNTT-01")
from backend.database import execute_commit
execute_commit("DELETE FROM class_students WHERE student_id LIKE ?", ('SV24000%',))
execute_commit("DELETE FROM students WHERE student_id LIKE ?", ('SV24000%',))
print(">>> Cleaned up test data from database! Zero demo data remaining.")
