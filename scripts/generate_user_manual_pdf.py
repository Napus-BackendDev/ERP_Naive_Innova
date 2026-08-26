import os

from PIL import Image as PILImage
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Image, PageBreak, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle


ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
OUT_DIR = os.path.join(ROOT, "output", "pdf")
ASSET_DIR = os.path.join(OUT_DIR, "user_manual_assets")
FONT_DIR = os.path.join(OUT_DIR, "fonts")
PDF_PATH = os.path.join(OUT_DIR, "naive_mes_user_manual_by_role.pdf")

PAGE_W, PAGE_H = A4
MARGIN = 16 * mm
CONTENT_W = PAGE_W - (2 * MARGIN)

pdfmetrics.registerFont(TTFont("Sarabun", os.path.join(FONT_DIR, "Sarabun-Regular.ttf")))
pdfmetrics.registerFont(TTFont("Sarabun-Bold", os.path.join(FONT_DIR, "Sarabun-Bold.ttf")))

styles = getSampleStyleSheet()
styles.add(ParagraphStyle("TH_Title", fontName="Sarabun-Bold", fontSize=24, leading=30, textColor=colors.HexColor("#0f172a"), alignment=TA_CENTER, spaceAfter=8))
styles.add(ParagraphStyle("TH_Subtitle", fontName="Sarabun", fontSize=15, leading=21, textColor=colors.HexColor("#475569"), alignment=TA_CENTER, spaceAfter=18))
styles.add(ParagraphStyle("TH_H1", fontName="Sarabun-Bold", fontSize=18, leading=24, textColor=colors.HexColor("#166534"), spaceBefore=8, spaceAfter=8))
styles.add(ParagraphStyle("TH_H2", fontName="Sarabun-Bold", fontSize=15, leading=21, textColor=colors.HexColor("#0f172a"), spaceBefore=8, spaceAfter=5))
styles.add(ParagraphStyle("TH_Body", fontName="Sarabun", fontSize=12.5, leading=18, textColor=colors.HexColor("#1f2937"), spaceAfter=5))
styles.add(ParagraphStyle("TH_Small", fontName="Sarabun", fontSize=11.5, leading=16, textColor=colors.HexColor("#475569"), spaceAfter=4))
styles.add(ParagraphStyle("TH_Bullet", fontName="Sarabun", fontSize=12.2, leading=17, leftIndent=10, firstLineIndent=-6, bulletIndent=0, textColor=colors.HexColor("#1f2937"), spaceAfter=3))
styles.add(ParagraphStyle("TH_Caption", fontName="Sarabun", fontSize=11, leading=14, textColor=colors.HexColor("#64748b"), alignment=TA_CENTER, spaceAfter=8))
styles.add(ParagraphStyle("TH_Callout", fontName="Sarabun-Bold", fontSize=12.5, leading=18, textColor=colors.HexColor("#14532d"), backColor=colors.HexColor("#f0fdf4"), borderColor=colors.HexColor("#bbf7d0"), borderWidth=0.8, borderPadding=6, spaceBefore=5, spaceAfter=8))

ROLE_COLORS = {
    "Sales": "#16a34a",
    "R&D": "#7c3aed",
    "Production": "#2563eb",
    "Stock": "#0f766e",
}


def p(text, style="TH_Body"):
    return Paragraph(text, styles[style])


def bullets(items):
    return [Paragraph("• " + item, styles["TH_Bullet"]) for item in items]


def section_header(title, role=None):
    color = ROLE_COLORS.get(role, "#16a34a")
    table = Table([[Paragraph(title, ParagraphStyle("hdr", fontName="Sarabun-Bold", fontSize=17, leading=22, textColor=colors.white))]], colWidths=[CONTENT_W])
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor(color)),
        ("LEFTPADDING", (0, 0), (-1, -1), 9),
        ("RIGHTPADDING", (0, 0), (-1, -1), 9),
        ("TOPPADDING", (0, 0), (-1, -1), 7),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
    ]))
    return [table, Spacer(1, 6)]


