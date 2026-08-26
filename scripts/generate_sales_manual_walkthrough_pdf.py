"""Build the Sales user guide as a task-by-task walkthrough, not a screen catalogue."""

from pathlib import Path

from PIL import Image as PILImage
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Image, PageBreak, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle


ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "output" / "pdf"
SOURCE = OUT / "sales_manual_assets"
ASSETS = OUT / "sales_manual_walkthrough_assets"
PDF = OUT / "naive_mes_sales_manual_walkthrough.pdf"
FONT = OUT / "fonts"

PAGE_W, PAGE_H = A4
LEFT = RIGHT = 16 * mm
TOP, BOTTOM = 14 * mm, 16 * mm
CONTENT = PAGE_W - LEFT - RIGHT

GREEN = colors.HexColor("#16a34a")
DARK = colors.HexColor("#0f172a")
TEXT = colors.HexColor("#1e293b")
MUTED = colors.HexColor("#64748b")
LINE = colors.HexColor("#dbe4ef")
TIP_BG = colors.HexColor("#effdf4")
WARN_BG = colors.HexColor("#fff7ed")

pdfmetrics.registerFont(TTFont("Sarabun", str(FONT / "Sarabun-Regular.ttf")))
pdfmetrics.registerFont(TTFont("Sarabun-Bold", str(FONT / "Sarabun-Bold.ttf")))

styles = getSampleStyleSheet()
styles.add(ParagraphStyle("cover", fontName="Sarabun-Bold", fontSize=27, leading=34, textColor=DARK, alignment=TA_CENTER))
styles.add(ParagraphStyle("cover_sub", fontName="Sarabun", fontSize=15, leading=21, textColor=MUTED, alignment=TA_CENTER))
styles.add(ParagraphStyle("section", fontName="Sarabun-Bold", fontSize=18, leading=23, textColor=colors.white))
styles.add(ParagraphStyle("subtitle", fontName="Sarabun", fontSize=13, leading=18, textColor=TEXT))
styles.add(ParagraphStyle("body", fontName="Sarabun", fontSize=12.5, leading=17, textColor=TEXT))
styles.add(ParagraphStyle("body_bold", fontName="Sarabun-Bold", fontSize=12.5, leading=17, textColor=TEXT))
styles.add(ParagraphStyle("small", fontName="Sarabun", fontSize=10.5, leading=14, textColor=MUTED))
styles.add(ParagraphStyle("caption", fontName="Sarabun", fontSize=10.5, leading=14, alignment=TA_CENTER, textColor=MUTED))
styles.add(ParagraphStyle("step", fontName="Sarabun", fontSize=12.4, leading=16.5, textColor=TEXT))
styles.add(ParagraphStyle("number", fontName="Sarabun-Bold", fontSize=13, leading=16, alignment=TA_CENTER, textColor=colors.white))
styles.add(ParagraphStyle("label", fontName="Sarabun-Bold", fontSize=11, leading=14, textColor=colors.HexColor("#166534")))


def p(text, style="body"):
    return Paragraph(text, styles[style])


def crop(source, output, box):
    ASSETS.mkdir(parents=True, exist_ok=True)
    source_path = SOURCE / source
    out_path = ASSETS / output
    image = PILImage.open(source_path)
    image.crop(box).save(out_path, quality=96)
    return out_path


def make_assets():
    # Crops remove browser chrome and unrelated board areas so the reader sees
    # the action immediately. No callout lines are drawn over the interface.
    crop("01_sales_kanban_dark.png", "01-board.png", (0, 80, 1600, 940))
    crop("07_card_three_dot_menu_dark.png", "02-card-menu.png", (250, 285, 805, 730))
    crop("03_create_sample_dark.png", "03-new-lead.png", (120, 235, 1480, 840))
    crop("03_create_sample_dark.png", "04-sample-stock.png", (700, 310, 1465, 720))
    crop("04_create_lot_dark.png", "05-production-order.png", (690, 245, 1465, 835))
    crop("08_product_spec_modal_dark.png", "06-product-spec.png", (780, 180, 2180, 1500))
    crop("05_create_develop_dark.png", "07-develop-form.png", (695, 255, 1460, 695))
    crop("05_create_develop_dark.png", "08-develop-document-button.png", (720, 510, 1440, 650))
    crop("06_sales_detail_docs_dark.png", "08-deal-detail.png", (950, 0, 1600, 1000))
    crop("02_sales_list_dark.png", "09-list.png", (140, 205, 820, 630))


