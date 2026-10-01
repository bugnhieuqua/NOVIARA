# -*- coding: utf-8 -*-
"""
Script tái tạo 2 file DOCX với SƠ ĐỒ HÌNH HỌA TRỰC QUAN NHÚNG ĐẦY ĐỦ:
1. File/File dữ liệu/Tong_quan_va_Dac_ta_CSDL_NOVIARA.docx
   - Nhúng hình: Hình 1.1: Sơ đồ Thực thể Quan hệ (ERD) Toàn Diện 13 Bảng CSDL
2. File/File dữ liệu/Phan_tich_Thiet_ke_He_thong_va_Usecase_NOVIARA.docx
   - Nhúng hình: Hình 3.1: Sơ đồ Tác nhân & Use Case Tổng Thể
   - Nhúng hình: Hình 5.1: Sơ đồ Lớp (Class Diagram)
   - Nhúng hình: Hình 6.1: Sơ đồ Trình tự Đăng nhập PBKDF2 (Seq-01)
   - Nhúng hình: Hình 6.2: Sơ đồ Trình tự Nạp Excel & Lưu vết tệp (Seq-02)
   - Nhúng hình: Hình 6.3: Sơ đồ Trình tự Khảo sát DISC (Seq-03)
   - Nhúng hình: Hình 6.4: Sơ đồ Trình tự Thuật toán GA (Seq-04)
   - Nhúng hình: Hình 6.5: Sơ đồ Trình tự Đổi Trưởng nhóm (Seq-05)
   - Nhúng hình: Hình 6.6: Sơ đồ Trình tự Công bố & Tra cứu (Seq-06)
"""
import os
import sys
if sys.stdout:
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass
from pathlib import Path
import docx
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import parse_xml
from docx.oxml.ns import nsdecls

img_dir = Path("File/File dữ liệu/images")
out_dir = Path("File/File dữ liệu")

def set_cell_background(cell, color_hex):
    shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{color_hex}"/>')
    cell._tc.get_or_add_tcPr().append(shd)

def set_cell_margins(cell, top=100, bottom=100, left=140, right=140):
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = parse_xml(f'<w:tcMar {nsdecls("w")}><w:top w:w="{top}" w:type="dxa"/><w:bottom w:w="{bottom}" w:type="dxa"/><w:left w:w="{left}" w:type="dxa"/><w:right w:w="{right}" w:type="dxa"/></w:tcMar>')
    tcPr.append(tcMar)

def set_table_borders(table, color="cbd5e1"):
    tblPr = table._tbl.tblPr
    tblBorders = parse_xml(
        f'<w:tblBorders {nsdecls("w")}>'
        f'<w:top w:val="single" w:sz="6" w:space="0" w:color="{color}"/>'
        f'<w:bottom w:val="single" w:sz="6" w:space="0" w:color="{color}"/>'
        f'<w:left w:val="none"/>'
        f'<w:right w:val="none"/>'
        f'<w:insideH w:val="single" w:sz="4" w:space="0" w:color="{color}"/>'
        f'<w:insideV w:val="none"/>'
        f'</w:tblBorders>'
    )
    tblPr.append(tblBorders)

def add_header(doc, title, subtitle):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(0)
    p.paragraph_format.space_after = Pt(4)
    run_title = p.add_run(title)
    run_title.font.name = 'Arial'
    run_title.font.size = Pt(21)
    run_title.font.bold = True
    run_title.font.color.rgb = RGBColor(15, 23, 42)

    p_sub = doc.add_paragraph()
    p_sub.paragraph_format.space_after = Pt(16)
    run_sub = p_sub.add_run(subtitle)
    run_sub.font.name = 'Arial'
    run_sub.font.size = Pt(11.5)
    run_sub.font.italic = True
    run_sub.font.color.rgb = RGBColor(79, 70, 229)

def add_h1(doc, text):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(16)
    p.paragraph_format.space_after = Pt(6)
    p.paragraph_format.keep_with_next = True
    run = p.add_run(text)
    run.font.name = 'Arial'
    run.font.size = Pt(14)
    run.font.bold = True
    run.font.color.rgb = RGBColor(30, 41, 59)

def add_h2(doc, text):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(12)
    p.paragraph_format.space_after = Pt(4)
    p.paragraph_format.keep_with_next = True
    run = p.add_run(text)
    run.font.name = 'Arial'
    run.font.size = Pt(12)
    run.font.bold = True
    run.font.color.rgb = RGBColor(51, 65, 85)

def add_p(doc, text, bold_prefix=""):
    p = doc.add_paragraph()
    p.paragraph_format.space_after = Pt(5)
    p.paragraph_format.line_spacing = 1.15
    if bold_prefix:
        r_pre = p.add_run(bold_prefix)
        r_pre.font.name = 'Arial'
        r_pre.font.size = Pt(10)
        r_pre.font.bold = True
        r_pre.font.color.rgb = RGBColor(15, 23, 42)
    run = p.add_run(text)
    run.font.name = 'Arial'
    run.font.size = Pt(10)
    run.font.color.rgb = RGBColor(30, 41, 59)
    return p

def add_diagram_image(doc, filename, caption, width_inches=6.2):
    file_path = img_dir / filename
    if not file_path.exists():
        print(f"Canh bao: Khong tim thay anh {file_path}")
        return
    p_img = doc.add_paragraph()
    p_img.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_img.paragraph_format.space_before = Pt(8)
    p_img.paragraph_format.space_after = Pt(4)
    run_img = p_img.add_run()
    run_img.add_picture(str(file_path), width=Inches(width_inches))

    p_cap = doc.add_paragraph()
    p_cap.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_cap.paragraph_format.space_before = Pt(2)
    p_cap.paragraph_format.space_after = Pt(12)
    r_cap = p_cap.add_run(caption)
    r_cap.font.name = 'Arial'
    r_cap.font.size = Pt(9.5)
    r_cap.font.italic = True
    r_cap.font.bold = True
    r_cap.font.color.rgb = RGBColor(67, 56, 202) # Indigo 700

def format_table(table, col_widths, headers, rows):
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_borders(table, "cbd5e1")

    # Header
    hdr_cells = table.rows[0].cells
    for i, title in enumerate(headers):
        hdr_cells[i].text = title
        set_cell_background(hdr_cells[i], "1e293b")
        set_cell_margins(hdr_cells[i], top=110, bottom=110, left=130, right=130)
        p = hdr_cells[i].paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        for r in p.runs:
            r.font.name = 'Arial'
            r.font.size = Pt(9.5)
            r.font.bold = True
            r.font.color.rgb = RGBColor(255, 255, 255)

    # Body
    for r_idx, row_data in enumerate(rows):
        row_cells = table.rows[r_idx + 1].cells
        bg_color = "f8fafc" if r_idx % 2 == 1 else "ffffff"
        for c_idx, val in enumerate(row_data):
            row_cells[c_idx].text = str(val)
            set_cell_background(row_cells[c_idx], bg_color)
            set_cell_margins(row_cells[c_idx], top=80, bottom=80, left=110, right=110)
            p = row_cells[c_idx].paragraphs[0]
            if len(col_widths) > 2 and c_idx == 0:
                p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            else:
                p.alignment = WD_ALIGN_PARAGRAPH.LEFT
            for r in p.runs:
                r.font.name = 'Arial'
                r.font.size = Pt(9)
                r.font.color.rgb = RGBColor(30, 41, 59)

    for row in table.rows:
        for c_idx, w in enumerate(col_widths):
            row.cells[c_idx].width = Inches(w)

