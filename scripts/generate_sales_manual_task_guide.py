"""Generate a task-first Sales user guide with focused screenshots and action cards."""

from pathlib import Path

from PIL import Image as PILImage, ImageDraw, ImageFont
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Image, PageBreak, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle


ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "output" / "pdf"
SRC = OUT / "sales_manual_walkthrough_assets"
ASSETS = OUT / "sales_manual_task_assets"
FONTS = OUT / "fonts"
PDF = OUT / "naive_mes_sales_manual.pdf"
PAGE_W, PAGE_H = A4
LEFT = RIGHT = 15 * mm
TOP, BOTTOM = 19 * mm, 16 * mm
WIDTH = PAGE_W - LEFT - RIGHT
NAVY = colors.HexColor("#102a43")
BLUE = colors.HexColor("#2563eb")
PALE_BLUE = colors.HexColor("#eff6ff")
GOLD = colors.HexColor("#f59e0b")
SLATE = colors.HexColor("#475569")

pdfmetrics.registerFont(TTFont("THSarabun", str(FONTS / "THSarabunNew.ttf")))
pdfmetrics.registerFont(TTFont("THSarabunBold", str(FONTS / "THSarabunNew-Bold.ttf")))
styles = getSampleStyleSheet()
styles.add(ParagraphStyle("GuideTitle", fontName="THSarabunBold", fontSize=18, leading=22, textColor=NAVY, spaceAfter=4))
styles.add(ParagraphStyle("GuideSubtitle", fontName="THSarabunBold", fontSize=14, leading=17, textColor=SLATE, spaceAfter=5))
styles.add(ParagraphStyle("Body", fontName="THSarabun", fontSize=12, leading=15, textColor=colors.HexColor("#1e293b")))
styles.add(ParagraphStyle("Small", fontName="THSarabun", fontSize=11, leading=13, textColor=SLATE))
styles.add(ParagraphStyle("CardHead", fontName="THSarabunBold", fontSize=14, leading=16, textColor=NAVY))
styles.add(ParagraphStyle("StepHead", fontName="THSarabunBold", fontSize=18, leading=22, textColor=NAVY))
styles.add(ParagraphStyle("StepNumber", fontName="THSarabunBold", fontSize=17, leading=21, textColor=NAVY))
styles.add(ParagraphStyle("StepBody", fontName="THSarabun", fontSize=16, leading=21, textColor=colors.HexColor("#1e293b")))
styles.add(ParagraphStyle("Cover", fontName="THSarabunBold", fontSize=30, leading=34, alignment=TA_CENTER, textColor=NAVY))
styles.add(ParagraphStyle("CoverSub", fontName="THSarabun", fontSize=15, leading=19, alignment=TA_CENTER, textColor=SLATE))


def p(text, style="Body"):
    return Paragraph(text, styles[style])


def page_chrome(canvas, doc):
    canvas.saveState()
    canvas.setStrokeColor(colors.HexColor("#cbd5e1"))
    canvas.line(LEFT, PAGE_H - 13 * mm, PAGE_W - RIGHT, PAGE_H - 13 * mm)
    canvas.line(LEFT, 11 * mm, PAGE_W - RIGHT, 11 * mm)
    canvas.setFillColor(NAVY)
    canvas.setFont("THSarabunBold", 12)
    canvas.drawString(LEFT, PAGE_H - 10 * mm, "NAIVE INNOVA")
    canvas.setFont("THSarabun", 12)
    canvas.drawRightString(PAGE_W - RIGHT, PAGE_H - 10 * mm, "คู่มือการใช้งานระบบ Sales")
    canvas.setFillColor(SLATE)
    canvas.drawString(LEFT, 6 * mm, "Development Local Workspace")
    canvas.drawRightString(PAGE_W - RIGHT, 6 * mm, f"หน้า {doc.page}")
    canvas.restoreState()


