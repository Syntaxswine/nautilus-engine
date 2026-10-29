"""Reproducible, task-scoped artist bundle; no research PDF, cache or game runtime."""
from pathlib import Path
import hashlib
import json
import zipfile

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'outputs'
OUT.mkdir(exist_ok=True)
MANIFEST = ROOT / 'art/silo/delivery-manifest.json'

def sha(data):
    return hashlib.sha256(data).hexdigest()

selected = set()
for folder in ['packages/silo', 'assets/silo', 'art/silo', 'docs/reviews/silo']:
    selected.update(p for p in (ROOT / folder).rglob('*') if p.is_file() and p != MANIFEST)
for name in ['docs/silo.md', 'tests/silo.test.mjs', 'tools/build-silo.mjs', 'tools/build-silo-plans.mjs', 'tools/export-silo-gltf.mjs', 'tools/audit-silo.mjs', 'tools/package-silo.py', 'tools/art-review-browser.mjs', 'packages/map-core/wall-runs.js', 'NOTICE.md']:
    selected.add(ROOT / name)
vendor = 'vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/vendor/'
for name in ['three.module.js', 'three.core.js', 'THREE-LICENSE.txt']:
    selected.add(ROOT / (vendor + name))

entries = {}
for p in sorted(selected):
    if not p.resolve().is_relative_to(ROOT):
        raise ValueError('Bundle path escaped project')
    entries[p.relative_to(ROOT).as_posix()] = p.read_bytes()
entries['package.json'] = b'{"name":"nautilus-silo-artist-bundle","private":true,"type":"module"}\n'
entries['BUNDLE_README.txt'] = (
    'Coldwell Silo: original modular artist collection.\n'
    'Start with docs/silo.md and docs/reviews/silo/README.md.\n'
    'Standard glTF files are in assets/silo/models; keep the atlas path intact.\n'
    'Native source/game meshes are gzip JSON. Host owns Three, clock and renderer.\n'
    'This is an artist bundle, not a published engine package or playable map.\n'
    'Exact curved queries/navigation/dynamic collision require architect intake.\n'
    'Existing native kit and minimal pinned Three review host/notice are included unchanged.\n'
    'Optional audit dependencies are installed only into artifacts/ as documented.\n'
    'The world schema audit additionally requires the reviewed Git objects.\n'
    'The original NPS PDF, source-page pixels and private caches are excluded.\n'
).encode('utf-8')

manifest = {'schemaVersion': 1, 'collection': 'nautilus-silo-v1', 'baseCommit': 'ddfd43cf4b156eeb82b5c27772fe977ec10b0633',
            'scope': 'Original artist files plus unchanged native-kit/review-host closure; no root package or engine promotion.',
            'fileCountExcludingManifest': len(entries),
            'files': [{'path': p, 'bytes': len(b), 'sha256': sha(b)} for p, b in sorted(entries.items())]}
MANIFEST.write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8', newline='\n')
entries[MANIFEST.relative_to(ROOT).as_posix()] = MANIFEST.read_bytes()
target = OUT / 'coldwell-silo-v1.zip'
with zipfile.ZipFile(target, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
    for name, data in sorted(entries.items()):
        info = zipfile.ZipInfo(name, date_time=(2026, 10, 29, 0, 0, 0))
        info.compress_type = zipfile.ZIP_DEFLATED
        info.external_attr = 0o644 << 16
        archive.writestr(info, data, compresslevel=9)
with zipfile.ZipFile(target) as archive:
    assert set(archive.namelist()) == set(entries)
    for name, data in entries.items():
        assert archive.read(name) == data, name
receipt = {'path': str(target), 'bytes': target.stat().st_size, 'sha256': sha(target.read_bytes()), 'files': len(entries), 'verified': True}
(OUT / 'coldwell-silo-v1.receipt.json').write_text(json.dumps(receipt, indent=2) + '\n', encoding='utf-8', newline='\n')
print(json.dumps(receipt))
