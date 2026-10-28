// Parse module requests without executing application code. VM modules are used
// only by the test subprocess, never by a public package or browser build.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {execFileSync} from 'node:child_process';

const argumentsOf=process.argv.slice(2),option=name=>{const i=argumentsOf.indexOf(name);return i<0?undefined:argumentsOf[i+1];};
const root=path.resolve(option('--root')||process.cwd()),revision=option('--revision'),enforce=!argumentsOf.includes('--report');
const blobs=revision?new Map(execFileSync('git',['ls-tree','-r',revision],{cwd:root,encoding:'utf8',windowsHide:true}).trim().split('\n').map(line=>{const match=/^\d+ blob ([a-f0-9]+)\t(.+)$/.exec(line);return match?[match[2],match[1]]:[];})):null;
const read=file=>blobs?execFileSync('git',['cat-file','blob',blobs.get(file)||file],{cwd:root,windowsHide:true,maxBuffer:64*1024*1024}):fs.readFileSync(path.join(root,file));
const manifest=JSON.parse(read('package.json'));
const exported=value=>typeof value==='string'?[value]:Object.values(value||{}).flatMap(exported);
const entries=argumentsOf.flatMap((arg,i)=>arg==='--entry'?[argumentsOf[i+1]]:[]);
if(!entries.length)entries.push(...new Set(exported(manifest.exports).filter(file=>/^\.\/packages\/(?:map-core|rules-core)\//.test(file)).map(file=>file.slice(2))));
if(!entries.length)throw Error('No public map/rules entrypoints were discovered.');
const modules=new Map(),violations=[];
const browserPath=file=>/^(?:apps|tools|examples)\//.test(file)||/(?:^|\/)(?:three(?:\.[^/]*)?|[^/]*(?:renderer|webgl|webgpu)[^/]*|[^/]*-scene|painted-cargo)\.[cm]?js$/i.test(file);
// Public core dependencies stay statically enumerable. This conservative guard
// also rejects executable indirection instead of overlooking lazy renderer loads.
const opaqueCode=/\b(?:import|require|eval|Function)(?:(?:\s+)|(?:\/\*[\s\S]*?\*\/)|(?:\/\/[^\n]*(?:\n|$)))*\(/;
const browserCode=/\b(?:window|document)\s*\.\s*(?:createElement\w*|getElement\w*|querySelector\w*|body|documentElement)\b|\b(?:globalThis|window|self)\s*\.\s*(?:document|localStorage|sessionStorage|indexedDB|navigator)\b|\b(?:localStorage|sessionStorage|indexedDB|requestAnimationFrame|cancelAnimationFrame|fetch|XMLHttpRequest|Worker)\s*(?:\(|\.)|\bnew\s+(?:\w+\.)?(?:WebGLRenderer|WebGLRenderTarget|CanvasTexture|Scene|Mesh|BoxGeometry)\b/;
function visit(file,chain=[]) {
  if(modules.has(file))return;
  if(file.startsWith('../')||path.isAbsolute(file)||file.includes('\\'))throw Error('Dependency escapes the repository: '+file);
  const bytes=read(file),text=bytes.toString('utf8'),record={file,bytes:bytes.length,imports:[]};modules.set(file,record);
  const reject=reason=>violations.push({file,reason,chain:[...chain,file]});
  if(browserPath(file))reject('Renderer/browser module in public core');
  if(opaqueCode.test(text))reject('Dynamic import or executable dependency indirection');
  if(browserCode.test(text))reject('DOM, storage, network or renderer machinery in public core');
  if(file.endsWith('.json')){JSON.parse(text);return;}
  if(!/\.[cm]?js$/.test(file))throw Error('Opaque public-core dependency: '+file);
  const parsed=new vm.SourceTextModule(text,{identifier:file});
  for(const specifier of parsed.dependencySpecifiers){
    if(!specifier.startsWith('.')){reject('External/DOM/storage dependency: '+specifier);continue;}
    const resolved=path.posix.normalize(path.posix.join(path.posix.dirname(file),specifier));record.imports.push(resolved);visit(resolved,[...chain,file]);
  }
}
for(const file of entries)visit(file);
function closure(roots){const seen=new Set(),walk=file=>{if(seen.has(file))return;seen.add(file);modules.get(file).imports.forEach(walk);};roots.forEach(walk);return {entries:roots,modules:seen.size,bytes:[...seen].reduce((n,file)=>n+modules.get(file).bytes,0)};}
const report={revision:revision||'working-tree',groups:{map:closure(entries.filter(file=>file.startsWith('packages/map-core/'))),rules:closure(entries.filter(file=>file.startsWith('packages/rules-core/')))},combined:closure(entries),violations,files:[...modules.keys()].sort()};
if(enforce&&violations.length)throw Error(violations.map(({reason,chain})=>reason+': '+chain.join(' -> ')).join('\n'));
process.stdout.write(JSON.stringify(report));
