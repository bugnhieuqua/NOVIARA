import io
import re
import unicodedata
import pandas as pd
import numpy as np
from typing import List, Dict, Tuple, Any, Optional
from backend.schemas import StudentSchema, DiscProfile, DiscScores, GenderType

# Từ khóa tìm kiếm để nhận diện sheet sinh viên (từ NOVIARA_python/src/smart_upload.py)
STUDENT_KEYWORDS = [
    'mssv', 'id', 'masv', 'student', 'gpa', 'diem', 'score',
    'disc', 'database', 'web', 'programming', 'oop', 'csdl',
    'sinh vien', 'student_id', 'hoten', 'fullname', 'name', 'ho va ten', 'lop'
]

# Từ điển ánh xạ cột linh hoạt (hỗ trợ cả tiếng Anh và tiếng Việt không dấu/có dấu)
COLUMN_ALIASES = {
    'id': ['mssv', 'id', 'student_id', 'ma_sv', 'masv', 'ma_sinh_vien', 'student_id', 'code', 'ma_hoc_vien', 'ma'],
    'name': ['name', 'hoten', 'ho_ten', 'full_name', 'fullname', 'ten', 'ho_va_ten', 'sinh_vien', 'ten_sinh_vien'],
    'gender': ['gender', 'gioi_tinh', 'gioitinh', 'phai', 'sex'],
    'email': ['email', 'thu_dien_tu', 'mail', 'dia_chi_email'],
    'gpa': ['gpa', 'diem_tb', 'diem_tbtl', 'score_gpa', 'diem_gpa', 'dtb', 'diem'],
    'classId': ['class', 'class_id', 'lop', 'ma_lop', 'malop', 'lop_hoc'],
    'primarySkill': ['kynangchinh', 'ky_nang_chinh', 'primary_skill', 'primaryskill', 'chuyen_mon_chinh', 'chuyenmon', 'skill_1', 'skill1'],
    'secondarySkill': ['kynangphu', 'ky_nang_phu', 'secondary_skill', 'secondaryskill', 'chuyen_mon_phu', 'skill_2', 'skill2'],
    'disc': ['disc', 'tinh_cach', 'tinhcach', 'dominant_disc', 'disc_type'],
    'leader': ['leader', 'ung_vien_leader', 'ungvienleader', 'nhom_truong', 'truong_nhom', 'la_leader', 'is_leader'],
    'frontend': ['frontend', 'fe', 'web', 'diem_web', 'lap_trinh_web', 'react', 'html_css'],
    'backend': ['backend', 'be', 'oop', 'diem_oop', 'lap_trinh', 'python', 'java', 'nodejs'],
    'database': ['database', 'db', 'csdl', 'diem_csdl', 'co_so_du_lieu', 'sql'],
    'uiux': ['uiux', 'ui_ux', 'thiet_ke', 'design', 'figma'],
    'mobile': ['mobile', 'flutter', 'react_native', 'android', 'ios'],
    'devops': ['devops', 'docker', 'cloud', 'ci_cd', 'deploy'],
    'aiml': ['aiml', 'ai', 'ml', 'machine_learning', 'data_science'],
    'qa': ['qa', 'qc', 'tester', 'kiem_thu', 'testing'],
    'presentation': ['presentation', 'thuyet_trinh', 'giao_tiep', 'soft_skills', 'ky_nang_mem'],
    'management': ['management', 'quan_ly', 'quan_tri_du_an'],
    'disc_d': ['disc_d', 'd', 'dominance', 'quyet_doan', 'thong_tri'],
    'disc_i': ['disc_i', 'i', 'influence', 'anh_huong', 'giao_thiep'],
    'disc_s': ['disc_s', 's', 'steadiness', 'kien_dinh', 'on_dinh'],
    'disc_c': ['disc_c', 'c', 'compliance', 'tuan_thu', 'chuan_xac'],
    'phone': ['phone', 'sdt', 'so_dien_thoai', 'dien_thoai', 'mobile_phone'],
}


def strip_accents(text: str) -> str:
    """Loại bỏ hoàn toàn dấu tiếng Việt về dạng ký tự ASCII không dấu chuẩn."""
    if not text:
        return ""
    # Chuyển đổi ký tự đ / Đ đặc thù
    text = str(text).replace('đ', 'd').replace('Đ', 'D')
    norm = unicodedata.normalize('NFKD', text).encode('ascii', 'ignore').decode('utf-8')
    return re.sub(r'[_\s\W]+', '_', norm.lower().strip()).strip('_')



def normalize_column_name(col: str) -> Optional[str]:
    clean = strip_accents(str(col))
    for standard_col, aliases in COLUMN_ALIASES.items():
        if clean in aliases:
            return standard_col
        for alias in aliases:
            if alias == clean or alias in clean or clean in alias:
                return standard_col
    return None


