"""Create a local art handoff pack; no engine publication or consumer changes."""
from pathlib import Path
from zipfile import ZipFile, ZipInfo, ZIP_DEFLATED
import hashlib, json

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'outputs/nautilus-h-plan-art-v1.zip'
OUT.parent.mkdir(parents=True, exist_ok=True)
folders = ['assets/h-plan-buildings', 'art/h-plan-buildings', 'packages/h-plan-buildings', 'docs/reviews/h-plan-buildings']
files = [file for folder in folders for file in (ROOT / folder).rglob('*') if file.is_file()]
files += [ROOT / file for file in ['assets/buildings/painted-materials-v2.png', 'docs/h-plan-buildings.md', 'tests/h-plan-buildings.test.mjs', 'tools/build-h-plan-buildings.mjs', 'NOTICE.md']]
entries = []
def write(archive, name, data):
    info = ZipInfo(name, (2026, 10, 28, 0, 0, 0))
    info.compress_type = ZIP_DEFLATED
    archive.writestr(info, data)
with ZipFile(OUT, 'w', compression=ZIP_DEFLATED, compresslevel=6) as archive:
    for file in sorted(files):
        name = file.relative_to(ROOT).as_posix()
        data = file.read_bytes()
        write(archive, name, data)
        entries.append({'file': name, 'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()})
    write(archive, 'h-plan-art-pack.json', json.dumps({'version': 1, 'kind': 'Original H-plan art handoff, not an engine release', 'baseline': '12ad8c9b1c96637cd05c8e344692063bfde385f3', 'rebuildRequires': 'The frozen Nautilus source tree, Node 22+, and the source scripts; standard glTF assets retain their relative image layout.', 'files': entries}, indent=2).encode())
with ZipFile(OUT) as archive:
    assert archive.testzip() is None
    for entry in entries:
        assert hashlib.sha256(archive.read(entry['file'])).hexdigest() == entry['sha256']
print(json.dumps({'file': OUT.name, 'entries': len(entries)+1, 'bytes': OUT.stat().st_size, 'sha256': hashlib.sha256(OUT.read_bytes()).hexdigest()}))
