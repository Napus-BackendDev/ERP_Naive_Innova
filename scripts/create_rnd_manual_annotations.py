"""Create compact numbered pointers for the R&D manual screenshots."""

from math import atan2, cos, sin
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "output" / "pdf" / "rnd_manual_assets"
OUTPUT = ROOT / "output" / "pdf" / "rnd_manual_annotated_assets"
FONT = Path("C:/Windows/Fonts/arialbd.ttf")

NAVY = (15, 42, 67, 255)
AMBER = (245, 158, 11, 255)
WHITE = (255, 255, 255, 255)


def draw_pointer(draw, number, badge, target, radius, font):
    bx, by = badge
    tx, ty = target
    angle = atan2(ty - by, tx - bx)
    start = (bx + cos(angle) * radius, by + sin(angle) * radius)
    end = (tx - cos(angle) * 8, ty - sin(angle) * 8)

    draw.line((*start, *end), fill=WHITE, width=8)
    draw.line((*start, *end), fill=AMBER, width=4)

    arrow_size = 13
    left = (
        tx - cos(angle) * arrow_size + cos(angle + 1.5708) * 7,
        ty - sin(angle) * arrow_size + sin(angle + 1.5708) * 7,
    )
    right = (
        tx - cos(angle) * arrow_size + cos(angle - 1.5708) * 7,
        ty - sin(angle) * arrow_size + sin(angle - 1.5708) * 7,
    )
    draw.polygon([target, left, right], fill=AMBER)

    draw.ellipse(
        (bx - radius - 3, by - radius - 3, bx + radius + 3, by + radius + 3),
        fill=WHITE,
    )
    draw.ellipse(
        (bx - radius, by - radius, bx + radius, by + radius),
        fill=NAVY,
    )
    label = str(number)
    box = draw.textbbox((0, 0), label, font=font)
    x = bx - (box[2] - box[0]) / 2
    y = by - (box[3] - box[1]) / 2 - box[1]
    draw.text((x, y), label, fill=WHITE, font=font)


def annotate(source_name, output_name, pointers):
    image = Image.open(SOURCE / source_name).convert("RGBA")
    overlay = Image.new("RGBA", image.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    scale = image.width / 1600
    radius = max(21, round(27 * scale))
    font = ImageFont.truetype(str(FONT), max(22, round(29 * scale)))
    for number, bx, by, tx, ty in pointers:
        draw_pointer(draw, number, (bx, by), (tx, ty), radius, font)
    OUTPUT.mkdir(parents=True, exist_ok=True)
    Image.alpha_composite(image, overlay).convert("RGB").save(
        OUTPUT / output_name, quality=96
    )


def build_annotations():
    jobs = [
        ("01-rnd-overview-dark.png", "01-overview.png", [
            (1, 118, 250, 80, 265),
            (2, 420, 280, 390, 315),
            (3, 600, 430, 470, 435),
            (4, 1405, 135, 1480, 165),
        ]),
        ("01b-rnd-order-types-dark.png", "02-order-types.png", [
            (1, 810, 380, 730, 405),
            (2, 810, 610, 750, 630),
            (3, 810, 795, 700, 810),
        ]),
        ("02-rnd-order-detail-dark.png", "02-order.png", [
            (1, 350, 235, 390, 305),
            (2, 290, 555, 345, 575),
            (3, 825, 555, 905, 600),
            (4, 1310, 665, 1215, 690),
        ]),
        ("02-rnd-order-detail-dark.png", "03-chemicals.png", [
            (1, 860, 755, 900, 805),
            (2, 1110, 750, 1215, 805),
            (3, 1250, 750, 1320, 805),
            (4, 1390, 750, 1435, 805),
            (5, 1510, 750, 1505, 865),
        ]),
        ("03-rnd-order-qc-method-dark.png", "04-qc-method.png", [
            (1, 820, 90, 930, 120),
            (2, 820, 365, 930, 405),
            (3, 810, 560, 930, 620),
            (4, 1370, 735, 1150, 770),
        ]),
        ("03-rnd-order-qc-method-dark.png", "05-confirm-production.png", [
            (1, 810, 105, 930, 140),
            (2, 810, 390, 930, 420),
            (3, 810, 620, 930, 665),
            (4, 1320, 835, 1160, 895),
        ]),
        ("04-rnd-producing-dark.png", "06-producing.png", [
            (1, 570, 235, 605, 305),
            (2, 620, 410, 500, 440),
            (3, 290, 500, 390, 545),
            (4, 1280, 700, 1120, 742),
        ]),
        ("05-rnd-inprocess-qc-dark.png", "07-inprocess-qc.png", [
            (1, 760, 235, 820, 305),
            (2, 290, 470, 370, 550),
            (3, 830, 745, 920, 830),
            (4, 1320, 790, 1400, 830),
        ]),
        ("06-rnd-completed-dark.png", "08-completed.png", [
            (1, 1010, 235, 1030, 305),
            (2, 650, 435, 500, 520),
            (3, 1080, 435, 1130, 520),
            (4, 1430, 435, 1490, 520),
        ]),
        ("07-rnd-chemical-stock-dark.png", "09-stock.png", [
            (1, 1190, 235, 1240, 305),
            (2, 530, 435, 450, 440),
            (3, 930, 485, 850, 555),
            (4, 1400, 485, 1460, 550),
        ]),
        ("08-rnd-bom-matrix-dark.png", "10-bom.png", [
            (1, 1450, 235, 1450, 305),
            (2, 500, 420, 440, 440),
            (3, 1400, 390, 1470, 440),
            (4, 930, 510, 900, 600),
            (5, 1480, 850, 1470, 935),
        ]),
        ("09-rnd-formula-manager-dark.png", "11-formula-manager.png", [
            (1, 650, 260, 650, 310),
            (2, 1090, 310, 1040, 360),
            (3, 825, 405, 870, 425),
            (4, 970, 405, 965, 425),
            (5, 1110, 405, 1060, 425),
        ]),
        ("10-rnd-formula-editor-dark.png", "12-formula-editor.png", [
            (1, 120, 160, 300, 195),
            (2, 125, 260, 300, 285),
            (3, 125, 355, 360, 375),
            (4, 715, 140, 810, 165),
            (5, 1435, 125, 1355, 165),
            (6, 125, 605, 300, 640),
            (7, 1350, 870, 1335, 910),
        ]),
    ]
    for source_name, output_name, pointers in jobs:
        annotate(source_name, output_name, pointers)


if __name__ == "__main__":
    build_annotations()
    print(OUTPUT)
