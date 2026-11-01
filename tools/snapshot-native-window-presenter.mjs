// Read exact Git objects only. Never checks out, fetches or writes a donor.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
export const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export const sourceCommit='251bf8094b5f9ebe44208443084c1a6d6658512a';
export const baseCommit='e4b5106f6967614ddc60661a6cdddde5d37b5c2b';
export const authoringCommit='e5ff08c2401bb6f33a236a63efc0eb0b24bbbc7a';
export const vendorRoot='vendor/farmyard-window-art/'+sourceCommit;
const prefix='sites/tactical-animal/dist/';
const selected=['art/windows/catalog.js','art/windows/geometry.js','aft/tactics/hybrid-materials.js','aft/tactics/diagonal-roads.js','aft/tactics/vendor/three.core.js','aft/tactics/vendor/three.module.js','aft/tactics/vendor/THREE-LICENSE.txt'].map(p=>prefix+p);
const hash=b=>createHash('sha256').update(b).digest('hex');
export function snapshot(repository){
  const donor=path.resolve(repository),audit=JSON.parse(fs.readFileSync(path.join(root,'docs/reviews/window-art/sources.json')));
  const git=(...args)=>execFileSync('git',['-c','safe.directory='+donor.replaceAll('\\','/'),'-C',donor,...args],{windowsHide:true,maxBuffer:8*1024*1024});
  const files=selected.map(file=>{
    const bytes=git('show',sourceCommit+':'+file),expected=audit.files.find(v=>v.path===file),gitBlob=createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
    if(!expected||hash(bytes)!==expected.sha256||gitBlob!==expected.gitBlob||bytes.length!==expected.bytes)throw Error('Not the reviewed source: '+file);
    // Unregistered reference notice: preserve original bytes/path in manifest,
    // with an explicit .original storage suffix so the automatic public notice
    // collector does not change Root's whitelist as a side effect of research.
    const storedPath=file.endsWith('THREE-LICENSE.txt')?file+'.original':file;
    const destination=path.join(root,vendorRoot,storedPath);fs.mkdirSync(path.dirname(destination),{recursive:true});
    if(fs.existsSync(destination)&&!fs.readFileSync(destination).equals(bytes))throw Error('Immutable snapshot differs: '+file);
    fs.writeFileSync(destination,bytes);return {...expected,storedPath};
  });
  const manifest={schemaVersion:1,repository:audit.sourceRepository,commit:sourceCommit,purpose:'Bounded native static window art reference. Full native geometry dependency closure; never imported by the candidate runtime. No shatter, audio or mutable donor state.',files,rights:'Preserve original notices and the audit\'s unresolved inherited study/art rights. This snapshot adds no licence grant. Three MIT notice is included.'};
  fs.writeFileSync(path.join(root,vendorRoot,'provenance.json'),JSON.stringify(manifest,null,2)+'\n');return manifest;
}
export function verifySnapshot(){
  const manifest=JSON.parse(fs.readFileSync(path.join(root,vendorRoot,'provenance.json')));
  if(manifest.commit!==sourceCommit||manifest.files.length!==selected.length)throw Error('Snapshot identity mismatch.');
  for(const f of manifest.files){const b=fs.readFileSync(path.join(root,vendorRoot,f.storedPath));if(b.length!==f.bytes||hash(b)!==f.sha256||createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex')!==f.gitBlob)throw Error('Immutable source changed: '+f.path);}
  return {sourceCommit,files:manifest.files.length,bytes:manifest.files.reduce((n,f)=>n+f.bytes,0)};
}
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url){const i=process.argv.indexOf('--source-repository');if(i>=0)snapshot(process.argv[i+1]);console.log(JSON.stringify(verifySnapshot()));}
