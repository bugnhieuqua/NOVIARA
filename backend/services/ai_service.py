import json
import os
from typing import List, Optional, Dict, Any
from backend.config import GEMINI_API_KEY, GEMINI_MODEL
from backend.schemas import (
    StudentSchema,
    GroupExplanationSchema,
    ExplainGroupRequest,
    AIAgentLecturerRequest,
    LecturerRawInput
)
from backend.services.ga_service import calculate_group_metrics, generate_rule_explanation
from backend.schemas import GroupingConfigSchema

# Khởi tạo Gemini Client nếu có API key
gemini_client = None
if GEMINI_API_KEY and GEMINI_API_KEY != "MY_GEMINI_API_KEY":
    try:
        from google import genai
        gemini_client = genai.Client(api_key=GEMINI_API_KEY)
    except Exception as e:
        print(f"[AI Service] Lỗi khởi tạo Gemini Client: {e}")


async def explain_group_ai(req: ExplainGroupRequest) -> GroupExplanationSchema:
    # 1. Sinh rule-based explanation làm nền tảng
    default_config = GroupingConfigSchema()
    metrics = calculate_group_metrics(req.members, default_config)
    rule_exp = generate_rule_explanation(req.members, metrics)

    # Nếu mode là 'rule' hoặc chưa cấu hình Gemini API key -> trả về ngay rule-based
    if req.mode == "rule" or not gemini_client:
        return rule_exp

    # 2. Gọi Gemini LLM để làm giàu nội dung phân tích (Hybrid / Gemini Mode)
    try:
        prompt = f"""
Bạn là chuyên gia tư vấn sư phạm và quản trị nhóm dự án AI (NOVIARA).
Hãy phân tích nhóm sinh viên sau đây và trả về định dạng JSON chính xác:

Tên nhóm: {req.groupName}
Đề tài: {req.topic or 'Dự án Công nghệ Thông tin'}
Số lượng thành viên: {len(req.members)}

Danh sách thành viên:
{json.dumps([
    {
        "mssv": m.id,
        "ten": m.name,
        "gpa": m.gpa,
        "chuyen_mon_chinh": m.primarySkill,
        "disc_dominant": m.disc.dominant,
        "disc_scores": m.disc.scores.model_dump(),
        "la_leader": m.isLeaderCandidate
    } for m in req.members
], ensure_ascii=False, indent=2)}

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
"""
        response = gemini_client.models.generate_content(
            model=GEMINI_MODEL,
            contents=prompt,
        )
        
        raw_text = response.text.strip()
        if raw_text.startswith("```json"):
            raw_text = raw_text[7:]
        if raw_text.startswith("```"):
            raw_text = raw_text[3:]
        if raw_text.endswith("```"):
            raw_text = raw_text[:-3]

        parsed = json.loads(raw_text.strip())
        return GroupExplanationSchema(
            summary=parsed.get("summary", rule_exp.summary),
            synergyHighlights=parsed.get("synergyHighlights", rule_exp.synergyHighlights),
            potentialRisks=parsed.get("potentialRisks", rule_exp.potentialRisks),
            recommendations=parsed.get("recommendations", rule_exp.recommendations),
            leadershipAnalysis=parsed.get("leadershipAnalysis", rule_exp.leadershipAnalysis),
            discSynergy=parsed.get("discSynergy", rule_exp.discSynergy),
            skillCoverageSummary=parsed.get("skillCoverageSummary", rule_exp.skillCoverageSummary)
        )
    except Exception as e:
        print(f"[AI Service] Gemini fallback to Rule-based do lỗi: {e}")
        return rule_exp


async def process_lecturer_agent_ai(req: AIAgentLecturerRequest) -> Dict[str, Any]:
    """Phân tích danh sách giảng viên thô và tự động nhận diện Khoa / Bộ môn."""
    raw_content = req.rawText or ""
    detected_dept = ""

    if req.fileName:
        import re
        m = re.search(r'(?:khoa|bm|bo mon)\s+([a-zA-Z0-9_\s\-]+)', req.fileName, re.IGNORECASE)
        if m:
            detected_dept = f"Khoa {m.group(1).strip().title()}"
        else:
            try:
                from backend.database import query_all
                existing_depts = query_all("SELECT DISTINCT department FROM classes WHERE department IS NOT NULL AND department != '' UNION SELECT DISTINCT department FROM accounts WHERE department IS NOT NULL AND department != ''")
                fn_lower = req.fileName.lower()
                for r in existing_depts:
                    dept_name = r.get("department", "")
                    if dept_name and dept_name.lower() in fn_lower:
                        detected_dept = dept_name
                        break
            except Exception:
                pass

    # Nếu có danh sách giảng viên trực tiếp
    if req.lecturers:
        parsed_lecturers = []
        for l in req.lecturers:
            dept = l.department or detected_dept
            parsed_lecturers.append({
                "name": l.name,
                "department": dept,
                "phone": l.phone or "",
                "personalEmail": l.personalEmail or "",
                "notes": l.notes or "Đã chuẩn hóa bởi AI Agent"
            })
        return {
            "success": True,
            "detectedDepartment": detected_dept,
            "lecturers": parsed_lecturers,
            "total": len(parsed_lecturers)
        }

    # Nếu truyền vào raw text và có Gemini
    if gemini_client and raw_content:
        try:
            prompt = f"""
Bạn là AI Agent xử lý dữ liệu nhân sự giảng viên đại học.
Hãy trích xuất danh sách giảng viên từ văn bản thô sau:
"{raw_content}"

Trả về JSON array các object với các trường:
- name: Họ và tên
- department: Khoa / Bộ môn (Ví dụ: "Khoa Công Nghệ Thông Tin")
- phone: Số điện thoại (nếu có, không thì rỗng)
- personalEmail: Email (nếu có, không thì rỗng)
- notes: Ghi chú chuyên môn

Format JSON chỉ là mảng [{{...}}, {{...}}], không thêm giải thích hay markdown code block.
"""
            response = gemini_client.models.generate_content(
                model=GEMINI_MODEL,
                contents=prompt,
            )
            clean_res = response.text.strip()
            if clean_res.startswith("```json"):
                clean_res = clean_res[7:]
            if clean_res.startswith("```"):
                clean_res = clean_res[3:]
            if clean_res.endswith("```"):
                clean_res = clean_res[:-3]

            lecturers_data = json.loads(clean_res.strip())
            return {
                "success": True,
                "detectedDepartment": detected_dept,
                "lecturers": lecturers_data,
                "total": len(lecturers_data)
            }
        except Exception as e:
            print(f"[AI Lecturer Agent] Lỗi xử lý text: {e}")

    # Fallback xử lý tách dòng đơn giản
    lines = [line.strip() for line in raw_content.split("\n") if line.strip()]
    extracted = []
    for line in lines:
        parts = [p.strip() for p in line.split(",") if p.strip()]
        name = parts[0] if parts else line
        dept = parts[1] if len(parts) > 1 else detected_dept
        extracted.append({
            "name": name,
            "department": dept,
            "phone": "0901234567",
            "personalEmail": "",
            "notes": "Nhập tự động qua AI Agent"
        })

    return {
        "success": True,
        "detectedDepartment": detected_dept,
        "lecturers": extracted,
        "total": len(extracted)
    }