def format_use_case_table(table, uc_data):
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_borders(table, "94a3b8")
    col_widths = [1.8, 5.2]

    for r_idx, (label, value) in enumerate(uc_data):
        row_cells = table.rows[r_idx].cells
        row_cells[0].text = label
        row_cells[1].text = value

        set_cell_background(row_cells[0], "f1f5f9")
        set_cell_margins(row_cells[0], top=90, bottom=90, left=120, right=120)
        p0 = row_cells[0].paragraphs[0]
        p0.alignment = WD_ALIGN_PARAGRAPH.LEFT
        for r in p0.runs:
            r.font.name = 'Arial'
            r.font.size = Pt(9.5)
            r.font.bold = True
            r.font.color.rgb = RGBColor(15, 23, 42)

        set_cell_background(row_cells[1], "ffffff")
        set_cell_margins(row_cells[1], top=90, bottom=90, left=120, right=120)
        p1 = row_cells[1].paragraphs[0]
        p1.alignment = WD_ALIGN_PARAGRAPH.LEFT
        for r in p1.runs:
            r.font.name = 'Arial'
            r.font.size = Pt(9)
            r.font.color.rgb = RGBColor(30, 41, 59)

        row_cells[0].width = Inches(col_widths[0])
        row_cells[1].width = Inches(col_widths[1])

