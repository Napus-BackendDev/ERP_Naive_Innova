import os

from PIL import Image as PILImage
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Image, PageBreak, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle


ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
OUT_DIR = os.path.join(ROOT, "output", "pdf")
ASSET_DIR = os.path.join(OUT_DIR, "sales_manual_assets")
FONT_DIR = os.path.join(OUT_DIR, "fonts")
PDF_PATH = os.path.join(OUT_DIR, "naive_mes_sales_user_manual.pdf")

PAGE_W, PAGE_H = A4
MARGIN = 15 * mm
CONTENT_W = PAGE_W - (2 * MARGIN)

pdfmetrics.registerFont(TTFont("Sarabun", os.path.join(FONT_DIR, "Sarabun-Regular.ttf")))
pdfmetrics.registerFont(TTFont("Sarabun-Bold", os.path.join(FONT_DIR, "Sarabun-Bold.ttf")))

styles = getSampleStyleSheet()
styles.add(ParagraphStyle("TitleTH", fontName="Sarabun-Bold", fontSize=23, leading=30, textColor=colors.HexColor("#0f172a"), alignment=TA_CENTER, spaceAfter=8))
styles.add(ParagraphStyle("SubtitleTH", fontName="Sarabun", fontSize=14.5, leading=20, textColor=colors.HexColor("#475569"), alignment=TA_CENTER, spaceAfter=14))
styles.add(ParagraphStyle("H1TH", fontName="Sarabun-Bold", fontSize=17, leading=22, textColor=colors.white, spaceAfter=0))
styles.add(ParagraphStyle("H2TH", fontName="Sarabun-Bold", fontSize=15, leading=20, textColor=colors.HexColor("#0f172a"), spaceBefore=7, spaceAfter=4))
styles.add(ParagraphStyle("BodyTH", fontName="Sarabun", fontSize=12.5, leading=17.5, textColor=colors.HexColor("#1f2937"), spaceAfter=4))
styles.add(ParagraphStyle("SmallTH", fontName="Sarabun", fontSize=11.4, leading=15.5, textColor=colors.HexColor("#475569"), spaceAfter=3))
styles.add(ParagraphStyle("BulletTH", fontName="Sarabun", fontSize=12.2, leading=17, leftIndent=10, firstLineIndent=-6, textColor=colors.HexColor("#1f2937"), spaceAfter=2))
styles.add(ParagraphStyle("CaptionTH", fontName="Sarabun", fontSize=10.8, leading=14, textColor=colors.HexColor("#64748b"), alignment=TA_CENTER, spaceAfter=7))
styles.add(ParagraphStyle("CalloutTH", fontName="Sarabun-Bold", fontSize=12.5, leading=17.5, textColor=colors.HexColor("#14532d"), backColor=colors.HexColor("#ecfdf5"), borderColor=colors.HexColor("#86efac"), borderWidth=0.8, borderPadding=6, spaceBefore=4, spaceAfter=7))


def p(text, style="BodyTH"):
    return Paragraph(text, styles[style])


def bullets(items):
    return [p("- " + item, "BulletTH") for item in items]


def header(title):
    tbl = Table([[p(title, "H1TH")]], colWidths=[CONTENT_W])
    tbl.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#16a34a")),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 7),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
    ]))
    return [tbl, Spacer(1, 7)]


def screenshot(name, caption, max_h=92 * mm):
    path = os.path.join(ASSET_DIR, name)
    img = PILImage.open(path)
    w, h = img.size
    scale = min(CONTENT_W / w, max_h / h)
    return [Image(path, width=w * scale, height=h * scale), p(caption, "CaptionTH")]


