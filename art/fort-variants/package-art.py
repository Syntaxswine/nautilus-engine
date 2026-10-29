"""Bundle committed original castle / cyclone art and verify its complete glTF dependency closure."""
import hashlib
import json
import pathlib
import posixpath
import subprocess
import zipfile

ROOT = pathlib.Path(__file__).resolve().parents[2]
OUT = ROOT / 'outputs/nautilus-fort-era-variants-v1.zip'


def main():
    files = []
    for folder in ['packages/fort-variants', 'art/fort-variants',
                   'assets/fort-variants', 'docs/reviews/fort-variants']:
        files += [p for p in (ROOT / folder).rglob('*')
                  if p.is_file() and '__pycache__' not in p.parts]
    files += [ROOT / p for p in [
        'docs/fort-variants.md', 'tests/fort-variants.test.mjs',
        'tools/build-fort-variants.mjs', 'tools/export-fort-variants-gltf.mjs',
        'tools/art-review-browser.mjs', 'packages/measured-buildings/index.js',
        'packages/measured-buildings/designs.js',
        'packages/frontier-fort/designs.js', 'packages/frontier-fort/index.js',
        'packages/frontier-fort/layouts.js', 'packages/frontier-fort/connectors.js',
        'assets/buildings/painted-materials-v2.png', 'package.json', 'NOTICE.md']]
    files = sorted(set(files))
    git = ['git', '-c', 'safe.directory=' + ROOT.as_posix()]
    commit = subprocess.check_output(git + ['rev-parse', 'HEAD'], cwd=ROOT, text=True).strip()
    dirty = bool(subprocess.check_output(git + ['status', '--porcelain'], cwd=ROOT, text=True).strip())
    if dirty:
        raise RuntimeError('Package from a clean committed tree so the source commit is exact.')
    entries = []
    for file in files:
        data = file.read_bytes()
        entries.append({'file': file.relative_to(ROOT).as_posix(), 'bytes': len(data),
                        'sha256': hashlib.sha256(data).hexdigest()})
    manifest = {
        'version': 1, 'collection': 'nautilus-fort-era-variants-v1', 'sourceCommit': commit,
        'workingTreeHasChanges': dirty,
        'engineBaseline': '12ad8c9b1c96637cd05c8e344692063bfde385f3',
        'equivalentReleasedMain': '581258aa506798dca3909bfd41ec39d3ee23b550',
        'artistFoundation': '6d9dfeca7e47a4bded6497472f46f49f8ce14a5b',
        'status': 'Separate artist intake candidate; not included in the v0.5.0 release.',
        'scope': 'Original art, dependencies and review evidence. Third-party reference pixels, private research, vendor runtime and game/editor adoption are excluded.',
        'requirements': 'Standard glTF has complete relative buffer/image closure. Source rebuild/review uses the named Nautilus foundation, Node >=22, Python, pinned Three, Playwright and Edge. Unchanged frontier recipe/profile and measured compiler dependency closure is included.',
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
        catalogue = json.loads(archive.read('assets/fort-variants/catalogue.json'))
        for record in catalogue['assets']:
            gltf_file = next(f['file'] for f in record['files'] if f['file'].endswith('.gltf'))
            gltf = json.loads(archive.read(gltf_file))
            for resource in gltf['buffers'] + gltf['images']:
                uri = resource['uri']
                assert ':' not in uri and not uri.startswith('/'), uri
                target = posixpath.normpath(posixpath.join(posixpath.dirname(gltf_file), uri))
                assert target in names, target
    print(json.dumps({'file': str(OUT), 'entries': len(entries) + 1, 'bytes': OUT.stat().st_size,
                      'sha256': hashlib.sha256(OUT.read_bytes()).hexdigest(),
                      'gltfAssetsVerified': len(catalogue['assets']),
                      'sourceCommit': commit, 'workingTreeHasChanges': dirty}))


if __name__ == '__main__':
    main()
