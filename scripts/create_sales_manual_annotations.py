import os

from PIL import Image, ImageDraw, ImageFont


ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
ASSET_DIR = os.path.join(ROOT, "output", "pdf", "sales_manual_assets")
FONT_DIR = os.path.join(ROOT, "output", "pdf", "fonts")

LABEL_FILL = (225, 29, 72, 255)
LABEL_STROKE = (255, 255, 255, 255)
LINE = (225, 29, 72, 255)
HIGHLIGHT_FILL = (225, 29, 72, 24)


def font(size):
    return ImageFont.truetype(os.path.join(FONT_DIR, "Sarabun-Bold.ttf"), size)


FONT = font(30)


def label(draw, no, x, y):
    r = 18
    draw.ellipse((x - r, y - r, x + r, y + r), fill=LABEL_FILL, outline=LABEL_STROKE, width=3)
    text = str(no)
    box = draw.textbbox((0, 0), text, font=FONT)
    tw, th = box[2] - box[0], box[3] - box[1]
    draw.text((x - tw / 2, y - th / 2 - 2), text, font=FONT, fill=(255, 255, 255, 255))


def rect(draw, xy):
    draw.rounded_rectangle(xy, radius=10, fill=HIGHLIGHT_FILL, outline=LINE, width=5)


def annotate(src_name, dest_name, items):
    src = os.path.join(ASSET_DIR, src_name)
    dest = os.path.join(ASSET_DIR, dest_name)
    img = Image.open(src).convert("RGBA")
    overlay = Image.new("RGBA", img.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    for item in items:
        no, box, _pos = item
        rect(draw, box)
        # Keep the callout attached to its own target. The numbered tables in the
        # manual provide the explanation, so long leader lines only add noise.
        label(draw, no, int(box[0]) + 24, int(box[1]) + 24)
    out = Image.alpha_composite(img, overlay)
    out.convert("RGB").save(dest, quality=95)
    print(dest)


def main():
    annotate(
        "01_sales_kanban_dark.png",
        "a01_sales_kanban_annotated.png",
        [
            (1, (24, 190, 232, 238), (0, 0)),
            (2, (808, 140, 978, 186), (0, 0)),
            (3, (988, 140, 1146, 186), (0, 0)),
            (4, (1363, 140, 1545, 186), (0, 0)),
            (5, (336, 496, 611, 632), (0, 0)),
            (6, (561, 500, 608, 539), (0, 0)),
        ],
    )
    annotate(
        "03_create_sample_dark.png",
        "a02_new_lead_sample_annotated.png",
        [
            (1, (150, 330, 660, 382), (95, 352)),
            (2, (150, 415, 660, 465), (95, 440)),
            (3, (150, 500, 660, 585), (95, 540)),
            (4, (150, 603, 660, 660), (95, 630)),
            (5, (150, 680, 660, 742), (95, 710)),
            (6, (1155, 267, 1450, 306), (1120, 230)),
            (7, (710, 355, 1445, 715), (870, 370)),
            (8, (790, 768, 1447, 815), (1460, 785)),
        ],
    )
    annotate(
        "04_create_lot_dark.png",
        "a03_new_lead_lot_annotated.png",
        [
            (1, (1250, 267, 1360, 306), (1215, 232)),
            (2, (720, 355, 1445, 430), (870, 370)),
            (3, (870, 690, 1445, 760), (840, 710)),
            (4, (790, 768, 1447, 815), (1460, 785)),
        ],
    )
    annotate(
        "08_product_spec_modal_dark.png",
        "a04_product_spec_modal_annotated.png",
        [
            (1, (880, 520, 2020, 625), (615, 410)),
            (2, (880, 835, 1840, 910), (615, 645)),
            (3, (880, 1055, 1840, 1130), (615, 870)),
            (4, (880, 1275, 2020, 1350), (615, 1110)),
            (5, (820, 136, 2085, 250), (660, 190)),
            (6, (1710, 1385, 2045, 1470), (1550, 1430)),
            (7, (2110, 1385, 2570, 1470), (2360, 1430)),
            (8, (2050, 1465, 2570, 1535), (1980, 1460)),
        ],
    )
    annotate(
        "05_create_develop_dark.png",
        "a05_new_lead_develop_annotated.png",
        [
            (1, (0.74 * 1612, 0.23 * 1548, 0.96 * 1612, 0.28 * 1548), (1210, 350)),
            (2, (0.46 * 1612, 0.45 * 1548, 0.94 * 1612, 0.50 * 1548), (740, 720)),
            (3, (0.46 * 1612, 0.53 * 1548, 0.93 * 1612, 0.61 * 1548), (740, 850)),
            (4, (0.46 * 1612, 0.64 * 1548, 0.94 * 1612, 0.70 * 1548), (740, 1020)),
            (5, (0.46 * 1612, 0.74 * 1548, 0.94 * 1612, 0.82 * 1548), (740, 1170)),
            (6, (0.05 * 1612, 0.92 * 1548, 0.96 * 1612, 0.98 * 1548), (1450, 1450)),
        ],
    )
    annotate(
        "06_sales_detail_docs_dark.png",
        "a06_sales_detail_docs_annotated.png",
        [
            (1, (965, 25, 1578, 102), (900, 60)),
            (2, (985, 155, 1575, 355), (930, 230)),
            (3, (985, 382, 1575, 435), (920, 405)),
            (4, (985, 520, 1575, 820), (920, 600)),
            (5, (985, 850, 1575, 940), (920, 875)),
            (6, (985, 935, 1275, 985), (1320, 960)),
        ],
    )
    annotate(
        "07_card_three_dot_menu_dark.png",
        "a07_card_three_dot_menu_annotated.png",
        [
            (1, (1180, 405, 1232, 460), (1130, 390)),
            (2, (1165, 455, 1415, 508), (1130, 482)),
            (3, (1165, 510, 1415, 565), (1130, 538)),
            (4, (1165, 565, 1415, 625), (1130, 595)),
        ],
    )


if __name__ == "__main__":
    main()
