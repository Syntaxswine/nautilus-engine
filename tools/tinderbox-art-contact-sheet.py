"""Compose native-browser review captures; no model or texture pixels are edited."""
from pathlib import Path
import json, math
from PIL import Image, ImageDraw, ImageFont

root = Path(__file__).resolve().parent.parent
source = root / 'artifacts/tinderbox-art-source'
report = json.loads((source / 'review.json').read_text(encoding='utf-8'))
destination = root / 'docs/reviews/tinderbox-art-previews'
destination.mkdir(parents=True, exist_ok=True)
font = ImageFont.truetype('C:/Windows/Fonts/segoeui.ttf', 16)
title_font = ImageFont.truetype('C:/Windows/Fonts/georgia.ttf', 29)
props = [r for r in report['records'] if ':interior:' in r['selected']]
water = [r for r in report['records'] if ':waterfront:' in r['selected']]
medicine = [r for r in report['records'] if ':medicine:' in r['selected']]
layouts = [r for r in report['records'] if ':layout:' in r['selected']]
groups = [('furnishings-1', 'Period furnishings · native WebGL', props[:16]),
          ('furnishings-2', 'Displays, decor and aquarium art · native WebGL', props[16:]),
          ('waterfront-and-layouts', 'Waterfront modules, medicine and additive layouts', water + medicine + layouts)]
for filename, title, records in groups:
    columns, cw, ch = 4, 370, 285
    rows = math.ceil(len(records) / columns)
    sheet = Image.new('RGB', (columns*cw+24, rows*ch+110), '#19271f')
    draw = ImageDraw.Draw(sheet)
    draw.text((20, 14), title, fill='#f1e1bf', font=title_font)
    draw.text((20, 55), 'Camera fits each original-scale model. Layouts show one furnished section; floors and shells are separate.', fill='#bbc7b8', font=font)
    for index, record in enumerate(records):
        x, y = 12+(index % columns)*cw, 90+(index // columns)*ch
        with Image.open(source / record['image']) as image:
            image = image.convert('RGB')
            image.thumbnail((cw-10, ch-45))
            sheet.paste(image, (x+(cw-10-image.width)//2, y))
        label = record['selected'].split(':')[-1].replace('-', ' ')
        draw.text((x+5, y+ch-40), label, fill='#e8ddc0', font=font)
        draw.text((x+5, y+ch-20), f"{record['triangles']:,} triangles", fill='#b4c4b5', font=font)
    sheet.save(destination / f'{filename}.jpg', quality=90)
    print(destination / f'{filename}.jpg')
