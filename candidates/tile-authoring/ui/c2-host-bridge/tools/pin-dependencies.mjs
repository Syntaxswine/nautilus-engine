// Deliberate fixed Git-object importer, never reads another worker checkout.
import fs from 'node:fs';import path from 'node:path';import {execFileSync} from 'node:child_process';import {fileURLToPath} from 'node:url';import {createHash} from 'node:crypto';
import {moduleReferencesBatch} from '../../../../../tools/module-references.mjs';
const here=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),root=path.resolve(here,'../../../..'),sha=b=>createHash('sha256').update(b).digest('hex');
const pins=[
 {id:'core0597',commit:'0597fc3b7ed9213842df90e8a1bbd4d0887ba49f',entry:'candidates/tile-authoring/core/c2/surface-target.js',extraEntries:['candidates/tile-authoring/core/c2/portable.js'],status:'accepted pure inspection producer; portable entry used only by selected encoded-byte component controls; no owned editing meter'},
 {id:'ui5a7',commit:'5a7cb4ce728d158f42d997e076c296459cb259aa',entry:'candidates/tile-authoring/ui/c2-runtime/contract.js',status:'accepted private finite/UI source guards; no Host adoption'},
 {id:'bytesd8',commit:'d8ff73ce63282e897cac146bc3077ea443c38e05',entry:'candidates/tile-authoring/host/builtin-dependency-prefix/index.mjs',status:'accepted selected encoded-byte/prefix component; native/meter/authority remain unbound'}
];
const inputs=[];
for(const pin of pins){const loaded=new Set(),queue=[pin.entry,...(pin.extraEntries??[])],base=path.join(here,'vendor',pin.id,'root');
 while(queue.length){const file=queue.shift();if(loaded.has(file))continue;loaded.add(file);if(!/\.(?:mjs|js|json)$/.test(file)||file.startsWith('../'))throw Error('Unexpected dependency '+file);
  const bytes=execFileSync('git',['show',pin.commit+':'+file],{cwd:root,maxBuffer:16e6,windowsHide:true}),dest=path.join(base,file);fs.mkdirSync(path.dirname(dest),{recursive:true});if(fs.existsSync(dest)&&!fs.readFileSync(dest).equals(bytes))throw Error('Preserve modified vendor '+file);fs.writeFileSync(dest,bytes);inputs.push({commit:pin.commit,path:file,vendored:path.relative(here,dest).replaceAll('\\','/'),bytes:bytes.length,sha256:sha(bytes)});
  if(/\.(mjs|js)$/.test(file)){const refs=moduleReferencesBatch([{filename:file,source:bytes.toString('utf8')}])[0];for(const s of refs.specifiers){if(!s.startsWith('.'))throw Error('No fallback '+s);queue.push(path.posix.normalize(path.posix.join(path.posix.dirname(file),s)));}}
 }
 fs.writeFileSync(path.join(base,'package.json'),'{"type":"module","private":true,"description":"Fixed private byte-preserved dependency closure; no registration"}\n');
}
fs.writeFileSync(path.join(here,'vendor/source.json'),JSON.stringify({kind:'private-ui-bridge-fixed-dependencies',pins,inputs,runtimeEd66Imported:false,uncommittedWorkerReads:false},null,2)+'\n');
console.log(JSON.stringify({closures:pins.length,files:inputs.length,bytes:inputs.reduce((n,r)=>n+r.bytes,0),unreviewedRuntimeImported:false}));
