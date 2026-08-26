from pathlib import Path

from PIL import Image as PILImage
from create_rnd_manual_annotations import build_annotations
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Image, PageBreak, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle


ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "output" / "pdf" / "rnd_manual_annotated_assets"
OUTPUT = ROOT / "output" / "pdf" / "naive_mes_rnd_manual.pdf"
MANUAL = ROOT / "docs" / "manual" / "03-คู่มือ-R&D-ฉบับใหม่.pdf"
ANNOTATED_MANUAL = ROOT / "docs" / "manual" / "03-คู่มือ-R&D-Mock-Data-พร้อมจุดชี้.pdf"
ANNOTATED_MANUAL_V2 = ROOT / "docs" / "manual" / "03-คู่มือ-R&D-Mock-Data-พร้อมจุดชี้-v2.pdf"
ANNOTATED_MANUAL_V3 = ROOT / "docs" / "manual" / "03-คู่มือ-R&D-แยกประเภทงาน-v3.pdf"
FONTS = ROOT / "output" / "pdf" / "fonts"

PAGE_W, PAGE_H = A4
LEFT = 17 * mm
RIGHT = 17 * mm
TOP = 20 * mm
BOTTOM = 16 * mm
WIDTH = PAGE_W - LEFT - RIGHT

NAVY = colors.HexColor("#102a43")
SLATE = colors.HexColor("#475569")
GREEN = colors.HexColor("#16a34a")
LINE = colors.HexColor("#cbd5e1")
TEXT = colors.HexColor("#1e293b")

pdfmetrics.registerFont(TTFont("THSarabun", str(FONTS / "THSarabunNew.ttf")))
pdfmetrics.registerFont(TTFont("THSarabunBold", str(FONTS / "THSarabunNew-Bold.ttf")))

styles = getSampleStyleSheet()
styles.add(ParagraphStyle("RndTitle", fontName="THSarabunBold", fontSize=18, leading=22, textColor=NAVY, spaceAfter=4))
styles.add(ParagraphStyle("RndSubtitle", fontName="THSarabunBold", fontSize=14, leading=18, textColor=SLATE, spaceAfter=5))
styles.add(ParagraphStyle("RndBody", fontName="THSarabun", fontSize=12, leading=16, textColor=TEXT))
styles.add(ParagraphStyle("RndStepHead", fontName="THSarabunBold", fontSize=18, leading=22, textColor=NAVY))
styles.add(ParagraphStyle("RndStepNumber", fontName="THSarabunBold", fontSize=17, leading=21, textColor=NAVY))
styles.add(ParagraphStyle("RndStepBody", fontName="THSarabun", fontSize=16, leading=21, textColor=TEXT))
styles.add(ParagraphStyle("RndSmall", fontName="THSarabun", fontSize=11, leading=14, textColor=SLATE))
styles.add(ParagraphStyle("RndCover", fontName="THSarabunBold", fontSize=30, leading=35, alignment=TA_CENTER, textColor=NAVY))
styles.add(ParagraphStyle("RndCoverSub", fontName="THSarabun", fontSize=16, leading=21, alignment=TA_CENTER, textColor=SLATE))
styles.add(ParagraphStyle("RndTableHead", fontName="THSarabunBold", fontSize=14, leading=17, textColor=NAVY))


def p(text, style="RndBody"):
    return Paragraph(text, styles[style])


def page_chrome(canvas, doc):
    canvas.saveState()
    canvas.setStrokeColor(LINE)
    canvas.line(LEFT, PAGE_H - 12 * mm, PAGE_W - RIGHT, PAGE_H - 12 * mm)
    canvas.line(LEFT, 10 * mm, PAGE_W - RIGHT, 10 * mm)
    canvas.setFillColor(NAVY)
    canvas.setFont("THSarabunBold", 12)
    canvas.drawString(LEFT, PAGE_H - 10 * mm, "NAIVE INNOVA")
    canvas.setFont("THSarabun", 12)
    canvas.drawRightString(PAGE_W - RIGHT, PAGE_H - 10 * mm, "คู่มือการใช้งานระบบ R&D")
    canvas.setFillColor(SLATE)
    canvas.drawString(LEFT, 6 * mm, "Development Local Workspace")
    canvas.drawRightString(PAGE_W - RIGHT, 6 * mm, f"หน้า {doc.page}")
    canvas.restoreState()


