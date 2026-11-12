// Stable source/distribution metadata. Evidence is sealed separately, avoiding
// a package-hash/evidence-hash cycle. No root or inherited source file is edited.
import fs from 'node:fs';import path from 'node:path';
import {moduleReferenceGraph} from '../../../tools/module-references.mjs';
import {root,inventory,record,walk,relative} from './inventory.mjs';
const write=(file,value)=>fs.writeFileSync(path.join(root,file),JSON.stringify(value,null,2)+'\n');
const nativeFile='packages/native-actors/source.json',native=JSON.parse(fs.readFileSync(path.join(root,nativeFile)));
native.runtime=moduleReferenceGraph(['index.js','three.js'].map(n=>path.join(root,'packages/native-actors',n)),{root}).map(r=>({...record(r.filename),imports:r.specifiers})).sort((a,b)=>a.path.localeCompare(b.path));
native.publicTypes=['index.d.ts','three.d.ts'].map(n=>record('packages/native-actors/'+n));native.guide=record('packages/native-actors/README.md');native.card=record('packages/native-actors/usage-card.json');write(nativeFile,native);
const file='packages/player-setup/source.json',source=JSON.parse(fs.readFileSync(path.join(root,file))),selected=inventory();
source.entries=selected.entries;source.runtime=selected.runtime;source.resources=selected.resources;source.notices=selected.notices;source.headlessClosure=selected.headless;source.counts=selected.counts;
source.publicTypes=['index.d.ts','browser.d.ts'].map(n=>record('packages/player-setup/'+n));source.guideRecord=record('packages/player-setup/README.md');source.card=record('packages/player-setup/usage-card.json');source.nativeSource=record(nativeFile);
source.sourceMetadata='Stable candidate dependency/resource inventory; evidence and helper records live separately to avoid recursive hashes.';write(file,source);
console.log(JSON.stringify({status:'sealed',counts:selected.counts,headlessFiles:selected.headless.length,nativeFiles:native.runtime.length}));