def apply_focus_style(image, boxes):
    """Add simple numbered markers without covering or boxing the UI."""
    overlay = PILImage.new("RGBA", image.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    scale = max(0.72, min(1.25, image.width / 1200))
    badge_radius = max(15, round(18 * scale))
    font_size = max(16, round(19 * scale))
    font = ImageFont.truetype("C:/Windows/Fonts/arialbd.ttf", font_size)
    navy = (15, 42, 67, 255)
    for number, x, y, w, h in boxes:
        cx = min(max(badge_radius + 4, x + round(4 * scale)), image.width - badge_radius - 4)
        cy = min(max(badge_radius + 4, y + round(4 * scale)), image.height - badge_radius - 4)
        draw.ellipse(
            (
                cx - badge_radius + 2,
                cy - badge_radius + 2,
                cx + badge_radius + 2,
                cy + badge_radius + 2,
            ),
            fill=(15, 23, 42, 105),
        )
        draw.ellipse(
            (
                cx - badge_radius,
                cy - badge_radius,
                cx + badge_radius,
                cy + badge_radius,
            ),
            fill=navy,
            outline=(255, 255, 255, 255),
            width=max(2, round(2 * scale)),
        )
        text = str(number)
        bb = draw.textbbox((0, 0), text, font=font)
        tx = cx - (bb[2] - bb[0]) / 2
        ty = cy - (bb[3] - bb[1]) / 2 - bb[1]
        draw.text((tx, ty), text, fill="white", font=font)
    return PILImage.alpha_composite(image, overlay)


def make_focus(source, output, boxes):
    """Place compact number markers close to the relevant controls."""
    ASSETS.mkdir(parents=True, exist_ok=True)
    image = PILImage.open(SRC / source).convert("RGBA")
    apply_focus_style(image, boxes).convert("RGB").save(ASSETS / output, quality=96)


def make_focus_crop(source, output, crop, boxes):
    """Crop a narrow panel before highlighting it, so small operational details remain legible."""
    image = PILImage.open(SRC / source).convert("RGBA").crop(crop)
    apply_focus_style(image, boxes).convert("RGB").save(ASSETS / output, quality=96)


def make_document_preview(output, document_type):
    """Create a faithful A4 thumbnail based on the printable system templates."""
    page = PILImage.new("RGB", (930, 1315), "white")
    draw = ImageDraw.Draw(page)
    regular = str(FONTS / "THSarabunNew.ttf")
    bold = str(FONTS / "THSarabunNew-Bold.ttf")
    font = lambda size, strong=False: ImageFont.truetype(bold if strong else regular, size)
    ink = "#0f172a"
    muted = "#64748b"
    green = "#16a34a"
    line = "#cbd5e1"
    pale = "#f8fafc"

    def text(x, y, value, size=22, strong=False, fill=ink, anchor=None):
        draw.text((x, y), value, font=font(size, strong), fill=fill, anchor=anchor)

    def section(y, title):
        draw.rounded_rectangle((55, y, 875, y + 38), radius=7, fill="#f0fdf4")
        draw.rectangle((55, y, 62, y + 38), fill=green)
        text(75, y + 6, title, 21, True, "#14532d")

    def table(y, rows, widths, row_h=42, header=False):
        x0 = 55
        xs = [x0]
        for width in widths:
            xs.append(xs[-1] + width)
        for row_index, row in enumerate(rows):
            top = y + row_index * row_h
            if header and row_index == 0:
                draw.rectangle((x0, top, xs[-1], top + row_h), fill="#e2e8f0")
            for col_index, value in enumerate(row):
                draw.rectangle((xs[col_index], top, xs[col_index + 1], top + row_h), outline=line, width=1)
                text(xs[col_index] + 9, top + 8, value, 17, header and row_index == 0, "#334155")
        return y + len(rows) * row_h

    text(55, 42, "NAIVE INNOVA", 33, True, green)
    text(55, 79, "Naive Production Execution System", 16, False, muted)

    if document_type == "production":
        text(875, 48, "ใบข้อมูลจำเพาะการผลิต", 30, True, ink, "ra")
        text(875, 84, "PRODUCTION SPECIFICATION", 16, True, muted, "ra")
        draw.line((55, 110, 875, 110), fill=green, width=3)
        section(135, "1. ข้อมูลลูกค้าและรายการผลิต")
        y = table(183, [
            ["ชื่อลูกค้า", "บริษัทตัวอย่าง จำกัด", "แบรนด์", "NAIVE SAMPLE"],
            ["สูตร", "ผลิตภัณฑ์บำรุงผิว สูตรโรงงาน", "จำนวน", "100 ชิ้น"],
            ["ขนาดบรรจุ", "100 ml", "เลข LOT", "LOT-SAMPLE-001"],
        ], [120, 280, 110, 310], 46)
        section(y + 18, "2. ภาพประกอบสเปกและบรรจุภัณฑ์")
        card_y = y + 66
        for i, label in enumerate(["สินค้า", "ขวด/กระปุก", "หัวฉีด", "ฉลาก"]):
            x = 55 + i * 205
            draw.rounded_rectangle((x, card_y, x + 185, card_y + 130), radius=8, outline=line, width=2)
            draw.rectangle((x + 14, card_y + 34, x + 171, card_y + 96), fill=pale, outline="#e2e8f0")
            text(x + 92, card_y + 8, label, 17, True, muted, "ma")
            text(x + 92, card_y + 104, "รายการที่เลือก", 15, False, ink, "ma")
        section(card_y + 155, "3. สูตรและสารเคมีที่ใช้")
        y2 = table(card_y + 203, [
            ["ชื่อสารเคมี", "กลุ่ม", "กรัม / 1 กก.", "ปริมาณที่ใช้"],
            ["Water (RO/DI)", "A", "738.8", "7,388 ก."],
            ["Glycerin", "A", "20.0", "200 ก."],
            ["Cocamidopropyl Betaine", "B", "90.0", "900 ก."],
            ["Decyl Glucoside", "B", "40.0", "400 ก."],
            ["Preservative", "C", "8.0", "80 ก."],
        ], [380, 110, 160, 170], 39, True)
        section(y2 + 18, "4. ขั้นตอนการผลิตและหมายเหตุ")
        text(75, y2 + 69, "1. ชั่งสารตามกลุ่มและตรวจน้ำหนักก่อนเริ่มผสม", 18)
        text(75, y2 + 98, "2. ผสมตามลำดับขั้นตอนของสูตรและบันทึกผล QC", 18)
        text(75, y2 + 127, "3. ตรวจบรรจุภัณฑ์ ฉลาก LOT และจำนวนก่อนส่งมอบ", 18)
    elif document_type == "develop-brief":
        text(875, 48, "ใบสั่งพัฒนาสูตร", 30, True, ink, "ra")
        text(875, 84, "FORMULA DEVELOPMENT ORDER - หน้า 1/2", 16, True, muted, "ra")
        draw.line((55, 110, 875, 110), fill=green, width=3)
        section(135, "1. ข้อมูลลูกค้าและผลิตภัณฑ์เป้าหมาย")
        y = table(183, [
            ["ชื่อลูกค้า", "บริษัทตัวอย่าง จำกัด", "แบรนด์", "NAIVE SAMPLE"],
            ["ชื่อสูตร", "ผลิตภัณฑ์ดูแลผิวสูตรใหม่", "ผู้รับ Brief", "ฝ่ายขาย"],
        ], [120, 280, 110, 310], 50)
        section(y + 18, "2. ความต้องการและรายละเอียดสเปกจากลูกค้า")
        y2 = table(y + 66, [
            ["หมวดผลิตภัณฑ์", "ผลิตภัณฑ์ดูแลผิว", "สัตว์ / ผิวเป้าหมาย", "ผิวแพ้ง่าย"],
            ["Claim ที่อยากได้", "อ่อนโยน ชุ่มชื้น", "ลักษณะเนื้อ สี กลิ่น", "เจลใส กลิ่นอ่อน"],
            ["สารที่ต้องมี", "สารสกัดธรรมชาติ", "สารที่ต้องห้าม", "ไม่มีพาราเบน"],
            ["งบต่อหน่วย", "ตามที่ตกลง", "Timeline", "ตามแผนงาน R&D"],
            ["บรรจุภัณฑ์", "ขวดปั๊ม 100 ml", "มาตรฐาน", "FDA / อย."],
            ["Shelf life", "24 เดือน", "สิทธิของสูตร", "ตามข้อตกลง"],
        ], [145, 265, 145, 265], 58)
        section(y2 + 18, "3. หมายเหตุเพิ่มเติม")
        draw.rounded_rectangle((55, y2 + 66, 875, y2 + 168), radius=7, outline=line, fill=pale)
        text(75, y2 + 84, "ใช้เป็นเอกสาร Requirement สำหรับส่งต่อให้ R&D ก่อนเริ่มพัฒนาสูตร", 19)
        text(75, y2 + 116, "หากยังไม่ Pass ระบบจะแสดงเฉพาะหน้า Requirements Brief นี้", 19)
    else:
        text(875, 48, "สูตรและวิธีการทำ", 30, True, ink, "ra")
        text(875, 84, "FORMULATIONS & PROCEDURES - หน้า 2/2", 16, True, muted, "ra")
        draw.line((55, 110, 875, 110), fill=green, width=3)
        section(135, "3. สูตรที่ผ่านและขั้นตอนวิธีการผสม")
        text(70, 190, "ชื่อสูตร: ผลิตภัณฑ์ดูแลผิวสูตรใหม่", 22, True, "#15803d")
        text(730, 190, "สถานะ: PASS", 20, True, green)
        text(70, 230, "วิธีการผลิต / ขั้นตอนการผสม", 20, True, green)
        text(85, 265, "1. เตรียมน้ำบริสุทธิ์และเติมสารในกลุ่ม A ตามลำดับ", 18)
        text(85, 294, "2. เติมกลุ่ม B ช้า ๆ พร้อมกวนจนเนื้อเป็นเนื้อเดียวกัน", 18)
        text(85, 323, "3. เติมกลุ่ม C ปรับค่า pH และตรวจสอบคุณภาพ", 18)
        text(70, 365, "หมายเหตุของสูตร: ควบคุมอุณหภูมิและความเร็วการกวนตามที่กำหนด", 18)
        text(70, 410, "ตารางสูตร", 21, True, green)
        y = table(448, [
            ["ขั้นตอน", "ชื่อสารเคมี", "กลุ่ม", "100 ก.", "ต่อ 1 กก."],
            ["1", "Water (RO/DI)", "A", "73.88 ก.", "738.8 ก."],
            ["2", "Glycerin", "A", "2.00 ก.", "20.0 ก."],
            ["3", "Cocamidopropyl Betaine", "B", "9.00 ก.", "90.0 ก."],
            ["4", "Decyl Glucoside", "B", "4.00 ก.", "40.0 ก."],
            ["5", "Preservative", "C", "0.80 ก.", "8.0 ก."],
            ["", "รวมทั้งหมด", "", "100 ก.", "1,000 ก."],
        ], [90, 350, 100, 140, 140], 47, True)
        section(y + 24, "4. การอนุมัติ")
        text(75, y + 77, "เอกสารหน้านี้แสดงเฉพาะสูตรที่ R&D ตรวจสอบและอนุมัติเป็น PASS แล้ว", 19)

    sign_y = 1195
    for x, label in [(185, "ผู้จัดทำ"), (465, "ผู้ตรวจสอบ"), (745, "ผู้อนุมัติ")]:
        draw.line((x - 95, sign_y, x + 95, sign_y), fill="#94a3b8", width=1)
        text(x, sign_y + 12, label, 16, False, muted, "ma")
    draw.rectangle((0, 0, 929, 1314), outline="#cbd5e1", width=2)
    page.save(ASSETS / output, quality=96)


def prepare_assets():
    make_focus("01-board.png", "01-board.png", [(1, 24, 110, 155, 54), (2, 826, 62, 170, 52), (3, 1190, 62, 165, 52)])
    make_focus("02-card-menu.png", "02-menu.png", [(1, 309, 206, 48, 38), (2, 350, 255, 150, 38), (3, 350, 297, 150, 38)])
    make_focus("03-new-lead.png", "03-new-lead.png", [(1, 70, 124, 350, 60), (2, 70, 342, 350, 64), (3, 840, 69, 435, 70), (4, 840, 524, 435, 58)])
    make_focus("04-sample-stock.png", "04-sample.png", [(1, 34, 68, 308, 68), (2, 444, 76, 115, 55)])
    make_focus("05-production-order.png", "05-production.png", [(1, 570, 24, 76, 34), (2, 20, 432, 735, 40), (3, 97, 523, 660, 45)])
    make_focus("06-product-spec.png", "06-spec-top.png", [(1, 250, 345, 700, 90), (2, 250, 635, 700, 110), (3, 250, 870, 700, 95)])
    make_focus("06-product-spec-label-lot.png", "06-label.png", [(1, 230, 420, 640, 85), (2, 235, 548, 250, 73), (3, 535, 548, 190, 73), (4, 753, 548, 204, 73)])
    make_focus("06-product-spec-lot.png", "06-lot.png", [(1, 227, 223, 730, 48), (2, 225, 290, 285, 41), (3, 226, 386, 730, 57), (4, 227, 552, 650, 60)])
    make_focus("07-develop-form.png", "07-develop.png", [(1, 590, 9, 160, 48), (2, 100, 190, 560, 64), (3, 100, 316, 560, 73)])
    make_focus("08-develop-document-button.png", "08-document.png", [(1, 365, 81, 335, 48)])
    make_focus("08-deal-detail.png", "09-history.png", [(1, 60, 390, 515, 280), (2, 60, 715, 515, 165)])
    make_focus_crop(
        "11-completed-history.png",
        "11-completed-history.png",
        (1980, 740, 2840, 1425),
        [
            (1, 54, 54, 1, 1),
            (2, 54, 126, 1, 1),
            (3, 54, 174, 1, 1),
            (4, 654, 176, 1, 1),
            (5, 822, 176, 1, 1),
        ],
    )
    make_focus("09-list.png", "10-list.png", [(1, 35, 24, 115, 42), (2, 220, 78, 300, 55)])
    make_document_preview("production-document-preview.png", "production")
    make_document_preview("develop-brief-preview.png", "develop-brief")
    make_document_preview("develop-formula-preview.png", "develop-formula")


def screenshot(name, max_w, max_h):
    path = ASSETS / name
    w, h = PILImage.open(path).size
    ratio = min(max_w / w, max_h / h)
    return Image(str(path), w * ratio, h * ratio)


def info_card(title, body, tone="plain", width=61 * mm):
    background = PALE_BLUE if tone == "ok" else colors.HexColor("#fff7ed") if tone == "warn" else colors.white
    border = BLUE if tone == "ok" else colors.HexColor("#f59e0b") if tone == "warn" else colors.HexColor("#cbd5e1")
    table = Table([[p(title, "CardHead")], [p(body, "Body")]], colWidths=[width])
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), background), ("BOX", (0, 0), (-1, -1), 0.8, border),
        ("LEFTPADDING", (0, 0), (-1, -1), 7), ("RIGHTPADDING", (0, 0), (-1, -1), 7),
        ("TOPPADDING", (0, 0), (-1, -1), 5), ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))
    return table