def section(title, location, when):
    head = Table([[p(title, "section")]], colWidths=[CONTENT])
    head.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), GREEN),
        ("LEFTPADDING", (0, 0), (-1, -1), 10),
        ("RIGHTPADDING", (0, 0), (-1, -1), 10),
        ("TOPPADDING", (0, 0), (-1, -1), 7),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
    ]))
    context = Table([
        [p("อยู่ที่", "body_bold"), p(location, "body")],
        [p("ใช้เมื่อ", "body_bold"), p(when, "body")],
    ], colWidths=[24 * mm, CONTENT - 24 * mm])
    context.setStyle(TableStyle([
        ("GRID", (0, 0), (-1, -1), 0.45, LINE),
        ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#f8fafc")),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    return [head, Spacer(1, 5), context, Spacer(1, 6)]


def image(name, caption, max_h=86 * mm):
    path = ASSETS / name
    w, h = PILImage.open(path).size
    scale = min(CONTENT / w, max_h / h)
    return [Image(str(path), width=w * scale, height=h * scale), Spacer(1, 2), p(caption, "caption"), Spacer(1, 5)]


def step(number, instruction, check):
    body = p(f"<b>{instruction}</b><br/><font color='#64748b'>ตรวจผล:</font> {check}", "step")
    card = Table([[p(str(number), "number"), body]], colWidths=[14 * mm, CONTENT - 14 * mm])
    card.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (0, 0), GREEN),
        ("BACKGROUND", (1, 0), (1, 0), colors.white),
        ("BOX", (0, 0), (-1, -1), 0.55, LINE),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 7),
        ("RIGHTPADDING", (0, 0), (-1, -1), 7),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    return [card, Spacer(1, 4)]


def note(title, text, warn=False):
    background = WARN_BG if warn else TIP_BG
    color = colors.HexColor("#9a3412") if warn else colors.HexColor("#166534")
    box = Table([[p(f"<b>{title}</b> {text}", "body")]], colWidths=[CONTENT])
    box.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), background),
        ("BOX", (0, 0), (-1, -1), 0.55, color),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    return [box]


