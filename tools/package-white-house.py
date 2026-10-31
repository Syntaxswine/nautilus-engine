"""Reproducible asset handoff; no reference photos or donor code are packaged."""
from pathlib import Path
import hashlib
import json
import subprocess
import zipfile

root = Path(__file__).resolve().parents[1]
target = root / 'outputs' / 'white-house-kit-v1.zip'
target.parent.mkdir(parents=True, exist_ok=True)
files = sorted((root / 'assets/white-house').rglob('*'))
files += sorted((root / 'packages/white-house').glob('*'))
files += sorted((root / 'art/white-house').glob('*'))
files += [root / 'docs/reviews/white-house/checks.json', root / 'docs/reviews/white-house/helper-cleanup.json']
files += sorted((root / 'docs/reviews/white-house/previews').glob('*.png'))
files = [p for p in files if p.is_file()]
commit = subprocess.check_output(['git', '-c', 'safe.directory=' + root.as_posix(), '-C', str(root), 'rev-parse', 'HEAD'], text=True).strip()
handoff = {'schemaVersion': 1, 'sourceCheckpoint': commit, 'assetId': 'white-house-public-tour-v1', 'instructions': [
    'Forward this ZIP intact. The assets/white-house/models directory contains glTF 2.0 files and matching BIN buffers. Keep the shared PNG one directory above models.',
    'Import at one metre per unit. The scene recipe uses one-metre tiles and 2.12-metre Z steps; occupied residence Z values are 0, 1, 3 and 5.',
    'white-house.scene.json is a native landmark recipe and room/tile sidecar, not a legacy portable map. Retain all requirements and refuse unsupported features.',
    'For host-Three use, read packages/white-house/README.md. Bind gameplay/navigation/support/interaction separately. No consumer pin has been changed.',
    'Detailed source recipes and the original painterly atlas/prompt are included. Public reference photographs/plans are research-only and excluded.'],
    'files': [{'path': p.relative_to(root).as_posix(), 'sha256': hashlib.sha256(p.read_bytes()).hexdigest()} for p in files]}
with zipfile.ZipFile(target, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=6) as archive:
    for p in files:
        archive.write(p, p.relative_to(root).as_posix())
    archive.writestr('FORWARDING-INSTRUCTIONS.json', json.dumps(handoff, indent=2))
print(json.dumps({'file': str(target), 'bytes': target.stat().st_size, 'sha256': hashlib.sha256(target.read_bytes()).hexdigest(), 'entries': len(files) + 1}))
