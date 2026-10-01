import io
import pandas as pd
import numpy as np
from typing import List, Dict, Any
from backend.schemas import GroupSchema, StudentSchema


def export_groups_to_excel(groups: List[GroupSchema]) -> bytes:
    """
    Xuất file Excel gồm:
    - Sheet 1: 'Summary' (Tổng quan các nhóm, chỉ số trung bình)
    - Sheet 2..N: 'Nhom 1', 'Nhom 2'... (Chi tiết từng thành viên, mỗi ô 1 giá trị)
    """
    summary_rows = []
    group_dfs = []

    for g in groups:
        m_list = g.members
        m_count = len(m_list)
        avg_gpa = g.metrics.avgGpa
        skill_score = g.metrics.skillBalanceScore
        disc_score = g.metrics.discDiversityScore
        comp_score = g.metrics.compatibilityScore

        summary_rows.append({
            "Mã nhóm": g.id,
            "Tên nhóm": g.name,
            "Đề tài": g.topic or f"Đề tài {g.groupNumber}",
            "Số thành viên": m_count,
            "GPA Trung bình": avg_gpa,
            "Cân bằng kỹ năng (%)": skill_score,
            "Đa dạng DISC (%)": disc_score,
            "Điểm tương thích (%)": comp_score,
            "Trưởng nhóm đề xuất": next((m.name for m in m_list if m.id == g.leaderId), "Chưa chỉ định"),
            "Số vi phạm ràng buộc": len(g.metrics.constraintViolations)
        })

        member_rows = []
        for idx, m in enumerate(m_list, 1):
            member_rows.append({
                "STT": idx,
                "MSSV": m.id,
                "Họ và tên": m.name,
                "Giới tính": m.gender,
                "GPA": m.gpa,
                "Lớp": m.classId or "N/A",
                "Chuyên môn chính": m.primarySkill.upper(),
                "Frontend": m.skills.get("frontend", 3.0),
                "Backend": m.skills.get("backend", 3.0),
                "Database": m.skills.get("database", 3.0),
                "UI/UX": m.skills.get("uiux", 3.0),
                "DISC Dominant": m.disc.dominant,
                "DISC_D": m.disc.scores.D,
                "DISC_I": m.disc.scores.I,
                "DISC_S": m.disc.scores.S,
                "DISC_C": m.disc.scores.C,
                "Là ứng viên Leader": "Có" if m.isLeaderCandidate else "Không",
                "Email": m.email,
                "Số điện thoại": m.phone or ""
            })
        group_dfs.append((f"Nhom {g.groupNumber}", pd.DataFrame(member_rows)))

    df_summary = pd.DataFrame(summary_rows)

    buffer = io.BytesIO()
    with pd.ExcelWriter(buffer, engine='openpyxl') as writer:
        df_summary.to_excel(writer, sheet_name='Tong quan', index=False)
        for sheet_name, df_g in group_dfs:
            df_g.to_excel(writer, sheet_name=sheet_name[:31], index=False)

    return buffer.getvalue()


def export_groups_to_csv(groups: List[GroupSchema]) -> bytes:
    """Xuất tất cả các nhóm ra file CSV phẳng (UTF-8 BOM)."""
    rows = []
    for g in groups:
        for idx, m in enumerate(g.members, 1):
            rows.append({
                "Mã nhóm": g.id,
                "Tên nhóm": g.name,
                "STT": idx,
                "MSSV": m.id,
                "Họ và tên": m.name,
                "Giới tính": m.gender,
                "GPA": m.gpa,
                "Lớp": m.classId or "",
                "Chuyên môn chính": m.primarySkill.upper(),
                "Frontend": m.skills.get("frontend", 3.0),
                "Backend": m.skills.get("backend", 3.0),
                "Database": m.skills.get("database", 3.0),
                "UI/UX": m.skills.get("uiux", 3.0),
                "DISC_Dominant": m.disc.dominant,
                "DISC_D": m.disc.scores.D,
                "DISC_I": m.disc.scores.I,
                "DISC_S": m.disc.scores.S,
                "DISC_C": m.disc.scores.C,
                "Là Leader": "Có" if m.id == g.leaderId or m.isLeaderCandidate else "Không",
                "Email": m.email,
                "SĐT": m.phone or ""
            })
    df = pd.DataFrame(rows)
    return df.to_csv(index=False, encoding='utf-8-sig').encode('utf-8-sig')
