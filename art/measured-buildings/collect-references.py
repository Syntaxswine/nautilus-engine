"""Read-only LOC source collector. Reference pixels stay in ignored artifacts/."""
import concurrent.futures, hashlib, json, pathlib, urllib.request, time
from PIL import Image
Image.MAX_IMAGE_PIXELS = 300_000_000  # LOC's known 1-bit engineering-sheet scans.

ROOT = pathlib.Path(__file__).resolve().parents[2]
OUT = ROOT / 'artifacts/measured-building-sources'
HEADERS = {'User-Agent': 'Mozilla/5.0 NautilusArtist/1.0 (architectural source research)'}
SHEETS = {'ny1600': [2, 6, 9, 12, 16, 19, 21, 22],
          'ma1289': [22, 23, 24, 25, 27, 28, 29, 30, 31, 32, 33], 'ma0469': [1, 2, 3]}

def fetch(url, target):
    if not target.exists():
        chunks, started = [], time.monotonic()
        with urllib.request.urlopen(urllib.request.Request(url, headers=HEADERS), timeout=20) as response:
            while chunk := response.read(65536):
                chunks.append(chunk)
                if time.monotonic()-started>90 or sum(map(len,chunks))>50_000_000:
                    raise TimeoutError('Reference transfer exceeded its bounded review budget: '+url)
        target.write_bytes(b''.join(chunks))
    data = target.read_bytes()
    return {'url': url, 'file': str(target.relative_to(ROOT)).replace('\\', '/'),
            'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()}

def main():
    OUT.mkdir(parents=True, exist_ok=True)
    tasks, register = [], []
    for key, numbers in SHEETS.items():
        meta = OUT / (key + '.json')
        metadata = fetch('https://www.loc.gov/item/' + key + '/?fo=json', meta)
        obj = json.loads(meta.read_text(encoding='utf-8'))
        drawings = next(r for r in obj['resources'] if 'Drawings' in r.get('caption', ''))
        for n in numbers:
            group = drawings['files'][n-1]
            caption = next(x for x in group if x.get('use') == 'caption')
            image = next(x for x in group if x.get('mimetype') == 'image/tiff')
            cached_tiff=OUT/(key+'-sheet-'+str(n)+'.tif')
            if image.get('size', 0)>40_000_000 or (image.get('size',0)>1_000_000 and not cached_tiff.exists()):
                image = max((x for x in group if x.get('mimetype')=='image/jpeg'), key=lambda x:x.get('width',0))
            record = {'surveyId': key, 'sheet': n, 'title': caption['title'],
                      'page': drawings['url'] + '/?sp=' + str(n), 'metadata': metadata,
                      'rightsAdvisory': obj['item']['rights_advisory'],
                      'distribution': 'Reference only; no source scan in runtime or art pack.'}
            register.append(record)
            tasks.append((record, image['url'], OUT / (key + '-sheet-' + str(n) + ('.tif' if image['mimetype']=='image/tiff' else '.jpg'))))
        # Colour exterior of the hospital, otherwise first catalogue photograph.
        photos = next(r for r in obj['resources'] if 'Photos' in r.get('caption', ''))
        group = photos['files'][1 if key == 'ny1600' else 0]
        caption = next(x for x in group if x.get('use') == 'caption')
        image = max((x for x in group if x.get('mimetype') == 'image/jpeg'), key=lambda x: x.get('width', 0))
        record = {'surveyId': key, 'title': caption['title'], 'page': caption.get('aka'),
                  'rightsAdvisory': obj['item']['rights_advisory'], 'distribution': 'Reference only.'}
        register.append(record)
        tasks.append((record, image['url'], OUT / (key + '-exterior.jpg')))
    def job(task):
        record, url, target = task
        record['reference'] = fetch(url, target)
        with Image.open(target) as image:
            record['pixels'] = list(image.size)
            image.thumbnail((2100, 1600))
            image.convert('RGB').save(target.with_suffix('.preview.jpg'), quality=92)
        return record['reference']['file']
    errors=[]
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
        futures={pool.submit(job,task):task for task in tasks}
        for future in concurrent.futures.as_completed(futures):
            try: print(future.result(),flush=True)
            except Exception as error:
                record=futures[future][0];record['fetchError']=str(error);errors.append(record['title']);print('Unavailable:',record['title'],str(error),flush=True)
    (OUT / 'source-register.json').write_text(json.dumps(register, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
    print('Registered', len(register), 'source images; originals excluded from distribution.')
    if errors: raise SystemExit('Unavailable sources: '+repr(errors))

if __name__ == '__main__': main()