# =============================================================================
# 1. TẠO FILE DOCX CSDL CÓ NHÚNG SƠ ĐỒ ERD
# =============================================================================
def build_database_document_with_diagram():
    doc = Document()
    for section in doc.sections:
        section.top_margin = Inches(1.0)
        section.bottom_margin = Inches(1.0)
        section.left_margin = Inches(1.0)
        section.right_margin = Inches(1.0)

    add_header(
        doc,
        "TỔNG QUAN & ĐẶC TẢ CHI TIẾT CƠ SỞ DỮ LIỆU",
        "Hệ Thống Phân Nhóm Tự Động Bằng AI & Giải Thuật Di Truyền NOVIARA (CSDL SQLite 3NF)"
    )

    add_h1(doc, "1. Tổng Quan Kiến Trúc Cơ Sở Dữ Liệu & Sơ Đồ ERD")
    add_p(doc, 
        "Hệ thống NOVIARA sử dụng Cơ sở dữ liệu quan hệ trung tâm SQLite (tệp lưu trữ: backend/data/smartgroup.db) "
        "được chuẩn hóa toàn diện theo dạng chuẩn 3 (3NF - Third Normal Form). Mô hình liên kết bền vững đảm bảo tính toàn vẹn "
        "tham chiếu thực thể, khả năng đọc ghi song song qua WAL mode và phục vụ tối ưu cho giải thuật di truyền GA."
    )

    add_h2(doc, "1.1. Sơ Đồ Thực Thể Quan Hệ CSDL (ERD Diagram)")
    add_p(doc, 
        "Dưới đây là sơ đồ kiến trúc thực thể quan hệ (Entity Relationship Diagram - ERD) thể hiện đầy đủ 13 bảng dữ liệu "
        "cùng các mối quan hệ 1-1, 1-N, N-N, các khóa chính (PK), khóa ngoại (FK) và liên kết nghiệp vụ:"
    )
    # NHÚNG HÌNH ERD
    add_diagram_image(
        doc, 
        "erd_noviara_csdl.png", 
        "Hình 1.1: Sơ đồ Thực thể Quan hệ (ERD) Toàn Diện 13 Bảng CSDL Hệ Thống NOVIARA (Chuẩn 3NF)",
        width_inches=6.4
    )

    add_h2(doc, "1.2. Các Nguyên Tắc Thiết Kế Kỹ Thuật Cốt Lõi")
    add_p(doc, "Tự động kích hoạt 'PRAGMA foreign_keys = ON;' trên mọi kết nối để bảo toàn toàn vẹn tham chiếu.", "• Toàn vẹn tham chiếu khóa ngoại: ")
    add_p(doc, "Sử dụng chế độ 'PRAGMA journal_mode = WAL;' (Write-Ahead Logging) cho phép các tác vụ đọc và ghi diễn ra đồng thời mà không bị khóa bảng.", "• Cơ chế WAL (Write-Ahead Logging): ")
    add_p(doc, "Toàn bộ mật khẩu của Quản trị viên và Giảng viên được băm một chiều an toàn bằng thuật toán PBKDF2-HMAC-SHA256 (100,000 vòng lặp) kèm Salt ngẫu nhiên.", "• Bảo mật mật khẩu PBKDF2: ")
    add_p(doc, "Hồ sơ năng lực kỹ thuật và điểm trắc nghiệm DISC được cấu trúc hóa trong bảng quan hệ, đồng thời lưu trữ snapshot JSON để hỗ trợ phân tích AI tức thời.", "• Linh hoạt hồ sơ sinh viên: ")
    add_p(doc, "Mọi tệp tải lên (Excel, CSV) đều được lưu trữ nguyên bản (BLOB) kèm metadata và mã lớp học để phục vụ tra cứu và kiểm toán.", "• Lưu vết tệp toàn diện (File Tracking): ")

    add_h2(doc, "1.3. Danh Mục 13 Bảng Thực Thể Của Hệ Thống")
    headers_overview = ["STT", "Tên Bảng (Table)", "Mục Đích & Phạm Vi Lưu Trữ", "Quan Hệ Chính"]
    widths_overview = [0.5, 1.8, 3.2, 1.5]
    rows_overview = [
        ["1", "departments", "Quản lý danh sách Khoa / Đơn vị đào tạo trong trường đại học", "1 - N với accounts, classes"],
        ["2", "accounts", "Tài khoản Quản trị viên (Admin) và Giảng viên (Lecturer)", "1 - N với classes, sessions"],
        ["3", "classes", "Lớp học phần cần phân nhóm và trạng thái mở cổng khảo sát", "1 - N với students, sessions"],
        ["4", "students", "Hồ sơ sinh viên toàn trường (MSSV, Họ tên, GPA, DISC, Kỹ năng)", "1 - N với class_students"],
        ["5", "class_students", "Phân bổ sinh viên vào từng lớp học phần cụ thể và điểm kỹ thuật", "N - 1 với classes, students"],
        ["6", "survey_submissions", "Kết quả bài làm khảo sát DISC và trắc nghiệm chuyên môn trực tuyến", "N - 1 với classes, students"],
        ["7", "grouping_sessions", "Các phiên phân nhóm đã thực thi bởi giải thuật di truyền (GA)", "1 - N với groups, configs"],
        ["8", "session_configs", "Bộ cấu hình trọng số fitness và các ràng buộc cứng/mềm cho phiên GA", "1 - 1 với grouping_sessions"],
        ["9", "groups", "Danh sách nhóm sinh viên tối ưu được tạo ra trong từng phiên", "1 - N với group_members"],
        ["10", "group_members", "Chi tiết thành viên trong từng nhóm, vai trò và đánh dấu Trưởng nhóm", "N - 1 với groups, students"],
        ["11", "group_explanations", "Bản phân tích sư phạm AI, đánh giá tương thích và lời khuyên nhóm", "1 - 1 với groups"],
        ["12", "uploaded_files", "Lưu vết toàn bộ tệp Excel/CSV đã nạp vào CSDL kèm mã lớp và dung lượng", "N - 1 với classes"],
        ["13", "system_settings", "Các tham số cấu hình toàn cục hệ thống (Model AI, giới hạn sinh viên)", "Độc lập toàn cục"]
    ]
    t_over = doc.add_table(rows=len(rows_overview)+1, cols=4)
    format_table(t_over, widths_overview, headers_overview, rows_overview)

    # Phần 2: Đặc tả chi tiết 13 bảng
    add_h1(doc, "2. Từ Điển Dữ Liệu & Bảng Đặc Tả Chi Tiết 13 Bảng")
    h_col = ["STT", "Tên Trường", "Kiểu Dữ Liệu", "Khóa", "Null", "Mặc Định", "Mô Tả & Ý Nghĩa Nghiệp Vụ"]
    w_col = [0.4, 1.4, 1.1, 0.6, 0.5, 0.9, 2.1]

    # departments
    add_h2(doc, "2.1. Bảng departments (Khoa / Đơn vị đào tạo)")
    r_dept = [
        ["1", "id", "VARCHAR(50)", "PK", "No", "", "Mã định danh khoa (vd: KHOA-CNTT, KHOA-QTKD)"],
        ["2", "code", "VARCHAR(50)", "", "Yes", "NULL", "Mã viết tắt của khoa (vd: FIT, FBA)"],
        ["3", "name", "VARCHAR(150)", "", "No", "", "Tên đầy đủ của khoa (vd: Khoa Công Nghệ Thông Tin)"],
        ["4", "description", "TEXT", "", "Yes", "NULL", "Mô tả chuyên môn hoặc giới thiệu về khoa"],
        ["5", "created_at", "DATETIME", "", "Yes", "CURRENT_TIMESTAMP", "Thời điểm tạo bản ghi trong hệ thống"]
    ]
    t_dept = doc.add_table(rows=len(r_dept)+1, cols=7)
    format_table(t_dept, w_col, h_col, r_dept)

    # accounts
    add_h2(doc, "2.2. Bảng accounts (Tài khoản Quản trị viên & Giảng viên)")
    r_acc = [
        ["1", "id", "VARCHAR(50)", "PK", "No", "", "Mã tài khoản (vd: ADMIN-MASTER, GV-17890001)"],
        ["2", "username", "VARCHAR(50)", "UQ", "No", "", "Tên đăng nhập hệ thống (duy nhất, viết thường)"],
        ["3", "password_hash", "VARCHAR(255)", "", "No", "", "Chuỗi băm mật khẩu PBKDF2 (100,000 vòng lặp)"],
        ["4", "name", "VARCHAR(100)", "", "No", "", "Họ và tên đầy đủ của người dùng"],
        ["5", "email", "VARCHAR(100)", "UQ", "No", "", "Email liên hệ chính thức của cán bộ/giảng viên"],
        ["6", "phone", "VARCHAR(20)", "", "Yes", "NULL", "Số điện thoại liên lạc"],
        ["7", "department", "VARCHAR(150)", "", "Yes", "NULL", "Tên khoa / bộ môn trực thuộc"],
        ["8", "role", "VARCHAR(20)", "", "No", "'lecturer'", "Vai trò: 'admin' (Quản trị viên) hoặc 'lecturer' (Giảng viên)"],
        ["9", "is_default_password", "BOOLEAN", "", "Yes", "1", "1: Đang dùng mật khẩu khởi tạo; 0: Đã đổi mật khẩu"],
        ["10", "must_change_password", "BOOLEAN", "", "Yes", "1", "Yêu cầu bắt buộc đổi mật khẩu trong lần đăng nhập đầu"],
        ["11", "created_at", "DATETIME", "", "Yes", "CURRENT_TIMESTAMP", "Thời điểm tạo tài khoản"],
        ["12", "last_login", "DATETIME", "", "Yes", "NULL", "Thời điểm đăng nhập thành công gần nhất"]
    ]
    t_acc = doc.add_table(rows=len(r_acc)+1, cols=7)
    format_table(t_acc, w_col, h_col, r_acc)

    # classes
    add_h2(doc, "2.3. Bảng classes (Lớp học phần & Cổng Khảo sát)")
    r_cls = [
        ["1", "id", "VARCHAR(50)", "PK", "No", "", "Mã lớp học phần trong CSDL (vd: CLASS-01, CLASS-02)"],
        ["2", "code", "VARCHAR(50)", "", "No", "", "Mã môn học/học phần đào tạo (vd: DSCSN, QT-K26)"],
        ["3", "name", "VARCHAR(150)", "", "No", "", "Tên lớp học phần (vd: Đồ án cơ sở ngành, Toán vĩ mô)"],
        ["4", "semester", "VARCHAR(50)", "", "Yes", "'Đại học'", "Học kỳ giảng dạy (vd: Học kỳ 1 - 2024-2025)"],
        ["5", "department", "VARCHAR(150)", "", "Yes", "NULL", "Khoa phụ trách chuyên môn của môn học"],
        ["6", "description", "TEXT", "", "Yes", "NULL", "Mục tiêu đồ án hoặc yêu cầu đề cương học phần"],
        ["7", "lecturer_id", "VARCHAR(50)", "FK", "Yes", "'GV-DEFAULT'", "Khóa ngoại tham chiếu accounts(id) của giảng viên"],
        ["8", "is_survey_active", "BOOLEAN", "", "Yes", "0", "1: Đang mở cổng khảo sát cho SV; 0: Đã đóng cổng"],
        ["9", "survey_title", "VARCHAR(200)", "", "Yes", "NULL", "Tiêu đề biểu mẫu khảo sát hiển thị cho sinh viên"],
        ["10", "created_at", "DATETIME", "", "Yes", "CURRENT_TIMESTAMP", "Thời điểm tạo lớp học"]
    ]
    t_cls = doc.add_table(rows=len(r_cls)+1, cols=7)
    format_table(t_cls, w_col, h_col, r_cls)

    # students
    add_h2(doc, "2.4. Bảng students (Hồ sơ Sinh viên toàn trường)")
    r_stu = [
        ["1", "student_id", "VARCHAR(50)", "PK", "No", "", "Mã số sinh viên (MSSV, vd: SV001, SV2024001)"],
        ["2", "name", "VARCHAR(100)", "", "No", "", "Họ và tên đầy đủ của sinh viên"],
        ["3", "email", "VARCHAR(100)", "", "Yes", "NULL", "Email của sinh viên"],
        ["4", "phone", "VARCHAR(20)", "", "Yes", "NULL", "Số điện thoại của sinh viên"],
        ["5", "gender", "VARCHAR(10)", "", "Yes", "'Nam'", "Giới tính sinh viên: 'Nam' hoặc 'Nữ'"],
        ["6", "gpa", "REAL", "", "Yes", "3.0", "Điểm trung bình tích lũy thang 4 (0.0 - 4.0)"],
        ["7", "primary_skill", "VARCHAR(50)", "", "Yes", "'backend'", "Kỹ năng chuyên môn chính (frontend, backend, uiux...)"],
        ["8", "secondary_skill", "VARCHAR(50)", "", "Yes", "'frontend'", "Kỹ năng bổ trợ (database, devops, mobile, qa...)"],
        ["9", "disc_dominant", "VARCHAR(10)", "", "Yes", "'S'", "Nhóm tính cách DISC áp đảo: 'D', 'I', 'S', 'C'"],
        ["10", "is_leader_candidate", "BOOLEAN", "", "Yes", "0", "1: Có nguyện vọng/năng lực làm Trưởng nhóm; 0: Thành viên"],
        ["11", "profile_json", "TEXT", "", "Yes", "NULL", "JSON snapshot đầy đủ 10 kỹ năng và 4 điểm số DISC"],
        ["12", "avatar", "VARCHAR(255)", "", "Yes", "NULL", "Đường dẫn ảnh đại diện hoặc avatar generator"],
        ["13", "created_at", "DATETIME", "", "Yes", "CURRENT_TIMESTAMP", "Thời điểm nạp hồ sơ sinh viên vào hệ thống"]
    ]
    t_stu = doc.add_table(rows=len(r_stu)+1, cols=7)
    format_table(t_stu, w_col, h_col, r_stu)

    # class_students
    add_h2(doc, "2.5. Bảng class_students (Ghi danh Sinh viên theo Lớp học phần)")
    r_cs = [
        ["1", "id", "INTEGER", "PK", "No", "AUTO", "Khóa chính tự tăng"],
        ["2", "class_id", "VARCHAR(50)", "FK", "No", "", "Khóa ngoại tham chiếu classes(id) - ON DELETE CASCADE"],
        ["3", "student_id", "VARCHAR(50)", "FK", "No", "", "Khóa ngoại tham chiếu students(student_id) - ON UPDATE CASCADE"],
        ["4", "gpa", "REAL", "", "Yes", "3.0", "Điểm GPA áp dụng riêng cho học phần này"],
        ["5", "skill_frontend", "REAL", "", "Yes", "3.0", "Điểm năng lực Frontend (thang điểm 1 - 5)"],
        ["6", "skill_backend", "REAL", "Yes", "Yes", "3.0", "Điểm năng lực Backend (thang điểm 1 - 5)"],
        ["7", "skill_database", "REAL", "", "Yes", "3.0", "Điểm năng lực Cơ sở dữ liệu (thang điểm 1 - 5)"],
        ["8", "skill_uiux", "REAL", "", "Yes", "3.0", "Điểm năng lực Thiết kế UI/UX (thang điểm 1 - 5)"],
        ["9", "skill_mobile", "REAL", "", "Yes", "3.0", "Điểm năng lực Lập trình Mobile (thang điểm 1 - 5)"],
        ["10", "skill_devops", "REAL", "", "Yes", "3.0", "Điểm năng lực Hạ tầng & DevOps (thang điểm 1 - 5)"],
        ["11", "skill_aiml", "REAL", "", "Yes", "3.0", "Điểm năng lực Trí tuệ nhân tạo (thang điểm 1 - 5)"],
        ["12", "skill_qa", "REAL", "", "Yes", "3.0", "Điểm năng lực Kiểm thử phần mềm (thang điểm 1 - 5)"],
        ["13", "skill_presentation", "REAL", "", "Yes", "3.0", "Điểm kỹ năng Thuyết trình & Báo cáo (thang điểm 1 - 5)"],
        ["14", "skill_management", "REAL", "", "Yes", "3.0", "Điểm kỹ năng Quản lý & Điều phối (thang điểm 1 - 5)"],
        ["15", "source", "VARCHAR(20)", "", "Yes", "'import_excel'", "Nguồn nạp dữ liệu: 'import_excel' hoặc 'survey_submission'"],
        ["16", "created_at", "DATETIME", "", "Yes", "CURRENT_TIMESTAMP", "Thời điểm ghi danh sinh viên vào lớp"]
    ]
    t_cs = doc.add_table(rows=len(r_cs)+1, cols=7)
    format_table(t_cs, w_col, h_col, r_cs)

    # survey_submissions
    add_h2(doc, "2.6. Bảng survey_submissions (Kết quả Khảo sát DISC Trực tuyến)")
    r_sub = [
        ["1", "id", "VARCHAR(50)", "PK", "No", "", "Mã bài nộp khảo sát (vd: SUB-1789380001)"],
        ["2", "class_id", "VARCHAR(50)", "FK", "No", "", "Khóa ngoại tham chiếu classes(id) mà sinh viên nộp bài"],
        ["3", "student_id", "VARCHAR(50)", "FK", "No", "", "Khóa ngoại tham chiếu students(student_id)"],
        ["4", "student_name", "VARCHAR(100)", "", "No", "", "Họ tên sinh viên tại thời điểm nộp bài"],
        ["5", "email", "VARCHAR(100)", "", "Yes", "NULL", "Email sinh viên cung cấp"],
        ["6", "phone", "VARCHAR(20)", "", "Yes", "NULL", "Số điện thoại sinh viên"],
        ["7", "gender", "VARCHAR(10)", "", "Yes", "'Nam'", "Giới tính: 'Nam' hoặc 'Nữ'"],
        ["8", "gpa", "REAL", "", "Yes", "3.0", "Điểm GPA tự khai báo"],
        ["9", "primary_skill", "VARCHAR(50)", "", "No", "", "Chuyên môn chính tự đánh giá cao nhất"],
        ["10", "secondary_skill", "VARCHAR(50)", "", "No", "", "Chuyên môn phụ tự đánh giá"],
        ["11", "skills_json", "TEXT", "", "No", "", "JSON chứa điểm đánh giá chi tiết 10 kỹ năng chuyên môn"],
        ["12", "disc_scores_json", "TEXT", "", "No", "", "JSON chứa điểm thành phần trắc nghiệm 4 nhóm D, I, S, C"],
        ["13", "disc_dominant", "VARCHAR(10)", "", "No", "", "Nhóm tính cách DISC cao nhất xác định từ bài làm"],
        ["14", "is_leader_candidate", "BOOLEAN", "", "Yes", "0", "Nguyện vọng làm Trưởng nhóm trong đồ án"],
        ["15", "topic_preferences_json", "TEXT", "", "Yes", "NULL", "JSON mảng các chủ đề/đề tài đồ án mong muốn tham gia"],
        ["16", "preferred_peers_json", "TEXT", "", "Yes", "NULL", "JSON mảng MSSV bạn bè muốn ghép cùng nhóm"],
        ["17", "avoided_peers_json", "TEXT", "", "Yes", "NULL", "JSON mảng MSSV không mong muốn làm việc chung"],
        ["18", "raw_answers_json", "TEXT", "", "Yes", "NULL", "JSON lưu vết toàn bộ đáp án 12 câu trắc nghiệm DISC"],
        ["19", "submitted_at", "DATETIME", "", "Yes", "CURRENT_TIMESTAMP", "Thời điểm hoàn thành và gửi bài khảo sát"]
    ]
    t_sub = doc.add_table(rows=len(r_sub)+1, cols=7)
    format_table(t_sub, w_col, h_col, r_sub)

    # grouping_sessions
    add_h2(doc, "2.7. Bảng grouping_sessions (Phiên Phân Nhóm GA)")
    r_sess = [
        ["1", "id", "VARCHAR(50)", "PK", "No", "", "Mã phiên phân nhóm (vd: GA-859999, GA-1789396949)"],
        ["2", "class_id", "VARCHAR(50)", "FK", "Yes", "NULL", "Khóa ngoại tham chiếu classes(id) - Lớp được chia nhóm"],
        ["3", "class_name", "VARCHAR(150)", "", "Yes", "NULL", "Tên lớp học phần hiển thị nhanh (vd: Đồ án, Toán vĩ mô)"],
        ["4", "title", "VARCHAR(200)", "", "No", "", "Tiêu đề phiên (vd: Phiên phân nhóm Đồ án — Đồ án)"],
        ["5", "status", "VARCHAR(20)", "", "Yes", "'draft'", "Trạng thái: 'published' (Công bố cho SV) | 'draft' (Bản nháp)"],
        ["6", "total_students", "INTEGER", "", "No", "0", "Tổng số sinh viên tham gia phân nhóm trong phiên"],
        ["7", "overall_fitness", "REAL", "", "No", "0.0", "Điểm fitness tổng thể của quần thể GA (thang 0 - 100%)"],
        ["8", "execution_time_ms", "INTEGER", "", "Yes", "0", "Thời gian thuật toán GA hội tụ và hoàn tất (mili-giây)"],
        ["9", "convergence_history_json", "TEXT", "", "Yes", "NULL", "JSON lịch sử điểm fitness qua từng thế hệ để vẽ đồ thị"],
        ["10", "google_sheets_url", "VARCHAR(255)", "", "Yes", "NULL", "Đường dẫn Google Sheets xuất bản dữ liệu tự động"],
        ["11", "created_at", "DATETIME", "", "Yes", "CURRENT_TIMESTAMP", "Thời điểm khởi tạo phiên phân nhóm"],
        ["12", "updated_at", "DATETIME", "", "Yes", "CURRENT_TIMESTAMP", "Thời điểm cập nhật mới nhất (đổi leader, chuyển nhóm)"]
    ]
    t_sess = doc.add_table(rows=len(r_sess)+1, cols=7)
    format_table(t_sess, w_col, h_col, r_sess)

    # session_configs
    add_h2(doc, "2.8. Bảng session_configs (Tham số & Ràng buộc Thuật toán GA)")
    r_cfg = [
        ["1", "session_id", "VARCHAR(50)", "PK/FK", "No", "", "Khóa chính và Khóa ngoại tham chiếu grouping_sessions(id)"],
        ["2", "target_group_count", "INTEGER", "", "No", "4", "Số lượng nhóm mục tiêu cần chia"],
        ["3", "min_members", "INTEGER", "", "No", "3", "Số lượng thành viên tối thiểu trong một nhóm"],
        ["4", "max_members", "INTEGER", "", "No", "6", "Số lượng thành viên tối đa trong một nhóm"],
        ["5", "weight_skill_balance", "REAL", "", "No", "0.35", "Trọng số cân bằng kỹ năng chuyên môn"],
        ["6", "weight_disc_diversity", "REAL", "", "No", "0.25", "Trọng số đa dạng tính cách DISC"],
        ["7", "weight_gpa_balance", "REAL", "", "No", "0.20", "Trọng số phân bổ đều học lực GPA giữa các nhóm"],
        ["8", "weight_gender_balance", "REAL", "", "No", "0.10", "Trọng số cân bằng tỷ lệ giới tính Nam/Nữ"],
        ["9", "weight_constraint_satisfaction", "REAL", "", "No", "0.10", "Trọng số thỏa mãn ràng buộc và nguyện vọng sinh viên"],
        ["10", "require_leader", "BOOLEAN", "", "Yes", "1", "1: Bắt buộc mỗi nhóm phải có tối thiểu 1 Trưởng nhóm"],
        ["11", "min_frontend", "INTEGER", "", "Yes", "1", "Số lượng tối thiểu thành viên chuyên môn Frontend mỗi nhóm"],
        ["12", "min_backend", "INTEGER", "", "Yes", "1", "Số lượng tối thiểu thành viên chuyên môn Backend mỗi nhóm"],
        ["13", "min_design", "INTEGER", "", "Yes", "0", "Số lượng tối thiểu thành viên Thiết kế UI/UX mỗi nhóm"],
        ["14", "balance_gender", "BOOLEAN", "", "Yes", "1", "Kích hoạt ràng buộc cân bằng tỷ lệ giới tính"],
        ["15", "max_gpa_spread", "REAL", "", "Yes", "0.8", "Độ chênh lệch GPA trung bình tối đa giữa nhóm cao và thấp nhất"],
        ["16", "respect_preferences", "BOOLEAN", "", "Yes", "1", "Ưu tiên ghép cặp theo nguyện vọng sinh viên (Peer Preference)"],
        ["17", "force_no_clashes", "BOOLEAN", "", "Yes", "1", "Triệt tiêu tuyệt đối xung đột bạn cùng nhóm (Avoided Peers)"],
        ["18", "ga_population_size", "INTEGER", "", "No", "80", "Quy mô quần thể cá thể GA (Population Size)"],
        ["19", "ga_generations", "INTEGER", "", "No", "120", "Số lượng thế hệ tiến hóa tối đa (Generations)"],
        ["20", "ga_mutation_rate", "REAL", "", "No", "0.08", "Tỷ lệ đột biến gen hoán vị Swap (Mutation Rate)"],
        ["21", "ga_crossover_rate", "REAL", "", "No", "0.85", "Tỷ lệ lai ghép PMX (Crossover Rate)"],
        ["22", "ga_selection_method", "VARCHAR(50)", "", "Yes", "'tournament'", "Phương pháp chọn lọc cá thể: 'tournament' hoặc 'roulette'"],
        ["23", "ga_elitism_count", "INTEGER", "", "No", "4", "Số cá thể tinh hoa tốt nhất bảo tồn sang thế hệ sau"],
        ["24", "config_json", "TEXT", "", "Yes", "NULL", "Toàn bộ cấu hình dạng JSON nguyên bản để tái tạo môi trường"]
    ]
    t_cfg = doc.add_table(rows=len(r_cfg)+1, cols=7)
    format_table(t_cfg, w_col, h_col, r_cfg)

    # groups
    add_h2(doc, "2.9. Bảng groups (Danh Sách Nhóm Sinh Viên Tối Ưu)")
    r_grp = [
        ["1", "id", "VARCHAR(50)", "PK", "No", "", "Mã nhóm (vd: GA-859999-G1, GA-1789396949-G3)"],
        ["2", "session_id", "VARCHAR(50)", "FK", "No", "", "Khóa ngoại tham chiếu grouping_sessions(id) - ON DELETE CASCADE"],
        ["3", "group_number", "INTEGER", "", "No", "1", "Số thứ tự nhóm trong phiên (1, 2, 3...)"],
        ["4", "name", "VARCHAR(150)", "", "No", "", "Tên nhóm hiển thị (vd: Nhóm 1 (Đồ án), Nhóm 3 (Toán vĩ mô))"],
        ["5", "topic", "VARCHAR(255)", "", "Yes", "NULL", "Đề tài / Chủ đề đồ án được phân công"],
        ["6", "leader_id", "VARCHAR(50)", "", "Yes", "NULL", "MSSV của thành viên đảm nhiệm vai trò Trưởng nhóm"],
        ["7", "avg_gpa", "REAL", "", "Yes", "0.0", "Điểm GPA trung bình của các thành viên trong nhóm"],
        ["8", "gpa_variance", "REAL", "", "Yes", "0.0", "Độ lệch phương sai điểm GPA nội bộ nhóm"],
        ["9", "skill_balance_score", "REAL", "", "Yes", "0.0", "Điểm cân đối kỹ năng lập trình (0 - 100)"],
        ["10", "disc_diversity_score", "REAL", "", "Yes", "0.0", "Điểm đa dạng tính cách DISC theo mô hình synergy (0 - 100)"],
        ["11", "compatibility_score", "REAL", "", "Yes", "0.0", "Điểm tương thích tổng hợp của nhóm (Compatibility Index)"],
        ["12", "gender_ratio_male", "INTEGER", "", "Yes", "0", "Số lượng thành viên Nam trong nhóm"],
        ["13", "gender_ratio_female", "INTEGER", "", "Yes", "0", "Số lượng thành viên Nữ trong nhóm"],
        ["14", "metrics_json", "TEXT", "", "Yes", "NULL", "JSON chi tiết độ bao phủ kỹ năng, DISC profile, vi phạm ràng buộc"],
        ["15", "explanation_json", "TEXT", "", "Yes", "NULL", "JSON tóm tắt lý do tạo nhóm, điểm mạnh và phân tích lãnh đạo"],
        ["16", "created_at", "DATETIME", "", "Yes", "CURRENT_TIMESTAMP", "Thời điểm nhóm được tạo"]
    ]
    t_grp = doc.add_table(rows=len(r_grp)+1, cols=7)
    format_table(t_grp, w_col, h_col, r_grp)

    # group_members
    add_h2(doc, "2.10. Bảng group_members (Thành Viên Trong Nhóm & Trưởng Nhóm)")
    r_gm = [
        ["1", "id", "INTEGER", "PK", "No", "AUTO", "Khóa chính tự tăng của bảng"],
        ["2", "group_id", "VARCHAR(50)", "FK", "No", "", "Khóa ngoại tham chiếu groups(id) - ON DELETE CASCADE"],
        ["3", "student_id", "VARCHAR(50)", "FK", "No", "", "Khóa ngoại tham chiếu students(student_id)"],
        ["4", "is_leader", "BOOLEAN", "", "Yes", "0", "1: Là Trưởng nhóm (Leader); 0: Thành viên thông thường"],
        ["5", "assigned_role", "VARCHAR(50)", "", "Yes", "NULL", "Vai trò phụ trách (vd: Trưởng nhóm, Frontend Lead, DBA...)"],
        ["6", "student_snapshot_json", "TEXT", "", "Yes", "NULL", "Bản lưu trạng thái hồ sơ sinh viên tại thời điểm xếp nhóm"],
        ["7", "joined_at", "DATETIME", "", "Yes", "CURRENT_TIMESTAMP", "Thời điểm được gán vào nhóm"]
    ]
    t_gm = doc.add_table(rows=len(r_gm)+1, cols=7)
    format_table(t_gm, w_col, h_col, r_gm)

    # group_explanations
    add_h2(doc, "2.11. Bảng group_explanations (Bản Giải Thích AI Sư Phạm & Lời Khuyên)")
    r_ge = [
        ["1", "id", "INTEGER", "PK", "No", "AUTO", "Khóa chính tự tăng của bảng"],
        ["2", "group_id", "VARCHAR(50)", "FK", "No", "", "Khóa ngoại tham chiếu duy nhất groups(id) - UNIQUE, CASCADE"],
        ["3", "summary", "TEXT", "", "Yes", "NULL", "Tóm tắt ngắn gọn lý do thuật toán ghép nối nhóm sinh viên này"],
        ["4", "synergy_highlights_json", "TEXT", "", "Yes", "NULL", "JSON danh sách các điểm mạnh tương hỗ năng lực nổi bật"],
        ["5", "potential_risks_json", "TEXT", "", "Yes", "NULL", "JSON danh sách các rủi ro tiềm ẩn (thiếu role, xung đột DISC)"],
        ["6", "recommendations_json", "TEXT", "", "Yes", "NULL", "JSON các khuyến nghị cụ thể cho Giảng viên và Nhóm"],
        ["7", "leadership_analysis", "TEXT", "", "Yes", "NULL", "Đánh giá phong cách lãnh đạo của Trưởng nhóm được chọn"],
        ["8", "disc_synergy", "TEXT", "", "Yes", "NULL", "Đánh giá mức độ hòa hợp tính cách (vd: D quyết đoán kết hợp S kiên định)"],
        ["9", "skill_coverage_summary", "TEXT", "", "Yes", "NULL", "Đánh giá độ bao phủ kỹ năng so với yêu cầu đề tài đồ án"],
        ["10", "ai_pedagogical_advice", "TEXT", "", "Yes", "NULL", "Lời khuyên sư phạm của AI dành cho Giảng viên hướng dẫn"],
        ["11", "created_at", "DATETIME", "", "Yes", "CURRENT_TIMESTAMP", "Thời điểm sinh bản giải thích"]
    ]
    t_ge = doc.add_table(rows=len(r_ge)+1, cols=7)
    format_table(t_ge, w_col, h_col, r_ge)

    # uploaded_files
    add_h2(doc, "2.12. Bảng uploaded_files (Lưu Trữ & Lịch Sử Tệp Nạp)")
    r_uf = [
        ["1", "id", "VARCHAR(50)", "PK", "No", "", "Mã tệp tải lên (vd: FILE-1789386719, FILE-1789394000)"],
        ["2", "filename", "VARCHAR(255)", "", "No", "", "Tên tệp gốc khi người dùng tải lên (vd: students_20.xlsx)"],
        ["3", "file_size", "INTEGER", "", "No", "0", "Dung lượng tệp tính theo bytes"],
        ["4", "file_type", "VARCHAR(50)", "", "Yes", "'XLSX'", "Định dạng tệp: 'XLSX', 'XLS', 'CSV'"],
        ["5", "total_records", "INTEGER", "", "Yes", "0", "Số lượng bản ghi sinh viên trích xuất thành công từ tệp"],
        ["6", "file_content", "BLOB", "", "Yes", "NULL", "Nội dung tệp nhị phân nguyên vẹn lưu trực tiếp trong CSDL"],
        ["7", "class_id", "VARCHAR(50)", "FK", "Yes", "NULL", "Khóa ngoại tham chiếu classes(id) mà tệp được nạp vào"],
        ["8", "uploaded_by", "VARCHAR(50)", "", "Yes", "NULL", "Mã tài khoản người thực hiện tải tệp lên hệ thống"],
        ["9", "created_at", "DATETIME", "", "Yes", "CURRENT_TIMESTAMP", "Thời điểm tải tệp lên hệ thống"]
    ]
    t_uf = doc.add_table(rows=len(r_uf)+1, cols=7)
    format_table(t_uf, w_col, h_col, r_uf)

    # system_settings
    add_h2(doc, "2.13. Bảng system_settings (Cấu Hình Tham Số Toàn Cục)")
    r_ss = [
        ["1", "key", "VARCHAR(50)", "PK", "No", "", "Tên tham số cấu hình (vd: gemini_model, max_students_per_session)"],
        ["2", "value", "TEXT", "", "No", "", "Giá trị cấu hình thiết lập (vd: 'gemini-3.6-flash', '120')"],
        ["3", "description", "VARCHAR(255)", "", "Yes", "NULL", "Mô tả mục đích và ý nghĩa kỹ thuật của tham số"],
        ["4", "updated_at", "DATETIME", "", "Yes", "CURRENT_TIMESTAMP", "Thời điểm cập nhật tham số gần nhất"]
    ]
    t_ss = doc.add_table(rows=len(r_ss)+1, cols=7)
    format_table(t_ss, w_col, h_col, r_ss)

    # Phần 3: Ràng buộc khóa ngoại & Indexes
    add_h1(doc, "3. Danh Mục Ràng Buộc Khóa Ngoại & Chỉ Mục Tối Ưu Hóa")
    add_h2(doc, "3.1. Danh Sách Các Ràng Buộc Khóa Ngoại (Foreign Keys)")
    headers_fk = ["STT", "Bảng Nguồn (Child)", "Cột Khóa Ngoại", "Bảng Đích (Parent)", "Cột Khóa Chính", "Hành Vi (Action)"]
    widths_fk = [0.5, 1.4, 1.3, 1.3, 1.1, 1.4]
    rows_fk = [
        ["1", "classes", "lecturer_id", "accounts", "id", "RESTRICT (Bảo vệ giảng viên)"],
        ["2", "class_students", "class_id", "classes", "id", "ON DELETE CASCADE"],
        ["3", "class_students", "student_id", "students", "student_id", "ON UPDATE CASCADE"],
        ["4", "survey_submissions", "class_id", "classes", "id", "ON DELETE CASCADE"],
        ["5", "survey_submissions", "student_id", "students", "student_id", "ON UPDATE CASCADE"],
        ["6", "grouping_sessions", "class_id", "classes", "id", "SET NULL (Giữ phiên phân nhóm)"],
        ["7", "session_configs", "session_id", "grouping_sessions", "id", "ON DELETE CASCADE"],
        ["8", "groups", "session_id", "grouping_sessions", "id", "ON DELETE CASCADE"],
        ["9", "group_members", "group_id", "groups", "id", "ON DELETE CASCADE"],
        ["10", "group_members", "student_id", "students", "student_id", "RESTRICT"],
        ["11", "group_explanations", "group_id", "groups", "id", "ON DELETE CASCADE"],
        ["12", "uploaded_files", "class_id", "classes", "id", "SET NULL"]
    ]
    t_fk = doc.add_table(rows=len(rows_fk)+1, cols=6)
    format_table(t_fk, widths_fk, headers_fk, rows_fk)

    add_h2(doc, "3.2. Danh Sách Các Chỉ Mục Tối Ưu Hóa (Database Indexes)")
    headers_idx = ["STT", "Tên Chỉ Mục (Index Name)", "Bảng", "Cột Được Đánh Chỉ Mục", "Mục Đích Tối Ưu Truy Vấn"]
    widths_idx = [0.5, 1.8, 1.2, 1.4, 2.1]
    rows_idx = [
        ["1", "idx_submissions_class", "survey_submissions", "class_id", "Tăng tốc độ đếm và trích xuất bài nộp theo lớp học"],
        ["2", "idx_submissions_student", "survey_submissions", "student_id", "Kiểm tra sinh viên đã nộp bài khảo sát chưa trong O(1)"],
        ["3", "idx_class_students_class", "class_students", "class_id", "Truy vấn danh sách sinh viên thuộc từng lớp trong tích tắc"],
        ["4", "idx_sessions_class", "grouping_sessions", "class_id", "Lọc các phiên phân nhóm theo từng lớp trên Results Dashboard"],
        ["5", "idx_groups_session", "groups", "session_id", "Nạp nhanh toàn bộ nhóm của phiên khi mở trang kết quả"],
        ["6", "idx_members_group", "group_members", "group_id", "Nạp nhanh danh sách thành viên thuộc từng thẻ nhóm"],
        ["7", "idx_accounts_username", "accounts", "username, email", "Tối ưu hóa xác thực đăng nhập bảo mật cho Admin/Giảng viên"]
    ]
    t_idx = doc.add_table(rows=len(rows_idx)+1, cols=5)
    format_table(t_idx, widths_idx, headers_idx, rows_idx)

    # Phần 4: SQL Queries
    add_h1(doc, "4. Các Kịch Bản Truy Vấn Chuẩn Cốt Lõi (Core SQL Queries)")
    add_p(doc, "SELECT c.id, c.code, c.name, COUNT(cs.student_id) as total_students, "
               "(SELECT COUNT(*) FROM survey_submissions ss WHERE ss.class_id = c.id) as survey_count "
               "FROM classes c LEFT JOIN class_students cs ON c.id = cs.class_id GROUP BY c.id;", 
               "1. Thống kê quy mô sinh viên và tiến độ khảo sát từng lớp: ")
    add_p(doc, "SELECT s.*, cs.gpa as class_gpa FROM students s "
               "JOIN class_students cs ON s.student_id = cs.student_id WHERE cs.class_id = 'CLASS-02' ORDER BY s.name ASC;", 
               "2. Trích xuất danh sách sinh viên chuẩn bị cấp cho thuật toán GA theo lớp: ")
    add_p(doc, "SELECT gs.id, gs.title, gs.status, gs.overall_fitness, COUNT(g.id) as group_count "
               "FROM grouping_sessions gs LEFT JOIN groups g ON gs.id = g.session_id "
               "WHERE gs.status = 'published' GROUP BY gs.id ORDER BY gs.updated_at DESC;", 
               "3. Lấy các phiên phân nhóm đang được công bố cho sinh viên tra cứu trực tuyến: ")
    add_p(doc, "SELECT g.group_number, g.name, s.name as leader_name, g.avg_gpa, g.compatibility_score "
               "FROM groups g LEFT JOIN students s ON g.leader_id = s.student_id "
               "WHERE g.session_id = 'GA-1789396949' ORDER BY g.group_number ASC;", 
               "4. Trích xuất danh sách nhóm kèm Trưởng nhóm phục vụ xuất báo cáo Excel/PDF: ")

    out_path = out_dir / "Tong_quan_va_Dac_ta_CSDL_NOVIARA.docx"
    doc.save(str(out_path))
    print(f"Build CSDL DOCX thanh cong: {out_path.resolve()}")


