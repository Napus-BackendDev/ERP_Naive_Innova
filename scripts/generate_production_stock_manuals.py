"""Generate step-by-step Production and Stock PDF manuals from verified screenshots."""

from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    Image, KeepTogether, PageBreak, Paragraph, SimpleDocTemplate,
    Spacer, Table, TableStyle,
)


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "output" / "pdf"
MANUAL = ROOT / "docs" / "manual"
FONT_DIR = OUT / "fonts"
PROD_IMAGES = OUT / "production_manual_annotated_assets"
STOCK_IMAGES = OUT / "stock_manual_annotated_assets"

GREEN = colors.HexColor("#16a34a")
NAVY = colors.HexColor("#0f2a43")
TEXT = colors.HexColor("#1e293b")
MUTED = colors.HexColor("#64748b")
LINE = colors.HexColor("#cbd5e1")
PALE = colors.HexColor("#f8fafc")
AMBER = colors.HexColor("#d97706")
RED = colors.HexColor("#b91c1c")

LEFT = 17 * mm
RIGHT = 17 * mm
TOP = 19 * mm
BOTTOM = 16 * mm
WIDTH = A4[0] - LEFT - RIGHT

pdfmetrics.registerFont(TTFont("THSarabun", str(FONT_DIR / "THSarabunNew.ttf")))
pdfmetrics.registerFont(TTFont("THSarabun-Bold", str(FONT_DIR / "THSarabunNew-Bold.ttf")))

styles = getSampleStyleSheet()


def style(name, size, leading=None, bold=False, color=TEXT, space_after=0, align=TA_LEFT):
    return ParagraphStyle(
        name,
        parent=styles["Normal"],
        fontName="THSarabun-Bold" if bold else "THSarabun",
        fontSize=size,
        leading=leading or size * 1.2,
        textColor=color,
        spaceAfter=space_after,
        alignment=align,
        wordWrap="CJK",
    )


S = {
    "header": style("Header", 12, 14, color=MUTED),
    "cover_title": style("CoverTitle", 18, 22, True, NAVY, 5, TA_CENTER),
    "cover_sub": style("CoverSub", 14, 18, False, MUTED, 4, TA_CENTER),
    "title": style("Title", 18, 22, True, NAVY, 3),
    "sub": style("Sub", 14, 17, False, MUTED, 5),
    "body": style("Body", 16, 19, False, TEXT, 2),
    "body_bold": style("BodyBold", 16, 19, True, TEXT, 2),
    "step_no": style("StepNo", 17, 19, True, NAVY, align=TA_CENTER),
    "step": style("Step", 16, 19, False, TEXT),
    "small": style("Small", 14, 17, False, MUTED),
    "table_head": style("TableHead", 14, 16, True, NAVY),
    "table": style("Table", 14, 17, False, TEXT),
    "warn": style("Warn", 15, 18, False, RED),
    "result": style("Result", 15, 18, False, colors.HexColor("#166534")),
}


def p(text, key="body"):
    return Paragraph(text, S[key])


def page_chrome(canvas, doc, role):
    canvas.saveState()
    canvas.setStrokeColor(LINE)
    canvas.setLineWidth(0.7)
    canvas.line(LEFT, A4[1] - 12 * mm, A4[0] - RIGHT, A4[1] - 12 * mm)
    canvas.setFont("THSarabun", 12)
    canvas.setFillColor(MUTED)
    canvas.drawString(LEFT, A4[1] - 9.5 * mm, "NAIVE INNOVA")
    canvas.drawRightString(A4[0] - RIGHT, A4[1] - 9.5 * mm, f"คู่มือการใช้งานระบบ {role}")
    canvas.drawRightString(A4[0] - RIGHT, 8.5 * mm, f"Development - Local Workspace | หน้า {doc.page}")
    canvas.restoreState()


def cover(role, audience, description):
    return [
        Spacer(1, 61 * mm),
        p(f"คู่มือการใช้งานระบบ {role}", "cover_title"),
        p(f"Naive MES | {audience}", "cover_sub"),
        Spacer(1, 17 * mm),
        p(description, "cover_sub"),
        Spacer(1, 42 * mm),
        p("ฉบับใช้งานใน Development Local Workspace", "cover_sub"),
        PageBreak(),
    ]


