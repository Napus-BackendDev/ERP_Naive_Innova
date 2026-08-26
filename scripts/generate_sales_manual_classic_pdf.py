"""Classic Thai user-manual layout based on the supplied institutional reference."""

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
FONT = OUT / "fonts"
SRC = OUT / "sales_manual_walkthrough_assets"
ASSETS = OUT / "sales_manual_classic_assets"
PDF = OUT / "naive_mes_sales_manual_classic.pdf"
PAGE_W, PAGE_H = A4
LEFT = RIGHT = 18 * mm
TOP, BOTTOM = 22 * mm, 18 * mm
WIDTH = PAGE_W - LEFT - RIGHT
RED = (220, 38, 38, 255)

pdfmetrics.registerFont(TTFont("THSarabunNew", str(FONT / "THSarabunNew.ttf")))
pdfmetrics.registerFont(TTFont("THSarabunNew-Bold", str(FONT / "THSarabunNew-Bold.ttf")))
styles = getSampleStyleSheet()
styles.add(ParagraphStyle("ClassicTitle", fontName="THSarabunNew-Bold", fontSize=18, leading=22, spaceAfter=7))
styles.add(ParagraphStyle("ClassicH2", fontName="THSarabunNew-Bold", fontSize=14, leading=18, leftIndent=9 * mm, spaceBefore=3, spaceAfter=4))
styles.add(ParagraphStyle("ClassicH3", fontName="THSarabunNew-Bold", fontSize=14, leading=18, leftIndent=17 * mm, spaceBefore=3, spaceAfter=4))
styles.add(ParagraphStyle("ClassicBody", fontName="THSarabunNew", fontSize=12, leading=16, leftIndent=17 * mm, rightIndent=7 * mm, spaceAfter=5))
styles.add(ParagraphStyle("ClassicStep", fontName="THSarabunNew", fontSize=12, leading=16, leftIndent=23 * mm, firstLineIndent=-7 * mm, rightIndent=7 * mm, spaceAfter=4))
styles.add(ParagraphStyle("ClassicCaption", fontName="THSarabunNew", fontSize=12, leading=16, alignment=TA_CENTER, textColor=colors.HexColor("#475569"), spaceAfter=5))
styles.add(ParagraphStyle("ClassicCover", fontName="THSarabunNew-Bold", fontSize=30, leading=34, alignment=TA_CENTER, textColor=colors.HexColor("#0f172a")))
styles.add(ParagraphStyle("ClassicCoverSub", fontName="THSarabunNew", fontSize=14, leading=18, alignment=TA_CENTER, textColor=colors.HexColor("#475569")))
styles.add(ParagraphStyle("ClassicSmall", fontName="THSarabunNew", fontSize=12, leading=16, textColor=colors.HexColor("#475569")))


def p(text, style="ClassicBody"):
    return Paragraph(text, styles[style])


