"""Contact sheets of unmodified source-workbench captures, for audit review only."""
from pathlib import Path
import json
from PIL import Image, ImageDraw, ImageFont

root = Path(__file__).resolve().parents[3]
source = root / 'artifacts/window-native-source'
records = json.loads((source / 'review.json').read_text(encoding='utf-8'))['records']
out = root / 'docs/reviews/window-art/previews'
out.mkdir(parents=True, exist_ok=True)
font = ImageFont.truetype('C:/Windows/Fonts/georgia.ttf', 30)
small = ImageFont.truetype('C:/Windows/Fonts/segoeui.ttf', 18)
for span in [1, 2, 3]:
    items = [r for r in records if r.get('view') == 'front' and r['id'].endswith(f'.{span}m')]
    sheet = Image.new('RGB', (2020, 1700), '#1b2b26')
    draw = ImageDraw.Draw(sheet)
    draw.text((16, 10), f'Original native panes · {span} m span · all 13 source presets', font=font, fill='#e7d4a8')
    draw.text((16, 49), 'Unmodified Farmyard workbench · intact / selected pane removed · source 251bf809 · native WebGL', font=small, fill='#bdc6b3')
    for i, record in enumerate(items):
        with Image.open(source / record['image']) as image:
            image = image.convert('RGB')
            image.thumbnail((496, 396))
            sheet.paste(image, (10+(i % 4)*500, 84+(i // 4)*400))
    sheet.save(out / f'native-{span}m.jpg', quality=92)

with Image.open(source / 'tall-sheet.png') as image:
    image.convert('RGB').save(out / 'tall-sheet.jpg', quality=94)
for name in ['full-six-back', 'waist-six-corrugated']:
    with Image.open(source / f'{name}.png') as image:
        # The original CSS grid leaves two empty columns in these one-design views.
        image.crop((0, 0, 540, image.height)).convert('RGB').save(out / f'{name}.jpg', quality=94)
print(out)