# =============================================================================
# 2. TẠO FILE DOCX PHÂN TÍCH THIẾT KẾ & USE CASE CÓ NHÚNG ĐẦY ĐỦ 8 SƠ ĐỒ
# =============================================================================
def build_sad_document_with_diagrams():
    doc = Document()
    for section in doc.sections:
        section.top_margin = Inches(1.0)
        section.bottom_margin = Inches(1.0)
        section.left_margin = Inches(1.0)
        section.right_margin = Inches(1.0)

    add_header(
        doc,
        "PHÂN TÍCH THIẾT KẾ HỆ THỐNG & ĐẶC TẢ USE CASE",
        "Hệ Thống Phân Nhóm Tự Động Bằng AI & Giải Thuật Di Truyền NOVIARA (SAD, Use Case, Class & Sequence Diagrams)"
    )

    # CHƯƠNG 1
    add_h1(doc, "1. Tổng Quan Hệ Thống & Kiến Trúc Phần Mềm NOVIARA")
    add_p(doc, 
        "Hệ thống NOVIARA là nền tảng thông minh hỗ trợ giảng viên đại học giải quyết bài toán tối ưu hóa phân nhóm sinh viên "
        "thực hiện đồ án, bài tập lớn và dự án học tập. Hệ thống kết hợp giữa phương pháp tâm lý học hành vi DISC, ma trận "
        "kỹ năng chuyên môn đa chiều (10 kỹ năng kỹ thuật và mềm), giải thuật di truyền đa mục tiêu (Genetic Algorithm - GA) "
        "và Trí tuệ nhân tạo tạo sinh (Google Gemini AI) để tạo ra các nhóm sinh viên cân bằng, tối đa hóa sức mạnh hiệp đồng "
        "(synergy) và triệt tiêu xung đột nội bộ."
    )
    add_h2(doc, "1.1. Kiến Trúc Phân Tầng 3 Lớp (3-Tier Architecture)")
    add_p(doc, "Single Page Application (SPA) phát triển trên React 18, TypeScript, Vite và Tailwind CSS. Cung cấp giao diện hiện đại, biểu đồ Radar kỹ năng, ma trận DISC đa màu và Kanban phân nhóm.", "• Tầng Trình Diễn (Presentation Tier): ")
    add_p(doc, "RESTful API Server và SSE Realtime phát triển trên nền FastAPI (Python 3.11). Quản lý xác thực bảo mật PBKDF2, nạp/bóc tách tệp Excel, điều phối lõi thuật toán Genetic Algorithm và giao tiếp Google Gemini AI.", "• Tầng Nghiệp Vụ & Dịch Vụ (Application Tier): ")
    add_p(doc, "Cơ sở dữ liệu quan hệ SQLite trung tâm (backend/data/smartgroup.db) tuân thủ 3NF, hoạt động ở chế độ WAL hiệu năng cao, lưu trữ toàn vẹn mọi thực thể, phiên GA và nội dung nhị phân tệp tải lên.", "• Tầng Dữ Liệu Bền Vững (Data Persistence Tier): ")

    add_h2(doc, "1.2. Bảng Mô Tả Các Khối Thành Phần Công Nghệ")
    headers_tech = ["STT", "Tầng Kiến Trúc", "Công Nghệ / Thư Viện", "Vai Trò & Chức Năng Cốt Lõi"]
    widths_tech = [0.5, 1.8, 2.0, 2.7]
    rows_tech = [
        ["1", "Frontend UI", "React 18 + TypeScript", "Xây dựng giao diện ứng dụng web tương tác nhanh, an toàn kiểu dữ liệu"],
        ["2", "Styling & Icons", "Tailwind CSS + Lucide Icons", "Thiết kế giao diện hiện đại, chuyên nghiệp, responsive đa thiết bị"],
        ["3", "Build Tool", "Vite 5.x", "Tối ưu hóa tốc độ biên dịch HMR; cô lập watcher đối với thư mục backend/data"],
        ["4", "Backend API", "FastAPI (Python 3.11)", "Cung cấp hệ thống RESTful API bất đồng bộ tốc độ cao và tài liệu Swagger OpenAPI"],
        ["5", "Bảo Mật & Auth", "PBKDF2-HMAC-SHA256", "Mã hóa băm mật khẩu 1 chiều với 100,000 vòng lặp kèm muối Salt ngẫu nhiên"],
        ["6", "Lõi Tối Ưu Hóa", "Genetic Algorithm (Custom GA)", "Giải thuật di truyền đa mục tiêu: Lai ghép PMX, Đột biến Swap, Bảo tồn Tinh hoa"],
        ["7", "Trí Tuệ Nhân Tạo", "Google Gemini AI (SDK 2.0)", "Phân tích tâm lý sư phạm, đánh giá tương thích nhóm và đề xuất lời khuyên"],
        ["8", "Cơ Sở Dữ Liệu", "SQLite 3.x (WAL Mode)", "Lưu trữ dữ liệu bền vững, hỗ trợ đọc/ghi đồng thời, toàn vẹn quan hệ 13 bảng"],
        ["9", "Xử Lý Tệp Nạp", "OpenPyXL + Pandas", "Bóc tách tự động dữ liệu danh sách sinh viên từ định dạng Excel .xlsx và .csv"]
    ]
    t_tech = doc.add_table(rows=len(rows_tech)+1, cols=4)
    format_table(t_tech, widths_tech, headers_tech, rows_tech)

    # CHƯƠNG 2
    add_h1(doc, "2. Phân Tích & Danh Mục Tác Nhân Hệ Thống (Actor Catalog)")
    add_p(doc, 
        "Hệ thống NOVIARA phục vụ 4 nhóm tác nhân con người cùng 2 tác nhân dịch vụ tự động nền (Service Actors). "
        "Mỗi tác nhân được phân định ranh giới trách nhiệm, phạm vi quyền hạn và kênh truy cập rõ ràng:"
    )
    headers_actor = ["STT", "Tác Nhân (Actor)", "Loại Tác Nhân", "Phạm Vi Quyền Hạn & Trách Nhiệm Trong Hệ Thống"]
    widths_actor = [0.5, 1.8, 1.4, 3.3]
    rows_actor = [
        ["1", "Quản Trị Viên (System Admin)", "Con người (Nội bộ)", "Quản lý toàn bộ tài khoản người dùng, phân quyền giảng viên, giám sát hoạt động CSDL, thiết lập tham số hệ thống toàn cục và quản lý API keys."],
        ["2", "Giảng Viên (Lecturer)", "Con người (Nộ