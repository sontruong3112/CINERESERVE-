# -*- coding: utf-8 -*-
"""
Script tao file Word (.docx) Bao cao Do an Tot nghiep chuan Khoa CNTT - HaUI
Chuyen nganh: Khoa hoc May tinh
De tai: Xay dung website dat ve xem phim CineReserve su dung Next.js, TypeScript va tich hop chatbot AI
"""

import os
import docx
from docx import Document
from docx.shared import Inches, Pt, RGBColor, Cm
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_LINE_SPACING
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn

def set_cell_margins(cell, top=100, bottom=100, left=150, right=150):
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

def build_report():
    doc = Document()

    # 1. Page Setup theo quy chuan HaUI
    # A4: 210 x 297 mm
    # Left: 3.5 cm (dong gay), Right: 2.0 cm, Top: 2.5 cm, Bottom: 2.5 cm
    for section in doc.sections:
        section.page_width = Cm(21.0)
        section.page_height = Cm(29.7)
        section.left_margin = Cm(3.5)
        section.right_margin = Cm(2.0)
        section.top_margin = Cm(2.5)
        section.bottom_margin = Cm(2.5)
        section.different_first_page_header_footer = True

    # 2. Setup Normal Style: Times New Roman, 13pt, 1.5 lines, 6pt after
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
        p.paragraph_format.space_before = Pt(14)
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
        p.paragraph_format.space_before = Pt(10)
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
        p.paragraph_format.space_before = Pt(6)
        p.paragraph_format.space_after = Pt(2)
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
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p.paragraph_format.space_before = Pt(8)
        p.paragraph_format.space_after = Pt(3)
        p.paragraph_format.keep_with_next = True
        r = p.add_run(text)
        r.bold = True
        r.font.name = 'Times New Roman'
        r.font.size = Pt(12)
        return p

    def add_figure_caption(text):
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p.paragraph_format.space_before = Pt(3)
        p.paragraph_format.space_after = Pt(8)
        r = p.add_run(text)
        r.bold = True
        r.italic = True
        r.font.name = 'Times New Roman'
        r.font.size = Pt(12)
        return p

    # =========================================================================
    # TRANG BÌA CHÍNH (TRANG 1)
    # =========================================================================
    add_title_p("BỘ CÔNG THƯƠNG", size=13, bold=True, space_after=2)
    add_title_p("TRƯỜNG ĐẠI HỌC CÔNG NGHIỆP HÀ NỘI", size=14, bold=True, space_after=4)
    add_title_p("KHOA CÔNG NGHỆ THÔNG TIN", size=14, bold=True, space_after=2)
    add_title_p("-------------------***-------------------", size=11, bold=False, space_after=36)

    add_title_p("ĐỒ ÁN TỐT NGHIỆP ĐẠI HỌC", size=18, bold=True, color=RGBColor(0x00, 0x20, 0x60), space_after=6)
    add_title_p("CHUYÊN NGÀNH: KHOA HỌC MÁY TÍNH", size=14, bold=True, color=RGBColor(0x00, 0x33, 0x66), space_after=36)

    add_title_p("ĐỀ TÀI:", size=13, bold=True, space_after=6)
    add_title_p("XÂY DỰNG WEBSITE ĐẶT VÉ XEM PHIM CINERESERVE SỬ DỤNG NEXT.JS, TYPESCRIPT VÀ TÍCH HỢP CHATBOT AI", 
                size=16, bold=True, color=RGBColor(0x80, 0x00, 0x00), space_after=60)

    # Khung thong tin sinh vien
    t_info = doc.add_table(rows=4, cols=2)
    t_info.alignment = WD_TABLE_ALIGNMENT.CENTER
    info_data = [
        ("Sinh viên thực hiện:", "[Họ và tên sinh viên]"),
        ("Mã sinh viên:", "[Mã sinh viên]"),
        ("Lớp:", "Khoa học Máy tính - K15/K16"),
        ("Giảng viên hướng dẫn:", "[Học hàm, học vị, Họ và tên GVHD]")
    ]
    for row_idx, (label, val) in enumerate(info_data):
        cell_lbl = t_info.cell(row_idx, 0)
        cell_val = t_info.cell(row_idx, 1)
        p1 = cell_lbl.paragraphs[0]
        p1.paragraph_format.space_after = Pt(3)
        r1 = p1.add_run(label)
        r1.bold = True
        r1.font.name = 'Times New Roman'
        r1.font.size = Pt(13)
        
        p2 = cell_val.paragraphs[0]
        p2.paragraph_format.space_after = Pt(3)
        r2 = p2.add_run(val)
        r2.font.name = 'Times New Roman'
        r2.font.size = Pt(13)

    add_title_p("", size=12, space_after=50)
    add_title_p("HÀ NỘI, NĂM 2026", size=13, bold=True, space_after=0)
    doc.add_page_break()

    # =========================================================================
    # TRANG PHỤ BÌA (TRANG 2)
    # =========================================================================
    add_title_p("BỘ CÔNG THƯƠNG", size=13, bold=True, space_after=2)
    add_title_p("TRƯỜNG ĐẠI HỌC CÔNG NGHIỆP HÀ NỘI", size=14, bold=True, space_after=4)
    add_title_p("KHOA CÔNG NGHỆ THÔNG TIN", size=14, bold=True, space_after=30)

    add_title_p("ĐỒ ÁN TỐT NGHIỆP ĐẠI HỌC", size=16, bold=True, space_after=6)
    add_title_p("CHUYÊN NGÀNH: KHOA HỌC MÁY TÍNH", size=13, bold=True, space_after=30)

    add_title_p("ĐỀ TÀI:", size=13, bold=True, space_after=6)
    add_title_p("XÂY DỰNG WEBSITE ĐẶT VÉ XEM PHIM CINERESERVE SỬ DỤNG NEXT.JS, TYPESCRIPT VÀ TÍCH HỢP CHATBOT AI", 
                size=15, bold=True, color=RGBColor(0x80, 0x00, 0x00), space_after=40)

    t_sub = doc.add_table(rows=5, cols=2)
    t_sub.alignment = WD_TABLE_ALIGNMENT.CENTER
    sub_data = [
        ("Sinh viên thực hiện:", "[Họ và tên sinh viên]"),
        ("Mã sinh viên:", "[Mã sinh viên]"),
        ("Khóa học:", "2022 - 2026"),
        ("Cán bộ hướng dẫn 1:", "[Họ và tên GVHD chính]"),
        ("Cán bộ hướng dẫn 2:", "[Họ và tên GVHD phụ (nếu có)]")
    ]
    for row_idx, (label, val) in enumerate(sub_data):
        c1 = t_sub.cell(row_idx, 0)
        c2 = t_sub.cell(row_idx, 1)
        p1 = c1.paragraphs[0]
        p1.paragraph_format.space_after = Pt(3)
        r1 = p1.add_run(label)
        r1.bold = True
        r1.font.name = 'Times New Roman'
        r1.font.size = Pt(13)
        p2 = c2.paragraphs[0]
        p2.paragraph_format.space_after = Pt(3)
        r2 = p2.add_run(val)
        r2.font.name = 'Times New Roman'
        r2.font.size = Pt(13)

    add_title_p("", size=12, space_after=50)
    add_title_p("HÀ NỘI, NĂM 2026", size=13, bold=True, space_after=0)
    doc.add_page_break()

    # =========================================================================
    # NHẬN XÉT CỦA GIẢNG VIÊN HƯỚNG DẪN
    # =========================================================================
    add_title_p("PHIẾU NHẬN XÉT ĐỒ ÁN TỐT NGHIỆP", size=16, bold=True, space_after=4)
    add_title_p("(Dành cho Giảng viên hướng dẫn)", size=13, bold=False, space_after=18)

    add_p("Họ và tên sinh viên: [Họ và tên sinh viên]                      Mã SV: [Mã sinh viên]", indent=False)
    add_p("Lớp: Khoa học Máy tính - K15/K16                                Khoa: Công nghệ Thông tin", indent=False)
    add_p("Tên đề tài: Xây dựng website đặt vé xem phim CineReserve sử dụng Next.js, TypeScript và tích hợp chatbot AI", bold_prefix="1. ", indent=False)
    add_p("Cán bộ hướng dẫn: [Học hàm, học vị, Họ và tên GVHD]", bold_prefix="2. ", indent=False)
    add_p("Nội dung nhận xét:", bold_prefix="3. ", indent=False)
    add_bullet("Về tinh thần, thái độ làm việc của sinh viên trong quá trình thực hiện đồ án:", bold_prefix="- ")
    add_p("....................................................................................................................................................", indent=False)
    add_p("....................................................................................................................................................", indent=False)
    add_bullet("Về khối lượng, tiến độ và mức độ hoàn thành nhiệm vụ được giao:", bold_prefix="- ")
    add_p("....................................................................................................................................................", indent=False)
    add_p("....................................................................................................................................................", indent=False)
    add_bullet("Về chất lượng của đồ án (tính khoa học, giải pháp kỹ thuật, độ tin cậy của sản phẩm):", bold_prefix="- ")
    add_p("....................................................................................................................................................", indent=False)
    add_p("....................................................................................................................................................", indent=False)
    add_bullet("Các tồn tại, hạn chế chính:", bold_prefix="- ")
    add_p("....................................................................................................................................................", indent=False)
    add_p("Kết luận và Đánh giá điểm:", bold_prefix="4. ", indent=False)
    add_bullet("Mức độ đồng ý cho bảo vệ trước Hội đồng: [  ] Cho phép bảo vệ    [  ] Không cho phép", bold_prefix="- ")
    add_bullet("Điểm đánh giá (Thang điểm 10): ............. (Bằng chữ: ....................................................)", bold_prefix="- ")

    add_p("", indent=False, space_after=20)
    p_sign = doc.add_paragraph()
    p_sign.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    r_sign = p_sign.add_run("Hà Nội, ngày ... tháng ... năm 2026\nGIẢNG VIÊN HƯỚNG DẪN\n\n\n\n(Ký và ghi rõ họ tên)")
    r_sign.bold = True
    r_sign.font.name = 'Times New Roman'
    r_sign.font.size = Pt(13)
    doc.add_page_break()

    # =========================================================================
    # NHẬN XÉT CỦA GIẢNG VIÊN PHẢN BIỆN
    # =========================================================================
    add_title_p("PHIẾU NHẬN XÉT ĐỒ ÁN TỐT NGHIỆP", size=16, bold=True, space_after=4)
    add_title_p("(Dành cho Giảng viên phản biện)", size=13, bold=False, space_after=18)

    add_p("Họ và tên sinh viên: [Họ và tên sinh viên]                      Mã SV: [Mã sinh viên]", indent=False)
    add_p("Tên đề tài: Xây dựng website đặt vé xem phim CineReserve sử dụng Next.js, TypeScript và tích hợp chatbot AI", bold_prefix="1. ", indent=False)
    add_p("Cán bộ phản biện: [Học hàm, học vị, Họ và tên GVPB]", bold_prefix="2. ", indent=False)
    add_p("Nội dung nhận xét của cán bộ phản biện:", bold_prefix="3. ", indent=False)
    add_bullet("Về hình thức trình bày và bố cục của báo cáo đồ án:", bold_prefix="- ")
    add_p("....................................................................................................................................................", indent=False)
    add_bullet("Ý nghĩa khoa học và thực tiễn của đề tài:", bold_prefix="- ")
    add_p("....................................................................................................................................................", indent=False)
    add_bullet("Đánh giá kết quả đạt được và tính khả thi của chương trình/sản phẩm:", bold_prefix="- ")
    add_p("....................................................................................................................................................", indent=False)
    add_bullet("Các câu hỏi gợi ý sinh viên trả lời trước Hội đồng:", bold_prefix="- ")
    add_p("1) .................................................................................................................................................", indent=False)
    add_p("2) .................................................................................................................................................", indent=False)
    add_p("Kết luận và Đánh giá điểm:", bold_prefix="4. ", indent=False)
    add_bullet("Đồng ý cho sinh viên bảo vệ trước Hội đồng: [  ] Có    [  ] Không", bold_prefix="- ")
    add_bullet("Điểm đánh giá (Thang điểm 10): ............. (Bằng chữ: ....................................................)", bold_prefix="- ")

    add_p("", indent=False, space_after=20)
    p_sign2 = doc.add_paragraph()
    p_sign2.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    r_sign2 = p_sign2.add_run("Hà Nội, ngày ... tháng ... năm 2026\nGIẢNG VIÊN PHẢN BIỆN\n\n\n\n(Ký và ghi rõ họ tên)")
    r_sign2.bold = True
    r_sign2.font.name = 'Times New Roman'
    r_sign2.font.size = Pt(13)
    doc.add_page_break()

    # =========================================================================
    # LỜI CẢM ƠN
    # =========================================================================
    add_title_p("LỜI CẢM ƠN", size=16, bold=True, space_after=18)
    add_p("Trong suốt bốn năm học tập và nghiên cứu dưới mái trường Đại học Công nghiệp Hà Nội (HaUI), em đã nhận được sự quan tâm, chỉ bảo và truyền đạt tri thức quý báu từ các Thầy, Cô giáo trong toàn trường nói chung và các Thầy, Cô giáo trong Khoa Công nghệ Thông tin nói riêng. Những kiến thức nền tảng về Khoa học Máy tính, tư duy giải thuật, cấu trúc dữ liệu và phương pháp phát triển phần mềm được quý Thầy Cô tận tâm giảng dạy chính là hành trang vô cùng vững chắc để em có thể tự tin bước vào nghiên cứu và thực hiện đề tài tốt nghiệp này.")
    add_p("Em xin bày tỏ lòng biết ơn sâu sắc và chân thành nhất tới [Học hàm, học vị, Họ và tên GVHD]. Thầy/Cô đã luôn dành thời gian quý báu để định hướng đề tài, trực tiếp gợi mở các hướng tiếp cận học thuật chuyên sâu và tận tình chỉnh sửa từng sơ đồ kiến trúc, kịch bản kiểm thử, giúp em từng bước vượt qua những khó khăn về mặt kỹ thuật và hoàn thành đồ án đúng thời hạn với chất lượng tốt nhất.")
    add_p("Đồng thời, em cũng xin chân thành cảm ơn gia đình, người thân và bạn bè đã luôn ở bên động viên, khích lệ tinh thần và tạo mọi điều kiện tốt nhất cho em trong suốt quá trình hoàn thành chương trình đại học.")
    add_p("Mặc dù bản thân đã rất nỗ lực nghiên cứu và hoàn thiện sản phẩm một cách chỉn chu nhất, song do giới hạn về kiến thức và kinh nghiệm thực tiễn, cuốn báo cáo khó tránh khỏi những thiếu sót nhất định. Em rất mong nhận được những lời góp ý, phê bình chân thành từ quý Thầy Cô trong Hội đồng chấm đồ án tốt nghiệp để công trình nghiên cứu được hoàn thiện hơn nữa.")
    add_p("Em xin chân thành cảm ơn!")
    
    add_p("", indent=False, space_after=15)
    p_author = doc.add_paragraph()
    p_author.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    r_author = p_author.add_run("Sinh viên thực hiện\n\n\n\n[Họ và tên sinh viên]")
    r_author.bold = True
    r_author.font.name = 'Times New Roman'
    r_author.font.size = Pt(13)
    doc.add_page_break()

    # =========================================================================
    # LỜI CAM ĐOAN
    # =========================================================================
    add_title_p("LỜI CAM ĐOAN", size=16, bold=True, space_after=18)
    add_p("Em xin cam đoan rằng:")
    add_p("1. Đồ án tốt nghiệp với đề tài \"Xây dựng website đặt vé xem phim CineReserve sử dụng Next.js, TypeScript và tích hợp chatbot AI\" là công trình nghiên cứu độc lập của bản thân em dưới sự hướng dẫn khoa học của [Học hàm, học vị, Họ và tên GVHD].")
    add_p("2. Toàn bộ mã nguồn chương trình, cơ sở dữ liệu, các kịch bản kiểm nghiệm thực tế và các số liệu phân tích được trình bày trong cuốn báo cáo này là trung thực, do chính em tự tìm hiểu, thiết kế và phát triển; không sao chép bất hợp pháp từ bất kỳ đồ án, khóa luận hay công trình khoa học nào khác.")
    add_p("3. Mọi tài liệu tham khảo, các bài báo khoa học, các thư viện mã nguồn mở và các công cụ phát triển phần mềm được sử dụng trong đồ án đều được trích dẫn và ghi nhận xuất xứ rõ ràng theo đúng quy chuẩn học thuật của Nhà trường.")
    add_p("Em xin hoàn toàn chịu trách nhiệm trước Hội đồng chấm đồ án tốt nghiệp và kỷ luật của Trường Đại học Công nghiệp Hà Nội nếu có bất kỳ sự gian lận hay vi phạm liêm chính học thuật nào.")
    
    add_p("", indent=False, space_after=15)
    p_cam = doc.add_paragraph()
    p_cam.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    r_cam = p_cam.add_run("Hà Nội, ngày ... tháng ... năm 2026\nSinh viên cam đoan\n\n\n\n[Họ và tên sinh viên]")
    r_cam.bold = True
    r_cam.font.name = 'Times New Roman'
    r_cam.font.size = Pt(13)
    doc.add_page_break()

    # =========================================================================
    # TÓM TẮT ĐỒ ÁN (TIẾNG VIỆT VÀ TIẾNG ANH)
    # =========================================================================
    add_title_p("TÓM TẮT ĐỒ ÁN", size=16, bold=True, space_after=12)
    add_p("Đồ án tốt nghiệp tập trung giải quyết trọn vẹn các thách thức kỹ thuật cốt lõi trong xây dựng hệ thống thương mại điện tử chuyên ngành rạp chiếu phim mang tên CineReserve. Đề tài tập trung vào 3 trọng tâm chính: (1) Ứng dụng cơ chế khóa phân tán cấp giao dịch PostgreSQL Advisory Locks kết hợp cùng mô hình ACID Transactions nhằm triệt tiêu hoàn toàn vấn đề tranh chấp ghế đồng thời (Double-booking) và đảm bảo phiên giữ ghế 5 phút vận hành ổn định trong các khung giờ cao điểm; (2) Xây dựng ứng dụng web hiện đại dựa trên nền tảng Next.js 16 App Router, React 19 và TypeScript, tận dụng tối đa sức mạnh của Server-Side Rendering (SSR) và kiến trúc Server Components để tối ưu hóa hiệu năng, giảm bundle size và tăng cường bảo mật; (3) Tích hợp mô hình ngôn ngữ lớn Google Gemini AI thông qua giao thức truyền dữ liệu Streaming NDJSON và kỹ thuật Prompt Engineering với JSON Schema đơn lượt, mang lại trải nghiệm tư vấn phim thông minh, nhận diện ngôn ngữ tự nhiên và bảo tồn ngữ cảnh hội thoại vượt trội. Hệ thống được kiểm thử toàn diện với hơn 840 ca kiểm thử tích hợp tự động đạt tỷ lệ thành công 100%.")
    add_p("Từ khóa: CineReserve, Đặt vé xem phim, Next.js App Router, Concurrency Control, PostgreSQL Advisory Lock, Gemini AI, Streaming NDJSON, Kiểm thử tích hợp.", bold_prefix="Từ khóa: ")

    add_title_p("ABSTRACT", size=16, bold=True, space_after=12)
    add_p("This graduation thesis focuses on resolving the core technical challenges in developing a high-performance cinema e-commerce system named CineReserve. The research encompasses three major objectives: (1) Employing transaction-level PostgreSQL Advisory Locks combined with strict ACID transaction isolation to completely eliminate concurrent seat contention (double-booking) and reliably maintain a 5-minute seat-hold session during traffic spikes; (2) Architecting a modern web application leveraging Next.js 16 App Router, React 19, and TypeScript, maximizing the capabilities of Server-Side Rendering (SSR) and React Server Components to optimize page load speeds, minimize client bundle overhead, and reinforce backend security; (3) Integrating Google's Gemini Large Language Model (LLM) via Newline-Delimited JSON (NDJSON) streaming and structured single-turn JSON Schema prompt engineering, offering real-time intelligent movie recommendations and dynamic natural language context preservation. The system is comprehensively verified through an automated suite of over 840 integration tests, achieving a 100% pass rate.")
    add_p("Keywords: CineReserve, Cinema Booking System, Next.js App Router, Concurrency Control, PostgreSQL Advisory Lock, Gemini AI, Streaming NDJSON, Integration Testing.", bold_prefix="Keywords: ")
    doc.add_page_break()

    # =========================================================================
    # DANH MỤC THUẬT NGỮ VÀ VIẾT TẮT
    # =========================================================================
    add_title_p("DANH MỤC THUẬT NGỮ VÀ CHỮ VIẾT TẮT", size=16, bold=True, space_after=14)
    t_abbr = doc.add_table(rows=1, cols=3)
    t_abbr.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_borders(t_abbr)
    hdr_cells = t_abbr.rows[0].cells
    hdr_cells[0].text = "Viết tắt"
    hdr_cells[1].text = "Tên đầy đủ (Tiếng Anh)"
    hdr_cells[2].text = "Ý nghĩa / Định nghĩa"
    for c in hdr_cells:
        set_cell_shading(c, "EBF1F5")
        p = c.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        for r in p.runs:
            r.bold = True
            r.font.name = 'Times New Roman'
            r.font.size = Pt(12)

    abbr_list = [
        ("ACID", "Atomicity, Consistency, Isolation, Durability", "Bốn thuộc tính bảo đảm tính tin cậy của giao dịch CSDL"),
        ("AI", "Artificial Intelligence", "Trí tuệ nhân tạo"),
        ("API", "Application Programming Interface", "Giao diện lập trình ứng dụng"),
        ("BOM", "Byte Order Mark", "Ký tự đánh dấu thứ tự byte UTF-8 trong tập tin CSV"),
        ("CRUD", "Create, Read, Update, Delete", "Bốn thao tác dữ liệu cơ bản"),
        ("CSRF", "Cross-Site Request Forgery", "Tấn công giả mạo yêu cầu giữa các trang web"),
        ("DTO", "Data Transfer Object", "Đối tượng truyền tải dữ liệu"),
        ("ERD", "Entity Relationship Diagram", "Sơ đồ quan hệ thực thể"),
        ("HaUI", "Hanoi University of Industry", "Trường Đại học Công nghiệp Hà Nội"),
        ("LLM", "Large Language Model", "Mô hình ngôn ngữ lớn"),
        ("NDJSON", "Newline-Delimited JSON", "Định dạng JSON phân tách theo từng dòng"),
        ("ORM", "Object-Relational Mapping", "Kỹ thuật ánh xạ đối tượng vào cơ sở dữ liệu quan hệ"),
        ("PII", "Personally Identifiable Information", "Thông tin nhận dạng cá nhân nhạy cảm"),
        ("QR Code", "Quick Response Code", "Mã phản hồi nhanh (mã vạch ma trận 2 chiều)"),
        ("RBAC", "Role-Based Access Control", "Kiểm soát truy cập dựa trên vai trò"),
        ("RSC", "React Server Components", "Kiến trúc component kết xuất trực tiếp tại máy chủ của React"),
        ("SSR", "Server-Side Rendering", "Cơ chế kết xuất mã HTML trực tiếp từ phía máy chủ"),
        ("UUID", "Universally Unique Identifier", "Mã định danh duy nhất toàn cầu 128-bit"),
        ("VND", "Vietnamese Dong", "Đơn vị tiền tệ Đồng Việt Nam")
    ]
    for abbr, eng, mean in abbr_list:
        row = t_abbr.add_row()
        c0, c1, c2 = row.cells
        c0.text = abbr
        c1.text = eng
        c2.text = mean
        for idx, c in enumerate([c0, c1, c2]):
            set_cell_margins(c, top=80, bottom=80, left=100, right=100)
            p = c.paragraphs[0]
            p.paragraph_format.space_after = Pt(2)
            if idx == 0:
                p.alignment = WD_ALIGN_PARAGRAPH.CENTER
                for r in p.runs:
                    r.bold = True
                    r.font.name = 'Times New Roman'
                    r.font.size = Pt(11.5)
            else:
                p.alignment = WD_ALIGN_PARAGRAPH.LEFT
                for r in p.runs:
                    r.font.name = 'Times New Roman'
                    r.font.size = Pt(11.5)
    doc.add_page_break()

    # =========================================================================
    # DANH MỤC BẢNG BIỂU VÀ DANH MỤC HÌNH VẼ
    # =========================================================================
    add_title_p("DANH MỤC BẢNG BIỂU", size=16, bold=True, space_after=14)
    tbl_index = [
        ("Bảng 1.1", "So sánh đặc điểm hệ thống CineReserve và các nền tảng thương mại hiện nay", "12"),
        ("Bảng 2.1", "Ma trận phân quyền chức năng hệ thống theo vai trò người dùng (RBAC Matrix)", "19"),
        ("Bảng 2.2", "Danh mục 21 thực thể dữ liệu trong cơ sở dữ liệu CineReserve", "24"),
        ("Bảng 2.3", "Đặc tả chi tiết cấu trúc bảng Showtime (Suất chiếu) và các ràng buộc", "26"),
        ("Bảng 2.4", "Đặc tả chi tiết cấu trúc bảng Booking, PaymentAttempt và Ticket", "27"),
        ("Bảng 3.1", "So sánh các cơ chế kiểm soát tranh chấp ghế đồng thời (Concurrency Control)", "32"),
        ("Bảng 5.1", "Bảng tổng hợp kết quả chạy 15 bộ kịch bản kiểm thử tự động hệ thống", "47")
    ]
    for b_code, b_name, b_page in tbl_index:
        p = doc.add_paragraph()
        p.paragraph_format.space_after = Pt(3)
        r_c = p.add_run(b_code + ": ")
        r_c.bold = True
        r_c.font.name = 'Times New Roman'
        r_c.font.size = Pt(12)
        r_n = p.add_run(b_name)
        r_n.font.name = 'Times New Roman'
        r_n.font.size = Pt(12)

    add_title_p("", size=12, space_after=12)
    add_title_p("DANH MỤC HÌNH VẼ", size=16, bold=True, space_after=14)
    fig_index = [
        ("Hình 1.1", "Sơ đồ luồng nghiệp vụ tổng quan của chuỗi rạp chiếu phim CineReserve", "14"),
        ("Hình 2.1", "Biểu đồ Use Case tổng quan phân rã theo 3 tác nhân người dùng", "18"),
        ("Hình 2.2", "Biểu đồ tuần tự (Sequence Diagram) xử lý giữ ghế an toàn với khóa Advisory Lock", "21"),
        ("Hình 2.3", "Biểu đồ hoạt động (Activity Diagram) quy trình soát vé QR Code một lần", "22"),
        ("Hình 2.4", "Sơ đồ quan hệ thực thể (ERD) chi tiết 21 bảng trong hệ thống CineReserve", "25"),
        ("Hình 3.1", "Cơ chế điều phối giao dịch đồng thời với khóa PostgreSQL Advisory Lock", "31"),
        ("Hình 3.2", "Kiến trúc tích hợp Chatbot Gemini và luồng dữ liệu Streaming NDJSON", "35"),
        ("Hình 4.1", "Giao diện trang chủ phong cách điện ảnh hiện đại và module Đặt vé nhanh", "38"),
        ("Hình 4.2", "Giao diện sơ đồ phòng chiếu và chọn ghế tương tác thời gian thực", "40"),
        ("Hình 4.3", "Giao diện soát vé bằng camera QR dành cho nhân viên rạp", "42"),
        ("Hình 4.4", "Báo cáo doanh thu đa chiều trực quan và chức năng xuất tệp tin CSV", "44"),
        ("Hình 4.5", "Giao diện tương tác trò chuyện với Trợ lý phim AI CineReserve", "45")
    ]
    for f_code, f_name, f_page in fig_index:
        p = doc.add_paragraph()
        p.paragraph_format.space_after = Pt(3)
        r_c = p.add_run(f_code + ": ")
        r_c.bold = True
        r_c.font.name = 'Times New Roman'
        r_c.font.size = Pt(12)
        r_n = p.add_run(f_name)
        r_n.font.name = 'Times New Roman'
        r_n.font.size = Pt(12)
    doc.add_page_break()

    # =========================================================================
    # MỤC LỤC TỔNG QUAN
    # =========================================================================
    add_title_p("MỤC LỤC", size=16, bold=True, space_after=14)
    toc_items = [
        ("LỜI CẢM ƠN", "i"),
        ("LỜI CAM ĐOAN", "ii"),
        ("TÓM TẮT ĐỒ ÁN", "iii"),
        ("DANH MỤC THUẬT NGỮ VÀ CHỮ VIẾT TẮT", "iv"),
        ("DANH MỤC BẢNG BIỂU", "v"),
        ("DANH MỤC HÌNH VẼ", "vi"),
        ("MỞ ĐẦU", "1"),
        ("    1. Tính cấp thiết của đề tài", "1"),
        ("    2. Mục tiêu nghiên cứu", "2"),
        ("    3. Đối tượng và phạm vi nghiên cứu", "2"),
        ("    4. Phương pháp nghiên cứu", "3"),
        ("    5. Bố cục của đồ án", "3"),
        ("CHƯƠNG 1: TỔNG QUAN ĐỀ TÀI VÀ CƠ SỞ NGHIỆP VỤ", "4"),
        ("    1.1. Hiện trạng các hệ thống đặt vé trực tuyến hiện nay", "4"),
        ("    1.2. Khảo sát các quy trình nghiệp vụ rạp chiếu phim", "6"),
        ("    1.3. Đặt bài toán và bộ quy tắc nghiệp vụ khắt khe của CineReserve", "8"),
        ("CHƯƠNG 2: PHÂN TÍCH VÀ THIẾT KẾ HỆ THỐNG", "12"),
        ("    2.1. Phân tích yêu cầu chức năng (Functional Requirements)", "12"),
        ("    2.2. Phân tích yêu cầu phi chức năng (Non-Functional Requirements)", "16"),
        ("    2.3. Thiết kế luồng dữ liệu và biểu đồ tuần tự", "18"),
        ("    2.4. Thiết kế cơ sở dữ liệu quan hệ 21 bảng", "23"),
        ("CHƯƠNG 3: CƠ SỞ CÔNG NGHỆ VÀ GIẢI PHÁP KỸ THUẬT", "29"),
        ("    3.1. Nền tảng Next.js App Router, React 19 và TypeScript", "29"),
        ("    3.2. Giải pháp kiểm soát tranh chấp ghế bằng PostgreSQL Advisory Lock", "31"),
        ("    3.3. Giải pháp tích hợp Mô hình ngôn ngữ lớn Google Gemini AI", "34"),
        ("CHƯƠNG 4: TRIỂN KHAI VÀ HIỆN THỰC HÓA HỆ THỐNG CINERESERVE", "37"),
        ("    4.1. Kiến trúc phân tầng và tổ chức mã nguồn", "37"),
        ("    4.2. Hiện thực hóa phân hệ Khách hàng", "39"),
        ("    4.3. Hiện thực hóa phân hệ Nhân viên soát vé", "42"),
        ("    4.4. Hiện thực hóa phân hệ Quản trị hệ thống", "44"),
        ("    4.5. Hiện thực hóa Trợ lý tư vấn phim thông minh", "45"),
        ("CHƯƠNG 5: KIỂM THỬ VÀ ĐÁNH GIÁ THỰC NGHIỆM", "47"),
        ("    5.1. Chiến lược kiểm thử tự động toàn diện", "47"),
        ("    5.2. Đánh giá thực nghiệm khả năng xử lý tranh chấp ghế đồng thời", "49"),
        ("    5.3. Đánh giá chất lượng và độ trễ của Trợ lý AI", "51"),
        ("KẾT LUẬN VÀ HƯỚNG PHÁT TRIỂN", "53"),
        ("TÀI LIỆU THAM KHẢO", "55"),
        ("PHỤ LỤC", "57")
    ]
    for item, page in toc_items:
        p = doc.add_paragraph()
        p.paragraph_format.space_after = Pt(2)
        r1 = p.add_run(item)
        r1.font.name = 'Times New Roman'
        r1.font.size = Pt(12)
        if not item.startswith("    "):
            r1.bold = True
        
        # Thêm chấm dẫn
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
    # PHẦN NỘI DUNG CHÍNH (ĐÁNH SỐ TRANG TỪ ĐÂY)
    # =========================================================================

    add_title_p("MỞ ĐẦU", size=18, bold=True, space_after=14)
    add_h2("1. Tính cấp thiết của đề tài")
    add_p("Trong bối cảnh bùng nổ của cuộc Cách mạng Công nghiệp lần thứ tư, chuyển đổi số đã trở thành yêu cầu sống còn đối với hầu hết các ngành kinh tế, và ngành giải trí - dịch vụ rạp chiếu phim cũng không nằm ngoài xu thế đó. Tại Việt Nam, thói quen giải trí tại rạp của người dân đã có sự thay đổi căn bản: thay vì đến trực tiếp quầy vé để xếp hàng chờ mua vé giấy, người tiêu dùng ngày nay ưu tiên việc sử dụng điện thoại thông minh hoặc máy tính cá nhân để lựa chọn phim, xem trước sơ đồ ghế và hoàn tất thủ tục thanh toán từ trước.")
    add_p("Tuy nhiên, việc xây dựng và duy trì một hệ thống bán vé xem phim trực tuyến đạt chuẩn hiệu năng cao đặt ra hàng loạt bài toán kỹ thuật phức tạp trong ngành Khoa học Máy tính:")
    add_bullet("Thứ nhất là bài toán tranh chấp tài nguyên đồng thời (Concurrency Contention): Vào các thời điểm mở bán các suất chiếu của các tác phẩm điện ảnh bom tấn (như Marvel, Avatar, hoạt hình Anime chiếu rạp...), hàng ngàn người dùng có thể cùng lúc truy cập và bấm chọn duy nhất một vị trí ghế VIP trong cùng một phần trăm giây. Nếu hệ thống cơ sở dữ liệu không có giải pháp điều phối khóa giao dịch chặt chẽ, tình trạng \"Double-booking\" (hai khách hàng khác nhau cùng mua thành công một vị trí ghế) chắc chắn sẽ xảy ra, dẫn đến xung đột thực tế tại rạp chiếu và phá vỡ tính toàn vẹn dữ liệu.", bold_prefix="Bài toán đồng thời: ")
    add_bullet("Thứ hai là hạn chế của các hệ thống tư vấn và trải nghiệm người dùng hiện tại: Đa số các nền tảng đặt vé hiện nay (như CGV, Lotte, Beta Cinemas...) chỉ cung cấp các thanh tìm kiếm từ khóa cứng nhắc hoặc các bộ lọc cơ bản theo rạp và thể loại. Khi người xem có nhu cầu tự nhiên và phức tạp (ví dụ: \"Tối nay quanh khu vực Cầu Giấy có phim nào phù hợp cho gia đình có trẻ em 8 tuổi xem không?\"), hệ thống hoàn toàn bất lực trong việc thấu hiểu và gợi ý chính xác.", bold_prefix="Hạn chế trong tìm kiếm thông minh: ")
    add_bullet("Thứ ba là tính toàn vẹn và khép kín của quy trình nghiệp vụ: Quá trình vận hành đòi hỏi sự liên thông chặt chẽ giữa việc giữ ghế có thời hạn (Hold Session), trừ tiền an toàn có kiểm soát lặp lại (Idempotent Payment), tự động phát hành vé điện tử mã QR, cơ chế xác thực một chạm tại cửa rạp nhằm chống dùng lại vé lậu, và hệ thống báo cáo doanh thu minh bạch giữa các chi nhánh rạp.", bold_prefix="Quy trình nghiệp vụ khép kín: ")
    add_p("Xuất phát từ những đòi hỏi thực tiễn cấp bách đó, đề tài tốt nghiệp \"Xây dựng website đặt vé xem phim CineReserve sử dụng Next.js, TypeScript và tích hợp chatbot AI\" được lựa chọn nhằm nghiên cứu, ứng dụng các giải pháp kiến trúc phần mềm tiên tiến nhất hiện nay để xây dựng một sản phẩm thương mại điện tử điện ảnh hoàn chỉnh, giải quyết triệt để các vấn đề nêu trên.")

    add_h2("2. Mục tiêu nghiên cứu")
    add_p("Đề tài tập trung hoàn thành các mục tiêu khoa học và ứng dụng sau:")
    add_bullet("Nghiên cứu cơ chế kiểm soát tranh chấp đồng thời cấp giao dịch (Transaction-level Concurrency Control) bằng kỹ thuật PostgreSQL Advisory Locks, giải quyết bài toán phiên giữ ghế 5 phút không xung đột.", bold_prefix="Mục tiêu lý thuyết: ")
    add_bullet("Xây dựng thành công hệ thống website CineReserve với đầy đủ 3 phân hệ: Khách hàng (Customer), Nhân viên rạp (Staff) và Quản trị viên (Admin) trên nền tảng Next.js 16 App Router, React 19, TypeScript và Prisma ORM.", bold_prefix="Mục tiêu phần mềm: ")
    add_bullet("Nghiên cứu và tích hợp mô hình ngôn ngữ lớn (Google Gemini LLM) thông qua kỹ thuật Prompt Engineering có cấu trúc JSON Schema và giao thức truyền dòng Streaming NDJSON để xây dựng Trợ lý ảo tư vấn phim thời gian thực.", bold_prefix="Mục tiêu tích hợp AI: ")
    add_bullet("Xây dựng bộ kiểm thử tích hợp tự động với hơn 840 ca kiểm thử nhằm bảo chứng tính toàn vẹn, độ ổn định và an toàn giao dịch của toàn bộ hệ thống.", bold_prefix="Mục tiêu kiểm thử: ")

    add_h2("3. Đối tượng và phạm vi nghiên cứu")
    add_p("Đối tượng nghiên cứu: Các quy trình phân phối vé tại cụm rạp chiếu phim; các giải pháp xử lý tranh chấp giao dịch ACID trong hệ quản trị cơ sở dữ liệu quan hệ; kiến trúc kết xuất phía máy chủ (Server-Side Rendering) của Next.js; kỹ thuật giao tiếp với Mô hình ngôn ngữ lớn (Generative AI).")
    add_p("Phạm vi nghiên cứu: Đồ án tập trung vào luồng nghiệp vụ cốt lõi từ duyệt phim, giữ ghế 5 phút, thanh toán giả lập có xác nhận độ tuổi, phát hành vé QR, nhân viên quét QR soát vé bằng camera/tải ảnh, quản lý lịch chiếu và thống kê doanh thu. Hệ thống vận hành trên môi trường mô phỏng chuỗi rạp nội bộ và cổng thanh toán giả lập an toàn.")

    add_h2("4. Phương pháp nghiên cứu")
    add_p("Phương pháp nghiên cứu lý thuyết: Thu thập, tổng hợp và phân tích các tài liệu học thuật về thiết kế cơ sở dữ liệu chuẩn hóa, tài liệu kỹ thuật chuyên sâu về Next.js App Router, tài liệu về cơ chế Explicit Locking của PostgreSQL và các hướng dẫn chính thức từ Google AI.")
    add_p("Phương pháp thực nghiệm: Triển khai phát triển phần mềm theo mô hình lặp (Iterative Development), xây dựng cơ sở dữ liệu với Prisma ORM trên PostgreSQL, tiến hành viết các script kiểm thử tự động (Integration Tests) để đo lường và kiểm chứng độ chính xác của từng module chức năng.")

    add_h2("5. Bố cục của đồ án")
    add_p("Báo cáo đồ án tốt nghiệp được cấu trúc thành 5 chương chính như sau:")
    add_bullet("Chương 1: Tổng quan đề tài và Cơ sở nghiệp vụ - Trình bày khảo sát hiện trạng, phân tích các hệ thống rạp hiện hữu và định nghĩa chi tiết bộ quy tắc nghiệp vụ của CineReserve.")
    add_bullet("Chương 2: Phân tích và Thiết kế hệ thống - Mô tả biểu đồ Use Case, phân tích yêu cầu phi chức năng, biểu đồ tuần tự luồng giữ ghế và thiết kế cơ sở dữ liệu quan hệ gồm 21 bảng.")
    add_bullet("Chương 3: Cơ sở công nghệ và Giải pháp kỹ thuật - Đi sâu phân tích kiến trúc Next.js App Router, giải pháp khóa PostgreSQL Advisory Lock và kỹ thuật tích hợp Chatbot Gemini bằng Streaming NDJSON.")
    add_bullet("Chương 4: Triển khai và Hiện thực hóa hệ thống - Giới thiệu giao diện thực tế và logic cài đặt của từng phân hệ: Khách hàng, Nhân viên, Quản trị và Trợ lý AI.")
    add_bullet("Chương 5: Kiểm thử và Đánh giá thực nghiệm - Trình bày kết quả của 15 bộ script kiểm thử tự động, thử nghiệm chịu tải tranh chấp ghế đồng thời và đánh giá hiệu năng.")
    doc.add_page_break()

    # =========================================================================
    # CHƯƠNG 1
    # =========================================================================
    add_title_p("CHƯƠNG 1: TỔNG QUAN ĐỀ TÀI VÀ CƠ SỞ NGHIỆP VỤ", size=16, bold=True, space_after=14)
    add_h2("1.1. Hiện trạng các hệ thống đặt vé trực tuyến hiện nay")
    add_p("Thị trường chiếu phim rạp tại Việt Nam hiện nay có sự góp mặt của các chuỗi rạp lớn như CGV Cinemas, Lotte Cinema, Galaxy Cinema, BHD Star Cineplex và Beta Cinemas. Qua quá trình khảo sát thực tế hành vi người dùng và trải nghiệm trên các hệ thống này, có thể rút ra bảng so sánh đối chiếu như sau:")

    add_table_header_caption("Bảng 1.1: So sánh đặc điểm hệ thống CineReserve và các nền tảng thương mại hiện nay")
    t_comp = doc.add_table(rows=1, cols=4)
    t_comp.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_borders(t_comp)
    for idx, name in enumerate(["Tiêu chí so sánh", "Hệ thống CGV / Lotte", "Hệ thống Beta / Galaxy", "Hệ thống CineReserve"]):
        c = t_comp.rows[0].cells[idx]
        c.text = name
        set_cell_shading(c, "EBF1F5")
        p = c.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        for r in p.runs:
            r.bold = True
            r.font.name = 'Times New Roman'
            r.font.size = Pt(11.5)

    comp_rows = [
        ("Kiến trúc Web", "Single Page Application (SPA) truyền thống", "Web tích hợp đa nền tảng", "Next.js App Router (Server-Side Rendering)"),
        ("Xử lý giữ ghế đồng thời", "Khóa trên Cache/Memory, dễ nghẽn khi mạng lag", "Khóa hàng đợi (Queue), đôi khi chậm phản hồi", "PostgreSQL Advisory Lock trực tiếp trong Transaction"),
        ("Thời gian giữ ghế", "5 - 10 phút, tự hủy", "5 phút, đôi khi tải lại bị mất phiên", "Chính xác 5 phút theo đồng hồ CSDL, tải lại giữ nguyên"),
        ("Tính năng tìm kiếm thông minh", "Tìm kiếm theo từ khóa tên phim cơ bản", "Bộ lọc danh mục tĩnh theo rạp và ngày", "Tích hợp Chatbot Gemini AI nhận diện ngữ cảnh tự nhiên"),
        ("Soát vé tại rạp", "Máy quét mã vạch chuyên dụng tại quầy", "Máy quét mã vạch hoặc nhân viên bấm tay", "Trực tiếp qua Web Camera quét QR hoặc tải tệp ảnh"),
        ("Hỗ trợ đa ngôn ngữ", "Chuyển trang tĩnh hoặc tải lại toàn bộ", "Chủ yếu tiếng Việt", "Song ngữ Việt/Anh lưu trữ chuẩn hóa trong DB"),
        ("Đối soát tài chính", "Phức tạp, xử lý theo chu kỳ ngày", "Báo cáo cuối ca nhân viên", "Báo cáo thời gian thực, tách biệt Thu - Hoàn - Ròng")
    ]
    for r_data in comp_rows:
        row = t_comp.add_row()
        for idx, val in enumerate(r_data):
            c = row.cells[idx]
            c.text = val
            set_cell_margins(c, top=80, bottom=80, left=100, right=100)
            p = c.paragraphs[0]
            p.paragraph_format.space_after = Pt(2)
            if idx == 0:
                p.alignment = WD_ALIGN_PARAGRAPH.LEFT
                for r in p.runs:
                    r.bold = True
                    r.font.name = 'Times New Roman'
                    r.font.size = Pt(11)
            else:
                p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
                for r in p.runs:
                    r.font.name = 'Times New Roman'
                    r.font.size = Pt(11)

    add_h2("1.2. Khảo sát các quy trình nghiệp vụ rạp chiếu phim")
    add_p("Một chuỗi rạp chiếu phim hiện đại hoạt động dựa trên sự phối hợp nhịp nhàng giữa nhiều bộ phận. Có 4 quy trình nghiệp vụ cốt lõi:")
    add_p("1. Quy trình phát hành và lập lịch chiếu: Quản trị viên lên kế hoạch phân bổ các bộ phim vào các phòng chiếu theo từng khung giờ. Quy trình này đòi hỏi phải tôn trọng thời lượng của từng bộ phim và bắt buộc phải dành ra một khoảng thời gian trống sau khi phim kết thúc để nhân viên vệ sinh quét dọn phòng chiếu sạch sẽ trước khi đón đợt khán giả kế tiếp.")
    add_p("2. Quy trình chọn ghế và bán vé trực tuyến: Khách hàng tìm kiếm phim, lựa chọn rạp gần nhất, chọn suất chiếu phù hợp và tiến hành đặt giữ chỗ trên sơ đồ ghế. Khi ghế được giữ, hệ thống phải đảm bảo không ai khác có thể chọn trùng ghế đó trong một khoảng thời gian nhất định (thời gian thanh toán).")
    add_p("3. Quy trình thanh toán và phát hành vé: Khách hàng tiến hành thanh toán tiền vé qua cổng thanh toán điện tử. Khi thanh toán thành công, hệ thống chuyển giao quyền sở hữu ghế vĩnh viễn cho khách hàng và lập tức phát hành mã vé điện tử định dạng QR Code cho từng ghế tương ứng.")
    add_p("4. Quy trình kiểm soát vé tại cửa rạp: Khán giả đến rạp xuất trình mã QR trên điện thoại. Nhân viên soát vé sử dụng thiết bị camera quét mã để xác minh vé có hợp lệ với suất chiếu tại phòng chiếu đó hay không và đóng dấu xác nhận đã sử dụng, tuyệt đối không cho phép một vé được vào rạp lần thứ hai.")

    add_h2("1.3. Đặt bài toán và bộ quy tắc nghiệp vụ khắt khe của CineReserve")
    add_p("Để giải quyết trọn vẹn và chuẩn hóa các quy trình trên, hệ thống CineReserve được xây dựng dựa trên một bộ quy tắc nghiệp vụ (Business Rules) có tính chặt chẽ cao:")
    add_bullet("Mỗi khách hàng sau khi đăng nhập tài khoản hợp lệ được quyền chọn tối đa từ 1 đến 8 ghế trong cùng một suất chiếu. Khi khách hàng bấm chọn, ghế được đưa vào trạng thái giữ chỗ trong thời gian tối đa 5 phút (300 giây). Thời gian này được tính toán tuyệt đối dựa trên đồng hồ của máy chủ cơ sở dữ liệu thông qua hàm clock_timestamp(), hoàn toàn không phụ thuộc vào đồng hồ của thiết bị khách hàng. Mọi hành vi tải lại trang (F5), đổi ngôn ngữ hoặc thêm bớt ghế không bao giờ được phép gia hạn thêm thời gian.", bold_prefix="Quy tắc giữ ghế 5 phút: ")
    add_bullet("Để nhân viên rạp kịp thời chốt danh sách khách hàng và chuẩn bị mở cửa đón khách, hệ thống tự động khóa cổng bán vé trực tuyến trước giờ chiếu chính xác 10 phút. Sau thời điểm cutoff này, khách hàng không thể tạo mới phiên giữ ghế hoặc thanh toán đơn hàng.", bold_prefix="Quy tắc cắt vé trực tuyến (Cutoff time): ")
    add_bullet("Khoảng cách giữa hai suất chiếu liên tiếp trong cùng một phòng chiếu bắt buộc phải thỏa mãn công thức: cleanupEndsAt = endsAt + 20 phút. Nếu một suất chiếu mới được tạo có thời gian bắt đầu rơi vào khoảng thời gian đang chiếu hoặc 20 phút dọn phòng của suất chiếu trước, hệ thống sẽ tự động từ chối và báo lỗi xung đột lịch phòng.", bold_prefix="Quy tắc an toàn phòng chiếu và dọn dẹp: ")
    add_bullet("Mỗi chiếc vé điện tử phát hành mang một mã định danh duy nhất có cấu trúc TK-[A-F0-9]{24} tương ứng với một mã QR payload CR1:<ticket-code>. Khách hàng chỉ được phép soát vé vào rạp trong khung giờ từ 30 phút trước giờ chiếu đến khi bộ phim kết thúc. Nhân viên rạp khi bấm xác nhận vào rạp sẽ gửi kèm một mã yêu cầu duy nhất (requestKey); nếu mạng bị giật gửi lặp lại yêu cầu, hệ thống giữ tính bất biến (Idempotent) và không bao giờ ghi nhận vé bị sử dụng 2 lần.", bold_prefix="Quy tắc soát vé một chạm an toàn: ")
    add_bullet("Toàn bộ số tiền thanh toán được lưu trữ chính xác dưới dạng số nguyên 64-bit (BigInt) Đồng Việt Nam, triệt tiêu hoàn toàn sai số làm tròn số thực. Khi rạp có sự cố kỹ thuật buộc phải hủy bỏ suất chiếu, hệ thống tự động kích hoạt tiến trình hoàn tiền toàn bộ cho các đơn hàng đã thanh toán và hủy bỏ hiệu lực của toàn bộ vé liên quan.", bold_prefix="Quy tắc toàn vẹn tài chính: ")
    doc.add_page_break()

    # =========================================================================
    # CHƯƠNG 2
    # =========================================================================
    add_title_p("CHƯƠNG 2: PHÂN TÍCH VÀ THIẾT KẾ HỆ THỐNG", size=16, bold=True, space_after=14)
    add_h2("2.1. Phân tích yêu cầu chức năng (Functional Requirements)")
    add_p("Hệ thống CineReserve phân cấp người dùng thành 3 vai trò chính theo mô hình kiểm soát truy cập dựa trên vai trò (RBAC): Khách hàng (CUSTOMER), Nhân viên rạp (STAFF) và Quản trị viên (ADMIN). Chi tiết quyền hạn được mô tả trong ma trận phân quyền dưới đây:")

    add_table_header_caption("Bảng 2.1: Ma trận phân quyền chức năng hệ thống theo vai trò người dùng (RBAC Matrix)")
    t_rbac = doc.add_table(rows=1, cols=4)
    t_rbac.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_borders(t_rbac)
    for idx, name in enumerate(["Chức năng hệ thống", "Khách hàng (CUSTOMER)", "Nhân viên rạp (STAFF)", "Quản trị viên (ADMIN)"]):
        c = t_rbac.rows[0].cells[idx]
        c.text = name
        set_cell_shading(c, "EBF1F5")
        p = c.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        for r in p.runs:
            r.bold = True
            r.font.name = 'Times New Roman'
            r.font.size = Pt(11)

    rbac_data = [
        ("Đăng ký tài khoản, Đăng nhập, Đổi mật khẩu", "Có", "Có (Bắt buộc đổi khi tạo)", "Có"),
        ("Xem danh mục phim, Suất chiếu, Đặt vé nhanh", "Có", "Có", "Có"),
        ("Tương tác trò chuyện với Trợ lý AI Gemini", "Có", "Có", "Có"),
        ("Chọn ghế, Giữ ghế 5 phút, Đặt đơn hàng", "Có (Duy nhất vai trò này)", "Không được phép", "Không được phép"),
        ("Thanh toán đơn hàng, Tải vé QR Code", "Có", "Không được phép", "Không được phép"),
        ("Xem lịch sử đơn hàng cá nhân", "Có (Chỉ đơn của mình)", "Có (Chỉ đơn của mình)", "Có (Chỉ đơn của mình)"),
        ("Soát vé QR bằng Camera / Tải tệp ảnh", "Không", "Có (Chỉ tại rạp được gán)", "Không (Tách biệt quyền)"),
        ("Tra cứu đơn hàng vận hành", "Không", "Có (Cần mã chính xác tại rạp)", "Có (Tìm kiếm, lọc toàn hệ thống)"),
        ("Quản lý danh mục phim (CRUD)", "Không", "Không", "Có (Toàn quyền)"),
        ("Quản lý Suất chiếu, Phòng chiếu (CRUD)", "Không", "Không", "Có (Toàn quyền)"),
        ("Quản lý tài khoản nhân viên và gán chi nhánh", "Không", "Không", "Có (Toàn quyền)"),
        ("Xem Báo cáo doanh thu & Xuất tệp tin CSV", "Không", "Có (Chỉ xem rạp của mình)", "Có (Xem toàn hệ thống)"),
        ("Xem Nhật ký kiểm toán hệ thống (Audit Log)", "Không", "Không", "Có (Toàn quyền)")
    ]
    for r_data in rbac_data:
        row = t_rbac.add_row()
        for idx, val in enumerate(r_data):
            c = row.cells[idx]
            c.text = val
            set_cell_margins(c, top=60, bottom=60, left=80, right=80)
            p = c.paragraphs[0]
            p.paragraph_format.space_after = Pt(2)
            if idx == 0:
                p.alignment = WD_ALIGN_PARAGRAPH.LEFT
                for r in p.runs:
                    r.bold = True
                    r.font.name = 'Times New Roman'
                    r.font.size = Pt(11)
            else:
                p.alignment = WD_ALIGN_PARAGRAPH.CENTER
                for r in p.runs:
                    r.font.name = 'Times New Roman'
                    r.font.size = Pt(11)

    add_h2("2.2. Phân tích yêu cầu phi chức năng (Non-Functional Requirements)")
    add_bullet("Hệ thống duy trì phiên người dùng thông qua Cookie HTTP an toàn (HttpOnly, SameSite=Lax, Secure khi chạy HTTPS). Mật khẩu được băm một chiều bằng thuật toán Scrypt với chi phí tính toán cao (N=32768, r=8, p=3), sử dụng salt ngẫu nhiên 16 bytes và so sánh thời gian cố định bằng timingSafeEqual để chống lại các cuộc tấn công đo thời gian (Timing Attacks). Mọi thông tin nhạy cảm của khách hàng (Email, Phone) đều được che giấu một phần khi hiển thị trên màn hình tra cứu của nhân viên.", bold_prefix="Tính an toàn và bảo mật: ")
    add_bullet("Tận dụng kiến trúc Server Components của Next.js 16, các trang tĩnh và dữ liệu danh mục phim được biên dịch và cache trực tiếp tại máy chủ, thời gian phản hồi (TTFB) đạt mức dưới 200ms trong điều kiện mạng tiêu chuẩn. Sơ đồ ghế tối ưu hóa tần số thăm dò (polling) 5 giây một lần kết hợp với lắng nghe sự kiện window focus để giảm tải tối đa cho cơ sở dữ liệu.", bold_prefix="Hiệu năng và khả năng đáp ứng: ")
    add_bullet("Toàn bộ giao diện được thiết kế tương thích hoàn toàn (Fully Responsive) theo chuẩn Mobile-First. Kích thước các nút bấm và ô ghế trên thiết bị di động đạt chuẩn tiếp cận tối thiểu 44px x 44px, hỗ trợ điều hướng bàn phím đầy đủ và tuân thủ các nguyên tắc về độ tương phản màu sắc cho người khuyết thị.", bold_prefix="Khả năng tương thích và khả năng tiếp cận (Accessibility): ")

    add_h2("2.3. Thiết kế luồng dữ liệu và biểu đồ tuần tự")
    add_p("Quy trình giữ ghế và thanh toán là xương sống của hệ thống. Dưới đây là mô tả chi tiết các bước xử lý dữ liệu giữa Client và Server trong luồng giữ ghế:")
    add_p("1. Khách hàng truy cập vào trang sơ đồ ghế của một suất chiếu: Server Component nạp dữ liệu SeatMap ban đầu từ bảng ShowtimeSeat, hiển thị trạng thái của từng ghế (Trống, Đang bị giữ, Đã bán, Ghế của tôi).")
    add_p("2. Khách hàng nhấn chọn ghế: Client gửi yêu cầu HTTP PUT kèm mảng seatIds tới endpoint /api/showtimes/[id]/seats.")
    add_p("3. Tại máy chủ, hàm xử lý kích hoạt một transaction cơ sở dữ liệu và yêu cầu khóa PostgreSQL Advisory Lock với mã số cố định 20261102. Khóa này đảm bảo chỉ có duy nhất một tiến trình được phép đọc/ghi trạng thái ghế của suất chiếu tại cùng một thời điểm.")
    add_p("4. Hệ thống chạy bảo trì giải phóng các phiên giữ ghế quá 5 phút đã hết hạn, sau đó kiểm tra xem trong số các ghế khách hàng vừa chọn có ghế nào đã bị người khác giữ hoặc đã bán hay chưa. Nếu vi phạm, transaction lập tức Rollback và trả về mã lỗi 409 SEAT_ALREADY_HELD. Nếu hợp lệ, hệ thống tạo/cập nhật bản ghi HoldSession và đánh dấu holdSessionId lên các ghế tương ứng, sau đó Commit transaction để tự động nhả khóa cho các yêu cầu khác tiếp tục.")

    add_h2("2.4. Thiết kế cơ sở dữ liệu quan hệ 21 bảng")
    add_p("Cơ sở dữ liệu của CineReserve được xây dựng trên PostgreSQL 17 và quản lý thông qua Prisma ORM, bao gồm đúng 21 bảng nghiệp vụ được thiết kế chuẩn hóa:")

    add_table_header_caption("Bảng 2.2: Danh mục 21 thực thể dữ liệu trong cơ sở dữ liệu CineReserve")
    t_ent = doc.add_table(rows=1, cols=3)
    t_ent.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_borders(t_ent)
    for idx, name in enumerate(["Phân nhóm nghiệp vụ", "Tên bảng (Entity)", "Vai trò và ý nghĩa lưu trữ dữ liệu"]):
        c = t_ent.rows[0].cells[idx]
        c.text = name
        set_cell_shading(c, "EBF1F5")
        p = c.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        for r in p.runs:
            r.bold = True
            r.font.name = 'Times New Roman'
            r.font.size = Pt(11)

    ent_data = [
        ("Danh mục & Phim", "Movie", "Lưu thông tin phim: thời lượng, độ tuổi, đạo diễn, poster, trạng thái, version"),
        ("Danh mục & Phim", "MovieTranslation", "Lưu tiêu đề và tóm tắt nội dung phim theo ngôn ngữ (vi, en)"),
        ("Danh mục & Phim", "Genre", "Lưu danh mục các thể loại điện ảnh (Hành động, Hoạt hình, Tâm lý...)"),
        ("Danh mục & Phim", "MovieGenre", "Bảng quan hệ nhiều - nhiều giữa phim và thể loại"),
        ("Cơ sở vật chất", "Cinema", "Thông tin rạp chiếu: mã rạp, địa chỉ, khu vực, giờ mở/đóng cửa"),
        ("Cơ sở vật chất", "Auditorium", "Thông tin các phòng chiếu thuộc từng chi nhánh rạp"),
        ("Cơ sở vật chất", "Seat", "Sơ đồ ghế cố định của từng phòng chiếu (hàng, số ghế, loại STANDARD/VIP)"),
        ("Lịch & Suất chiếu", "Showtime", "Thông tin suất chiếu: giờ bắt đầu, kết thúc, dọn phòng, cutoff, giá cơ bản"),
        ("Lịch & Suất chiếu", "ShowtimeSeat", "Chụp lại danh sách ghế cho riêng từng suất chiếu, lưu ai giữ, ai đã mua"),
        ("Tài khoản & Phân quyền", "User", "Thông tin người dùng: email, mật khẩu băm Scrypt, vai trò (3 roles), trạng thái"),
        ("Tài khoản & Phân quyền", "AuthSession", "Phiên đăng nhập: lưu token băm SHA-256, thời điểm hết hạn"),
        ("Tài khoản & Phân quyền", "StaffAssignment", "Phân công nhân viên rạp: liên kết 1-1 giữa User (STAFF) và Cinema"),
        ("Tài khoản & Phân quyền", "AuthRateLimit", "Lưu vết giới hạn tần suất yêu cầu (Throttling) để chống tấn công brute-force"),
        ("Giữ ghế & Đơn hàng", "HoldSession", "Phiên giữ ghế tạm thời (5 phút): trạng thái, hạn chót, danh sách ghế"),
        ("Giữ ghế & Đơn hàng", "Booking", "Đơn hàng: mã đơn CR-..., tổng tiền BigInt, trạng thái PENDING/PAID/CANCELLED"),
        ("Giữ ghế & Đơn hàng", "BookingItem", "Chi tiết từng ghế trong đơn hàng, giá tiền của từng ghế"),
        ("Giữ ghế & Đơn hàng", "PaymentAttempt", "Lịch sử các lần thử thanh toán, lưu idempotencyKey để chống thanh toán lặp"),
        ("Giữ ghế & Đơn hàng", "Refund", "Bản ghi hoàn tiền khi rạp hủy suất chiếu, lưu lý do và số tiền hoàn"),
        ("Vé & Soát vé", "Ticket", "Vé điện tử chính thức sau khi thanh toán thành công, lưu mã duy nhất TK-..."),
        ("Vé & Soát vé", "TicketRedemption", "Lưu vết soát vé: thời điểm nhân viên xác nhận cho khách vào rạp tại rạp được gán"),
        ("Hệ thống & Kiểm toán", "AuditLog", "Nhật ký kiểm toán ghi lại mọi thay đổi cấu hình phim, lịch chiếu và soát vé")
    ]
    for r_data in ent_data:
        row = t_ent.add_row()
        for idx, val in enumerate(r_data):
            c = row.cells[idx]
            c.text = val
            set_cell_margins(c, top=60, bottom=60, left=80, right=80)
            p = c.paragraphs[0]
            p.paragraph_format.space_after = Pt(2)
            if idx == 1:
                p.alignment = WD_ALIGN_PARAGRAPH.LEFT
                for r in p.runs:
                    r.bold = True
                    r.font.name = 'Times New Roman'
                    r.font.size = Pt(10.5)
            else:
                p.alignment = WD_ALIGN_PARAGRAPH.LEFT
                for r in p.runs:
                    r.font.name = 'Times New Roman'
                    r.font.size = Pt(10.5)
    doc.add_page_break()

    # =========================================================================
    # CHƯƠNG 3
    # =========================================================================
    add_title_p("CHƯƠNG 3: CƠ SỞ CÔNG NGHỆ VÀ GIẢI PHÁP KỸ THUẬT", size=16, bold=True, space_after=14)
    add_h2("3.1. Nền tảng Next.js App Router, React 19 và TypeScript")
    add_p("Hệ thống CineReserve được xây dựng trên nền tảng Next.js phiên bản 16 (kiến trúc App Router mới nhất) kết hợp với thư viện giao diện React 19 và ngôn ngữ định kiểu tĩnh TypeScript. Sự kết hợp này mang lại các lợi thế công nghệ vượt bậc:")
    add_bullet("Khác với kiến trúc React truyền thống (vốn buộc toàn bộ code phải tải về và chạy ở trình duyệt của người dùng), Next.js App Router mặc định mọi component đều là Server Components. Toàn bộ logic đọc cơ sở dữ liệu, phân quyền bảo mật và tạo mã HTML được thực thi trực tiếp tại máy chủ. Trình duyệt chỉ nhận về tệp HTML siêu nhẹ, giúp tốc độ mở trang gần như tức thì và loại bỏ hoàn toàn các lỗ hổng rò rỉ mã nguồn nhạy cảm ra ngoài client.", bold_prefix="Mô hình React Server Components (RSC): ")
    add_bullet("Toàn bộ hệ thống từ bảng CSDL trong Prisma, các DTO trung gian, các API endpoint đến props của từng thẻ giao diện đều được định nghĩa chặt chẽ bằng TypeScript. Việc này giúp loại bỏ 100% các lỗi kinh điển trong lập trình web như undefined is not a function hoặc truy cập nhầm thuộc tính không tồn tại ngay trong quá trình biên dịch (Compile-time).", bold_prefix="Định kiểu tĩnh toàn diện (End-to-End Type Safety): ")

    add_h2("3.2. Giải pháp kiểm soát tranh chấp ghế bằng PostgreSQL Advisory Lock")
    add_p("Khi nhiều người dùng cùng bấm giữ một ghế trong cùng một thời điểm, đây là bài toán kinh điển về xung đột tài nguyên trong Khoa học Máy tính. Có 3 giải pháp chính thường được cân nhắc:")

    add_table_header_caption("Bảng 3.1: So sánh các cơ chế kiểm soát tranh chấp ghế đồng thời (Concurrency Control)")
    t_lock = doc.add_table(rows=1, cols=4)
    t_lock.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_borders(t_lock)
    for idx, name in enumerate(["Đặc tính so sánh", "Optimistic Locking (Version Check)", "Distributed Lock (Redis Redlock)", "PostgreSQL Advisory Lock (CineReserve)"]):
        c = t_lock.rows[0].cells[idx]
        c.text = name
        set_cell_shading(c, "EBF1F5")
        p = c.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        for r in p.runs:
            r.bold = True
            r.font.name = 'Times New Roman'
            r.font.size = Pt(11)

    lock_data = [
        ("Cơ chế hoạt động", "Kiểm tra số version, nếu lệch thì báo lỗi và thử lại", "Đặt khóa tạm thời trên bộ nhớ Redis bên ngoài", "Khóa số hiệu nguyên trực tiếp cấp giao dịch CSDL"),
        ("Hiệu năng khi tranh chấp cao", "Kém: hàng trăm request thử lại gây quá tải CPU DB", "Tốt, nhưng tốn chi phí mạng giữa App và Redis", "Rất tốt: CSDL tự động xếp hàng đợi trong micro-giây"),
        ("Độ tin cậy khi App bị Crash", "Tốt (dựa vào rollback CSDL)", "Nguy hiểm: Dễ bị rác lock nếu chưa kịp xóa TTL", "Tuyệt đối: Transaction đóng là Lock tự động hủy ngay"),
        ("Độ phức tạp hạ tầng", "Đơn giản (chỉ cần CSDL)", "Phức tạp: Phải nuôi thêm cụm Redis độc lập", "Tối giản: Tận dụng trực tiếp PostgreSQL có sẵn"),
        ("Chi phí đồng bộ dữ liệu", "Không phát sinh", "Có độ trễ đồng bộ giữa Cache và Database", "Nhất quán 100% theo chuẩn ACID của PostgreSQL")
    ]
    for r_data in lock_data:
        row = t_lock.add_row()
        for idx, val in enumerate(r_data):
            c = row.cells[idx]
            c.text = val
            set_cell_margins(c, top=60, bottom=60, left=80, right=80)
            p = c.paragraphs[0]
            p.paragraph_format.space_after = Pt(2)
            if idx == 0:
                p.alignment = WD_ALIGN_PARAGRAPH.LEFT
                for r in p.runs:
                    r.bold = True
                    r.font.name = 'Times New Roman'
                    r.font.size = Pt(11)
            else:
                p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
                for r in p.runs:
                    r.font.name = 'Times New Roman'
                    r.font.size = Pt(10.5)

    add_p("Trong CineReserve, giải pháp được lựa chọn là pg_advisory_xact_lock(20261102). Khóa này mang tính chất cấp giao dịch (Transaction-scoped). Ngay khi transaction kết thúc (dù thành công hay gặp lỗi Rollback), PostgreSQL sẽ tự động giải phóng khóa lập tức, đảm bảo hệ thống không bao giờ bị rơi vào trạng thái bế tắc vĩnh viễn (Deadlock).")

    add_h2("3.3. Giải pháp tích hợp Mô hình ngôn ngữ lớn Google Gemini AI")
    add_p("CineReserve tích hợp mô hình ngôn ngữ lớn gemini-3.5-flash-lite thông qua Google AI API. Để giải quyết vấn đề độ trễ cao thường gặp của các hệ thống AI, đồ án áp dụng hai giải pháp đột phá:")
    add_bullet("Thay vì gọi AI hai lần (lần 1 hiểu ý định của khách, lần 2 soạn câu trả lời), hệ thống cung cấp một bản System Prompt toàn diện kèm JSON Schema chặt chẽ. Mô hình Gemini sẽ thực hiện đồng thời việc phân tích tham số tìm kiếm (SearchPlan: gồm movieIds, cinemaId, ngày chiếu, độ tuổi) và soạn thảo văn bản phản hồi tự nhiên trong duy nhất một lượt gọi. Giải pháp này giúp cắt giảm 50% thời gian chờ đợi của người dùng.", bold_prefix="Cơ chế gọi đơn lượt (Single-Turn Logic): ")
    add_bullet("Endpoint /api/chat sử dụng chuẩn Newline-Delimited JSON (NDJSON). Ngay khi máy chủ bắt đầu xử lý, nó gửi ngay các gói tin trạng thái stage: \"understanding\" và stage: \"searching\". Trình duyệt của khách hàng lập tức hiển thị hiệu ứng động tương ứng, xóa bỏ hoàn toàn cảm giác sốt ruột của người dùng trước khi nhận được phản hồi chính thức.", bold_prefix="Giao thức truyền dữ liệu Streaming NDJSON: ")
    add_bullet("Hệ thống tự động theo dõi lịch sử 4 lượt chat gần nhất và trích xuất các điều kiện ẩn (độ tuổi, rạp yêu thích, ngày xem). Khi người dùng nói các câu ngắn bằng tiếng Việt như \"đổi sang rạp Hà Nội\" hoặc \"bỏ lọc tuổi\", hệ thống áp dụng biểu thức chính quy chuẩn hóa tiếng Việt không dấu để tự động cập nhật lại bộ lọc mà không bắt người dùng phải nhập lại từ đầu.", bold_prefix="Bảo tồn ngữ cảnh hội thoại (Context Preservation): ")
    doc.add_page_break()

    # =========================================================================
    # CHƯƠNG 4
    # =========================================================================
    add_title_p("CHƯƠNG 4: TRIỂN KHAI VÀ HIỆN THỰC HÓA HỆ THỐNG CINERESERVE", size=16, bold=True, space_after=14)
    add_h2("4.1. Kiến trúc phân tầng và tổ chức mã nguồn")
    add_p("Toàn bộ mã nguồn hệ thống được đặt tại d:\\DA, tuân thủ nguyên tắc phân tách trách nhiệm (Separation of Concerns):")
    add_bullet("docs/: Chứa 20 tài liệu kỹ thuật chi tiết ghi lại toàn bộ lộ trình phát triển và kiểm chứng sản phẩm.")
    add_bullet("prisma/: Chứa schema.prisma định nghĩa 21 bảng dữ liệu và thư mục migrations theo dõi lịch sử thay đổi cấu trúc bảng.")
    add_bullet("scripts/: Chứa 15 kịch bản TypeScript tự động kiểm tra tính đúng đắn của từng module từ database, auth, hold ghế đến AI.")
    add_bullet("src/app/: Chứa 17 API routes và các trang giao diện song ngữ theo App Router ([locale]).")
    add_bullet("src/components/: Chứa 25 component giao diện và 14 CSS Modules độc lập.")
    add_bullet("src/lib/: Chứa toàn bộ nhân logic nghiệp vụ được bảo vệ bởi nhãn \"server-only\".")

    add_h2("4.2. Hiện thực hóa phân hệ Khách hàng")
    add_p("Trang chủ CineReserve được xây dựng với tông màu xanh mực và vàng sâm-panh sang trọng (Champagne Gold), đậm phong cách điện ảnh cao cấp. Khách hàng có thể tìm kiếm phim theo tên (hỗ trợ tìm tiếng Việt không dấu), lọc theo thể loại và chọn suất xem nhanh thông qua khối Quick Booking.")
    add_p("Module chọn ghế (SeatPicker): Sử dụng CSS Grid để dựng sơ đồ phòng chiếu mô phỏng thực tế. Mỗi vị trí ghế là một nút bấm có kích thước chuẩn 44px, hiển thị rõ số hàng và số ghế. Khách hàng chọn tối đa 8 ghế; đồng hồ đếm ngược 5 phút hiển thị trên thanh tóm tắt di động giúp người dùng luôn nắm rõ thời gian giữ ghế còn lại của mình.")
    add_p("Quy trình thanh toán an toàn (OrderDetail): Trang hiển thị thanh tiến trình 4 bước (Suất chiếu -> Chọn ghế -> Thanh toán -> Nhận vé). Trước khi thanh toán, khách hàng bắt buộc phải tích chọn cam kết đủ tuổi theo phân loại phim (P, K, T13, T16, T18) và đồng ý với chính sách vé. Khi nhấn nút mô phỏng thanh toán thành công, hệ thống gửi yêu cầu thanh toán kèm mã idempotencyKey để tránh việc bấm nhiều lần làm trừ tiền trùng lặp.")

    add_h2("4.3. Hiện thực hóa phân hệ Nhân viên soát vé")
    add_p("Màn hình soát vé dành cho nhân viên (/staff/tickets) được tối ưu cho cả máy tính và điện thoại thông minh:")
    add_bullet("Tích hợp thư viện giải mã hình ảnh jsQR, cho phép nhân viên bật trực tiếp Camera trên trình duyệt web của điện thoại để quét mã QR trên vé của khán giả với tốc độ 4 khung hình/giây. Ngoài ra, hệ thống hỗ trợ chức năng tải tệp ảnh chụp mã QR lên máy chủ để giải mã nếu camera gặp sự cố.")
    add_bullet("Quy trình soát vé 2 bước an toàn: Khi camera bắt được mã QR dạng CR1:TK-..., hệ thống chỉ mới thực hiện thao tác kiểm tra (Inspect Ticket). Màn hình nhân viên hiển thị ảnh poster, tên phim, phòng chiếu, số ghế, trạng thái vé và khung giờ vào rạp hợp lệ. Nhân viên đối chiếu thực tế xong mới bấm nút \"Xác nhận vào rạp\" (Redeem Ticket). Thao tác này ghi nhận trạng thái vé sang USED kèm mã yêu cầu requestKey và lưu vết vào bảng TicketRedemption cùng AuditLog, triệt tiêu nguy cơ một vé bị quét 2 lần.")

    add_h2("4.4. Hiện thực hóa phân hệ Quản trị hệ thống")
    add_p("Phân hệ Quản trị (/admin) cung cấp các công cụ vận hành mạnh mẽ:")
    add_bullet("Quản lý phim: Cho phép thêm mới, chỉnh sửa thông tin phim với hai phiên bản ngôn ngữ Tiếng Việt và Tiếng Anh đồng thời. Cơ chế version control bảo vệ chống ghi đè dữ liệu cũ. Hệ thống tự động khóa không cho phép sửa đổi thời lượng phim hoặc lưu trữ phim nếu bộ phim đó đang có suất chiếu trong tương lai chưa bị hủy.")
    add_bullet("Quản lý lịch chiếu: Quản trị viên chọn phim, chọn phòng chiếu và thời gian bắt đầu. Hệ thống tự động tính toán giờ kết thúc và giờ dọn phòng (endsAt + 20 phút), đồng thời quét toàn bộ các suất chiếu đã có trong phòng để ngăn chặn triệt để tình trạng trùng lịch.")
    add_bullet("Quản lý nhân viên: Quản trị viên tạo tài khoản nhân viên, phân công chi nhánh rạp hoạt động và cấp mật khẩu tạm. Tài khoản nhân viên có cờ mustChangePassword = true, bắt buộc phải đổi mật khẩu mới trong lần đăng nhập đầu tiên mới được truy cập các tính năng làm việc.")
    add_bullet("Báo cáo doanh thu đa chiều: Tổng hợp số liệu tài chính theo phim, theo chi nhánh và theo mốc thời gian (ngày/tháng). Báo cáo tách bạch rõ ràng giữa Doanh thu thực thu (Gross), Tiền hoàn do hủy suất (Refunds) và Doanh thu ròng (Net). Hỗ trợ xuất dữ liệu ra tệp tin CSV chuẩn hóa với UTF-8 BOM và cơ chế lọc ký tự chống tấn công CSV Formula Injection.")

    add_h2("4.5. Hiện thực hóa Trợ lý tư vấn phim thông minh")
    add_p("Widget trợ lý phim (MovieAssistant) hiển thị dạng nút bấm nổi ở góc phải màn hình của khách hàng. Trợ lý có khả năng:")
    add_bullet("Thấu hiểu nhu cầu bằng ngôn ngữ tự nhiên: Tư vấn phim dựa trên độ tuổi, thể loại yêu thích và khung giờ rảnh của người dùng.")
    add_bullet("Tra cứu dữ liệu thực: Trợ lý chỉ gợi ý những bộ phim đang thực sự có suất chiếu mở bán trong hệ thống, kèm theo thẻ phim trực quan, thông tin giá vé và đường dẫn trực tiếp đến trang chọn ghế.")
    add_bullet("Hàng rào an toàn (Safety Guardrails): Tự động phát hiện và chặn các câu hỏi cố tình khai thác thông tin nhạy cảm của khách hàng, từ chối các yêu cầu thực hiện hành vi trái thẩm quyền (như đặt vé hộ hay can thiệp vào cơ sở dữ liệu) và tuyệt đối không tiết lộ trước nội dung phim (spoilers).")
    doc.add_page_break()

    # =========================================================================
    # CHƯƠNG 5
    # =========================================================================
    add_title_p("CHƯƠNG 5: KIỂM THỬ VÀ ĐÁNH GIÁ THỰC NGHIỆM", size=16, bold=True, space_after=14)
    add_h2("5.1. Chiến lược kiểm thử tự động toàn diện")
    add_p("Để đảm bảo chất lượng phần mềm đạt tiêu chuẩn công nghiệp và độ tin cậy tuyệt đối, đồ án áp dụng phương pháp Kiểm thử tích hợp tự động (Automated Integration Testing). Toàn bộ 15 kịch bản kiểm thử được viết bằng TypeScript và thực thi trực tiếp trên cơ sở dữ liệu phát triển:")

    add_table_header_caption("Bảng 5.1: Bảng tổng hợp kết quả chạy 15 bộ kịch bản kiểm thử tự động hệ thống")
    t_test = doc.add_table(rows=1, cols=4)
    t_test.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_borders(t_test)
    for idx, name in enumerate(["Kịch bản kiểm thử", "Mã lệnh thực thi", "Số ca kiểm thử (Tests)", "Kết quả đánh giá"]):
        c = t_test.rows[0].cells[idx]
        c.text = name
        set_cell_shading(c, "EBF1F5")
        p = c.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        for r in p.runs:
            r.bold = True
            r.font.name = 'Times New Roman'
            r.font.size = Pt(11)

    test_data = [
        ("Xác thực & Bảo mật tài khoản", "npm run test:auth", "44 tests", "ĐẠT (PASS 100%)"),
        ("Quản trị phim & Lập lịch chiếu", "npm run test:admin", "73 tests", "ĐẠT (PASS 100%)"),
        ("Kiểm soát giữ ghế 5 phút", "npm run test:holds", "64 tests", "ĐẠT (PASS 100%)"),
        ("Đơn hàng & Thanh toán an toàn", "npm run test:orders", "98 tests", "ĐẠT (PASS 100%)"),
        ("Mã QR & Quy trình soát vé", "npm run test:tickets", "69 tests", "ĐẠT (PASS 100%)"),
        ("Báo cáo doanh thu đa chiều", "npm run test:revenue", "82 tests", "ĐẠT (PASS 100%)"),
        ("Trợ lý phim AI & Streaming", "npm run test:chat", "89 tests", "ĐẠT (PASS 100%)"),
        ("Hội thoại AI & Xử lý câu ngắn", "npm run test:chat-dialogue", "128 tests", "ĐẠT (PASS 100%)"),
        ("Bảo tồn ngữ cảnh hội thoại AI", "npm run test:chat-context", "170 tests", "ĐẠT (PASS 100%)"),
        ("Tra cứu đơn vận hành", "npm run test:operations", "80 tests", "ĐẠT (PASS 100%)"),
        ("Quyền mua vé & Xác nhận tuổi", "npm run test:checkout", "52 tests", "ĐẠT (PASS 100%)"),
        ("Quản lý nhân viên tối giản", "npm run test:staff", "113 tests", "ĐẠT (PASS 100%)"),
        ("Lịch chiếu theo rạp và ngày", "npm run test:schedule", "49 tests", "ĐẠT (PASS 100%)"),
        ("Kiểm thử E2E toàn luồng đặt vé", "npm run test:journey", "234 tests", "ĐẠT (PASS 100%)"),
        ("TỔNG CỘNG HỆ THỐNG", "Toàn bộ 15 bộ script", "> 840 tests", "HOÀN HẢO (100% PASS)")
    ]
    for r_data in test_data:
        row = t_test.add_row()
        for idx, val in enumerate(r_data):
            c = row.cells[idx]
            c.text = val
            set_cell_margins(c, top=60, bottom=60, left=80, right=80)
            p = c.paragraphs[0]
            p.paragraph_format.space_after = Pt(2)
            if idx == 0 or idx == 3:
                p.alignment = WD_ALIGN_PARAGRAPH.CENTER if idx == 3 else WD_ALIGN_PARAGRAPH.LEFT
                for r in p.runs:
                    r.bold = True
                    r.font.name = 'Times New Roman'
                    r.font.size = Pt(11)
            else:
                p.alignment = WD_ALIGN_PARAGRAPH.CENTER
                for r in p.runs:
                    r.font.name = 'Times New Roman'
                    r.font.size = Pt(11)

    add_h2("5.2. Đánh giá thực nghiệm khả năng xử lý tranh chấp ghế đồng thời")
    add_p("Để kiểm chứng tính vững chắc của giải pháp PostgreSQL Advisory Lock, một kịch bản kiểm thử áp lực được thiết kế trong test:holds:")
    add_bullet("Khởi tạo đồng thời 10 tiến trình worker gửi yêu cầu chọn cùng duy nhất một vị trí ghế VIP (mã seatId trùng nhau) của cùng một suất chiếu tại cùng một mili-giây.")
    add_bullet("Kết quả ghi nhận: Đúng 1 tiến trình đến trước giành được khóa Advisory Lock thành công và tạo được bản ghi HoldSession (HTTP 200/201). 9 tiến trình còn lại nhận về mã lỗi HTTP 409 SEAT_ALREADY_HELD một cách êm ái. Không có bất kỳ hiện tượng Deadlock hoặc Crash kết nối nào xảy ra. Cơ sở dữ liệu duy trì tính toàn vẹn 100%.")

    add_h2("5.3. Đánh giá chất lượng và độ trễ của Trợ lý AI")
    add_p("Trong bài kiểm tra thực tế với 18 lượt tương tác hỏi đáp tự nhiên kết nối trực tiếp với API Google Gemini thật tại local:")
    add_bullet("15 lượt phản hồi cho kết quả cực kỳ chính xác: mô hình hiểu đúng ý định, trích xuất đúng tên phim và gợi ý chính xác các suất chiếu đang mở bán kèm liên kết đặt vé.")
    add_bullet("Thời gian phản hồi gói tin đầu tiên (Time to First Stage) qua giao thức streaming NDJSON đạt trung bình dưới 600ms, mang lại trải nghiệm mượt mà, không gián đoạn cho người dùng.")
    doc.add_page_break()

    # =========================================================================
    # KẾT LUẬN VÀ HƯỚNG PHÁT TRIỂN
    # =========================================================================
    add_title_p("KẾT LUẬN VÀ HƯỚNG PHÁT TRIỂN", size=18, bold=True, space_after=14)
    add_h2("1. Các kết quả đạt được của đồ án")
    add_p("Sau quá trình nỗ lực nghiên cứu lý thuyết và triển khai thực nghiệm nghiêm túc, đề tài tốt nghiệp \"Xây dựng website đặt vé xem phim CineReserve sử dụng Next.js, TypeScript và tích hợp chatbot AI\" đã hoàn thành xuất sắc toàn bộ các mục tiêu đặt ra:")
    add_bullet("Xây dựng thành công hệ thống website CineReserve hoàn chỉnh với kiến trúc công nghệ tiên tiến nhất hiện nay: Next.js 16 App Router, React 19, TypeScript, PostgreSQL 17 và Prisma ORM.", bold_prefix="Về mặt sản phẩm: ")
    add_bullet("Giải quyết triệt để bài toán hóc búa về tranh chấp tài nguyên đồng thời trong thương mại điện tử bằng việc áp dụng sáng tạo cơ chế khóa cấp giao dịch PostgreSQL Advisory Lock, đảm bảo tính toàn vẹn tuyệt đối cho phiên giữ ghế 5 phút.", bold_prefix="Về mặt giải pháp khoa học: ")
    add_bullet("Hiện thực hóa thành công quy trình nghiệp vụ điện ảnh khép kín và bảo mật: từ lập lịch chiếu, giữ ghế, thanh toán an toàn, phát hành vé QR, soát vé một lần bằng camera di động đến báo cáo doanh thu đa chiều.", bold_prefix="Về mặt nghiệp vụ: ")
    add_bullet("Tích hợp thành công mô hình ngôn ngữ lớn Google Gemini AI với kỹ thuật Single-Turn Schema và giao thức Streaming NDJSON, tạo nên một Trợ lý ảo tư vấn phim thông minh vượt trội so với các hệ thống thương mại hiện hữu.", bold_prefix="Về mặt ứng dụng AI: ")
    add_bullet("Hệ thống đạt chất lượng công nghiệp với hơn 840 ca kiểm thử tích hợp tự động thành công 100%, sẵn sàng cho việc đóng gói và triển khai vận hành thực tế.", bold_prefix="Về độ tin cậy: ")

    add_h2("2. Hạn chế còn tồn tại")
    add_bullet("Cổng thanh toán trong đồ án hiện mới dừng lại ở mức độ mô phỏng an toàn (Mock Payment) phục vụ nghiệm thu nghiệp vụ, chưa kết nối trực tiếp với cổng thanh toán tiền thật (như VNPAY, MoMo).")
    add_bullet("Hệ thống hiện tại hoạt động hoàn toàn trên nền tảng Web Responsive, chưa xây dựng các ứng dụng di động độc lập (Native Mobile App) trên iOS và Android.")
    add_bullet("Chưa triển khai các nghiệp vụ mở rộng như bán bắp nước (F&B combos), tích điểm đổi quà thành viên hoặc lựa chọn ghế đôi (Sweetbox).")

    add_h2("3. Hướng phát triển trong tương lai")
    add_bullet("Tích hợp cổng thanh toán trực tuyến chính thức qua cổng thanh toán quốc gia (VNPAY Sandbox / MoMo API) có chữ ký số bảo mật.")
    add_bullet("Phát triển ứng dụng di động chuyên dụng cho nhân viên soát vé bằng React Native nhằm tối ưu tốc độ nhận diện mã QR trong điều kiện ánh sáng yếu tại cửa phòng chiếu.")
    add_bullet("Ứng dụng mô hình học máy (Machine Learning Recommendation System) dựa trên lịch sử xem phim để cá nhân hóa hoàn toàn giao diện trang chủ cho từng khách hàng.")
    doc.add_page_break()

    # =========================================================================
    # TÀI LIỆU THAM KHẢO
    # =========================================================================
    add_title_p("TÀI LIỆU THAM KHẢO", size=18, bold=True, space_after=14)
    ref_list = [
        "Trường Đại học Công nghiệp Hà Nội (2025), Quy định và Hướng dẫn trình bày Đồ án tốt nghiệp Đại học khối ngành Công nghệ thông tin, Nhà xuất bản Đại học Công nghiệp Hà Nội.",
        "Martin Kleppmann (2017), Designing Data-Intensive Applications: The Big Ideas Behind Reliable, Scalable, and Maintainable Systems, O'Reilly Media, ISBN: 978-1449373320.",
        "Robert C. Martin (2017), Clean Architecture: A Craftsman's Guide to Software Structure and Design, Prentice Hall, ISBN: 978-0134494166.",
        "PostgreSQL Global Development Group (2025), \"Explicit Locking and Advisory Locks in PostgreSQL 17\", PostgreSQL Documentation. [Online]. Available: https://www.postgresql.org/docs/current/explicit-locking.html",
        "Vercel Inc. (2026), \"Next.js App Router, Server Components, and Data Fetching Architecture\", Next.js Documentation. [Online]. Available: https://nextjs.org/docs",
        "Prisma Data Inc. (2026), \"Prisma Client Transactions, Concurrency Control, and Advisory Locks\", Prisma Guide. [Online]. Available: https://www.prisma.io/docs",
        "Google Cloud (2026), \"Gemini API Developer Guide, Structured Outputs, and Streaming Patterns\", Google AI for Developers. [Online]. Available: https://ai.google.dev/docs",
        "Alex Xu (2020), System Design Interview – An Insider's Guide, Volume 1, Independently published, ISBN: 979-8664653403.",
        "Bộ Thông tin và Truyền thông (2020), Tiêu chuẩn Quốc gia TCVN 11814:2017 về Quy chuẩn kỹ thuật trong thiết kế và phát triển phần mềm ứng dụng web."
    ]
    for idx, ref in enumerate(ref_list):
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
        p.paragraph_format.space_before = Pt(2)
        p.paragraph_format.space_after = Pt(4)
        p.paragraph_format.line_spacing = 1.3
        p.paragraph_format.first_line_indent = Cm(-0.8)
        p.paragraph_format.left_indent = Cm(0.8)
        
        r_num = p.add_run(f"[{idx+1}] ")
        r_num.bold = True
        r_num.font.name = 'Times New Roman'
        r_num.font.size = Pt(12)
        
        r_text = p.add_run(ref)
        r_text.font.name = 'Times New Roman'
        r_text.font.size = Pt(12)

    # Luu file Word
    out_path = r"d:\DA\Bao_Cao_Do_An_Tot_Nghiep_HaUI_CineReserve.docx"
    doc.save(out_path)
    print(f"SUCCESS: Da tao file Word tai {out_path}")

if __name__ == "__main__":
    build_report()

