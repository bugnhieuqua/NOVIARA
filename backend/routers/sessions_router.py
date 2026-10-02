# -*- coding: utf-8 -*-
"""
NOVIARA - Sessions Router
Quản lý lưu trữ bền vững các phiên phân nhóm đồ án bằng AI/GA vào SQLite.
Hỗ trợ Công bố (Publish) và Thu hồi (Revoke/Unpublish) cho sinh viên tra cứu.
"""
import json
import time
from typing import Optional, List, Any, Dict
from pydantic import BaseModel
from fastapi import APIRouter, HTTPException, status
from backend.database import get_db_connection, query_all, query_one, execute_commit
from backend.routers.events_router import emit_event

router = APIRouter(prefix="/sessions", tags=["Grouping Sessions Management"])


class UpdateSessionStatusPayload(BaseModel):
    status: str  # 'published' | 'draft' | 'completed'


def _format_session_from_db(sess_row: Dict[str, Any], conn) -> Dict[str, Any]:
    """Helper tái cấu trúc đối tượng GroupingSession hoàn chỉnh từ SQLite."""
    session_id = sess_row["id"]

    # 1. Lấy config
    cfg_row = conn.execute("SELECT * FROM session_configs WHERE session_id = ?", (session_id,)).fetchone()
    if cfg_row and cfg_row["config_json"]:
        try:
            config = json.loads(cfg_row["config_json"])
        except Exception:
            config = {}
    elif cfg_row:
        config = {
            "targetGroupCount": cfg_row["target_group_count"],
            "minMembers": cfg_row["min_members"],
            "maxMembers": cfg_row["max_members"],
            "fitnessWeights": {
                "skillBalance": cfg_row["weight_skill_balance"],
                "discDiversity": cfg_row["weight_disc_diversity"],
                "gpaBalance": cfg_row["weight_gpa_balance"],
                "genderBalance": cfg_row["weight_gender_balance"],
                "constraintSatisfaction": cfg_row["weight_constraint_satisfaction"],
            },
            "constraints": {
                "requireLeaderPerGroup": bool(cfg_row["require_leader"]),
                "minFrontendPerGroup": cfg_row["min_frontend"],
                "minBackendPerGroup": cfg_row["min_backend"],
                "minDesignPerGroup": cfg_row["min_design"],
                "balanceGender": bool(cfg_row["balance_gender"]),
                "maxGpaSpread": cfg_row["max_gpa_spread"],
                "respectPreferences": bool(cfg_row["respect_preferences"]),
                "forceNoPairingClashes": bool(cfg_row["force_no_clashes"]),
            },
            "gaHyperparameters": {
                "populationSize": cfg_row["ga_population_size"],
                "generations": cfg_row["ga_generations"],
                "mutationRate": cfg_row["ga_mutation_rate"],
                "crossoverRate": cfg_row["ga_crossover_rate"],
                "selectionMethod": cfg_row["ga_selection_method"],
                "elitismCount": cfg_row["ga_elitism_count"],
            }
        }
    else:
        config = {}

    # 2. Lấy groups
    group_rows = conn.execute("""
        SELECT * FROM groups WHERE session_id = ? ORDER BY group_number ASC
    """, (session_id,)).fetchall()

    groups = []
    for g in group_rows:
        group_id = g["id"]

        # Lấy members
        mem_rows = conn.execute("""
            SELECT gm.student_id, gm.is_leader, gm.assigned_role, gm.student_snapshot_json,
                   s.name, s.email, s.phone, s.gender, s.gpa
            FROM group_members gm
            LEFT JOIN students s ON gm.student_id = s.student_id
            WHERE gm.group_id = ?
        """, (group_id,)).fetchall()

        members = []
        for m in mem_rows:
            if m["student_snapshot_json"]:
                try:
                    s_obj = json.loads(m["student_snapshot_json"])
                    members.append(s_obj)
                    continue
                except Exception:
                    pass
            # Fallback nếu snapshot chưa có
            members.append({
                "id": m["student_id"],
                "name": m["name"] or m["student_id"],
                "email": m["email"] or "",
                "phone": m["phone"] or "",
                "gender": m["gender"] or "Nam",
                "gpa": m["gpa"] or 3.0,
                "isLeaderCandidate": bool(m["is_leader"]),
                "primarySkill": "frontend",
                "secondarySkill": "backend",
                "skills": {"frontend": 3, "backend": 3, "database": 3, "uiux": 3},
                "disc": {"dominant": "D", "scores": {"D": 50, "I": 20, "S": 15, "C": 15}}
            })

        # Parse metrics & explanation
        metrics = {}
        if g["metrics_json"]:
            try:
                metrics = json.loads(g["metrics_json"])
            except Exception:
                pass
        if not metrics:
            metrics = {
                "avgGpa": g["avg_gpa"],
                "gpaVariance": g["gpa_variance"],
                "skillCoverage": {"frontend": 3, "backend": 3, "database": 3, "uiux": 3},
                "skillBalanceScore": g["skill_balance_score"],
                "discProfile": {"D": 25, "I": 25, "S": 25, "C": 25},
                "discDiversityScore": g["disc_diversity_score"],
                "genderRatio": {"male": g["gender_ratio_male"], "female": g["gender_ratio_female"]},
                "constraintViolations": [],
                "compatibilityScore": g["compatibility_score"]
            }

        explanation = {}
        if g["explanation_json"]:
            try:
                explanation = json.loads(g["explanation_json"])
            except Exception:
                pass
        if not explanation:
            explanation = {
                "summary": f"Nhóm {g['group_number']} được tối ưu hóa cân bằng năng lực và tính cách.",
                "synergyHighlights": ["Phân bổ đều kỹ năng lập trình"],
                "potentialRisks": [],
                "recommendations": ["Phân công rõ vai trò"],
                "leadershipAnalysis": "Đã có thành viên phụ trách điều phối",
                "discSynergy": "Tương thích cao",
                "skillCoverageSummary": "Đáp ứng tốt yêu cầu đồ án"
            }

        groups.append({
            "id": group_id,
            "groupNumber": g["group_number"],
            "name": g["name"],
            "topic": g["topic"] or "",
            "leaderId": g["leader_id"],
            "members": members,
            "metrics": metrics,
            "explanation": explanation
        })

    # Parse convergence history
    conv_hist = []
    if sess_row["convergence_history_json"]:
        try:
            conv_hist = json.loads(sess_row["convergence_history_json"])
        except Exception:
            conv_hist = []

    return {
        "id": session_id,
        "title": sess_row["title"],
        "classId": sess_row["class_id"] or "",
        "className": sess_row["class_name"] or "",
        "createdAt": str(sess_row["created_at"]),
        "updatedAt": str(sess_row["updated_at"] or sess_row["created_at"]),
        "status": sess_row["status"],
        "totalStudents": sess_row["total_students"],
        "overallFitness": sess_row["overall_fitness"],
        "executionTimeMs": sess_row["execution_time_ms"],
        "convergenceHistory": conv_hist,
        "googleSheetsUrl": (sess_row["google_sheets_url"] if "google_sheets_url" in sess_row.keys() and sess_row["google_sheets_url"] else ""),
        "config": config,
        "groups": groups
    }