def workflow_page(title, subtitle, rows, notes):
    data = [[p("ลำดับ", "table_head"), p("ขั้นตอน", "table_head"), p("สิ่งที่ต้องยืนยัน", "table_head")]]
    for number, stage, check in rows:
        data.append([p(str(number), "table_head"), p(stage, "table_head"), p(check, "table")])
    table = Table(data, colWidths=[17 * mm, 55 * mm, WIDTH - 72 * mm], repeatRows=1)
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#e2e8f0")),
        ("GRID", (0, 0), (-1, -1), 0.55, LINE),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("ALIGN", (0, 1), (0, -1), "CENTER"),
        ("LEFTPADDING", (0, 0), (-1, -1), 7),
        ("RIGHTPADDING", (0, 0), (-1, -1), 7),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    story = [p(title, "title"), p(subtitle, "sub"), Spacer(1, 3 * mm), table, Spacer(1, 6 * mm)]
    for label, text in notes:
        story.extend([p(f"<b>{label}</b> {text}", "body"), Spacer(1, 2 * mm)])
    story.append(PageBreak())
    return story


def task(title, where, image_path, steps, result, caution, image_height=103 * mm):
    image = Image(str(image_path))
    image._restrictSize(WIDTH, image_height)
    image.hAlign = "CENTER"
    step_rows = []
    for index, text in enumerate(steps, 1):
        step_rows.append([p(str(index), "step_no"), p(text, "step")])
    step_table = Table(step_rows, colWidths=[12 * mm, WIDTH - 12 * mm])
    step_table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LINEBELOW", (0, 0), (-1, -2), 0.35, colors.HexColor("#e2e8f0")),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 4),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
    ]))
    result_table = Table([
        [p("<b>ผลที่ต้องเห็น</b>", "result"), p(result, "result")],
        [p("<b>ข้อควรระวัง</b>", "warn"), p(caution, "warn")],
    ], colWidths=[28 * mm, WIDTH - 28 * mm])
    result_table.setStyle(TableStyle([
        ("LINEABOVE", (0, 0), (-1, 0), 0.7, LINE),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 4),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
    ]))
    return [
        p(title, "title"),
        p(f"อยู่ที่: <b>{where}</b>", "sub"),
        image,
        Spacer(1, 3 * mm),
        p("ขั้นตอนการใช้งาน", "title"),
        step_table,
        Spacer(1, 3 * mm),
        result_table,
        PageBreak(),
    ]


def checklist_page(title, rows, warnings):
    data = [[p("จุดตรวจ", "table_head"), p("ต้องตรวจอะไร", "table_head")]]
    data += [[p(a, "body_bold"), p(b, "body")] for a, b in rows]
    table = Table(data, colWidths=[43 * mm, WIDTH - 43 * mm], repeatRows=1)
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#e2e8f0")),
        ("GRID", (0, 0), (-1, -1), 0.55, LINE),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 7),
        ("RIGHTPADDING", (0, 0), (-1, -1), 7),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    story = [p(title, "title"), p("ใช้หน้านี้ตรวจทวนก่อนบันทึกหรือส่งต่องาน", "sub"), table, Spacer(1, 6 * mm)]
    for item in warnings:
        story.append(p(f"• {item}", "warn"))
    return story


def build_pdf(role, filename, story):
    target = OUT / filename
    manual_target = MANUAL / filename
    target.parent.mkdir(parents=True, exist_ok=True)
    manual_target.parent.mkdir(parents=True, exist_ok=True)
    doc = SimpleDocTemplate(
        str(target), pagesize=A4, leftMargin=LEFT, rightMargin=RIGHT,
        topMargin=TOP, bottomMargin=BOTTOM,
        title=f"คู่มือการใช้งานระบบ {role}",
        author="NAIVE INNOVA",
    )
    doc.build(
        story,
        onFirstPage=lambda c, d: page_chrome(c, d, role),
        onLaterPages=lambda c, d: page_chrome(c, d, role),
    )
    manual_target.write_bytes(target.read_bytes())
    print(manual_target)


