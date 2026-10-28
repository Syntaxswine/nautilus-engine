"""Package editable native maps and recipes; no third-party reference images."""
from pathlib import Path
import json
import hashlib
import zipfile

root=Path(__file__).resolve().parent.parent
base=root/'assets/buildings/editor'
index=json.loads((base/'index.json').read_text(encoding='utf-8'))
files={'index.json':base/'index.json','authoring/reference-register.json':root/'art/buildings/reference-register.json'}
for building in index['buildings']:
    for item in building['files']:
        source=base/item['file']
        if hashlib.sha256(source.read_bytes()).hexdigest()!=item['sha256']:
            raise ValueError('Changed native export: '+item['file'])
        files[item['file']]=source
for name in ['designs.js','index.js','editor.js']:
    files['source/'+name]=root/'packages/building-catalog'/name
files['docs/editor-buildings.md']=root/'docs/editor-buildings.md'
files['docs/reviews/2026-10-28-editor-buildings.md']=root/'docs/reviews/2026-10-28-editor-buildings.md'
for source in (root/'docs/reviews/editor-buildings').iterdir():
    if source.suffix in {'.png','.json'}: files['docs/reviews/editor-buildings/'+source.name]=source
output=root/'outputs/nautilus-editor-buildings-v1.zip'
output.parent.mkdir(exist_ok=True)
with zipfile.ZipFile(output,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=9) as archive:
    archive.writestr('README.txt','Nautilus native editor buildings: 48 maps, 48 reusable blocks. Import a .map.json or .block.json into the Nautilus/AFT map editor. All pieces are ordinary editable floors, boundaries, stairs, ladders and roof modules. See docs/editor-buildings.md for native grid, material and roof adaptations. Recipes/reports preserve construction and source references. source/ is a repository-relative authoring snapshot; use it inside the Nautilus repository with its pinned native brush implementation.\n')
    for name,source in sorted(files.items()): archive.write(source,name)
with zipfile.ZipFile(output) as archive:
    if archive.testzip() is not None: raise ValueError('Native pack ZIP validation failed')
print(json.dumps({'file':str(output),'files':len(files)+1,'bytes':output.stat().st_size,'sha256':hashlib.sha256(output.read_bytes()).hexdigest()}))