@router.get("")
async def get_all_sessions():
    """Lấy danh sách tất cả các phiên phân nhóm từ CSDL (kèm chi tiết các nhóm)."""
    with get_db_connection() as conn:
        rows = conn.execute("""
            SELECT * FROM grouping_sessions ORDER BY created_at DESC
        """).fetchall()
        return [_format_session_from_db(r, conn) for r in rows]


@router.get("/published/classes")
async def get_published_classes():
    """Lấy danh sách các lớp học hiện đang có kết quả phân nhóm được công bố."""
    with get_db_connection() as conn:
        rows = conn.execute("""
            SELECT DISTINCT 
                gs.class_id as id, 
                COALESCE(c.code, gs.class_id) as code,
                COALESCE(c.name, gs.class_name, gs.class_id) as name,
                c.department,
                gs.id as sessionId,
                gs.title as sessionTitle,
                gs.total_students as totalStudents,
                (SELECT COUNT(*) FROM groups g WHERE g.session_id = gs.id) as groupCount,
                gs.updated_at as publishedAt
            FROM grouping_sessions gs
            LEFT JOIN classes c ON gs.class_id = c.id
            WHERE gs.status = 'published' AND gs.class_id IS NOT NULL AND gs.class_id != ''
            ORDER BY gs.updated_at DESC
        """).fetchall()
        return [dict(r) for r in rows]


