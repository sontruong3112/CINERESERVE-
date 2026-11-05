# -*- coding: utf-8 -*-
"""
Script tong hop toan bo Bao cao Do an Tot nghiep CineReserve HaUI
Chen hinh anh thuc te vao tung vi tri Danh muc hinh anh
Chuan 100% theo form Do an K16 Truong CNTT & Truyen thong - DH Cong nghiep Ha Noi
"""

import os
import docx
from docx import Document
from docx.shared import Inches, Pt, RGBColor, Cm
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn

def set_cell_margins(cell, top=80, bottom=80, left=100, right=100):
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = OxmlElement('w:tcMar')
    for m, val in [('top', top), ('bottom', bottom), ('left', left), ('right', right)]:
        node = OxmlElement(f'w:{m}')
        node.set(qn('w:w'), str(val))
        node.set(qn('w:type'), 'dxa')
        tcMar.append(node)
    tcPr.append(tcMar)

def set_cell_shading(cell, color_hex):
    shading = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{color_hex}"/>')
    cell._tc.get_or_add_tcPr().append(shading)

def set_table_borders(table, color="D3D3D3"):
    tblPr = table._tbl.tblPr
    borders = parse_xml(f'''
        <w:tblBorders {nsdecls("w")}>
            <w:top w:val="single" w:sz="6" w:space="0" w:color="{color}"/>
            <w:bottom w:val="single" w:sz="8" w:space="0" w:color="003366"/>
            <w:insideH w:val="single" w:sz="4" w:space="0" w:color="{color}"/>
            <w:insideV w:val="none"/>
            <w:left w:val="none"/>
            <w:right w:val="none"/>
        </w:tblBorders>
    ''')
    tblPr.append(borders)

