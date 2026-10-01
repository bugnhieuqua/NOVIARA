import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

import pytest
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)


@pytest.fixture(autouse=True)
def setup_test_class():
    """Tự động chuẩn bị lớp học test cô lập cho kiểm thử và dọn dẹp sạch sau khi test."""
    from backend.database import execute_commit, query_one
    cls = query_one("SELECT id FROM classes WHERE id = 'CLASS-TEST'")
    if not cls:
        execute_commit("""
            INSERT INTO classes (id, code, name, semester, department, lecturer_id)
            VALUES ('CLASS-TEST', 'CNTT-K24', 'Lớp Kiểm Thử', 'HK1-2026', 'CNTT', 'ADMIN-MASTER')
            ON CONFLICT (id) DO NOTHING
        """)
    yield
    execute_commit("DELETE FROM class_students WHERE class_id = 'CLASS-TEST'")
    execute_commit("DELETE FROM uploaded_files WHERE class_id = 'CLASS-TEST'")
    execute_commit("DELETE FROM students WHERE student_id LIKE ? OR student_id LIKE ?", ('SV2024%', 'SV00%'))
    execute_commit("DELETE FROM classes WHERE id = 'CLASS-TEST'")


SAMPLE_STUDENTS = [
    {
        "id": "SV2024001",
        "name": "Nguyễn Văn An",
        "email": "an.nv@uni.edu.vn",
        "gender": "Nam",
        "gpa": 3.7,
        "classId": "CNTT-K24",
        "skills": {
            "frontend": 4.5, "backend": 3.0, "database": 4.0, "uiux": 3.5,
            "mobile": 2.0, "devops": 2.0, "aiml": 2.0, "qa": 3.0,
            "presentation": 4.0, "management": 4.5
        },
        "primarySkill": "frontend",
        "secondarySkill": "database",
        "disc": {
            "dominant": "D",
            "scores": {"D": 75, "I": 60, "S": 40, "C": 55}
        },
        "isLeaderCandidate": True,
        "preferredTeammates": [],
        "avoidTeammates": []
    },
    {
        "id": "SV2024002",
        "name": "Trần Thị Bình",
        "email": "binh.tt@uni.edu.vn",
        "gender": "Nữ",
        "gpa": 3.8,
        "classId": "CNTT-K24",
        "skills": {
            "frontend": 3.0, "backend": 4.5, "database": 4.5, "uiux": 2.5,
            "mobile": 2.0, "devops": 3.0, "aiml": 2.0, "qa": 3.5,
            "presentation": 3.5, "management": 3.0
        },
        "primarySkill": "backend",
        "secondarySkill": "database",
        "disc": {
            "dominant": "C",
            "scores": {"D": 40, "I": 50, "S": 70, "C": 80}
        },
        "isLeaderCandidate": False,
        "preferredTeammates": [],
        "avoidTeammates": []
    },
    {
        "id": "SV2024003",
        "name": "Lê Hoàng Cường",
        "email": "cuong.lh@uni.edu.vn",
        "gender": "Nam",
        "gpa": 3.2,
        "classId": "CNTT-K24",
        "skills": {
            "frontend": 3.5, "backend": 3.0, "database": 3.0, "uiux": 4.5,
            "mobile": 3.0, "devops": 2.0, "aiml": 2.0, "qa": 3.0,
            "presentation": 4.5, "management": 3.0
        },
        "primarySkill": "uiux",
        "secondarySkill": "frontend",
        "disc": {
            "dominant": "I",
            "scores": {"D": 50, "I": 85, "S": 55, "C": 40}
        },
        "isLeaderCandidate": False,
        "preferredTeammates": [],
        "avoidTeammates": []
    },
    {
        "id": "SV2024004",
        "name": "Phạm Minh Đức",
        "email": "duc.pm@uni.edu.vn",
        "gender": "Nam",
        "gpa": 3.4,
        "classId": "CNTT-K24",
        "skills": {
            "frontend": 3.0, "backend": 4.0, "database": 4.0, "uiux": 2.0,
            "mobile": 4.0, "devops": 4.0, "aiml": 3.0, "qa": 3.0,
            "presentation": 3.0, "management": 3.5
        },
        "primarySkill": "devops",
        "secondarySkill": "backend",
        "disc": {
            "dominant": "S",
            "scores": {"D": 45, "I": 50, "S": 75, "C": 60}
        },
        "isLeaderCandidate": True,
        "preferredTeammates": [],
        "avoidTeammates": []
    }
]