@router.get("/published/all")
async def get_all_published_sessions():
    """Lấy danh sách tất cả các phiên đang được công bố theo từng lớp học."""
    with get_db_connection() as conn:
        rows = conn.execute("""
            SELECT * FROM grouping_sessions 
            WHERE status = 'published' 
            ORDER BY updated_at DESC, created_at DESC
        """).fetchall()
        return [_format_session_from_db(r, conn) for r in rows]


@router.get("/published")
async def get_published_session(class_id: Optional[str] = None):
    """
    Lấy phiên phân nhóm ĐANG ĐƯỢC CÔNG BỐ dành cho Sinh viên / Khách tra cứu.
    Nếu truyền class_id -> Lấy phiên công bố của lớp đó.
    Nếu không truyền -> Lấy phiên công bố mới nhất.
    """
    with get_db_connection() as conn:
        if class_id:
            row = conn.execute("""
                SELECT * FROM grouping_sessions 
                WHERE status = 'published' AND class_id = ?
                ORDER BY updated_at DESC, created_at DESC 
                LIMIT 1
            """, (class_id,)).fetchone()
        else:
            row = conn.execute("""
                SELECT * FROM grouping_sessions 
                WHERE status = 'published' 
                ORDER BY updated_at DESC, created_at DESC 
                LIMIT 1
            """).fetchone()
        if not row:
            return None
        return _format_session_from_db(row, conn)


