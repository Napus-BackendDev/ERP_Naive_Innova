"""Create clean numbered pointers for Production and Stock manual screenshots."""

from math import atan2, cos, sin
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
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
    left = (tx - cos(angle) * arrow_size + cos(angle + 1.5708) * 7,
            ty - sin(angle) * arrow_size + sin(angle + 1.5708) * 7)
    right = (tx - cos(angle) * arrow_size + cos(angle - 1.5708) * 7,
             ty - sin(angle) * arrow_size + sin(angle - 1.5708) * 7)
    draw.polygon([target, left, right], fill=AMBER)
    draw.ellipse((bx-radius-3, by-radius-3, bx+radius+3, by+radius+3), fill=WHITE)
    draw.ellipse((bx-radius, by-radius, bx+radius, by+radius), fill=NAVY)
    label = str(number)
    box = draw.textbbox((0, 0), label, font=font)
    draw.text((bx-(box[2]-box[0])/2, by-(box[3]-box[1])/2-box[1]), label, fill=WHITE, font=font)


def annotate(source_dir, output_dir, source_name, output_name, pointers):
    image = Image.open(source_dir / source_name).convert("RGBA")
    overlay = Image.new("RGBA", image.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    scale = image.width / 1600
    radius = max(21, round(27 * scale))
    font = ImageFont.truetype(str(FONT), max(22, round(29 * scale)))
    for pointer in pointers:
        draw_pointer(draw, pointer[0], (pointer[1], pointer[2]),
                     (pointer[3], pointer[4]), radius, font)
    output_dir.mkdir(parents=True, exist_ok=True)
    Image.alpha_composite(image, overlay).convert("RGB").save(
        output_dir / output_name, quality=96
    )


def build_group(source_name, output_name, jobs):
    source_dir = ROOT / "output" / "pdf" / source_name
    output_dir = ROOT / "output" / "pdf" / output_name
    for source, output, pointers in jobs:
        annotate(source_dir, output_dir, source, output, pointers)


def main():
    build_group("production_manual_assets", "production_manual_annotated_assets", [
        ("01-production-received-dark.png", "01-overview.png", [
            (1, 105, 320, 90, 320), (2, 420, 250, 440, 295),
            (3, 770, 250, 760, 295), (4, 1400, 250, 1420, 295),
        ]),
        ("02-production-preparation-dark.png", "02-preparation.png", [
            (1, 380, 420, 470, 520), (2, 840, 420, 930, 485),
            (3, 1290, 650, 1390, 725), (4, 1310, 870, 1390, 920),
        ]),
        ("03-production-line-dark.png", "03-line.png", [
            (1, 760, 250, 760, 295), (2, 390, 390, 430, 470),
            (3, 800, 390, 820, 470), (4, 1240, 720, 1120, 780),
        ]),
        ("04-production-schedule-dark.png", "04-schedule.png", [
            (1, 780, 340, 800, 440), (2, 620, 485, 690, 520),
            (3, 970, 485, 900, 520), (4, 1030, 650, 960, 683),
        ]),
        ("05-production-packaging-dark.png", "05-packaging.png", [
            (1, 1100, 250, 1100, 295), (2, 330, 390, 360, 430),
            (3, 720, 390, 760, 430), (4, 1110, 390, 1140, 430),
            (5, 1450, 760, 1360, 820),
        ]),
        ("06-production-final-qc-dark.png", "06-final-qc.png", [
            (1, 1410, 250, 1410, 295), (2, 880, 430, 960, 550),
            (3, 1270, 760, 1370, 820), (4, 1450, 760, 1470, 820),
        ]),
    ])

    build_group("stock_manual_assets", "stock_manual_annotated_assets", [
        ("01-stock-ingredients-dark.png", "01-ingredients.png", [
            (1, 390, 220, 430, 260), (2, 1210, 320, 1430, 360),
            (3, 730, 475, 760, 550), (4, 1380, 475, 1485, 550),
        ]),
        ("02-stock-add-ingredient-dark.png", "02-add-ingredient.png", [
            (1, 520, 330, 700, 380), (2, 520, 430, 700, 465),
            (3, 520, 535, 700, 555), (4, 1050, 690, 900, 710),
        ]),
        ("03-stock-packaging-dark.png", "03-packaging.png", [
            (1, 780, 220, 760, 260), (2, 420, 390, 430, 430),
            (3, 1080, 500, 1120, 550), (4, 1400, 500, 1490, 620),
        ]),
        ("04-stock-documents-dark.png", "04-documents.png", [
            (1, 1260, 310, 1300, 360), (2, 1120, 400, 1260, 430),
            (3, 1120, 500, 1260, 490), (4, 1120, 595, 1260, 555),
        ]),
        ("05-stock-add-packaging-dark.png", "05-add-packaging.png", [
            (1, 520, 260, 700, 300), (2, 520, 420, 700, 480),
            (3, 520, 610, 700, 645), (4, 1030, 830, 900, 845),
        ]),
        ("06-stock-samples-dark.png", "06-samples.png", [
            (1, 1090, 220, 1090, 260), (2, 1320, 320, 1450, 355),
            (3, 760, 500, 800, 550), (4, 1400, 500, 1490, 620),
        ]),
        ("07-stock-add-sample-dark.png", "07-add-sample.png", [
            (1, 520, 220, 700, 250), (2, 520, 320, 700, 335),
            (3, 520, 560, 700, 605), (4, 1040, 810, 900, 845),
        ]),
        ("08-stock-fg-dark.png", "08-fg.png", [
            (1, 1410, 220, 1410, 260), (2, 1320, 320, 1450, 355),
            (3, 850, 500, 900, 550), (4, 1400, 500, 1490, 620),
        ]),
        ("09-stock-add-fg-lot-dark.png", "09-add-fg-lot.png", [
            (1, 520, 220, 700, 250), (2, 520, 355, 700, 390),
            (3, 520, 520, 700, 555), (4, 1040, 810, 900, 845),
        ]),
        ("10-stock-adjust-dark.png", "10-adjust.png", [
            (1, 1220, 160, 1390, 190), (2, 1180, 330, 1370, 370),
            (3, 1180, 470, 1370, 520), (4, 1230, 900, 1390, 925),
        ]),
    ])
    print("Annotated Production and Stock assets")


if __name__ == "__main__":
    main()
