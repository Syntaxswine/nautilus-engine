// Artist source inspection only. Never writes vendor, pins or a runtime provider.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {moduleReferencesBatch} from '../../../tools/module-references.mjs';
export const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../..');
export const SOURCE='251bf8094b5f9ebe44208443084c1a6d6658512a';
export const PROPOSAL='0f5bc5be84e813feb9e70c34dcf4ebd9ff3287ba';
export const BASE='e8a66b1f4ead9a6f56c5609bd2a881caceb66b32';
export const CACHE=path.join(ROOT,'artifacts/window-art-audit/source');
const prefix='sites/tactical-animal/dist/',sha=b=>createHash('sha256').update(b).digest('hex');
const slash=p=>p.replaceAll('\\','/');
export function acquire(repo){
 const git=args=>execFileSync('git',['-c','safe.directory='+slash(path.resolve(repo)),'-C',repo,...args],{windowsHide:true,maxBuffer:16*1024*1024});
 const read=n=>git(['show',SOURCE+':'+n]),buffers=new Map(),edges=new Map();
 const include=name=>{if(buffers.has(name))return;const b=read(name);buffers.set(name,b);
  if(!name.endsWith('.js'))return;
  const [{specifiers}]=moduleReferencesBatch([{filename:path.join(CACHE,name),source:b.toString()}]);
  const imports=specifiers.map(s=>{if(!s.startsWith('.'))throw Error('Unexpected source dependency '+s);return path.posix.normalize(path.posix.join(path.posix.dirname(name),s));});
  if(imports.some(n=>!n.startsWith(prefix)))throw Error('Source dependency escapes selected art tree.');edges.set(name,imports);imports.forEach(include);
 };
 const roots=['art/windows/geometry.js','window-view.js','window-shatter.js','art/windows/review.js','art/windows/preview-renderer.js'].map(n=>prefix+n);roots.forEach(include);
 for(const n of ['art/windows/index.html','art/windows/review.css','art/windows/catalog.json','icon.svg','assets/audio/glass-smash-rubberduck-cc0.ogg','assets/audio/GLASS-SMASH-RUBBERDUCK-LICENSE.md','aft/tactics/vendor/THREE-LICENSE.txt'])include(prefix+n);
 include('sites/tactical-animal/window-shatter-provenance.json');
 const closure=n=>{const set=new Set();function walk(k){if(set.has(k))return;set.add(k);(edges.get(k)||[]).forEach(walk);}walk(n);return [...set].sort();};
 const files=[...buffers].map(([name,b])=>({path:name,bytes:b.length,sha256:sha(b),gitBlob:git(['rev-parse',SOURCE+':'+name]).toString().trim()})).sort((a,b)=>a.path.localeCompare(b.path));
 for(const [n,b]of buffers){const file=path.join(CACHE,n);fs.mkdirSync(path.dirname(file),{recursive:true});if(fs.existsSync(file)&&!fs.readFileSync(file).equals(b))throw Error('Source cache drift: '+n);fs.writeFileSync(file,b);}
 const proposalPath='tests/fixtures/farmyard-windows-contract/proposal.json';
 const pg=args=>execFileSync('git',['-c','safe.directory='+slash(ROOT),'-C',ROOT,...args],{windowsHide:true,maxBuffer:4*1024*1024});
 const fixture=pg(['show',PROPOSAL+':'+proposalPath]);fs.writeFileSync(path.join(CACHE,'approved-proposal.json'),fixture);
 const out={schemaVersion:1,sourceRepository:'https://github.com/Syntaxswine/farmyard-commando',sourceCommit:SOURCE,baseline:BASE,proposalCommit:PROPOSAL,
  proposalFixture:{path:proposalPath,bytes:fixture.length,sha256:sha(fixture),gitBlob:pg(['rev-parse',PROPOSAL+':'+proposalPath]).toString().trim()},
  files,closures:Object.fromEntries(roots.map(n=>{const members=closure(n);return[n,{modules:members.length,bytes:members.reduce((sum,f)=>sum+buffers.get(f).length,0),members}];})),
  boundary:'Original Git-object cache and audit evidence only; no source bytes imported into vendor, runtime, source pins, consumer pins or another worktree. No implementation of pane authority or provider.'};
 fs.writeFileSync(path.join(ROOT,'docs/reviews/window-art/sources.json'),JSON.stringify(out,null,2)+'\n');return out;
}
const invoked=process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url);
if(invoked){const at=process.argv.indexOf('--repo');if(at<0)throw Error('Use --repo <read-only Farmyard checkout>.');const result=acquire(process.argv[at+1]);console.log(JSON.stringify({source:SOURCE,files:result.files.length,closures:Object.fromEntries(Object.entries(result.closures).map(([n,c])=>[n,{modules:c.modules,bytes:c.bytes}]))}));}
