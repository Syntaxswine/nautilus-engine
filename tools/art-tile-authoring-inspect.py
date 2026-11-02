"""Read-only sample-raster audit; never modifies artwork."""
import hashlib, json
from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parent.parent
base = root / 'candidates/tile-authoring/art'
manifest = json.loads((base / 'resources.json').read_text(encoding='utf-8'))
rows = []
for resource in manifest['resources']:
    file = base / resource['uri']
    image = Image.open(file)
    assert image.mode == 'RGBA' and image.size == (resource['width'], resource['height'])
    assert hashlib.sha256(file.read_bytes()).hexdigest() == resource['sha256']
    alpha = image.getchannel('A')
    floor = resource['alpha']['zeroAtOrBelow8']
    frames = []
    for frame in resource['atlas']['frames']:
        x, y, w, h = frame['rectPx']
        g = resource['atlas']['gutterPx']
        strips = [(x,y,x+w,y+g),(x,y+h-g,x+w,y+h),(x,y,x+g,y+h),(x+w-g,y,x+w,y+h)]
        maximum = max(alpha.crop(rect).getextrema()[1] for rect in strips)
        assert maximum <= floor, (resource['id'], frame['id'], maximum, floor)
        frames.append({'id':frame['id'],'rawGutterMaximumAlpha8':maximum,'declaredCutoff8':floor,'effectiveGutterAlpha8':0})
    rows.append({'id':resource['id'],'sha256':resource['sha256'],'mode':image.mode,'size':list(image.size),'alphaExtrema':list(alpha.getextrema()),'rawZeroAlphaPixels':alpha.histogram()[0],'pixels':image.width*image.height,'embeddedICC':bool(image.info.get('icc_profile')),'interpretation':'Manifest explicitly binds sRGB RGB and linear alpha; no implicit loader conversion or destructive cleanup.','frames':frames})
report = {'status':'pass','method':'Pillow read-only RGBA/channel inspection of exact resource hashes; no compositing, cropping export, alpha edits or image rewriting.','resources':rows}
(root/'docs/reviews/tile-authoring/art/alpha-audit.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8',newline='\n')
print(json.dumps({'status':'pass','resources':len(rows),'frames':sum(len(r['frames']) for r in rows)}))