def annotate(source_name, output_name, points):
    """Create high-contrast numbered callouts with clear leader lines."""
    ASSETS.mkdir(parents=True, exist_ok=True)
    image = PILImage.open(SRC / source_name).convert("RGBA")
    overlay = PILImage.new("RGBA", image.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    font = ImageFont.truetype(str(FONT / "THSarabunNew-Bold.ttf"), 24)
    for point in points:
        number, x, y = point[:3]
        cx, cy = point[3:] if len(point) == 5 else (x, max(24, y - 54))
        r = 19
        draw.line((cx, cy, x, y), fill=(255, 255, 255, 230), width=8)
        draw.line((cx, cy, x, y), fill=RED, width=4)
        if abs(x - cx) > abs(y - cy):
            arrow = [(x, y), (x - 11 if x > cx else x + 11, y - 7), (x - 11 if x > cx else x + 11, y + 7)]
        else:
            arrow = [(x, y), (x - 7, y - 11 if y > cy else y + 11), (x + 7, y - 11 if y > cy else y + 11)]
        draw.polygon(arrow, fill=RED)
        draw.ellipse((cx - r - 3, cy - r - 3, cx + r + 3, cy + r + 3), fill=(255, 255, 255, 240))
        draw.ellipse((cx - r, cy - r, cx + r, cy + r), fill=RED)
        box = draw.textbbox((0, 0), str(number), font=font)
        draw.text((cx - (box[2] - box[0]) / 2, cy - (box[3] - box[1]) / 2 - 2), str(number), font=font, fill="white")
    PILImage.alpha_composite(image, overlay).convert("RGB").save(ASSETS / output_name, quality=95)


def crop_annotate(source_name, output_name, box, points):
    """Create a readable close-up and preserve the same numbered-arrow treatment."""
    ASSETS.mkdir(parents=True, exist_ok=True)
    source = PILImage.open(SRC / source_name).convert("RGBA")
    image = source.crop(box)
    overlay = PILImage.new("RGBA", image.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    font = ImageFont.truetype(str(FONT / "THSarabunNew-Bold.ttf"), 24)
    for point in points:
        number, x, y = point[:3]
        cx, cy = point[3:] if len(point) == 5 else (x, max(24, y - 54))
        r = 19
        draw.line((cx, cy, x, y), fill=(255, 255, 255, 230), width=8)
        draw.line((cx, cy, x, y), fill=RED, width=4)
        if abs(x - cx) > abs(y - cy):
            arrow = [(x, y), (x - 11 if x > cx else x + 11, y - 7), (x - 11 if x > cx else x + 11, y + 7)]
        else:
            arrow = [(x, y), (x - 7, y - 11 if y > cy else y + 11), (x + 7, y - 11 if y > cy else y + 11)]
        draw.polygon(arrow, fill=RED)
        draw.ellipse((cx - r - 3, cy - r - 3, cx + r + 3, cy + r + 3), fill=(255, 255, 255, 240))
        draw.ellipse((cx - r, cy - r, cx + r, cy + r), fill=RED)
        box_text = draw.textbbox((0, 0), str(number), font=font)
        draw.text((cx - (box_text[2] - box_text[0]) / 2, cy - (box_text[3] - box_text[1]) / 2 - 2), str(number), font=font, fill="white")
    PILImage.alpha_composite(image, overlay).convert("RGB").save(ASSETS / output_name, quality=95)


def assets():
    annotate("01-board.png", "01-board.png", [(1, 43, 135), (2, 847, 87), (3, 1020, 87), (4, 1400, 87)])
    annotate("02-card-menu.png", "02-menu.png", [(1, 334, 237), (2, 390, 280), (3, 390, 322), (4, 390, 360)])
    annotate("03-new-lead.png", "03-new-lead.png", [(1, 185, 93), (2, 185, 367), (3, 980, 100), (4, 980, 576)])
    annotate("04-sample-stock.png", "04-sample.png", [(1, 80, 94), (2, 496, 101)])
    annotate("05-production-order.png", "05-production.png", [(1, 388, 72), (2, 388, 383), (3, 390, 547)])
    annotate("06-product-spec.png", "06-spec.png", [(1, 665, 401), (2, 540, 691), (3, 380, 759), (4, 540, 920), (5, 600, 1138), (6, 1090, 1232)])
    crop_annotate("06-product-spec.png", "06-spec-packaging.png", (55, 255, 1345, 1055), [(1, 610, 146), (2, 485, 436), (3, 325, 504), (4, 485, 665)])
    crop_annotate("06-product-spec.png", "06-spec-scent-save.png", (55, 920, 1345, 1305), [(5, 545, 218), (6, 1035, 312)])
    annotate("06-product-spec-label-lot.png", "06-spec-label.png", [(1, 483, 448, 370, 400), (2, 915, 469, 1000, 405), (3, 380, 583, 315, 525), (4, 625, 583, 625, 525), (5, 850, 583, 910, 525)])
    annotate("06-product-spec-lot.png", "06-spec-lot.png", [(1, 625, 241, 740, 195), (2, 410, 307, 320, 260), (3, 625, 414, 705, 360), (4, 470, 577, 400, 520), (5, 785, 577, 855, 520)])
    annotate("07-develop-form.png", "07-develop.png", [(1, 690, 32), (2, 380, 225), (3, 215, 360), (4, 560, 360), (5, 655, 108)])
    annotate("08-develop-document-button.png", "08-document-button.png", [(1, 521, 82)])
    annotate("08-deal-detail.png", "09-detail.png", [(1, 250, 90), (2, 250, 436), (3, 250, 785)])
    annotate("09-list.png", "10-list.png", [(1, 66, 44), (2, 330, 106)])


def header_footer(canvas, doc):
    canvas.saveState()
    canvas.setFont("THSarabunNew", 12)
    canvas.setFillColor(colors.black)
    canvas.drawCentredString(PAGE_W / 2, PAGE_H - 12 * mm, "NAIVE INNOVA | คู่มือการใช้งานระบบ Sales")
    canvas.setStrokeColor(colors.black)
    canvas.line(LEFT, PAGE_H - 15 * mm, PAGE_W - RIGHT, PAGE_H - 15 * mm)
    canvas.line(LEFT, 13 * mm, PAGE_W - RIGHT, 13 * mm)
    canvas.setFillColor(colors.HexColor("#334155"))
    canvas.setFont("THSarabunNew", 12)
    canvas.drawString(LEFT, 7 * mm, "Naive Innova - Development Local Workspace")
    canvas.drawRightString(PAGE_W - RIGHT, 7 * mm, f"หน้า {doc.page}")
    canvas.restoreState()


def screen(name, caption, max_h=112 * mm):
    path = ASSETS / name
    w, h = PILImage.open(path).size
    ratio = min(WIDTH / w, max_h / h)
    table = Table([[Image(str(path), w * ratio, h * ratio)]], colWidths=[WIDTH])
    table.setStyle(TableStyle([
        ("BOX", (0, 0), (-1, -1), 0.75, colors.black),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ("TOPPADDING", (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
    ]))
    return [table, Spacer(1, 2), p(caption, "ClassicCaption")]


def bullets(entries):
    out = []
    for index, entry in enumerate(entries, 1):
        out.append(p(f"{index}. {entry}", "ClassicStep"))
    return out


def note(text):
    table = Table([[p(f"<b>ข้อควรระวัง:</b> {text}", "ClassicBody")]], colWidths=[WIDTH - 17 * mm])
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#fff7ed")),
        ("BOX", (0, 0), (-1, -1), 0.6, colors.HexColor("#f97316")),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    return table


def section(story, heading, subheading, explanation, image_name=None, caption=None, max_h=112 * mm):
    story.append(PageBreak())
    story.append(p(heading, "ClassicTitle"))
    story.append(p(subheading, "ClassicH2"))
    story.append(p(explanation, "ClassicBody"))
    if image_name:
        # Keep concise instructions with the screenshot; only actual overflow moves onward.
        story.extend(screen(image_name, caption, max_h))
        story.append(p("ขั้นตอนปฏิบัติและข้อควรระวัง", "ClassicH2"))


def build():
    assets()
    story = [
        Spacer(1, 45 * mm), p("คู่มือการใช้งานระบบ Sales", "ClassicCover"), Spacer(1, 7 * mm),
        p("Naive MES - สำหรับพนักงานขาย", "ClassicCoverSub"), Spacer(1, 24 * mm),
        p("คู่มือนี้อธิบายการใช้งานแบบทีละขั้นตอน ตั้งแต่เปิดดีล เลือก flow จนถึงส่งต่อเอกสารให้ทีมที่เกี่ยวข้อง", "ClassicBody"),
        Spacer(1, 9 * mm), p("ขอบเขต: Kanban card, List, ตัวอย่างสินค้า, สั่งสินค้า, พัฒนาสูตร, ประวัติ และเอกสาร", "ClassicBody"),
        Spacer(1, 55 * mm), p("ฉบับใช้งานใน Development", "ClassicCoverSub"),
    ]
    story.extend([
        PageBreak(), p("สารบัญ", "ClassicTitle"), Spacer(1, 4 * mm),
        p("คู่มือการใช้งานระบบ Sales", "ClassicH2"),
        p("1. การแสดงผลหน้า Sales", "ClassicBody"),
        p("2. การใช้งาน Kanban card", "ClassicBody"),
        p("3. การสร้างดีลใหม่และข้อมูลลูกค้า", "ClassicBody"),
        p("4. การส่งตัวอย่างสินค้า", "ClassicBody"),
        p("5. การสั่งสินค้าและเปิดใบสั่งผลิต", "ClassicBody"),
        p("6. ตั้งค่าสเปกสินค้า", "ClassicBody"),
        p("7. การสั่งพัฒนาสูตร", "ClassicBody"),
        p("8. การดาวน์โหลดและตรวจเอกสาร", "ClassicBody"),
        p("9. การแก้ไขดีลและตรวจประวัติ", "ClassicBody"),
        p("10. การใช้งาน List", "ClassicBody"),
        p("11. เช็กลิสต์ก่อนบันทึก", "ClassicBody"),
    ])

    section(story, "คู่มือการใช้งานระบบ Sales", "1. การแสดงผลหน้า Sales", "หน้า Sales ใช้ติดตามลูกค้าและงานขายตาม Stage โดยเปลี่ยนมุมมองเป็นบอร์ดหรือ List ได้ตามลักษณะงาน", "01-board.png", "รูปภาพแสดงหน้า Sales แบบบอร์ด")
    story.extend(bullets([
        "กดเมนู <b>Sales</b> หมายเลข 1 เพื่อเข้าสู่หน้าขาย",
        "ใช้ปุ่ม <b>บอร์ด / ลิสต์</b> หมายเลข 2 เพื่อสลับการมองข้อมูล",
        "ใช้ <b>เพิ่ม Stage ใหม่</b> หมายเลข 3 เฉพาะเมื่อทีมกำหนดขั้นตอนใหม่",
        "กด <b>เพิ่มดีลใหม่ (Lead)</b> หมายเลข 4 เมื่อต้องสร้างลูกค้าหรืองานใหม่",
    ]))
    story.append(note("Stage เป็นสถานะงานจริงของลูกค้า ไม่ควรย้ายเพื่อจัดหน้าบอร์ดให้ดูเรียบร้อย"))

    section(story, "2. การใช้งาน Kanban card", "2.1 เมนูจุดสามจุดบนการ์ด", "แต่ละการ์ดแทนดีลของลูกค้าหนึ่งราย ให้ใช้เมนูนี้เมื่อจำเป็นต้องแก้ไข ย้าย Stage หรือลบดีลที่สร้างผิด", "02-menu.png", "รูปภาพแสดงเมนูคำสั่งของ Kanban card")
    story.extend(bullets([
        "เลื่อนเมาส์ไปบนการ์ด แล้วกดปุ่ม <b>...</b> หมายเลข 1",
        "เลือก <b>แก้ไขข้อมูลดีล</b> หมายเลข 2 เพื่อเปิดแผงรายละเอียดด้านขวา",
        "เลือก <b>ย้ายไปยังคอลัมน์</b> หมายเลข 3 แล้วเลือก Stage ตามงานจริง",
        "เลือก <b>ลบดีลลูกค้า</b> หมายเลข 4 เฉพาะดีลซ้ำหรือสร้างผิดเท่านั้น",
    ]))
    story.append(note("ก่อนลบต้องตรวจชื่อผู้ติดต่อและ Lead ID เพราะดีลอาจมีคำสั่งผลิตหรือเอกสารผูกอยู่"))

    section(story, "3. การสร้างดีลใหม่", "3.1 กรอกข้อมูลลูกค้าและเลือกประเภทคำสั่ง", "เมื่อมีลูกค้าใหม่ หรือมีงานใหม่ของลูกค้าเดิม ให้กดเพิ่มดีลใหม่และกรอกข้อมูลก่อนเลือก flow", "03-new-lead.png", "รูปภาพแสดงหน้าต่างสร้างดีลใหม่")
    story.extend(bullets([
        "เลือกหรือพิมพ์ชื่อลูกค้า หมายเลข 1 ระบบจะแสดงข้อมูลเดิมเมื่อเป็นลูกค้าเก่า",
        "ตรวจเบอร์โทร ที่อยู่ผู้รับ และเลือก Stage หมายเลข 2 ให้ถูกต้อง",
        "เลือกประเภทคำสั่งด้านขวา หมายเลข 3: ตัวอย่างสินค้า, สั่งสินค้า หรือพัฒนาสูตรเอง",
        "ตรวจรายการคำสั่งที่เลือก แล้วกด Create Lead หมายเลข 4",
    ]))

    section(story, "3.2 การกรอกข้อมูลลูกค้า", "ข้อมูลที่ต้องกรอกก่อนเลือก flow", "ให้บันทึกข้อมูลติดต่อที่ทีมจะใช้ตามงานจริง ไม่ใช้หมายเหตุแทนช่องข้อมูลหลัก", "03-new-lead.png", "รูปภาพแสดงตำแหน่งข้อมูลลูกค้าและ Stage", 62 * mm)
    story.extend(bullets([
        "ชื่อลูกค้า/คลินิก/บริษัท: พิมพ์ชื่อที่ใช้ติดต่อจริง หากพบชื่อเดิม ให้เลือกชื่อเดิมเพื่อลดการสร้างข้อมูลซ้ำ",
        "เบอร์โทรศัพท์: ใส่เบอร์หลักที่ติดต่อได้ ถ้ามีหลายเบอร์ ให้บันทึกเบอร์ที่ใช้ตัดสินใจสั่งซื้อก่อน",
        "ที่อยู่ผู้รับ/จัดส่ง: ใส่บ้านเลขที่ ถนน ตำบล อำเภอ จังหวัด และรหัสไปรษณีย์ให้ครบก่อนเลือก sample หรือสั่งสินค้า",
        "Stage: เลือกตำแหน่งเริ่มต้นตามสถานะจริงของการเจรจา ไม่เลือก Retention เพียงเพราะเป็นลูกค้าเก่า",
        "หมายเหตุ: ใช้เฉพาะข้อมูลเสริม เช่น ขอใบเสนอราคาด่วน หรือเวลาที่สะดวกให้โทรกลับ",
    ]))
    story.append(note("การกรอกที่อยู่ไม่ครบทำให้ Stock ส่งของไม่ได้ และการใส่ข้อมูลสำคัญไว้ในหมายเหตุทำให้ทีมถัดไปหาไม่พบ"))

    section(story, "4. การส่งตัวอย่างสินค้า", "4.1 เลือกสินค้าตัวอย่างจาก stock", "ใช้ flow นี้เมื่อลูกค้าต้องการทดลองสินค้าที่มีอยู่แล้วใน stock เท่านั้น", "04-sample.png", "รูปภาพแสดง checklist เลือกตัวอย่างสินค้า")
    story.extend(bullets([
        "เลือกแท็บ <b>ตัวอย่างสินค้า</b> แล้วติ๊กสินค้าที่ลูกค้าต้องการ หมายเลข 1",
        "ตรวจจำนวนคงเหลือของสินค้า หมายเลข 2 ก่อนกำหนดจำนวนตัวอย่าง",
        "ระบุจำนวนเป็นชิ้น แล้วกด Create Lead หลังตรวจชื่อและที่อยู่ผู้รับ",
    ]))
    story.append(note("หากลูกค้าต้องการสูตรเฉพาะแบรนด์ ห้ามเลือกตัวอย่างสินค้า ให้ใช้พัฒนาสูตรเอง"))

    section(story, "4.2 ตรวจ stock ก่อนสร้างดีลตัวอย่าง", "กรณีจำนวนสินค้าไม่เพียงพอ", "จำนวนที่เลือกใน sample เป็นจำนวนชิ้นที่ Stock ต้องหยิบจริง จึงต้องตรวจป้ายคงเหลือทุกรายการ", "04-sample.png", "รูปภาพแสดงป้ายจำนวนคงเหลือของสินค้าตัวอย่าง", 62 * mm)
    story.extend(bullets([
        "เปรียบเทียบจำนวนที่ลูกค้าขอกับป้าย “คงเหลือ” ของสินค้ารายการนั้น",
        "หาก stock พอ ให้เลือกสินค้าและระบุจำนวนที่ต้องส่ง",
        "หาก stock ไม่พอ ให้หยุดก่อน Create Lead แล้วแจ้ง Stock หรือเสนอสินค้าตัวอย่างตัวอื่นให้ลูกค้า",
        "หลังสร้างดีล ให้เปิดรายละเอียดตรวจรายการ sample อีกครั้งก่อนส่งต่อทีม Stock",
    ]))

    section(story, "5. การสั่งสินค้าและเปิดใบสั่งผลิต", "5.1 เริ่มจากเพิ่มใบสั่งผลิต", "ใช้ flow นี้เมื่อลูกค้าตกลงผลิตสินค้าหรือสั่งสินค้าที่มีสูตรอยู่แล้ว", "05-production.png", "รูปภาพแสดงพื้นที่รายการใบสั่งผลิต")
    story.extend(bullets([
        "เลือกแท็บ <b>สั่งสินค้า</b> หมายเลข 1",
        "กด <b>เพิ่มใบสั่งผลิต</b> หมายเลข 2 เพื่อเพิ่มรายการผลิต",
        "เลือกสูตร ขนาด และจำนวน จากนั้นกด Create Lead หมายเลข 3",
        "กดปุ่มรายละเอียดของรายการผลิตเพื่อระบุแบรนด์ บรรจุภัณฑ์ และฉลาก",
    ]))
    story.append(note("หาก R&D ยังต้องคิดสูตร ห้ามเปิดเป็นสั่งสินค้า เพราะระบบจะส่งต่อเป็นงานผลิต"))

    section(story, "5.2 ตรวจรายการก่อนเปิดงานผลิต", "ข้อมูลที่ Production ต้องได้รับ", "หลังเพิ่มใบสั่งผลิต ให้ตรวจรายละเอียดทุกบรรทัดก่อนกด Create Lead เพราะข้อมูลนี้จะส่งต่อให้ Production ใช้เปิดงาน", "05-production.png", "รูปภาพแสดงรายการใบสั่งผลิตและปุ่มเพิ่มรายการ", 82 * mm)
    story.extend(bullets([
        "สูตร/สินค้า: เลือกให้ตรงกับที่ลูกค้ายืนยัน ไม่ใช้ชื่อคล้ายกันแทนกัน",
        "ขนาดบรรจุภัณฑ์: ตรวจว่าเป็น ml ที่ลูกค้าตกลง และเข้ากับขวดที่ต้องใช้",
        "จำนวนชิ้น: ใส่จำนวนผลิตจริง ไม่ใช่จำนวนตัวอย่างหรือจำนวนที่ลูกค้าคาดว่าจะสั่งในอนาคต",
        "ถ้ามีมากกว่าหนึ่งสินค้า ให้กดเพิ่มใบสั่งผลิต แล้วบันทึกแต่ละรายการแยกกัน",
        "ห้ามแก้รายการหลังทีม R&D หรือ Production อนุมัติแล้ว หากระบบล็อกข้อมูลให้แจ้งทีม Production",
    ]))

    section(story, "6. ตั้งค่าสเปกสินค้า", "6.1 แบรนด์ บรรจุภัณฑ์ หัวฉีด และกลิ่น", "รายละเอียดสเปกเป็นข้อมูลที่ Production และ Stock ใช้ทำงานต่อ จึงต้องกรอกให้ครบก่อนส่งงาน", "06-spec.png", "รูปภาพแสดงหน้าต่างตั้งค่าข้อมูลสินค้าโดยละเอียด")
    story.extend(bullets([
        "กรอกแบรนด์ให้ตรงกับแบรนด์ที่จะผลิต",
        "เลือกบรรจุภัณฑ์ แล้วตรวจข้อความ stock ใต้ช่องเลือก",
        "เลือกหัวฉีดให้เข้ากับบรรจุภัณฑ์",
        "เลือกกลิ่นตามที่ลูกค้าอนุมัติ และกดบันทึกสเปก",
    ]))
    story.append(note("ถ้าขึ้น “ไม่มีในสต็อก” ให้แจ้ง Stock ก่อน ห้ามสร้างดีลแล้วปล่อยให้ทีมถัดไปแก้"))

    section(story, "6.2 ตั้งค่าสเปกสินค้าเพิ่มเติม", "ข้อมูลที่ต้องเลื่อนลงไปกรอก", "หลังบันทึกแบรนด์และอุปกรณ์ ให้เลื่อนลงในหน้าต่างเดียวกันเพื่อกรอกข้อมูลส่วนล่าง", "06-spec.png", "รูปภาพแสดงหน้าต่างสเปกสินค้า")
    story.extend(bullets([
        "ระบุขนาดขวด (ml) และปริมาณที่ใส่จริง (ml) โดยห้ามเกินขนาดบรรจุภัณฑ์",
        "ระบุจำนวนขวดและหัวฉีดให้เท่ากับจำนวนชิ้นที่สั่งผลิต",
        "ระบุสติ๊กเกอร์ ขนาดสติ๊กเกอร์ สถานะฉลาก และตำแหน่งยิง LOT",
        "กดบันทึกสเปกในหน้าต่างก่อน แล้วกลับไปกด Create Lead หรือ Save Changes ของดีล",
    ]))

    section(story, "6.3 รายละเอียดฉลาก", "ข้อมูลฉลากที่ต้องยืนยันกับลูกค้าก่อนผลิต", "ภาพนี้แสดงส่วนฉลากจริงในหน้าต่างสเปกสินค้า โดย Sale ต้องระบุให้ Production และ Stock อ่านแล้วทำตามได้", "06-spec-label.png", "รูปภาพขยาย: หมายเลข 1 เลือกฉลาก, 2 ภาพฉลาก, 3 ขนาด, 4 ผู้สั่งผลิต, 5 สถานะฉลาก", 82 * mm)
    story.extend(bullets([
        "ที่ <b>เลือกสติกเกอร์</b> หมายเลข 1 เลือกฉลากที่ตรงกับสินค้า และตรวจว่าลูกค้าส่งไฟล์หรืออนุมัติแบบแล้ว. ไม่ควรใช้คำว่า “ตามเดิม” โดยไม่มีชื่อหรือรหัสฉลาก.",
        "ภาพฉลาก หมายเลข 2 ใช้ตรวจแบบเบื้องต้น. ให้เทียบชื่อสินค้า แบรนด์ และขนาดที่แสดงกับเอกสารยืนยันจากลูกค้าก่อนบันทึก.",
        "ที่ <b>ขนาดสติกเกอร์</b> หมายเลข 3 ระบุความกว้าง x สูงเป็นเซนติเมตร เช่น 5 x 8 cm. หากไม่ทราบขนาด ให้ประสาน Production หรือ Stock ก่อนเปิดงาน.",
        "ที่ <b>ผู้สั่งผลิตสติกเกอร์</b> หมายเลข 4 เลือกผู้รับผิดชอบให้ถูกต้อง เพื่อให้ทีมตามงานฉลากได้ตรงจุด.",
        "ที่ <b>สถานะสติกเกอร์</b> หมายเลข 5 ใช้คำที่ชัดเจน เช่น พร้อมใช้, รอผลิต, หรือรออนุมัติ. สถานะ “รอสติกเกอร์” หมายถึงยังไม่พร้อมเริ่มผลิตสินค้า.",
    ]))

    section(story, "6.4 รายละเอียด LOT", "จุดยิง LOT และข้อมูลสำหรับตรวจสอบย้อนหลัง", "LOT ต้องสะท้อนข้อตกลงกับลูกค้าและใช้สำหรับตรวจสอบย้อนหลัง จึงต้องกรอกให้ตรงก่อนส่งงานเข้าสู่ Production", "06-spec-lot.png", "รูปภาพขยาย: หมายเลข 1 ตำแหน่งยิง, 2 ตัวเลือกที่พิมพ์, 3 เลข LOT, 4 วันผลิต, 5 วันหมดอายุ", 82 * mm)
    story.extend(bullets([
        "ที่ <b>ตำแหน่งการยิงล็อต</b> หมายเลข 1 เลือกตำแหน่งจริง เช่น ใต้ขวด ข้างขวด หรือบนฉลาก. ต้องตรงกับบรรจุภัณฑ์และข้อตกลงกับลูกค้า.",
        "หมายเลข 2 ใช้เลือกว่าต้องแสดงเลขล็อตและ/หรือวันที่ผลิตบนสินค้า. ให้ยืนยันกับลูกค้าก่อนเลือก เพราะมีผลต่อข้อความที่พิมพ์บนสินค้า.",
        "หมายเลข 3 แสดงเลข LOT ที่ระบบสร้างให้อัตโนมัติ. Sale ไม่ควรแก้หรือกำหนดเลขเอง เว้นแต่ลูกค้ายืนยันรูปแบบเลข LOT เป็นลายลักษณ์อักษร.",
        "หมายเลข 4 และ 5 คือวันผลิต (MFG) และวันหมดอายุ (EXP). หากตั้งเป็น Auto ระบบจะอ้างอิงวันที่ผ่าน QC ตามกติกาของระบบ จึงห้ามบันทึกวันที่คาดเดา.",
        "หลังตรวจฉลากและ LOT แล้ว กด <b>บันทึกข้อมูลสเปกสินค้า</b> ก่อนกลับไปบันทึกดีล. ข้อมูลที่ยังไม่ครบให้บันทึกไว้ในหมายเหตุดีลและแจ้งผู้เกี่ยวข้อง.",
    ]))

    section(story, "6.5 เลือกบรรจุภัณฑ์และหัวฉีด", "ขั้นตอนทำตามในหน้าต่างตั้งค่าสเปกสินค้า", "ภาพขยายนี้แสดงเฉพาะข้อมูลที่ต้องเลือกก่อนเปิดงาน เพื่อให้อ่านชื่อและตรวจสถานะสต็อกได้ชัดเจน", "06-spec-packaging.png", "รูปภาพขยาย: หมายเลข 1 แบรนด์, 2 บรรจุภัณฑ์, 3 สถานะสต็อก, 4 หัวฉีด", 97 * mm)
    story.extend(bullets([
        "กรอก <b>แบรนด์</b> หมายเลข 1 ให้เป็นชื่อที่จะพิมพ์หรือแสดงบนสินค้า ไม่ใช่ชื่อลูกค้าหากลูกค้ามีแบรนด์ต่างหาก เช่น ลูกค้า บริษัท A แต่แบรนด์สินค้า Pet Care.",
        "ที่ <b>บรรจุภัณฑ์ (ขวด/กระปุก)</b> หมายเลข 2 กดเลือก แล้วค้นหาจากชื่อ ขนาด หรือชนิด. ตรวจชื่อและขนาดบนรายการก่อนกดยืนยัน.",
        "อ่านสถานะใต้ช่อง หมายเลข 3 ทุกครั้ง. หากขึ้น <b>ไม่มีในสต็อก</b> ให้หยุดเลือกสเปกนี้ บันทึกชื่อและขนาดที่ต้องการ แล้วประสาน Stock. ห้ามถือว่าสเปกถูกเลือกเพียงเพราะเห็นชื่อในรายการ.",
        "ตรวจภาพตัวอย่างเทียบกับชนิดที่ลูกค้าตกลง โดยเฉพาะขวดปั๊ม ขวดหัวสเปรย์ กระปุก และขนาด. ภาพช่วยตรวจชนิด แต่ชื่อและขนาดในรายการคือข้อมูลอ้างอิงหลัก.",
        "ที่ <b>หัวฉีด</b> หมายเลข 4 กดเลือกหัวฉีดที่ใช้คู่กับขวดนั้น. ต้องตรวจชนิดคอขวดและลักษณะการใช้งาน เช่น ปั๊ม สเปรย์ หรือฝา. หากไม่แน่ใจ ให้ถาม Stock ก่อนบันทึก.",
        "เมื่อหัวฉีดไม่มีในสต็อก ให้แจ้ง Stock และบันทึกสเปกที่ลูกค้าต้องการในหมายเหตุของดีล. ห้ามเปลี่ยนชนิดเอง.",
    ]))

    section(story, "6.6 เลือกกลิ่นและบันทึกสเปก", "สิ่งที่ต้องตรวจให้ครบก่อนกดบันทึกข้อมูลสเปกสินค้า", "ภาพขยายนี้แสดงจุดสุดท้ายก่อนปิดหน้าต่างสเปก. Sale ต้องยืนยันกลิ่นกับลูกค้า และบันทึกสเปกให้เสร็จก่อนบันทึกดีล", "06-spec-scent-save.png", "รูปภาพขยาย: หมายเลข 5 กลิ่นที่เลือก และ 6 ปุ่มบันทึกข้อมูลสเปกสินค้า", 73 * mm)
    story.extend(bullets([
        "ที่หัวข้อ <b>กลิ่นที่เลือก</b> หมายเลข 5 กดเลือก/เพิ่มกลิ่น แล้วเลือกชื่อกลิ่นที่ลูกค้ายืนยัน. หากลูกค้าไม่ต้องการกลิ่น ให้ระบุว่า <b>ไม่ใส่กลิ่น</b> ให้ชัด ไม่ปล่อยช่องว่างเพราะ R&D และ Production อาจตีความต่างกัน.",
        "หากลูกค้าใช้ชื่อกลิ่นทางการตลาด ให้บันทึกชื่อที่ลูกค้าใช้ไว้ในรายละเอียดหรือหมายเหตุด้วย เช่น กลิ่น Fresh Care. อย่าเดาชื่อวัตถุดิบกลิ่นแทนทีม R&D.",
        "ตรวจย้อนหลัง 4 ส่วนก่อนบันทึก: แบรนด์, บรรจุภัณฑ์, หัวฉีด, และกลิ่น. ชื่อที่เห็นในหน้าต่างต้องตรงกับใบเสนอราคา/ข้อความยืนยันจากลูกค้า.",
        "กด <b>บันทึกข้อมูลสเปกสินค้า</b> หมายเลข 6 เพียงครั้งเดียว แล้วรอให้หน้าต่างปิดหรือข้อมูลที่เลือกแสดงกลับในดีล. ห้ามกดซ้ำขณะระบบกำลังบันทึก.",
        "หลังหน้าต่างปิด ให้กลับมาตรวจรายการในดีลอีกครั้ง แล้วจึงกด <b>Create Lead</b> สำหรับดีลใหม่ หรือ <b>Save Changes</b> สำหรับดีลเดิม. การบันทึกสเปกอย่างเดียวไม่ได้บันทึกการแก้ไขของดีลทั้งหมด.",
        "หากพบว่าบันทึกไปแล้วแต่เลือกผิด ให้เปิดสเปกและแก้ไขก่อนส่งต่อทีมถัดไป. หาก Production หรือ R&D เริ่มงานแล้ว ให้แจ้งทีมที่เกี่ยวข้องพร้อม Lead ID ก่อนแก้ไข.",
    ]))

    section(story, "7. การสั่งพัฒนาสูตร", "7.1 สร้างใบสั่งพัฒนาสูตร", "เลือก flow นี้เมื่อลูกค้าต้องการสูตรใหม่หรือสูตรเฉพาะแบรนด์", "07-develop.png", "รูปภาพแสดงแท็บพัฒนาสูตรเอง")
    story.extend(bullets([
        "เลือกแท็บ <b>พัฒนาสูตรเอง</b> หมายเลข 1",
        "กรอกชื่อสูตร/ผลิตภัณฑ์ หมายเลข 2 และกรอกแบรนด์",
        "กด <b>รายละเอียด</b> หมายเลข 3 เพื่อกรอก requirement ของลูกค้า",
        "กด <b>ใบสั่งพัฒนาสูตร</b> หมายเลข 4 เพื่อเปิดเอกสาร",
        "กด <b>เพิ่มใบสั่งพัฒนาสูตร</b> หมายเลข 5 เมื่อลูกค้าต้องการสูตรที่ 2",
    ]))
    story.append(note("งานพัฒนาสูตรไม่มีจำนวนชิ้น และในประวัติต้องแสดงสถานะ “พัฒนาสูตร” ไม่ใช่ “อยู่ในคลัง”"))

    section(story, "7.2 กรอกรายละเอียดใบสั่งพัฒนาสูตร", "ข้อมูล requirement ที่ R&D ต้องใช้", "หลังจากกดรายละเอียด ให้กรอกข้อมูลเป็นภาษาที่วัดผลได้ เพื่อไม่ให้ R&D ต้องถามข้อมูลซ้ำ", "07-develop.png", "รูปภาพแสดงปุ่มรายละเอียดในรายการพัฒนาสูตร", 58 * mm)
    story.extend(bullets([
        "กรอกหมวดผลิตภัณฑ์ และสัตว์/ผิวเป้าหมาย เช่น แชมพูสำหรับสุนัขผิวแพ้ง่าย",
        "กรอก Claim ที่อยากได้ สารสกัดออกฤทธิ์ และสารต้องมี/สารต้องห้าม",
        "กรอกลักษณะเนื้อ สี กลิ่น งบต่อหน่วย จำนวน และ Timeline ส่งตัวอย่าง",
        "กรอกตัวอย่างอ้างอิง บรรจุภัณฑ์เป้าหมาย มาตรฐาน Shelf life และ IP/NDA ถ้ามี",
    ]))

    section(story, "7.3 รายละเอียดพัฒนาสูตร: ความต้องการสินค้า", "กรอก requirement ในปุ่มรายละเอียด", "ส่วนนี้ทำให้ R&D เข้าใจว่าสินค้าต้องแก้ปัญหาใด และสามารถเลือกแนวทางพัฒนาที่ตรงกับลูกค้า", "07-develop.png", "รูปภาพแสดงปุ่มรายละเอียดในแต่ละสูตร", 54 * mm)
    story.extend(bullets([
        "หมวดผลิตภัณฑ์: ระบุประเภท เช่น แชมพู ครีม สเปรย์ เซรั่ม หรือเจล",
        "สัตว์ + ผิวเป้าหมาย: ระบุกลุ่มผู้ใช้และปัญหาที่ต้องการแก้ เช่น สุนัขผิวแพ้ง่าย หรือแมวขนยาว",
        "Claim ที่อยากได้: เขียนผลลัพธ์ที่ลูกค้าต้องการ เช่น ลดคัน ขนนุ่ม ลดกลิ่น โดยไม่กล่าวอ้างเกินที่ยืนยัน",
        "สารสกัดออกฤทธิ์: ระบุสารที่ลูกค้าต้องการเป็นพิเศษ และสารต้องมี/สารต้องห้ามให้ชัดเจน",
        "ลักษณะเนื้อ + สี + กลิ่น: บรรยายให้วัดผลได้ เช่น เนื้อเจลใส สีฟ้าอ่อน กลิ่นลาเวนเดอร์อ่อน",
    ]))

    section(story, "7.4 รายละเอียดพัฒนาสูตร: เงื่อนไขธุรกิจ", "ข้อมูลสำหรับประเมินต้นทุนและเวลา", "R&D ใช้ข้อมูลส่วนนี้วางแผนต้นทุน ตัวอย่าง และข้อจำกัดของสูตร", "07-develop.png", "รูปภาพแสดงรายการพัฒนาสูตร", 54 * mm)
    story.extend(bullets([
        "งบต่อหน่วย + จำนวน: ระบุหน่วยชัด เช่น ต้นทุนไม่เกิน 35 บาท/ชิ้น และต้องการทดลอง 3 สูตร",
        "Timeline: ระบุวันที่หรือจำนวนวัน เช่น ต้องการตัวอย่างภายใน 7 วัน",
        "ตัวอย่างอ้างอิง: ระบุ benchmark สินค้า รูปภาพ หรือลิงก์ที่ใช้เทียบได้",
        "บรรจุภัณฑ์เป้าหมาย ตลาด มาตรฐาน Shelf life และ IP/NDA: กรอกเมื่อเป็นเงื่อนไขที่ห้ามหลุด",
        "หากมีสูตรที่ 2 ให้กดเพิ่มใบสั่งพัฒนาสูตร แล้วกรอกชื่อ แบรนด์ และรายละเอียดแยกจากสูตรที่ 1",
    ]))

    section(story, "8. การดาวน์โหลดเอกสาร", "8.1 ดาวน์โหลดใบสั่งพัฒนาสูตร", "ปุ่มเอกสารอยู่ในแต่ละการ์ดสูตร และเอกสารที่ได้ขึ้นกับสถานะของ R&D", "08-document-button.png", "รูปภาพแสดงปุ่มใบสั่งพัฒนาสูตร")
    story.extend(bullets([
        "หาก R&D ยังไม่ pass เอกสารที่ดาวน์โหลดได้มีเพียง Requirements Brief หน้าเดียว",
        "หาก R&D pass แล้ว จะได้เอกสารเดียว 2 หน้า: Requirement หน้า 1 และสูตร/วิธีผลิต หน้า 2",
        "ก่อน Save as PDF หรือ Print ให้ตรวจว่าหน้า 2 มีเฉพาะสูตรที่ pass และไม่มีคำว่าอยู่ระหว่างทดสอบ",
        "ตารางสูตรหน้า 2 มีเพียง ขั้นตอน, ชื่อสารเคมี, กลุ่ม, 100 ก., และต่อ 1 กก.",
    ]))

    section(story, "8.2 ตรวจเอกสารก่อนส่ง", "แยกเอกสารตามสถานะ R&D", "ก่อนกด Save as PDF หรือ Print ให้ตรวจข้อมูลบนเอกสารและจำนวนหน้า เพราะเอกสารใช้ส่งต่อข้ามทีมและให้ลูกค้าได้", "08-document-button.png", "รูปภาพแสดงปุ่มดาวน์โหลดใบสั่งพัฒนาสูตร", 42 * mm)
    story.extend(bullets([
        "งานยังไม่เสร็จ: ต้องได้ Requirements Brief หน้าเดียว และต้องไม่มีตารางสารเคมีหรือขั้นตอนการผลิต",
        "งานผ่าน R&D: ต้องได้เอกสารเดียว 2 หน้า ไม่ใช่ปุ่มสองปุ่มหรือ PDF สองไฟล์",
        "หน้า 2: ใช้เฉพาะสูตรที่ pass และไม่มีคำว่า “อยู่ระหว่างทดสอบ” หรือ “ทางเลือกที่...”",
        "หากจำนวนหน้า สถานะ หรือชื่อสูตรผิด ให้หยุดส่งเอกสาร เก็บ Lead ID และแจ้งผู้ดูแลระบบ",
    ]))

    section(story, "9. การแก้ไขดีลและตรวจประวัติ", "9.1 แผงรายละเอียดดีล", "คลิกการ์ดหรือแถวใน List เพื่อเปิดข้อมูลติดต่อ เปลี่ยน Stage และตรวจประวัติงานของลูกค้า", "09-detail.png", "รูปภาพแสดงแผงรายละเอียดด้านขวา")
    story.extend(bullets([
        "ตรวจชื่อดีลและ Lead ID หมายเลข 1 ก่อนแก้ไข",
        "เลือก Stage ใหม่ หมายเลข 2 ตามสถานะงานจริง แล้วกด Save Changes",
        "เลื่อนลงไปดูประวัติ หมายเลข 3 ก่อนเปิดงานใหม่ให้ลูกค้าเดิม",
        "พัฒนาสูตร = งาน R&D ไม่มีจำนวนชิ้น; อยู่ในคลัง = สินค้าหรือสูตรโรงงานที่ผลิตเสร็จแล้ว",
    ]))

    section(story, "9.2 Retention และลูกค้าเก่า", "เมื่อดีลพัฒนาสูตรเข้าสู่ Retention 1", "Retention ใช้ติดตามผลหลังงานเสร็จและช่วยให้ Sale เห็นว่าลูกค้าเคยทำงานกับบริษัทแล้ว", "09-detail.png", "รูปภาพแสดงพื้นที่รายละเอียดและประวัติของดีล", 105 * mm)
    story.extend(bullets([
        "เมื่อย้ายดีลพัฒนาสูตรไป Retention 1 ระบบต้องปิดข้อมูลคำขอพัฒนาสูตรเดิม",
        "ลูกค้าควรถูกระบุเป็นลูกค้าเก่าด้วยสัญลักษณ์ดาว เพื่อให้ Sale ใช้ประวัติเดิมประกอบการพูดคุย",
        "หากลูกค้าสั่งสูตรเดิมที่ผ่านแล้ว ให้เปิด flow สั่งสินค้า ไม่สร้างใบพัฒนาสูตรซ้ำ",
        "ตรวจ badge ในประวัติ: สูตรโรงงานที่มี stock ใช้ “อยู่ในคลัง”; งาน R&D ใช้ “พัฒนาสูตร”",
    ]))

    section(story, "10. การใช้งาน List", "10.1 ค้นหาดีลในรูปแบบตาราง", "ใช้ List เมื่อต้องตรวจข้อมูลลูกค้าหลายรายการหรือค้นหาด้วยชื่อและเบอร์โทร", "10-list.png", "รูปภาพแสดงหน้า Sales แบบ List")
    story.extend(bullets([
        "กดปุ่ม List หมายเลข 1 เพื่อเปลี่ยนจาก Kanban เป็นตาราง",
        "ใช้ช่องค้นหา หมายเลข 2 ด้วยชื่อหรือเบอร์โทรศัพท์",
        "คลิกแถวลูกค้าเพื่อเปิดแผงรายละเอียดด้านขวา และตรวจ Lead ID ก่อนแก้ไข",
    ]))

    section(story, "11. เช็กลิสต์ก่อนบันทึก", "11.1 ตรวจความครบถ้วนก่อน Create Lead หรือ Save Changes", "ใช้เช็กลิสต์นี้ทุกครั้งก่อนส่งข้อมูลให้ทีมอื่น", None)
    story.extend(bullets([
        "ชื่อ เบอร์โทร ที่อยู่ผู้รับ และ Stage ถูกต้อง",
        "เลือก flow ตรงกับสิ่งที่ลูกค้าขอ: sample, สั่งสินค้า หรือพัฒนาสูตรเอง",
        "งานผลิตมีสูตร จำนวน แบรนด์ บรรจุภัณฑ์ หัวฉีด กลิ่น และฉลากครบ",
        "งานพัฒนาสูตรมีชื่อสูตร แบรนด์ และรายละเอียด brief ครบทุกสูตร",
        "สถานะเอกสารถูกต้อง: ไม่ pass = หน้าเดียว, pass = เอกสารเดียว 2 หน้า",
        "กด Create Lead หรือ Save Changes แล้วเปิดตรวจข้อมูลซ้ำ",
    ]))
    story.append(note("เมื่อพบข้อมูลหรือเอกสารผิด ให้เก็บ Lead ID, ชื่อลูกค้า, วันเวลา และภาพหน้าจอ ก่อนแจ้งผู้ดูแลระบบ"))

    doc = SimpleDocTemplate(str(PDF), pagesize=A4, leftMargin=LEFT, rightMargin=RIGHT, topMargin=TOP, bottomMargin=BOTTOM)
    doc.build(story, onFirstPage=header_footer, onLaterPages=header_footer)
    print(PDF)


if __name__ == "__main__":
    build()