def task(story, code, title, purpose, image_name, steps, result, caution, max_h=91 * mm):
    story.append(PageBreak())
    story.append(p(f"{code} {title}", "GuideTitle"))
    story.append(p(purpose, "GuideSubtitle"))
    story.append(Spacer(1, 2 * mm))
    image = screenshot(image_name, WIDTH, max_h)
    step_rows = []
    for i, step in enumerate(steps, 1):
        step_rows.append([
            p(str(i), "StepNumber"),
            p(step, "StepBody"),
        ])
    steps_table = Table(step_rows, colWidths=[10 * mm, WIDTH - 10 * mm])
    steps_table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("TEXTCOLOR", (0, 0), (0, -1), NAVY),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 4),
        ("TOPPADDING", (0, 0), (-1, -1), 2),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
    ]))
    detail = [
        p("ขั้นตอนการใช้งาน", "StepHead"),
        Spacer(1, 1 * mm),
        steps_table,
        Spacer(1, 2 * mm),
        p("ตรวจสอบหลังทำ", "StepHead"),
        p(result, "StepBody"),
        Spacer(1, 2 * mm),
        p("ข้อควรระวัง", "StepHead"),
        p(caution, "StepBody"),
    ]
    detail_table = Table([[detail]], colWidths=[WIDTH])
    detail_table.setStyle(TableStyle([
        ("LINEABOVE", (0, 0), (-1, 0), 0.6, colors.HexColor("#cbd5e1")),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
    ]))
    bundle = Table([[image], [detail_table]], colWidths=[WIDTH], hAlign="LEFT")
    bundle.setStyle(TableStyle([
        ("ALIGN", (0, 0), (0, 0), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, 0), 0), ("RIGHTPADDING", (0, 0), (-1, 0), 0),
        ("TOPPADDING", (0, 0), (-1, 0), 0), ("BOTTOMPADDING", (0, 0), (-1, 0), 0),
        ("LEFTPADDING", (0, 1), (-1, 1), 0), ("RIGHTPADDING", (0, 1), (-1, 1), 0),
        ("TOPPADDING", (0, 1), (-1, 1), 8), ("BOTTOMPADDING", (0, 1), (-1, 1), 0),
    ]))
    story.append(bundle)