def parse_skill_key(val: str) -> str:
    clean = str(val).lower().strip()
    if 'front' in clean or 'web' in clean or 'react' in clean or 'html' in clean:
        return 'frontend'
    if 'back' in clean or 'oop' in clean or 'api' in clean or 'java' in clean or 'python' in clean:
        return 'backend'
    if 'data' in clean or 'csdl' in clean or 'sql' in clean or 'db' in clean:
        return 'database'
    if 'ui' in clean or 'ux' in clean or 'design' in clean or 'thiet ke' in clean:
        return 'uiux'
    if 'mob' in clean or 'app' in clean or 'flutter' in clean or 'android' in clean or 'ios' in clean:
        return 'mobile'
    if 'devops' in clean or 'cloud' in clean or 'docker' in clean or 'ci' in clean:
        return 'devops'
    if 'ai' in clean or 'ml' in clean or 'machine' in clean or 'data science' in clean:
        return 'aiml'
    if 'qa' in clean or 'qc' in clean or 'test' in clean or 'kiem thu' in clean:
        return 'qa'
    if 'presen' in clean or 'thuyet' in clean or 'giao tiep' in clean or 'pitch' in clean:
        return 'presentation'
    if 'manage' in clean or 'quan ly' in clean or 'lead' in clean:
        return 'management'
    return 'backend'


