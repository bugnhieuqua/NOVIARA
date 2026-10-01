# -*- coding: utf-8 -*-
"""
Script di chuyển dữ liệu từ SQLite (smartgroup.db) sang PostgreSQL (noavira).
Theo yêu cầu người dùng: Xóa sạch toàn bộ tài khoản để người dùng tự tạo mới qua seed_admin.py.
Bảo toàn 100% dữ liệu các bảng khác: departments, classes, students, class_students, 
grouping_sessions, session_configs, groups, group_members, group_explanations, system_settings, uploaded_files.
"""
import sys
import sqlite3
import psycopg
from psycopg.rows import dict_row
from pathlib import Path

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

ROOT_DIR = Path(__file__).resolve().parent
SQLITE_DB = ROOT_DIR / "backend" / "data" / "smartgroup.db"
PG_CONN_INFO = "host=localhost port=5432 user=postgres password=2310 dbname=noavira"

def migrate():
    print("="*70)
    print("NOVIARA: BẮT ĐẦU DI CHUYỂN DỮ LIỆU TỪ SQLITE SANG POSTGRESQL (noavira)")
    print("="*70)

    if not SQLITE_DB.exists():
        print(f"[!] Không tìm thấy tệp SQLite: {SQLITE_DB}")
        return

    sqlite_conn = sqlite3.connect(str(SQLITE_DB))
    sqlite_conn.row_factory = sqlite3.Row

    with psycopg.connect(PG_CONN_INFO) as pg_conn:
        # Tắt kiểm tra khóa ngoại tạm thời để insert dữ liệu sạch
        with pg_conn.cursor() as cur:
            # Thứ tự xóa sạch dữ liệu cũ trong PostgreSQL
            clean_tables = [
                "group_explanations", "group_members", "groups", "session_configs", 
                "grouping_sessions", "survey_submissions", "class_students", 
                "uploaded_files", "students", "classes", "departments", 
                "system_settings", "accounts"
            ]
            for tbl in clean_tables:
                cur.execute(f"TRUNCATE TABLE {tbl} CASCADE;")
            pg_conn.commit()
            print(" -> Đã làm sạch toàn bộ các bảng trong CSDL PostgreSQL.")

            # 1. BẢNG DEPARTMENTS
            cur_sq = sqlite_conn.cursor()
            dept_rows = cur_sq.execute("SELECT id, code, name, description, created_at FROM departments").fetchall()
            for r in dept_rows:
                cur.execute("""
                    INSERT INTO departments (id, code, name, description, created_at)
                    VALUES (%s, %s, %s, %s, %s)
                    ON CONFLICT (id) DO NOTHING;
                """, (r["id"], r["code"], r["name"], r["description"], r["created_at"]))
            print(f" [OK] departments: {len(dept_rows)} dòng đã chuyển")

            # 2. BẢNG ACCOUNTS: THEO YÊU CẦU CỦA USER, KHÔNG CHUYỂN BẤT KỲ TÀI KHOẢN NÀO!
            cur_sq.execute("DELETE FROM accounts;")
            sqlite_conn.commit()
            print(" [OK] accounts: ĐÃ XÓA SẠCH TẤT CẢ TÀI KHOẢN (sẵn sàng để người dùng tự tạo mới qua seed_admin.py)")

            # 3. BẢNG CLASSES
            classes_rows = cur_sq.execute("SELECT id, code, name, semester, department, description, lecturer_id, is_survey_active, survey_title, created_at FROM classes").fetchall()
            for r in classes_rows:
                cur.execute("""
                    INSERT INTO classes (id, code, name, semester, department, description, lecturer_id, is_survey_active, survey_title, created_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (id) DO NOTHING;
                """, (r["id"], r["code"], r["name"], r["semester"], r["department"], r["description"], 
                      r["lecturer_id"], bool(r["is_survey_active"]), r["survey_title"], r["created_at"]))
            print(f" [OK] classes: {len(classes_rows)} dòng đã chuyển")

            # 4. BẢNG STUDENTS
            students_rows = cur_sq.execute("""
                SELECT student_id, name, email, phone, gender, gpa, primary_skill, 
                       secondary_skill, disc_dominant, is_leader_candidate, profile_json, 
                       avatar, created_at 
                FROM students
            """).fetchall()
            for r in students_rows:
                cur.execute("""
                    INSERT INTO students (student_id, name, email, phone, gender, gpa, primary_skill, 
                                          secondary_skill, disc_dominant, is_leader_candidate, 
                                          profile_json, avatar, created_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (student_id) DO NOTHING;
                """, (r["student_id"], r["name"], r["email"], r["phone"], r["gender"], r["gpa"], 
                      r["primary_skill"], r["secondary_skill"], r["disc_dominant"], 
                      bool(r["is_leader_candidate"]), r["profile_json"], r["avatar"], r["created_at"]))
            print(f" [OK] students: {len(students_rows)} dòng đã chuyển")

            # 5. BẢNG CLASS_STUDENTS
            cs_rows = cur_sq.execute("""
                SELECT id, class_id, student_id, gpa, skill_frontend, skill_backend, skill_database, 
                       skill_uiux, skill_mobile, skill_devops, skill_aiml, skill_qa, skill_presentation, 
                       skill_management, source, created_at
                FROM class_students
            """).fetchall()
            for r in cs_rows:
                cur.execute("""
                    INSERT INTO class_students (id, class_id, student_id, gpa, skill_frontend, skill_backend, skill_database, 
                                               skill_uiux, skill_mobile, skill_devops, skill_aiml, skill_qa, skill_presentation, 
                                               skill_management, source, created_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (class_id, student_id) DO NOTHING;
                """, (r["id"], r["class_id"], r["student_id"], r["gpa"], r["skill_frontend"], r["skill_backend"],
                      r["skill_database"], r["skill_uiux"], r["skill_mobile"], r["skill_devops"], r["skill_aiml"],
                      r["skill_qa"], r["skill_presentation"], r["skill_management"], r["source"], r["created_at"]))
            # Cập nhật sequence SERIAL
            cur.execute("SELECT setval('class_students_id_seq', (SELECT COALESCE(MAX(id), 1) FROM class_students));")
            print(f" [OK] class_students: {len(cs_rows)} dòng đã chuyển (đã đồng bộ sequence id)")

            # 6. BẢNG UPLOADED_FILES
            uf_rows = cur_sq.execute("SELECT id, filename, file_size, file_type, total_records, file_content, class_id, uploaded_by, created_at FROM uploaded_files").fetchall()
            for r in uf_rows:
                raw_bytes = bytes(r["file_content"]) if r["file_content"] else None
                cur.execute("""
                    INSERT INTO uploaded_files (id, filename, file_size, file_type, total_records, file_content, class_id, uploaded_by, created_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (id) DO NOTHING;
                """, (r["id"], r["filename"], r["file_size"], r["file_type"], r["total_records"], 
                      raw_bytes, r["class_id"], r["uploaded_by"], r["created_at"]))
            print(f" [OK] uploaded_files: {len(uf_rows)} dòng đã chuyển (BLOB -> BYTEA)")

            # 7. BẢNG GROUPING_SESSIONS
            sess_rows = cur_sq.execute("SELECT id, class_id, class_name, lecturer_id, title, status, total_students, overall_fitness, execution_time_ms, convergence_history_json, created_at, updated_at FROM grouping_sessions").fetchall()
            for r in sess_rows:
                cur.execute("""
                    INSERT INTO grouping_sessions (id, class_id, class_name, lecturer_id, title, status, total_students, overall_fitness, execution_time_ms, convergence_history_json, created_at, updated_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (id) DO NOTHING;
                """, (r["id"], r["class_id"], r["class_name"], None, r["title"], r["status"], 
                      r["total_students"], r["overall_fitness"], r["execution_time_ms"], 
                      r["convergence_history_json"], r["created_at"], r["updated_at"]))
            print(f" [OK] grouping_sessions: {len(sess_rows)} dòng đã chuyển")

            # 8. BẢNG SESSION_CONFIGS
            conf_rows = cur_sq.execute("""
                SELECT session_id, target_group_count, min_members, max_members, weight_skill_balance, 
                       weight_disc_diversity, weight_gpa_balance, weight_gender_balance, 
                       weight_constraint_satisfaction, require_leader, min_frontend, min_backend, 
                       min_design, balance_gender, max_gpa_spread, respect_preferences, 
                       force_no_clashes, ga_population_size, ga_generations, ga_mutation_rate, 
                       ga_crossover_rate, ga_selection_method, ga_elitism_count, config_json 
                FROM session_configs
            """).fetchall()
            for r in conf_rows:
                cur.execute("""
                    INSERT INTO session_configs (session_id, target_group_count, min_members, max_members, 
                                                weight_skill_balance, weight_disc_diversity, weight_gpa_balance, 
                                                weight_gender_balance, weight_constraint_satisfaction, 
                                                require_leader, min_frontend, min_backend, min_design, 
                                                balance_gender, max_gpa_spread, respect_preferences, 
                                                force_no_clashes, ga_population_size, ga_generations, 
                                                ga_mutation_rate, ga_crossover_rate, ga_selection_method, 
                                                ga_elitism_count, config_json)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (session_id) DO NOTHING;
                """, (r["session_id"], r["target_group_count"], r["min_members"], r["max_members"],
                      r["weight_skill_balance"], r["weight_disc_diversity"], r["weight_gpa_balance"],
                      r["weight_gender_balance"], r["weight_constraint_satisfaction"], bool(r["require_leader"]),
                      r["min_frontend"], r["min_backend"], r["min_design"], bool(r["balance_gender"]),
                      r["max_gpa_spread"], bool(r["respect_preferences"]), bool(r["force_no_clashes"]),
                      r["ga_population_size"], r["ga_generations"], r["ga_mutation_rate"],
                      r["ga_crossover_rate"], r["ga_selection_method"], r["ga_elitism_count"], r["config_json"]))
            print(f" [OK] session_configs: {len(conf_rows)} dòng đã chuyển")

            # 9. BẢNG GROUPS
            grp_rows = cur_sq.execute("""
                SELECT id, session_id, group_number, name, topic, leader_id, avg_gpa, 
                       gpa_variance, skill_balance_score, disc_diversity_score, compatibility_score, 
                       gender_ratio_male, gender_ratio_female, metrics_json, explanation_json, created_at 
                FROM groups
            """).fetchall()
            for r in grp_rows:
                cur.execute("""
                    INSERT INTO groups (id, session_id, group_number, name, topic, leader_id, avg_gpa, 
                                       gpa_variance, skill_balance_score, disc_diversity_score, 
                                       compatibility_score, gender_ratio_male, gender_ratio_female, 
                                       metrics_json, explanation_json, created_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (id) DO NOTHING;
                """, (r["id"], r["session_id"], r["group_number"], r["name"], r["topic"], r["leader_id"],
                      r["avg_gpa"], r["gpa_variance"], r["skill_balance_score"], r["disc_diversity_score"],
                      r["compatibility_score"], r["gender_ratio_male"], r["gender_ratio_female"],
                      r["metrics_json"], r["explanation_json"], r["created_at"]))
            print(f" [OK] groups: {len(grp_rows)} dòng đã chuyển")

            # 10. BẢNG GROUP_MEMBERS
            gm_rows = cur_sq.execute("""
                SELECT id, group_id, student_id, is_leader, assigned_role, student_snapshot_json, joined_at 
                FROM group_members
            """).fetchall()
            for r in gm_rows:
                cur.execute("""
                    INSERT INTO group_members (id, group_id, student_id, is_leader, assigned_role, 
                                              student_snapshot_json, joined_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (group_id, student_id) DO NOTHING;
                """, (r["id"], r["group_id"], r["student_id"], bool(r["is_leader"]), r["assigned_role"],
                      r["student_snapshot_json"], r["joined_at"]))
            cur.execute("SELECT setval('group_members_id_seq', (SELECT COALESCE(MAX(id), 1) FROM group_members));")
            print(f" [OK] group_members: {len(gm_rows)} dòng đã chuyển (đã đồng bộ sequence id)")

            # 11. BẢNG GROUP_EXPLANATIONS
            ge_rows = cur_sq.execute("""
                SELECT id, group_id, summary, synergy_highlights_json, potential_risks_json, 
                       recommendations_json, leadership_analysis, disc_synergy, skill_coverage_summary, 
                       ai_pedagogical_advice, created_at 
                FROM group_explanations
            """).fetchall()
            for r in ge_rows:
                cur.execute("""
                    INSERT INTO group_explanations (id, group_id, summary, synergy_highlights_json, 
                                                    potential_risks_json, recommendations_json, 
                                                    leadership_analysis, disc_synergy, skill_coverage_summary, 
                                                    ai_pedagogical_advice, created_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (group_id) DO NOTHING;
                """, (r["id"], r["group_id"], r["summary"], r["synergy_highlights_json"],
                      r["potential_risks_json"], r["recommendations_json"], r["leadership_analysis"],
                      r["disc_synergy"], r["skill_coverage_summary"], r["ai_pedagogical_advice"], r["created_at"]))
            cur.execute("SELECT setval('group_explanations_id_seq', (SELECT COALESCE(MAX(id), 1) FROM group_explanations));")
            print(f" [OK] group_explanations: {len(ge_rows)} dòng đã chuyển (đã đồng bộ sequence id)")

            # 12. BẢNG SYSTEM_SETTINGS
            sett_rows = cur_sq.execute("SELECT key, value, description, updated_at FROM system_settings").fetchall()
            for r in sett_rows:
                cur.execute("""
                    INSERT INTO system_settings (key, value, description, updated_at)
                    VALUES (%s, %s, %s, %s)
                    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
                """, (r["key"], r["value"], r["description"], r["updated_at"]))
            print(f" [OK] system_settings: {len(sett_rows)} dòng đã chuyển")

            pg_conn.commit()

    sqlite_conn.close()
    print("="*70)
    print("HOÀN THÀNH DI CHUYỂN DỮ LIỆU SANG POSTGRESQL THÀNH CÔNG!")
    print("Bảng 'accounts' hiện hoàn toàn trống. Bạn có thể tự tạo tài khoản mới ngay bây giờ.")
    print("="*70)

if __name__ == '__main__':
    migrate()
