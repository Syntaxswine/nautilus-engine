// Deliberate immutable reference/notice import; never a worker checkout read.
import fs from 'node:fs';import path from 'node:path';import {execFileSync} from 'node:child_process';import {fileURLToPath} from 'node:url';import {createHash} from 'node:crypto';
const here=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),root=path.resolve(here,'../../../..');
const rows=[
 ['05723c3cada36249c6b6777dd40c8a478701bccb','docs/reviews/tile-authoring/ui/c2/projection/projection.d.ts','vendor/ui057/projection.d.ts'],
 ['d8ff73ce63282e897cac146bc3077ea443c38e05','candidates/tile-authoring/host/builtin-dependency-prefix/index.d.mts','references/builtin-api-d8ff73c.d.mts.txt'],
 ['d8ff73ce63282e897cac146bc3077ea443c38e05','candidates/tile-authoring/host/builtin-dependency-prefix/NOTICE.md','vendor/notices/d8/NOTICE.md'],
 ['d8ff73ce63282e897cac146bc3077ea443c38e05','candidates/tile-authoring/host/builtin-dependency-prefix/source.json','references/byte-source-d8.json'],
 ['0597fc3b7ed9213842df90e8a1bbd4d0887ba49f','candidates/tile-authoring/core/c2/source.json','references/core-source-0597.json'],
 ['0597fc3b7ed9213842df90e8a1bbd4d0887ba49f','candidates/tile-authoring/core/c2/surface-target-source.json','references/target-source-0597.json'],
 ['0597fc3b7ed9213842df90e8a1bbd4d0887ba49f','NOTICE.md','vendor/notices/core0597/NOTICE.md'],
 ['5a7cb4ce728d158f42d997e076c296459cb259aa','candidates/tile-authoring/ui/c2-runtime/vendor/NOTICE.md','vendor/notices/ui5a7/NOTICE.md'],
 ['5a7cb4ce728d158f42d997e076c296459cb259aa','candidates/tile-authoring/ui/c2-runtime/source.json','references/ui-source-5a7.json']
];
const inputs=rows.map(([commit,file,vendored])=>{const bytes=execFileSync('git',['show',commit+':'+file],{cwd:root,maxBuffer:16e6,windowsHide:true}),dest=path.join(here,vendored);fs.mkdirSync(path.dirname(dest),{recursive:true});if(fs.existsSync(dest)&&!fs.readFileSync(dest).equals(bytes))throw Error('Original reference differs: '+vendored);fs.writeFileSync(dest,bytes);return{commit,path:file,vendored,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')};});
fs.writeFileSync(path.join(here,'references/source.json'),JSON.stringify({kind:'fixed-reference-and-notice-inputs',status:'Accepted component inputs; ed66 runtime not imported; native/meter/session preparation UNBOUND',inputs},null,2)+'\n');
console.log(JSON.stringify({fixedReferencesAndNotices:inputs.length,uncommittedWorkerReads:false}));