def fields(items):
    data = []
    for label, text in items:
        data.append([p(label, "label"), p(text, "body")])
    table = Table(data, colWidths=[53 * mm, CONTENT - 53 * mm])
    table.setStyle(TableStyle([
        ("GRID", (0, 0), (-1, -1), 0.45, LINE),
        ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#f0fdf4")),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 7),
        ("RIGHTPADDING", (0, 0), (-1, -1), 7),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))
    return [table]


def footer(canvas, doc):
    canvas.saveState()
    canvas.setStrokeColor(colors.HexColor("#bbf7d0"))
    canvas.line(LEFT, 11 * mm, PAGE_W - RIGHT, 11 * mm)
    canvas.setFont("Sarabun", 9)
    canvas.setFillColor(MUTED)
    canvas.drawString(LEFT, 6.5 * mm, "Naive MES | คู่มือ Sales | Development Local Workspace")
    canvas.drawRightString(PAGE_W - RIGHT, 6.5 * mm, f"หน้า {doc.page}")
    canvas.restoreState()


def page(story, title, location, when, picture=None, caption=None, picture_height=86 * mm):
    story.append(PageBreak())
    story.extend(section(title, location, when))
    if picture:
        story.extend(image(picture, caption, picture_height))


def build():
    make_assets()
    story = [
        Spacer(1, 24 * mm),
        p("คู่มือการใช้งาน Sales", "cover"),
        Spacer(1, 4 * mm),
        p("Naive MES - คู่มือปฏิบัติงานแบบทีละขั้นตอน", "cover_sub"),
        Spacer(1, 14 * mm),
        p("คู่มือนี้ช่วยให้ทีม Sale เลือก flow ได้ถูกต้อง สร้างดีลได้ครบ และส่งข้อมูลให้ R&D, Production และ Stock ทำงานต่อได้ทันที", "body"),
        Spacer(1, 8 * mm),
    ]
    story.extend(note("วิธีอ่านคู่มือ:", "ทำตามทีละขั้น ไม่ข้ามขั้นตรวจผล และใช้ภาพเป็นบริบทของจุดที่กำลังทำงาน"))
    story.extend([
        Spacer(1, 10 * mm),
        p("ขอบเขต: Kanban, List, สร้างดีล, ตัวอย่างสินค้า, สั่งสินค้า, พัฒนาสูตร, เอกสาร และประวัติลูกค้า", "body"),
        Spacer(1, 46 * mm),
        p("ฉบับสำหรับการใช้งานใน Development", "cover_sub"),
    ])

    page(story, "1. เริ่มต้นที่หน้า Sales", "เมนูซ้ายมือ > Sales", "เริ่มงานขาย หรือต้องตรวจสถานะดีล", "01-board.png", "หน้า Sales แบบบอร์ด: แต่ละคอลัมน์คือ Stage ของดีล")
    story.extend(step(1, "กดเมนู <b>Sales</b> ที่แถบซ้าย", "ชื่อ Sales ต้องถูกไฮไลต์ และเห็นข้อมูลการขายตรงกลางหน้าจอ"))
    story.extend(step(2, "เลือก <b>บอร์ด</b> เมื่อต้องตามงานตาม Stage", "เห็นการ์ดลูกค้าแยกเป็นคอลัมน์"))
    story.extend(step(3, "เลือก <b>ลิสต์</b> เมื่อต้องค้นหาหรืออ่านหลายดีลต่อเนื่อง", "ข้อมูลเดียวกันเปลี่ยนเป็นตาราง ไม่ได้ถูกลบ"))
    story.extend(note("ก่อนเริ่ม:", "ดู Stage ของคอลัมน์ก่อนเสมอ การ์ดชื่อเดียวกันอาจอยู่คนละขั้นตอนงาน", True))

    page(story, "2. อ่าน Kanban card ให้ถูก", "Sales > บอร์ด", "ติดตามลูกค้าแต่ละรายและเปิดดีลที่ต้องทำต่อ", "01-board.png", "การ์ดหนึ่งใบคือหนึ่งดีล: อ่านชื่อ, ประเภทงาน และ Stage ร่วมกัน", 72 * mm)
    story.extend(step(1, "ดูชื่อคอลัมน์ก่อนเลือกการ์ด", "รู้ว่าดีลอยู่ช่วงใดของ pipeline"))
    story.extend(step(2, "ดูชื่อผู้ติดต่อและข้อมูลย่อบนการ์ด", "ยืนยันว่ากำลังจะเปิดดีลของลูกค้าถูกคน"))
    story.extend(step(3, "คลิกการ์ดเมื่อต้องดูเบอร์ ที่อยู่ สินค้า หรือประวัติ", "แผงรายละเอียดดีลเปิดทางขวา"))
    story.extend(note("ข้อควรระวัง:", "อย่าย้าย Stage เพื่อจัดบอร์ดให้สวย ต้องย้ายตามสถานะงานจริงเท่านั้น", True))

    page(story, "3. ใช้เมนูจุดสามจุดบนการ์ด", "Sales > บอร์ด > การ์ดลูกค้า > ...", "ต้องแก้ไข ย้าย Stage หรือลบดีลที่สร้างผิด", "02-card-menu.png", "เมนูของการ์ด: แก้ไขข้อมูลดีล, ย้ายไปยังคอลัมน์ และลบดีล")
    story.extend(step(1, "เลื่อนเมาส์บนการ์ด แล้วกด <b>...</b> มุมขวาบน", "เมนูคำสั่งของดีลนั้นเปิดขึ้น"))
    story.extend(step(2, "กด <b>แก้ไขข้อมูลดีล</b> เมื่อต้องแก้ข้อมูลลูกค้าหรือคำสั่ง", "แผงรายละเอียดด้านขวาเปิดขึ้น"))
    story.extend(step(3, "กด <b>ย้ายไปยังคอลัมน์</b> แล้วเลือก Stage ใหม่", "การ์ดย้ายไปยัง Stage ที่เลือก"))
    story.extend(step(4, "ใช้ <b>ลบดีลลูกค้า</b> เฉพาะดีลซ้ำหรือสร้างผิด", "ตรวจชื่อและ Lead ID ก่อนยืนยัน"))

    page(story, "4. เปิดหน้าต่างสร้างดีล", "Sales > + เพิ่มดีลใหม่ (Lead)", "มีลูกค้าใหม่หรือมีงานใหม่ของลูกค้าเดิม", "03-new-lead.png", "หน้าต่างสร้างดีล: ข้อมูลลูกค้าด้านซ้าย และเลือกประเภทคำสั่งด้านขวา", 78 * mm)
    story.extend(step(1, "กด <b>+ เพิ่มดีลใหม่ (Lead)</b>", "เห็นหน้าต่างสร้างดีล"))
    story.extend(step(2, "เลือกหรือพิมพ์ชื่อลูกค้า/คลินิก/บริษัท", "ข้อมูลติดต่อเดิมเติมกลับมาเมื่อเป็นลูกค้าเก่า"))
    story.extend(step(3, "ตรวจเบอร์โทรและที่อยู่ผู้รับ", "ใส่ครบก่อนเลือก flow ที่ต้องมีการจัดส่ง"))
    story.extend(step(4, "เลือก Stage ที่ดีลควรเริ่มอยู่", "หลังบันทึก การ์ดจะอยู่คอลัมน์นี้"))
    story.extend(note("จำง่าย:", "ตัวอย่างสินค้า = ของที่มี stock, สั่งสินค้า = งานผลิตสูตรมีอยู่แล้ว, พัฒนาสูตรเอง = ขอให้ R&D คิดสูตรใหม่", False))

    page(story, "5. Flow ตัวอย่างสินค้า", "สร้างดีล > แท็บ ตัวอย่างสินค้า", "ลูกค้าต้องการทดลองสินค้าที่มีอยู่ใน stock", "04-sample-stock.png", "Checklist ตัวอย่างสินค้า: ติ๊กเฉพาะรายการที่ลูกค้าขอ และดูป้ายคงเหลือ", 76 * mm)
    story.extend(step(1, "เลือกแท็บ <b>ตัวอย่างสินค้า</b>", "ด้านขวาแสดงรายการสินค้าตัวอย่าง"))
    story.extend(step(2, "ติ๊กสินค้าที่ลูกค้าขอทดลอง", "ช่องจำนวนของรายการนั้นพร้อมใช้งาน"))
    story.extend(step(3, "ระบุจำนวนเป็นชิ้น", "จำนวนต้องมากกว่า 0 และไม่เกิน stock ที่แสดง"))
    story.extend(step(4, "กด <b>Create Lead</b> หลังตรวจผู้รับและรายการ", "กลับไปเห็นดีลใหม่บนบอร์ด"))
    story.extend(note("ห้ามใช้ flow นี้เมื่อ:", "ลูกค้าขอสูตรเฉพาะแบรนด์หรือยังไม่มีสินค้าใน stock ให้เลือกพัฒนาสูตรเองแทน", True))

    page(story, "6. Flow สั่งสินค้าและเปิดใบสั่งผลิต", "สร้างดีล > แท็บ สั่งสินค้า", "ลูกค้าตกลงผลิตสินค้าหรือสั่งสินค้าที่มีสูตรอยู่แล้ว", "05-production-order.png", "แท็บสั่งสินค้า: เริ่มจากเพิ่มใบสั่งผลิต แล้วจึงกรอกสูตร ขนาด จำนวน และสเปก", 82 * mm)
    story.extend(step(1, "เลือกแท็บ <b>สั่งสินค้า</b>", "เห็นส่วนรายการใบสั่งผลิต"))
    story.extend(step(2, "กด <b>เพิ่มใบสั่งผลิต</b>", "มีรายการผลิตใหม่ให้เลือกสูตรและกำหนดจำนวน"))
    story.extend(step(3, "เลือกสูตร/สินค้า ขนาด และจำนวนที่ลูกค้าสั่ง", "ข้อมูลนี้ส่งต่อให้ Production ใช้เปิดงาน"))
    story.extend(step(4, "กดปุ่มรายละเอียดของรายการผลิตเพื่อระบุสเปก", "หน้าต่างตั้งค่าข้อมูลสินค้าเปิดขึ้น"))
    story.extend(note("ก่อนบันทึก:", "หาก R&D ยังต้องคิดสูตร ห้ามเปิดเป็นสั่งสินค้า เพราะจะถูกตีความเป็นงานผลิต", True))

    page(story, "7. กรอกสเปกสินค้า: แบรนด์และอุปกรณ์", "สั่งสินค้า > รายการใบสั่งผลิต > รายละเอียด", "ต้องบอก Production และ Stock ว่าสินค้าจะถูกทำและแพ็กอย่างไร", "06-product-spec.png", "หน้าต่างสเปกสินค้า: กรอกแบรนด์ แล้วเลือกบรรจุภัณฑ์ หัวฉีด และกลิ่น", 88 * mm)
    story.extend(step(1, "กรอก <b>แบรนด์</b> ที่จะผลิต", "งาน OEM ต้องเป็นชื่อแบรนด์ลูกค้า ไม่ใช่ชื่อบริษัทผู้ผลิต"))
    story.extend(step(2, "เลือก <b>บรรจุภัณฑ์</b>", "ดูข้อความ stock ใต้ช่องเลือก"))
    story.extend(step(3, "เลือก <b>หัวฉีด</b> ให้เข้ากับบรรจุภัณฑ์", "ชนิดหัวฉีดและจำนวนต้องใช้งานร่วมกันได้"))
    story.extend(step(4, "เลือกหรือเพิ่ม <b>กลิ่น</b> ตามที่ลูกค้าอนุมัติ", "ถ้ายังไม่อนุมัติ ให้เขียนสถานะไว้ในหมายเหตุ"))
    story.extend(note("สัญญาณหยุดงาน:", "ข้อความ “ไม่มีในสต็อก” ของขวดหรือหัวฉีดต้องแจ้ง Stock ก่อน ไม่ใช่สร้างดีลแล้วปล่อยให้ทีมถัดไปแก้", True))

    page(story, "8. กรอกสเปกสินค้า: จำนวนและฉลาก", "หน้าต่างตั้งค่าข้อมูลสินค้า > เลื่อนลง", "ข้อมูลสำหรับแพ็กสินค้าและเอกสารการผลิต", "06-product-spec.png", "เลื่อนลงในหน้าต่างเดิมเพื่อกรอกข้อมูลส่วนล่างให้ครบ", 62 * mm)
    story.extend(fields([
        ("ขนาดขวด (ml)", "เช่น 30, 50, 100 หรือ 250 ml - ต้องตรงกับบรรจุภัณฑ์ที่เลือก"),
        ("ปริมาณที่ใส่จริง (ml)", "ปริมาณน้ำยาต่อชิ้น - ห้ามเกินขนาดบรรจุภัณฑ์"),
        ("จำนวนขวด/หัวฉีด", "ต้องเท่ากับจำนวนชิ้นที่สั่งผลิต เพื่อให้ Stock เตรียมของได้ครบ"),
        ("สติ๊กเกอร์และขนาด", "ระบุแบบฉลาก ขนาด และสถานะว่า พร้อมใช้ / รอผลิต / รออนุมัติ"),
        ("ตำแหน่งยิง LOT", "บอกตำแหน่งที่จะพิมพ์ล็อตบนสินค้าให้ชัด เช่น ใต้ขวด หรือบนฉลาก"),
        ("หมายเหตุ", "ใช้สำหรับข้อกำหนดพิเศษ เช่น ฝาสีดำ หรือเงื่อนไขแจ้งเลขล็อต"),
    ]))
    story.extend([Spacer(1, 6)])
    story.extend(note("จุดตรวจ:", "กดบันทึกข้อมูลสเปกใน modal ก่อน แล้วกลับไปกด Create Lead หรือ Save Changes ของดีลอีกครั้ง", False))

    page(story, "9. Flow พัฒนาสูตรเอง", "สร้างดีล > แท็บ พัฒนาสูตรเอง", "ลูกค้าต้องการสูตรใหม่หรือสูตรเฉพาะแบรนด์", "07-develop-form.png", "ส่วนพัฒนาสูตร: ชื่อสูตร, แบรนด์, ปุ่มรายละเอียด, ใบสั่งพัฒนาสูตร และปุ่มเพิ่มสูตร", 80 * mm)
    story.extend(step(1, "เลือกแท็บ <b>พัฒนาสูตรเอง</b>", "เห็นกรอบคำสั่งพัฒนาสูตรสีม่วง"))
    story.extend(step(2, "กรอก <b>ชื่อสูตร/ผลิตภัณฑ์</b>", "R&D รู้ว่าคำขอนี้เป็นสินค้าอะไร"))
    story.extend(step(3, "กรอก <b>แบรนด์</b>", "เอกสารและ R&D เห็นว่าเป็นแบรนด์ใด"))
    story.extend(step(4, "กด <b>รายละเอียด</b> เพื่อบันทึก brief", "หน้าต่างรายละเอียดใบสั่งพัฒนาสูตรเปิดขึ้น"))
    story.extend(note("ความต่างสำคัญ:", "งานพัฒนาสูตรไม่มีจำนวนชิ้นแบบงานผลิต และประวัติของงานนี้ต้องแสดงสถานะ “พัฒนาสูตร” ไม่ใช่ “อยู่ในคลัง”", True))

    page(story, "10. รายละเอียดใบสั่งพัฒนาสูตร: ส่วนเป้าหมาย", "พัฒนาสูตรเอง > รายละเอียด", "แปลงคำขอของลูกค้าให้ R&D เริ่มพัฒนาสูตรได้", "07-develop-form.png", "กด “รายละเอียด” ในแต่ละสูตร เพื่อเปิดฟอร์ม brief ของสูตรนั้น", 54 * mm)
    story.extend(fields([
        ("หมวดผลิตภัณฑ์", "เช่น แชมพู, ครีม, เซรั่ม, สเปรย์ หรือเจล"),
        ("สัตว์ + ผิวเป้าหมาย", "ระบุผู้ใช้และปัญหา เช่น สุนัขผิวแพ้ง่าย หรือแมวขนยาว"),
        ("Claim ที่อยากได้", "ผลลัพธ์ที่ลูกค้าต้องการ เช่น ลดคัน, ขนนุ่ม, ลดกลิ่น"),
        ("สารสกัดออกฤทธิ์", "สารที่ลูกค้าต้องการให้มีในสูตร ถ้ามี"),
        ("ลักษณะเนื้อ + สี + กลิ่น", "อธิบายเนื้อสัมผัส สี และกลิ่นให้จับต้องได้"),
        ("สารต้องมี / สารต้องห้าม", "ระบุข้อห้ามชัดเจน เช่น ไม่ใช้ SLS หรือไม่ใส่น้ำหอม"),
    ]))
    story.extend([Spacer(1, 6)])
    story.extend(note("ตัวอย่างที่ดี:", "“แชมพูสุนัขผิวแพ้ง่าย เนื้อเจลใส กลิ่นลาเวนเดอร์อ่อน ไม่ใส่ SLS ต้องการลดคัน”", False))

    page(story, "11. รายละเอียดใบสั่งพัฒนาสูตร: เงื่อนไขธุรกิจ", "พัฒนาสูตรเอง > รายละเอียด > เลื่อนลง", "ให้ R&D ประเมินต้นทุน ระยะเวลา และข้อจำกัดได้ครบ", "07-develop-form.png", "ฟอร์มรายละเอียดเป็นของสูตรแต่ละรายการ จึงต้องบันทึกให้ครบทุกสูตร", 54 * mm)
    story.extend(fields([
        ("งบต่อหน่วย + จำนวน", "ระบุหน่วยให้ชัด เช่น ต้นทุนไม่เกิน 35 บาท/ชิ้น และต้องการทดลอง 3 สูตร"),
        ("Timeline กำหนดส่ง", "ใช้วันที่หรือระยะเวลาชัดเจน เช่น ต้องการตัวอย่างภายใน 7 วัน"),
        ("ตัวอย่างอ้างอิง", "ชื่อสินค้า benchmark, รูป, ลิงก์ หรือคำอธิบายที่เปรียบเทียบได้"),
        ("บรรจุภัณฑ์เป้าหมาย", "เช่น ขวด 300 ml ปั๊ม หรือซอง เพื่อประเมินเนื้อและความเข้ากัน"),
        ("ตลาด + มาตรฐาน", "เช่น อย., FDA, ส่งออก หรือข้อกำหนดเฉพาะตลาด"),
        ("Shelf life และ IP/NDA", "อายุสินค้าที่ต้องการและเงื่อนไขสิทธิ์ของสูตรที่ห้ามละเลย"),
        ("Brief Note", "ข้อมูลเพิ่มเติมที่ไม่เข้าหัวข้ออื่น แต่จำเป็นต่อการตัดสินใจของ R&D"),
    ]))

    page(story, "12. เพิ่มสูตรที่ 2 และบันทึกดีล", "พัฒนาสูตรเอง > ปุ่ม เพิ่มใบสั่งพัฒนาสูตร", "ลูกค้าต้องการพัฒนาได้มากกว่าหนึ่งสูตรในดีลเดียว", "07-develop-form.png", "ปุ่มเพิ่มใบสั่งพัฒนาสูตรสร้าง “สูตรที่ 2” แยกจากสูตรแรก", 54 * mm)
    story.extend(step(1, "กด <b>เพิ่มใบสั่งพัฒนาสูตร</b>", "ระบบเพิ่มการ์ด “สูตรที่ 2”"))
    story.extend(step(2, "กรอกชื่อสูตรและแบรนด์ของสูตรที่ 2", "ข้อมูลไม่ปนกับสูตรที่ 1"))
    story.extend(step(3, "กดรายละเอียดของแต่ละสูตร แล้วบันทึก brief แยกกัน", "สูตรทุกตัวมีรายละเอียดของตัวเอง"))
    story.extend(step(4, "กด <b>Create Lead</b>", "ดีลส่งต่อ R&D พร้อมรายการพัฒนาสูตร"))
    story.extend(note("อย่าทำแบบนี้:", "ห้ามรวมสองสูตรไว้ในช่องชื่อสูตรเดียว เพราะ R&D จะติดตามผล ทดสอบ และออกเอกสารแยกไม่ถูก", True))

    page(story, "13. เปิดรายละเอียดดีลและบันทึกการแก้ไข", "Sales > คลิกการ์ด หรือคลิกแถวใน List", "ตรวจข้อมูลลูกค้า เปลี่ยน Stage หรือเปิดเอกสารจากประวัติ", "08-deal-detail.png", "แผงรายละเอียดด้านขวา: ชื่อและ Lead ID อยู่บนสุด ส่วนคำสั่งและประวัติอยู่ด้านล่าง", 92 * mm)
    story.extend(step(1, "ตรวจชื่อดีลและ <b>Lead ID</b> ก่อนแก้", "ยืนยันว่าเป็นลูกค้ารายที่ต้องการ"))
    story.extend(step(2, "แก้ชื่อ เบอร์ ที่อยู่ หรือประเภทคำสั่งตามข้อมูลล่าสุด", "ข้อมูลในแผงต้องตรงกับข้อมูลที่ลูกค้ายืนยัน"))
    story.extend(step(3, "เลือก Stage ใหม่จากช่อง <b>ย้ายสถานะ</b>", "Stage ในบอร์ดเปลี่ยนเมื่อกดบันทึก"))
    story.extend(step(4, "กด <b>Save Changes</b> ก่อนปิดแผง", "เปิดดีลอีกครั้งแล้วข้อมูลต้องยังอยู่"))

    page(story, "14. อ่านประวัติและสถานะให้ถูก", "รายละเอียดดีล > ประวัติใบสั่งผลิตที่เสร็จแล้ว", "ลูกค้ากลับมาสั่งซ้ำ หรือต้องตรวจว่างานเก่าเป็นประเภทใด", "08-deal-detail.png", "ประวัติอยู่ส่วนล่างของแผงรายละเอียด ใช้เทียบงานเก่าก่อนเปิดงานใหม่", 64 * mm)
    story.extend(fields([
        ("พัฒนาสูตร", "เป็นคำขอที่ให้ R&D พัฒนาสูตร - ไม่มีจำนวนชิ้น และไม่ควรแสดงว่าอยู่ในคลัง"),
        ("อยู่ในคลัง", "ใช้กับสินค้าหรือสูตรโรงงานที่ผลิตเสร็จแล้วและเป็น stock จริง เช่น Oil Shampoo สูตรโรงงาน"),
        ("Retention 1", "เมื่อเข้าช่วงติดตามผล ระบบต้องปิดข้อมูลคำขอพัฒนาสูตรเดิม และแสดงการเป็นลูกค้าเก่า"),
        ("ดาวลูกค้าเก่า", "ใช้เตือน Sale ว่าลูกค้ามีประวัติกับบริษัท แต่ยังต้องยืนยันข้อมูลติดต่อและเงื่อนไขปัจจุบัน"),
    ]))

    page(story, "15. ดาวน์โหลดเอกสารให้ตรงสถานะ", "พัฒนาสูตรเอง > ใบสั่งพัฒนาสูตร หรือรายละเอียดดีล > ประวัติ", "พิมพ์หรือบันทึก PDF เพื่อส่งต่อทีมและลูกค้า", "08-develop-document-button.png", "ปุ่มใบสั่งพัฒนาสูตรอยู่ในแต่ละการ์ดสูตร - ดาวน์โหลดได้ก่อนสร้างดีลหรือจากประวัติ", 43 * mm)
    story.extend(step(1, "ตรวจว่างานนั้นเป็นพัฒนาสูตรหรือสั่งสินค้า", "เลือกชนิดเอกสารถูกก่อนกดดาวน์โหลด"))
    story.extend(step(2, "ถ้า R&D ยังไม่ pass ให้ดาวน์โหลด Requirements Brief", "ได้เอกสารหน้าเดียวเท่านั้น"))
    story.extend(step(3, "ถ้า R&D pass แล้ว ให้ดาวน์โหลดเอกสารพัฒนาสูตร", "ได้เอกสารเดียว 2 หน้า: Requirement หน้า 1 และสูตร/วิธีทำ หน้า 2"))
    story.extend(step(4, "ตรวจหน้าก่อน Save as PDF หรือ Print", "หน้า 2 ต้องมีเฉพาะสูตรที่ pass และไม่มีข้อความ “อยู่ระหว่างทดสอบ”"))
    story.extend(note("เอกสารหน้า 2:", "ตารางสูตรต้องมีเพียง ขั้นตอน, ชื่อสารเคมี, กลุ่ม, 100 ก., และต่อ 1 กก. พร้อมวิธีผลิตและหมายเหตุสูตร", False))

    page(story, "16. ใช้ List เพื่อค้นหาและตรวจหลายดีล", "Sales > ลิสต์", "ต้องค้นหาลูกค้าอย่างรวดเร็ว หรือเทียบข้อมูลจำนวนมาก", "09-list.png", "List แสดงดีลเป็นตาราง เหมาะกับการค้นหาด้วยชื่อหรือเบอร์โทร", 82 * mm)
    story.extend(step(1, "กด <b>ลิสต์</b>", "บอร์ดเปลี่ยนเป็นตาราง"))
    story.extend(step(2, "ใช้ช่องค้นหาด้วยชื่อหรือเบอร์โทร", "รายการที่ตรงเงื่อนไขถูกกรอง"))
    story.extend(step(3, "คลิกแถวลูกค้าเพื่อเปิดรายละเอียด", "แผงด้านขวาเปิดพร้อม Lead ID"))
    story.extend(step(4, "กลับไปบอร์ดเมื่อต้องติดตามตาม Stage", "ข้อมูลยังเหมือนเดิม เพียงเปลี่ยนมุมมอง"))

    page(story, "17. เช็กลิสต์ก่อนสร้างหรือส่งต่อดีล", "ก่อนกด Create Lead หรือ Save Changes", "ลดการถามข้อมูลซ้ำและความผิดพลาดข้ามทีม")
    story.extend(fields([
        ("ข้อมูลลูกค้า", "ชื่อ, เบอร์โทร, ที่อยู่ผู้รับ และ Stage ถูกต้อง"),
        ("เลือก flow", "Sample / สั่งสินค้า / พัฒนาสูตรเอง ตรงกับสิ่งที่ลูกค้าขอวันนี้"),
        ("งานตัวอย่าง", "รายการและจำนวนไม่เกิน stock"),
        ("งานผลิต", "สูตร, จำนวน, แบรนด์, บรรจุภัณฑ์, หัวฉีด, กลิ่น และฉลากครบ"),
        ("งานพัฒนาสูตร", "ชื่อสูตร, แบรนด์ และรายละเอียด brief ครบสำหรับแต่ละสูตร"),
        ("เอกสาร", "R&D ไม่ pass = 1 หน้า; pass = เอกสารเดียว 2 หน้า"),
        ("บันทึก", "กด Save Changes หรือ Create Lead และเปิดตรวจข้อมูลซ้ำ"),
    ]))
    story.extend([Spacer(1, 7)])
    story.extend(note("เมื่อพบข้อมูลผิด:", "จด Lead ID, ชื่อลูกค้า, วันเวลา และแนบภาพหน้าจอให้ทีมที่เกี่ยวข้อง แทนการเดาสถานะหรือแก้ข้อมูลของงานอื่น", True))
    story.extend([Spacer(1, 7), p("กรณีที่ต้องหยุดและแจ้งทีมที่เกี่ยวข้อง", "body_bold"), Spacer(1, 3)])
    story.extend(fields([
        ("ขวด/หัวฉีดไม่มี stock", "แจ้ง Stock ก่อนสร้างหรือส่งงานผลิต"),
        ("ยังไม่มีสูตรที่ใช้ผลิต", "เปิดเป็นพัฒนาสูตรเองและส่ง brief ให้ R&D"),
        ("สถานะหรือ badge ไม่ตรง", "บันทึก Lead ID พร้อมภาพหน้าจอ แล้วแจ้งผู้ดูแลระบบ"),
        ("เอกสารออกจำนวนหน้าผิด", "หยุดส่งเอกสาร ตรวจสถานะ R&D และแจ้งผู้ดูแลระบบ"),
    ]))

    doc = SimpleDocTemplate(str(PDF), pagesize=A4, leftMargin=LEFT, rightMargin=RIGHT, topMargin=TOP, bottomMargin=BOTTOM)
    doc.build(story, onFirstPage=footer, onLaterPages=footer)
    print(PDF)


if __name__ == "__main__":
    build()