def role_summary(role, goal, main_screen, output):
    data = [
        [p("<b>Role</b>", "TH_Small"), p(role, "TH_Small")],
        [p("<b>เป้าหมายหลัก</b>", "TH_Small"), p(goal, "TH_Small")],
        [p("<b>หน้าที่ใช้บ่อย</b>", "TH_Small"), p(main_screen, "TH_Small")],
        [p("<b>ผลลัพธ์ที่ต้องได้</b>", "TH_Small"), p(output, "TH_Small")],
    ]
    table = Table(data, colWidths=[35 * mm, CONTENT_W - (35 * mm)])
    table.setStyle(TableStyle([
        ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#cbd5e1")),
        ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#f8fafc")),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 7),
        ("RIGHTPADDING", (0, 0), (-1, -1), 7),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))
    return [table, Spacer(1, 8)]


def screenshot(name, caption, max_h=92 * mm):
    path = os.path.join(ASSET_DIR, name)
    img = PILImage.open(path)
    w, h = img.size
    scale = min(CONTENT_W / w, max_h / h)
    return [Image(path, width=w * scale, height=h * scale), p(caption, "TH_Caption")]


def footer(canvas, doc):
    canvas.saveState()
    canvas.setFont("Sarabun", 9)
    canvas.setFillColor(colors.HexColor("#64748b"))
    canvas.drawString(MARGIN, 9 * mm, "Naive MES / ERP User Manual - Development Local Workspace")
    canvas.drawRightString(PAGE_W - MARGIN, 9 * mm, f"หน้า {doc.page}")
    canvas.restoreState()


story = []
story += [
    Spacer(1, 20 * mm),
    p("คู่มือการใช้งานระบบ Naive MES / ERP", "TH_Title"),
    p("แบ่งตามบทบาทผู้ใช้งาน: Sales, R&D, Production, Stock", "TH_Subtitle"),
    p("เอกสารนี้จัดทำสำหรับผู้ใช้งานทั่วไป ไม่จำเป็นต้องมีความรู้ด้านเทคนิค โดยอธิบายหน้าที่ของแต่ละ Role ขั้นตอนการทำงานประจำวัน จุดที่ต้องระวัง และผลลัพธ์ที่ระบบจะส่งต่อไปยังแผนกถัดไป", "TH_Body"),
    p("สภาพแวดล้อม: Development / Local Workspace - ภาพหน้าจอถ่ายจากระบบเว็บจริงบน localhost", "TH_Callout"),
    Spacer(1, 8),
    p("สารบัญ", "TH_H1"),
]
story += bullets([
    "ภาพรวมระบบและเส้นทางงานจาก Sales ไปจนถึง Stock",
    "คู่มือ Role: Sales - สร้างดีล เลือกสินค้า สั่งพัฒนาสูตร และติดตามลูกค้า",
    "คู่มือ Role: R&D - รับใบพัฒนาสูตร สร้าง/อนุมัติสูตร และดาวน์โหลดเอกสาร",
    "คู่มือ Role: Production - รับงานผลิต บันทึกขั้นตอน และส่ง QC",
    "คู่มือ Role: Stock - ดูวัตถุดิบ สินค้าคงคลัง และการเคลื่อนไหว",
    "คำศัพท์ในระบบและแนวทางแก้ปัญหาเบื้องต้น",
])
story.append(PageBreak())

story += section_header("1. ภาพรวมระบบ")
story += [p("Naive MES / ERP เป็นระบบติดตามงานตั้งแต่การขาย การวิจัยและพัฒนาสูตร การผลิต ไปจนถึงคลังสินค้า จุดสำคัญคือแต่ละแผนกทำงานบนข้อมูลชุดเดียวกัน เมื่อแผนกหนึ่งบันทึกงานเรียบร้อย ข้อมูลจะถูกส่งต่อไปยังแผนกถัดไปโดยอัตโนมัติ", "TH_Body")]
story += bullets([
    "<b>Sales</b> เริ่มต้นข้อมูลลูกค้า เลือกประเภทคำสั่ง เช่น ตัวอย่างสินค้า สั่งสินค้า หรือพัฒนาสูตรเอง",
    "<b>R&D</b> รับงานพัฒนาสูตร ตรวจรายละเอียดลูกค้า สร้างสูตร ทดลอง และอนุมัติสูตรที่ผ่าน",
    "<b>Production</b> รับงานผลิตจริง ตรวจ BOM/แพ็กเกจจิ้ง บันทึกสถานะตามขั้นตอนผลิต",
    "<b>Stock</b> ดูวัตถุดิบ สินค้าตัวอย่าง สินค้าสำเร็จรูป และปริมาณคงเหลือ",
])
story += [p("หลักคิดสำหรับผู้ใช้ใหม่: ให้ทำงานจากซ้ายไปขวาตามเมนู และกดบันทึกทุกครั้งเมื่อเปลี่ยนข้อมูลสำคัญ เช่น สถานะลูกค้า จำนวนสินค้า หรือผลอนุมัติสูตร", "TH_Callout")]

story.append(PageBreak())
story += section_header("2. คู่มือสำหรับ Sales", "Sales")
story += role_summary("Sales", "ดูแลข้อมูลลูกค้า เปิดดีลใหม่ เลือกสินค้า/สั่งผลิต/พัฒนาสูตร และส่งงานไปยัง stage ถัดไป", "เมนู Sales", "ดีลลูกค้าที่มีข้อมูลครบ พร้อม order type และสถานะ pipeline ที่ถูกต้อง")
story += screenshot("01_sales_board.png", "ภาพตัวอย่างหน้า Sales: ใช้ดู pipeline ลูกค้า แยกตาม stage และเพิ่มดีลใหม่")
story += [p("วิธีอ่านหน้าจอ Sales", "TH_H2")]
story += bullets([
    "แถบซ้ายคือเมนูหลัก เลือก <b>Sales</b> เพื่อเข้าหน้างานขาย",
    "ปุ่ม <b>บอร์ด</b> แสดงลูกค้าเป็นการ์ดตาม stage เหมาะสำหรับติดตามสถานะ",
    "ปุ่ม <b>ลิสต์</b> เหมาะสำหรับดูรายการแบบตารางหรือค้นหาจำนวนมาก",
    "ปุ่ม <b>เพิ่มดีลใหม่ (Lead)</b> ใช้สร้างลูกค้าหรือดีลใหม่",
    "ช่องค้นหาใช้ค้นชื่อลูกค้า เบอร์ หรือข้อมูลที่เกี่ยวข้อง",
])
story += screenshot("05_sales_create_modal.png", "ภาพตัวอย่างหน้าต่างสร้างดีล: กรอกข้อมูลลูกค้าและเลือกประเภทการสั่งสินค้า")
story += [p("ขั้นตอนสร้างดีลใหม่แบบละเอียด", "TH_H2")]
story += bullets([
    "กด <b>เพิ่มดีลใหม่ (Lead)</b>",
    "กรอกชื่อบริษัท/คลินิก/ชื่อลูกค้า เบอร์โทรศัพท์ และที่อยู่จัดส่งให้ครบที่สุด",
    "เลือก <b>Stage ที่จะให้การ์ดไปอยู่</b> เช่น รายชื่อเป้าหมาย หรือนัดหมายที่กำลังจะมาถึง",
    "เลือกประเภทการสั่งสินค้า: <b>ตัวอย่างสินค้า</b>, <b>สั่งสินค้า</b>, หรือ <b>พัฒนาสูตรเอง</b>",
    "ถ้าเลือกตัวอย่างสินค้า ให้ติ๊กสินค้าที่ต้องการ และใส่จำนวนชิ้นให้ถูกต้อง",
    "ถ้าเลือกพัฒนาสูตรเอง ให้ใส่ชื่อสูตร/ผลิตภัณฑ์ แบรนด์ และกดรายละเอียดเพื่อกรอก brief เช่น หมวดผลิตภัณฑ์ กลุ่มสัตว์/ผิวเป้าหมาย claim สารที่ต้องการหรือห้ามใช้ และ timeline",
    "ตรวจข้อมูลอีกครั้ง แล้วกด <b>Create Lead</b>",
])
story += [p("ข้อควรระวังสำหรับ Sales", "TH_H2")]
story += bullets([
    "อย่าลืมเลือกประเภทคำสั่งให้ตรงงานจริง เพราะระบบจะส่งต่อคนละ workflow",
    "งานพัฒนาสูตรจะไม่ใช้จำนวนชิ้นแบบงานผลิตทั่วไป แต่ต้องมีรายละเอียด brief ที่ชัดเจน",
    "เมื่อลูกค้าที่เคยทำพัฒนาสูตรกลับมาใน Retention ระบบจะแสดงเป็นลูกค้าเก่าและประวัติยังดาวน์โหลดเอกสารพัฒนาสูตรได้",
    "ในประวัติใบสั่งผลิตที่เสร็จแล้ว ถ้าเป็นพัฒนาสูตร badge ต้องเป็น <b>พัฒนาสูตร</b> ไม่ใช่ อยู่ในคลัง",
])

story.append(PageBreak())
story += section_header("3. คู่มือสำหรับ R&D", "R&D")
story += role_summary("R&D", "รับใบสั่งพัฒนาสูตร/ตรวจสูตรโรงงาน ทดลองสูตร ทำ QC และอนุมัติสูตรที่ผ่าน", "เมนู R&D", "สูตรที่ผ่าน QC พร้อมเอกสารพัฒนาสูตรและข้อมูล BOM ที่ใช้ต่อได้")
story += screenshot("02_rnd_dashboard.png", "ภาพตัวอย่างหน้า R&D: แสดงงานที่รับเข้า กำลังพัฒนา รอ QC และงานเสร็จแล้ว")
story += [p("ส่วนสำคัญในหน้า R&D", "TH_H2")]
story += bullets([
    "<b>รับใบสั่งผลิต/พัฒนาสูตร</b> คือรายการใหม่ที่รอ R&D ตรวจและเริ่มทำงาน",
    "<b>กำลังผลิต/กำลังพัฒนาสูตร</b> คือสูตรที่กำลังทดลองหรือปรับข้อมูล",
    "<b>Inprocess QC / ส่งสูตรให้ลูกค้าทดลอง</b> คือจุดตรวจผลก่อนอนุมัติ",
    "<b>งานที่เสร็จสิ้นแล้ว</b> คือรายการที่ผ่าน QC หรือจบงาน",
    "<b>Stock วัตถุดิบสารเคมี</b> ใช้ตรวจว่าวัตถุดิบพอหรือขาด",
    "<b>สูตรคำนวณ BOM</b> ใช้ดูสูตรและสารเคมีในสูตร",
])
story += [p("ขั้นตอนทำงานพัฒนาสูตร", "TH_H2")]
story += bullets([
    "คลิกรายการพัฒนาสูตรที่ Sales ส่งมา",
    "อ่านส่วน <b>ความต้องการและรายละเอียดสเปกจากลูกค้า</b> ให้ครบก่อนเริ่มทำสูตร",
    "กด <b>รายละเอียด</b> เพื่อดูข้อมูล brief แบบละเอียด",
    "สร้างสูตรทดลองในระบบ โดยระบุชื่อสูตร สารเคมี กลุ่ม/ขั้นตอน อัตราส่วน และขั้นตอนการผสม",
    "เมื่อต้องส่งเอกสาร requirement ให้กดปุ่มดาวน์โหลดเอกสารพัฒนาสูตรในจุดที่ระบบเตรียมไว้",
    "เมื่อสูตรผ่านแล้ว ให้ตั้งผลเป็น pass / ผ่าน QC เพื่อให้เอกสารหน้า 2 แสดงเฉพาะสูตรที่ผ่านเท่านั้น",
    "หลังผ่าน QC แล้ว ระบบจะส่งลูกค้ากลับไป Retention 1 และล้างข้อมูลพัฒนาสูตรออกจากฟอร์มขาย แต่ประวัติและเอกสารยังอยู่",
])
story += [p("เอกสารพัฒนาสูตร", "TH_H2")]
story += bullets([
    "ถ้างานยังไม่เสร็จ เอกสารควรออกเฉพาะหน้า Requirement / Brief",
    "ถ้างานเสร็จและอนุมัติแล้ว เอกสารในประวัติจะเป็นไฟล์เดียว 2 หน้า: หน้า Req และหน้าสูตร",
    "หน้าสูตรจะแสดงเฉพาะสูตรที่ pass เท่านั้น ไม่แสดงสูตรที่ยังทดสอบหรือไม่ผ่าน",
    "ตารางสูตรประกอบด้วย ขั้นตอน, ชื่อสารเคมี, กลุ่ม, 100 ก., ต่อ 1 กก.",
])

story.append(PageBreak())
story += section_header("4. คู่มือสำหรับ Production", "Production")
story += role_summary("Production", "รับงานผลิตจริง ตรวจรายละเอียดผลิต บันทึกสถานะงาน และปิดงานเมื่อผลิต/QC เสร็จ", "เมนู Production", "ใบสั่งผลิตที่เดินตามขั้นตอนครบ มีสถานะถูกต้อง และสร้างประวัติล็อตสำเร็จรูปได้")
story += screenshot("03_production_dashboard.png", "ภาพตัวอย่างหน้า Production: ใช้ติดตามงานผลิตและสถานะการผลิต")
story += [p("การทำงานประจำวันของ Production", "TH_H2")]
story += bullets([
    "เปิดเมนู <b>Production</b> เพื่อดูงานที่รอผลิตหรือกำลังผลิต",
    "เลือกการ์ดงานที่ต้องทำ แล้วอ่านสูตร จำนวน ขนาดบรรจุ และรายละเอียดบรรจุภัณฑ์",
    "ตรวจ BOM หรือรายการวัตถุดิบก่อนเริ่มผลิต เพื่อป้องกันวัตถุดิบไม่พอ",
    "อัปเดตสถานะตามขั้นตอนจริง เช่น รับใบสั่งผลิต, กำลังผลิต, รอ QC, ผ่าน QC แล้ว",
    "แนบรูปหรือข้อมูล QC เมื่อระบบร้องขอ เพื่อให้ประวัติการผลิตตรวจสอบย้อนหลังได้",
    "เมื่องานผ่าน QC แล้ว ระบบจะสร้างประวัติล็อต/สินค้าสำเร็จรูปตาม logic ของงานผลิตปกติ",
])
story += [p("ข้อควรระวังสำหรับ Production", "TH_H2")]
story += bullets([
    "งานพัฒนาสูตรไม่ควรถูกนับเป็นสินค้าสำเร็จรูปในคลัง",
    "อย่าเปลี่ยนสถานะข้ามขั้นถ้าเอกสารหรือ QC ยังไม่ครบ",
    "ตรวจหน่วยทุกครั้ง โดยเฉพาะ kg/g ใน BOM เพราะตัวเลขหน่วยผิดจะทำให้สูตรผิดทั้งล็อต",
    "ถ้าสินค้าส่งให้ลูกค้าแล้ว ควรสะท้อนสถานะว่าออกจากคลัง ไม่ใช่ยังนับเป็น stock ขายได้",
])

story.append(PageBreak())
story += section_header("5. คู่มือสำหรับ Stock", "Stock")
story += role_summary("Stock", "ตรวจปริมาณวัตถุดิบ สินค้าตัวอย่าง สินค้าสำเร็จรูป และข้อมูลล็อต", "เมนู Stock", "ข้อมูลคงเหลือที่ถูกต้องสำหรับ Sales, R&D และ Production ใช้ตัดสินใจ")
story += screenshot("04_stock_dashboard.png", "ภาพตัวอย่างหน้า Stock: ใช้ดูปริมาณคงเหลือและจัดการสินค้า/วัตถุดิบ")
story += [p("สิ่งที่ Stock ต้องดูเป็นประจำ", "TH_H2")]
story += bullets([
    "<b>สินค้าตัวอย่าง</b> ใช้สำหรับ Sales เลือกส่ง sample ให้ลูกค้า",
    "<b>วัตถุดิบสารเคมี</b> ใช้สำหรับ R&D และ Production ตรวจความพร้อมก่อนทำสูตร",
    "<b>สินค้าสำเร็จรูป</b> ใช้ดูล็อตที่ยังอยู่ในคลัง หมดอายุ เรียกคืน หรือส่งให้ลูกค้าแล้ว",
    "<b>ล็อตและวันหมดอายุ</b> ใช้ตรวจสอบย้อนหลังกรณีมีปัญหาคุณภาพ",
])
story += [p("ขั้นตอนใช้งาน Stock สำหรับผู้เริ่มต้น", "TH_H2")]
story += bullets([
    "เข้าเมนู <b>Stock</b>",
    "เลือก tab หรือหมวดที่ต้องการดู เช่น ตัวอย่างสินค้า วัตถุดิบ หรือสินค้าสำเร็จรูป",
    "ค้นหาชื่อสินค้า/สูตร/สารเคมีที่ต้องการ",
    "ตรวจจำนวนคงเหลือก่อนตอบ Sales หรือเริ่มงานผลิต",
    "ถ้ามีการรับเข้า เบิกออก หรือปรับยอด ให้บันทึกพร้อมหมายเหตุทุกครั้ง",
    "ตรวจรายการที่ใกล้หมดอายุหรือปริมาณต่ำ เพื่อแจ้งทีมที่เกี่ยวข้องล่วงหน้า",
])
story += [p("ข้อควรระวังสำหรับ Stock", "TH_H2")]
story += bullets([
    "อย่าปรับยอดโดยไม่มีหมายเหตุ เพราะจะตรวจสอบย้อนหลังยาก",
    "แยกสินค้าตัวอย่างออกจากสินค้าผลิตจริงให้ชัดเจน",
    "ล็อตที่ส่งลูกค้าแล้วควรเป็นประวัติ ไม่ควรนับเป็น stock พร้อมขาย",
    "งานพัฒนาสูตรเป็นประวัติ R&D ไม่ใช่สินค้าคงคลัง",
])

story.append(PageBreak())
story += section_header("6. คำศัพท์และแนวทางแก้ปัญหาเบื้องต้น")
gloss = [
    ["คำศัพท์", "ความหมายสำหรับผู้ใช้งาน"],
    ["Lead / ดีล", "ข้อมูลลูกค้าหรือโอกาสการขายหนึ่งรายการ"],
    ["Stage", "ช่องสถานะใน pipeline เช่น รายชื่อเป้าหมาย, Retention 1"],
    ["พัฒนาสูตร", "งานที่ให้ R&D สร้างหรือปรับสูตรใหม่ตาม brief ของลูกค้า"],
    ["BOM", "รายการสารเคมีและอัตราส่วนในสูตร ใช้คำนวณวัตถุดิบ"],
    ["QC", "การตรวจคุณภาพก่อนปิดงานหรือส่งให้ลูกค้า"],
    ["Lot", "เลขอ้างอิงการผลิต ใช้ติดตามสินค้าสำเร็จรูปย้อนหลัง"],
    ["Retention 1", "ลูกค้าเก่าหรือกลับมาติดต่ออีกครั้งหลังจบงานก่อนหน้า"],
]
table = Table([[p(a, "TH_Small"), p(b, "TH_Small")] for a, b in gloss], colWidths=[42 * mm, CONTENT_W - (42 * mm)])
table.setStyle(TableStyle([
    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#dcfce7")),
    ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#cbd5e1")),
    ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ("LEFTPADDING", (0, 0), (-1, -1), 7),
    ("RIGHTPADDING", (0, 0), (-1, -1), 7),
    ("TOPPADDING", (0, 0), (-1, -1), 5),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
]))
story += [table, Spacer(1, 8), p("ปัญหาที่พบบ่อย", "TH_H2")]
story += bullets([
    "<b>หา lead ไม่เจอ:</b> ตรวจช่องค้นหาและ stage ที่เลือกอยู่ อาจอยู่ในคอลัมน์ถัดไป",
    "<b>กดเอกสารแล้วข้อมูลไม่ครบ:</b> ตรวจว่างานนั้นบันทึก brief หรือสูตร pass แล้วหรือยัง",
    "<b>จำนวน stock ไม่ตรง:</b> ตรวจว่าล็อตถูกส่งลูกค้าแล้วหรือยัง และมีการปรับยอด stock ล่าสุดหรือไม่",
    "<b>งานไม่ไป R&D:</b> ตรวจว่า Sales เลือกประเภทเป็นพัฒนาสูตรเอง ไม่ใช่ตัวอย่างสินค้าหรือสั่งสินค้า",
    "<b>งานผลิตไม่ขึ้น Production:</b> ตรวจว่างานนั้นไม่ใช่พัฒนาสูตร เพราะพัฒนาสูตรควรอยู่ฝั่ง R&D เท่านั้น",
])
story += [p("หากไม่มั่นใจ ให้จดชื่อ lead, วันที่, stage ปัจจุบัน และภาพหน้าจอ แล้วแจ้งผู้ดูแลระบบเพื่อช่วยตรวจข้อมูล", "TH_Callout")]

doc = SimpleDocTemplate(PDF_PATH, pagesize=A4, rightMargin=MARGIN, leftMargin=MARGIN, topMargin=14 * mm, bottomMargin=15 * mm)
doc.build(story, onFirstPage=footer, onLaterPages=footer)
print(PDF_PATH)
