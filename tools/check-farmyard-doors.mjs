import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {moduleReferenceGraph} from './module-references.mjs';
export function checkFarmyardDoors(root,{tracked=null,output=null}={}){
  const pin=JSON.parse(fs.readFileSync(path.join(root,'upstream.json'))).farmyardDoors;
  const manifest=JSON.parse(fs.readFileSync(path.join(root,pin.manifest)));
  if(pin.commit!==manifest.commit||pin.root!==manifest.snapshotRoot||manifest.commit!=='251bf8094b5f9ebe44208443084c1a6d6658512a')throw Error('Farmyard door source pin mismatch.');
  if(tracked&&!tracked.has(pin.manifest))throw Error('Door source manifest is not tracked.');
  const seen=new Set();let bytes=0;
  for(const record of manifest.files){
    const relative=pin.root+'/'+record.path,file=path.resolve(root,relative),base=path.resolve(root,pin.root);
    if(!file.startsWith(base+path.sep)||seen.has(record.path)||!/^[a-f0-9]{40}$/.test(record.gitBlob))throw Error('Invalid or duplicate door source identity.');
    const raw=fs.readFileSync(file);
    if(raw.length!==record.bytes||createHash('sha256').update(raw).digest('hex')!==record.sha256)throw Error('Changed original door source: '+record.path);
    if(tracked&&!tracked.has(relative))throw Error('Untracked original door source: '+relative);
    seen.add(record.path);bytes+=raw.length;
  }
  const originals=moduleReferenceGraph([path.join(root,pin.root,manifest.entry)],{root}).map(row=>path.relative(path.join(root,pin.root),row.filename).replaceAll('\\','/')).sort();
  if(JSON.stringify(originals)!==JSON.stringify([...seen].sort()))throw Error('Door source dependency closure differs from its manifest.');
  const runtime=moduleReferenceGraph([path.join(root,'packages/adapters/farmyard/doors.js')],{root});
  for(const {filename}of runtime){const file=path.relative(root,filename).replaceAll('\\','/');if(!file.startsWith('packages/')||(file.startsWith('packages/map-core/')&&!['packages/map-core/requirements.js','packages/map-core/contract-manifest.js'].includes(file))||/^packages\/(?:parts-core|grenades-core|game-ui|floor-navigation)\//.test(file)||/(?:^|\/)(?:three[^/]*|painted-[^/]*)\.js$/.test(file))throw Error('Door facade reaches unrelated runtime: '+file);}
  if(output){
    const report=JSON.parse(fs.readFileSync(path.join(output,'build-provenance.json'))).farmyardDoors;
    const records=runtime.map(({filename})=>{const raw=fs.readFileSync(filename);return {path:path.relative(root,filename).replaceAll('\\','/'),bytes:raw.length,sha256:createHash('sha256').update(raw).digest('hex')};});
    const ordered=value=>JSON.stringify([...value].sort((a,b)=>a.path.localeCompare(b.path)));
    if(!report||report.sourceCommit!==pin.commit||report.sourceSnapshotDistributed!==false||ordered(report.files)!==ordered(records))throw Error('Door build provenance omits or changes runtime dependency records.');
    const schemas=['door-state-v1.schema.json','door-host-save-v1.schema.json'].map(name=>{const file='packages/adapters/farmyard/doors/'+name,raw=fs.readFileSync(path.join(root,file));return {path:file,bytes:raw.length,sha256:createHash('sha256').update(raw).digest('hex')};});
    if(ordered(report.schemas)!==ordered(schemas))throw Error('Door build schema provenance differs.');
    for(const record of [...records,...schemas]){const raw=fs.readFileSync(path.join(output,record.path));if(raw.length!==record.bytes||createHash('sha256').update(raw).digest('hex')!==record.sha256)throw Error('Built door dependency differs: '+record.path);}
  }
  return {commit:pin.commit,originalModules: seen.size,originalBytes:bytes,runtimeModules:runtime.length,sharedSnapshot:true};
}
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url){const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');console.log(JSON.stringify(checkFarmyardDoors(root)));}
