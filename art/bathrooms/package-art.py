"""Bundle the committed bathroom art and validate every portable glTF dependency."""
import hashlib
import json
import pathlib
import posixpath
import subprocess
import zipfile

ROOT = pathlib.Path(__file__).resolve().parents[2]
OUT = ROOT / 'outputs/nautilus-bathrooms-v1.zip'


def main():
    files = []
    for folder in ['packages/bathrooms', 'art/bathrooms', 'assets/bathrooms', 'docs/reviews/bathrooms']:
        files += [p for p in (ROOT / folder).rglob('*') if p.is_file() and '__pycache__' not in p.parts]
    files += [ROOT / p for p in ['docs/bathrooms.md', 'tests/bathrooms.test.mjs',
        'tools/build-bathrooms.mjs', 'tools/export-bathrooms-gltf.mjs', 'tools/art-review-browser.mjs',
        'packages/fort-variants/geometry.js', 'package.json', 'NOTICE.md']]
    files = sorted(set(files))
    git = ['git', '-c', 'safe.directory=' + ROOT.as_posix()]
    commit = subprocess.check_output(git + ['rev-parse', 'HEAD'], cwd=ROOT, text=True).strip()
    dirty = bool(subprocess.check_output(git + ['status', '--porcelain'], cwd=ROOT, text=True).strip())
    if dirty:
        raise RuntimeError('Package only from a clean committed tree.')
    entries = [{'file': p.relative_to(ROOT).as_posix(), 'bytes': p.stat().st_size,
                'sha256': hashlib.sha256(p.read_bytes()).hexdigest()} for p in files]
    manifest = {'version': 1, 'collection': 'nautilus-bathrooms-v1', 'sourceCommit': commit, 'workingTreeHasChanges': dirty,
        'artistFoundation': '65c06735396e14b8774ae1e7d5ad61969692963f',
        'status': 'Original artist intake candidate; shared editor/game promotion remains explicit.',
        'stallContract': 'Every complete stall occupies exactly 1 × 2 tiles = 1 × 2 metres. Door motion reserves aisle space beyond the closed footprint.',
        'requirements': 'Standard glTF has complete relative buffer/image closure. Rebuild/review uses the named Nautilus foundation, Node >=22, pinned Three, Python, Playwright and Edge. Unchanged surface-primitive dependency is included. Vendor runtime and game integration are excluded.',
        'files': entries}
    OUT.parent.mkdir(exist_ok=True)
    with zipfile.ZipFile(OUT, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
        for file in files:
            archive.write(file, file.relative_to(ROOT).as_posix())
        archive.writestr('ART-BUNDLE-MANIFEST.json', json.dumps(manifest, indent=2) + '\n')
    with zipfile.ZipFile(OUT) as archive:
        assert archive.testzip() is None
        names = set(archive.namelist())
        for entry in entries:
            assert hashlib.sha256(archive.read(entry['file'])).hexdigest() == entry['sha256'], entry['file']
        catalogue = json.loads(archive.read('assets/bathrooms/catalogue.json'))
        for record in catalogue['assets']:
            gltf_file = next(f['file'] for f in record['files'] if f['file'].endswith('.gltf'))
            gltf = json.loads(archive.read(gltf_file))
            for resource in gltf['buffers'] + gltf['images']:
                uri = resource['uri']
                assert ':' not in uri and not uri.startswith('/'), uri
                target = posixpath.normpath(posixpath.join(posixpath.dirname(gltf_file), uri))
                assert target in names, target
    print(json.dumps({'file': str(OUT), 'entries': len(entries) + 1, 'bytes': OUT.stat().st_size,
        'sha256': hashlib.sha256(OUT.read_bytes()).hexdigest(), 'gltfAssetsVerified': len(catalogue['assets']),
        'sourceCommit': commit, 'workingTreeHasChanges': dirty}))


if __name__ == '__main__':
    main()