def document_types_page(story):
    """Show the actual page layouts of the documents available from Sales."""
    story.append(PageBreak())
    story.append(p("เอกสารที่ได้รับจากระบบ", "GuideTitle"))
    story.append(p("1. ใบสั่งผลิต / Production Spec", "GuideSubtitle"))
    story.append(p(
        "ใช้สำหรับงานสั่งสินค้าที่มีสูตรโรงงานหรือสูตรที่อนุมัติแล้ว "
        "ภาพด้านล่างคือตัวอย่างหน้ากระดาษที่จะได้รับจากระบบ",
        "Body",
    ))
    story.append(Spacer(1, 3 * mm))
    production = screenshot("production-document-preview.png", 142 * mm, 202 * mm)
    production_frame = Table([[production]], colWidths=[WIDTH])
    production_frame.setStyle(TableStyle([
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("BOX", (0, 0), (-1, -1), 0.6, colors.HexColor("#cbd5e1")),
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f1f5f9")),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))
    story.append(production_frame)
    story.append(Spacer(1, 3 * mm))
    story.append(p(
        "ตรวจชื่อลูกค้า ชื่อสินค้า แบรนด์ จำนวนผลิต บรรจุภัณฑ์ ฉลาก และเลข LOT "
        "ให้ตรงกับรายการในประวัติใบสั่งผลิตที่เสร็จแล้วก่อนนำเอกสารไปใช้งาน",
        "Small",
    ))

    story.append(PageBreak())
    story.append(p("เอกสารที่ได้รับจากระบบ", "GuideTitle"))
    story.append(p("2. เอกสารพัฒนาสูตร: เอกสารเดียว 2 หน้า", "GuideSubtitle"))
    story.append(p(
        "เมื่อ R&D อนุมัติสูตรแล้ว ระบบต้องดาวน์โหลดเป็น PDF ฉบับเดียว "
        "ประกอบด้วย Requirements Brief หน้า 1 และสูตรที่ผ่านพร้อมวิธีการผลิต หน้า 2",
        "Body",
    ))
    story.append(Spacer(1, 4 * mm))
    brief = screenshot("develop-brief-preview.png", 81 * mm, 116 * mm)
    formula = screenshot("develop-formula-preview.png", 81 * mm, 116 * mm)
    previews = Table([
        [brief, formula],
        [p("หน้า 1: Requirements Brief", "CardHead"), p("หน้า 2: สูตรที่ผ่านและวิธีการผลิต", "CardHead")],
    ], colWidths=[87 * mm, 87 * mm])
    previews.setStyle(TableStyle([
        ("ALIGN", (0, 0), (-1, 0), "CENTER"),
        ("ALIGN", (0, 1), (-1, 1), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("BOX", (0, 0), (0, 0), 0.6, colors.HexColor("#cbd5e1")),
        ("BOX", (1, 0), (1, 0), 0.6, colors.HexColor("#cbd5e1")),
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#f1f5f9")),
        ("LEFTPADDING", (0, 0), (-1, 0), 4),
        ("RIGHTPADDING", (0, 0), (-1, 0), 4),
        ("TOPPADDING", (0, 0), (-1, 0), 4),
        ("BOTTOMPADDING", (0, 0), (-1, 0), 4),
        ("TOPPADDING", (0, 1), (-1, 1), 6),
        ("BOTTOMPADDING", (0, 1), (-1, 1), 3),
    ]))
    story.append(previews)
    story.append(Spacer(1, 4 * mm))
    story.append(info_card(
        "เงื่อนไขของเอกสาร",
        "ก่อน R&D Pass จะมีเฉพาะ Requirements Brief 1 หน้า "
        "หลัง R&D Pass จึงเป็น PDF เดียว 2 หน้า และหน้า 2 ต้องแสดงเฉพาะสูตรที่มีสถานะ Pass เท่านั้น",
        "warn",
        WIDTH,
    ))


def build():
    prepare_assets()
    story = [
        Spacer(1, 48 * mm), p("คู่มือการใช้งานระบบ Sales", "Cover"), Spacer(1, 8 * mm),
        p("Naive MES | สำหรับพนักงานขาย", "CoverSub"), Spacer(1, 16 * mm),
        p("คู่มือนี้อธิบายงานที่ Sale ต้องทำจริง ตั้งแต่เปิดดีล เลือก flow บันทึกสเปก จนถึงส่งต่อเอกสารให้ทีมที่เกี่ยวข้อง", "CoverSub"),
        Spacer(1, 44 * mm), p("ฉบับใช้งานใน Development Local Workspace", "CoverSub"),
        PageBreak(), p("เริ่มต้นก่อนใช้งาน", "GuideTitle"), p("อ่านคู่มือนี้อย่างไร", "GuideSubtitle"),
        p("แต่ละหน้าคือหนึ่งงานที่ทำจบได้ในหน้าเดียว ภาพแสดงเฉพาะพื้นที่ที่ต้องใช้ หมายเลข 1, 2, 3... คือจุดที่ต้องกด เลือก หรือกรอกตามลำดับ ส่วนด้านล่างบอกวิธีทำ ผลที่ควรเห็น และข้อควรระวัง", "Body"), Spacer(1, 5 * mm),
        info_card("เลือก flow ให้ถูกก่อน", "ตัวอย่างสินค้า: ใช้ของที่มีใน Stock เท่านั้น | สั่งสินค้า: ใช้สูตรโรงงาน/สูตรที่อนุมัติแล้ว | พัฒนาสูตรเอง: ส่ง brief ให้ R&D สร้างสูตรใหม่", "ok"), Spacer(1, 4 * mm),
        info_card("ข้อมูลที่ห้ามเดา", "แบรนด์ ขนาดบรรจุภัณฑ์ สถานะฉลาก ตำแหน่งยิง LOT และเงื่อนไขเอกสาร ต้องยืนยันกับลูกค้าหรือทีมที่รับผิดชอบก่อนบันทึก", "warn"),
    ]
    task(story, "1.", "เข้าสู่หน้า Sales", "ใช้บอร์ดเพื่อติดตามดีลตาม Stage", "01-board.png", ["กดเมนู Sales", "เลือกมุมมอง บอร์ด หรือ ลิสต์", "กด เพิ่มดีลใหม่ เมื่อเริ่มงานลูกค้า"], "เห็นคอลัมน์ Stage และการ์ดของลูกค้า", "อย่าย้ายการ์ดเพื่อจัดหน้าจอ ต้องย้ายตามสถานะงานจริง")
    task(story, "2.", "ใช้เมนูสามจุดบนการ์ด", "แก้ไขหรือย้ายสถานะของดีลที่มีอยู่", "02-menu.png", ["วางเมาส์บนการ์ด", "กดปุ่ม ...", "เลือกแก้ไขข้อมูลดีลหรือย้ายไปยัง Stage"], "แผงรายละเอียดดีลเปิดด้านขวา", "ตรวจชื่อลูกค้าและ Lead ID ก่อนแก้ไขหรือลบ")
    task(story, "3.", "สร้างดีลและเลือก flow", "กรอกข้อมูลลูกค้าก่อนเลือกประเภทงาน", "03-new-lead.png", ["เลือกชื่อลูกค้าเดิม หรือพิมพ์ชื่อใหม่", "กรอกโทรศัพท์ ที่อยู่ และ Stage", "เลือก ตัวอย่างสินค้า / สั่งสินค้า / พัฒนาสูตรเอง", "กด Create Lead หลังตรวจข้อมูล"], "ได้ดีลใหม่ใน Stage ที่เลือก", "อย่าใช้หมายเหตุแทนที่อยู่จัดส่งหรือเบอร์โทรศัพท์")
    task(story, "4.", "ส่งสินค้าตัวอย่าง", "ใช้เมื่อสินค้ามีอยู่จริงใน Stock", "04-sample.png", ["เลือกแท็บ ตัวอย่างสินค้า", "ติ๊กสินค้าที่ลูกค้าต้องการ", "ตรวจจำนวนคงเหลือก่อนกำหนดจำนวนส่ง"], "รายการตัวอย่างถูกเพิ่มในดีล", "ถ้า Stock ไม่พอ ให้หยุดและแจ้ง Stock ไม่ควรสร้างดีลค้างไว้")
    task(story, "5.", "เปิดใบสั่งผลิต", "ใช้เมื่อเป็นสูตรโรงงานหรือสูตรที่อนุมัติแล้ว", "05-production.png", ["เลือกแท็บ สั่งสินค้า", "กด เพิ่มใบสั่งผลิต", "เลือกสูตร ขนาด และจำนวนผลิต"], "มีรายการใบสั่งผลิตในดีล", "จำนวนเป็นจำนวนผลิตจริง ไม่ใช่จำนวนตัวอย่าง")
    task(story, "6.", "ตั้งค่าสเปกสินค้า", "ระบุอุปกรณ์ที่ Production และ Stock ต้องใช้", "06-spec-top.png", ["ระบุแบรนด์สินค้า", "เลือกบรรจุภัณฑ์และตรวจ Stock", "เลือกหัวฉีดและกลิ่นที่ลูกค้ายืนยัน"], "สเปกแสดงในใบสั่งผลิต", "ถ้าขึ้นไม่มีในสต็อก ห้ามเปลี่ยนชนิดเอง")
    task(story, "7.", "ตั้งค่าฉลาก", "บันทึกฉลากให้ทีมแพ็กสินค้าทำงานต่อได้", "06-label.png", ["เลือกสติกเกอร์", "ระบุขนาดกว้าง x สูง", "เลือกผู้สั่งผลิตและสถานะฉลาก"], "ข้อมูลฉลากครบและตรวจย้อนกลับได้", "สถานะรอสติกเกอร์ หมายถึงยังไม่พร้อมเริ่มผลิต")
    task(story, "8.", "ตั้งค่า LOT", "ระบุการพิมพ์ LOT และวันสำคัญบนสินค้า", "06-lot.png", ["เลือกตำแหน่งยิง LOT", "เลือกว่าต้องแสดงเลข LOT/วันที่ผลิตหรือไม่", "ตรวจเลข LOT, MFG และ EXP", "กดบันทึกข้อมูลสเปกสินค้า"], "ระบบเก็บรูปแบบ LOT สำหรับงานผลิต", "ห้ามคาดเดาวัน MFG/EXP; ค่า Auto อ้างอิงกติกา QC ของระบบ")
    task(story, "9.", "สั่งพัฒนาสูตร", "ใช้เมื่อลูกค้าต้องการสูตรใหม่หรือปรับสูตร", "07-develop.png", ["เลือกแท็บ พัฒนาสูตรเอง", "กรอกชื่อสูตรและแบรนด์", "เปิดรายละเอียด brief แล้วกรอกหมวดสินค้า กลุ่มสัตว์/ผิว และความต้องการ", "เพิ่มใบสั่งพัฒนาสูตรเมื่อมีมากกว่าหนึ่งสูตร"], "R&D เห็น brief แยกตามสูตร", "งานนี้ไม่มีจำนวนชิ้นหรือรายการ Stock จนกว่าสูตรจะผ่านอนุมัติ")
    task(story, "10.", "ดาวน์โหลดเอกสารพัฒนาสูตร", "เลือกเอกสารตามสถานะของงาน R&D", "08-document.png", ["กด ดาวน์โหลดเอกสารพัฒนาสูตร", "ตรวจว่าสูตรผ่านอนุมัติแล้วหรือไม่", "เลือกบันทึกหรือพิมพ์เอกสาร"], "ยังไม่ผ่าน: Requirements Brief 1 หน้า | ผ่านแล้ว: เอกสารเดียว 2 หน้า (Brief + สูตร)", "อย่าส่งเอกสารสูตรให้ลูกค้าก่อน R&D อนุมัติ")
    document_types_page(story)
    task(story, "11.", "อ่านประวัติใบสั่งผลิตที่เสร็จแล้ว", "ใช้ตรวจว่างานใดผลิตจบแล้ว เป็นสูตรประเภทใด และเปิดเอกสารฉบับที่ถูกต้อง", "11-completed-history.png", ["เปิดแผงรายละเอียดของดีล แล้วเลื่อนมาที่ ประวัติใบสั่งผลิตที่เสร็จแล้ว", "อ่านวันที่และเวลาในแต่ละรายการเพื่อแยกงานผลิตแต่ละครั้ง", "ดูชื่อสินค้าและเลข LOT ใต้ชื่อ เพื่อตรวจสอบย้อนหลัง", "อ่าน badge สถานะ: พัฒนาสูตร = งาน R&D ที่อนุมัติแล้ว; อยู่ในคลัง = สูตรโรงงาน/สินค้าพร้อมใช้", "กดไอคอนเอกสารด้านขวาเพื่อดาวน์โหลดเอกสารของรายการนั้น"], "รู้ได้ทันทีว่างานใดเป็นสูตรพัฒนา งานใดเป็นสินค้าในคลัง และเปิดเอกสารให้ตรงกับรายการ", "งานพัฒนาสูตรที่ผ่านแล้วดาวน์โหลดเป็นเอกสารเดียว 2 หน้า (Requirements Brief + สูตร) ไม่ใช่สองปุ่มแยกกัน", 74 * mm)
    task(story, "12.", "ค้นหาดีลในมุมมอง List", "ใช้เมื่อจำเป็นต้องค้นหาหลายดีลอย่างรวดเร็ว", "10-list.png", ["กด ลิสต์", "ค้นหาด้วยชื่อหรือเบอร์โทรศัพท์", "คลิกแถวลูกค้าเพื่อเปิดรายละเอียด"], "เห็นรายการที่ตรงกับคำค้น", "ตรวจ Lead ID ก่อนแก้ไข เพื่อหลีกเลี่ยงการแก้ดีลผิดรายการ")
    story.append(PageBreak())
    story.append(p("เช็กลิสต์ก่อนบันทึก", "GuideTitle"))
    story.append(p("ตรวจให้ครบก่อนกด Create Lead หรือ Save Changes", "GuideSubtitle"))
    checks = [
        ["ข้อมูลลูกค้า", "ชื่อ เบอร์โทร ที่อยู่ผู้รับ และ Stage ถูกต้อง"],
        ["เลือก flow", "ตรงกับงานจริง: ตัวอย่างสินค้า / สั่งสินค้า / พัฒนาสูตรเอง"],
        ["งานผลิต", "สูตร จำนวน แบรนด์ บรรจุภัณฑ์ หัวฉีด กลิ่น ฉลาก และ LOT ครบ"],
        ["งาน R&D", "ชื่อสูตร แบรนด์ และ Requirements Brief ของทุกสูตรครบ"],
        ["เอกสาร", "ยังไม่ผ่าน = Brief หน้าเดียว | ผ่านแล้ว = เอกสารเดียว 2 หน้า"],
    ]
    table = Table([[p("จุดตรวจ", "CardHead"), p("สิ่งที่ต้องยืนยัน", "CardHead")]] + [[p(a), p(b)] for a, b in checks], colWidths=[42 * mm, 133 * mm])
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#e2e8f0")), ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
        ("VALIGN", (0, 0), (-1, -1), "TOP"), ("LEFTPADDING", (0, 0), (-1, -1), 7), ("RIGHTPADDING", (0, 0), (-1, -1), 7),
        ("TOPPADDING", (0, 0), (-1, -1), 7), ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
    ]))
    story.append(table)
    doc = SimpleDocTemplate(str(PDF), pagesize=A4, leftMargin=LEFT, rightMargin=RIGHT, topMargin=TOP, bottomMargin=BOTTOM)
    doc.build(story, onFirstPage=page_chrome, onLaterPages=page_chrome)
    print(PDF)


if __name__ == "__main__":
    build()
