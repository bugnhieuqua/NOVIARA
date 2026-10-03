# -*- coding: utf-8 -*-
"""
============================================================================
NOVIARA BACKEND - POSTGRESQL DATA MODELS & SCHEMA
============================================================================
Định nghĩa toàn bộ 11 bảng CSDL quan hệ chuẩn PostgreSQL phục vụ:
1. Xác thực tài khoản Admin & Giảng viên (accounts)
2. Quản lý Khoa / Đơn vị (departments)
3. Lớp học phần & Đợt khảo sát (classes, survey_submissions)
4. Hồ sơ năng lực sinh viên & DISC (students, class_students)
5. Phiên phân nhóm & Thuật toán di truyền (grouping_sessions, session_configs)
6. Kết quả nhóm & Giải thích AI (groups, group_members, group_explanations)
7. Cấu hình hệ thống (system_settings)
============================================================================
"""

from backend.database import get_db_connection

DDL_SCHEMA = """
-- 0. BẢNG KHOA / ĐƠN VỊ ĐÀO TẠO (DEPARTMENTS)
CREATE TABLE IF NOT EXISTS departments (
    id VARCHAR(50) PRIMARY KEY,
    code VARCHAR(50),
    name VARCHAR(150) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 1. BẢNG TÀI KHOẢN (ACCOUNTS)
CREATE TABLE IF NOT EXISTS accounts (
    id VARCHAR(50) PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    phone VARCHAR(20),
    department VARCHAR(150),
    role VARCHAR(20) NOT NULL CHECK(role IN ('admin', 'lecturer')),
    is_default_password BOOLEAN DEFAULT TRUE,
    must_change_password BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP WITH TIME ZONE
);

-- 2. BẢNG LỚP HỌC PHẦN (CLASSES)
CREATE TABLE IF NOT EXISTS classes (
    id VARCHAR(50) PRIMARY KEY,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(150) NOT NULL,
    semester VARCHAR(50) DEFAULT 'Đại học',
    department VARCHAR(150),
    description TEXT,
    lecturer_id VARCHAR(50) DEFAULT 'GV-DEFAULT',
    is_survey_active BOOLEAN DEFAULT FALSE,
    survey_title VARCHAR(200),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. BẢNG HỒ SƠ SINH VIÊN (STUDENTS)
CREATE TABLE IF NOT EXISTS students (
    student_id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100),
    phone VARCHAR(20),
    gender VARCHAR(10) CHECK(gender IN ('Nam', 'Nữ')),
    gpa DOUBLE PRECISION DEFAULT 3.0,
    primary_skill VARCHAR(50) DEFAULT 'backend',
    secondary_skill VARCHAR(50) DEFAULT 'frontend',
    disc_dominant VARCHAR(10) DEFAULT 'S',
    is_leader_candidate BOOLEAN DEFAULT FALSE,
    profile_json TEXT,
    avatar VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. BẢNG LIÊN KẾT LỚP - SINH VIÊN (CLASS_STUDENTS)
CREATE TABLE IF NOT EXISTS class_students (
    class_id VARCHAR(50) NOT NULL,
    student_id VARCHAR(50) NOT NULL,
    enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (class_id, student_id),
    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(student_id) ON UPDATE CASCADE
);

-- 5. BẢNG PHIẾU KHẢO SÁT NĂNG LỰC & TÍNH CÁCH (SURVEY_SUBMISSIONS)
CREATE TABLE IF NOT EXISTS survey_submissions (
    id VARCHAR(50) PRIMARY KEY,
    class_id VARCHAR(50) NOT NULL,
    student_id VARCHAR(50) NOT NULL,
    student_name VARCHAR(100) NOT NULL,
    gpa DOUBLE PRECISION DEFAULT 3.0,
    gender VARCHAR(10) CHECK(gender IN ('Nam', 'Nữ')),
    primary_skill VARCHAR(50) NOT NULL,
    secondary_skill VARCHAR(50) NOT NULL,
    is_leader_candidate BOOLEAN DEFAULT FALSE,
    disc_d DOUBLE PRECISION NOT NULL,
    disc_i DOUBLE PRECISION NOT NULL,
    disc_s DOUBLE PRECISION NOT NULL,
    disc_c DOUBLE PRECISION NOT NULL,
    disc_dominant VARCHAR(10) NOT NULL,
    disc_secondary VARCHAR(10),
    answers_json TEXT,
    preferred_teammates_json TEXT,
    avoid_teammates_json TEXT,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(class_id, student_id),
    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(student_id) ON UPDATE CASCADE
);

-- 6. BẢNG PHIÊN PHÂN NHÓM (GROUPING_SESSIONS)
CREATE TABLE IF NOT EXISTS grouping_sessions (
    id VARCHAR(50) PRIMARY KEY,
    class_id VARCHAR(50),
    class_name VARCHAR(150),
    lecturer_id VARCHAR(50),
    title VARCHAR(200) NOT NULL,
    status VARCHAR(20) DEFAULT 'draft' CHECK(status IN ('draft', 'running', 'completed', 'published')),
    total_students INTEGER NOT NULL,
    overall_fitness DOUBLE PRECISION DEFAULT 0.0,
    execution_time_ms INTEGER DEFAULT 0,
    convergence_history_json TEXT,
    google_sheets_url VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE,
    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE SET NULL,
    FOREIGN KEY (lecturer_id) REFERENCES accounts(id) ON DELETE SET NULL
);

-- 7. BẢNG CẤU HÌNH THAM SỐ PHÂN NHÓM (SESSION_CONFIGS)
CREATE TABLE IF NOT EXISTS session_configs (
    session_id VARCHAR(50) PRIMARY KEY,
    target_group_count INTEGER NOT NULL,
    min_members INTEGER NOT NULL,
    max_members INTEGER NOT NULL,
    weight_skill_balance DOUBLE PRECISION DEFAULT 35.0,
    weight_disc_diversity DOUBLE PRECISION DEFAULT 25.0,
    weight_gpa_balance DOUBLE PRECISION DEFAULT 20.0,
    weight_gender_balance DOUBLE PRECISION DEFAULT 10.0,
    weight_constraint_satisfaction DOUBLE PRECISION DEFAULT 10.0,
    require_leader BOOLEAN DEFAULT FALSE,
    min_frontend INTEGER DEFAULT 1,
    min_backend INTEGER DEFAULT 1,
    min_design INTEGER DEFAULT 0,
    balance_gender BOOLEAN DEFAULT TRUE,
    max_gpa_spread DOUBLE PRECISION DEFAULT 0.4,
    respect_preferences BOOLEAN DEFAULT TRUE,
    force_no_clashes BOOLEAN DEFAULT TRUE,
    ga_population_size INTEGER DEFAULT 100,
    ga_generations INTEGER DEFAULT 200,
    ga_mutation_rate DOUBLE PRECISION DEFAULT 0.05,
    ga_crossover_rate DOUBLE PRECISION DEFAULT 0.8,
    ga_selection_method VARCHAR(20) DEFAULT 'tournament',
    ga_elitism_count INTEGER DEFAULT 2,
    config_json TEXT,
    FOREIGN KEY (session_id) REFERENCES grouping_sessions(id) ON DELETE CASCADE
);

-- 8. BẢNG NHÓM SINH VIÊN THÀNH PHẨM (GROUPS)
CREATE TABLE IF NOT EXISTS groups (
    id VARCHAR(50) PRIMARY KEY,
    session_id VARCHAR(50) NOT NULL,
    group_number INTEGER NOT NULL,
    name VARCHAR(150) NOT NULL,
    topic VARCHAR(255),
    leader_id VARCHAR(50),
    avg_gpa DOUBLE PRECISION DEFAULT 0.0,
    gpa_variance DOUBLE PRECISION DEFAULT 0.0,
    skill_balance_score DOUBLE PRECISION DEFAULT 0.0,
    disc_diversity_score DOUBLE PRECISION DEFAULT 0.0,
    compatibility_score DOUBLE PRECISION DEFAULT 0.0,
    gender_ratio_male INTEGER DEFAULT 0,
    gender_ratio_female INTEGER DEFAULT 0,
    metrics_json TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES grouping_sessions(id) ON DELETE CASCADE
);

-- 9. BẢNG THÀNH VIÊN TRONG NHÓM (GROUP_MEMBERS)
CREATE TABLE IF NOT EXISTS group_members (
    group_id VARCHAR(50) NOT NULL,
    student_id VARCHAR(50) NOT NULL,
    role_in_group VARCHAR(50) DEFAULT 'member' CHECK(role_in_group IN ('leader', 'member')),
    added_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (group_id, student_id),
    FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(student_id) ON UPDATE CASCADE
);

-- 10. BẢNG GIẢI THÍCH AI CHO NHÓM (GROUP_EXPLANATIONS)
CREATE TABLE IF NOT EXISTS group_explanations (
    group_id VARCHAR(50) PRIMARY KEY,
    explanation_type VARCHAR(20) DEFAULT 'rule_based' CHECK(explanation_type IN ('rule_based', 'ai_enhanced')),
    summary TEXT,
    synergy_highlights_json TEXT,
    potential_risks_json TEXT,
    recommendations_json TEXT,
    leadership_analysis TEXT,
    disc_synergy TEXT,
    skill_coverage_summary TEXT,
    generated_by VARCHAR(50) DEFAULT 'hybrid_engine',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE
);

-- 11. BẢNG CẤU HÌNH HỆ THỐNG TOÀN CỤC (SYSTEM_SETTINGS)
CREATE TABLE IF NOT EXISTS system_settings (
    key VARCHAR(100) PRIMARY KEY,
    value TEXT NOT NULL,
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- CHỈ MỤC TỐI ƯU HÓA TRUY VẤN (INDEXES)
CREATE INDEX IF NOT EXISTS idx_submissions_class ON survey_submissions(class_id);
CREATE INDEX IF NOT EXISTS idx_submissions_student ON survey_submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_class_students_class ON class_students(class_id);
CREATE INDEX IF NOT EXISTS idx_sessions_class ON grouping_sessions(class_id);
CREATE INDEX IF NOT EXISTS idx_groups_session ON groups(session_id);
CREATE INDEX IF NOT EXISTS idx_members_group ON group_members(group_id);
"""


def init_db(seed: bool = True):
    """
    Khởi tạo toàn bộ 11 bảng CSDL PostgreSQL và các chỉ mục (Indexes).
    """
    with get_db_connection() as conn:
        conn.executescript(DDL_SCHEMA)

    if seed:
        seed_initial_data()


def seed_initial_data():
    """Chèn cấu hình hệ thống mặc định (Tuyệt đối KHÔNG sinh tài khoản hay dữ liệu demo)."""
    from backend.constants import DEFAULT_GEMINI_MODEL
    with get_db_connection() as conn:
        conn.execute(f"""
            INSERT INTO system_settings (key, value, description)
            VALUES ('gemini_model', '{DEFAULT_GEMINI_MODEL}', 'Mô hình Gemini AI mặc định')
            ON CONFLICT (key) DO NOTHING;
        """)
        conn.execute("""
            INSERT INTO system_settings (key, value, description)
            VALUES ('max_students_per_session', '120', 'Giới hạn số lượng sinh viên tối đa 1 phiên')
            ON CONFLICT (key) DO NOTHING;
        """)