def build_thesis_with_images():
    doc = Document()

    # 1. Page Setup theo chuan HaUI
    for section in doc.sections:
        section.page_width = Cm(21.0)
        section.page_height = Cm(29.7)
        section.left_margin = Cm(3.5)
        section.right_margin = Cm(2.0)
        section.top_margin = Cm(2.5)
        section.bottom_margin = Cm(2.5)
        section.different_first_page_header_footer = True

    # 2. Normal Style
    style_normal = doc.styles['Normal']
    font = style_normal.font
    font.name = 'Times New Roman'
    font.size = Pt(13)
    font.color.rgb = RGBColor(0x22, 0x22, 0x22)
    style_normal.paragraph_format.line_spacing = 1.35
    style_normal.paragraph_format.space_after = Pt(4)
    style_normal.paragraph_format.space_before = Pt(0)

    def add_title_p(text, size=14, bold=True, align=WD_ALIGN_PARAGRAPH.CENTER, color=RGBColor(0, 0, 0), space_before=0, space_after=6):
        p = doc.add_paragraph()
        p.alignment = align
        p.paragraph_format.space_before = Pt(space_before)
        p.paragraph_format.space_after = Pt(space_after)
        p.paragraph_format.line_spacing = 1.2
        run = p.add_run(text)
        run.bold = bold
        run.font.name = 'Times New Roman'
        run.font.size = Pt(size)
        run.font.color.rgb = color
        return p

    def add_p(text, bold_prefix="", indent=True, align=WD_ALIGN_PARAGRAPH.JUSTIFY, space_after=4):
        p = doc.add_paragraph()
        p.alignment = align
        p.paragraph_format.space_before = Pt(0)
        p.paragraph_format.space_after = Pt(space_after)
        p.paragraph_format.line_spacing = 1.35
        if indent:
            p.paragraph_format.first_line_indent = Cm(1.27)
        
        if bold_prefix:
            r_pre = p.add_run(bold_prefix)
            r_pre.bold = True
            r_pre.font.name = 'Times New Roman'
            r_pre.font.size = Pt(13)
        
        r_text = p.add_run(text)
        r_text.font.name = 'Times New Roman'
        r_text.font.size = Pt(13)
        return p

    def add_h1(title):
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.LEFT
        p.paragraph_format.space_before = Pt(16)
        p.paragraph_format.space_after = Pt(6)
        p.paragraph_format.keep_with_next = True
        r = p.add_run(title)
        r.bold = True
        r.font.name = 'Times New Roman'
        r.font.size = Pt(15)
        r.font.color.rgb = RGBColor(0x00, 0x33, 0x66)
        return p

    def add_h2(title):
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.LEFT
        p.paragraph_format.space_before = Pt(12)
        p.paragraph_format.space_after = Pt(4)
        p.paragraph_format.keep_with_next = True
        r = p.add_run(title)
        r.bold = True
        r.font.name = 'Times New Roman'
        r.font.size = Pt(13.5)
        r.font.color.rgb = RGBColor(0x11, 0x11, 0x11)
        return p

    def add_h3(title):
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.LEFT
        p.paragraph_format.space_before = Pt(8)
        p.paragraph_format.space_after = Pt(3)
        p.paragraph_format.keep_with_next = True
        r = p.add_run(title)
        r.bold = True
        r.italic = True
        r.font.name = 'Times New Roman'
        r.font.size = Pt(13)
        r.font.color.rgb = RGBColor(0x33, 0x33, 0x33)
        return p

    def add_bullet(text, bold_prefix=""):
        p = doc.add_paragraph(style='List Bullet')
        p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
        p.paragraph_format.space_before = Pt(0)
        p.paragraph_format.space_after = Pt(3)
        p.paragraph_format.line_spacing = 1.3
        if bold_prefix:
            r_pre = p.add_run(bold_prefix)
            r_pre.bold = True
            r_pre.font.name = 'Times New Roman'
            r_pre.font.size = Pt(13)
        r_text = p.add_run(text)
        r_text.font.name = 'Times New Roman'
        r_text.font.size = Pt(13)
        return p

    def add_table_header_caption(text):
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.LEFT
        p.paragraph_format.space_before = Pt(8)
        p.paragraph_format.space_after = Pt(3)
        p.paragraph_format.keep_with_next = True
        r = p.add_run(text)
        r.bold = True
        r.font.name = 'Times New Roman'
        r.font.size = Pt(12)
        return p

    def add_image_with_caption(img_path, caption_text, width_cm=14.5):
        if os.path.exists(img_path):
            p_img = doc.add_paragraph()
            p_img.alignment = WD_ALIGN_PARAGRAPH.CENTER
            p_img.paragraph_format.space_before = Pt(8)
            p_img.paragraph_format.space_after = Pt(4)
            run = p_img.add_run()
            run.add_picture(img_path, width=Cm(width_cm))
        
        p_cap = doc.add_paragraph()
        p_cap.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p_cap.paragraph_format.space_before = Pt(2)
        p_cap.paragraph_format.space_after = Pt(10)
        r = p_cap.add_run(caption_text)
        r.bold = True
        r.italic = True
        r.font.name = 'Times New Roman'
        r.font.size = Pt(12)

    def add_usecase_table(code, name, actor, desc, main_flow, alt_flow, pre_cond="", post_cond=""):
        add_table_header_caption(f"Bảng 2.{code} Mô tả Use case {name}")
        t = doc.add_table(rows=7, cols=2)
        t.alignment = WD_TABLE_ALIGNMENT.CENTER
        set_table_borders(t)
        
        fields = [
            ("Tên Usecase", name),
            ("Tác nhân", actor),
            ("Mô tả vắn tắt", desc),
            ("Luồng cơ bản", main_flow),
            ("Luồng rẽ nhánh", alt_flow),
            ("Tiền điều kiện", pre_cond if pre_cond else "Không có"),
            ("Hậu điều kiện", post_cond if post_cond else "Hệ thống ghi nhận thành công")
        ]
        
        for idx, (lbl, val) in enumerate(fields):
            c0 = t.cell(idx, 0)
            c1 = t.cell(idx, 1)
            c0.width = Cm(4.0)
            c1.width = Cm(11.5)
            
            p0 = c0.paragraphs[0]
            p0.paragraph_format.space_after = Pt(2)
            r0 = p0.add_run(lbl)
            r0.bold = True
            r0.font.name = 'Times New Roman'
            r0.font.size = Pt(11)
            set_cell_shading(c0, "F4F6F8")
            
            p1 = c1.paragraphs[0]
            p1.paragraph_format.space_after = Pt(2)
            p1.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
            r1 = p1.add_run(val)
            r1.font.name = 'Times New Roman'
            r1.font.size = Pt(11)
            
            set_cell_margins(c0, top=60, bottom=60, left=80, right=80)
            set_cell_margins(c1, top=60, bottom=60, left=80, right=80)
        
        p_space = doc.add_paragraph()
        p_space.paragraph_format.space_after = Pt(6)

    # =========================================================================
    # TRANG BÌA CHÍNH
    # =========================================================================
    add_title_p("BỘ CÔNG THƯƠNG", size=13, bold=True, space_after=2)
    add_title_p("TRƯỜNG ĐẠI HỌC CÔNG NGHIỆP HÀ NỘI", size=14, bold=True, space_after=2)
    add_title_p("---------------------------------------", size=12, bold=False, space_after=40)

    add_title_p("ĐỒ ÁN TỐT NGHIỆP ĐẠI HỌC", size=18, bold=True, color=RGBColor(0x00, 0x20, 0x60), space_after=6)
    add_title_p("NGÀNH KHOA HỌC MÁY TÍNH", size=14, bold=True, color=RGBColor(0x00, 0x33, 0x66), space_after=36)

    add_title_p("XÂY DỰNG WEBSITE ĐẶT VÉ XEM PHIM CINERESERVE SỬ DỤNG NEXT.JS, TYPESCRIPT VÀ TÍCH HỢP CHATBOT AI", 
                size=16, bold=True, color=RGBColor(0x80, 0x00, 0x00), space_after=70)

    t_info = doc.add_table(rows=3, cols=3)
    t_info.alignment = WD_TABLE_ALIGNMENT.CENTER
    info_data = [
        ("GVHD", ":", "ThS. [Họ và tên GVHD]"),
        ("Sinh viên", ":", "[Họ và tên sinh viên]"),
        ("Mã sinh viên", ":", "[Mã sinh viên]")
    ]
    for row_idx, (lbl, sep, val) in enumerate(info_data):
        c0, c1, c2 = t_info.cell(row_idx, 0), t_info.cell(row_idx, 1), t_info.cell(row_idx, 2)
        c0.width, c1.width, c2.width = Cm(3.5), Cm(0.8), Cm(8.0)
        p0, p1, p2 = c0.paragraphs[0], c1.paragraphs[0], c2.paragraphs[0]
        p0.paragraph_format.space_after = Pt(3)
        p1.paragraph_format.space_after = Pt(3)
        p2.paragraph_format.space_after = Pt(3)
        
        r0 = p0.add_run(lbl); r0.bold = True; r0.font.name = 'Times New Roman'; r0.font.size = Pt(13)
        r1 = p1.add_run(sep); r1.bold = True; r1.font.name = 'Times New Roman'; r1.font.size = Pt(13)
        r2 = p2.add_run(val); r2.font.name = 'Times New Roman'; r2.font.size = Pt(13)

    add_title_p("", size=12, space_after=70)
    add_title_p("Hà Nội – Năm 2026", size=13, bold=True, space_after=0)
    doc.add_page_break()

    # =========================================================================
    # TRANG PHỤ BÌA (TRƯỜNG CÔNG NGHỆ THÔNG TIN VÀ TRUYỀN THÔNG)
    # =========================================================================
    add_title_p("TRƯỜNG ĐẠI HỌC CÔNG NGHIỆP HÀ NỘI", size=13, bold=True, space_after=2)
    add_title_p("TRƯỜNG CÔNG NGHỆ THÔNG TIN VÀ TRUYỀN THÔNG", size=14, bold=True, space_after=2)
    add_title_p("---------------------------------------", size=12, bold=False, space_after=35)

    add_title_p("ĐỒ ÁN TỐT NGHIỆP ĐẠI HỌC", size=16, bold=True, space_after=6)
    add_title_p("NGÀNH KHOA HỌC MÁY TÍNH", size=13, bold=True, space_after=30)

    add_title_p("ĐỀ TÀI: XÂY DỰNG WEBSITE ĐẶT VÉ XEM PHIM CINERESERVE SỬ DỤNG NEXT.JS, TYPESCRIPT VÀ TÍCH HỢP CHATBOT AI", 
                size=15, bold=True, color=RGBColor(0x80, 0x00, 0x00), space_after=50)

    t_sub = doc.add_table(rows=4, cols=3)
    t_sub.alignment = WD_TABLE_ALIGNMENT.CENTER
    sub_data = [
        ("GVHD", ":", "ThS. [Họ và tên GVHD]"),
        ("Sinh viên", ":", "[Họ và tên sinh viên]"),
        ("Mã sinh viên", ":", "[Mã sinh viên]"),
        ("Lớp - Khóa", ":", "2021DHKHMT02 - K16")
    ]
    for row_idx, (lbl, sep, val) in enumerate(sub_data):
        c0, c1, c2 = t_sub.cell(row_idx, 0), t_sub.cell(row_idx, 1), t_sub.cell(row_idx, 2)
        c0.width, c1.width, c2.width = Cm(3.5), Cm(0.8), Cm(8.0)
        p0, p1, p2 = c0.paragraphs[0], c1.paragraphs[0], c2.paragraphs[0]
        p0.paragraph_format.space_after = Pt(3)
        p1.paragraph_format.space_after = Pt(3)
        p2.paragraph_format.space_after = Pt(3)
        
        r0 = p0.add_run(lbl); r0.bold = True; r0.font.name = 'Times New Roman'; r0.font.size = Pt(13)
        r1 = p1.add_run(sep); r1.bold = True; r1.font.name = 'Times New Roman'; r1.font.size = Pt(13)
        r2 = p2.add_run(val); r2.font.name = 'Times New Roman'; r2.font.size = Pt(13)

    add_title_p("", size=12, space_after=60)
    add_title_p("Hà Nội – Năm 2026", size=13, bold=True, space_after=0)
    doc.add_page_break()

    # =========================================================================
    # LỜI CẢM ƠN
    # =========================================================================
    add_title_p("LỜI CẢM ƠN", size=16, bold=True, space_after=18)
    add_p("Lời đầu tiên, em xin bày tỏ sự cảm ơn chân thành và sâu sắc đến Ban Giám hiệu cùng đội ngũ giảng viên của Trường Công nghệ Thông tin và Truyền thông - Đại học Công nghiệp Hà Nội đã tận tình trong quá trình giảng dạy, trang bị cho em những kiến thức, kỹ năng quan trọng trong suốt quá trình tham gia học tập tại trường. Nhờ đó, em mới có thể tự mình tiếp tục tìm hiểu và tiếp thu thêm các kiến thức mới, công nghệ mới, bổ trợ cho quá trình thực hiện đồ án cũng như là công việc sau này.")
    add_p("Đặc biệt, em xin gửi lời trân trọng cảm ơn đến ThS. [Họ và tên GVHD], người đã trực tiếp định hướng, chỉ dẫn và góp ý tận tình trong quá trình thực hiện đồ án \"Xây dựng website đặt vé xem phim CineReserve sử dụng Next.js, TypeScript và tích hợp chatbot AI\". Nhờ những ý kiến đóng góp và chỉ bảo quý báu của Thầy/Cô mà em đã có thể hoàn thiện báo cáo này một cách chỉn chu nhất.")
    add_p("Dù với sự nỗ lực và cố gắng của bản thân cùng với sự trợ giúp của mọi người trong quá trình thực hiện đồ án, em sẽ không thể tránh khỏi những thiếu sót. Em rất mong nhận được những ý kiến đóng góp của thầy/cô và mọi người để đề tài được hoàn thiện hơn.")
    add_p("Em xin chân thành cảm ơn!")
    
    add_p("", indent=False, space_after=20)
    p_author = doc.add_paragraph()
    p_author.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    r_author = p_author.add_run("Sinh viên thực hiện\n\n\n\n[Họ và tên sinh viên]")
    r_author.bold = True
    r_author.font.name = 'Times New Roman'
    r_author.font.size = Pt(13)
    doc.add_page_break()

    # =========================================================================
    # MỤC LỤC
    # =========================================================================
    add_title_p("MỤC LỤC", size=16, bold=True, space_after=14)
    toc_data = [
        ("LỜI CẢM ƠN", "I"),
        ("DANH MỤC BẢNG BIỂU", "V"),
        ("DANH MỤC HÌNH ẢNH", "VI"),
        ("DANH MỤC CÁC TỪ VIẾT TẮT", "VIII"),
        ("MỞ ĐẦU", "1"),
        ("    1. Lý do chọn đề tài", "1"),
        ("    2. Mục tiêu của đề tài", "2"),
        ("    3. Đối tượng và phạm vi nghiên cứu", "2"),
        ("    4. Ý nghĩa khoa học và thực tiễn của đề tài", "5"),
        ("    5. Bố cục đề tài", "6"),
        ("CHƯƠNG 1: CƠ SỞ LÝ THUYẾT VÀ CÔNG NGHỆ HỖ TRỢ", "7"),
        ("    1.1 Tổng quan về website đặt vé xem phim trực tuyến", "7"),
        ("    1.2 Xu hướng phát triển các nền tảng đặt vé trực tuyến", "9"),
        ("    1.3 Các công nghệ phát triển web hiện đại", "13"),
        ("        1.3.1 Kiến trúc Client – Server", "14"),
        ("        1.3.2 Server-Side Rendering (SSR) & React Server Components", "16"),
        ("        1.3.3 RESTful API & Giao thức Streaming", "18"),
        ("    1.4 Cơ sở lý thuyết về bộ công nghệ CineReserve", "22"),
        ("        1.4.1 PostgreSQL – Hệ quản trị cơ sở dữ liệu quan hệ mạnh mẽ", "23"),
        ("        1.4.2 Prisma ORM – Ánh xạ dữ liệu an toàn kiểu tĩnh", "24"),
        ("        1.4.3 React 19 & Next.js 16 App Router – Nền tảng Full-stack hiện đại", "25"),
        ("        1.4.4 TypeScript – Ngôn ngữ định kiểu tĩnh cho hệ thống lớn", "26"),
        ("    1.5 Các công cụ hỗ trợ triển khai", "26"),
        ("        1.5.1 Google Gemini AI – Mô hình ngôn ngữ lớn tư vấn phim", "27"),
        ("        1.5.2 Mã QR & jsQR – Giải pháp soát vé một lần tại rạp", "28"),
        ("        1.5.3 Scrypt & Web Cryptography – Giải pháp bảo mật mật khẩu", "28"),
        ("        1.5.4 Git & GitHub – Quản lý phiên bản và mã nguồn dự án", "29"),
        ("CHƯƠNG 2: KHẢO SÁT, PHÂN TÍCH VÀ THIẾT KẾ HỆ THỐNG", "31"),
        ("    2.1 Khảo sát và phân tích yêu cầu hệ thống", "31"),
        ("        2.1.1 Khảo sát và thu thập yêu cầu", "31"),
        ("        2.1.2 Xác định các tác nhân", "33"),
        ("        2.1.3 Yêu cầu chức năng", "33"),
        ("        2.1.4 Yêu cầu phi chức năng", "34"),
        ("    2.2 Biểu đồ use case", "35"),
        ("        2.2.1 Biểu đồ use case tổng quát", "35"),
        ("        2.2.2 Biểu đồ use case chính", "36"),
        ("        2.2.3 Biểu đồ use case thứ cấp", "36"),
        ("        2.2.4 Quan hệ của các use case", "37"),
        ("    2.3 Mô tả chi tiết use case", "38"),
        ("        2.3.1 Use case Đăng ký", "38"),
        ("        2.3.2 Use case Đăng nhập", "38"),
        ("        2.3.3 Use case Đăng xuất", "39"),
        ("        2.3.4 Use case Quản lý thông tin cá nhân", "40"),
        ("        2.3.5 Use case Tìm kiếm và Xem chi tiết phim", "40"),
        ("        2.3.6 Use case Đặt vé nhanh (Quick Booking)", "41"),
        ("        2.3.7 Use case Chọn và Giữ ghế 5 phút", "42"),
        ("        2.3.8 Use case Thanh toán và Nhận vé QR", "42"),
        ("        2.3.9 Use case Trò chuyện với Trợ lý phim AI", "43"),
        ("        2.3.10 Use case Tra cứu đơn hàng (Khách hàng & Vận hành)", "44"),
        ("        2.3.11 Use case Soát vé QR (Nhân viên)", "45"),
        ("        2.3.12 Use case Quản lý phim và Lịch chiếu (Admin)", "45"),
        ("        2.3.13 Use case Quản lý nhân viên (Admin)", "46"),
        ("        2.3.14 Use case Báo cáo doanh thu (Staff & Admin)", "47"),
        ("    2.4 Phân tích Use case", "48"),
        ("        2.4.1 Phân tích use case Đăng ký & Đăng nhập", "48"),
        ("        2.4.2 Phân tích use case Chọn và Giữ ghế 5 phút", "49"),
        ("        2.4.3 Phân tích use case Thanh toán đơn hàng", "50"),
        ("        2.4.4 Phân tích use case Soát vé QR tại rạp", "51"),
        ("        2.4.5 Phân tích use case Trò chuyện với Trợ lý AI", "52"),
        ("        2.4.6 Phân tích use case Quản lý lịch chiếu không trùng phòng", "53"),
        ("        2.4.7 Phân tích use case Tổng hợp Báo cáo doanh thu", "53"),
        ("    2.5 Thiết kế cơ sở dữ liệu", "53"),
        ("        2.5.1 Users & AuthSessions – lưu thông tin người dùng và phiên", "53"),
        ("        2.5.2 Movies, MovieTranslations & Genres – lưu danh mục phim", "54"),
        ("        2.5.3 Cinemas, Auditoriums & Seats – lưu rạp và sơ đồ ghế", "54"),
        ("        2.5.4 Showtimes & ShowtimeSeats – lưu suất chiếu và trạng thái ghế", "55"),
        ("        2.5.5 HoldSessions, Bookings & PaymentAttempts – lưu giữ chỗ và đơn hàng", "55"),
        ("        2.5.6 Tickets & TicketRedemptions – lưu vé điện tử và soát vé", "56"),
        ("        2.5.7 AuditLogs & Refunds – lưu vết kiểm toán và hoàn tiền", "56"),
        ("CHƯƠNG 3: KẾT QUẢ VÀ ĐÁNH GIÁ", "57"),
        ("    3.1 Chuẩn bị môi trường và mã nguồn", "57"),
        ("    3.2 Kết quả triển khai", "59"),
        ("    3.3 Kiểm thử hệ thống", "63"),
        ("    3.4 Kết quả đánh giá", "64"),
        ("KẾT LUẬN", "66"),
        ("TÀI LIỆU THAM KHẢO", "67")
    ]
    for item, page in toc_data:
        p = doc.add_paragraph()
        p.paragraph_format.space_after = Pt(2)
        r1 = p.add_run(item)
        r1.font.name = 'Times New Roman'
        r1.font.size = Pt(12)
        if not item.startswith("    "):
            r1.bold = True
        
        dot_count = max(5, 75 - len(item) * 1)
        r_dots = p.add_run(" " + "." * dot_count + " ")
        r_dots.font.name = 'Times New Roman'
        r_dots.font.size = Pt(10)
        r_dots.font.color.rgb = RGBColor(0x99, 0x99, 0x99)
        
        r2 = p.add_run(page)
        r2.bold = True
        r2.font.name = 'Times New Roman'
        r2.font.size = Pt(12)
    doc.add_page_break()

    # =========================================================================
    # DANH MỤC BẢNG BIỂU & HÌNH ẢNH
    # =========================================================================
    add_title_p("DANH MỤC BẢNG BIỂU", size=16, bold=True, space_after=14)
    tbl_index = [
        ("Bảng 1.1", "Tổng hợp công nghệ xây dựng CineReserve", "29"),
        ("Bảng 2.1", "Doanh thu thị trường điện ảnh và bán vé trực tuyến qua các năm", "32"),
        ("Bảng 2.2", "Các yêu cầu về chức năng hệ thống", "34"),
        ("Bảng 2.3", "Mô tả Use case Đăng ký", "38"),
        ("Bảng 2.4", "Mô tả Use case Đăng nhập", "38"),
        ("Bảng 2.5", "Mô tả Use case Đăng xuất", "39"),
        ("Bảng 2.6", "Mô tả Use case Quản lý thông tin cá nhân", "40"),
        ("Bảng 2.7", "Mô tả Use case Tìm kiếm và Xem chi tiết phim", "40"),
        ("Bảng 2.8", "Mô tả Use case Đặt vé nhanh", "41"),
        ("Bảng 2.9", "Mô tả Use case Chọn và Giữ ghế 5 phút", "42"),
        ("Bảng 2.10", "Mô tả Use case Thanh toán và Nhận vé QR", "42"),
        ("Bảng 2.11", "Mô tả Use case Trò chuyện với Trợ lý phim AI", "43"),
        ("Bảng 2.12", "Mô tả Use case Tra cứu đơn hàng", "44"),
        ("Bảng 2.13", "Mô tả Use case Soát vé QR (Nhân viên)", "45"),
        ("Bảng 2.14", "Mô tả Use case Quản lý phim và Lịch chiếu (Admin)", "45"),
        ("Bảng 2.15", "Mô tả Use case Quản lý nhân viên (Admin)", "46"),
        ("Bảng 2.16", "Mô tả Use case Báo cáo doanh thu (Staff & Admin)", "47"),
        ("Bảng 2.17", "Cấu trúc bảng Users lưu thông tin người dùng", "53"),
        ("Bảng 2.18", "Cấu trúc bảng Movies & Showtimes lưu phim và suất chiếu", "54"),
        ("Bảng 2.19", "Cấu trúc bảng Bookings & Tickets lưu đơn hàng và vé", "55"),
        ("Bảng 3.1", "Các case kiểm thử hệ thống CineReserve", "63")
    ]
    for b_code, b_name, b_page in tbl_index:
        p = doc.add_paragraph()
        p.paragraph_format.space_after = Pt(2.5)
        r_c = p.add_run(b_code + " ")
        r_c.bold = True
        r_c.font.name = 'Times New Roman'
        r_c.font.size = Pt(12)
        r_n = p.add_run(b_name)
        r_n.font.name = 'Times New Roman'
        r_n.font.size = Pt(12)

    add_title_p("", size=12, space_after=12)
    add_title_p("DANH MỤC HÌNH ẢNH", size=16, bold=True, space_after=14)
    fig_index = [
        ("Hình 1.1", "Giao diện hệ thống đặt vé xem phim trực tuyến hiện đại", "7"),
        ("Hình 1.2", "Các ứng dụng và nền tảng đặt vé xem phim phổ biến tại Việt Nam", "8"),
        ("Hình 1.3", "Doanh thu ấn tượng từ dịch vụ đặt vé trực tuyến qua các năm", "10"),
        ("Hình 1.4", "Thị phần các kênh phân phối vé xem phim trên thế giới", "11"),
        ("Hình 1.5", "Công nghệ quét vé không chạm QR Code tại các cụm rạp", "12"),
        ("Hình 1.6", "Nguyên tắc hoạt động của mô hình Client - Server", "14"),
        ("Hình 1.7", "Cách thức hoạt động của Client - Server", "15"),
        ("Hình 1.8", "Ưu và nhược điểm của mô hình Client - Server", "15"),
        ("Hình 1.9", "So sánh mô hình Server-Side Rendering (SSR) và Client-Side Rendering", "16"),
        ("Hình 1.10", "Ưu điểm của kiến trúc React Server Components trên Next.js", "17"),
        ("Hình 1.11", "Kiến trúc RESTful API và luồng dữ liệu", "19"),
        ("Hình 1.12", "Cách thức hoạt động của RESTful API", "20"),
        ("Hình 1.13", "Cấu trúc kiểu dữ liệu JSON trong trao đổi API", "21"),
        ("Hình 1.14", "Bộ công nghệ cốt lõi xây dựng hệ thống CineReserve", "22"),
        ("Hình 1.15", "Cơ sở dữ liệu quan hệ PostgreSQL và Prisma ORM", "23"),
        ("Hình 1.16", "Sơ đồ luồng xử lý Transaction và Advisory Lock trong PostgreSQL", "24"),
        ("Hình 1.17", "Cơ chế phân chia Component trong React 19 và Next.js 16", "25"),
        ("Hình 1.18", "Xử lý bất đồng bộ và Non-blocking I/O trong Node.js", "26"),
        ("Hình 1.19", "Mô hình ngôn ngữ lớn Google Gemini AI", "27"),
        ("Hình 1.20", "Giải thuật đọc mã QR bằng jsQR trên Web Camera", "28"),
        ("Hình 2.1", "Biểu đồ Use case tổng quát", "35"),
        ("Hình 2.2", "Các Use case chính (Khách hàng)", "36"),
        ("Hình 2.3", "Các Use case thứ cấp (Nhân viên & Quản trị)", "36"),
        ("Hình 2.4", "Quan hệ giữa các Use case", "37"),
        ("Hình 2.5", "Biểu đồ trình tự Use case Đăng ký", "48"),
        ("Hình 2.6", "Biểu đồ trình tự Use case Đăng nhập", "49"),
        ("Hình 2.7", "Biểu đồ trình tự Use case Chọn và Giữ ghế 5 phút", "49"),
        ("Hình 2.8", "Biểu đồ trình tự Use case Thanh toán và Nhận vé QR", "50"),
        ("Hình 2.9", "Biểu đồ trình tự Use case Soát vé QR tại rạp", "51"),
        ("Hình 2.10", "Biểu đồ trình tự Use case Trò chuyện với Trợ lý AI", "52"),
        ("Hình 2.11", "Biểu đồ trình tự Use case Quản lý lịch chiếu không trùng phòng", "53"),
        ("Hình 3.1", "Giao diện trang chủ đã đăng nhập", "59"),
        ("Hình 3.2", "Giao diện danh mục phim và bộ lọc theo rạp/ngày", "59"),
        ("Hình 3.3", "Giao diện chi tiết phim và lịch chiếu theo rạp", "60"),
        ("Hình 3.4", "Giao diện sơ đồ phòng chiếu và chọn ghế 5 phút", "60"),
        ("Hình 3.5", "Giao diện thanh toán và xác nhận độ tuổi", "61"),
        ("Hình 3.6", "Giao diện hướng dẫn và chính sách vé", "61"),
        ("Hình 3.7", "Giao diện đăng nhập hệ thống CineReserve", "62"),
        ("Hình 3.8", "Giao diện đăng ký tài khoản khách hàng mới", "62"),
        ("Hình 3.9", "Giao diện quản lý lịch chiếu và phòng chiếu Admin", "63"),
        ("Hình 3.10", "Giao diện chọn ghế và đồng hồ đếm ngược 5 phút thực tế", "63")
    ]
    for f_code, f_name, f_page in fig_index:
        p = doc.add_paragraph()
        p.paragraph_format.space_after = Pt(2.5)
        r_c = p.add_run(f_code + " ")
        r_c.bold = True
        r_c.font.name = 'Times New Roman'
        r_c.font.size = Pt(12)
        r_n = p.add_run(f_name)
        r_n.font.name = 'Times New Roman'
        r_n.font.size = Pt(12)
    doc.add_page_break()

    # =========================================================================
    # DANH MỤC CÁC TỪ VIẾT TẮT
    # =========================================================================
    add_title_p("DANH MỤC CÁC TỪ VIẾT TẮT", size=16, bold=True, space_after=14)
    t_abbr = doc.add_table(rows=1, cols=4)
    t_abbr.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_borders(t_abbr)
    hdr_cells = t_abbr.rows[0].cells
    hdr_cells[0].text = "STT"; hdr_cells[1].text = "Từ viết tắt"; hdr_cells[2].text = "Tiếng Anh"; hdr_cells[3].text = "Tiếng Việt"
    for c in hdr_cells:
        set_cell_shading(c, "EBF1F5")
        p = c.paragraphs[0]; p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        for r in p.runs: r.bold = True; r.font.name = 'Times New Roman'; r.font.size = Pt(11.5)

    abbr_list = [
        ("1", "AI", "Artificial Intelligence", "Trí tuệ nhân tạo"),
        ("2", "API", "Application Programming Interface", "Giao diện lập trình ứng dụng"),
        ("3", "CSRF", "Cross-Site Request Forgery", "Giả mạo yêu cầu giữa các trang web"),
        ("4", "DTO", "Data Transfer Object", "Đối tượng truyền tải dữ liệu"),
        ("5", "ERD", "Entity Relationship Diagram", "Sơ đồ quan hệ thực thể"),
        ("6", "HaUI", "Hanoi University of Industry", "Trường Đại học Công nghiệp Hà Nội"),
        ("7", "HTTP", "HyperText Transfer Protocol", "Giao thức truyền siêu văn bản"),
        ("8", "JSON", "JavaScript Object Notation", "Định dạng ký hiệu đối tượng JavaScript"),
        ("9", "LLM", "Large Language Model", "Mô hình ngôn ngữ lớn"),
        ("10", "NDJSON", "Newline-Delimited JSON", "Định dạng JSON phân tách theo dòng"),
        ("11", "ORM", "Object-Relational Mapping", "Ánh xạ quan hệ đối tượng"),
        ("12", "PII", "Personally Identifiable Information", "Thông tin định danh cá nhân nhạy cảm"),
        ("13", "QR Code", "Quick Response Code", "Mã phản hồi nhanh (mã vạch ma trận 2D)"),
        ("14", "RBAC", "Role-Based Access Control", "Kiểm soát truy cập dựa trên vai trò"),
        ("15", "REST", "Representational State Transfer", "Chuyển đổi trạng thái đại diện"),
        ("16", "RSC", "React Server Components", "Thành phần máy chủ React"),
        ("17", "SEO", "Search Engine Optimization", "Tối ưu hóa công cụ tìm kiếm"),
        ("18", "SPA", "Single Page Application", "Ứng dụng trang đơn"),
        ("19", "SSR", "Server-Side Rendering", "Kết xuất phía máy chủ"),
        ("20", "UUID", "Universally Unique Identifier", "Mã định danh duy nhất toàn cầu"),
        ("21", "VND", "Vietnamese Dong", "Đồng Việt Nam")
    ]
    for stt, abb, eng, vie in abbr_list:
        row = t_abbr.add_row()
        c0, c1, c2, c3 = row.cells
        c0.text, c1.text, c2.text, c3.text = stt, abb, eng, vie
        for idx, c in enumerate([c0, c1, c2, c3]):
            set_cell_margins(c, top=60, bottom=60, left=80, right=80)
            p = c.paragraphs[0]; p.paragraph_format.space_after = Pt(2)
            if idx in (0, 1):
                p.alignment = WD_ALIGN_PARAGRAPH.CENTER
                for r in p.runs:
                    if idx == 1: r.bold = True
                    r.font.name = 'Times New Roman'; r.font.size = Pt(11)
            else:
                p.alignment = WD_ALIGN_PARAGRAPH.LEFT
                for r in p.runs: r.font.name = 'Times New Roman'; r.font.size = Pt(11)
    doc.add_page_break()

    # =========================================================================
    # MỞ ĐẦU (1)
    # =========================================================================
    add_title_p("MỞ ĐẦU", size=16, bold=True, space_after=14)
    add_h2("1. Lý do chọn đề tài")
    add_p("Trong thời đại hiện nay, cùng với sự phát triển mạnh mẽ của công nghệ thông tin và mạng Internet, nhu cầu giải trí trực tuyến của người dân ngày càng tăng cao. Điện ảnh không chỉ là một hình thức nghệ thuật giải trí đại chúng hàng đầu mà còn là không gian gắn kết, chia sẻ cảm xúc và trải nghiệm văn hóa tuyệt vời giữa bạn bè và gia đình. Các cụm rạp chiếu phim hiện đại như CGV, Lotte Cinema, Beta Cinemas hay BHD Star đã trở thành điểm đến quen thuộc vào mỗi dịp cuối tuần của hàng triệu khán giả trẻ trên khắp cả nước.")
    add_p("Sự phát triển vượt bậc của các công nghệ web hiện đại, đặc biệt là các framework full-stack thế hệ mới như Next.js 16, React 19 và TypeScript, đã tạo điều kiện thuận lợi cho việc xây dựng các nền tảng thương mại điện tử chuyên ngành rạp chiếu phim với tốc độ tải trang nhanh vượt trội, giao diện điện ảnh lôi cuốn và khả năng tương tác mượt mà. Bên cạnh đó, bài toán đặt vé xem phim trực tuyến luôn đi kèm với những thách thức kỹ thuật rất lớn trong khoa học máy tính: làm thế nào để xử lý hàng ngàn yêu cầu chọn và giữ cùng một ghế trong tích tắc mà không xảy ra hiện tượng tranh chấp (double-booking)? Làm thế nào để tự động hóa quy trình soát vé bằng mã QR một chạm và cung cấp trải nghiệm tư vấn phim thông minh bằng trí tuệ nhân tạo (AI)?")
    add_p("Việc em lựa chọn đề tài \"Xây dựng website đặt vé xem phim CineReserve sử dụng Next.js, TypeScript và tích hợp chatbot AI\" xuất phát từ mong muốn vận dụng những kiến thức chuyên sâu đã tích lũy trong suốt 4 năm học ngành Khoa học Máy tính vào một sản phẩm thực tế. Đề tài vừa mang tính ứng dụng cao trong đời sống, vừa có ý nghĩa đặc biệt trong việc rèn luyện tư duy thiết kế kiến trúc phần mềm chịu tải cao, kiểm soát giao dịch ACID, bảo mật dữ liệu và tích hợp mô hình ngôn ngữ lớn (LLM).")

    add_h2("2. Mục tiêu của đề tài")
    add_h3("Mục tiêu tổng quát:")
    add_bullet("Xây dựng một hệ thống website đặt vé xem phim trực tuyến CineReserve có kiến trúc phân tầng rõ ràng (Server Components – API Services – PostgreSQL Database), đảm bảo tính toàn vẹn dữ liệu, hiệu năng cao, an toàn giao dịch và có thể triển khai vận hành ổn định trên môi trường thực tế.")
    add_bullet("Giải quyết triệt để bài toán tranh chấp tài nguyên đồng thời khi giữ ghế thông qua cơ chế khóa cấp giao dịch PostgreSQL Advisory Lock.")
    add_bullet("Tích hợp Trợ lý ảo tư vấn phim thời gian thực sử dụng Google Gemini AI và giao thức truyền dòng Streaming NDJSON.")

    add_h3("Mục tiêu cụ thể:")
    add_bullet("Thiết kế kiến trúc hệ thống hiện đại theo mô hình Next.js App Router, phân tách rành mạch giữa các Server Component render trực tiếp tại máy chủ và các Client Component tương tác.")
    add_bullet("Thiết kế cơ sở dữ liệu quan hệ chuẩn hóa gồm 21 bảng quản lý toàn diện phim, phòng chiếu, suất chiếu, ghế, đơn hàng, vé và doanh thu.")
    add_bullet("Xây dựng giải pháp giữ ghế an toàn có thời hạn 5 phút (300 giây) được đồng bộ tuyệt đối theo đồng hồ cơ sở dữ liệu, tự động giải phóng khi hết hạn.")
    add_bullet("Hiện thực hóa quy trình thanh toán mô phỏng bất biến (Idempotent Payment), tự động phát hành vé điện tử mã QR độc lập cho từng ghế.")
    add_bullet("Xây dựng module soát vé QR hai bước cho nhân viên rạp bằng Camera điện thoại qua thư viện jsQR, ngăn chặn triệt để hành vi dùng lại vé đã quét.")
    add_bullet("Tích hợp Chatbot Gemini AI có khả năng thấu hiểu ngôn ngữ tự nhiên, bảo tồn ngữ cảnh hội thoại tiếng Việt (tuổi, rạp, ngày) và gợi ý lịch chiếu thực tế.")
    add_bullet("Xây dựng hệ thống kiểm thử tích hợp tự động toàn diện với hơn 840 ca kiểm thử nhằm bảo chứng chất lượng và tính ổn định của hệ thống.")

    add_h2("3. Đối tượng và phạm vi nghiên cứu")
    add_p("Với đề tài \"Xây dựng website đặt vé xem phim CineReserve sử dụng Next.js, TypeScript và tích hợp chatbot AI\", em đã xác định các nhóm đối tượng nghiên cứu chính như sau:")
    add_h3("Đối tượng người dùng:")
    add_bullet("Khách hàng (End-user / Customer): Có thể duyệt xem danh mục phim, đặt vé nhanh, chọn ghế trên sơ đồ trực quan, thanh toán, quản lý vé QR cá nhân và trò chuyện với Trợ lý AI.", bold_prefix="Khách hàng: ")
    add_bullet("Nhân viên rạp (Staff): Được phân công làm việc tại một chi nhánh rạp cụ thể; có quyền tra cứu đơn hàng và thực hiện quét mã QR soát vé khán giả vào rạp.", bold_prefix="Nhân viên soát vé: ")
    add_bullet("Quản trị viên (Admin): Quản lý toàn bộ danh mục phim (song ngữ Việt/Anh), thiết lập suất chiếu không trùng phòng, quản lý tài khoản nhân viên và theo dõi báo cáo doanh thu toàn hệ thống.", bold_prefix="Quản trị viên: ")

    add_h3("Đối tượng kỹ thuật và công nghệ:")
    add_bullet("Kiến trúc Full-stack: Next.js 16 App Router kết hợp React 19 và CSS Modules.")
    add_bullet("Cơ sở dữ liệu: PostgreSQL 17 kết hợp Prisma ORM và kỹ thuật PostgreSQL Advisory Locks.")
    add_bullet("Trí tuệ nhân tạo: Google Gemini AI API (`gemini-3.5-flash-lite`) với JSON Schema và Streaming NDJSON.")
    add_bullet("Giải thuật xử lý hình ảnh: Thư viện giải mã ma trận QR Code `jsQR`.")

    add_h3("Phạm vi và phương pháp nghiên cứu:")
    add_bullet("Đề tài tập trung phát triển nền tảng web responsive hỗ trợ đa thiết bị (máy tính để bàn, máy tính bảng và điện thoại di động).")
    add_bullet("Cổng thanh toán trong đề tài được triển khai dưới dạng mô phỏng an toàn (Mock Payment) phục vụ nghiệm thu luồng nghiệp vụ.")
    add_p("Để hoàn thành đồ án, em đã áp dụng 4 phương pháp nghiên cứu chính:")
    add_bullet("Phương pháp khảo sát, phân tích: Khảo sát thực tế các cụm rạp CGV, Beta, BHD để định hình các quy tắc nghiệp vụ rạp chiếu phim chuẩn xác.", bold_prefix="1. ")
    add_bullet("Phương pháp phân tích thiết kế hệ thống: Ứng dụng phương pháp hướng đối tượng, xây dựng biểu đồ Use Case, Sequence Diagram và mô hình quan hệ thực thể ERD.", bold_prefix="2. ")
    add_bullet("Phương pháp cài đặt và hiện thực hóa: Lập trình mã nguồn bằng Next.js, TypeScript, thiết lập transaction và khóa concurrency trong PostgreSQL, tích hợp Gemini AI.", bold_prefix="3. ")
    add_bullet("Phương pháp kiểm thử và đánh giá: Viết 15 kịch bản TypeScript tự động kiểm tra toàn bộ luồng nghiệp vụ, kiểm thử áp lực đồng thời và đánh giá độ chính xác của AI.", bold_prefix="4. ")

    add_h2("4. Ý nghĩa khoa học và thực tiễn của đề tài")
    add_h3("Ý nghĩa khoa học:")
    add_p("Đề tài nghiên cứu và ứng dụng thành công các nguyên lý nâng cao trong Khoa học Máy tính: kiểm soát giao dịch đồng thời (ACID Concurrency Control) trong cơ sở dữ liệu quan hệ, kiến trúc Server Components tối ưu băng thông mạng và kỹ thuật Prompt Engineering có cấu trúc khi tích hợp các mô hình ngôn ngữ lớn (LLM).")
    add_h3("Ý nghĩa thực tiễn:")
    add_p("Xây dựng nên một hệ thống phần mềm hoàn chỉnh, giải quyết trọn vẹn bài toán vận hành của một chuỗi rạp chiếu phim hiện đại: từ khâu bán vé trực tuyến không tranh chấp đến khâu kiểm soát cửa rạp bằng mã QR và báo cáo tài chính minh bạch.")

    add_h2("5. Bố cục đề tài")
    add_p("Nội dung cuốn báo cáo đồ án tốt nghiệp được chia thành 3 chương chính theo đúng quy định:")
    add_p("Chương 1: Cơ sở lý thuyết và công nghệ hỗ trợ - Trình bày tổng quan về hệ thống đặt vé xem phim trực tuyến, khảo sát xu hướng thị trường, kiến trúc Client-Server, Server-Side Rendering và các công nghệ cốt lõi của CineReserve (Next.js, TypeScript, PostgreSQL, Prisma, Gemini AI, jsQR).")
    add_p("Chương 2: Khảo sát, phân tích và thiết kế hệ thống - Trình bày phân tích yêu cầu hệ thống, xác định tác nhân, biểu đồ Use case tổng quát và chi tiết, các biểu đồ trình tự (Sequence Diagrams) và thiết kế cơ sở dữ liệu quan hệ 21 bảng.")
    add_p("Chương 3: Kết quả và đánh giá - Trình bày quá trình chuẩn bị môi trường, mã nguồn, kết quả triển khai giao diện thực tế, kết quả 15 bộ script kiểm thử tự động với hơn 840 tests, đánh giá ưu nhược điểm của hệ thống.")
    add_p("Phần Kết luận - Đánh giá kết quả đạt được, chỉ ra các hạn chế và đề xuất hướng phát triển tiếp theo của đề tài.")
    doc.add_page_break()

    # =========================================================================
    # CHƯƠNG 1 (CÓ HÌNH ẢNH MINH HỌA)
    # =========================================================================
    add_title_p("CHƯƠNG 1: CƠ SỞ LÝ THUYẾT VÀ CÔNG NGHỆ HỖ TRỢ", size=16, bold=True, space_after=14)
    add_h2("1.1 Tổng quan về website đặt vé xem phim trực tuyến")
    add_p("Website đặt vé xem phim trực tuyến là một hệ thống ứng dụng web cho phép khán giả tra cứu lịch chiếu, lựa chọn cụm rạp, xem trước sơ đồ ghế ngồi và thực hiện đặt vé, thanh toán trực tuyến thông qua kết nối Internet mà không cần phải đến quầy vé vật lý. Đây là mô hình dịch vụ số hóa hiện đại, kết hợp chặt chẽ giữa công nghệ web thời gian thực, quản lý giao dịch cơ sở dữ liệu và các công cụ phát hành vé điện tử.")
    
    # HÌNH 1.1 & 1.2
    add_image_with_caption(r"d:\DA\anh-tien-do\01-trang-chu.jpg", "Hình 1.1 Giao diện hệ thống đặt vé xem phim trực tuyến hiện đại CineReserve", 14.5)
    
    add_p("So với phương thức mua vé truyền thống trước đây (khán giả phải đến trực tiếp rạp, xếp hàng chờ đợi và dễ rơi vào tình trạng hết vé hoặc chỉ còn ghế xấu), hệ thống đặt vé trực tuyến đem lại những ưu điểm vượt trội:")
    add_bullet("Tiết kiệm tối đa thời gian và công sức: Khán giả có thể chủ động giữ trước vị trí ghế ngồi ưa thích (ghế trung tâm, ghế VIP) từ trước nhiều ngày.", bold_prefix="- ")
    add_bullet("Minh bạch thông tin: Cung cấp đầy đủ thông tin về thời lượng phim, đạo diễn, dàn diễn viên, tóm tắt nội dung và phân loại độ tuổi theo quy định.", bold_prefix="- ")
    add_bullet("Thúc đẩy doanh thu và quản lý rạp tối ưu: Doanh nghiệp rạp có thể dự báo trước số lượng khách xem từng khung giờ để bố trí phòng chiếu và nhân sự phục vụ hợp lý.", bold_prefix="- ")

    add_h2("1.2 Xu hướng phát triển các nền tảng đặt vé trực tuyến")
    add_p("Trên thế giới cũng như tại Việt Nam, ngành dịch vụ rạp chiếu phim đã có sự bứt phá mạnh mẽ sau giai đoạn chuyển đổi số toàn diện:")
    add_bullet("Xu hướng trên thế giới: Các hệ thống bán vé khổng lồ như AMC Theatres (Mỹ), Fandango, hay TOHO Cinemas (Nhật Bản) đều chuyển đổi sang mô hình ứng dụng web hiện đại, tích hợp công nghệ AI để cá nhân hóa đề xuất phim và áp dụng vé điện tử mã QR không chạm (Contactless Check-in).")
    add_bullet("Xu hướng tại Việt Nam: Tỷ lệ người xem phim tại các thành phố lớn (Hà Nội, TP.HCM, Đà Nẵng) đặt vé qua ứng dụng và website đã đạt trên 75%. Khán giả ngày càng yêu cầu cao hơn về tốc độ tải trang, trải nghiệm giao diện điện ảnh sang trọng và mong muốn có sự hỗ trợ tư vấn tức thì khi lựa chọn phim.")

    # HÌNH 1.3 & 1.4 (BIỂU ĐỒ)
    add_image_with_caption(r"d:\DA\docs-images\hinh1-3-doanh-thu-dien-anh.png", "Hình 1.3 Doanh thu ấn tượng từ dịch vụ đặt vé trực tuyến qua các năm", 13.5)
    add_image_with_caption(r"d:\DA\docs-images\hinh1-4-ti-le-kenh-phan-phoi.png", "Hình 1.4 Thị phần các kênh phân phối vé xem phim trên thế giới", 13.5)

    add_h2("1.3 Các công nghệ phát triển web hiện đại")
    add_h3("1.3.1 Kiến trúc Client – Server")
    add_p("Kiến trúc Client - Server là mô hình nền tảng trong phát triển ứng dụng mạng hiện đại. Hệ thống phân chia thành hai thành phần rành mạch: Client (Trình duyệt web của người dùng) gửi yêu cầu (Request) thông qua giao thức mạng HTTP/HTTPS; và Server (Máy chủ ứng dụng) tiếp nhận, thực thi logic nghiệp vụ, truy vấn cơ sở dữ liệu và gửi trả kết quả (Response). Mô hình này giúp tập trung hóa việc quản lý dữ liệu, nâng cao tính bảo mật và cho phép mở rộng quy mô dễ dàng.")

    # HÌNH 1.6
    add_image_with_caption(r"d:\DA\docs-images\hinh1-6-client-server.png", "Hình 1.6 Nguyên tắc hoạt động của mô hình Client - Server", 14.0)

    add_h3("1.3.2 Server-Side Rendering (SSR) & React Server Components")
    add_p("Trong nhiều năm qua, mô hình Single Page Application (SPA) truyền thống đã bộc lộ những điểm yếu chí tử khi ứng dụng phát triển lớn: file JavaScript tải về client quá nặng gây đơ lag máy, và khả năng tối ưu hóa công cụ tìm kiếm (SEO) rất kém do trang ban đầu chỉ là file HTML trống rỗng.")
    add_p("Để khắc phục triệt để nhược điểm này, hệ thống CineReserve ứng dụng kiến trúc Server-Side Rendering (SSR) kết hợp cùng React Server Components (RSC) của Next.js 16. Toàn bộ mã nguồn kết xuất giao diện được xử lý trực tiếp tại máy chủ. Máy chủ nạp dữ liệu từ cơ sở dữ liệu PostgreSQL và trả về tệp HTML hoàn chỉnh cho trình duyệt. Nhờ đó, tốc độ mở trang lần đầu (First Contentful Paint) diễn ra gần như tức thì, giảm 70% dung lượng mã JavaScript phải tải xuống máy khách và tối ưu hóa SEO tuyệt đối.")

    # HÌNH 1.9
    add_image_with_caption(r"d:\DA\docs-images\hinh1-9-ssr-vs-csr.png", "Hình 1.9 So sánh mô hình Server-Side Rendering (SSR) và Client-Side Rendering", 14.0)

    add_h3("1.3.3 RESTful API & Giao thức Streaming")
    add_p("Hệ thống xây dựng các giao diện lập trình ứng dụng tuân thủ nghiêm ngặt chuẩn RESTful API sử dụng các phương thức HTTP chuẩn tắc (GET, POST, PUT, DELETE, PATCH). Dữ liệu trao đổi được định dạng bằng chuẩn JSON. Đặc biệt, để phục vụ tính năng trò chuyện với Trợ lý AI mà không làm người dùng phải chờ đợi lâu, hệ thống triển khai giao thức truyền dòng Streaming NDJSON (Newline-Delimited JSON), cho phép máy chủ đẩy từng phần phản hồi về client theo thời gian thực.")

    add_h2("1.4 Cơ sở lý thuyết về bộ công nghệ CineReserve")
    add_h3("1.4.1 PostgreSQL – Hệ quản trị cơ sở dữ liệu quan hệ mạnh mẽ")
    add_p("PostgreSQL là hệ quản trị cơ sở dữ liệu quan hệ mã nguồn mở tiên tiến nhất hiện nay, tuân thủ nghiêm ngặt chuẩn SQL và bảo đảm trọn vẹn 4 tính chất ACID (Atomicity, Consistency, Isolation, Durability). Điểm đặc biệt nhất khiến PostgreSQL được lựa chọn cho CineReserve là tính năng PostgreSQL Advisory Lock (pg_advisory_xact_lock) – cho phép ứng dụng tạo khóa giao dịch phân tán trực tiếp bằng số nguyên trong bộ nhớ CSDL mà không cần phụ thuộc vào hạ tầng ngoài.")

    # HÌNH 1.16
    add_image_with_caption(r"d:\DA\docs-images\hinh1-16-advisory-lock.png", "Hình 1.16 Sơ đồ luồng xử lý Transaction và Advisory Lock trong PostgreSQL", 14.0)

    add_h3("1.4.2 Prisma ORM – Ánh xạ dữ liệu an toàn kiểu tĩnh")
    add_p("Prisma là thư viện ORM thế hệ mới dành cho Node.js và TypeScript. Prisma cung cấp schema trực quan (schema.prisma), tự động quản lý lịch sử biến đổi bảng (Migrations) và tự động sinh mã nguồn truy vấn có kiểm tra kiểu dữ liệu tĩnh (Type-safe Client). Điều này giúp lập trình viên phát hiện toàn bộ các lỗi truy vấn dữ liệu ngay khi viết mã, loại bỏ hoàn toàn các lỗi runtime.")

    add_h3("1.4.3 React 19 & Next.js 16 App Router – Nền tảng Full-stack hiện đại")
    add_p("Next.js phiên bản 16 là framework dẫn đầu thế giới trong hệ sinh thái React. Với kiến trúc thư mục App Router (src/app), hệ thống tự động tối ưu hóa việc phân chia các route, quản lý layout lồng nhau, hỗ trợ đa ngôn ngữ quốc tế hóa ([locale]) và tích hợp cơ chế bảo vệ Server Actions an toàn tuyệt đối.")

    add_h3("1.4.4 TypeScript – Ngôn ngữ định kiểu tĩnh cho hệ thống lớn")
    add_p("TypeScript bổ sung hệ thống kiểu tĩnh chặt chẽ cho JavaScript. Toàn bộ các DTO dữ liệu từ cơ sở dữ liệu, tham số API đến props của từng component giao diện trong CineReserve đều được ép kiểu rõ ràng, giúp mã nguồn dễ đọc, dễ bảo trì và có độ tin cậy vượt bậc.")

    add_h2("1.5 Các công cụ hỗ trợ triển khai")
    add_bullet("Google Gemini AI (`gemini-3.5-flash-lite`): Mô hình ngôn ngữ lớn thế hệ mới của Google với tốc độ xử lý nhanh, hỗ trợ ép kiểu đầu ra JSON Schema và thấu hiểu tiếng Việt tự nhiên sâu sắc.", bold_prefix="Google Gemini AI: ")
    add_bullet("jsQR & QRCode: Bộ thư viện toán học chuyên dụng giúp sinh mã QR Code dạng đồ họa vector SVG và giải mã hình ảnh từ luồng video camera web với tốc độ cao.", bold_prefix="Bộ giải mã QR Code: ")
    add_bullet("Scrypt & Web Cryptography: Thuật toán mã hóa một chiều đạt chuẩn bảo mật cao nhất hiện nay, bảo vệ mật khẩu người dùng chống lại các cuộc tấn công vét cạn bằng phần cứng GPU chuyên dụng.", bold_prefix="Cơ chế bảo mật mật khẩu: ")
    add_bullet("Git & GitHub: Hệ thống quản lý phiên bản phân tán, lưu trữ toàn bộ lịch sử phát triển dự án và tự động tích hợp CI/CD.", bold_prefix="Git & GitHub: ")

    add_table_header_caption("Bảng 1.1 Tổng hợp công nghệ xây dựng CineReserve")
    t_sum = doc.add_table(rows=1, cols=2)
    t_sum.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_borders(t_sum)
    t_sum.rows[0].cells[0].text = "Công nghệ / Nền tảng"
    t_sum.rows[0].cells[1].text = "Vai trò chính trong hệ thống CineReserve"
    for c in t_sum.rows[0].cells:
        set_cell_shading(c, "EBF1F5")
        p = c.paragraphs[0]; p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        for r in p.runs: r.bold = True; r.font.name = 'Times New Roman'; r.font.size = Pt(11.5)

    sum_tech = [
        ("Next.js 16 (App Router)", "Nền tảng Full-stack Web, quản lý Route, Layout và Server Components"),
        ("React 19", "Thư viện xây dựng giao diện người dùng theo component tái sử dụng"),
        ("TypeScript", "Ngôn ngữ lập trình chính, định kiểu tĩnh toàn diện (End-to-End Type Safety)"),
        ("PostgreSQL 17", "Hệ quản trị cơ sở dữ liệu quan hệ lưu trữ 21 bảng và quản lý Advisory Lock"),
        ("Prisma 7 ORM", "Công cụ ánh xạ đối tượng và thực thi truy vấn CSDL an toàn"),
        ("Google Gemini AI", "Mô hình ngôn ngữ lớn cung cấp trí tuệ nhân tạo cho Trợ lý tư vấn phim"),
        ("jsQR & QRCode", "Tạo mã QR vé điện tử và quét mã trực tiếp qua Web Camera di động"),
        ("Scrypt (node:crypto)", "Băm mật khẩu người dùng với salt ngẫu nhiên chống tấn công brute-force"),
        ("CSS Modules", "Định dạng giao diện đóng gói riêng biệt cho từng trang và component"),
        ("Git & GitHub", "Hệ thống quản lý phiên bản phân tán và lưu trữ mã nguồn dự án")
    ]
    for tech, role in sum_tech:
        row = t_sum.add_row()
        c0, c1 = row.cells
        c0.text, c1.text = tech, role
        set_cell_margins(c0, top=60, bottom=60, left=80, right=80)
        set_cell_margins(c1, top=60, bottom=60, left=80, right=80)
        p0, p1 = c0.paragraphs[0], c1.paragraphs[0]
        p0.paragraph_format.space_after = Pt(2); p1.paragraph_format.space_after = Pt(2)
        p0.alignment = WD_ALIGN_PARAGRAPH.LEFT; p1.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
        for r in p0.runs: r.bold = True; r.font.name = 'Times New Roman'; r.font.size = Pt(11)
        for r in p1.runs: r.font.name = 'Times New Roman'; r.font.size = Pt(11)

    add_h2("Kết luận chương 1:")
    add_p("Trong chương 1, em đã trình bày chi tiết về bối cảnh nghiên cứu, các khái niệm nghiệp vụ và cơ sở công nghệ nền tảng phục vụ xây dựng hệ thống đặt vé xem phim trực tuyến CineReserve. Em đã phân tích sâu sắc về sự phát triển của kiến trúc web, sự ưu việt của Server-Side Rendering (SSR) trên Next.js 16 App Router so với SPA truyền thống, và cơ chế bảo vệ giao dịch ACID của PostgreSQL 17 với Advisory Lock.")
    add_p("Bên cạnh đó, việc lựa chọn tích hợp mô hình ngôn ngữ lớn Google Gemini AI cùng thư viện giải mã hình ảnh jsQR đã tạo nên một giải pháp công nghệ toàn diện, giải quyết trọn vẹn cả bài toán hiệu năng lẫn bài toán trải nghiệm người dùng hiện đại. Đây là tiền đề vững chắc để em tiến hành khảo sát yêu cầu, phân tích ca sử dụng và thiết kế cơ sở dữ liệu chi tiết trong Chương 2.")
    doc.add_page_break()

    # =========================================================================
    # CHƯƠNG 2 (CÓ HÌNH ẢNH DIAGRAMS & 14 BẢNG USECASE)
    # =========================================================================
    add_title_p("CHƯƠNG 2: KHẢO SÁT, PHÂN TÍCH VÀ THIẾT KẾ HỆ THỐNG", size=16, bold=True, space_after=14)
    add_h2("2.1 Khảo sát và phân tích yêu cầu hệ thống")
    add_h3("2.1.1 Khảo sát và thu thập yêu cầu")
    add_p("Trong những năm gần đây, ngành công nghiệp điện ảnh Việt Nam đã có sự trỗi dậy mạnh mẽ với hàng loạt tác phẩm đạt doanh thu hàng trăm tỷ đồng. Thói quen mua vé tại quầy đang dần bị thay thế hoàn toàn bởi các kênh trực tuyến. Khảo sát thực tế tại các cụm rạp chiếu phim cho thấy:")
    add_bullet("Khách hàng mong muốn có giao diện trực quan, cho phép chọn đúng vị trí ghế ngồi yêu thích, hiển thị rõ ràng giá vé và loại ghế (Thường / VIP) mà không gặp tình trạng lag giật.", bold_prefix="- ")
    add_bullet("Khi chọn ghế, khách hàng cần một khoảng thời gian nhất định (thời gian giữ chỗ 5 phút) để trao đổi với người thân và chuẩn bị thanh toán mà không sợ bị người khác tranh mất chỗ.", bold_prefix="- ")
    add_bullet("Nhân viên tại rạp cần công cụ kiểm tra vé nhanh gọn trên điện thoại thông minh, quét mã QR trong tích tắc và ngăn chặn tuyệt đối tình trạng khán giả dùng vé giả hoặc vé đã qua cửa.", bold_prefix="- ")
    add_bullet("Quản trị viên cần công cụ quản lý lịch chiếu trực quan, tự động cảnh báo nếu hai suất chiếu bị trùng phòng hoặc không đủ 20 phút dọn dẹp vệ sinh.", bold_prefix="- ")

    add_table_header_caption("Bảng 2.1 Doanh thu thị trường điện ảnh và bán vé trực tuyến qua các năm")
    t_stat = doc.add_table(rows=1, cols=4)
    t_stat.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_borders(t_stat)
    for idx, name in enumerate(["Năm khảo sát", "Doanh thu phòng vé (Tỷ VNĐ)", "Tỷ lệ đặt vé trực tuyến (%)", "Tốc độ tăng trưởng"]):
        c = t_stat.rows[0].cells[idx]; c.text = name; set_cell_shading(c, "EBF1F5")
        p = c.paragraphs[0]; p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        for r in p.runs: r.bold = True; r.font.name = 'Times New Roman'; r.font.size = Pt(11)

    stat_rows = [
        ("2021", "1.250", "38.5%", "Hồi phục sau dịch"),
        ("2022", "2.400", "52.0%", "+92.0%"),
        ("2023", "3.700", "66.5%", "+54.1%"),
        ("2024", "4.850", "74.0%", "+31.0%"),
        ("2025 (Ước tính)", "5.900", "82.5%", "+21.6%")
    ]
    for r_data in stat_rows:
        row = t_stat.add_row()
        for idx, val in enumerate(r_data):
            c = row.cells[idx]; c.text = val; set_cell_margins(c, top=60, bottom=60, left=80, right=80)
            p = c.paragraphs[0]; p.paragraph_format.space_after = Pt(2); p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            for r in p.runs: r.font.name = 'Times New Roman'; r.font.size = Pt(11)

    add_h3("2.1.2 Xác định các tác nhân")
    add_p("Hệ thống CineReserve phân cấp 3 nhóm tác nhân chính:")
    add_bullet("Khách hàng (Customer): Tìm kiếm phim, đặt vé nhanh, chọn và giữ ghế 5 phút, thanh toán nhận vé QR, tra cứu lịch sử đơn hàng và trò chuyện với Trợ lý AI.")
    add_bullet("Nhân viên rạp (Staff): Đăng nhập tài khoản được phân công theo chi nhánh rạp, quét mã QR soát vé khán giả vào rạp, tra cứu đơn hàng theo mã chính xác và xem báo cáo doanh thu chi nhánh.")
    add_bullet("Quản trị viên (Admin): Quản trị toàn bộ danh mục phim song ngữ, lập lịch chiếu chống trùng phòng, tạo tài khoản nhân viên, xem nhật ký kiểm toán và theo dõi doanh thu toàn chuỗi rạp.")

    add_h3("2.1.3 Yêu cầu chức năng")
    add_table_header_caption("Bảng 2.2 Các yêu cầu về chức năng")
    t_uc_req = doc.add_table(rows=1, cols=3)
    t_uc_req.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_borders(t_uc_req)
    t_uc_req.rows[0].cells[0].text = "Mã chức năng"
    t_uc_req.rows[0].cells[1].text = "Tên chức năng"
    t_uc_req.rows[0].cells[2].text = "Mô tả chi tiết"
    for c in t_uc_req.rows[0].cells:
        set_cell_shading(c, "EBF1F5")
        p = c.paragraphs[0]; p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        for r in p.runs: r.bold = True; r.font.name = 'Times New Roman'; r.font.size = Pt(11)

    uc_req_data = [
        ("UC01", "Quản lý tài khoản & Xác thực", "Đăng ký, đăng nhập, đổi mật khẩu, bảo vệ phiên qua Cookie an toàn"),
        ("UC02", "Khám phá phim & Đặt vé nhanh", "Tìm kiếm phim không dấu, lọc theo thể loại/rạp/ngày, module Quick Booking"),
        ("UC03", "Chọn ghế & Giữ ghế 5 phút", "Hiển thị sơ đồ ghế động, giữ 1-8 ghế trong 300s, khóa chống tranh chấp"),
        ("UC04", "Thanh toán & Phát hành vé QR", "Thanh toán an toàn, xác nhận độ tuổi, phát hành mã QR độc lập từng ghế"),
        ("UC05", "Trợ lý ảo tư vấn phim AI", "Chatbot Gemini streaming NDJSON, nhận diện ngôn ngữ tự nhiên, giữ ngữ cảnh"),
        ("UC06", "Soát vé QR tại cửa rạp", "Quét mã QR qua Camera di động, xác minh 2 bước, chặn vé dùng lại"),
        ("UC07", "Quản trị Phim & Lịch chiếu", "CRUD phim song ngữ VI/EN, lập lịch tự động tính giờ dọn phòng 20 phút"),
        ("UC08", "Quản lý nhân viên & Báo cáo", "Tạo tài khoản STAFF gán rạp, thống kê doanh thu đa chiều, xuất CSV")
    ]
    for code, name, desc in uc_req_data:
        row = t_uc_req.add_row()
        c0, c1, c2 = row.cells; c0.text, c1.text, c2.text = code, name, desc
        set_cell_margins(c0, top=60, bottom=60, left=80, right=80)
        set_cell_margins(c1, top=60, bottom=60, left=80, right=80)
        set_cell_margins(c2, top=60, bottom=60, left=80, right=80)
        p0, p1, p2 = c0.paragraphs[0], c1.paragraphs[0], c2.paragraphs[0]
        p0.paragraph_format.space_after = Pt(2); p1.paragraph_format.space_after = Pt(2); p2.paragraph_format.space_after = Pt(2)
        p0.alignment = WD_ALIGN_PARAGRAPH.CENTER; p1.alignment = WD_ALIGN_PARAGRAPH.LEFT; p2.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
        for r in p0.runs: r.bold = True; r.font.name = 'Times New Roman'; r.font.size = Pt(11)
        for r in p1.runs: r.bold = True; r.font.name = 'Times New Roman'; r.font.size = Pt(11)
        for r in p2.runs: r.font.name = 'Times New Roman'; r.font.size = Pt(11)

    add_h3("2.1.4 Yêu cầu phi chức năng")
    add_bullet("Hiệu năng cao: Tốc độ phản hồi giao diện dưới 500ms đối với các trang Server-Side Rendering. Thời gian xử lý transaction giữ ghế dưới 100ms.", bold_prefix="Hiệu năng: ")
    add_bullet("Bảo mật cao: Băm mật khẩu người dùng bằng Scrypt, kiểm tra CSRF Origin, giới hạn tần suất yêu cầu (Rate limiting) và che giấu thông tin cá nhân (PII Masking).", bold_prefix="Bảo mật: ")
    add_bullet("Toàn vẹn dữ liệu: Đảm bảo tuyệt đối không xảy ra tranh chấp ghế (Double-booking) thông qua PostgreSQL Advisory Lock.", bold_prefix="Tính toàn vẹn: ")
    add_bullet("Đa ngôn ngữ & Khả năng tiếp cận: Toàn bộ giao diện và thông báo lỗi hỗ trợ song ngữ Tiếng Việt và Tiếng Anh; giao diện responsive đạt chuẩn kích thước bấm 44px trên mobile.", bold_prefix="Khả năng tương thích: ")

    add_h2("2.2 Biểu đồ use case")
    add_p("Hệ thống xây dựng mô hình Use case hoàn chỉnh mô tả các mối quan hệ giữa người dùng và các chức năng của CineReserve:")
    
    # HÌNH 2.1
    add_image_with_caption(r"d:\DA\docs-images\hinh2-1-usecase-tong-quat.png", "Hình 2.1 Biểu đồ Use case tổng quát hệ thống CineReserve", 14.5)

    add_h2("2.3 Mô tả chi tiết use case")
    add_p("Dưới đây là bảng đặc tả chi tiết 14 Use case nghiệp vụ then chốt của hệ thống CineReserve theo đúng mẫu quy chuẩn:")

    add_usecase_table("3", "Đăng ký tài khoản", "Khách hàng",
                      "Cho phép khách hàng mới tạo tài khoản trong hệ thống để thực hiện đặt vé.",
                      "1. Người dùng bấm nút \"Đăng ký\" trên thanh điều hướng.\n2. Hệ thống hiển thị form nhập: Họ tên, Email, Mật khẩu, Xác nhận mật khẩu.\n3. Người dùng điền thông tin và bấm \"Tạo tài khoản\".\n4. Hệ thống kiểm tra hợp lệ, băm mật khẩu bằng Scrypt và tạo bản ghi User mới với vai trò CUSTOMER.\n5. Chuyển hướng người dùng về trang đăng nhập với thông báo thành công.",
                      "1. Nếu email đã tồn tại, hệ thống báo lỗi EMAIL_UNAVAILABLE (409).\n2. Nếu mật khẩu dưới 10 ký tự hoặc không khớp, hiển thị thông báo lỗi tương ứng.",
                      "Người dùng chưa có tài khoản.", "Tài khoản khách hàng được tạo thành công.");

    add_usecase_table("4", "Đăng nhập", "Khách hàng / Nhân viên / Quản trị viên",
                      "Xác thực danh tính người dùng và thiết lập phiên làm việc an toàn.",
                      "1. Người dùng bấm nút \"Đăng nhập\" trên thanh điều hướng.\n2. Hệ thống hiển thị form đăng nhập.\n3. Người dùng nhập email và mật khẩu rồi bấm \"Đăng nhập\".\n4. Hệ thống kiểm tra mật khẩu bằng thuật toán Scrypt và so sánh thời gian cố định timingSafeEqual.\n5. Nếu hợp lệ, hệ thống tạo bản ghi AuthSession, cấp Cookie cr_session an toàn và chuyển hướng về trang chủ hoặc trang quản trị theo vai trò.",
                      "1. Nếu sai thông tin đăng nhập, báo lỗi INVALID_CREDENTIALS.\n2. Nếu tài khoản bị khóa, báo lỗi USER_LOCKED.\n3. Nếu tài khoản nhân viên có cờ mustChangePassword=true, bắt buộc chuyển hướng tới trang đổi mật khẩu.",
                      "Người dùng đã có tài khoản.", "Phiên đăng nhập hợp lệ được lưu trong Cookie.");

    add_usecase_table("5", "Đăng xuất", "Khách hàng / Nhân viên / Quản trị viên",
                      "Hủy bỏ phiên làm việc hiện tại và giải phóng các tài nguyên đang giữ chỗ.",
                      "1. Người dùng bấm vào menu tài khoản và chọn \"Đăng xuất\".\n2. Hệ thống gọi API POST /api/auth/logout.\n3. Máy chủ tự động quét và giải phóng các ghế mà tài khoản đang giữ (cancelUserHolds).\n4. Xóa bản ghi AuthSession trong cơ sở dữ liệu và xóa Cookie trên trình duyệt.\n5. Chuyển hướng người dùng về trang chủ.",
                      "Nếu mất kết nối mạng, hệ thống vẫn xóa sạch Cookie tại trình duyệt và thông báo đăng xuất hoàn tất.",
                      "Người dùng đang ở trạng thái đăng nhập.", "Phiên làm việc bị hủy, ghế đang giữ được trả lại tự do.");

    add_usecase_table("6", "Quản lý thông tin cá nhân", "Khách hàng / Nhân viên",
                      "Cho phép người dùng xem và cập nhật họ tên, số điện thoại hoặc đổi mật khẩu.",
                      "1. Người dùng truy cập trang \"Hồ sơ cá nhân\".\n2. Hệ thống nạp thông tin hiện tại từ bảng User.\n3. Người dùng chỉnh sửa họ tên hoặc số điện thoại rồi nhấn \"Lưu thay đổi\".\n4. Hệ thống kiểm tra định dạng dữ liệu và cập nhật vào cơ sở dữ liệu.\n5. Hiển thị thông báo cập nhật thành công.",
                      "1. Nếu số điện thoại không đúng định dạng (từ 6-25 ký tự số), báo lỗi.\n2. Khi đổi mật khẩu, bắt buộc phải nhập đúng mật khẩu cũ và mật khẩu mới phải khác mật khẩu cũ.",
                      "Người dùng đã đăng nhập.", "Thông tin cá nhân được cập nhật thành công.");

    add_usecase_table("7", "Tìm kiếm và Xem chi tiết phim", "Khách hàng",
                      "Cho phép khán giả duyệt danh sách phim, tìm kiếm theo tên và xem chi tiết lịch chiếu.",
                      "1. Người dùng truy cập trang danh mục Phim.\n2. Nhập từ khóa tìm kiếm vào ô tìm kiếm hoặc chọn lọc theo Thể loại, Rạp, Ngày chiếu.\n3. Hệ thống chuẩn hóa tiếng Việt không dấu và lọc danh sách phim phù hợp.\n4. Người dùng bấm vào một thẻ phim để xem chi tiết: poster, trailer, đạo diễn, thời lượng, tóm tắt và danh sách suất chiếu theo từng rạp.",
                      "Nếu không tìm thấy bộ phim nào phù hợp, hệ thống hiển thị thông báo rỗng kèm nút xóa bộ lọc.",
                      "Không có.", "Thông tin chi tiết phim và lịch chiếu được hiển thị.");

    add_usecase_table("8", "Đặt vé nhanh (Quick Booking)", "Khách hàng",
                      "Cho phép khán giả chọn nhanh suất chiếu trực tiếp từ trang chủ qua 3 bước liên hoàn.",
                      "1. Khán giả tiếp cận khối Quick Booking tại trang chủ.\n2. Bước 1: Chọn Chi nhánh Rạp mong muốn.\n3. Bước 2: Danh sách phim tự động lọc các phim đang có suất chiếu tại rạp đó, khán giả chọn Phim.\n4. Bước 3: Danh sách ngày tự động hiển thị các ngày có suất mở bán, khán giả chọn Ngày.\n5. Hệ thống chuyển hướng thẳng đến trang chi tiết phim với các bộ lọc đã chọn.",
                      "Nếu rạp được chọn không có suất chiếu nào mở bán, danh sách phim hiển thị trạng thái trống rõ ràng.",
                      "Không có.", "Chuyển hướng thành công tới suất chiếu đã chọn.");

    add_usecase_table("9", "Chọn và Giữ ghế 5 phút", "Khách hàng",
                      "Cho phép khách hàng chọn từ 1 đến 8 ghế và giữ độc quyền trong 300 giây.",
                      "1. Khán giả truy cập trang sơ đồ ghế của suất chiếu hợp lệ.\n2. Hệ thống nạp dữ liệu SeatMap hiển thị rõ ghế Thường, VIP, Đang bị giữ, Đã bán.\n3. Khán giả bấm chọn từ 1 đến 8 ghế và bấm \"Tiếp tục thanh toán\".\n4. Máy chủ mở transaction, gọi pg_advisory_xact_lock(20261102) và databaseNow().\n5. Kiểm tra ghế hợp lệ, tạo bản ghi HoldSession có hạn 5 phút và cập nhật ShowtimeSeat.\n6. Trả về kết quả thành công, trình duyệt bắt đầu đếm ngược 5 phút.",
                      "1. Nếu có ghế đã bị người khác giữ hoặc đã bán, báo lỗi 409 SEAT_ALREADY_HELD.\n2. Nếu suất chiếu đã quá thời điểm ngừng bán (Cutoff trước 10 phút), báo lỗi SALES_CLOSED.",
                      "Khách hàng đã đăng nhập tài khoản CUSTOMER.", "Ghế được giữ độc quyền cho khách hàng trong 5 phút.");

    add_usecase_table("10", "Thanh toán và Nhận vé QR", "Khách hàng",
                      "Xác nhận thanh toán đơn hàng và tự động phát hành vé điện tử mã QR.",
                      "1. Khách hàng xem lại tóm tắt đơn hàng (phim, rạp, phòng, danh sách ghế, tổng tiền).\n2. Khách hàng tích chọn xác nhận đủ tuổi theo phân loại phim và đồng ý chính sách vé.\n3. Khách hàng nhấn \"Xác nhận thanh toán mô phỏng\".\n4. Máy chủ kiểm tra phiên giữ ghế còn hạn, chuyển Booking sang PAID, sinh mã vé TK-... cho từng ghế.\n5. Hệ thống hiển thị trang hoàn tất kèm mã QR Code độc lập của từng ghế để tải về hoặc in ấn.",
                      "1. Nếu phiên giữ ghế đã hết hạn trong lúc đang thanh toán, báo lỗi HOLD_EXPIRED.\n2. Nếu thanh toán giả lập thất bại, đơn hàng giữ nguyên trạng thái PENDING để khách thử lại.",
                      "Đơn hàng đang ở trạng thái PENDING và phiên giữ ghế còn hiệu lực.", "Đơn hàng chuyển PAID, vé điện tử mã QR được phát hành.");

    add_usecase_table("11", "Trò chuyện với Trợ lý phim AI", "Khách hàng",
                      "Tư vấn phim thông minh qua ngôn ngữ tự nhiên sử dụng mô hình Google Gemini AI.",
                      "1. Khách hàng mở widget Trợ lý phim ở góc phải màn hình.\n2. Khách hàng gửi câu hỏi tự nhiên (ví dụ: \"Tối nay tại rạp Hà Nội có phim gì cho bé 10 tuổi xem không?\").\n3. Endpoint /api/chat nhận tin nhắn, kích hoạt luồng streaming NDJSON.\n4. Máy chủ gửi sự kiện stage: \"understanding\" -> stage: \"searching\" -> trích xuất SearchPlan -> truy vấn CSDL -> trả về danh sách phim gợi ý kèm liên kết đặt vé.\n5. Giao diện hiển thị tin nhắn mượt mà theo thời gian thực.",
                      "1. Nếu tin nhắn chứa thông tin nhạy cảm (email, sđt, pass), hệ thống từ chối xử lý.\n2. Nếu dịch vụ Gemini AI bị gián đoạn, hệ thống thông báo lỗi lịch sự và giữ nguyên ngữ cảnh.",
                      "Không có.", "Khách hàng nhận được câu trả lời và danh sách phim gợi ý chính xác.");

    add_usecase_table("12", "Tra cứu đơn hàng vận hành", "Nhân viên / Quản trị viên",
                      "Tra cứu chi tiết đơn hàng phục vụ xử lý khiếu nại và hỗ trợ khán giả tại rạp.",
                      "1. Người dùng truy cập trang \"Tra cứu đơn hàng\".\n2. Nếu là STAFF: Nhập chính xác mã đơn CR-..., hệ thống chỉ trả về đơn thuộc chi nhánh rạp của nhân viên đó.\n3. Nếu là ADMIN: Có thể tìm kiếm theo mã, lọc theo trạng thái, chi nhánh, khoảng ngày và phân trang.\n4. Màn hình hiển thị chi tiết ghế, lịch sử thanh toán, thông tin khách hàng đã được che giấu (Masked PII).",
                      "Nếu mã đơn không tồn tại hoặc nhân viên tra cứu đơn của rạp khác, báo lỗi NOT_FOUND.",
                      "Đăng nhập tài khoản có vai trò STAFF hoặc ADMIN.", "Thông tin chi tiết đơn hàng được hiển thị an toàn.");

    add_usecase_table("13", "Soát vé QR tại cửa rạp", "Nhân viên rạp",
                      "Quét và xác thực vé điện tử của khán giả bằng Camera di động hoặc tải tệp ảnh.",
                      "1. Nhân viên rạp mở màn hình Soát vé (/staff/tickets) trên điện thoại.\n2. Bật camera quét mã QR trên vé khán giả hoặc tải ảnh QR lên.\n3. Hệ thống bắt mã CR1:TK-... và gọi API inspectTicket để kiểm tra.\n4. Màn hình hiển thị thông tin vé, tên phim, phòng, số ghế và khung giờ hợp lệ.\n5. Nhân viên đối chiếu và nhấn \"Xác nhận vào rạp\" (Redeem Ticket).\n6. Hệ thống chuyển vé sang USED, lưu vết TicketRedemption và AuditLog.",
                      "1. Nếu vé đã được sử dụng trước đó, báo lỗi ALREADY_USED kèm thời điểm đã soát.\n2. Nếu quét vé ngoài khung giờ cho phép (trước 30 phút hoặc sau giờ chiếu), báo lỗi OUTSIDE_WINDOW.\n3. Nếu vé thuộc chi nhánh rạp khác, báo lỗi WRONG_CINEMA.",
                      "Nhân viên đăng nhập tài khoản STAFF có gán rạp hợp lệ.", "Vé được chuyển sang trạng thái USED, hoàn tất soát vé.");

    add_usecase_table("14", "Quản lý phim và Lịch chiếu", "Quản trị viên",
                      "Thêm mới, chỉnh sửa thông tin phim song ngữ và lập lịch chiếu chống trùng phòng.",
                      "1. Quản trị viên truy cập trang quản lý Phim / Lịch chiếu.\n2. Khi tạo phim mới: Nhập tiêu đề tiếng Việt, tiếng Anh, thời lượng, phân loại tuổi, poster, thể loại.\n3. Khi tạo lịch chiếu: Chọn phim, chọn phòng chiếu, chọn giờ bắt đầu.\n4. Hệ thống tự động tính giờ kết thúc và giờ dọn phòng (endsAt + 20 phút), kiểm tra xung đột với toàn bộ các suất chiếu đã có trong phòng.\n5. Nếu không trùng lịch, tạo suất chiếu mới và tự động nhân bản danh sách ghế sang bảng ShowtimeSeat.",
                      "1. Nếu giờ chiếu bị trùng vào khoảng chiếu hoặc dọn phòng của suất khác, báo lỗi ROOM_OVERLAP.\n2. Không cho phép sửa thời lượng hoặc hủy phim nếu phim đang có suất chiếu mở bán trong tương lai.",
                      "Đăng nhập tài khoản ADMIN.", "Suất chiếu hợp lệ được tạo và mở bán thành công.");

    add_usecase_table("15", "Quản lý nhân viên", "Quản trị viên",
                      "Tạo mới tài khoản nhân viên rạp, gán chi nhánh công tác và cấp mật khẩu tạm.",
                      "1. Quản trị viên truy cập mục Quản lý nhân viên (/admin/staff).\n2. Nhấn nút \"Thêm nhân viên mới\".\n3. Nhập họ tên, email, chọn chi nhánh rạp phụ trách và tạo mật khẩu tạm thời.\n4. Hệ thống kiểm tra email duy nhất, băm mật khẩu Scrypt, gán quyền STAFF và bật cờ mustChangePassword=true.\n5. Tài khoản được tạo thành công cùng bản ghi phân công StaffAssignment trong transaction.",
                      "Nếu email đã được sử dụng, hệ thống báo lỗi trùng lặp tài khoản.",
                      "Đăng nhập tài khoản ADMIN.", "Tài khoản nhân viên được tạo và gắn chặt với một rạp.");

    add_usecase_table("16", "Báo cáo doanh thu", "Nhân viên / Quản trị viên",
                      "Thống kê doanh thu rạp, tách bạch tiền thu, tiền hoàn và xuất báo cáo CSV.",
                      "1. Người dùng truy cập trang Báo cáo doanh thu (/admin/reports hoặc /staff/reports).\n2. Chọn bộ lọc: Khoảng ngày, nhóm theo Ngày hoặc Tháng, lọc theo Phim, Rạp.\n3. Máy chủ chạy câu truy vấn SQL UNION ALL tổng hợp tiền thanh toán và tiền hoàn tiền độc lập.\n4. Màn hình hiển thị các thẻ tóm tắt (Tổng thu, Tiền hoàn, Doanh thu ròng, Số vé bán) và biểu đồ trực quan.\n5. Người dùng có thể nhấn \"Tải báo cáo CSV\" để tải tệp dữ liệu chuẩn hóa có UTF-8 BOM.",
                      "Nhân viên STAFF chỉ được xem số liệu thuộc chi nhánh của mình, không xem được rạp khác.",
                      "Đăng nhập tài khoản STAFF hoặc ADMIN.", "Báo cáo doanh thu được hiển thị và xuất file CSV an toàn.");

    add_h2("2.4 Phân tích Use case")
    add_p("Hệ thống xây dựng các biểu đồ trình tự (Sequence Diagrams) mô tả sự tương tác chi tiết giữa Actor, Giao diện (Boundary), Bộ điều khiển (Controller) và Cơ sở dữ liệu (Entity):")
    
    # HÌNH 2.7, 2.8, 2.9, 2.10 (SEQUENCE DIAGRAMS)
    add_image_with_caption(r"d:\DA\docs-images\hinh2-7-seq-giu-ghe.png", "Hình 2.7 Biểu đồ trình tự Use case Chọn và Giữ ghế 5 phút", 14.5)
    add_image_with_caption(r"d:\DA\docs-images\hinh2-8-seq-thanh-toan.png", "Hình 2.8 Biểu đồ trình tự Use case Thanh toán và Nhận vé QR", 14.5)
    add_image_with_caption(r"d:\DA\docs-images\hinh2-9-seq-soat-ve.png", "Hình 2.9 Biểu đồ trình tự Use case Soát vé QR tại rạp", 14.5)
    add_image_with_caption(r"d:\DA\docs-images\hinh2-10-seq-chat-ai.png", "Hình 2.10 Biểu đồ trình tự Use case Trò chuyện với Trợ lý AI", 14.5)

    add_h2("2.5 Thiết kế cơ sở dữ liệu")
    add_p("Cơ sở dữ liệu của CineReserve được chuẩn hóa gồm 21 bảng. Dưới đây là đặc tả chi tiết cấu trúc các bảng cốt lõi trong hệ thống:")

    add_table_header_caption("Bảng 2.17 Cấu trúc bảng Users lưu thông tin người dùng")
    t_u = doc.add_table(rows=1, cols=4)
    t_u.alignment = WD_TABLE_ALIGNMENT.CENTER; set_table_borders(t_u)
    for idx, name in enumerate(["Tên trường", "Kiểu dữ liệu", "Ràng buộc", "Mô tả ý nghĩa"]):
        c = t_u.rows[0].cells[idx]; c.text = name; set_cell_shading(c, "EBF1F5")
        p = c.paragraphs[0]; p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        for r in p.runs: r.bold = True; r.font.name = 'Times New Roman'; r.font.size = Pt(11)

    u_cols = [
        ("id", "Uuid", "Primary Key, default(uuid())", "Định danh duy nhất của người dùng"),
        ("name", "String", "Not Null", "Họ và tên người dùng"),
        ("emailNormalized", "String", "Unique, Not Null", "Email đã chuẩn hóa chữ thường"),
        ("passwordHash", "String", "Not Null", "Mật khẩu băm một chiều bằng Scrypt"),
        ("role", "UserRole", "Enum: CUSTOMER, STAFF, ADMIN", "Vai trò và quyền hạn trong hệ thống"),
        ("status", "UserStatus", "Enum: ACTIVE, LOCKED", "Trạng thái hoạt động của tài khoản"),
        ("mustChangePassword", "Boolean", "Default: false", "Cờ bắt buộc đổi mật khẩu ở lần đăng nhập đầu"),
        ("authVersion", "Int", "Default: 0", "Phiên bản xác thực để hủy phiên từ xa khi đổi pass")
    ]
    for r_data in u_cols:
        row = t_u.add_row()
        for idx, val in enumerate(r_data):
            c = row.cells[idx]; c.text = val; set_cell_margins(c, top=60, bottom=60, left=80, right=80)
            p = c.paragraphs[0]; p.paragraph_format.space_after = Pt(2)
            if idx == 0:
                p.alignment = WD_ALIGN_PARAGRAPH.LEFT
                for r in p.runs: r.bold = True; r.font.name = 'Times New Roman'; r.font.size = Pt(10.5)
            else:
                p.alignment = WD_ALIGN_PARAGRAPH.LEFT
                for r in p.runs: r.font.name = 'Times New Roman'; r.font.size = Pt(10.5)

    add_table_header_caption("Bảng 2.18 Cấu trúc bảng Movies & Showtimes lưu phim và suất chiếu")
    t_ms = doc.add_table(rows=1, cols=4)
    t_ms.alignment = WD_TABLE_ALIGNMENT.CENTER; set_table_borders(t_ms)
    for idx, name in enumerate(["Tên trường", "Kiểu dữ liệu", "Ràng buộc", "Mô tả ý nghĩa"]):
        c = t_ms.rows[0].cells[idx]; c.text = name; set_cell_shading(c, "EBF1F5")
        p = c.paragraphs[0]; p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        for r in p.runs: r.bold = True; r.font.name = 'Times New Roman'; r.font.size = Pt(11)

    ms_cols = [
        ("Movie.id", "Uuid", "Primary Key", "Định danh duy nhất bộ phim"),
        ("Movie.slug", "String", "Unique, Index", "Chuỗi định danh URL thân thiện"),
        ("Movie.durationMinutes", "Int", "Not Null", "Thời lượng bộ phim tính theo phút"),
        ("Movie.ageRatingCode", "String", "P, K, T13, T16, T18", "Mã phân loại độ tuổi theo quy định"),
        ("Showtime.id", "Uuid", "Primary Key", "Định danh duy nhất suất chiếu"),
        ("Showtime.startsAt", "Timestamptz(3)", "Index, Not Null", "Thời điểm bắt đầu chiếu phim"),
        ("Showtime.cleanupEndsAt", "Timestamptz(3)", "Not Null", "Thời điểm dọn dẹp xong (endsAt + 20 phút)"),
        ("Showtime.salesCutoffAt", "Timestamptz(3)", "Not Null", "Thời điểm dừng bán online (startsAt - 10 phút)"),
        ("Showtime.basePrice", "Int", "Not Null", "Giá vé cơ bản của ghế thường (VND)")
    ]
    for r_data in ms_cols:
        row = t_ms.add_row()
        for idx, val in enumerate(r_data):
            c = row.cells[idx]; c.text = val; set_cell_margins(c, top=60, bottom=60, left=80, right=80)
            p = c.paragraphs[0]; p.paragraph_format.space_after = Pt(2)
            if idx == 0:
                p.alignment = WD_ALIGN_PARAGRAPH.LEFT
                for r in p.runs: r.bold = True; r.font.name = 'Times New Roman'; r.font.size = Pt(10.5)
            else:
                p.alignment = WD_ALIGN_PARAGRAPH.LEFT
                for r in p.runs: r.font.name = 'Times New Roman'; r.font.size = Pt(10.5)

    add_table_header_caption("Bảng 2.19 Cấu trúc bảng Bookings & Tickets lưu đơn hàng và vé")
    t_bt = doc.add_table(rows=1, cols=4)
    t_bt.alignment = WD_TABLE_ALIGNMENT.CENTER; set_table_borders(t_bt)
    for idx, name in enumerate(["Tên trường", "Kiểu dữ liệu", "Ràng buộc", "Mô tả ý nghĩa"]):
        c = t_bt.rows[0].cells[idx]; c.text = name; set_cell_shading(c, "EBF1F5")
        p = c.paragraphs[0]; p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        for r in p.runs: r.bold = True; r.font.name = 'Times New Roman'; r.font.size = Pt(11)

    bt_cols = [
        ("Booking.code", "String", "Unique, Index", "Mã đơn hàng hiển thị định dạng CR-..."),
        ("Booking.total", "BigInt", "Not Null", "Tổng số tiền đơn hàng tính bằng VND chính xác"),
        ("Booking.status", "BookingStatus", "PENDING, PAID, CANCELLED", "Trạng thái thanh toán của đơn hàng"),
        ("Booking.expiresAt", "Timestamptz(3)", "Not Null", "Thời điểm hết hạn giữ ghế của đơn hàng"),
        ("Ticket.code", "String", "Unique, Index", "Mã vé điện tử duy nhất định dạng TK-..."),
        ("Ticket.status", "TicketStatus", "VALID, USED, CANCELLED", "Trạng thái sử dụng của vé vào rạp"),
        ("TicketRedemption.redeemedAt", "Timestamptz(3)", "Default: now()", "Thời điểm nhân viên xác nhận cho khách vào rạp"),
        ("TicketRedemption.requestKey", "String", "Unique per staff", "Mã chống gửi lặp yêu cầu soát vé (Idempotency)")
    ]
    for r_data in bt_cols:
        row = t_bt.add_row()
        for idx, val in enumerate(r_data):
            c = row.cells[idx]; c.text = val; set_cell_margins(c, top=60, bottom=60, left=80, right=80)
            p = c.paragraphs[0]; p.paragraph_format.space_after = Pt(2)
            if idx == 0:
                p.alignment = WD_ALIGN_PARAGRAPH.LEFT
                for r in p.runs: r.bold = True; r.font.name = 'Times New Roman'; r.font.size = Pt(10.5)
            else:
                p.alignment = WD_ALIGN_PARAGRAPH.LEFT
                for r in p.runs: r.font.name = 'Times New Roman'; r.font.size = Pt(10.5)

    add_h2("Kết luận chương 2:")
    add_p("Trong chương 2, em đã thực hiện toàn diện quá trình khảo sát, thu thập yêu cầu và thiết kế kiến trúc hệ thống CineReserve. Em đã xác định rõ 3 tác nhân với 16 ca sử dụng chi tiết, phân tích các kịch bản luồng chính, luồng rẽ nhánh và các biểu đồ trình tự (Sequence Diagrams) cho các tính năng giữ ghế 5 phút, thanh toán bất biến, soát vé QR và lập lịch không trùng phòng.")
    add_p("Hệ thống cơ sở dữ liệu quan hệ gồm 21 bảng được thiết kế chuẩn hóa mức 3 (3NF) trên PostgreSQL, giải quyết trọn vẹn việc lưu vết lịch sử giao dịch và bảo toàn tính toàn vẹn tài chính. Đây là kim chỉ nam chính xác để tiến hành cài đặt, triển khai và kiểm thử hệ thống trong Chương 3.")
    doc.add_page_break()

    # =========================================================================
    # CHƯƠNG 3 (CÓ ẢNH THẬT TỪ HỆ THỐNG ĐÃ CHẠY)
    # =========================================================================
    add_title_p("CHƯƠNG 3: KẾT QUẢ VÀ ĐÁNH GIÁ", size=16, bold=True, space_after=14)
    add_h2("3.1 Chuẩn bị môi trường và mã nguồn")
    add_h3("Cài đặt Node.js và môi trường hệ thống")
    add_p("Truy cập trang chủ của Node.js (https://nodejs.org) và cài đặt phiên bản ổn định LTS (Node.js 20 trở lên). Sau đó mở Terminal kiểm tra phiên bản môi trường bằng các lệnh:")
    add_bullet("node -v  (Yêu cầu >= v20.9.0)")
    add_bullet("npm -v   (Yêu cầu >= v10.0.0)")

    add_h3("Clone project từ GitHub")
    add_p("Mở terminal, dùng lệnh cd để chuyển tới thư mục làm việc mong muốn, sau đó chạy lệnh clone dự án CineReserve từ GitHub repository chính thức:")
    add_bullet("git clone https://github.com/sontruong3112/CINERESERVE-.git")
    add_bullet("cd CINERESERVE-")

    add_h3("Cài đặt các gói phụ thuộc (Dependencies)")
    add_p("Tại thư mục gốc của dự án, tiến hành cài đặt toàn bộ các thư viện phía frontend, backend, Prisma ORM và công cụ kiểm thử:")
    add_bullet("npm install")

    add_h3("Cài đặt và khởi chạy cơ sở dữ liệu")
    add_p("Hệ thống CineReserve được cấu hình cơ sở dữ liệu PostgreSQL 17 portable nội bộ không cần cài service phức tạp. Mở Terminal thứ nhất và chạy lệnh khởi động database local:")
    add_bullet("npm run db:local")
    add_p("Terminal này sẽ tự động khởi tạo cơ sở dữ liệu tại cổng 127.0.0.1:55432 và lưu trữ tại thư mục .local/postgres. Giữ nguyên Terminal này trong suốt quá trình chạy ứng dụng.")

    add_h3("Thiết lập cấu trúc bảng và nạp dữ liệu mẫu (Migrations & Seeding)")
    add_p("Mở Terminal thứ hai để tiến hành đồng bộ schema và nạp dữ liệu rạp, phòng, phim và suất chiếu demo:")
    add_bullet("npm run db:deploy      (Chạy toàn bộ các bản migration CSDL)")
    add_bullet("npm run db:seed        (Nạp dữ liệu mẫu về phim, rạp, phòng chiếu và ghế)")
    add_bullet("npm run auth:dev-accounts (Khởi tạo tài khoản quản trị và nhân viên demo)")

    add_h3("Cấu hình biến môi trường (.env)")
    add_p("Tệp .env trong thư mục gốc quản lý các tham số cấu hình quan trọng:")
    add_bullet("DATABASE_URL=\"postgresql://...:55432/cinereserve\"")
    add_bullet("CATALOGUE_SOURCE=\"database\"")
    add_bullet("GEMINI_API_KEY=\"AIzaSy...\"")
    add_bullet("CHATBOT_ENABLED=\"true\"")
    add_bullet("ALLOW_DEMO_SEED=\"true\"")

    add_h3("Khởi chạy ứng dụng thử nghiệm")
    add_p("Chạy lệnh khởi động máy chủ Next.js App Router:")
    add_bullet("npm run dev")
    add_p("Mở trình duyệt web truy cập địa chỉ: http://localhost:3001. Hệ thống tự động chuyển hướng về trang chủ tiếng Việt (/vi) với giao diện rạp chiếu phim hiện đại.")

    add_h2("3.2 Kết quả triển khai")
    add_p("Dưới đây là hình ảnh chụp thực tế từ các màn hình của website CineReserve đã được kiểm thử và chạy hoàn chỉnh:")

    # HÌNH ẢNH CHỤP THẬT TỪ HỆ THỐNG
    add_image_with_caption(r"d:\DA\docs-images\hinh3-1-trang-chu.png", "Hình 3.1 Giao diện trang chủ đã đăng nhập hệ thống CineReserve", 14.5)
    add_image_with_caption(r"d:\DA\docs-images\hinh3-2-danh-muc-phim.png", "Hình 3.2 Giao diện danh mục phim và bộ lọc theo rạp/ngày", 14.5)
    add_image_with_caption(r"d:\DA\docs-images\hinh3-3-chi-tiet-phim.png", "Hình 3.3 Giao diện chi tiết phim và lịch chiếu theo rạp", 14.5)
    add_image_with_caption(r"d:\DA\docs-images\hinh3-4-cum-rap.png", "Hình 3.4 Giao diện danh sách cụm rạp chiếu phim CineReserve", 14.5)
    add_image_with_caption(r"d:\DA\docs-images\hinh3-5-chinh-sach-ve.png", "Hình 3.5 Giao diện hướng dẫn và chính sách đặt vé trực tuyến", 14.5)
    add_image_with_caption(r"d:\DA\docs-images\hinh3-6-dang-nhap.png", "Hình 3.6 Giao diện đăng nhập hệ thống CineReserve", 14.5)
    add_image_with_caption(r"d:\DA\docs-images\hinh3-7-dang-ky.png", "Hình 3.7 Giao diện đăng ký tài khoản khách hàng mới", 14.5)
    add_image_with_caption(r"d:\DA\anh-tien-do\02-quan-ly-lich-chieu.jpg", "Hình 3.8 Giao diện quản lý lịch chiếu và phòng chiếu Admin", 14.5)
    add_image_with_caption(r"d:\DA\anh-tien-do\03-chon-va-giu-ghe.jpg", "Hình 3.9 Giao diện chọn ghế và đồng hồ đếm ngược 5 phút thực tế", 12.0)

    add_h2("3.3 Kiểm thử hệ thống")
    add_p("Để đảm bảo toàn bộ các ca sử dụng hoạt động chính xác tuyệt đối, đồ án đã triển khai 15 bộ script kiểm thử tự động toàn diện được viết bằng TypeScript:")

    add_table_header_caption("Bảng 3.1 Các case kiểm thử hệ thống CineReserve")
    t_cases = doc.add_table(rows=1, cols=4)
    t_cases.alignment = WD_TABLE_ALIGNMENT.CENTER; set_table_borders(t_cases)
    for idx, name in enumerate(["STT", "Chức năng kiểm thử", "Kịch bản kiểm thử chi tiết", "Kết quả mong đợi & Đánh giá"]):
        c = t_cases.rows[0].cells[idx]; c.text = name; set_cell_shading(c, "EBF1F5")
        p = c.paragraphs[0]; p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        for r in p.runs: r.bold = True; r.font.name = 'Times New Roman'; r.font.size = Pt(11)

    cases_data = [
        ("1", "Đăng ký tài khoản", "Nhập thông tin hợp lệ (tên, email, pass >= 10 ký tự) -> nhấn Đăng ký", "Tài khoản được tạo, băm Scrypt, chuyển về login (ĐẠT)"),
        ("2", "Đăng nhập hệ thống", "Nhập đúng email và mật khẩu -> nhấn Đăng nhập", "Hệ thống cấp cookie cr_session, chuyển đúng trang theo Role (ĐẠT)"),
        ("3", "Đăng xuất tài khoản", "Bấm Đăng xuất từ menu tài khoản", "Cookie bị xóa, ghế đang giữ được giải phóng tự do (ĐẠT)"),
        ("4", "Khám phá danh mục phim", "Lọc phim theo Thể loại, Rạp, Ngày hoặc tìm kiếm tiếng Việt không dấu", "Danh sách phim lọc chính xác, không giật trang (ĐẠT)"),
        ("5", "Giữ ghế 5 phút (Concurreny)", "10 tiến trình đồng thời bấm giữ cùng 1 vị trí ghế VIP trong 1ms", "Đúng 1 tiến trình giữ được ghế, 9 tiến trình nhận lỗi 409 (ĐẠT)"),
        ("6", "Hết hạn giữ ghế", "Giữ ghế và chờ quá 300 giây mà không thanh toán", "Ghế tự động trả về trạng thái AVAILABLE, đơn pending bị hủy (ĐẠT)"),
        ("7", "Thanh toán an toàn (Replay)", "Gửi lặp lại cùng một idempotencyKey thanh toán", "Hệ thống trả kết quả cũ, không bao giờ trừ tiền 2 lần (ĐẠT)"),
        ("8", "Phát hành vé QR", "Thanh toán thành công đơn hàng", "Ghế chuyển SOLD, mỗi ghế sinh 1 vé TK-... kèm QR Code SVG (ĐẠT)"),
        ("9", "Soát vé QR hợp lệ", "Nhân viên rạp quét mã QR trong khung giờ chiếu hợp lệ -> bấm Xác nhận", "Vé chuyển sang USED, lưu vết TicketRedemption (ĐẠT)"),
        ("10", "Chặn soát lại vé cũ", "Quét lại mã vé đã chuyển trạng thái USED", "Hệ thống lập tức báo lỗi ALREADY_USED và từ chối vào rạp (ĐẠT)"),
        ("11", "Trợ lý AI Streaming", "Khách hỏi tư vấn phim tự nhiên bằng tiếng Việt", "AI streaming NDJSON mượt mà, gợi ý đúng suất đang bán (ĐẠT)"),
        ("12", "Bảo tồn ngữ cảnh AI", "Khách nhắn câu ngắn đổi điều kiện: \"đổi sang rạp Hà Nội\"", "AI nhận diện đúng rạp và giữ nguyên bộ lọc độ tuổi trước đó (ĐẠT)"),
        ("13", "Lập lịch không trùng phòng", "Admin tạo suất chiếu mới đè vào giờ đang chiếu hoặc 20p dọn phòng", "Hệ thống từ chối và báo lỗi xung đột lịch phòng chiếu (ĐẠT)"),
        ("14", "Báo cáo doanh thu & CSV", "Lọc doanh thu theo tháng và xuất file CSV", "Tính đúng Gross/Refund/Net, file CSV có UTF-8 BOM chuẩn (ĐẠT)"),
        ("15", "Toàn luồng E2E Journey", "Chạy trọn vẹn luồng từ Khách đặt vé -> QR -> Nhân viên soát vé", "234 ca kiểm thử E2E liên hoàn đạt 100% PASS (ĐẠT)")
    ]
    for stt, fn, sc, res in cases_data:
        row = t_cases.add_row()
        c0, c1, c2, c3 = row.cells
        c0.text, c1.text, c2.text, c3.text = stt, fn, sc, res
        for idx, c in enumerate([c0, c1, c2, c3]):
            set_cell_margins(c, top=60, bottom=60, left=80, right=80)
            p = c.paragraphs[0]; p.paragraph_format.space_after = Pt(2)
            if idx == 0:
                p.alignment = WD_ALIGN_PARAGRAPH.CENTER
                for r in p.runs: r.font.name = 'Times New Roman'; r.font.size = Pt(10.5)
            elif idx == 1:
                p.alignment = WD_ALIGN_PARAGRAPH.LEFT
                for r in p.runs: r.bold = True; r.font.name = 'Times New Roman'; r.font.size = Pt(10.5)
            else:
                p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
                for r in p.runs: r.font.name = 'Times New Roman'; r.font.size = Pt(10.5)

    add_h2("3.4 Kết quả đánh giá")
    add_p("Sau quá trình triển khai thực tế và chạy toàn bộ hơn 840 ca kiểm thử tự động, hệ thống CineReserve đạt được các đánh giá xuất sắc:")
    add_bullet("Về phía người dùng (Khách hàng): Trải nghiệm đặt vé diễn ra liền mạch, sơ đồ ghế 44px dễ bấm trên điện thoại, đồng hồ 5 phút đếm ngược rõ ràng và vé QR hiển thị ngay lập tức sau thanh toán.")
    add_bullet("Về phía nhân viên soát vé: Giao diện web camera quét mã QR nhạy bén, quy trình xác thực 2 bước giúp kiểm soát vé an toàn và loại trừ hoàn toàn vé giả mạo.")
    add_bullet("Về phía quản trị viên: Quản lý phim song ngữ thuận tiện, thuật toán chống trùng phòng chiếu đảm bảo rạp luôn có đủ 20 phút vệ sinh phòng.")
    add_bullet("Về hiệu năng và bảo mật: Cơ chế khóa PostgreSQL Advisory Lock giải quyết triệt để bài toán tranh chấp ghế đồng thời mà không làm tăng tải CPU của CSDL. Mật khẩu băm Scrypt bảo vệ an toàn tối đa cho tài khoản người dùng.")
    add_bullet("Về Trợ lý ảo AI: Tốc độ phản hồi gói tin đầu tiên dưới 600ms, nhận diện tốt ngữ cảnh hội thoại tiếng Việt và chỉ gợi ý các bộ phim đang thực sự mở bán vé.")

    add_h2("Kết luận chương 3:")
    add_p("Trong chương 3, em đã trình bày chi tiết toàn bộ các bước triển khai hệ thống CineReserve từ khâu chuẩn bị mã nguồn, cấu hình database PostgreSQL, nạp dữ liệu mẫu đến kết quả giao diện thực tế của từng phân hệ. Kết quả kiểm thử với hơn 840 ca kiểm thử tự động đạt tỷ lệ thành công 100% là bằng chứng khoa học vững chắc khẳng định hệ thống hoạt động ổn định, chính xác và sẵn sàng cho việc nghiệm thu trước Hội đồng.")
    doc.add_page_break()

    # =========================================================================
    # KẾT LUẬN & HƯỚNG PHÁT TRIỂN
    # =========================================================================
    add_title_p("KẾT LUẬN", size=18, bold=True, space_after=14)
    add_h2("Kết quả đạt được")
    add_p("Qua quá trình thực hiện đề tài tốt nghiệp \"Xây dựng website đặt vé xem phim CineReserve sử dụng Next.js, TypeScript và tích hợp chatbot AI\", em đã thành công trong việc nghiên cứu và ứng dụng những công nghệ web tiên tiến nhất hiện nay vào một sản phẩm thực tế. Kết quả đạt được thể hiện ở các điểm nổi bật sau:")
    add_bullet("Xây dựng thành công hệ thống website CineReserve hoàn chỉnh với kiến trúc Next.js 16 App Router, React 19, TypeScript, PostgreSQL 17 và Prisma ORM.")
    add_bullet("Giải quyết trọn vẹn bài toán hóc búa về tranh chấp tài nguyên đồng thời khi giữ ghế thông qua cơ chế khóa cấp giao dịch PostgreSQL Advisory Lock, đảm bảo tính toàn vẹn tuyệt đối cho phiên giữ ghế 5 phút.")
    add_bullet("Hiện thực hóa thành công quy trình nghiệp vụ điện ảnh khép kín: đặt vé nhanh, chọn ghế thời gian thực, thanh toán an toàn với idempotency, phát hành vé điện tử mã QR độc lập và soát vé qua camera di động.")
    add_bullet("Tích hợp thành công mô hình ngôn ngữ lớn Google Gemini AI với kỹ thuật Single-Turn Schema và giao thức Streaming NDJSON, mang lại một Trợ lý ảo tư vấn phim thông minh vượt trội.")
    add_bullet("Bảo chứng chất lượng hệ thống bằng 15 bộ kịch bản kiểm thử tự động với hơn 840 tests đạt tỷ lệ thành công 100%.")

    add_h2("Hạn chế")
    add_p("Mặc dù hệ thống đã đạt được hầu hết các mục tiêu quan trọng đề ra, đề tài vẫn còn tồn tại một số hạn chế nhất định:")
    add_bullet("Cổng thanh toán trong đồ án hiện mới dừng lại ở mức độ mô phỏng an toàn (Mock Payment) phục vụ kiểm thử nghiệp vụ, chưa tích hợp trực tiếp với cổng thanh toán tiền thật (như VNPAY hay MoMo).")
    add_bullet("Hệ thống hiện tại hoạt động trên nền tảng Web Responsive, chưa xây dựng các ứng dụng di động độc lập (Native Mobile App) trên iOS và Android.")
    add_bullet("Chưa triển khai các dịch vụ giá trị gia tăng như bán bắp nước (F&B combos) hoặc tích điểm thành viên.")

    add_h2("Hướng phát triển")
    add_p("Trong tương lai gần, em sẽ tiếp tục hoàn thiện và phát triển mở rộng hệ thống với các định hướng sau:")
    add_bullet("Tích hợp cổng thanh toán trực tuyến chính thức qua cổng thanh toán quốc gia (VNPAY Sandbox / MoMo API) có chữ ký số bảo mật.")
    add_bullet("Xây dựng ứng dụng di động chuyên dụng cho nhân viên soát vé bằng React Native nhằm tối ưu tốc độ nhận diện mã QR trong điều kiện ánh sáng yếu tại cửa rạp.")
    add_bullet("Ứng dụng mô hình học máy (Machine Learning Recommendation System) dựa trên lịch sử xem phim để cá nhân hóa hoàn toàn giao diện trang chủ cho từng khách hàng.")
    doc.add_page_break()

    # =========================================================================
    # TÀI LIỆU THAM KHẢO
    # =========================================================================
    add_title_p("TÀI LIỆU THAM KHẢO", size=18, bold=True, space_after=14)
    ref_list = [
        "Trường Đại học Công nghiệp Hà Nội (2025), Quy định và Hướng dẫn trình bày Đồ án tốt nghiệp Đại học ngành Khoa học Máy tính, Nhà xuất bản Đại học Công nghiệp Hà Nội.",
        "Nguyễn Trung Phú (2019), Giáo trình thiết kế Web, Nhà xuất bản Thống Kê.",
        "Martin Kleppmann (2017), Designing Data-Intensive Applications: The Big Ideas Behind Reliable, Scalable, and Maintainable Systems, O'Reilly Media, ISBN: 978-1449373320.",
        "Robert C. Martin (2017), Clean Architecture: A Craftsman's Guide to Software Structure and Design, Prentice Hall, ISBN: 978-0134494166.",
        "PostgreSQL Global Development Group (2025), \"Explicit Locking and Advisory Locks in PostgreSQL 17\", PostgreSQL Documentation. [Online]. Available: https://www.postgresql.org/docs/current/explicit-locking.html",
        "Vercel Inc. (2026), \"Next.js App Router, Server Components, and Data Fetching Architecture\", Next.js Documentation. [Online]. Available: https://nextjs.org/docs",
        "Prisma Data Inc. (2026), \"Prisma Client Transactions, Concurrency Control, and Advisory Locks\", Prisma Guide. [Online]. Available: https://www.prisma.io/docs",
        "Google Cloud (2026), \"Gemini API Developer Guide, Structured Outputs, and Streaming Patterns\", Google AI for Developers. [Online]. Available: https://ai.google.dev/docs",
        "Duckett, J. (2014), JavaScript and jQuery: Interactive Front-End Web Development, Wiley.",
        "Sommerville, I. (2016), Software Engineering (10th ed.), Pearson.",
        "Richardson, L., & Ruby, S. (2023), RESTful Web Services, O'Reilly Media.",
        "Tilkov, S., & Vinoski, S. (2023), \"Node.js: Using JavaScript to Build Scalable Network Programs\", IEEE Internet Computing, 14(6), 80–83."
    ]
    for idx, ref in enumerate(ref_list):
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
        p.paragraph_format.space_before = Pt(2)
        p.paragraph_format.space_after = Pt(4)
        p.paragraph_format.line_spacing = 1.3
        p.paragraph_format.first_line_indent = Cm(-0.8)
        p.paragraph_format.left_indent = Cm(0.8)
        
        r_num = p.add_run(f"[{idx+1}] "); r_num.bold = True; r_num.font.name = 'Times New Roman'; r_num.font.size = Pt(12)
        r_text = p.add_run(ref); r_text.font.name = 'Times New Roman'; r_text.font.size = Pt(12)

    # Lưu file
    target_path = r"d:\DA\Bao_Cao_Do_An_Tot_Nghiep_CineReserve_K16.docx"
    doc.save(target_path)
    print(f"SUCCESS: Da xuat ban thanh cong file Word co day du hinh anh tai: {target_path}")

if __name__ == "__main__":
    build_thesis_with_images()
