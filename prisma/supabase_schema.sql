-- =============================================================================
-- NOVIARA - SUPABASE & POSTGRESQL FULL SCHEMA SCRIPT
-- =============================================================================
-- Bạn có thể copy toàn bộ script này và dán trực tiếp vào:
-- Supabase Dashboard -> Project của bạn -> SQL Editor -> Run
-- =============================================================================

-- 1. BẢNG KHOA / ĐƠN VỊ ĐÀO TẠO (DEPARTMENTS)
CREATE TABLE IF NOT EXISTS public.departments (
    id VARCHAR(50) PRIMARY KEY,
    code VARCHAR(50),
    name VARCHAR(150) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. BẢNG TÀI KHOẢN QUẢN TRỊ & GIẢNG VIÊN (ACCOUNTS)
CREATE TABLE IF NOT EXISTS public.accounts (
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

-- 3. BẢNG LỚP HỌC PHẦN (CLASSES)
CREATE TABLE IF NOT EXISTS public.classes (
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

-- 4. BẢNG HỒ SƠ SINH VIÊN (STUDENTS)
CREATE TABLE IF NOT EXISTS public.students (
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

-- 5. BẢNG SINH VIÊN THUỘC LỚP & ĐIỂM KỸ THUẬT (CLASS_STUDENTS)
CREATE TABLE IF NOT EXISTS public.class_students (
    id SERIAL PRIMARY KEY,
    class_id VARCHAR(50) NOT NULL,
    student_id VARCHAR(50) NOT NULL,
    gpa DOUBLE PRECISION DEFAULT 3.0 CHECK(gpa >= 0.0 AND gpa <= 4.0),
    skill_frontend DOUBLE PRECISION DEFAULT 3.0,
    skill_backend DOUBLE PRECISION DEFAULT 3.0,
    skill_database DOUBLE PRECISION DEFAULT 3.0,
    skill_uiux DOUBLE PRECISION DEFAULT 3.0,
    skill_mobile DOUBLE PRECISION DEFAULT 3.0,
    skill_devops DOUBLE PRECISION DEFAULT 3.0,
    skill_aiml DOUBLE PRECISION DEFAULT 3.0,
    skill_qa DOUBLE PRECISION DEFAULT 3.0,
    skill_presentation DOUBLE PRECISION DEFAULT 3.0,
    skill_management DOUBLE PRECISION DEFAULT 3.0,
    source VARCHAR(20) DEFAULT 'import_excel',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(class_id, student_id),
    CONSTRAINT fk_class_students_class FOREIGN KEY (class_id) REFERENCES public.classes(id) ON DELETE CASCADE,
    CONSTRAINT fk_class_students_student FOREIGN KEY (student_id) REFERENCES public.students(student_id) ON UPDATE CASCADE
);

-- 6. BẢNG KẾT QUẢ KHẢO SÁT DISC & NĂNG LỰC (SURVEY_SUBMISSIONS)
CREATE TABLE IF NOT EXISTS public.survey_submissions (
    id VARCHAR(50) PRIMARY KEY,
    class_id VARCHAR(50) NOT NULL,
    student_id VARCHAR(50) NOT NULL,
    student_name VARCHAR(100) NOT NULL,
    email VARCHAR(100),
    phone VARCHAR(20),
    gender VARCHAR(10) DEFAULT 'Nam',
    gpa DOUBLE PRECISION DEFAULT 3.0,
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
    CONSTRAINT fk_submissions_class FOREIGN KEY (class_id) REFERENCES public.classes(id) ON DELETE CASCADE,
    CONSTRAINT fk_submissions_student FOREIGN KEY (student_id) REFERENCES public.students(student_id) ON UPDATE CASCADE
);

-- 7. BẢNG PHIÊN PHÂN NHÓM (GROUPING_SESSIONS)
CREATE TABLE IF NOT EXISTS public.grouping_sessions (
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
    CONSTRAINT fk_sessions_class FOREIGN KEY (class_id) REFERENCES public.classes(id) ON DELETE SET NULL,
    CONSTRAINT fk_sessions_lecturer FOREIGN KEY (lecturer_id) REFERENCES public.accounts(id) ON DELETE SET NULL
);

-- 8. BẢNG CẤU HÌNH THAM SỐ PHÂN NHÓM (SESSION_CONFIGS)
CREATE TABLE IF NOT EXISTS public.session_configs (
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
    CONSTRAINT fk_configs_session FOREIGN KEY (session_id) REFERENCES public.grouping_sessions(id) ON DELETE CASCADE
);

-- 9. BẢNG NHÓM SINH VIÊN THÀNH PHẨM (GROUPS)
CREATE TABLE IF NOT EXISTS public.groups (
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
    explanation_json TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_groups_session FOREIGN KEY (session_id) REFERENCES public.grouping_sessions(id) ON DELETE CASCADE
);

-- 10. BẢNG THÀNH VIÊN TRONG NHÓM (GROUP_MEMBERS)
CREATE TABLE IF NOT EXISTS public.group_members (
    id SERIAL PRIMARY KEY,
    group_id VARCHAR(50) NOT NULL,
    student_id VARCHAR(50) NOT NULL,
    is_leader BOOLEAN DEFAULT FALSE,
    assigned_role VARCHAR(50),
    student_snapshot_json TEXT,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(group_id, student_id),
    CONSTRAINT fk_members_group FOREIGN KEY (group_id) REFERENCES public.groups(id) ON DELETE CASCADE
);

-- 11. BẢNG GIẢI THÍCH CHẤT LƯỢNG & AI LECTURER NOTES (GROUP_EXPLANATIONS)
CREATE TABLE IF NOT EXISTS public.group_explanations (
    id SERIAL PRIMARY KEY,
    group_id VARCHAR(50) NOT NULL UNIQUE,
    summary TEXT,
    synergy_highlights_json TEXT,
    potential_risks_json TEXT,
    recommendations_json TEXT,
    leadership_analysis TEXT,
    disc_synergy TEXT,
    skill_coverage_summary TEXT,
    ai_pedagogical_advice TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_explanations_group FOREIGN KEY (group_id) REFERENCES public.groups(id) ON DELETE CASCADE
);

-- 12. BẢNG CẤU HÌNH TOÀN CỤC (SYSTEM_SETTINGS)
CREATE TABLE IF NOT EXISTS public.system_settings (
    key VARCHAR(50) PRIMARY KEY,
    value TEXT NOT NULL,
    description VARCHAR(255),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 13. BẢNG TỆP DỮ LIỆU ĐÃ NẠP (UPLOADED_FILES)
CREATE TABLE IF NOT EXISTS public.uploaded_files (
    id VARCHAR(50) PRIMARY KEY,
    filename VARCHAR(255) NOT NULL,
    file_size INTEGER NOT NULL,
    file_type VARCHAR(50),
    total_records INTEGER DEFAULT 0,
    file_content BYTEA,
    class_id VARCHAR(50),
    uploaded_by VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- CÁC CHỈ MỤC TỐI ƯU HÓA TRUY VẤN
CREATE INDEX IF NOT EXISTS idx_submissions_class ON public.survey_submissions(class_id);
CREATE INDEX IF NOT EXISTS idx_submissions_student ON public.survey_submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_class_students_class ON public.class_students(class_id);
CREATE INDEX IF NOT EXISTS idx_sessions_class ON public.grouping_sessions(class_id);
CREATE INDEX IF NOT EXISTS idx_groups_session ON public.groups(session_id);
CREATE INDEX IF NOT EXISTS idx_members_group ON public.group_members(group_id);
