# -*- coding: utf-8 -*-
import sys
from pathlib import Path

# Đảm bảo import được module backend từ mọi thư mục
ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

import pytest
from fastapi.testclient import TestClient
from backend.main import app
from backend.database import query_all, query_one
from backend.models import init_db

client = TestClient(app)


@pytest.fixture(autouse=True)
def setup_db():
    init_db(seed=False)



def test_database_init_and_tables():
    """Kiểm tra toàn bộ 11 bảng CSDL đã được tạo trong SQLite."""
    tables = query_all("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
    table_names = {t["name"] for t in tables}
    
    expected_tables = {
        "accounts", "classes", "students", "class_students",
        "survey_submissions", "grouping_sessions", "session_configs",
        "groups", "group_members", "group_explanations", "system_settings"
    }
    for expected in expected_tables:
        assert expected in table_names, f"Bảng {expected} chưa được tạo trong CSDL!"


def test_get_all_classes():
    """Kiểm tra API lấy danh sách lớp học và thống kê khảo sát."""
    res = client.get("/api/classes")
    assert res.status_code == 200
    classes = res.json()
    assert isinstance(classes, list)


def test_create_and_toggle_class():
    """Kiểm tra tạo lớp học mới và bật/tắt đợt khảo sát."""
    payload = {
        "code": "TEST-2026",
        "name": "Lớp Kiểm Thử Tự Động K26",
        "semester": "Học kỳ 1",
        "department": "Khoa Công Nghệ Thông Tin",
        "description": "Lớp phục vụ Pytest DB",
        "isSurveyActive": False
    }
    res = client.post("/api/classes", json=payload)
    assert res.status_code == 201
    created = res.json()
    class_id = created["id"]
    assert created["name"] == payload["name"]
    assert created["isSurveyActive"] is False

    # Bật đợt khảo sát
    res_toggle = client.patch(f"/api/classes/{class_id}/survey-status", json={
        "isSurveyActive": True,
        "surveyTitle": "Khảo sát Kỹ năng Test K26"
    })
    assert res_toggle.status_code == 200
    updated = res_toggle.json()
    assert updated["isSurveyActive"] is True
    assert updated["surveyTitle"] == "Khảo sát Kỹ năng Test K26"

    # Dọn dẹp
    client.delete(f"/api/classes/{class_id}")


def test_submit_survey_and_lookup():
    """Kiểm tra sinh viên nộp khảo sát thành công và lưu vào CSDL."""
    # Tạo lớp kiểm thử trước
    c_res = client.post("/api/classes", json={
        "id": "CLASS-TEST-SURVEY",
        "code": "TEST-SURVEY",
        "name": "Lớp Khảo Sát Test",
        "isSurveyActive": True,
        "surveyTitle": "Bảng khảo sát thử nghiệm"
    })
    assert c_res.status_code == 201

    submission_data = {
        "classId": "CLASS-TEST-SURVEY",
        "studentId": "SV999888",
        "studentName": "Đặng Thị Phương Thảo",
        "email": "thao.dtp@NOVIARA.edu.vn",
        "gender": "Nữ",
        "gpa": 3.75,
        "phone": "0988777666",
        "primarySkill": "uiux",
        "secondarySkill": "frontend",
        "isLeaderCandidate": True,
        "disc": {
            "dominant": "I",
            "secondary": "D",
            "scores": {"D": 35, "I": 45, "S": 10, "C": 10}
        },
        "answers": {"1": "I", "2": "D", "3": "I"}
    }
    res = client.post("/api/surveys/submit", json=submission_data)
    assert res.status_code == 201
    data = res.json()
    assert data["success"] is True
    assert data["studentId"] == "SV999888"

    # Kiểm tra CSDL thực tế
    db_record = query_one(
        "SELECT * FROM survey_submissions WHERE class_id = ? AND student_id = ?",
        ("CLASS-TEST-SURVEY", "SV999888")
    )
    assert db_record is not None
    assert db_record["student_name"] == "Đặng Thị Phương Thảo"
    assert db_record["disc_dominant"] == "I"

    # Kiểm tra API tra cứu theo MSSV
    res_lookup = client.get("/api/surveys/lookup/SV999888")
    assert res_lookup.status_code == 200
    lookup_data = res_lookup.json()
    assert lookup_data["student"]["student_id"] == "SV999888"
    assert lookup_data["survey"]["primary_skill"] == "uiux"

    # Dọn dẹp
    client.delete("/api/classes/CLASS-TEST-SURVEY")
    from backend.database import execute_commit
    execute_commit("DELETE FROM students WHERE student_id = 'SV999888'")


def test_survey_closed_rejection():
    """Kiểm tra hệ thống chặn sinh viên nộp bài khi đợt khảo sát bị đóng."""
    # Tạo lớp có isSurveyActive = False
    client.post("/api/classes", json={
        "id": "CLASS-CLOSED-TEST",
        "code": "CLOSED-TEST",
        "name": "Lớp Đóng Khảo Sát",
        "isSurveyActive": False
    })

    payload = {
        "classId": "CLASS-CLOSED-TEST",
        "studentId": "SV000111",
        "studentName": "Trần Thử Nghiệm",
        "primarySkill": "backend",
        "secondarySkill": "database",
        "disc": {
            "dominant": "C",
            "scores": {"D": 10, "I": 10, "S": 20, "C": 60}
        }
    }
    res = client.post("/api/surveys/submit", json=payload)
    assert res.status_code == 403
    assert "tạm đóng" in res.json()["detail"]

    # Dọn dẹp
    client.delete("/api/classes/CLASS-CLOSED-TEST")


def test_uploaded_files_and_students_persistence():
    """Kiểm tra lưu tệp tải lên vào SQLite và đồng bộ danh sách sinh viên bền vững."""
    csv_content = (
        "MSSV,Họ và Tên,Email,Giới Tính,GPA,Kỹ Năng Chính,Kỹ Năng Phụ,DISC,Ứng Viên Leader\n"
        "SV2026TEST01,Nguyễn Văn Test,test1@uni.edu.vn,Nam,3.75,backend,database,D,Có\n"
        "SV2026TEST02,Trần Thị Test,test2@uni.edu.vn,Nữ,3.85,uiux,presentation,I,Không\n"
    ).encode("utf-8")

    files = {"file": ("test_students.csv", csv_content, "text/csv")}
    res = client.post("/api/students/upload", files=files)
    assert res.status_code == 200
    data = res.json()
    assert data["saved_to_db"] is True
    assert len(data["students"]) == 2

    # Kiểm tra tệp đã lưu trong bảng uploaded_files
    file_record = query_one("SELECT * FROM uploaded_files WHERE filename = 'test_students.csv'")
    assert file_record is not None
    assert file_record["total_records"] == 2

    # Kiểm tra API lấy danh sách tệp đã tải lên
    res_files = client.get("/api/students/files")
    assert res_files.status_code == 200
    assert any(f["filename"] == "test_students.csv" for f in res_files.json())

    # Kiểm tra sinh viên đã lưu vào bảng students
    s1 = query_one("SELECT * FROM students WHERE student_id = 'SV2026TEST01'")
    assert s1 is not None
    assert s1["name"] == "Nguyễn Văn Test"
    assert s1["gpa"] == 3.75
    assert s1["disc_dominant"] == "D"
    assert s1["is_leader_candidate"] == 1

    # Dọn dẹp
    from backend.database import execute_commit
    execute_commit("DELETE FROM uploaded_files WHERE filename = 'test_students.csv'")
    execute_commit("DELETE FROM students WHERE student_id IN ('SV2026TEST01', 'SV2026TEST02')")


def test_grouping_sessions_persistence_publish_and_revoke():
    """
    Kiểm tra lưu bền vững phiên phân nhóm, quy trình Công bố (Publish)
    và Thu hồi (Revoke), đảm bảo đúng nguyên tắc:
    - Nhấn Công bố mới được công bố.
    - Nhấn Thu hồi thì không được công bố (sinh viên không thấy).
    - Lần truy cập 2 vẫn còn nguyên dữ liệu từ CSDL.
    """
    session_payload = {
        "id": "GA-TEST-PERSISTENCE",
        "title": "Phiên Phân Nhóm Kiểm Thử Bền Vững",
        "className": "Lớp CNTT-K24 Test",
        "status": "draft",
        "totalStudents": 2,
        "overallFitness": 91.5,
        "executionTimeMs": 150,
        "config": {
            "targetGroupCount": 1,
            "minMembers": 2,
            "maxMembers": 4
        },
        "groups": [
            {
                "id": "GA-TEST-PERSISTENCE-G1",
                "groupNumber": 1,
                "name": "Nhóm Thần Tốc",
                "topic": "Xây dựng AI Agent",
                "leaderId": "SV_PERSIST_01",
                "metrics": {
                    "avgGpa": 3.75,
                    "compatibilityScore": 92
                },
                "explanation": {
                    "summary": "Nhóm hài hòa về năng lực."
                },
                "members": [
                    {
                        "id": "SV_PERSIST_01",
                        "name": "Lê Văn Tiến",
                        "gender": "Nam",
                        "gpa": 3.8,
                        "primarySkill": "backend",
                        "secondarySkill": "database",
                        "isLeaderCandidate": True,
                        "disc": {"dominant": "D", "scores": {"D": 85, "I": 30, "S": 30, "C": 30}},
                        "skills": {"frontend": 3, "backend": 5, "database": 4}
                    },
                    {
                        "id": "SV_PERSIST_02",
                        "name": "Hoàng Thị Mai",
                        "gender": "Nữ",
                        "gpa": 3.7,
                        "primarySkill": "uiux",
                        "secondarySkill": "frontend",
                        "isLeaderCandidate": False,
                        "disc": {"dominant": "I", "scores": {"D": 20, "I": 85, "S": 35, "C": 30}},
                        "skills": {"frontend": 4, "backend": 2, "uiux": 5}
                    }
                ]
            }
        ]
    }

    # 1. Lưu phiên phân nhóm vào CSDL SQLite (bản nháp draft)
    res_save = client.post("/api/sessions", json=session_payload)
    assert res_save.status_code == 201

    # Kiểm tra CSDL đã lưu bền vững (lần truy cập 2)
    res_all = client.get("/api/sessions")
    assert res_all.status_code == 200
    saved_sessions = res_all.json()
    target_session = next((s for s in saved_sessions if s["id"] == "GA-TEST-PERSISTENCE"), None)
    assert target_session is not None
    assert target_session["status"] == "draft"
    assert len(target_session["groups"]) == 1
    assert len(target_session["groups"][0]["members"]) == 2

    # 2. Khi chưa công bố (draft), sinh viên KHÔNG được xem
    res_pub1 = client.get("/api/sessions/published")
    assert res_pub1.status_code == 200
    # Nếu không có phiên nào khác công bố thì phải là None
    if res_pub1.json() is not None:
        assert res_pub1.json()["id"] != "GA-TEST-PERSISTENCE"

    # 3. Giảng viên NHẤN CÔNG BỐ
    res_pub_action = client.patch("/api/sessions/GA-TEST-PERSISTENCE/status", json={"status": "published"})
    assert res_pub_action.status_code == 200
    assert res_pub_action.json()["status"] == "published"

    # Bây giờ sinh viên truy cập CSDL -> THẤY PHIÊN ĐÃ CÔNG BỐ
    res_pub2 = client.get("/api/sessions/published")
    assert res_pub2.status_code == 200
    pub_data = res_pub2.json()
    assert pub_data is not None
    assert pub_data["id"] == "GA-TEST-PERSISTENCE"
    assert pub_data["status"] == "published"
    assert pub_data["groups"][0]["name"] == "Nhóm Thần Tốc"

    # 4. Giảng viên NHẤN THU HỒI
    res_revoke_action = client.patch("/api/sessions/GA-TEST-PERSISTENCE/status", json={"status": "draft"})
    assert res_revoke_action.status_code == 200
    assert res_revoke_action.json()["status"] == "draft"

    # Sau khi thu hồi, sinh viên KHÔNG THỂ XEM PHIÊN NÀY NỮA
    res_pub3 = client.get("/api/sessions/published")
    assert res_pub3.status_code == 200
    if res_pub3.json() is not None:
        assert res_pub3.json()["id"] != "GA-TEST-PERSISTENCE"

    # 5. Dọn dẹp phiên test
    client.delete("/api/sessions/GA-TEST-PERSISTENCE")
    from backend.database import execute_commit
    execute_commit("DELETE FROM students WHERE student_id IN ('SV_PERSIST_01', 'SV_PERSIST_02')")


if __name__ == '__main__':
    pytest.main([__file__, "-v"])


