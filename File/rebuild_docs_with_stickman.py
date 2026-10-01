# -*- coding: utf-8 -*-
"""
Script cập nhật lại 2 tệp DOCX với Sơ đồ Use Case hình người (Stickman Actors):
1. Tong_Quan_Toan_Dien_UML_Do_An_NOVIARA.docx
2. Phan_tich_Thiet_ke_He_thong_va_Usecase_NOVIARA.docx
"""
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

def set_cell_margins(cell, top=100, bottom=100, left=130, right=130):
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
    p.paragraph_format.space_before = Pt(18)
    p.paragraph_format.space_after = Pt(6)
    p.paragraph_format.keep_with_next = True
    run = p.add_run(text)
    run.font.name = 'Arial'
    run.font.size = Pt(14.5)
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
    r_cap.font.color.rgb = RGBColor(67, 56, 202)

def format_table(table, col_widths, headers, rows):
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_borders(table, "cbd5e1")

    # Header
    hdr_cells = table.rows[0].cells
    for i, title in enumerate(headers):
        hdr_cells[i].text = title
        set_cell_background(hdr_cells[i], "1e293b")
        set_cell_margins(hdr_cells[i], top=100, bottom=100, left=120, right=120)
        p = hdr_cells[i].paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        for r in p.runs:
            r.font.name = 'Arial'
            r.font.size = Pt(9)
            r.font.bold = True
            r.font.color.rgb = RGBColor(255, 255, 255)

    # Body
    for r_idx, row_data in enumerate(rows):
        row_cells = table.rows[r_idx + 1].cells
        bg_color = "f8fafc" if r_idx % 2 == 1 else "ffffff"
        for c_idx, val in enumerate(row_data):
            row_cells[c_idx].text = str(val)
            set_cell_background(row_cells[c_idx], bg_color)
            set_cell_margins(row_cells[c_idx], top=70, bottom=70, left=100, right=100)
            p = row_cells[c_idx].paragraphs[0]
            if len(col_widths) > 2 and c_idx == 0:
                p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            else:
                p.alignment = WD_ALIGN_PARAGRAPH.LEFT
            for r in p.runs:
                r.font.name = 'Arial'
                r.font.size = Pt(8.5)
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
# 1. TẠO LẠI FILE MASTER UML ĐỒ ÁN VỚI SƠ ĐỒ USE CASE HÌNH NGƯỜI
# =============================================================================
def build_master_uml():
    doc = Document()
    for section in doc.sections:
        section.top_margin = Inches(1.0)
        section.bottom_margin = Inches(1.0)
        section.left_margin = Inches(1.0)
        section.right_margin = Inches(1.0)

    add_header(
        doc,
        "TỔNG QUAN TOÀN DIỆN MÔ HÌNH HÓA UML CHO ĐỒ ÁN TỐT NGHIỆP",
        "Hệ Thống Phân Nhóm Tự Động Bằng AI & Giải Thuật Di Truyền NOVIARA (UML 2.5: Use Case, Class, Sequence, Activity, State, Component & Deployment)"
    )

    # CHƯƠNG 1
    add_h1(doc, "1. Tổng Quan Hệ Thống & Mô Hình Kiến Trúc Phần Mềm")
    add_p(doc, 
        "Hệ thống NOVIARA là nền tảng thông minh hỗ trợ giảng viên đại học giải quyết bài toán tối ưu hóa phân nhóm sinh viên "
        "thực hiện đồ án, bài tập lớn và dự án học tập. Hệ thống kết hợp giữa phương pháp tâm lý học hành vi DISC, ma trận "
        "kỹ năng chuyên môn đa chiều (10 kỹ năng kỹ thuật và mềm), giải thuật di truyền đa mục tiêu (Genetic Algorithm - GA) "
        "và Trí tuệ nhân tạo tạo sinh (Google Gemini AI) để tạo ra các nhóm sinh viên cân bằng, tối đa hóa sức mạnh hiệp đồng "
        "(synergy) và triệt tiêu xung đột nội bộ."
    )
    add_h2(doc, "1.1. Sơ Đồ Thành Phần Phần Mềm (Component Diagram)")
    add_diagram_image(doc, "comp_01_system_components.png", "Hình 1.1: Sơ đồ Thành Phần Phần Mềm (Component Diagram) Hệ Thống NOVIARA", width_inches=6.3)

    add_h2(doc, "1.2. Sơ Đồ Triển Khai Hạ Tầng Vật Lý (Deployment Diagram)")
    add_diagram_image(doc, "dep_01_deployment.png", "Hình 1.2: Sơ đồ Triển Khai Hạ Tầng Mạng & Nút Môi Trường Thực Thi (Deployment Diagram)", width_inches=6.0)

    # CHƯƠNG 2: USE CASE (HÌNH NGƯỜI CHUẨN UML)
    add_h1(doc, "2. Mô Hình Hóa Use Case (Use Case Modeling)")
    add_p(doc, 
        "Mô hình Use Case định nghĩa chức năng của hệ thống dưới góc nhìn người dùng, bao gồm 6 nhóm tác nhân (Actors) "
        "được vẽ theo chuẩn UML (hình người / stickman) và 18 ca sử dụng (Use Cases) được cấu trúc thành 6 phân hệ chức năng:"
    )
    add_h2(doc, "2.1. Sơ Đồ Tác Nhân & Use Case Tổng Thể (Master Use Case Diagram)")
    add_p(doc, "Sơ đồ biểu diễn trực quan các tác nhân con người (hình người chuẩn UML) và các tác nhân dịch vụ liên kết tới 18 ca sử dụng:")
    # NHÚNG HÌNH USE CASE HÌNH NGƯỜI (WIDTH=4.5 INCHES ĐỂ CHIỀU CAO VỪA VẶN 1 TRANG)
    add_diagram_image(doc, "usecase_actors_diagram.png", "Hình 2.1: Sơ đồ Tác Nhân (Hình Người Chuẩn UML) & Use Case Tổng Thể NOVIARA", width_inches=4.3)

    add_h2(doc, "2.2. Bảng Danh Mục 6 Tác Nhân Hệ Thống (Actor Catalog)")
    headers_actor = ["STT", "Tác Nhân (Actor)", "Ký Hiệu UML", "Phạm Vi Quyền Hạn & Trách Nhiệm Trong Hệ Thống"]
    widths_actor = [0.5, 1.8, 1.3, 3.4]
    rows_actor = [
        ["1", "Quản Trị Viên (System Admin)", "Stickman (Hình người)", "Quản lý toàn bộ tài khoản người dùng, phân quyền giảng viên, giám sát hoạt động CSDL, thiết lập tham số hệ thống toàn cục và quản lý API keys."],
        ["2", "Giảng Viên (Lecturer)", "Stickman (Hình người)", "Quản lý danh sách lớp học phần phụ trách, nạp danh sách sinh viên từ Excel, mở/đóng cổng khảo sát DISC, cấu hình tham số GA, chạy phân nhóm, tinh chỉnh thành viên, chỉ định Trưởng nhóm và công bố kết quả."],
        ["3", "Sinh Viên (Student)", "Stickman (Hình người)", "Truy cập cổng khảo sát trực tuyến theo liên kết lớp học, làm bài trắc nghiệm 12 câu hỏi DISC, tự đánh giá năng lực 10 kỹ năng, tra cứu nhóm cá nhân sau khi được giảng viên công bố."],
        ["4", "Khách / Khảo Sát Viên (Guest)", "Stickman (Hình người)", "Trải nghiệm làm thử bài trắc nghiệm tính cách DISC và nhận kết quả phân tích hồ sơ tâm lý cá nhân độc lập."],
        ["5", "Lõi Thuật Toán GA (GA Engine)", "<<Service>> Actor", "Thực thi tiến trình di truyền ngầm: khởi tạo quần thể, đánh giá hàm thích nghi (Fitness Function), chọn lọc cá thể, lai ghép, đột biến và ghi nhận lịch sử hội tụ."],
        ["6", "Dịch Vụ AI (Gemini AI)", "<<Service>> Actor", "Tiếp nhận snapshot cấu trúc nhóm, phân tích ma trận DISC và kỹ năng để sinh văn bản giải thích sư phạm, nhận định điểm mạnh và khuyến nghị định hướng."]
    ]
    t_actor = doc.add_table(rows=len(rows_actor)+1, cols=4)
    format_table(t_actor, widths_actor, headers_actor, rows_actor)

    add_h2(doc, "2.3. Bảng Tổng Hợp 18 Use Case Thuộc 6 Phân Hệ")
    headers_uc_list = ["Mã UC", "Tên Ca Sử Dụng (Use Case)", "Phân Hệ Nghiệp Vụ", "Tác Nhân Chính", "Mức Độ Ưu Tiên"]
    widths_uc_list = [0.8, 2.5, 1.8, 1.2, 0.7]
    rows_uc_list = [
        ["UC-01", "Đăng nhập hệ thống & Xác thực", "Phân hệ 1: Xác thực & Quản trị", "Admin, Giảng viên", "Bắt buộc"],
        ["UC-02", "Bắt buộc đổi mật khẩu khởi tạo", "Phân hệ 1: Xác thực & Quản trị", "Admin, Giảng viên", "Bắt buộc"],
        ["UC-03", "Quản lý tài khoản Giảng viên (CRUD)", "Phân hệ 1: Xác thực & Quản trị", "Quản trị viên", "Cao"],
        ["UC-04", "Quản lý lớp học phần & Trạng thái khảo sát", "Phân hệ 2: Quản lý Lớp & Khảo sát", "Giảng viên", "Bắt buộc"],
        ["UC-05", "Đóng / Mở cổng khảo sát trực tuyến", "Phân hệ 2: Quản lý Lớp & Khảo sát", "Giảng viên", "Bắt buộc"],
        ["UC-06", "Làm bài trắc nghiệm tính cách DISC & Kỹ năng", "Phân hệ 2: Quản lý Lớp & Khảo sát", "Sinh viên, Khách", "Bắt buộc"],
        ["UC-07", "Xem tiến độ nộp bài khảo sát theo lớp", "Phân hệ 2: Quản lý Lớp & Khảo sát", "Giảng viên", "Cao"],
        ["UC-08", "Nhập danh sách sinh viên từ file Excel / CSV", "Phân hệ 3: Nhập Liệu & Tệp Nạp", "Giảng viên", "Bắt buộc"],
        ["UC-09", "Xem & Quản lý lịch sử các tệp nạp (Uploaded Files)", "Phân hệ 3: Nhập Liệu & Tệp Nạp", "Giảng viên, Admin", "Cao"],
        ["UC-10", "Xem danh sách hồ sơ sinh viên & Radar kỹ năng", "Phân hệ 3: Nhập Liệu & Tệp Nạp", "Giảng viên", "Trung bình"],
        ["UC-11", "Cấu hình tham số & Trọng số hàm thích nghi GA", "Phân hệ 4: Thuật Toán Phân Nhóm", "Giảng viên", "Bắt buộc"],
        ["UC-12", "Thực thi phân nhóm tự động bằng thuật toán GA", "Phân hệ 4: Thuật Toán Phân Nhóm", "Giảng viên, GA Engine", "Bắt buộc"],
        ["UC-13", "Xem biểu đồ hội tụ Fitness qua các thế hệ", "Phân hệ 4: Thuật Toán Phân Nhóm", "Giảng viên", "Trung bình"],
        ["UC-14", "Chỉ định và Đổi Trưởng nhóm (Leader Adjustment)", "Phân hệ 5: Tinh Chỉnh & Quản Lý Nhóm", "Giảng viên", "Bắt buộc"],
        ["UC-15", "Chuyển đổi thành viên thủ công giữa các nhóm", "Phân hệ 5: Tinh Chỉnh & Quản Lý Nhóm", "Giảng viên", "Cao"],
        ["UC-16", "Sinh giải thích sư phạm tự động bằng Gemini AI", "Phân hệ 5: Tinh Chỉnh & Quản Lý Nhóm", "Giảng viên, Gemini AI", "Cao"],
        ["UC-17", "Công bố kết quả phân nhóm cho sinh viên", "Phân hệ 6: Công Bố & Báo Cáo", "Giảng viên", "Bắt buộc"],
        ["UC-18", "Tra cứu kết quả nhóm sinh viên theo MSSV", "Phân hệ 6: Công Bố & Báo Cáo", "Sinh viên", "Bắt buộc"]
    ]
    t_ucl = doc.add_table(rows=len(rows_uc_list)+1, cols=5)
    format_table(t_ucl, widths_uc_list, headers_uc_list, rows_uc_list)

    # CHƯƠNG 3: CLASS DIAGRAM
    add_h1(doc, "3. Mô Hình Hóa Lớp (Class Diagram Modeling)")
    add_p(doc, "Sơ đồ Lớp mô tả cấu trúc tĩnh của hệ thống theo mô hình kiến trúc phân tầng 3 lớp (Boundary - Control - Entity):")
    add_diagram_image(doc, "class_diagram_noviara.png", "Hình 3.1: Sơ đồ Lớp (Class Diagram) Chi Tiết Cấu Trúc Các Tầng Thực Thể & Dịch Vụ NOVIARA", width_inches=6.4)

    # CHƯƠNG 4: SEQUENCE DIAGRAMS
    add_h1(doc, "4. Mô Hình Hóa Trình Tự (Sequence Diagrams)")
    add_p(doc, "Sơ đồ Trình tự mô tả tương tác động theo trục thời gian giữa các đối tượng trong 7 kịch bản nghiệp vụ then chốt:")
    add_h2(doc, "4.1. Sơ Đồ Trình Tự 1: Đăng Nhập & Xác Thực Mật Khẩu PBKDF2 (Seq-01)")
    add_diagram_image(doc, "seq_01_auth_login.png", "Hình 4.1: Sơ đồ Trình tự Đăng nhập & Xác thực Mật khẩu PBKDF2 (Seq-01)")

    add_h2(doc, "4.2. Sơ Đồ Trình Tự 2: Nạp Danh Sách Sinh Viên Excel & Lưu Vết Tệp (Seq-02)")
    add_diagram_image(doc, "seq_02_upload_excel.png", "Hình 4.2: Sơ đồ Trình tự Nạp Danh Sách Sinh Viên Excel & Lưu Vết Tệp (Seq-02)")

    add_h2(doc, "4.3. Sơ Đồ Trình Tự 3: Sinh Viên Làm Khảo Sát DISC & Tính Điểm (Seq-03)")
    add_diagram_image(doc, "seq_03_disc_survey.png", "Hình 4.3: Sơ đồ Trình tự Sinh Viên Làm Khảo Sát DISC & Tính Điểm (Seq-03)")

    add_h2(doc, "4.4. Sơ Đồ Trình Tự 4: Phân Nhóm Bằng Giải Thuật Di Truyền GA (Seq-04)")
    add_diagram_image(doc, "seq_04_ga_pipeline.png", "Hình 4.4: Sơ đồ Trình tự Phân Nhóm Bằng Giải Thuật Di Truyền GA (Seq-04)")

    add_h2(doc, "4.5. Sơ Đồ Trình Tự 5: Giảng Viên Bổ Nhiệm / Đổi Trưởng Nhóm (Seq-05)")
    add_diagram_image(doc, "seq_05_leader_adjustment.png", "Hình 4.5: Sơ đồ Trình tự Giảng Viên Bổ Nhiệm / Đổi Trưởng Nhóm (Seq-05)")

    add_h2(doc, "4.6. Sơ Đồ Trình Tự 6: Tham Vấn Trợ Lý Sư Phạm Google Gemini AI (Seq-06)")
    add_diagram_image(doc, "seq_07_ai_explanation.png", "Hình 4.6: Sơ đồ Trình tự Tham Vấn Trợ Lý Sư Phạm Google Gemini AI (Seq-06)")

    add_h2(doc, "4.7. Sơ Đồ Trình Tự 7: Công Bố Kết Quả Qua SSE & Tra Cứu Theo MSSV (Seq-07)")
    add_diagram_image(doc, "seq_06_publish_lookup.png", "Hình 4.7: Sơ đồ Trình tự Công Bố Kết Quả Qua SSE & Sinh Viên Tra Cứu (Seq-07)")

    # CHƯƠNG 5: ACTIVITY DIAGRAMS
    add_h1(doc, "5. Mô Hình Hóa Hoạt Động (Activity Diagrams)")
    add_h2(doc, "5.1. Sơ Đồ Hoạt Động Quy Trình Phân Nhóm Nghiệp Vụ Toàn Trình (End-to-End Workflow)")
    add_diagram_image(doc, "act_01_overall_flow.png", "Hình 5.1: Sơ đồ Hoạt Động Quy Trình Phân Nhóm Nghiệp Vụ Toàn Trình (Act-01)", width_inches=6.0)

    add_h2(doc, "5.2. Sơ Đồ Hoạt Động Lõi Thuật Toán Di Truyền Đa Mục Tiêu (GA Genetic Pipeline)")
    add_diagram_image(doc, "act_02_ga_algorithm.png", "Hình 5.2: Sơ đồ Hoạt Động Lõi Thuật Toán Di Truyền Đa Mục Tiêu (Act-02)", width_inches=6.0)

    add_h2(doc, "5.3. Sơ Đồ Hoạt Động Quy Trình Làm Bài Khảo Sát DISC Trực Tuyến (Online Survey Flow)")
    add_diagram_image(doc, "act_03_survey_flow.png", "Hình 5.3: Sơ đồ Hoạt Động Quy Trình Khảo Sát DISC Trực Tuyến & Tính Điểm (Act-03)", width_inches=5.8)

    # CHƯƠNG 6: STATE MACHINE DIAGRAMS
    add_h1(doc, "6. Mô Hình Hóa Trạng Thái (State Machine Diagrams)")
    add_h2(doc, "6.1. Sơ Đồ Trạng Thái Vòng Đời Của Phiên Phân Nhóm (Grouping Session Lifecycle)")
    add_diagram_image(doc, "state_01_session_lifecycle.png", "Hình 6.1: Sơ đồ Trạng Thái Vòng Đời Của Phiên Phân Nhóm (State-01)", width_inches=6.2)

    add_h2(doc, "6.2. Sơ Đồ Trạng Thái Cổng Khảo Sát Lớp Học Phần (Class Survey Portal Lifecycle)")
    add_diagram_image(doc, "state_02_class_portal.png", "Hình 6.2: Sơ đồ Trạng Thái Cổng Khảo Sát Lớp Học Phần (State-02)", width_inches=6.2)

    # CHƯƠNG 7: ERD
    add_h1(doc, "7. Mô Hình Cơ Sở Dữ Liệu & Thực Thể Quan Hệ (ERD Diagram)")
    add_h2(doc, "7.1. Sơ Đồ Thực Thể Quan Hệ CSDL Tổng Thể 13 Bảng (Master ERD)")
    add_diagram_image(doc, "erd_01_master.png", "Hình 7.1: Sơ đồ Thực thể Quan hệ CSDL Tổng Thể 13 Bảng (Master ERD 3NF)", width_inches=6.4)

    add_h2(doc, "7.2. Sơ Đồ Mạng Lưới Ràng Buộc Khóa Ngoại & Lan Truyền (Foreign Key Cascading Network)")
    add_diagram_image(doc, "erd_07_fk_network.png", "Hình 7.2: Sơ đồ Mạng Lưới Ràng Buộc Khóa Ngoại & Lan Truyền (CASCADE, RESTRICT, SET NULL)", width_inches=6.0)

    add_h2(doc, "7.3. Sơ Đồ Luồng Dữ Liệu CSDL Toàn Diện (Database Data Flow Diagram)")
    add_diagram_image(doc, "erd_08_dataflow.png", "Hình 7.3: Sơ đồ Luồng Dữ Liệu CSDL Toàn Diện Từ Nạp Tệp Đến Tra Cứu Công Khai", width_inches=6.4)

    out_file = out_dir / "Tong_Quan_Toan_Dien_UML_Do_An_NOVIARA.docx"
    try:
        doc.save(str(out_file))
        print(f"Build thanh cong Master UML: {out_file.resolve()} ({out_file.stat().st_size:,} bytes)")
    except PermissionError:
        backup_file = out_dir / "Tong_Quan_Toan_Dien_UML_Do_An_NOVIARA_Moi.docx"
        doc.save(str(backup_file))
        print(f"File chinh dang duoc mo trong Word. Da luu ban moi vao: {backup_file.resolve()} ({backup_file.stat().st_size:,} bytes)")


