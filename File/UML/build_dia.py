# -*- coding: utf-8 -*-
"""
Script kết xuất tất cả 9 sơ đồ trực quan (Mermaid to PNG) chất lượng cao:
1. Sơ đồ CSDL: ERD toàn diện 13 thực thể
2. Sơ đồ Tác nhân & Use Case tổng thể
3. Sơ đồ Lớp (Class Diagram)
4 - 9. 6 Sơ đồ Trình tự (Sequence Diagrams) cho các kịch bản cốt lõi
Lưu vào: File/File dữ liệu/images/
"""
import os
import sys
if sys.stdout:
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass
from pathlib import Path
import urllib.request
import base64
import json
import time

out_dir = Path("File/File dữ liệu/images")
out_dir.mkdir(parents=True, exist_ok=True)

DIAGRAMS = {
    # 1. ERD CSDL
    "erd_noviara_csdl": {
        "theme": "neutral",
        "code": """erDiagram
    DEPARTMENTS ||--o{ ACCOUNTS : manages
    DEPARTMENTS ||--o{ CLASSES : offers
    ACCOUNTS ||--o{ CLASSES : lectures
    ACCOUNTS ||--o{ GROUPING_SESSIONS : executes
    CLASSES ||--o{ CLASS_STUDENTS : enrolls
    CLASSES ||--o{ GROUPING_SESSIONS : partitions
    CLASSES ||--o{ SURVEY_SUBMISSIONS : collects
    CLASSES ||--o{ UPLOADED_FILES : stores
    STUDENTS ||--o{ CLASS_STUDENTS : belongs_to
    STUDENTS ||--o{ SURVEY_SUBMISSIONS : submits
    STUDENTS ||--o{ GROUP_MEMBERS : participates
    GROUPING_SESSIONS ||--|| SESSION_CONFIGS : configured_by
    GROUPING_SESSIONS ||--o{ GROUPS : produces
    GROUPS ||--o{ GROUP_MEMBERS : contains
    GROUPS ||--o| GROUP_EXPLANATIONS : explained_by

    DEPARTMENTS {
        varchar id PK
        varchar code
        varchar name
    }
    ACCOUNTS {
        varchar id PK
        varchar username
        varchar password_hash
        varchar name
        varchar role
    }
    CLASSES {
        varchar id PK
        varchar code
        varchar name
        varchar department
        varchar lecturer_id FK
        boolean is_survey_active
        varchar survey_title
    }
    STUDENTS {
        varchar student_id PK
        varchar name
        varchar email
        varchar phone
        varchar gender
        real gpa
        varchar primary_skill
        varchar disc_dominant
        boolean is_leader_candidate
    }
    CLASS_STUDENTS {
        int id PK
        varchar class_id FK
        varchar student_id FK
        real gpa
        real skill_frontend
        real skill_backend
        real skill_database
        varchar source
    }
    SURVEY_SUBMISSIONS {
        varchar id PK
        varchar class_id FK
        varchar student_id FK
        real gpa
        varchar primary_skill
        varchar disc_dominant
        boolean is_leader_candidate
        datetime submitted_at
    }
    GROUPING_SESSIONS {
        varchar id PK
        varchar class_id FK
        varchar title
        varchar status
        int total_students
        real overall_fitness
        int execution_time_ms
    }
    SESSION_CONFIGS {
        varchar session_id PK
        int target_group_count
        int min_members
        int max_members
        real weight_skill_balance
        real weight_disc_diversity
        real weight_gpa_balance
        boolean require_leader
    }
    GROUPS {
        varchar id PK
        varchar session_id FK
        int group_number
        varchar name
        varchar leader_id FK
        real avg_gpa
        real compatibility_score
    }
    GROUP_MEMBERS {
        int id PK
        varchar group_id FK
        varchar student_id FK
        boolean is_leader
        varchar assigned_role
    }
    GROUP_EXPLANATIONS {
        int id PK
        varchar group_id FK
        text summary
        text leadership_analysis
        text disc_synergy
        text ai_pedagogical_advice
    }
    UPLOADED_FILES {
        varchar id PK
        varchar filename
        int file_size
        int total_records
        varchar class_id FK
    }
"""
    },

    # 2. Sơ đồ Tác nhân & Use Case
    "usecase_actors_diagram": {
        "theme": "neutral",
        "code": """flowchart TD
    subgraph Actors [Cac Tac Nhan He Thong]
        Admin((Quan tri vien))
        Lecturer((Giang vien))
        Student((Sinh vien))
        Guest((Khach vang lai))
        GAEngine((Loi GA))
        GeminiAI((Gemini AI))
    end

    subgraph Sub1 [Phan he 1: Xac thuc va Quan tri]
        UC01([UC-01: Dang nhap va Doi MK])
        UC02([UC-02: Quan ly tai khoan])
    end

    subgraph Sub2 [Phan he 2: Quan ly Lop va Khao sat]
        UC03([UC-03: Quan ly Lop hoc])
        UC04([UC-04: Dong Mo cong khao sat])
        UC05([UC-05: Lam bai khao sat DISC])
    end

    subgraph Sub3 [Phan he 3: Nhap lieu Sinh vien]
        UC06([UC-06: Nap file Excel CSV])
        UC07([UC-07: Quan ly tep nap va Radar])
    end

    subgraph Sub4 [Phan he 4: Thuat toan Phan nhom GA]
        UC08([UC-08: Cau hinh trong so GA])
        UC09([UC-09: Thuc thi phan nhom GA])
    end

    subgraph Sub5 [Phan he 5: Tinh chinh va Quan ly Nhom]
        UC10([UC-10: Doi Truong nhom va Hoan doi])
        UC11([UC-11: Sinh giai thich Gemini AI])
    end

    subgraph Sub6 [Phan he 6: Cong bo va Tra cuu]
        UC12([UC-12: Cong bo ket qua SSE])
        UC13([UC-13: Sinh vien tra cuu nhom])
    end

    Admin --> UC01
    Admin --> UC02
    Lecturer --> UC01
    Lecturer --> UC03
    Lecturer --> UC04
    Lecturer --> UC06
    Lecturer --> UC07
    Lecturer --> UC08
    Lecturer --> UC09
    Lecturer --> UC10
    Lecturer --> UC11
    Lecturer --> UC12

    Student --> UC05
    Student --> UC13
    Guest --> UC05

    UC09 -.-> GAEngine
    UC11 -.-> GeminiAI
"""
    },

    # 3. Sơ đồ Lớp
    "class_diagram_noviara": {
        "theme": "neutral",
        "code": """classDiagram
    class Account {
        -string id
        -string username
        -string password_hash
        -string role
        -bool must_change_password
        +verify_password(plain) bool
        +change_password(new_pwd) void
    }
    class ClassModel {
        -string id
        -string code
        -string name
        -bool is_survey_active
        +toggle_survey(status) void
        +get_student_count() int
    }
    class Student {
        -string student_id
        -string name
        -float gpa
        -string primary_skill
        -string disc_dominant
        -bool is_leader_candidate
        +calculate_radar() dict
    }
    class ClassStudent {
        -int id
        -string class_id
        -string student_id
        -float gpa
        -float skill_frontend
        -float skill_backend
    }
    class GroupingSession {
        -string id
        -string class_id
        -string status
        -float overall_fitness
        +publish() void
        +export_excel() bytes
    }
    class SessionConfig {
        -string session_id
        -int target_group_count
        -int min_members
        -float weight_skill
        +validate() bool
    }
    class GroupModel {
        -string id
        -string session_id
        -int group_number
        -string leader_id
        -float avg_gpa
        +assign_leader(id) void
    }
    class GroupMember {
        -int id
        -string group_id
        -string student_id
        -bool is_leader
    }
    class GroupExplanation {
        -int id
        -string group_id
        -string summary
        -string ai_advice
    }
    class UploadedFile {
        -string id
        -string filename
        -int file_size
        -string class_id
    }
    class GeneticAlgorithmService {
        -int population_size
        -int generations
        +run() dict
    }
    class AIService {
        -string model_name
        +generate_explanation() dict
    }

    Account --> ClassModel : manages
    Account --> GroupingSession : executes
    ClassModel *-- ClassStudent : enrolls
    Student -- ClassStudent : registers
    ClassModel --> GroupingSession : partitions
    GroupingSession *-- SessionConfig : configures
    GroupingSession *-- GroupModel : produces
    GroupModel *-- GroupMember : contains
    Student -- GroupMember : assigns
    GroupModel *-- GroupExplanation : explained_by
    ClassModel --> UploadedFile : stores
    GroupingSession ..> GeneticAlgorithmService : invokes
    GroupExplanation ..> AIService : generated_by
"""
    },

    # 4. Seq 1: Đăng nhập
    "seq_01_auth_login": {
        "theme": "neutral",
        "code": """sequenceDiagram
    autonumber
    actor User as Nguoi dung (Admin/GV)
    participant UI as Frontend UI
    participant Auth as AuthRouter
    participant Sec as SecurityService
    participant DB as SQLite DB (smartgroup.db)

    User->>UI: Nhap Username & Password
    UI->>Auth: POST /api/auth/login
    Auth->>DB: query_by_username(username)
    DB-->>Auth: Record Account (password_hash, must_change_pw)
    Auth->>Sec: verify_password(plain, hash)
    Sec-->>Auth: Mat khau hop le (PBKDF2 Match)
    alt must_change_password == 1
        Auth-->>UI: 200 OK (must_change_password=True)
        UI-->>User: Hien thi Modal yeu cau Doi mat khau moi
        User->>UI: Nhap mat khau moi & Xac nhan
        UI->>Auth: POST /api/auth/change-password
        Auth->>Sec: hash_password(new_pwd)
        Sec-->>Auth: new_password_hash
        Auth->>DB: UPDATE accounts SET password_hash, must_change=0
        DB-->>Auth: Ghi thanh cong
    end
    Auth->>DB: UPDATE accounts SET last_login = NOW()
    Auth-->>UI: 200 OK + User Info & Role
    UI-->>User: Dieu huong vao Dashboard quan tri
"""
    },

    # 5. Seq 2: Nạp Excel
    "seq_02_upload_excel": {
        "theme": "neutral",
        "code": """sequenceDiagram
    autonumber
    actor GV as Giang vien
    participant UI as Frontend UI
    participant Router as StudentsRouter
    participant Parser as ExcelImportService
    participant DB as SQLite DB (smartgroup.db)

    GV->>UI: Keo tha file students_40.xlsx & Chon Lop CLASS-02
    UI->>Router: POST /api/students/upload (file, class_id)
    Router->>DB: INSERT INTO uploaded_files (filename, size, BLOB)
    DB-->>Router: Luu thanh cong (file_id)
    Router->>Parser: parse_excel_sheets(content)
    Parser-->>Router: Danh sach 40 ho so sinh vien (MSSV, GPA, DISC)
    Router->>DB: UPSERT INTO students (40 sinh vien)
    Router->>DB: INSERT INTO class_students (class_id, student_id, skills)
    Router->>DB: UPDATE uploaded_files SET total_records = 40
    DB-->>Router: Cap nhat thanh cong
    Router-->>UI: 200 OK (count: 40, file_id)
    UI-->>GV: Hien thi bang sinh vien cap nhat tuc thi (khong reload)
"""
    },

    # 6. Seq 3: Khảo sát DISC
    "seq_03_disc_survey": {
        "theme": "neutral",
        "code": """sequenceDiagram
    autonumber
    actor SV as Sinh vien
    participant UI as Frontend UI (Survey Portal)
    participant ClassR as ClassesRouter
    participant SurveyR as SurveysRouter
    participant DB as SQLite DB (smartgroup.db)

    SV->>UI: Mo /survey?class_id=CLASS-01
    UI->>ClassR: GET /api/classes/CLASS-01/survey-status
    ClassR->>DB: SELECT is_survey_active FROM classes
    DB-->>ClassR: is_survey_active = 1
    ClassR-->>UI: Cong khao sat dang mo
    SV->>UI: Tra loi 12 cau DISC, danh gia 10 ky nang & Leader
    SV->>UI: Nhan "Hoan thanh & Gui khao sat"
    UI->>SurveyR: POST /api/surveys/submit (answers_json, skills)
    SurveyR->>SurveyR: calculate_disc_scores(D, I, S, C)
    SurveyR->>DB: INSERT INTO survey_submissions
    SurveyR->>DB: UPSERT INTO students (cap nhat DISC & Radar)
    DB-->>SurveyR: Luu thanh cong
    SurveyR-->>UI: 201 Created + Profile ket qua
    UI-->>SV: Hien thi Radar bieu do tam ly DISC ca nhan
"""
    },

    # 7. Seq 4: GA Pipeline
    "seq_04_ga_pipeline": {
        "theme": "neutral",
        "code": """sequenceDiagram
    autonumber
    actor GV as Giang vien
    participant UI as Grouping Wizard
    participant Router as SessionsRouter
    participant GA as GeneticAlgorithmService
    participant DB as SQLite DB (smartgroup.db)

    GV->>UI: Cai dat K=4 nhom, Chon trong so Fitness & Bam Chay GA
    UI->>Router: POST /api/sessions/run-ga (params, weights)
    Router->>DB: SELECT students FROM class_students WHERE class_id='CLASS-01'
    DB-->>Router: 60 sinh vien kem diem ky thuat
    Router->>GA: run(students, config)
    GA->>GA: Khoi tao quan the 80 ca the
    loop 120 the he (Generations)
        GA->>GA: Tinh Fitness da muc tieu
        GA->>GA: Chon loc Tournament & Lai ghep PMX
        GA->>GA: Dot bien Swap & Bao ton Elitism
    end
    GA-->>Router: Best Chromosome & Lich su hoi tu Fitness
    Router->>DB: INSERT INTO grouping_sessions, session_configs
    Router->>DB: INSERT INTO groups, group_members (status='draft')
    DB-->>Router: Luu tru thanh cong
    Router-->>UI: 200 OK + Danh sach nhom toi uu
    UI-->>GV: Hien thi Kanban Nhom va Do thi duong cong hoi tu
"""
    },

    # 8. Seq 5: Đổi Leader
    "seq_05_leader_adjustment": {
        "theme": "neutral",
        "code": """sequenceDiagram
    autonumber
    actor GV as Giang vien
    participant UI as Results Kanban
    participant Router as SessionsRouter
    participant DB as SQLite DB (smartgroup.db)

    GV->>UI: Nhan bieu tuong Vuong mien cua SV B (Nhom 1)
    UI->>Router: PATCH /api/sessions/{sid}/groups/{gid}/leader (new_leader_id)
    Router->>DB: UPDATE groups SET leader_id = 'SV002' WHERE id = gid
    Router->>DB: UPDATE group_members SET is_leader = 0 WHERE is_leader = 1
    Router->>DB: UPDATE group_members SET is_leader = 1 WHERE student_id = 'SV002'
    Router->>DB: UPDATE grouping_sessions SET updated_at = NOW()
    DB-->>Router: Ghi nhan thanh cong
    Router-->>UI: 200 OK (success: true)
    UI-->>GV: Huy hieu Truong nhom tuc thi chuyen sang SV B (duoi 50ms)
"""
    },

    # 9. Seq 6: Công bố & Tra cứu
    "seq_06_publish_lookup": {
        "theme": "neutral",
        "code": """sequenceDiagram
    autonumber
    actor GV as Giang vien
    actor SV as Sinh vien
    participant UI as Frontend UI
    participant Router as SessionsRouter
    participant SurveyR as SurveysRouter
    participant DB as SQLite DB (smartgroup.db)

    GV->>UI: Nhan "Cong Bo Ket Qua"
    UI->>Router: PATCH /api/sessions/{sid}/publish
    Router->>DB: UPDATE grouping_sessions SET status = 'published'
    DB-->>Router: Cap nhat thanh cong
    Router-->>UI: 200 OK (status: published)
    Note over SV, UI: Sinh vien tra cuu nhom tren cong cong khai
    SV->>UI: Truy cap /lookup & Nhap MSSV 'SV005'
    UI->>SurveyR: GET /api/surveys/lookup/SV005
    SurveyR->>DB: SELECT group info WHERE student_id='SV005' AND status='published'
    DB-->>SurveyR: Record Nhom 2, De tai, Truong nhom, Ban cung nhom
    SurveyR-->>UI: 200 OK + The nhom day du
    UI-->>SV: Hien thi The Nhom va Danh sach Dong doi
"""
    }
}

def generate_all():
    print(f"Bat dau ket xuat {len(DIAGRAMS)} so do...")
    for idx, (name, config) in enumerate(DIAGRAMS.items(), 1):
        target_path = out_dir / f"{name}.png"
        print(f"[{idx}/{len(DIAGRAMS)}] Dang ket xuat: {name}...", end=" ")
        try:
            state = {
                "code": config["code"].strip(),
                "mermaid": {"theme": config.get("theme", "neutral")}
            }
            b64 = base64.b64encode(json.dumps(state).encode("utf-8")).decode("ascii")
            url = "https://mermaid.ink/img/" + b64
            req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=25) as resp:
                data = resp.read()
                with open(target_path, "wb") as f:
                    f.write(data)
            print(f"THANH CONG ({len(data):,} bytes)")
            time.sleep(0.5)
        except Exception as e:
            print(f"LOI: {e}")

if __name__ == "__main__":
    generate_all()