def screenshot(name, max_w=WIDTH, max_h=88 * mm):
    path = ASSETS / name
    with PILImage.open(path) as image:
        width, height = image.size
    scale = min(max_w / width, max_h / height)
    return Image(str(path), width=width * scale, height=height * scale)


def task(story, code, title, purpose, image_name, steps, result, caution, max_h=88 * mm):
    story.append(PageBreak())
    story.append(p(f"{code} {title}", "RndTitle"))
    story.append(p(purpose, "RndSubtitle"))
    story.append(Spacer(1, 2 * mm))
    image = screenshot(image_name, WIDTH, max_h)

    rows = [[p(str(index), "RndStepNumber"), p(step, "RndStepBody")] for index, step in enumerate(steps, 1)]
    step_table = Table(rows, colWidths=[10 * mm, WIDTH - 10 * mm])
    step_table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 4),
        ("TOPPADDING", (0, 0), (-1, -1), 2),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
    ]))

    detail = [
        p("ขั้นตอนการใช้งาน", "RndStepHead"),
        Spacer(1, 1 * mm),
        step_table,
        Spacer(1, 2 * mm),
        p("ตรวจสอบหลังทำ", "RndStepHead"),
        p(result, "RndStepBody"),
        Spacer(1, 2 * mm),
        p("ข้อควรระวัง", "RndStepHead"),
        p(caution, "RndStepBody"),
    ]
    detail_table = Table([[detail]], colWidths=[WIDTH])
    detail_table.setStyle(TableStyle([
        ("LINEABOVE", (0, 0), (-1, 0), 0.6, LINE),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
    ]))

    bundle = Table([[image], [detail_table]], colWidths=[WIDTH])
    bundle.setStyle(TableStyle([
        ("ALIGN", (0, 0), (-1, 0), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ("TOPPADDING", (0, 0), (-1, 0), 0),
        ("BOTTOMPADDING", (0, 0), (-1, 0), 0),
        ("TOPPADDING", (0, 1), (-1, 1), 8),
        ("BOTTOMPADDING", (0, 1), (-1, 1), 0),
    ]))
    story.append(bundle)


def build():
    build_annotations()
    story = [
        Spacer(1, 48 * mm),
        p("คู่มือการใช้งานระบบ R&D", "RndCover"),
        Spacer(1, 8 * mm),
        p("Naive MES | สำหรับฝ่ายวิจัยและพัฒนาสูตร", "RndCoverSub"),
        Spacer(1, 16 * mm),
        p(
            "คู่มือแบบทีละขั้นตอน ตั้งแต่รับใบสั่ง ตรวจสูตรและสารเคมี "
            "เริ่มผลิต ตรวจ In-Process QC จนถึงจัดการสูตร BOM",
            "RndCoverSub",
        ),
        Spacer(1, 42 * mm),
        p("ฉบับใช้งานใน Development Local Workspace", "RndCoverSub"),
        PageBreak(),
        p("ภาพรวมหน้าที่ของ R&D", "RndTitle"),
        p("สิ่งที่ต้องตรวจให้ครบก่อนเริ่มทำงาน", "RndSubtitle"),
        p(
            "R&D เป็นผู้ตรวจความถูกต้องของสูตร ปริมาณสารเคมี วิธีการผลิต และหลักฐาน QC "
            "ก่อนส่งงานต่อไปยังฝ่ายผลิต ทุกการยืนยันเริ่มผลิตมีผลต่อสต็อกสารเคมีจริง",
            "RndStepBody",
        ),
        Spacer(1, 6 * mm),
    ]

    workflow = [
        ["1", "รับใบสั่งผลิต/พัฒนาสูตร", "ตรวจประเภทงาน สูตร ปริมาณ และสต็อกสารเคมี"],
        ["2", "กำลังผลิต/กำลังพัฒนาสูตร", "ติดตามงานที่ยืนยันเริ่มแล้ว"],
        ["3", "Inprocess QC", "บันทึกผลตรวจ รูปเนื้อสาร และผล Pass/ไม่ผ่าน"],
        ["4", "งานที่เสร็จสิ้นแล้ว", "ตรวจงานที่ R&D อนุมัติและส่งต่อแล้ว"],
        ["5", "Stock วัตถุดิบสารเคมี", "ตรวจยอดคงเหลือ สถานะต่ำ และหมดคลัง"],
        ["6", "สูตรคำนวณ BOM", "ดูตารางเปรียบเทียบและจัดการสูตรผลิต"],
    ]
    table = Table(
        [[p("ลำดับ", "RndTableHead"), p("แท็บ", "RndTableHead"), p("ใช้ทำอะไร", "RndTableHead")]]
        + [[p(a, "RndStepNumber"), p(b, "RndStepBody"), p(c, "RndStepBody")] for a, b, c in workflow],
        colWidths=[18 * mm, 62 * mm, 95 * mm],
    )
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#e2e8f0")),
        ("GRID", (0, 0), (-1, -1), 0.5, LINE),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))
    story.append(table)

    task(
        story, "1.", "เข้าใจหน้า R&D และ 6 แท็บ",
        "เริ่มงานทุกวันจากการตรวจจำนวนงานค้างด้านบน",
        "01-overview.png",
        [
            "กดเมนู R&D ทางซ้าย",
            "อ่านตัวเลขบนแท็บทั้ง 6 เพื่อดูจำนวนงานหรือข้อมูลที่รอตรวจ",
            "ใช้ช่องค้นหาเมื่อต้องการหาลูกค้า ชื่อสูตร หรือแบรนด์",
            "กด รีเฟรช หลังมีการส่งงานมาจาก Sales หรือ Production",
        ],
        "เห็นรายการงานในแท็บรับใบสั่ง และเห็นจำนวนของแต่ละแท็บตรงกับข้อมูลล่าสุด",
        "อย่าใช้ตัวเลขจำนวนงานเป็นหลักฐานว่างานเสร็จ ต้องเปิดรายการและตรวจสถานะภายในด้วย",
    )
    task(
        story, "2.", "แยกประเภทใบรับงาน R&D ให้ถูกต้อง",
        "ใบรับงานสามประเภทมีต้นทางสูตร งานที่ต้องทำ และผลลัพธ์ต่างกัน ต้องอ่าน badge บนการ์ดก่อนเปิดงาน",
        "02-order-types.png",
        [
            "<b>พัฒนาสูตร</b> — ใช้เมื่อลูกค้ายังไม่มีสูตรพร้อมผลิต R&D ต้องอ่าน Requirements Brief และสร้างสูตรใหม่ตามสเปก อาจทำหลายสูตรทดลองจนได้สูตรที่ Pass ก่อนบันทึกเป็นสูตรที่อนุมัติ งานประเภทนี้ไม่ควรแสดงจำนวนชิ้นหรือสถานะอยู่ในคลังระหว่างพัฒนา",
            "<b>ปรับสูตร</b> — ใช้เมื่อมีสูตรเดิมเป็นฐาน แต่ลูกค้าต้องการเปลี่ยนคุณสมบัติ กลิ่น เนื้อสัมผัส หรือวัตถุดิบ R&D ต้องคัดลอกสูตรเดิมเป็นสูตรปรับปรุง แก้เฉพาะรายการที่ตกลง คำนวณ BOM และทำ QC ใหม่ ห้ามแก้ทับสูตรต้นฉบับที่ลูกค้ารายอื่นใช้อยู่",
            "<b>สูตรโรงงาน</b> — ใช้สูตรมาตรฐานที่ผ่านการอนุมัติแล้วโดยไม่เปลี่ยนองค์ประกอบ R&D ตรวจชื่อสูตร ปริมาณล็อต วิธีผลิต และสต็อกสารเคมี จากนั้นยืนยันเริ่มผลิตและตัดสต็อก ไม่ต้องสร้าง Requirements Brief หรือพัฒนาสูตรใหม่",
        ],
        "ประเภทบนการ์ดตรงกับความต้องการลูกค้า และทีมทราบว่าจะสร้างสูตรใหม่ ปรับจากสูตรเดิม หรือผลิตตามสูตรมาตรฐาน",
        "อย่าตัดสินประเภทจากชื่อสินค้าเพียงอย่างเดียว หากลูกค้าขอเปลี่ยนสูตรโรงงานแม้เพียงบางส่วน ต้องเปลี่ยนเป็นงานปรับสูตรก่อนเริ่มทำ",
        82 * mm,
    )
    task(
        story, "3.", "เลือกใบสั่งและตรวจข้อมูลลูกค้า",
        "ใช้ก่อนตรวจสูตรหรือตัดสต็อกสารเคมีทุกครั้ง",
        "02-order.png",
        [
            "อยู่ที่แท็บ รับใบสั่งผลิต/พัฒนาสูตร",
            "เลือกการ์ดจากชื่อ ลูกค้า สูตร และประเภทงานที่ต้องการ",
            "ตรวจข้อมูลด้านขวา: ลูกค้า แบรนด์ สูตรสั่งผลิต และจำนวนที่สั่ง",
            "ตรวจประเภทงานให้ชัด: ผลิตตามสูตรโรงงาน ปรับสูตร หรือพัฒนาสูตรเอง",
        ],
        "แผงด้านขวาแสดงข้อมูลของการ์ดที่เลือก และชื่อสูตรตรงกับใบสั่ง",
        "ห้ามยืนยันงานจากชื่อคล้ายกัน ให้เทียบชื่อลูกค้า ชื่อสูตร และจำนวนทุกครั้ง",
    )
    task(
        story, "4.", "อ่านตารางสารเคมีและหน่วยให้ถูกต้อง",
        "ใช้คำนวณว่าสารแต่ละตัวเพียงพอสำหรับล็อตหรือไม่",
        "03-chemicals.png",
        [
            "อ่านคอลัมน์ ขั้นตอน และกลุ่ม เพื่อทราบลำดับการผสม A, B, C",
            "คอลัมน์ 100 ก. คือปริมาณต่อผลิตภัณฑ์ 100 กรัม",
            "คอลัมน์ ต่อ 1 กก. คือสูตรฐาน 1,000 กรัม",
            "คอลัมน์ ต้องใช้ คือปริมาณสารเคมีที่ต้องเบิกสำหรับล็อตนี้",
            "คอลัมน์ สต็อก คือยอดคงเหลือจริง ให้เปรียบเทียบกับ ต้องใช้ และตรวจสัญลักษณ์สถานะว่าสารเพียงพอ",
        ],
        "สารทุกตัวที่ต้องใช้มีสต็อกพอ และยอดรวมสูตรตรงกับ 1,000 กรัม",
        "ห้ามคูณหรือหาร 1,000 ซ้ำ ระบบแสดงหน่วยกรัมที่คำนวณแล้ว หากยอดผิดให้หยุดและตรวจสูตร BOM",
        82 * mm,
    )
    task(
        story, "5.", "ตั้งวิธีการ QC ก่อนเริ่มผลิต",
        "กำหนดสิ่งที่ต้องตรวจและหลักฐานที่ต้องบันทึกใน In-Process QC",
        "04-qc-method.png",
        [
            "เลื่อนลงมาที่หัวข้อ วิธีการ QC",
            "ตรวจแถว รูปเนื้อสาร ซึ่งเป็นรายการบังคับและส่งต่อไป Final QC",
            "กด เพิ่มขั้นตอนตรวจ เมื่อต้องตรวจสี กลิ่น ค่า pH หรือคุณสมบัติอื่น",
            "เลือกประเภท: ผ่าน/ไม่ผ่าน, ผ่าน/ไม่ผ่านพร้อมแนบรูป หรือกรอกค่าที่วัดได้",
            "รอให้สถานะบันทึกอัตโนมัติแสดงว่าบันทึกแล้วก่อนเปลี่ยนรายการ",
        ],
        "รายการ QC ครบตามมาตรฐานสูตร และแถวรูปเนื้อสารยังอยู่เป็นรายการแรก",
        "อย่าลบหรือเปลี่ยนความหมายของรูปเนื้อสาร เพราะฝ่ายผลิตใช้ภาพนี้ใน Final QC",
        75 * mm,
    )
    task(
        story, "6.", "ยืนยันเริ่มผลิตและตัดสต็อกสารเคมี",
        "ใช้เมื่อข้อมูลสูตร วิธี QC และสต็อกผ่านการตรวจครบแล้วเท่านั้น",
        "05-confirm-production.png",
        [
            "ตรวจว่าสารทุกตัวแสดงสถานะเพียงพอ",
            "ทบทวนวิธีการผลิต ขั้นตอนการผสม และหมายเหตุสูตร",
            "กด ยืนยันเริ่มผลิต หรือ ยืนยันเริ่มพัฒนาสูตร ตามประเภทงาน",
            "รอข้อความสำเร็จและตรวจว่างานย้ายไปแท็บกำลังผลิต/กำลังพัฒนาสูตร",
        ],
        "ยอดสารเคมีถูกตัดเพียงครั้งเดียว และงานออกจากแท็บรับใบสั่ง",
        "การยืนยันมีผลต่อสต็อกจริง ห้ามกดซ้ำหรือกดยืนยันทั้งที่ระบบแจ้งว่าสารไม่พอ",
        74 * mm,
    )
    task(
        story, "7.", "ติดตามงานกำลังผลิตหรือกำลังพัฒนาสูตร",
        "ใช้ดูงานที่ R&D ยืนยันเริ่มแล้วและรอผลจากกระบวนการผลิต",
        "06-producing.png",
        [
            "กดแท็บ กำลังผลิต/กำลังพัฒนาสูตร",
            "ค้นหางานด้วยชื่อลูกค้า สูตร หรือแบรนด์",
            "เปิดงานเพื่อตรวจสูตรและสถานะล่าสุด",
            "เมื่อผลิตเนื้อสารเสร็จ ให้ดำเนินงานต่อไปยัง Inprocess QC",
        ],
        "งานที่เริ่มแล้วอยู่ในแท็บนี้จนพร้อมให้ R&D ตรวจ In-Process QC",
        "ถ้าแท็บว่าง ให้ตรวจว่ากดยืนยันเริ่มแล้วหรือยัง และกดรีเฟรชก่อนสรุปว่างานหาย",
    )
    task(
        story, "8.", "ตรวจ In-Process QC และส่งสูตรให้ลูกค้าทดลอง",
        "ใช้บันทึกผลตรวจเนื้อสารและตัดสินใจ Pass หรือไม่ผ่าน",
        "07-inprocess-qc.png",
        [
            "กดแท็บ Inprocess QC / ส่งสูตรให้ลูกค้าทดลอง",
            "เลือกงานและทำรายการตรวจทุกข้อที่กำหนดไว้",
            "แนบรูปเนื้อสารในรายการบังคับ และกรอกค่าที่วัดได้พร้อมหน่วย",
            "เลือก Pass เมื่อผลผ่านเกณฑ์ หรือเลือกไม่ผ่านเพื่อส่งกลับไปแก้สูตร จากนั้นเลื่อนลงและยืนยันผล QC",
        ],
        "งานที่ Pass ย้ายไปงานที่เสร็จสิ้นแล้ว ส่วนงานไม่ผ่านกลับเข้าสู่กระบวนการแก้สูตร",
        "กด Pass เฉพาะสูตรที่ผ่านจริง รูปและค่าที่วัดต้องเป็นของล็อตเดียวกับงานที่เลือก",
    )
    task(
        story, "9.", "ตรวจงานที่เสร็จสิ้นแล้ว",
        "ใช้ตรวจย้อนหลังว่างานใดผ่าน QC และถูกส่งต่อแล้ว",
        "08-completed.png",
        [
            "กดแท็บ งานที่เสร็จสิ้นแล้ว",
            "ค้นหาด้วยชื่อลูกค้า สูตร หรือแบรนด์",
            "เปิดรายการและตรวจวันเวลา ผล QC และหลักฐาน",
            "ตรวจว่างานพัฒนาสูตรที่ผ่านแล้วแสดงสถานะ Pass และสูตรที่อนุมัติ",
        ],
        "พบประวัติงานที่ผ่าน R&D พร้อมข้อมูลที่ใช้ตรวจสอบย้อนหลัง",
        "หากไม่พบงาน ให้ตรวจว่า Production Final QC ปิดงานแล้วหรือยัง เพราะงานอาจออกจากบอร์ด R&D หลังปิดกระบวนการ",
    )
    task(
        story, "10.", "ตรวจ Stock วัตถุดิบสารเคมี",
        "ใช้ดูยอดคงเหลือและวางแผนก่อนเริ่มล็อตใหม่",
        "09-stock.png",
        [
            "กดแท็บ Stock วัตถุดิบสารเคมี",
            "ค้นหาชื่อสารเคมีที่ต้องการ",
            "อ่านยอดคงเหลือ หน่วย สถานะ เพียงพอ/สต็อกต่ำ/หมดคลัง และผู้ขาย",
            "ใช้ปุ่มเพิ่มหรือลดสต็อกเฉพาะเมื่อมีเอกสารและสิทธิ์รับผิดชอบ",
        ],
        "ทราบว่าสารใดพร้อมใช้ สารใดต้องสั่งซื้อหรือเติมสต็อก",
        "หน่วยหลักของสารเคมีคือกรัม ตรวจจำนวนและเหตุผลก่อนปรับยอดทุกครั้ง",
    )
    task(
        story, "11.", "อ่านตารางสูตรคำนวณ BOM",
        "ใช้เปรียบเทียบวัตถุดิบระหว่างหลายสูตร",
        "10-bom.png",
        [
            "กดแท็บ สูตรคำนวณ BOM",
            "อ่านชื่อสารเคมีจากแถวซ้าย และชื่อสูตรจากหัวคอลัมน์",
            "อ่านตัวเลขในแต่ละช่องเป็นกรัมต่อสูตรฐาน 1 กิโลกรัม",
            "ใช้ช่องค้นหาเมื่อต้องการหาวัตถุดิบเฉพาะรายการ",
            "กด จัดการสูตรผลิต เมื่อต้องสร้าง คัดลอก แก้ไข หรือลบสูตร",
        ],
        "สามารถเปรียบเทียบว่าสูตรแต่ละตัวใช้สารใดและปริมาณเท่าไร",
        "ตารางนี้เป็นข้อมูลสูตรกลาง การแก้ไขสูตรมีผลต่อใบสั่งผลิตใหม่ที่เลือกสูตรนั้น",
        82 * mm,
    )
    task(
        story, "12.", "จัดการคลังสูตรผลิต",
        "ใช้ค้นหาและเลือกการทำงานกับสูตรแต่ละรายการ",
        "11-formula-manager.png",
        [
            "ค้นหาสูตรด้วยชื่อในช่องด้านบน",
            "กด สร้างสูตรใหม่ สำหรับสูตรที่ไม่เคยมีในระบบ",
            "กด คัดลอก เมื่อต้องปรับสูตรเดิมให้ลูกค้าเฉพาะราย",
            "กด แก้ไขสูตร เฉพาะเมื่อยืนยันแล้วว่าต้องแก้สูตรกลาง",
            "กด ลบสูตร เฉพาะสูตรที่ไม่ถูกใช้งานและได้รับอนุมัติให้ลบ",
        ],
        "เปิดหน้าต่างสร้างหรือแก้ไขสูตรที่ถูกต้องโดยไม่กระทบสูตรอื่น",
        "งานปรับสูตรลูกค้าให้ใช้ คัดลอก อย่าแก้สูตรโรงงานเดิมที่ลูกค้ารายอื่นใช้อยู่",
        82 * mm,
    )
    task(
        story, "13.", "สร้างหรือแก้ไขสูตร BOM",
        "กรอกชื่อ วิธีผลิต หมายเหตุ วัตถุดิบ กลุ่ม และสัดส่วนให้ครบ",
        "12-formula-editor.png",
        [
            "ตั้งชื่อสูตรให้อ่านออกว่าเป็นสูตรอะไรและของใคร",
            "เลือกสีธีมเพื่อช่วยแยกสูตรด้วยสายตา",
            "เพิ่มขั้นตอนการผสมตามลำดับการผลิตจริง",
            "เพิ่มหมายเหตุหรือคำเตือนที่ฝ่ายผลิตต้องทราบ",
            "เพิ่มวัตถุดิบ เลือกสาร ใส่กรัมต่อ 1 กิโลกรัม และกำหนดกลุ่ม A/B/C",
            "จัดลำดับสารให้ตรงกับขั้นตอนการผสม",
            "ตรวจน้ำหนักรวมให้เท่ากับ 1,000 กรัม แล้วกด บันทึกสูตรผลิต",
        ],
        "สูตรบันทึกสำเร็จและปรากฏในคลังสูตร BOM พร้อมยอดรวม 1,000 กรัม",
        "ห้ามบันทึกสูตรจากการเดาหน่วย สูตรฐานต้องรวม 1,000 กรัม และต้องทบทวนวิธีผลิตก่อนใช้งานจริง",
        72 * mm,
    )

    story.append(PageBreak())
    story.append(p("เช็กลิสต์ R&D ก่อนส่งต่องาน", "RndTitle"))
    story.append(p("ใช้ตรวจทุกครั้งก่อนกด Pass หรือส่งงานให้ฝ่ายผลิต", "RndSubtitle"))
    checks = [
        ["ใบสั่ง", "ลูกค้า สูตร ประเภทงาน จำนวน และแบรนด์ตรงกับงานที่เลือก"],
        ["สูตร BOM", "ชื่อสาร กลุ่ม ลำดับ และยอดรวมเท่ากับ 1,000 กรัม"],
        ["สต็อก", "สารทุกตัวเพียงพอ หน่วยเป็นกรัม และยังไม่ถูกตัดซ้ำ"],
        ["วิธีผลิต", "ขั้นตอนการผสมและหมายเหตุครบ อ่านแล้วทำตามได้"],
        ["QC", "รูปเนื้อสาร รายการตรวจ ค่า หน่วย และผลครบทุกข้อ"],
        ["การตัดสินใจ", "Pass เฉพาะล็อตที่ผ่านจริง ไม่ใช้ผลหรือรูปจากล็อตอื่น"],
    ]
    check_table = Table(
        [[p("จุดตรวจ", "RndTableHead"), p("สิ่งที่ต้องยืนยัน", "RndTableHead")]]
        + [[p(a, "RndStepHead"), p(b, "RndStepBody")] for a, b in checks],
        colWidths=[42 * mm, 133 * mm],
    )
    check_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#e2e8f0")),
        ("GRID", (0, 0), (-1, -1), 0.5, LINE),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 7),
        ("RIGHTPADDING", (0, 0), (-1, -1), 7),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    story.append(check_table)

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    MANUAL.parent.mkdir(parents=True, exist_ok=True)
    doc = SimpleDocTemplate(
        str(OUTPUT),
        pagesize=A4,
        leftMargin=LEFT,
        rightMargin=RIGHT,
        topMargin=TOP,
        bottomMargin=BOTTOM,
    )
    doc.build(story, onFirstPage=page_chrome, onLaterPages=page_chrome)
    MANUAL.write_bytes(OUTPUT.read_bytes())
    ANNOTATED_MANUAL.write_bytes(OUTPUT.read_bytes())
    ANNOTATED_MANUAL_V2.write_bytes(OUTPUT.read_bytes())
    ANNOTATED_MANUAL_V3.write_bytes(OUTPUT.read_bytes())
    print(OUTPUT)


if __name__ == "__main__":
    build()