@router.post("", status_code=status.HTTP_201_CREATED)
async def save_session(payload: Dict[str, Any]):
    """
    Lưu phiên phân nhóm đồ án vào CSDL SQLite (bền vững, không bị mất khi F5).
    Đồng thời lưu toàn bộ sinh viên trong phiên vào bảng students.
    """
    session_id = payload.get("id") or f"GA-{int(time.time())}"
    title = payload.get("title") or "Phiên phân nhóm GA"
    class_id = payload.get("classId") or None
    class_name = payload.get("className") or ""
    status_str = payload.get("status") or "draft"
    total_students = payload.get("totalStudents") or 0
    overall_fitness = payload.get("overallFitness") or 0.0
    exec_time = payload.get("executionTimeMs") or 0
    conv_hist_json = json.dumps(payload.get("convergenceHistory") or [])
    created_at = payload.get("createdAt") or time.strftime("%Y-%m-%d %H:%M:%S")
    updated_at = payload.get("updatedAt") or created_at

    config = payload.get("config") or {}
    groups = payload.get("groups") or []

    with get_db_connection() as conn:
        # Đảm bảo class_id tồn tại trong bảng classes để không vi phạm ràng buộc Foreign Key
        if class_id:
            cls_exists = conn.execute("SELECT id FROM classes WHERE id = ?", (class_id,)).fetchone()
            if not cls_exists:
                conn.execute(
                    "INSERT OR IGNORE INTO classes (id, code, name) VALUES (?, ?, ?)",
                    (class_id, class_id, class_name or class_id)
                )

        # Nếu phiên này được công bố, tự động đưa các phiên khác của CÙNG LỚP NÀY về draft
        if status_str == 'published':
            if class_id:
                conn.execute(
                    "UPDATE grouping_sessions SET status = 'draft' WHERE status = 'published' AND class_id = ? AND id != ?",
                    (class_id, session_id)
                )
            else:
                conn.execute(
                    "UPDATE grouping_sessions SET status = 'draft' WHERE status = 'published' AND id != ?",
                    (session_id,)
                )

        # 1. Đảm bảo tất cả sinh viên trong các nhóm được lưu vào bảng students đầy đủ
        for grp in groups:
            for m in grp.get("members", []):
                s_id = m.get("id")
                if s_id:
                    disc = m.get("disc", {})
                    raw_gender = str(m.get("gender") or "Nam").strip().lower()
                    gender = "Nữ" if raw_gender in ("nữ", "nu", "female", "f") else "Nam"
                    conn.execute("""
                        INSERT INTO students 
                        (student_id, name, email, phone, gender, gpa, primary_skill, secondary_skill, disc_dominant, is_leader_candidate, profile_json)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        ON CONFLICT (student_id) DO UPDATE SET
                            name = EXCLUDED.name,
                            email = EXCLUDED.email,
                            phone = EXCLUDED.phone,
                            gender = EXCLUDED.gender,
                            gpa = EXCLUDED.gpa,
                            primary_skill = EXCLUDED.primary_skill,
                            secondary_skill = EXCLUDED.secondary_skill,
                            disc_dominant = EXCLUDED.disc_dominant,
                            is_leader_candidate = EXCLUDED.is_leader_candidate,
                            profile_json = EXCLUDED.profile_json
                    """, (
                        s_id,
                        m.get("name") or s_id,
                        m.get("email") or "",
                        m.get("phone") or "",
                        gender,
                        m.get("gpa") or 3.0,
                        m.get("primarySkill") or "backend",
                        m.get("secondarySkill") or "frontend",
                        disc.get("dominant") or "S",
                        bool(m.get("isLeaderCandidate")),
                        json.dumps(m)
                    ))

        # 2. Lưu thông tin phiên grouping_sessions
        google_sheets_url = payload.get("googleSheetsUrl") or ""
        conn.execute("""
            INSERT INTO grouping_sessions
            (id, class_id, class_name, title, status, total_students, overall_fitness, execution_time_ms, convergence_history_json, google_sheets_url, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT (id) DO UPDATE SET
                class_id = EXCLUDED.class_id,
                class_name = EXCLUDED.class_name,
                title = EXCLUDED.title,
                status = EXCLUDED.status,
                total_students = EXCLUDED.total_students,
                overall_fitness = EXCLUDED.overall_fitness,
                execution_time_ms = EXCLUDED.execution_time_ms,
                convergence_history_json = EXCLUDED.convergence_history_json,
                google_sheets_url = EXCLUDED.google_sheets_url,
                updated_at = EXCLUDED.updated_at
        """, (
            session_id, class_id, class_name, title, status_str,
            total_students, overall_fitness, exec_time, conv_hist_json,
            google_sheets_url, created_at, updated_at
        ))

        # 3. Lưu cấu hình session_configs
        weights = config.get("fitnessWeights", {})
        constraints = config.get("constraints", {})
        ga_params = config.get("gaHyperparameters", {})

        conn.execute("""
            INSERT INTO session_configs
            (session_id, target_group_count, min_members, max_members,
             weight_skill_balance, weight_disc_diversity, weight_gpa_balance, weight_gender_balance, weight_constraint_satisfaction,
             require_leader, min_frontend, min_backend, min_design, balance_gender, max_gpa_spread, respect_preferences, force_no_clashes,
             ga_population_size, ga_generations, ga_mutation_rate, ga_crossover_rate, ga_selection_method, ga_elitism_count,
             config_json)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT (session_id) DO UPDATE SET
                target_group_count = EXCLUDED.target_group_count,
                min_members = EXCLUDED.min_members,
                max_members = EXCLUDED.max_members,
                weight_skill_balance = EXCLUDED.weight_skill_balance,
                weight_disc_diversity = EXCLUDED.weight_disc_diversity,
                weight_gpa_balance = EXCLUDED.weight_gpa_balance,
                weight_gender_balance = EXCLUDED.weight_gender_balance,
                weight_constraint_satisfaction = EXCLUDED.weight_constraint_satisfaction,
                require_leader = EXCLUDED.require_leader,
                min_frontend = EXCLUDED.min_frontend,
                min_backend = EXCLUDED.min_backend,
                min_design = EXCLUDED.min_design,
                balance_gender = EXCLUDED.balance_gender,
                max_gpa_spread = EXCLUDED.max_gpa_spread,
                respect_preferences = EXCLUDED.respect_preferences,
                force_no_clashes = EXCLUDED.force_no_clashes,
                ga_population_size = EXCLUDED.ga_population_size,
                ga_generations = EXCLUDED.ga_generations,
                ga_mutation_rate = EXCLUDED.ga_mutation_rate,
                ga_crossover_rate = EXCLUDED.ga_crossover_rate,
                ga_selection_method = EXCLUDED.ga_selection_method,
                ga_elitism_count = EXCLUDED.ga_elitism_count,
                config_json = EXCLUDED.config_json
        """, (
            session_id,
            config.get("targetGroupCount", len(groups)),
            config.get("minMembers", 4),
            config.get("maxMembers", 6),
            weights.get("skillBalance", 35.0),
            weights.get("discDiversity", 25.0),
            weights.get("gpaBalance", 20.0),
            weights.get("genderBalance", 10.0),
            weights.get("constraintSatisfaction", 10.0),
            bool(constraints.get("requireLeaderPerGroup")),
            constraints.get("minFrontendPerGroup", 1),
            constraints.get("minBackendPerGroup", 1),
            constraints.get("minDesignPerGroup", 0),
            bool(constraints.get("balanceGender")),
            constraints.get("maxGpaSpread", 0.4),
            bool(constraints.get("respectPreferences")),
            bool(constraints.get("forceNoPairingClashes")),
            ga_params.get("populationSize", 100),
            ga_params.get("generations", 200),
            ga_params.get("mutationRate", 0.05),
            ga_params.get("crossoverRate", 0.8),
            ga_params.get("selectionMethod", "tournament"),
            ga_params.get("elitismCount", 2),
            json.dumps(config)
        ))

        # 4. Xóa các nhóm cũ của session (nếu cập nhật)
        old_groups = conn.execute("SELECT id FROM groups WHERE session_id = ?", (session_id,)).fetchall()
        for og in old_groups:
            conn.execute("DELETE FROM group_members WHERE group_id = ?", (og["id"],))
            conn.execute("DELETE FROM group_explanations WHERE group_id = ?", (og["id"],))
        conn.execute("DELETE FROM groups WHERE session_id = ?", (session_id,))

        # 5. Lưu từng nhóm và các thành viên
        for idx, grp in enumerate(groups, 1):
            grp_id = grp.get("id") or f"{session_id}-G{idx}"
            grp_number = grp.get("groupNumber") or idx
            grp_name = grp.get("name") or f"Nhóm {idx}"
            topic = grp.get("topic") or ""
            leader_id = grp.get("leaderId")
            metrics = grp.get("metrics") or {}
            explanation = grp.get("explanation") or {}

            conn.execute("""
                INSERT INTO groups
                (id, session_id, group_number, name, topic, leader_id,
                 avg_gpa, gpa_variance, skill_balance_score, disc_diversity_score, compatibility_score,
                 gender_ratio_male, gender_ratio_female, metrics_json, explanation_json)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                grp_id, session_id, grp_number, grp_name, topic, leader_id,
                metrics.get("avgGpa", 0.0),
                metrics.get("gpaVariance", 0.0),
                metrics.get("skillBalanceScore", 0.0),
                metrics.get("discDiversityScore", 0.0),
                metrics.get("compatibilityScore", 0.0),
                metrics.get("genderRatio", {}).get("male", 0),
                metrics.get("genderRatio", {}).get("female", 0),
                json.dumps(metrics),
                json.dumps(explanation)
            ))

            # Lưu group members
            for m in grp.get("members", []):
                m_id = m.get("id")
                if m_id:
                    is_ldr = bool(leader_id == m_id or m.get("isLeaderCandidate"))
                    conn.execute("""
                        INSERT INTO group_members
                        (group_id, student_id, is_leader, assigned_role, student_snapshot_json)
                        VALUES (?, ?, ?, ?, ?)
                        ON CONFLICT (group_id, student_id) DO UPDATE SET
                            is_leader = EXCLUDED.is_leader,
                            assigned_role = EXCLUDED.assigned_role,
                            student_snapshot_json = EXCLUDED.student_snapshot_json
                    """, (
                        grp_id, m_id, is_ldr,
                        m.get("primarySkill") or "Member",
                        json.dumps(m)
                    ))

            # Lưu group explanations
            if explanation:
                conn.execute("""
                    INSERT INTO group_explanations
                    (group_id, summary, synergy_highlights_json, potential_risks_json, recommendations_json, leadership_analysis, disc_synergy, skill_coverage_summary)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    ON CONFLICT (group_id) DO UPDATE SET
                        summary = EXCLUDED.summary,
                        synergy_highlights_json = EXCLUDED.synergy_highlights_json,
                        potential_risks_json = EXCLUDED.potential_risks_json,
                        recommendations_json = EXCLUDED.recommendations_json,
                        leadership_analysis = EXCLUDED.leadership_analysis,
                        disc_synergy = EXCLUDED.disc_synergy,
                        skill_coverage_summary = EXCLUDED.skill_coverage_summary
                """, (
                    grp_id,
                    explanation.get("summary") or "",
                    json.dumps(explanation.get("synergyHighlights") or []),
                    json.dumps(explanation.get("potentialRisks") or []),
                    json.dumps(explanation.get("recommendations") or []),
                    explanation.get("leadershipAnalysis") or "",
                    explanation.get("discSynergy") or "",
                    explanation.get("skillCoverageSummary") or ""
                ))

        # Trả về kết quả hoàn chỉnh đã lưu
        sess_record = conn.execute("SELECT * FROM grouping_sessions WHERE id = ?", (session_id,)).fetchone()
        return {
            "success": True,
            "message": f"Đã lưu phiên phân nhóm '{title}' thành công vào CSDL.",
            "session": _format_session_from_db(sess_record, conn)
        }


@router.patch("/{session_id}/status")
async def update_session_status(session_id: str, payload: UpdateSessionStatusPayload):
    """
    Cập nhật trạng thái phiên phân nhóm:
    - status = 'published': CÔNG BỐ cho Sinh viên tra cứu theo lớp.
    - status = 'draft': THU HỒI / HỦY CÔNG BỐ (Sinh viên không xem được nữa).
    """
    sess = query_one("SELECT id, class_id, title, status FROM grouping_sessions WHERE id = ?", (session_id,))
    if not sess:
        raise HTTPException(status_code=404, detail="Không tìm thấy phiên phân nhóm.")

    new_status = payload.status
    if new_status not in ('draft', 'running', 'completed', 'published'):
        raise HTTPException(status_code=400, detail="Trạng thái không hợp lệ.")

    # Cập nhật trạng thái
    with get_db_connection() as conn:
        if new_status == 'published':
            # Chỉ thu hồi các phiên công bố trước đó của CÙNG LỚP HỌC NÀY
            cls_id = sess.get("class_id")
            if cls_id:
                conn.execute(
                    "UPDATE grouping_sessions SET status = 'draft' WHERE status = 'published' AND class_id = ? AND id != ?",
                    (cls_id, session_id)
                )
            else:
                conn.execute(
                    "UPDATE grouping_sessions SET status = 'draft' WHERE status = 'published' AND id != ?",
                    (session_id,)
                )

        conn.execute("""
            UPDATE grouping_sessions
            SET status = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        """, (new_status, session_id))

    action_label = "CÔNG BỐ" if new_status == "published" else "THU HỒI"

    # Phát realtime event đến tất cả client đang kết nối SSE
    emit_event(
        "session_published" if new_status == "published" else "session_revoked",
        {
            "sessionId": session_id,
            "classId": sess.get("class_id"),
            "status": new_status,
        }
    )

    return {
        "success": True,
        "message": f"Đã {action_label} phiên phân nhóm '{sess['title']}' thành công.",
        "sessionId": session_id,
        "status": new_status
    }


class UpdateSheetsUrlPayload(BaseModel):
    url: str


@router.patch("/{session_id}/sheets-url")
async def update_sheets_url(session_id: str, payload: UpdateSheetsUrlPayload):
    """Lưu liên kết Google Sheets đã xuất vào CSDL SQLite cho phiên phân nhóm."""
    sess = query_one("SELECT id, title FROM grouping_sessions WHERE id = ?", (session_id,))
    if not sess:
        raise HTTPException(status_code=404, detail="Không tìm thấy phiên phân nhóm.")

    clean_url = (payload.url or "").strip()
    with get_db_connection() as conn:
        conn.execute("UPDATE grouping_sessions SET google_sheets_url = ? WHERE id = ?", (clean_url, session_id))

    return {
        "success": True,
        "message": "Đã lưu liên kết Google Sheets vào CSDL.",
        "sessionId": session_id,
        "googleSheetsUrl": clean_url
    }


@router.delete("/{session_id}")
async def delete_session(session_id: str):
    """Xóa hoàn toàn phiên phân nhóm và các nhóm liên quan khỏi CSDL."""
    sess = query_one("SELECT id, title FROM grouping_sessions WHERE id = ?", (session_id,))
    if not sess:
        raise HTTPException(status_code=404, detail="Không tìm thấy phiên phân nhóm.")

    execute_commit("DELETE FROM grouping_sessions WHERE id = ?", (session_id,))

    # Phát realtime event khi xóa phiên
    emit_event("session_deleted", {"sessionId": session_id})

    return {
        "success": True,
        "message": f"Đã xóa phiên phân nhóm '{sess['title']}' khỏi CSDL.",
        "deletedId": session_id
    }