SAMPLE_CONFIG = {
    "targetGroupCount": 2,
    "minMembers": 2,
    "maxMembers": 2,
    "fitnessWeights": {
        "skillBalance": 35.0,
        "discDiversity": 25.0,
        "gpaBalance": 20.0,
        "genderBalance": 10.0,
        "constraintSatisfaction": 10.0
    },
    "constraints": {
        "requireLeaderPerGroup": False,
        "minFrontendPerGroup": 1,
        "minBackendPerGroup": 1,
        "minDesignPerGroup": 0,
        "balanceGender": True,
        "maxGpaSpread": 0.5,
        "respectPreferences": True,
        "forceNoPairingClashes": True
    },
    "gaHyperparameters": {
        "populationSize": 20,
        "generations": 10,
        "mutationRate": 0.05,
        "crossoverRate": 0.8,
        "elitismRate": 0.1,
        "tournamentSize": 3
    },
    "requiredSkills": ["frontend", "backend", "database"]
}


def test_health():
    res = client.get("/api/health")
    assert res.status_code == 200
    assert res.json()["status"] == "ok"


def test_ga_sync():
    payload = {
        "students": SAMPLE_STUDENTS,
        "config": SAMPLE_CONFIG,
        "sessionTitle": "Test GA Session"
    }
    res = client.post("/api/ga/run", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert "groups" in data
    assert len(data["groups"]) == 2
    assert "overallFitness" in data
    assert len(data["convergenceHistory"]) > 0


def test_explain_group():
    payload = {
        "groupNumber": 1,
        "groupName": "Nhóm 1: Alpha Squad",
        "members": SAMPLE_STUDENTS[:2],
        "topic": "Xây dựng cổng thông tin sinh viên",
        "mode": "rule"
    }
    res = client.post("/api/ai/explain-group", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert "summary" in data
    assert "synergyHighlights" in data
    assert "potentialRisks" in data
    assert "recommendations" in data


def test_benchmark_compare():
    payload = {
        "students": SAMPLE_STUDENTS,
        "config": SAMPLE_CONFIG
    }
    res = client.post("/api/benchmark/compare", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert "results" in data
    assert "ga" in data["results"]
    assert "greedy" in data["results"]
    assert "random" in data["results"]


def test_student_template():
    res = client.get("/api/students/template")
    assert res.status_code == 200
    assert res.headers["content-type"] == "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"


def test_system_status():
    res = client.get("/api/system/status")
    assert res.status_code == 200
    assert res.json()["status"] == "online"


def test_upload_csv():
    csv_content = """MSSV,Họ và tên,Giới tính,GPA,Lớp,DISC,Là Leader
SV2024101,Nguyễn Văn Hoàng,Nam,3.5,CNTT-K24,D,Có
SV2024102,Lê Thị Mai,Nữ,3.8,CNTT-K24,I,Không
SV2024103,Trần Quốc Bảo,Nam,3.1,CNTT-K24,S,Không
SV2024104,Phạm Thu Hà,Nữ,3.9,CNTT-K24,C,Có"""
    
    files = {
        "file": ("students_test.csv", csv_content.encode("utf-8-sig"), "text/csv")
    }
    res = client.post("/api/students/upload", files=files)
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["totalCount"] == 4
    assert len(data["students"]) == 4
    assert data["students"][0]["id"] == "SV2024101"
    assert data["students"][0]["isLeaderCandidate"] is True


def test_upload_excel():
    import io
    import pandas as pd
    
    df = pd.DataFrame([
        {"MSSV": "SV001", "Họ và tên": "Đỗ Hoàng Long", "Giới tính": "Nam", "GPA": 3.6, "Lập trình": 4.5, "CSDL": 4.0, "Web": 3.8, "DISC": "D", "Là Leader": "Có"},
        {"MSSV": "SV002", "Họ và tên": "Vũ Minh Anh", "Giới tính": "Nữ", "GPA": 3.7, "Lập trình": 3.5, "CSDL": 4.5, "Web": 4.2, "DISC": "I", "Là Leader": "Không"}
    ])
    
    buf = io.BytesIO()
    with pd.ExcelWriter(buf, engine='openpyxl') as writer:
        df.to_excel(writer, sheet_name='Sheet1', index=False)
        
    files = {
        "file": ("test_students.xlsx", buf.getvalue(), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    }
    res = client.post("/api/students/upload", files=files)
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["totalCount"] == 2
    assert data["students"][0]["name"] == "Đỗ Hoàng Long"
    assert data["students"][0]["isLeaderCandidate"] is True


def test_import_gsheet_invalid_url():
    # Kiểm tra validation khi URL rỗng hoặc không đúng định dạng
    res = client.post("/api/students/import-gsheet", json={"url": ""})
    assert res.status_code == 400
    assert "cung cấp đường link" in res.json()["detail"]

    res2 = client.post("/api/students/import-gsheet", json={"url": "https://example.com/not-a-sheet"})
    assert res2.status_code == 400
    assert "Không tìm thấy ID bảng tính" in res2.json()["detail"]


if __name__ == '__main__':
    pytest.main([__file__, "-v"])