def production_story():
    story = cover(
        "Production",
        "สำหรับฝ่ายผลิต",
        "คู่มือแบบทีละขั้นตอน ตั้งแต่รับใบสั่งผลิต ตรวจพัสดุ จัดคิวเครื่องจักร ผลิต บรรจุ Final QC จนถึงส่งมอบ",
    )
    story += workflow_page(
        "ภาพรวมหน้าที่ของ Production",
        "Production รับงานที่ R&D ยืนยันสูตรแล้ว และรับผิดชอบการผลิตจริงจนสินค้าพร้อมส่ง",
        [
            (1, "ใบสั่งผลิตเตรียมพัสดุ", "ตรวจสูตร จำนวน ขวด หัวปั๊ม ฉลาก สารเคมี และผู้ยืนยัน"),
            (2, "สายการผลิต", "เลือกเครื่องจักร วัน เวลา และติดตามคิวบน Timeline"),
            (3, "บรรจุ / ฉลาก / LOT / ซีล", "ทำตามลำดับ 4 ขั้น พร้อมแนบหลักฐานตามที่ระบบกำหนด"),
            (4, "Final QC / รอส่ง", "ตรวจหลักฐาน ยืนยันผ่าน แล้วเลือกส่งลูกค้าหรือส่งเก็บเข้าคลัง"),
        ],
        [
            ("หลักสำคัญ:", "ห้ามข้ามแท็บเองด้วยการแก้สถานะ หากงานในขั้นก่อนยังไม่ผ่าน"),
            ("การตัดสต็อก:", "สารเคมีถูกตัดเมื่อ R&D ยืนยันเริ่มผลิต ส่วนบรรจุภัณฑ์ถูกตัดเมื่อ Production ยืนยันเตรียมพัสดุ"),
            ("ข้อมูลจำลอง:", "ชื่อบริษัท สูตร LOT และจำนวนในภาพมีไว้สอนการใช้งาน ไม่ใช่ข้อมูลลูกค้าจริง"),
        ],
    )
    story += task(
        "1. เปิดหน้า Production และอ่าน 4 ขั้นงาน",
        "เมนูซ้าย → Production",
        PROD_IMAGES / "01-overview.png",
        [
            "กดเมนู <b>Production</b> ทางซ้าย",
            "อ่านตัวเลขบนแท็บ <b>ใบสั่งผลิตเตรียมพัสดุ</b> เพื่อดูจำนวนงานรอเตรียม",
            "ใช้แท็บ <b>สายการผลิต</b> สำหรับงานที่พร้อมจัดคิวหรือกำลังผลิต",
            "ใช้สองแท็บขวาสำหรับงานบรรจุและงาน Final QC เท่านั้น",
        ],
        "เห็นแท็บขั้นงานทั้ง 4 และจำนวนงานในแต่ละขั้น",
        "ตัวเลขบนแท็บคือจำนวนงานในขั้นนั้น ไม่ใช่จำนวนชิ้นสินค้า",
    )
    story += task(
        "2. เลือกใบสั่งผลิตและตรวจข้อมูลหัวงาน",
        "Production → ใบสั่งผลิตเตรียมพัสดุ",
        PROD_IMAGES / "02-preparation.png",
        [
            "กดการ์ดลูกค้าทางซ้ายที่ต้องการเตรียม",
            "ตรวจชื่อลูกค้า แบรนด์ สูตร และเลขอ้างอิงใบงานทางขวา",
            "ตรวจขนาดขวด ปริมาตรบรรจุจริง และจำนวนชิ้นว่าตรงกับใบสั่ง",
            "เลื่อนอ่านรายการพัสดุและสูตรให้ครบก่อนแตะช่องยืนยัน",
        ],
        "แผงขวาแสดงข้อมูลของการ์ดที่เลือก และชื่อสูตรตรงกันทั้งสองฝั่ง",
        "อย่าเลือกงานจากชื่อคล้ายกันเพียงอย่างเดียว ให้ตรวจแบรนด์และเลขใบงานร่วมด้วย",
    )
    story += task(
        "3. ตรวจพัสดุ สูตร BOM และยืนยันส่งเข้าไลน์",
        "แผงรายละเอียดใบงานเตรียมพัสดุ",
        PROD_IMAGES / "02-preparation.png",
        [
            "ตรวจขวด ฝา/หัวปั๊ม และฉลาก: จำนวน <b>ต้องการ</b> ต้องไม่เกินจำนวน <b>ในคลัง</b>",
            "ตรวจสูตร BOM และสถานะสารเคมี หากสารไม่พอให้หยุดและแจ้ง R&D/Stock",
            "ติ๊กช่องยืนยันทั้ง 3 ข้อหลังตรวจของจริงแล้ว และกรอกชื่อผู้ปฏิบัติงาน",
            "กด <b>ยืนยันการเตรียมพัสดุและส่งเข้าไลน์ผลิต</b> เพียงครั้งเดียว",
        ],
        "งานย้ายไปแท็บสายการผลิต และบรรจุภัณฑ์ที่ใช้ถูกตัดสต็อก",
        "การยืนยันมีผลต่อสต็อกจริง ห้ามกดซ้ำและห้ามลดบรรจุภัณฑ์ด้วยมืออีกครั้ง",
    )
    story += task(
        "4. อ่านคิวในสายการผลิตและ Timeline",
        "Production → สายการผลิต",
        PROD_IMAGES / "03-line.png",
        [
            "กดแท็บ <b>สายการผลิต</b>",
            "ดูช่อง <b>ยังไม่ได้เข้าเครื่อง</b> เพื่อหางานที่ยังไม่มีคิว",
            "ดูช่อง <b>รอคิว</b> และ <b>IN-PROCESS QC</b> เพื่อแยกงานตามสถานะ",
            "อ่าน Timeline ด้านล่างเพื่อเช็กเครื่อง วันที่เริ่ม วันที่จบ และงานซ้อนกัน",
        ],
        "ทราบว่างานใดยังไม่จัดคิว งานใดอยู่บนเครื่อง และช่องเวลาใดว่าง",
        "งานที่อยู่ระหว่าง QC ถูกล็อก ห้ามย้ายคิวจนกว่าผล QC จะออก",
    )
    story += task(
        "5. จัดคิวเข้าเครื่องจักร",
        "สายการผลิต → ปุ่ม จัดคิว",
        PROD_IMAGES / "04-schedule.png",
        [
            "เลือก <b>เครื่องจักร</b> ที่รองรับสูตรและขนาด Batch",
            "กำหนด <b>วันเริ่ม</b> และตรวจว่าไม่ชนงานเดิมใน Timeline",
            "กำหนด <b>วันจบ เวลาเริ่ม และเวลาจบ</b> ตามแผนผลิตจริง",
            "ทบทวนชื่อลูกค้าและสูตรบนหัว modal แล้วกด <b>บันทึกคิว</b>",
        ],
        "งานปรากฏในแถวเครื่องจักรและช่วงเวลาที่เลือกบน Timeline",
        "วันจบต้องไม่ก่อนวันเริ่ม และห้ามเลือกเครื่องที่ระบบแจ้งว่าไม่รองรับสูตร",
    )
    story += task(
        "6. ติดตามการผลิตและส่งต่อ In-Process QC",
        "Production → สายการผลิต → การ์ดงานบนเครื่อง",
        PROD_IMAGES / "03-line.png",
        [
            "เปิดการ์ดงานบนเครื่องและตรวจสูตรกับจำนวน Batch",
            "ทำตามวิธีการผลิตจากสูตร BOM โดยไม่เปลี่ยนสัดส่วนเอง",
            "เมื่อผลิตเนื้อสารเสร็จ กด <b>ยืนยันผลิตเสร็จสิ้น</b>",
            "ตรวจว่างานย้ายไปสถานะ <b>รอตรวจ QC รอบที่ 1</b> เพื่อให้ R&D ตรวจ In-Process QC",
        ],
        "งานออกจากคิวผลิตและรอผล In-Process QC จาก R&D",
        "ห้ามส่งไปบรรจุก่อน R&D Pass เพราะเนื้อสารอาจถูกตีกลับให้แก้ไข",
    )
    story += task(
        "7. ทำงานบรรจุตามลำดับ 4 ขั้น",
        "Production → บรรจุ / ติดสติ๊กเกอร์ / ยิง LOT / ซีลขวด",
        PROD_IMAGES / "05-packaging.png",
        [
            "ขั้น 1 บรรจุ: ตรวจขวด หัวปั๊ม ขนาด และจำนวน แล้วกดส่งไปติดสติกเกอร์",
            "ขั้น 2 ติดสติกเกอร์: ตรวจแบบ ขนาด ผู้สั่งพิมพ์ และแนบรูปหลักฐาน",
            "ขั้น 3 ยิง LOT: ตรวจเลข LOT, MFG, EXP และแนบรูปตำแหน่งที่ยิง",
            "ขั้น 4 ซีลขวด: กรอกจำนวนที่ซีล แนบรูป แล้วกด <b>ซีลขวดสำเร็จ</b>",
            "ใช้ปุ่มย้อนกลับเมื่อพบข้อผิดพลาด ห้ามเดินหน้าต่อเพื่อให้สถานะดูเสร็จ",
        ],
        "การ์ดเลื่อนไปทีละคอลัมน์และสุดท้ายย้ายไป Final QC",
        "รูปหลักฐานทุกภาพต้องเป็นของ LOT เดียวกัน ชัด อ่าน LOT ได้ และจำนวนซีลต้องตรงของจริง",
        94 * mm,
    )
    story += task(
        "8. ตรวจหลักฐานและยืนยัน Final QC",
        "Production → ผลิตสินค้าสำเร็จ / Final QC / รอส่งลูกค้า",
        PROD_IMAGES / "06-final-qc.png",
        [
            "เลือกการ์ดงานและตรวจชื่อลูกค้า แบรนด์ สูตร ขนาด และจำนวน",
            "เปิดหลักฐานทั้ง 5 ช่อง: เนื้อสาร ติดสติกเกอร์ ยิง LOT ซีล และ Final QC",
            "อัปโหลดรูป Final QC ที่เห็นสินค้าสำเร็จชัดเจน",
            "ถ้าผ่านให้กด <b>ยืนยัน Final QC ผ่าน</b>; ถ้าไม่ผ่านให้กด <b>ตีกลับซีลขวด</b>",
        ],
        "งานผ่าน QC กลายเป็นสินค้าสำเร็จพร้อมเลือกวิธีส่งมอบ",
        "ห้ามใช้รูปจากล็อตอื่น และห้ามยืนยันผ่านหากช่องหลักฐานบังคับยังว่าง",
    )
    story += task(
        "9. เลือกส่งให้ลูกค้าหรือส่งเก็บเข้าคลัง",
        "การ์ดงานที่ผ่าน Final QC",
        PROD_IMAGES / "06-final-qc.png",
        [
            "เลือก <b>ส่งให้ลูกค้า</b> เมื่อจัดส่งสินค้าตามออเดอร์นี้ทันที",
            "ในหน้าต่างส่งสินค้า เลือกกล่องไปรษณีย์และจำนวนกล่องตามที่ใช้จริง",
            "เลือก <b>ส่งเก็บเข้าคลัง</b> เมื่อสินค้า LOT นี้ต้องเก็บเป็น FG ก่อนขายหรือส่งภายหลัง",
            "กลับไปตรวจหน้า Stock และ Sales ว่าสถานะปลายทางเปลี่ยนถูกต้อง",
        ],
        "ส่งลูกค้า: ตัด LOT และกล่อง พร้อมย้าย Sales ไป Retention 1; ส่งคลัง: LOT แสดงใน FG",
        "สองปุ่มมีผลต่างกันชัดเจน อย่าเลือกส่งลูกค้าเพื่อปิดงานที่ยังไม่ได้ส่งจริง",
    )
    story += checklist_page(
        "เช็กลิสต์ Production ก่อนปิดงาน",
        [
            ("ใบสั่ง", "ลูกค้า แบรนด์ สูตร ขนาด ปริมาตร จำนวน และเลขอ้างอิงตรงกัน"),
            ("สต็อก", "สารเคมี ขวด หัวปั๊ม ฉลาก และกล่องเพียงพอ โดยไม่หักซ้ำ"),
            ("เครื่องจักร", "รองรับสูตร Batch ไม่เกินความจุ และคิวไม่ชนงานอื่น"),
            ("บรรจุ", "ทำครบ 4 ขั้น จำนวนที่บรรจุและซีลตรงของจริง"),
            ("LOT", "เลข LOT, MFG และ EXP อ่านได้และตรงกับหลักฐาน"),
            ("Final QC", "หลักฐานครบ 5 ช่องและเป็นของล็อตเดียวกัน"),
            ("ปลายทาง", "เลือกส่งลูกค้าหรือส่งคลังตามการเคลื่อนย้ายของจริง"),
        ],
        [
            "งานหายจากแท็บเดิมอาจหมายถึงถูกย้ายไปขั้นถัดไป ให้ตรวจแท็บทั้ง 4 ก่อนสรุปว่างานหาย",
            "ถ้ายอดสต็อกผิด ให้หยุดทำรายการและตรวจ Log ก่อนปรับยอดด้วยมือ",
        ],
    )
    return story


