"""A preserving map handoff with the unchanged original silo archive."""
from pathlib import Path
import hashlib
import json
import zipfile

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'outputs'
OUT.mkdir(exist_ok=True)
MANIFEST = ROOT / 'art/coldwell-map/delivery-manifest.json'
SILO = OUT / 'coldwell-silo-v1.zip'
EXPECTED_SILO_SHA = 'b489bb7439a22746281eb2dcc052cd124cc77917a9c00aeaa4c02ee5f1db873f'

def sha(data):
    return hashlib.sha256(data).hexdigest()

if not SILO.is_file() or sha(SILO.read_bytes()) != EXPECTED_SILO_SHA:
    raise ValueError('Restore the original verified silo archive from commit 3b9d400 before packing; do not substitute a moving collection.')
selected = set()
for folder in ['packages/coldwell-map', 'maps/coldwell-site', 'art/coldwell-map', 'docs/reviews/coldwell-map']:
    selected.update(p for p in (ROOT / folder).rglob('*') if p.is_file() and p != MANIFEST)
for name in ['docs/coldwell-map.md', 'tests/coldwell-map.test.mjs', 'tools/build-coldwell-map.mjs', 'tools/audit-coldwell-map.mjs', 'tools/package-coldwell-map.py']:
    selected.add(ROOT / name)
entries = {}
for p in sorted(selected):
    if not p.resolve().is_relative_to(ROOT):
        raise ValueError('Map bundle path escaped project')
    entries[p.relative_to(ROOT).as_posix()] = p.read_bytes()
entries['maps/coldwell-site/coldwell-silo-v1.zip'] = SILO.read_bytes()
entries['FARMYARD-HANDOFF.md'] = (ROOT / 'art/coldwell-map/FARMYARD-HANDOFF.md').read_bytes()
manifest = {'schemaVersion': 1, 'collection': 'coldwell-site-v1',
            'engineCommit': '8c4670450cb2b38c1e1abd811d633c22de9e2b7c',
            'siloCommit': '3b9d4004a7e51e5d345cded068fc46eab2f320a2',
            'requiredCompanionArchiveSHA256': EXPECTED_SILO_SHA,
            'status': 'Preserving Farmyard intake candidate; current game import/adoption not claimed.',
            'files': [{'path': p, 'bytes': len(b), 'sha256': sha(b)} for p, b in sorted(entries.items())]}
MANIFEST.write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8', newline='\n')
entries[MANIFEST.relative_to(ROOT).as_posix()] = MANIFEST.read_bytes()
target = OUT / 'coldwell-map-farmyard-handoff.zip'
with zipfile.ZipFile(target, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
    for name, data in sorted(entries.items()):
        info = zipfile.ZipInfo(name, date_time=(2026, 10, 29, 0, 0, 0))
        info.compress_type = zipfile.ZIP_STORED if name.endswith('.zip') else zipfile.ZIP_DEFLATED
        info.external_attr = 0o644 << 16
        archive.writestr(info, data, compresslevel=9)
with zipfile.ZipFile(target) as archive:
    assert set(archive.namelist()) == set(entries)
    for name, data in entries.items():
        assert archive.read(name) == data, name
receipt = {'path': str(target), 'bytes': target.stat().st_size, 'sha256': sha(target.read_bytes()), 'files': len(entries),
           'requiredCompanionIncludedUnchanged': True, 'verified': True}
(OUT / 'coldwell-map-farmyard-handoff.receipt.json').write_text(json.dumps(receipt, indent=2) + '\n', encoding='utf-8', newline='\n')
print(json.dumps(receipt))