def table(rows, widths=None, header_bg="#dcfce7"):
    widths = widths or [CONTENT_W / len(rows[0])] * len(rows[0])
    data = [[p(cell, "SmallTH") for cell in row] for row in rows]
    tbl = Table(data, colWidths=widths, repeatRows=1)
    tbl.setStyle(TableStyle([
        ("GRID", (0, 0), (-1, -1), 0.45, colors.HexColor("#cbd5e1")),
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor(header_bg)),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    return tbl


def footer(canvas, doc):
    canvas.saveState()
    canvas.setFont("Sarabun", 9)
    canvas.setFillColor(colors.HexColor("#64748b"))
    canvas.drawString(MARGIN, 9 * mm, "Naive MES / ERP - Sales User Manual - Development Local Workspace")
    canvas.drawRightString(PAGE_W - MARGIN, 9 * mm, f"หน้า {doc.page}")
    canvas.restoreState()


story = []
story += [
    Spacer(1, 16 * mm),
    p("คู่มือการใช้งานระบบฝั่ง Sales", "TitleTH"),
    p("Naive MES / ERP - สำหรับทีมขายและผู้ดูแลดีลลูกค้า", "SubtitleTH"),
    p("เอกสารนี้อธิบายการใช้งานหน้า Sales แบบละเอียดสำหรับผู้ใช้งานทั่วไป ไม่จำเป็นต้องมีความรู้ด้านเทคนิค โดยเรียงตามงานจริงที่ Sales ต้องทำ: ดูบอร์ด, ดูลิสต์, สร้างลูกค้าแต่ละ flow, แก้ไขสถานะ และดาวน์โหลดเอกสารที่เกี่ยวข้อง", "BodyTH"),
    p("ภาพประกอบในเอกสารถ่ายจากระบบเว็บจริงในโหมดสีมืด บน Development local workspace", "CalloutTH"),
    Spacer(1, 6),
    p("สารบัญ", "H2TH"),
]
story += bullets([
    "ภาพรวมหน้าที่ของ Sales และคำศัพท์ที่ต้องรู้",
    "การใช้งาน Kanban card และ Pipeline Stage",
    "การใช้งาน List สำหรับค้นหาและจัดการดีลจำนวนมาก",
    "การสร้างลูกค้า flow ตัวอย่างสินค้า",
    "การสร้างลูกค้า flow สั่งสินค้า",
    "การสร้างลูกค้า flow พัฒนาสูตร",
    "การเปิดรายละเอียดดีล การย้าย Stage และประวัติใบสั่งผลิตที่เสร็จแล้ว",
    "ประเภทเอกสารที่ดาวน์โหลดได้ และข้อควรระวัง",
])

story.append(PageBreak())
story += header("1. ภาพรวมหน้าที่ของ Sales")
story += [
    p("หน้า Sales เป็นจุดเริ่มต้นของข้อมูลลูกค้าและคำสั่งงานในระบบ เมื่อลูกค้าสนใจสินค้า ทีม Sales จะสร้าง lead หรือดีลใหม่ เลือกประเภทคำสั่งให้ถูกต้อง แล้วระบบจะพาข้อมูลไปยังขั้นตอนถัดไป เช่น R&D, Production หรือ Stock ตาม flow ที่เลือก", "BodyTH"),
    p("หลักคิดสำคัญ: Sales ไม่ได้แค่กรอกชื่อและเบอร์โทร แต่เป็นคนกำหนดทิศทางงานทั้งกระบวนการ ดังนั้นประเภทคำสั่งและรายละเอียดลูกค้าต้องถูกตั้งแต่ต้น", "CalloutTH"),
    p("คำศัพท์ที่ควรรู้", "H2TH"),
    table([
        ["คำศัพท์", "ความหมายสำหรับผู้ใช้งาน Sales"],
        ["Lead / ดีล", "ข้อมูลลูกค้าหรือโอกาสขายหนึ่งรายการ อาจยังไม่ซื้อทันที แต่ต้องติดตามต่อ"],
        ["Pipeline Stage", "ช่องสถานะบนบอร์ด เช่น ลูกค้าไม่สนใจ, นัดหมาย, รายชื่อเป้าหมาย, Retention 1"],
        ["Kanban card", "การ์ดลูกค้าบนบอร์ด ใช้ดูภาพรวมเร็วและลาก/ย้ายตามสถานะ"],
        ["List", "มุมมองแบบรายการตาราง เหมาะกับการค้นหา จัดเรียง และดูข้อมูลจำนวนมาก"],
        ["Order Type", "ประเภทคำสั่งในดีล ได้แก่ ตัวอย่างสินค้า, สั่งสินค้า, พัฒนาสูตร"],
        ["Retention 1", "ลูกค้าเก่าหรือกลับมาติดต่อซ้ำหลังมีประวัติงานเดิม"],
    ], widths=[38 * mm, CONTENT_W - 38 * mm]),
]
story += screenshot("01_sales_kanban_dark.png", "ภาพรวมหน้า Sales แบบ Kanban ในโทนสีมืด")

story.append(PageBreak())
story += header("2. การใช้งาน Kanban Card")
story += [
    p("Kanban คือมุมมองหลักสำหรับติดตามสถานะลูกค้าแบบรวดเร็ว แต่ละคอลัมน์คือ Stage และแต่ละการ์ดคือลูกค้าหนึ่งราย การดูบอร์ดช่วยให้ Sales รู้ทันทีว่าลูกค้าอยู่ขั้นตอนไหน ต้องโทรตามใคร หรือดีลไหนควรส่งต่อแล้ว", "BodyTH"),
    p("ส่วนประกอบของการ์ด", "H2TH"),
]
story += bullets([
    "ชื่อด้านบนของการ์ดคือชื่อลูกค้า คลินิก หรือบริษัท",
    "บรรทัดคำสั่งสินค้าจะแสดงว่าเป็น ไม่มีการสั่งสินค้า, สั่งสินค้าตัวอย่าง, สั่งสินค้า หรือพัฒนาสูตร",
    "ตัวเลขจำนวนหรือมูลค่าใช้ช่วยประเมินขนาดดีล แต่ต้องดูร่วมกับประเภทคำสั่งเสมอ",
    "เมนูจุดสามจุดบนการ์ดใช้เปิดคำสั่งเพิ่มเติม เช่น แก้ไขหรือจัดการดีล",
    "สีหัวคอลัมน์ช่วยแยก Stage เพื่อให้มองภาพรวมได้เร็ว",
])
story += [
    p("วิธีใช้งาน Kanban ในงานประจำ", "H2TH"),
]
story += bullets([
    "เปิดเมนู Sales แล้วเลือกมุมมอง บอร์ด",
    "ดูคอลัมน์ Stage ที่ต้องการ เช่น รายชื่อเป้าหมาย หรือนัดหมายที่กำลังจะมาถึง",
    "คลิกการ์ดลูกค้าเพื่อเปิดรายละเอียดด้านขวา",
    "แก้ไขข้อมูลหรือตรวจประวัติ แล้วกด Save Changes ทุกครั้ง",
    "หากต้องการย้ายลูกค้าไป Stage ใหม่ ให้เปลี่ยนช่อง ย้ายสถานะ (Stage) ในแผงรายละเอียด",
])
story += [
    p("ข้อควรระวัง: อย่าดูแค่สีหรือจำนวนบนการ์ด ต้องเปิดรายละเอียดเมื่อต้องตัดสินใจ เพราะดีลพัฒนาสูตรกับดีลสินค้าในคลังมี logic ต่างกัน", "CalloutTH"),
]
story += screenshot("01_sales_kanban_dark.png", "บอร์ด Kanban ใช้ติดตามลูกค้าตาม Stage และเปิดรายละเอียดจากการ์ด")

story.append(PageBreak())
story += header("3. การใช้งาน List")
story += [
    p("List คือมุมมองแบบตาราง เหมาะสำหรับเวลามีดีลจำนวนมาก ต้องค้นหาชื่อลูกค้า เบอร์โทร ที่อยู่ แหล่งที่มา ประเภทออเดอร์ หรือมูลค่า การใช้ List จะช่วยลดเวลาการไล่ดูทีละคอลัมน์บน Kanban", "BodyTH"),
]
story += screenshot("02_sales_list_dark.png", "มุมมอง List แสดงดีลเป็นตาราง เหมาะกับการค้นหาและจัดการจำนวนมาก")
story += [
    p("วิธีใช้งาน List", "H2TH"),
]
story += bullets([
    "กดปุ่ม ลิสต์ บริเวณหัวหน้า Sales",
    "ใช้ช่องค้นหาด้านบนของตารางเพื่อค้นชื่อลูกค้า เบอร์โทร ที่อยู่ หรือหมายเหตุ",
    "ดูคอลัมน์ Stage เพื่อเช็คว่าลูกค้าอยู่ขั้นตอนไหน",
    "คลิกแถวลูกค้าที่ต้องการเพื่อเปิดรายละเอียดดีล",
    "ใช้ List เมื่อต้องตรวจลูกค้าหลายรายในวันเดียว หรือเช็คข้อมูลก่อน follow up",
])
story += [
    p("ข้อควรรู้: List เหมาะกับการตรวจข้อมูล แต่ Kanban เหมาะกับการบริหาร pipeline รายวัน ถ้าต้องย้ายงานตามสถานะหลายรายการ Kanban จะเห็นภาพรวมง่ายกว่า", "CalloutTH"),
]

story.append(PageBreak())
story += header("4. การสร้างลูกค้า Flow: ตัวอย่างสินค้า")
story += [
    p("Flow ตัวอย่างสินค้าใช้เมื่อ Sales ต้องส่ง sample ให้ลูกค้าทดลอง เช่น สเปรย์ดับกลิ่น, แชมพูตัวอย่าง หรือสินค้าตัวอย่างที่มี stock อยู่แล้ว Flow นี้จะมีช่องเลือกสินค้าตัวอย่างและจำนวนชิ้น", "BodyTH"),
]
story += screenshot("03_create_sample_dark.png", "หน้าสร้างดีลใหม่แบบตัวอย่างสินค้า มี checklist เลือกสินค้าได้หลายรายการ")
story += [
    p("ขั้นตอนสร้างดีลตัวอย่างสินค้า", "H2TH"),
]
story += bullets([
    "กด เพิ่มดีลใหม่ (Lead)",
    "กรอกชื่อลูกค้า เบอร์โทร และที่อยู่จัดส่งให้ครบ",
    "เลือก Stage เริ่มต้นที่เหมาะสม เช่น รายชื่อเป้าหมาย หรือส่งสินค้าตัวอย่าง",
    "เลือก tab ตัวอย่างสินค้า",
    "ติ๊กสินค้าที่ลูกค้าต้องการ สามารถเลือกได้หลายรายการ",
    "ใส่จำนวนชิ้นให้ถูกต้อง โดยดู stock คงเหลือประกอบ",
    "ตรวจข้อมูลอีกครั้ง แล้วกด Create Lead",
])
story += [
    p("ข้อควรระวังสำหรับตัวอย่างสินค้า", "H2TH"),
]
story += bullets([
    "อย่าใส่จำนวนเกิน stock คงเหลือ หากไม่แน่ใจให้เช็คกับ Stock ก่อน",
    "จำนวนชิ้นต้องเป็นตัวเลขจริง ไม่ควรปล่อยเป็น 0 หากมีการส่งสินค้า",
    "กรอกที่อยู่จัดส่งให้ครบ เพราะ flow นี้เกี่ยวข้องกับการส่ง sample ให้ลูกค้า",
    "ถ้าลูกค้าต้องการสินค้าที่ยังไม่มีในรายการตัวอย่าง ให้ตรวจว่าเป็น flow พัฒนาสูตรหรือสั่งสินค้าปกติแทน",
])

story.append(PageBreak())
story += header("5. การสร้างลูกค้า Flow: สั่งสินค้า")
story += [
    p("Flow สั่งสินค้าใช้เมื่อลูกค้าต้องการสั่งผลิตหรือสั่งสินค้าจริง ไม่ใช่แค่ขอตัวอย่าง ระบบจะเก็บข้อมูลราคา ยอดที่ชำระแล้ว รายการใบสั่งผลิต และจำนวนที่เกี่ยวข้องกับงานผลิต", "BodyTH"),
]
story += screenshot("04_create_lot_dark.png", "หน้าสร้างดีลแบบสั่งสินค้า ใช้เพิ่มรายการใบสั่งผลิตหลังเลือกหรือเพิ่มข้อมูลลูกค้า")
story += [
    p("ขั้นตอนสร้างดีลสั่งสินค้า", "H2TH"),
]
story += bullets([
    "กด เพิ่มดีลใหม่ (Lead)",
    "กรอกข้อมูลลูกค้าให้ครบ โดยเฉพาะเบอร์โทรและที่อยู่จัดส่ง",
    "เลือก tab สั่งสินค้า",
    "กรอกราคาโดยประมาณ และยอดที่ชำระแล้ว หากมีข้อมูล",
    "กด เพิ่มใบสั่งผลิต เพื่อเพิ่มรายการสินค้าที่ต้องผลิต",
    "เลือกสูตร/สินค้า ขนาดบรรจุ จำนวน และรายละเอียดที่จำเป็น",
    "ตรวจว่าจำนวนและข้อมูลการผลิตตรงกับที่ลูกค้าตกลงไว้",
    "กด Create Lead",
])
story += [
    p("ข้อควรรู้สำหรับสั่งสินค้า", "H2TH"),
]
story += bullets([
    "Flow นี้สามารถส่งต่อไป Production ได้เมื่อข้อมูลผลิตครบ",
    "จำนวนชิ้นมีผลต่อการผลิต สต็อก และประวัติ lot ต้องใส่ให้ถูกต้อง",
    "ถ้าเป็นสินค้าที่ต้องทำสูตรใหม่ก่อน ไม่ควรใช้ flow สั่งสินค้า ให้ใช้ พัฒนาสูตร",
    "หลังงานผลิตเสร็จ ประวัติที่ขึ้นว่า อยู่ในคลัง ควรใช้กับสินค้าที่เป็น finished goods จริงเท่านั้น",
])

story.append(PageBreak())
story += header("6. การสร้างลูกค้า Flow: พัฒนาสูตร")
story += [
    p("Flow พัฒนาสูตรใช้เมื่อลูกค้าต้องการสร้างสูตรใหม่หรือปรับสูตรเฉพาะ เช่น แบรนด์ของลูกค้าเอง กลิ่นเฉพาะ claim เฉพาะ หรือสเปกที่ยังไม่มีสูตรผลิตจริง Flow นี้จะส่งข้อมูลไป R&D ไม่ใช่เข้าคลังทันที", "BodyTH"),
]
story += screenshot("05_create_develop_dark.png", "หน้าสร้างดีลแบบพัฒนาสูตร มีชื่อสูตร แบรนด์ ปุ่มรายละเอียด และใบสั่งพัฒนาสูตร")
story += [
    p("ขั้นตอนสร้างดีลพัฒนาสูตร", "H2TH"),
]
story += bullets([
    "กด เพิ่มดีลใหม่ (Lead)",
    "กรอกข้อมูลลูกค้าให้ครบ",
    "เลือก tab พัฒนาสูตรเอง",
    "กรอกชื่อสูตรหรือผลิตภัณฑ์ที่ต้องการพัฒนา เช่น แชมพูสัตว์เลี้ยง สูตรลดกลิ่น",
    "กรอกแบรนด์ เช่น Naive, Pet Care หรือแบรนด์ลูกค้า",
    "กด รายละเอียด เพื่อกรอก brief เช่น หมวดผลิตภัณฑ์, กลุ่มสัตว์หรือผิวเป้าหมาย, claim, ลักษณะเนื้อและกลิ่น, สารที่ต้องการหรือห้ามใช้, งบต่อหน่วย, timeline และตัวอย่างอ้างอิง",
    "ถ้ามีมากกว่า 1 สูตร ให้กด เพิ่มใบสั่งพัฒนาสูตร เพื่อเพิ่มสูตรที่ 2, 3 ต่อไป",
    "กด ใบสั่งพัฒนาสูตร หากต้องการดูหรือดาวน์โหลดเอกสาร requirement สำหรับส่งต่อ",
    "ตรวจข้อมูล แล้วกด Create Lead",
])
story += [
    p("สิ่งที่ต้องรู้สำหรับพัฒนาสูตร", "H2TH"),
]
story += bullets([
    "งานพัฒนาสูตรไม่มีจำนวนชิ้นแบบงานผลิต เพราะยังอยู่ในขั้น R&D",
    "สถานะประวัติของงานนี้ต้องเป็น พัฒนาสูตร ไม่ใช่ อยู่ในคลัง",
    "เมื่อ R&D ทำเสร็จและสูตร pass แล้ว เอกสารในประวัติจะเป็นไฟล์เดียว 2 หน้า: หน้า Requirement และหน้าสูตรที่ pass",
    "หาก R&D ยังทำไม่เสร็จ เอกสารที่พิมพ์ออกมาควรมีเฉพาะ Requirement / Brief เท่านั้น",
    "เมื่อจบกระบวนการแล้วลูกค้ากลับเข้า Retention 1 ระบบควรแสดงว่าเป็นลูกค้าเก่า และไม่ค้างข้อมูลพัฒนาสูตรในฟอร์มขาย",
])

story.append(PageBreak())
story += header("7. รายละเอียดดีล การย้าย Stage และประวัติ")
story += [
    p("เมื่อคลิกการ์ดหรือแถวลูกค้า ระบบจะเปิดแผงรายละเอียดด้านขวา Sales ใช้พื้นที่นี้เพื่อแก้ไขข้อมูลลูกค้า เปลี่ยน Stage เลือกสินค้า ตรวจประวัติใบสั่งผลิตที่เสร็จแล้ว และดาวน์โหลดเอกสารที่เกี่ยวข้อง", "BodyTH"),
]
story += screenshot("06_sales_detail_docs_dark.png", "แผงรายละเอียดดีลด้านขวา ใช้แก้ข้อมูล ย้าย Stage เลือกสินค้า และดูประวัติ")
story += [
    p("วิธีใช้งานแผงรายละเอียด", "H2TH"),
]
story += bullets([
    "คลิกการ์ดบน Kanban หรือคลิกแถวใน List",
    "ตรวจข้อมูลติดต่อ ชื่อลูกค้า เบอร์โทร และที่อยู่",
    "เลือก Stage ใหม่ในช่อง ย้ายสถานะ (Stage) หากต้องย้าย pipeline",
    "ตรวจส่วน การเลือกสินค้า ว่า tab ที่เลือกตรงกับ flow ของลูกค้าหรือไม่",
    "ดูส่วน ประวัติใบสั่งผลิตที่เสร็จแล้ว เพื่อดูงานเดิมของลูกค้า",
    "กดปุ่มเอกสารในประวัติเมื่อจำเป็นต้องพิมพ์หรือบันทึก PDF",
    "กด Save Changes ทุกครั้งหลังแก้ข้อมูล",
])
story += [
    p("ข้อควรระวัง", "H2TH"),
]
story += bullets([
    "หากเปลี่ยน Stage แต่ไม่กด Save Changes ข้อมูลอาจไม่ถูกบันทึก",
    "อย่าสลับประเภทคำสั่งโดยไม่ตรวจข้อมูลเดิม เพราะอาจทำให้ข้อมูลที่จำเป็นของ flow นั้นหายหรือไม่ครบ",
    "หากเป็นลูกค้าเก่าใน Retention 1 ให้ดูประวัติก่อนสร้างงานใหม่ เพื่อลดการกรอกซ้ำและป้องกันใช้สูตรผิด",
])

story.append(PageBreak())
story += header("8. เอกสารที่ดาวน์โหลดได้")
story += [
    p("Sales อาจต้องดาวน์โหลดเอกสารเพื่อส่งต่อภายในทีม ส่งให้ลูกค้า หรือตรวจย้อนหลังจากประวัติ ระบบจะแสดงเอกสารต่างกันตามประเภทคำสั่งและสถานะงาน", "BodyTH"),
    table([
        ["ประเภทเอกสาร", "ใช้กับงาน", "จะเห็นเมื่อไหร่", "สิ่งที่อยู่ในเอกสาร"],
        ["ใบสั่งพัฒนาสูตร / Requirement Brief", "พัฒนาสูตร", "ตั้งแต่มี brief หรือยังไม่เสร็จ R&D", "ข้อมูลลูกค้า, ชื่อสูตร, แบรนด์, หมวดผลิตภัณฑ์, กลุ่มเป้าหมาย, claim, รายละเอียดสเปก"],
        ["เอกสารพัฒนาสูตร 2 หน้า", "พัฒนาสูตรที่ R&D ทำเสร็จและ pass", "ในประวัติใบสั่งผลิตที่เสร็จแล้ว", "หน้า 1 Requirement / Brief และหน้า 2 สูตรกับวิธีการผลิตเฉพาะสูตรที่ pass"],
        ["ใบสั่งผลิต / Production Spec", "สั่งสินค้า", "เมื่อมีรายการผลิต", "สูตรที่ผลิต, จำนวน, ขนาดบรรจุ, รายละเอียดการผลิตและข้อมูลที่เกี่ยวข้อง"],
        ["ประวัติ Lot / Finished Goods", "สินค้าที่ผลิตเสร็จจริง", "หลังผลิตและเข้า FG", "Lot number, จำนวนชิ้น, สถานะคลังหรือการส่งออก"],
        ["CSV Export ดีล", "ข้อมูล Sales ทั้งบอร์ด", "จากปุ่มนำเข้า/ส่งออกเอกสาร", "รายการ lead สำหรับตรวจหรือทำรายงานภายนอก"],
    ], widths=[38 * mm, 34 * mm, 42 * mm, CONTENT_W - 114 * mm]),
    p("หลักสำคัญ: งานพัฒนาสูตรกับงานสินค้าในคลังต้องแยกกันเสมอ เอกสารพัฒนาสูตรเป็นหลักฐาน R&D ไม่ใช่หลักฐานว่าสินค้าอยู่ในคลัง", "CalloutTH"),
    p("เช็คลิสต์ก่อนดาวน์โหลดเอกสาร", "H2TH"),
]
story += bullets([
    "ตรวจว่าลูกค้าถูกคน และ Lead ID ตรงกับงานที่ต้องการ",
    "ตรวจประเภทคำสั่งว่าเป็น ตัวอย่างสินค้า, สั่งสินค้า หรือพัฒนาสูตร",
    "ถ้าเป็นพัฒนาสูตรและยังไม่ pass ให้คาดหวังเอกสาร Requirement หน้าเดียว",
    "ถ้าเป็นพัฒนาสูตรที่ pass แล้ว ในประวัติควรได้เอกสารเดียว 2 หน้า ไม่ใช่ปุ่มแยกหลายอัน",
    "ถ้าเห็น badge อยู่ในคลัง กับงานพัฒนาสูตร ให้ถือว่าเป็นข้อมูลที่ต้องตรวจสอบ เพราะ logic ที่ถูกต้องควรเป็น พัฒนาสูตร",
])

story.append(PageBreak())
story += header("9. สรุป Flow สำหรับ Sales")
story += [
    table([
        ["สถานการณ์ลูกค้า", "Flow ที่ควรเลือก", "ข้อมูลที่ต้องมี", "ข้อควรระวัง"],
        ["ลูกค้าขอลองของก่อน", "ตัวอย่างสินค้า", "สินค้า sample, จำนวนชิ้น, ที่อยู่จัดส่ง", "เช็ค stock ก่อนใส่จำนวน"],
        ["ลูกค้าสั่งผลิตจริง", "สั่งสินค้า", "สูตร/สินค้า, จำนวน, ราคา, ยอดชำระ, รายละเอียดผลิต", "อย่าใช้หากยังต้อง R&D สูตรใหม่"],
        ["ลูกค้าขอสูตรใหม่หรือสูตรเฉพาะ", "พัฒนาสูตร", "ชื่อสูตร, แบรนด์, brief รายละเอียดลูกค้า", "ไม่มีจำนวนชิ้น และต้องส่งไป R&D"],
        ["ลูกค้าเก่ากลับมาซ้ำ", "Retention 1 แล้วสร้างงานใหม่ตามประเภทจริง", "ดูประวัติเก่าก่อน", "อย่าใช้ประวัติผิดประเภทเป็นงานใหม่"],
    ], widths=[42 * mm, 35 * mm, 58 * mm, CONTENT_W - 135 * mm]),
    Spacer(1, 8),
    p("แนวทางทำงานที่แนะนำ", "H2TH"),
]
story += bullets([
    "เริ่มจากค้นชื่อลูกค้าก่อนสร้างใหม่ทุกครั้ง เพื่อลดข้อมูลซ้ำ",
    "เลือก flow ให้ถูกก่อนกรอกสินค้า เพราะแต่ละ flow ใช้ข้อมูลไม่เหมือนกัน",
    "จด note สั้น ๆ แต่ชัดเจน เช่น เหตุผลที่ลูกค้าสนใจ เงื่อนไขราคา หรือสิ่งที่ต้อง follow up",
    "หลังแก้ไขรายละเอียดดีล ให้กด Save Changes ทันที",
    "ถ้าไม่แน่ใจว่าเป็นงานสั่งผลิตหรือพัฒนาสูตร ให้ถามหัวหน้าทีมหรือ R&D ก่อนสร้าง lead",
])
story += [
    p("ถ้าพบข้อมูลผิด เช่น พัฒนาสูตรแสดงเป็นอยู่ในคลัง, จำนวนชิ้นของพัฒนาสูตรยังโผล่, หรือเอกสารออกไม่ถูกหน้า ให้จดชื่อลูกค้า Lead ID วันที่ และภาพหน้าจอ แล้วแจ้งผู้ดูแลระบบ", "CalloutTH"),
]

doc = SimpleDocTemplate(
    PDF_PATH,
    pagesize=A4,
    rightMargin=MARGIN,
    leftMargin=MARGIN,
    topMargin=13 * mm,
    bottomMargin=15 * mm,
)
doc.build(story, onFirstPage=footer, onLaterPages=footer)
print(PDF_PATH)