def stock_story():
    story = cover(
        "Stock",
        "สำหรับฝ่ายคลังสินค้า",
        "คู่มือแบบทีละขั้นตอน สำหรับจัดการสารเคมี บรรจุภัณฑ์ สินค้าตัวอย่าง และสินค้าสำเร็จรูปตาม LOT",
    )
    story += workflow_page(
        "เข้าใจคลังทั้ง 4 ก่อนทำรายการ",
        "แต่ละแท็บใช้หน่วย แหล่งที่มา และเงื่อนไขการตัดสต็อกต่างกัน",
        [
            (1, "สารและวัตถุดิบ", "หน่วยกรัม; R&D ใช้คำนวณ BOM และระบบตัดเมื่อยืนยันเริ่มผลิต"),
            (2, "ขวดและบรรจุภัณฑ์", "หน่วยชิ้น; Production ตัดเมื่อยืนยันเตรียมพัสดุ"),
            (3, "สินค้าตัวอย่าง", "หน่วยชิ้น; Sales เลือกส่งตัวอย่างจากยอดคงเหลือนี้"),
            (4, "สินค้าสำเร็จรูป (FG)", "เก็บแยกตาม LOT พร้อม MFG, EXP, ลูกค้า และจำนวน"),
        ],
        [
            ("ห้ามสลับหน่วย:", "สารเคมีใช้กรัม ส่วนบรรจุภัณฑ์ Sample และ FG ใช้ชิ้น"),
            ("ห้ามหักซ้ำ:", "รายการที่ระบบตัดจาก R&D หรือ Production แล้วไม่ต้องลดด้วยมืออีก"),
            ("ข้อมูลจำลอง:", "ชื่อสาร ผู้ขาย ลูกค้า LOT และจำนวนในภาพเป็นตัวอย่างสำหรับคู่มือ"),
        ],
    )
    story += task(
        "1. อ่านคลังสารและวัตถุดิบ",
        "เมนูซ้าย → Stock → สารและวัตถุดิบ",
        STOCK_IMAGES / "01-ingredients.png",
        [
            "กดแท็บ <b>สารและวัตถุดิบ</b>",
            "ใช้ช่องค้นหาหรือปุ่ม <b>เพิ่มสารเคมี</b> ตามงานที่ต้องทำ",
            "อ่านคงเหลือเป็น <b>กรัม</b> พร้อมสถานะ เพียงพอ / สต็อกต่ำ / หมดคลัง",
            "อ่าน Supplier ราคา/กก. และปุ่มจัดการทางขวาก่อนเลือกรายการ",
        ],
        "ทราบว่าสารใดพร้อมใช้ สารใดต้องรับเข้า และสารใดหมดคลัง",
        "อย่าอ่านยอดกรัมเป็นกิโลกรัม เช่น 1,000 ก. เท่ากับ 1 กก.",
    )
    story += task(
        "2. เพิ่มวัตถุดิบสารเคมีใหม่",
        "สารและวัตถุดิบ → เพิ่มสารเคมี",
        STOCK_IMAGES / "02-add-ingredient.png",
        [
            "กรอกชื่อสารเคมีให้ตรงชื่อบน COA หรือเอกสารผู้ขาย",
            "กรอกสต็อกเปิดคลังเป็น <b>กรัม</b> หากยังไม่รับของให้ใส่ 0",
            "กรอก Supplier และราคาต่อกิโลกรัมเพื่อใช้ตรวจสอบการจัดซื้อ",
            "ทบทวนชื่อและหน่วย แล้วกด <b>บันทึกข้อมูล</b>",
        ],
        "สารใหม่ปรากฏในตารางและค้นหาได้จากชื่อ",
        "ห้ามสร้างชื่อซ้ำด้วยการสะกดต่างกัน ควรค้นหาก่อนเพิ่มทุกครั้ง",
    )
    story += task(
        "3. เพิ่มหรือลดสต็อกและอ่านประวัติ",
        "ปุ่ม + หรือ - ในคอลัมน์จัดการ",
        STOCK_IMAGES / "10-adjust.png",
        [
            "ตรวจชื่อรายการและยอดคงคลังปัจจุบันบนหัวแผง",
            "เลือกเพิ่มหรือลด แล้วกรอกจำนวนตามหน่วยของแท็บ",
            "กรอกหมายเหตุที่ตรวจสอบย้อนหลังได้ เช่น เลขใบรับของ เหตุผลเบิก หรือผู้รับ",
            "อ่านประวัติด้านล่าง แล้วกด <b>ยืนยันทำรายการ</b> เพียงครั้งเดียว",
        ],
        "ยอดใหม่ถูกคำนวณและรายการเคลื่อนไหวปรากฏใน Log",
        "ประวัติละเอียดรองรับสารเคมีและบรรจุภัณฑ์; Sample และ FG ปรับยอดได้แต่ประวัติอาจไม่ครบเท่ากัน",
    )
    story += task(
        "4. อ่านคลังขวดและบรรจุภัณฑ์",
        "Stock → ขวดและบรรจุภัณฑ์",
        STOCK_IMAGES / "03-packaging.png",
        [
            "กดแท็บ <b>ขวดและบรรจุภัณฑ์</b>",
            "ใช้ตัวกรองหมวดหมู่และลูกค้าเพื่อแยกของระบบกับของลูกค้าเฉพาะราย",
            "อ่านชื่อ ลูกค้า หมวดหมู่ จำนวน และหมายเหตุในแถวเดียวกัน",
            "ใช้ปุ่ม +, -, แก้ไข หรือถังขยะเฉพาะรายการที่ตรวจชื่อแล้ว",
        ],
        "พบขวด หัวปั๊ม ฉลาก และกล่องของลูกค้าที่ต้องการอย่างถูกต้อง",
        "ของลูกค้าเฉพาะรายห้ามนำไปใช้กับลูกค้าอื่น แม้ขนาดหรือรูปทรงเหมือนกัน",
    )
    story += task(
        "5. Export, Import และดาวน์โหลด Template",
        "ขวดและบรรจุภัณฑ์ → จัดการเอกสาร",
        STOCK_IMAGES / "04-documents.png",
        [
            "กด <b>จัดการเอกสาร</b>",
            "เลือก <b>Export เอกสารออก</b> เมื่อต้องตรวจหรือส่งรายงานปัจจุบัน",
            "เลือก <b>Import เอกสารเข้า</b> หลังตรวจไฟล์ CSV และสำรองข้อมูลแล้ว",
            "เลือก <b>ดาวน์โหลด Template</b> เพื่อใช้หัวคอลัมน์ที่ระบบรองรับ",
        ],
        "ได้ไฟล์ CSV หรือรายการใหม่ถูกนำเข้าตามตัวเลือก",
        "Import เพิ่มข้อมูลหลายรายการพร้อมกัน ตรวจชื่อซ้ำ จำนวน และหมวดหมู่ก่อนยืนยัน",
    )
    story += task(
        "6. เพิ่มบรรจุภัณฑ์ใหม่",
        "ขวดและบรรจุภัณฑ์ → เพิ่มบรรจุภัณฑ์",
        STOCK_IMAGES / "05-add-packaging.png",
        [
            "กรอกชื่อให้มีชนิดและขนาด เช่น ขวด PET ใส 100 ml",
            "อัปโหลดรูปที่เห็นรูปทรง สี และหัวขวดชัดเจน",
            "เลือกแบรนด์/ลูกค้า หมวดหมู่ กรอกจำนวนเป็นชิ้น และหมายเหตุ",
            "ตรวจว่ารายการไม่ซ้ำ แล้วกด <b>บันทึกข้อมูล</b>",
        ],
        "บรรจุภัณฑ์ใหม่แสดงในหมวดหมู่และตัวกรองลูกค้าที่เลือก",
        "ภาพผิดรายการทำให้ Production หยิบของผิด ควรตรวจภาพกับชื่อก่อนบันทึก",
    )
    story += task(
        "7. อ่านและเพิ่มสินค้าตัวอย่าง",
        "Stock → สินค้าตัวอย่าง (Sample)",
        STOCK_IMAGES / "06-samples.png",
        [
            "กดแท็บ <b>สินค้าตัวอย่าง (Sample)</b>",
            "ตรวจชื่อ + SKU แบรนด์ หมวดหมู่ ขนาด และจำนวนคงเหลือ",
            "กด <b>เพิ่มสินค้าตัวอย่าง</b> เมื่อต้องลงรายการใหม่",
            "ใช้ปุ่ม + หรือ - เมื่อรับเข้า ส่งลูกค้าทดลอง หรือปรับยอดตามการนับจริง",
        ],
        "Sales มองเห็นตัวอย่างและยอดคงเหลือที่พร้อมเลือกส่งลูกค้า",
        "Sample คือสินค้าสำหรับทดลอง ไม่ใช่ FG ของออเดอร์ผลิตจริง",
    )
    story += task(
        "8. กรอกข้อมูลสินค้าตัวอย่างใหม่",
        "สินค้าตัวอย่าง → เพิ่มสินค้าตัวอย่าง",
        STOCK_IMAGES / "07-add-sample.png",
        [
            "กรอกชื่อสินค้าตัวอย่างให้สื่อถึงสูตรและขนาด",
            "กำหนด SKU ที่ไม่ซ้ำ และอัปโหลดรูปสินค้าจริง",
            "เลือกหรือพิมพ์ชื่อลูกค้า/แบรนด์ แล้วกรอกจำนวนคงเหลือเป็นชิ้น",
            "กรอกหมายเหตุ เช่น เงื่อนไขการใช้หรือวันที่จัดทำ แล้วกดบันทึก",
        ],
        "รายการใหม่ปรากฏในแท็บ Sample และพร้อมให้ Sales เลือก",
        "อย่าใช้ชื่อแบรนด์แทนชื่อลูกค้า หากเป็นสินค้าของลูกค้าเฉพาะรายให้ระบุให้ชัด",
    )
    story += task(
        "9. อ่านคลังสินค้าสำเร็จรูปตาม LOT",
        "Stock → สินค้าสำเร็จรูป (FG)",
        STOCK_IMAGES / "08-fg.png",
        [
            "กดแท็บ <b>สินค้าสำเร็จรูป (FG)</b>",
            "ค้นหาด้วย LOT สูตร หรือลูกค้า แล้วกดเพิ่มล็อตเฉพาะเมื่อมีเอกสารรับเข้า",
            "ตรวจจำนวน ลูกค้า วันที่ผลิต MFG และวันหมดอายุ EXP",
            "อ่านป้ายสถานะหมดอายุหรือใกล้หมดอายุก่อนเบิกและส่งสินค้า",
        ],
        "ทราบจำนวนสินค้าพร้อมใช้ของแต่ละ LOT และอายุคงเหลือ",
        "ห้ามรวม LOT ต่างกันเป็นแถวเดียว เพราะวันผลิต วันหมดอายุ และการสอบย้อนกลับต่างกัน",
    )
    story += task(
        "10. เพิ่มล็อตสินค้าสำเร็จรูป",
        "สินค้าสำเร็จรูป (FG) → เพิ่มล็อตสินค้า",
        STOCK_IMAGES / "09-add-fg-lot.png",
        [
            "กรอกเลข LOT ให้ตรงฉลากและเอกสาร Production",
            "เลือกสูตรและลูกค้าให้ตรงกับสินค้าที่รับเข้า",
            "กรอกจำนวน หน่วย วันที่ผลิต MFG และวันหมดอายุ EXP",
            "อัปโหลดรูปที่เห็นตัวสินค้าและ LOT ชัด แล้วกดบันทึก",
        ],
        "ล็อตใหม่แสดงใน FG พร้อมจำนวนและสถานะวันหมดอายุ",
        "วัน EXP ต้องหลัง MFG และเลข LOT ต้องไม่ซ้ำกับล็อตที่มีอยู่",
    )
    story += task(
        "11. ใช้ปุ่มจัดการแต่ละแถวอย่างปลอดภัย",
        "คอลัมน์ จัดการ ทางขวาของทุกแท็บ",
        STOCK_IMAGES / "03-packaging.png",
        [
            "ปุ่ม <b>+</b> ใช้รับเข้า; ปุ่ม <b>-</b> ใช้เบิกหรือปรับลด",
            "ปุ่มดินสอใช้แก้ข้อมูลประจำรายการ ไม่ใช่ใช้แก้ยอดเคลื่อนไหว",
            "ปุ่มถังขยะใช้ลบรายการ และต้องตรวจว่าไม่มีงานหรือประวัติอ้างอิง",
            "หลังทำรายการ กดรีเฟรชและตรวจยอดกับเอกสารต้นทางอีกครั้ง",
        ],
        "ข้อมูลประจำรายการและยอดคงเหลือสะท้อนการเคลื่อนไหวจริง",
        "การลบทำให้รายการหายจากตัวเลือกใน Sales/R&D/Production ควรใช้เฉพาะข้อมูลที่สร้างผิดและยังไม่ถูกใช้งาน",
    )
    story += checklist_page(
        "เช็กลิสต์ Stock ก่อนจบงาน",
        [
            ("เลือกคลัง", "สาร / บรรจุภัณฑ์ / Sample / FG ถูกแท็บ"),
            ("หน่วย", "สารเป็นกรัม ส่วนบรรจุภัณฑ์ Sample และ FG เป็นชิ้น"),
            ("ชื่อรายการ", "ค้นหาแล้วไม่ซ้ำ ชื่อมีชนิด ขนาด หรือสูตรเพียงพอให้แยกได้"),
            ("เอกสาร", "มีใบรับ ใบเบิก ใบผลิต หรือเหตุผลที่ตรวจสอบย้อนหลังได้"),
            ("ยอดคงเหลือ", "ยอดก่อน + รายการเข้า - รายการออก = ยอดหลัง"),
            ("LOT", "เลข LOT ลูกค้า MFG EXP และจำนวนตรงกับฉลาก"),
            ("ระบบอัตโนมัติ", "ไม่ปรับซ้ำรายการที่ R&D หรือ Production ตัดไปแล้ว"),
        ],
        [
            "ถ้ายอดติดลบหรือเปลี่ยนผิดปกติ ให้ตรวจ Log และหยุดการเบิกจนกว่าจะหาสาเหตุพบ",
            "ข้อมูลราคาหรือ Supplier ไม่ควรถูกใช้แทนเอกสารจัดซื้อฉบับจริง",
        ],
    )
    return story


if __name__ == "__main__":
    build_pdf("Production", "04-คู่มือ-Production-ฉบับใช้งาน.pdf", production_story())
    build_pdf("Stock", "05-คู่มือ-Stock-ฉบับใช้งาน.pdf", stock_story())