# =============================================================================
# 2. CẬP NHẬT LẠI FILE PHAN TICH THIET KE HE THONG & USE CASE
# =============================================================================
def update_sad_doc():
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

    add_h1(doc, "1. Tổng Quan Hệ Thống & Kiến Trúc Phần Mềm NOVIARA")
    add_p(doc, 
        "Hệ thống NOVIARA là nền tảng thông minh hỗ trợ giảng viên đại học giải quyết bài toán tối ưu hóa phân nhóm sinh viên "
        "thực hiện đồ án, bài tập lớn và dự án học tập. Hệ thống kết hợp giữa phương pháp tâm lý học hành vi DISC, ma trận "
        "kỹ năng chuyên môn đa chiều (10 kỹ năng kỹ thuật và mềm), giải thuật di truyền đa mục tiêu (Genetic Algorithm - GA) "
        "và Trí tuệ nhân tạo tạo sinh (Google Gemini AI) để tạo ra các nhóm sinh viên cân bằng, tối đa hóa sức mạnh hiệp đồng "
        "(synergy) và triệt tiêu xung đột nội bộ."
    )

    add_h1(doc, "2. Phân Tích & Danh Mục Tác Nhân Hệ Thống (Actor Catalog)")
    add_p(doc, "Hệ thống phục vụ 4 nhóm tác nhân con người (vẽ hình người chuẩn UML) và 2 tác nhân dịch vụ tự động:")
    headers_actor = ["STT", "Tác Nhân (Actor)", "Ký Hiệu UML", "Phạm Vi Quyền Hạn & Trách Nhiệm Trong Hệ Thống"]
    widths_actor = [0.5, 1.8, 1.3, 3.4]
    rows_actor = [
        ["1", "Quản Trị Viên (System Admin)", "Stickman (Hình người)", "Quản lý toàn bộ tài khoản người dùng, phân quyền giảng viên, giám sát hoạt động CSDL, thiết lập tham số hệ thống toàn cục và quản lý API keys."],
        ["2", "Giảng Viên (Lecturer)", "Stickman (Hình người)", "Quản lý danh sách lớp học phần phụ trách, nạp danh sách sinh viên từ Excel, mở/đóng cổng khảo sát DISC, cấu hình tham số GA, chạy phân nhóm, tinh chỉnh thành viên, chỉ định Trưởng nhóm và công bố kết quả."],
        ["3", "Sinh Viên (Student)", "Stickman (Hình người)", "Truy cập cổng khảo sát trực tuyến theo liên kết lớp học, làm bài trắc nghiệm 12 câu hỏi DISC, tự đánh giá năng lực 10 kỹ năng, tra cứu nhóm cá nhân sau khi được giảng viên công bố."],
        ["4", "Khách / Khảo Sát Viên (Guest)", "Stickman (Hình người)", "Trải nghiệm làm thử bài trắc nghiệm tính cách DISC và nhận kết quả phân tích hồ sơ tâm lý cá nhân độc lập."],
        ["5", "Lõi Thuật Toán GA (GA Engine)", "<<Service Engine>> Actor", "Thực thi tiến trình di truyền ngầm: khởi tạo quần thể, đánh giá hàm thích nghi (Fitness Function), chọn lọc cá thể, lai ghép, đột biến và ghi nhận lịch sử hội tụ."],
        ["6", "Dịch Vụ AI (Gemini AI)", "<<AI Service>> Actor", "Tiếp nhận snapshot cấu trúc nhóm, phân tích ma trận DISC và kỹ năng để sinh văn bản giải thích sư phạm, nhận định điểm mạnh và khuyến nghị định hướng."]
    ]
    t_actor = doc.add_table(rows=len(rows_actor)+1, cols=4)
    format_table(t_actor, widths_actor, headers_actor, rows_actor)

    add_h1(doc, "3. Sơ Đồ Use Case & Bảng Tổng Hợp Ca Sử Dụng")
    add_h2(doc, "3.1. Sơ Đồ Tác Nhân & Phân Hệ Use Case Tổng Thể (Hình Người Chuẩn UML)")
    add_p(doc, "Dưới đây là sơ đồ Use Case tổng thể với các tác nhân được biểu diễn bằng hình người (stickman) chuẩn xác theo đặc tả UML 2.5:")
    add_diagram_image(doc, "usecase_actors_diagram.png", "Hình 3.1: Sơ đồ Tác Nhân (Hình Người Chuẩn UML) & Phân Hệ Use Case NOVIARA", width_inches=4.3)

    add_h2(doc, "3.2. Bảng Danh Mục 18 Use Case Toàn Hệ Thống")
    headers_uc_list = ["Mã UC", "Tên Ca Sử Dụng (Use Case)", "Phân Hệ Nghiệp Vụ", "Tác Nhân Chính", "Mức Độ Ưu Tiên"]
    widths_uc_list = [0.8, 2.5, 1.8, 1.2, 0.7]
    rows_uc_list = [
        ["UC-01", "Đăng nhập hệ thống & Xác thực", "Phân hệ 1: Xác thực & Quản trị", "Admin, Giảng viên", "Bắt buộc"],
        ["UC-02", "Bắt buộc đổi mật khẩu khởi tạo", "Phân hệ 1: Xác thực & Quản trị", "Admin, Giảng viên", "Bắt buộc"],
        ["UC-03", "Quản lý tài khoản Giảng viên (CRUD)", "Phân hệ 1: Xác thực & Quản trị", "Quản trị viên", "Cao"],
        ["UC-04", "Quản lý lớp học phần & Trạng thái khảo sát", "Phân hệ 2: Quản lý Lớp & Khảo sát", "Giảng viên", "Bắt buộc"],
        ["UC-05", "Đóng / Mở cổng khảo sát trực tuyến", "Phân hệ 2: Quản lý Lớp & Khảo sát", "Giảng viên", "Bắt buộc"],
        ["UC-06", "Làm bài trắc nghiệm tính cách DISC & Kỹ năng", "Phân hệ 2: Quản lý Lớp & Khảo sát", "Sinh viên, Khách", "Bắt buộc"],
        ["UC-07", "Xem tiến độ nộp bài khảo sát theo lớp", "Phân hệ 2: Quản lý Lớp & Khảo sát", "Giảng viên", "Cao"],
        ["UC-08", "Nhập danh sách sinh viên từ file Excel / CSV", "Phân hệ 3: Nhập Liệu & Tệp Nạp", "Giảng viên", "Bắt buộc"],
        ["UC-09", "Xem & Quản lý lịch sử các tệp nạp (Uploaded Files)", "Phân hệ 3: Nhập Liệu & Tệp Nạp", "Giảng viên, Admin", "Cao"],
        ["UC-10", "Xem danh sách hồ sơ sinh viên & Radar kỹ năng", "Phân hệ 3: Nhập Liệu & Tệp Nạp", "Giảng viên", "Trung bình"],
        ["UC-11", "Cấu hình tham số & Trọng số hàm thích nghi GA", "Phân hệ 4: Thuật Toán Phân Nhóm", "Giảng viên", "Bắt buộc"],
        ["UC-12", "Thực thi phân nhóm tự động bằng thuật toán GA", "Phân hệ 4: Thuật Toán Phân Nhóm", "Giảng viên, GA Engine", "Bắt buộc"],
        ["UC-13", "Xem biểu đồ hội tụ Fitness qua các thế hệ", "Phân hệ 4: Thuật Toán Phân Nhóm", "Giảng viên", "Trung bình"],
        ["UC-14", "Chỉ định và Đổi Trưởng nhóm (Leader Adjustment)", "Phân hệ 5: Tinh Chỉnh & Quản Lý Nhóm", "Giảng viên", "Bắt buộc"],
        ["UC-15", "Chuyển đổi thành viên thủ công giữa các nhóm", "Phân hệ 5: Tinh Chỉnh & Quản Lý Nhóm", "Giảng viên", "Cao"],
        ["UC-16", "Sinh giải thích sư phạm tự động bằng Gemini AI", "Phân hệ 5: Tinh Chỉnh & Quản Lý Nhóm", "Giảng viên, Gemini AI", "Cao"],
        ["UC-17", "Công bố kết quả phân nhóm cho sinh viên", "Phân hệ 6: Công Bố & Báo Cáo", "Giảng viên", "Bắt buộc"],
        ["UC-18", "Tra cứu kết quả nhóm sinh viên theo MSSV", "Phân hệ 6: Công Bố & Báo Cáo", "Sinh viên", "Bắt buộc"]
    ]
    t_ucl = doc.add_table(rows=len(rows_uc_list)+1, cols=5)
    format_table(t_ucl, widths_uc_list, headers_uc_list, rows_uc_list)

    # CHƯƠNG 4: BẢNG ĐẶC TẢ CHI TIẾT
    add_h1(doc, "4. Bảng Đặc Tả Chi Tiết Các Use Case Cốt Lõi (IEEE Standard)")
    uc_01 = [
        ("Mã Use Case", "UC-01"),
        ("Tên Use Case", "Đăng nhập hệ thống và Bắt buộc đổi mật khẩu khởi tạo"),
        ("Tác nhân (Actor)", "Quản trị viên (Admin), Giảng viên (Lecturer) - Ký hiệu hình người"),
        ("Mục đích", "Xác thực danh tính người dùng bằng thuật toán băm bảo mật PBKDF2-HMAC-SHA256 và cưỡng chế đổi mật khẩu nếu đang dùng mật khẩu mặc định."),
        ("Tiền điều kiện", "Người dùng đã có tài khoản tồn tại trong bảng accounts của CSDL backend/data/smartgroup.db."),
        ("Hậu điều kiện", "Hệ thống cấp phiên làm việc xác thực (Session State), ghi nhận last_login và chuyển người dùng vào Dashboard quản trị tương ứng vai trò."),
        ("Luồng sự kiện chính (Main Flow)", 
         "1. Người dùng truy cập trang Đăng nhập (/login) và nhập Username cùng Mật khẩu.\n"
         "2. Frontend gửi yêu cầu POST /api/auth/login kèm thông tin xác thực đến Backend.\n"
         "3. Backend truy vấn tài khoản từ bảng accounts theo username.\n"
         "4. Backend thực hiện băm mật khẩu nhập vào bằng PBKDF2 (100,000 vòng lặp với Salt lưu trữ) và so sánh với password_hash trong CSDL.\n"
         "5. Nếu khớp, Backend kiểm tra trường must_change_password.\n"
         "   - Nếu must_change_password = 1: Trả về trạng thái yêu cầu đổi mật khẩu và hiển thị modal đổi mật khẩu bắt buộc.\n"
         "   - Người dùng nhập mật khẩu mới (tối thiểu 6 ký tự) và xác nhận.\n"
         "   - Backend cập nhật password_hash mới, gán must_change_password = 0, is_default_password = 0.\n"
         "6. Backend cập nhật trường last_login = CURRENT_TIMESTAMP và trả về thông tin người dùng cùng vai trò (role).\n"
         "7. Giao diện điều hướng người dùng đến trang tổng quan Dashboard."),
        ("Luồng rẽ nhánh / Ngoại lệ", 
         "• 4a. Username không tồn tại hoặc Mật khẩu không đúng: Hệ thống thông báo lỗi 'Tên đăng nhập hoặc mật khẩu không chính xác' và từ chối cấp quyền.\n"
         "• 5a. Mật khẩu mới trùng với mật khẩu cũ hoặc không đủ độ dài: Hệ thống báo lỗi và yêu cầu nhập lại."),
        ("Yêu cầu phi chức năng", "Thời gian xác thực PBKDF2 < 200ms; không bao giờ lưu trữ mật khẩu ở dạng rõ (plain text); không gây reload trang.")
    ]
    t_uc01 = doc.add_table(rows=len(uc_01), cols=2)
    format_use_case_table(t_uc01, uc_01)

    # CHƯƠNG 5: CLASS DIAGRAM
    add_h1(doc, "5. Thiết Kế Sơ Đồ Lớp (Class Diagram Specification)")
    add_diagram_image(doc, "class_diagram_noviara.png", "Hình 5.1: Sơ đồ Lớp (Class Diagram) Chi Tiết Cấu Trúc Các Tầng Thực Thể & Dịch Vụ NOVIARA", width_inches=6.4)

    # CHƯƠNG 6: SEQUENCE DIAGRAMS
    add_h1(doc, "6. Thiết Kế Sơ Đồ Trình Tự (Sequence Diagrams Specification)")
    add_h2(doc, "6.1. Sơ Đồ Trình Tự 1: Đăng Nhập & Xác Thực Mật Khẩu PBKDF2 (Seq-01)")
    add_diagram_image(doc, "seq_01_auth_login.png", "Hình 6.1: Sơ đồ Trình tự Đăng nhập & Xác thực Mật khẩu PBKDF2 (Seq-01)")

    add_h2(doc, "6.2. Sơ Đồ Trình Tự 2: Nạp Danh Sách Sinh Viên Excel & Lưu Vết Tệp (Seq-02)")
    add_diagram_image(doc, "seq_02_upload_excel.png", "Hình 6.2: Sơ đồ Trình tự Nạp Danh Sách Sinh Viên Excel & Lưu Vết Tệp (Seq-02)")

    add_h2(doc, "6.3. Sơ Đồ Trình Tự 3: Sinh Viên Làm Khảo Sát DISC & Tính Điểm (Seq-03)")
    add_diagram_image(doc, "seq_03_disc_survey.png", "Hình 6.3: Sơ đồ Trình tự Sinh Viên Làm Khảo Sát DISC & Tính Điểm (Seq-03)")

    add_h2(doc, "6.4. Sơ Đồ Trình Tự 4: Phân Nhóm Bằng Giải Thuật Di Truyền GA (Seq-04)")
    add_diagram_image(doc, "seq_04_ga_pipeline.png", "Hình 6.4: Sơ đồ Trình tự Phân Nhóm Bằng Giải Thuật Di Truyền GA (Seq-04)")

    add_h2(doc, "6.5. Sơ Đồ Trình Tự 5: Giảng Viên Bổ Nhiệm / Đổi Trưởng Nhóm (Seq-05)")
    add_diagram_image(doc, "seq_05_leader_adjustment.png", "Hình 6.5: Sơ đồ Trình tự Giảng Viên Bổ Nhiệm / Đổi Trưởng Nhóm (Seq-05)")

    add_h2(doc, "6.6. Sơ Đồ Trình Tự 6: Công Bố Kết Quả & Sinh Viên Tra Cứu Trực Tuyến (Seq-06)")
    add_diagram_image(doc, "seq_06_publish_lookup.png", "Hình 6.6: Sơ đồ Trình tự Công Bố Kết Quả & Sinh Viên Tra Cứu (Seq-06)")

    out_file = out_dir / "Phan_tich_Thiet_ke_He_thong_va_Usecase_NOVIARA.docx"
    try:
        doc.save(str(out_file))
        print(f"Build thanh cong SAD DOCX: {out_file.resolve()} ({out_file.stat().st_size:,} bytes)")
    except PermissionError:
        backup_file = out_dir / "Phan_tich_Thiet_ke_He_thong_va_Usecase_NOVIARA_Moi.docx"
        doc.save(str(backup_file))
        print(f"File SAD dang duoc mo trong Word. Da luu ban moi vao: {backup_file.resolve()} ({backup_file.stat().st_size:,} bytes)")

if __name__ == "__main__":
    update_sad_doc()
    build_master_uml()

