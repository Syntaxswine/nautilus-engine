"""Package our original exports and authoring evidence; never include source photos."""
from pathlib import Path
import hashlib
import json
import zipfile

ROOT = Path(__file__).resolve().parent.parent
OUTPUT = ROOT / 'outputs' / 'nautilus-building-catalogue-v1.zip'
ASSETS = ROOT / 'assets' / 'buildings'
manifest = json.loads((ASSETS / 'catalogue.json').read_text(encoding='utf-8'))
files = {'catalogue.json': ASSETS / 'catalogue.json'}
files[manifest['atlas']['file']] = ASSETS / manifest['atlas']['file']
for building in manifest['buildings']:
    for item in building['files']:
        source = ASSETS / item['path']
        if hashlib.sha256(source.read_bytes()).hexdigest() != item['sha256']:
            raise ValueError(f"Export hash mismatch: {source.name}")
        files[item['path']] = source
for source in (ROOT / 'packages' / 'building-catalog').glob('*.js'):
    files['source/' + source.name] = source
for name in ['README.md', 'reference-seeds.json', 'reference-register.json', 'generation.json', 'material-atlas-prompt.txt', 'material-atlas-refinement-prompt.txt']:
    files['authoring/' + name] = ROOT / 'art' / 'buildings' / name
files['docs/building-catalog.md'] = ROOT / 'docs' / 'building-catalog.md'
files['docs/reviews/2026-10-28-building-catalog.md'] = ROOT / 'docs' / 'reviews' / '2026-10-28-building-catalog.md'
for source in (ROOT / 'docs' / 'reviews' / 'building-catalog').iterdir():
    if source.suffix in {'.png', '.json'}:
        files['docs/reviews/building-catalog/' + source.name] = source
OUTPUT.parent.mkdir(parents=True, exist_ok=True)
readme = '''Nautilus original building catalogue v1
48 original buildings, 77 floors, 409 described rooms, 16 painterly materials.

Open a model's .gltf in your glTF-compatible editor/viewer. Keep its .bin
beside it and painted-materials-v2.png one directory above models/.
Each .blueprint.json contains the original room, wall and opening descriptors.
These are visual assets and descriptive plans; consumer gameplay adapters
remain explicit. See docs/building-catalog.md for scale and coverage limits.

source/ preserves the procedural detailed source and game derivation. Pass
your own Three.js instance and loaded atlas to createBuildingModel().
The headless compiler uses no renderer. No third-party reference imagery is
included; authoring/reference-register.json links to the public sources.

Generated for the Nautilus Engine project. Selected atlas: version 2.
'''
def add(archive, name, data):
    info = zipfile.ZipInfo(name, date_time=(2026, 10, 28, 0, 0, 0))
    info.compress_type = zipfile.ZIP_DEFLATED
    info.external_attr = 0o644 << 16
    archive.writestr(info, data, compresslevel=9)
with zipfile.ZipFile(OUTPUT, 'w') as archive:
    add(archive, 'README.txt', readme.encode())
    add(archive, 'source/package.json', b'{"type":"module"}\n')
    for name, source in sorted(files.items()):
        add(archive, name, source.read_bytes())
with zipfile.ZipFile(OUTPUT) as archive:
    if archive.testzip() is not None:
        raise ValueError('ZIP integrity check failed')
print(json.dumps({'file': str(OUTPUT), 'files': len(files) + 2, 'bytes': OUTPUT.stat().st_size, 'sha256': hashlib.sha256(OUTPUT.read_bytes()).hexdigest()}))
