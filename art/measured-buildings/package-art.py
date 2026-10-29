"""Create a local original-art handoff; no publishing or reference-pixel distribution."""
import hashlib, json, pathlib, subprocess, zipfile
ROOT=pathlib.Path(__file__).resolve().parents[2]
OUT=ROOT/'outputs/nautilus-measured-buildings-v1.zip'
def main():
    files=[]
    for folder in ['packages/measured-buildings','art/measured-buildings','assets/measured-buildings','docs/reviews/measured-buildings']:
        files += [p for p in (ROOT/folder).rglob('*') if p.is_file() and '__pycache__' not in p.parts]
    files += [ROOT/p for p in ['docs/measured-buildings.md','tests/measured-buildings.test.mjs',
        'tools/build-measured-buildings.mjs','tools/export-measured-gltf.mjs','tools/art-review-browser.mjs',
        'assets/buildings/painted-materials-v2.png','NOTICE.md']]
    files=sorted(set(files));entries=[]
    for p in files:
        data=p.read_bytes();entries.append({'file':p.relative_to(ROOT).as_posix(),'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()})
    commit=subprocess.check_output(['git','-c','safe.directory='+str(ROOT).replace('\\','/'),'rev-parse','HEAD'],cwd=ROOT,text=True).strip()
    dirty=bool(subprocess.check_output(['git','-c','safe.directory='+str(ROOT).replace('\\','/'),'status','--porcelain'],cwd=ROOT,text=True).strip())
    manifest={'version':1,'collection':'nautilus-measured-buildings-v1','partsCollection':'nautilus-measured-parts-v1',
        'baseline':'12ad8c9b1c96637cd05c8e344692063bfde385f3','sourceCommit':commit,'workingTreeHasChanges':dirty,
        'scope':'Original art only. Source reference images/PDFs, vendor runtime, editor intake and game capabilities are excluded.',
        'requirements':'Standard glTF includes relative image closure. Source rebuild/review requires the named Nautilus baseline, Node >=22, Python+Pillow, Playwright and Edge.',
        'files':entries}
    OUT.parent.mkdir(exist_ok=True)
    with zipfile.ZipFile(OUT,'w',zipfile.ZIP_DEFLATED,compresslevel=9) as archive:
        for p in files: archive.write(p,p.relative_to(ROOT).as_posix())
        archive.writestr('ART-BUNDLE-MANIFEST.json',json.dumps(manifest,indent=2)+'\n')
    with zipfile.ZipFile(OUT) as archive:
        assert archive.testzip() is None
        for entry in entries: assert hashlib.sha256(archive.read(entry['file'])).hexdigest()==entry['sha256'],entry['file']
    print(json.dumps({'file':str(OUT),'entries':len(entries)+1,'bytes':OUT.stat().st_size,'sha256':hashlib.sha256(OUT.read_bytes()).hexdigest(),'sourceCommit':commit,'workingTreeHasChanges':dirty}))
if __name__=='__main__': main()
