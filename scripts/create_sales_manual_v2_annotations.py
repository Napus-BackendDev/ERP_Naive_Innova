"""Create compact, in-context callouts for the Sales manual screenshots."""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parent.parent
ASSETS = ROOT / "output" / "pdf" / "sales_manual_assets"
FONT = ROOT / "output" / "pdf" / "fonts" / "Sarabun-Bold.ttf"
PINK = (225, 29, 72, 255)
PINK_FILL = (225, 29, 72, 44)
WHITE = (255, 255, 255, 255)


def marker(draw, number, rect):
    """Mark only the UI control; no leader lines or off-screen labels."""
    x1, y1, x2, y2 = rect
    radius = max(18, min(30, int((x2 - x1) * 0.045)))
    draw.rounded_rectangle(rect, radius=10, outline=PINK, width=4, fill=PINK_FILL)
    cx, cy = x1 + radius, y1 + radius
    draw.ellipse((cx - radius, cy - radius, cx + radius, cy + radius), fill=PINK, outline=WHITE, width=3)
    font = ImageFont.truetype(str(FONT), int(radius * 1.18))
    text = str(number)
    box = draw.textbbox((0, 0), text, font=font)
    draw.text((cx - (box[2] - box[0]) / 2, cy - (box[3] - box[1]) / 2 - 2), text, font=font, fill=WHITE)


def annotate(source, output, controls):
    image = Image.open(ASSETS / source).convert("RGBA")
    overlay = Image.new("RGBA", image.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    for number, rect in controls:
        marker(draw, number, rect)
    Image.alpha_composite(image, overlay).convert("RGB").save(ASSETS / output, quality=94)


def main():
    # Coordinates are measured against the original screenshots. Each box only
    # surrounds the actual target, keeping the visual explanation local.
    annotate("01_sales_kanban_dark.png", "v2_01_board.png", [
        (1, (25, 190, 230, 239)),
        (2, (807, 139, 979, 186)),
        (3, (988, 139, 1147, 186)),
        (4, (1363, 139, 1546, 186)),
        (5, (334, 494, 614, 633)),
        (6, (560, 497, 610, 542)),
    ])
    annotate("07_card_three_dot_menu_dark.png", "v2_02_card_menu.png", [
        (1, (570, 342, 596, 368)),
        (2, (575, 540, 738, 582)),
        (3, (575, 583, 738, 623)),
        (4, (575, 624, 738, 669)),
    ])
    annotate("03_create_sample_dark.png", "v2_03_sample.png", [
        (1, (153, 331, 661, 376)),
        (2, (153, 604, 661, 640)),
        (3, (710, 355, 1446, 716)),
        (4, (787, 768, 1447, 814)),
    ])
    annotate("04_create_lot_dark.png", "v2_04_order.png", [
        (1, (710, 363, 1444, 436)),
        (2, (710, 676, 1444, 719)),
        (3, (787, 768, 1447, 814)),
    ])
    annotate("08_product_spec_modal_dark.png", "v2_05_product_spec.png", [
        (1, (875, 527, 2009, 623)),
        (2, (874, 839, 1840, 912)),
        (3, (875, 1068, 1840, 1143)),
        (4, (875, 1288, 2010, 1350)),
        (5, (1715, 1380, 2044, 1445)),
    ])
    annotate("05_create_develop_dark.png", "v2_06_develop.png", [
        (1, (741, 459, 1418, 504)),
        (2, (741, 538, 1418, 582)),
        (3, (741, 592, 1075, 635)),
        (4, (1083, 592, 1418, 635)),
        (5, (1272, 344, 1429, 380)),
        (6, (787, 768, 1447, 814)),
    ])
    annotate("06_sales_detail_docs_dark.png", "v2_07_detail_documents.png", [
        (1, (985, 24, 1260, 80)),
        (2, (984, 192, 1576, 415)),
        (3, (984, 465, 1576, 500)),
        (4, (1002, 576, 1558, 616)),
        (5, (984, 853, 1576, 906)),
    ])


if __name__ == "__main__":
    main()