def parse_student_file(content: bytes, filename: str) -> Dict[str, Any]:
    """Đọc file Excel hoặc CSV và chuyển đổi thành danh sách StudentSchema chuẩn."""
    fn_lower = filename.lower()
    df = None

    if fn_lower.endswith('.csv'):
        for enc in ['utf-8-sig', 'utf-8', 'cp1258', 'latin-1']:
            try:
                df = pd.read_csv(io.BytesIO(content), encoding=enc)
                if not df.empty:
                    break
            except Exception:
                continue
    else:
        # File Excel: Quét toàn bộ sheets để tìm sheet chứa dữ liệu sinh viên tốt nhất
        try:
            xls = pd.ExcelFile(io.BytesIO(content), engine='openpyxl')
            best_sheet = xls.sheet_names[0]
            max_score = -1

            for sname in xls.sheet_names:
                try:
                    sample_df = pd.read_excel(xls, sheet_name=sname, nrows=5)
                    score = 0
                    cols_str = " ".join([str(c).lower() for c in sample_df.columns])
                    for kw in STUDENT_KEYWORDS:
                        if kw in cols_str:
                            score += 1
                    if score > max_score:
                        max_score = score
                        best_sheet = sname
                except Exception:
                    pass

            df = pd.read_excel(xls, sheet_name=best_sheet)
        except Exception as ex:
            # Fallback đọc cơ bản
            df = pd.read_excel(io.BytesIO(content))

    if df is None or df.empty:
        raise ValueError("Tệp tải lên rỗng hoặc không chứa dữ liệu hợp lệ.")

    # Ánh xạ tên cột thông minh
    mapped_columns: Dict[str, str] = {}
    for col in df.columns:
        std = normalize_column_name(str(col))
        if std and std not in mapped_columns.values():
            mapped_columns[col] = std

    df = df.rename(columns=mapped_columns)

    students: List[StudentSchema] = []
    errors: List[str] = []

    for idx, row in df.iterrows():
        try:
            # 1. ID
            raw_id = str(row.get('id', '')).strip()
            if not raw_id or raw_id == 'nan' or raw_id == 'None':
                raw_id = f"SV{2024000 + idx + 1}"

            # 2. Name
            raw_name = str(row.get('name', '')).strip()
            if not raw_name or raw_name == 'nan' or raw_name == 'None':
                raw_name = f"Sinh viên {raw_id}"

            # 3. GPA
            raw_gpa_val = str(row.get('gpa', '3.2')).replace(',', '.').strip()
            try:
                raw_gpa = float(raw_gpa_val)
                if raw_gpa > 4.0 and raw_gpa <= 10.0:
                    raw_gpa = round((raw_gpa / 10.0) * 4.0, 2)
            except Exception:
                raw_gpa = 3.2

            # 4. Gender
            gender_val = str(row.get('gender', 'Nam')).strip().lower()
            gender: GenderType = 'Nữ' if 'nữ' in gender_val or 'female' in gender_val or 'f' == gender_val or 'nu' == gender_val else 'Nam'

            # 5. Email
            email = str(row.get('email', '')).strip()
            if not email or email == 'nan' or email == 'None':
                slug_name = re.sub(r'[^a-zA-Z0-9]', '', strip_accents(raw_name))
                email = f"{slug_name}.{raw_id.lower()}@NOVIARA.edu.vn"

            # 6. Class ID
            class_id = str(row.get('classId', '')).strip()
            if not class_id or class_id == 'nan' or class_id == 'None':
                class_id = "CNTT-K24A"

            # 7. Primary & Secondary Skill
            primary_skill = 'frontend'
            secondary_skill = 'backend'

            if 'primarySkill' in df.columns and pd.notna(row.get('primarySkill')):
                primary_skill = parse_skill_key(str(row.get('primarySkill')))
            if 'secondarySkill' in df.columns and pd.notna(row.get('secondarySkill')):
                secondary_skill = parse_skill_key(str(row.get('secondarySkill')))

            # 8. Kỹ năng ma trận (1-5)
            skills = {
                'frontend': 3.0, 'backend': 3.0, 'database': 3.0, 'uiux': 2.5,
                'mobile': 2.5, 'devops': 2.5, 'aiml': 2.5, 'qa': 3.0,
                'presentation': 3.0, 'management': 3.0
            }

            for sk in ['frontend', 'backend', 'database', 'uiux', 'mobile', 'devops', 'aiml', 'qa', 'presentation', 'management']:
                val = row.get(sk, None)
                if pd.notna(val):
                    try:
                        v = float(str(val).replace(',', '.'))
                        if v > 5.0:
                            v = v / 2.0
                        skills[sk] = round(max(1.0, min(5.0, v)), 1)
                    except Exception:
                        pass

            # Nâng cao điểm kỹ năng chính & phụ
            skills[primary_skill] = max(skills.get(primary_skill, 3.0), 4.5)
            skills[secondary_skill] = max(skills.get(secondary_skill, 3.0), 4.0)

            # 9. DISC Profile (Ưu tiên từ cột dữ liệu; nếu thiếu sẽ phân loại tự nhiên dựa trên năng lực & lãnh đạo)
            dom_disc = None
            if 'disc' in df.columns and pd.notna(row.get('disc')):
                d_char = str(row.get('disc')).upper().strip()
                if 'D' in d_char: dom_disc = 'D'
                elif 'I' in d_char: dom_disc = 'I'
                elif 'S' in d_char: dom_disc = 'S'
                elif 'C' in d_char: dom_disc = 'C'

            if not dom_disc:
                # Phân loại thông minh để lớp học có tỷ lệ DISC đa dạng, tránh 100% nhóm S
                if skills.get('management', 0) >= 4.0 or raw_gpa >= 3.65:
                    dom_disc = 'D'  # Quyết đoán / Tiềm năng lãnh đạo
                elif primary_skill in ['presentation', 'uiux'] or skills.get('presentation', 0) >= 4.0:
                    dom_disc = 'I'  # Ảnh hưởng / Giao tiếp & Sáng tạo
                elif primary_skill in ['database', 'qa', 'aiml'] or skills.get('qa', 0) >= 4.0:
                    dom_disc = 'C'  # Chuẩn xác / Phân tích chi tiết & Chất lượng
                else:
                    # Phân bổ đều giữa các nhóm tính cách
                    fallback_cycle = ['S', 'I', 'D', 'C', 'S']
                    dom_disc = fallback_cycle[idx % len(fallback_cycle)]

            d_val = float(str(row.get('disc_d', 85 if dom_disc == 'D' else 45)).replace(',', '.')) if pd.notna(row.get('disc_d', None)) else (85.0 if dom_disc == 'D' else 45.0)
            i_val = float(str(row.get('disc_i', 85 if dom_disc == 'I' else 45)).replace(',', '.')) if pd.notna(row.get('disc_i', None)) else (85.0 if dom_disc == 'I' else 45.0)
            s_val = float(str(row.get('disc_s', 85 if dom_disc == 'S' else 45)).replace(',', '.')) if pd.notna(row.get('disc_s', None)) else (85.0 if dom_disc == 'S' else 45.0)
            c_val = float(str(row.get('disc_c', 85 if dom_disc == 'C' else 45)).replace(',', '.')) if pd.notna(row.get('disc_c', None)) else (85.0 if dom_disc == 'C' else 45.0)

            disc_profile = DiscProfile(
                dominant=dom_disc,
                scores=DiscScores(D=d_val, I=i_val, S=s_val, C=c_val)
            )

            # 10. Leader candidate
            is_leader = False
            if 'leader' in df.columns and pd.notna(row.get('leader')):
                l_str = str(row.get('leader')).lower().strip()
                is_leader = l_str in ['có', 'co', 'true', '1', 'yes', 'y']
            else:
                is_leader = skills.get('management', 0) >= 4.0 or d_val >= 75 or raw_gpa >= 3.6

            student = StudentSchema(
                id=raw_id,
                name=raw_name,
                email=email,
                gender=gender,
                gpa=raw_gpa,
                classId=class_id,
                skills=skills,
                primarySkill=primary_skill,
                secondarySkill=secondary_skill,
                disc=disc_profile,
                isLeaderCandidate=is_leader,
                phone=str(row.get('phone', '')).strip() if pd.notna(row.get('phone', None)) else None,
                notes="Nạp từ tệp qua Smart Preprocessing AI"
            )
            students.append(student)

        except Exception as ex:
            errors.append(f"Dòng {idx + 2}: {str(ex)}")

    return {
        "success": True,
        "students": [s.model_dump() for s in students],
        "totalCount": len(students),
        "mappedColumns": mapped_columns,
        "errors": errors
    }
