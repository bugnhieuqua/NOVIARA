# -*- coding: utf-8 -*-
"""
============================================================================
NOVIARA BACKEND - AI PROMPT MODULE
============================================================================
Tách riêng toàn bộ các chuỗi Prompt nhiều dòng và hàm format prompt
cho Gemini LLM, giúp backend services sạch sẽ và dễ kiểm thử.
============================================================================
"""

import json
from typing import List, Dict, Any


def format_group_explanation_prompt(
    group_name: str,
    topic: str,
    members: List[Any],
    metrics: Any
) -> str:
    """
    Xây dựng prompt phân tích nhóm sinh viên cho Gemini.
    """
    members_data = []
    for m in members:
        # Hỗ trợ cả Pydantic schema lẫn object thường
        disc_scores = m.disc.scores.model_dump() if hasattr(m.disc.scores, "model_dump") else dict(m.disc.scores)
        members_data.append({
            "mssv": m.id,
            "ten": m.name,
            "gpa": m.gpa,
            "chuyen_mon_chinh": m.primarySkill,
            "disc_dominant": m.disc.dominant,
            "disc_scores": disc_scores,
            "la_leader": bool(m.isLeaderCandidate)
        })

    members_json_str = json.dumps(members_data, ensure_ascii=False, indent=2)

    return f"""
Bạn là chuyên gia tư vấn sư phạm và quản trị nhóm dự án AI (NOVIARA).
Hãy phân tích nhóm sinh viên sau đây và trả về định dạng JSON chính xác:

Tên nhóm: {group_name}
Đề tài: {topic or 'Dự án Công nghệ Thông tin'}
Số lượng thành viên: {len(members)}

Danh sách thành viên:
{members_json_str}

Chỉ số nhóm tính toán sơ bộ:
- Điểm tương thích: {metrics.compatibilityScore}%
- Điểm cân bằng kỹ năng: {metrics.skillBalanceScore}/100
- Điểm đa dạng DISC: {metrics.discDiversityScore}/100
- Tỷ lệ giới tính: Nam {metrics.genderRatio.get('male', 0)} / Nữ {metrics.genderRatio.get('female', 0)}

Yêu cầu trả về đúng JSON Schema sau (KHÔNG thêm markdown ```json):
{{
  "summary": "Tóm tắt ngắn gọn 2-3 câu về bức tranh tổng thể và tiềm năng của nhóm",
  "synergyHighlights": ["Điểm mạnh 1", "Điểm mạnh 2", "Điểm mạnh 3"],
  "potentialRisks": ["Rủi ro 1 về kỹ năng/tính cách/quản trị", "Rủi ro 2"],
  "recommendations": ["Khuyến nghị phân chia công việc cụ thể 1", "Khuyến nghị 2", "Khuyến nghị 3"],
  "leadershipAnalysis": "Phân tích và đề xuất ai nên làm trưởng nhóm kèm lý do",
  "discSynergy": "Nhận xét sâu về sự hòa hợp hoặc điểm cần lưu ý giữa các nét tính cách D, I, S, C",
  "skillCoverageSummary": "Tóm tắt độ phủ các mảng kỹ năng chính (Frontend, Backend, DB, QA...)"
}}
""".strip()


def format_lecturer_extraction_prompt(raw_content: str, file_name: str = "") -> str:
    """
    Xây dựng prompt bóc tách danh sách giảng viên từ văn bản thô theo đúng chuẩn NOVIARA.
    """
    file_ctx = f'Tên tệp đính kèm: "{file_name}" (Nếu tên tệp có chứa tên Khoa/Bộ môn, hãy ưu tiên nhận diện nhưng phải đối chiếu với nội dung).\n' if file_name else ""
    return f"""
Bạn là AI Agent xử lý dữ liệu nhân sự giảng viên đại học trực thuộc Hệ thống NOVIARA.

NHIỆM VỤ HIỆN TẠI:
Trích xuất và chuẩn hóa danh sách giảng viên từ văn bản hoặc tệp dữ liệu thô để hỗ trợ backend tạo tài khoản giảng viên.

PHẠM VI:
- Chỉ xử lý việc bóc tách, chuẩn hóa và cấu trúc dữ liệu giảng viên.
- Không phân nhóm sinh viên, không chạy Genetic Algorithm, không tạo chromosome hay tính fitness.

{file_ctx}
NỘI DUNG VĂN BẢN THÔ:
\"\"\"
{raw_content}
\"\"\"

QUY TẮC CHUẨN HÓA:
1. Nhận diện chính xác Khoa / Bộ môn của giảng viên. Quy định hệ thống: "Có khoa mới có giảng viên". Nếu không xác định được khoa/bộ môn, không tự bịa; ghi nhận để hệ thống xử lý theo chính sách lỗi.
2. Bỏ qua số điện thoại và trạng thái đổi mật khẩu nếu các trường này không cần cho bước bóc tách dữ liệu.
3. Mật khẩu khởi tạo mặc định của hệ thống là "Noviara@123". Đây là mật khẩu tạm thời; giảng viên phải đổi mật khẩu ở lần đăng nhập đầu tiên.
4. Không suy đoán học vị, chuyên môn, khoa hoặc thông tin cá nhân nếu không có căn cứ trong dữ liệu nguồn.
5. Nếu có bản ghi trùng, giữ thông tin đầy đủ nhất và không tự tạo thêm người.

YÊU CẦU ĐẦU RA:
Trả về duy nhất một mảng JSON các object theo định dạng (KHÔNG có markdown code block, không thêm giải thích ngoài JSON):
[
  {{
    "name": "PGS. TS. Nguyễn Văn A",
    "department": "Khoa Công Nghệ Thông Tin",
    "personalEmail": "nguyenvana@gmail.com",
    "notes": "Chuyên môn Hệ thống thông tin & AI"
  }}
]
""".strip()
