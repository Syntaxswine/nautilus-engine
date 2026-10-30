import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {moduleClosure} from './distribution.mjs';
import {windowGeometrySchema} from './farmyard-window-geometry-schema.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
export function checkWindowQueries(){
  const audit=JSON.parse(fs.readFileSync(path.join(root,'docs/reviews/farmyard-windows/source-audit.json'))),source=[];
  for(const name of audit.closures.headless.modules){const record=audit.files.find(file=>file.path===name),bytes=fs.readFileSync(path.join(root,record.existingEngineFile)),sha256=createHash('sha256').update(bytes).digest('hex'),gitBlob=createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');if(bytes.length!==record.bytes||sha256!==record.sha256||gitBlob!==record.gitBlob)throw Error('Pinned native window evidence drift: '+name);source.push({path:name,bytes:bytes.length,sha256,gitBlob});}
  const schema='packages/windows-core/window-geometry-v1.schema.json';if(fs.readFileSync(path.join(root,schema),'utf8')!==JSON.stringify(windowGeometrySchema(),null,2)+'\n')throw Error('Candidate geometry schema drift.');
  const files=moduleClosure(['packages/windows-core/index.js','packages/adapters/farmyard/windows.js']);if(files.some(file=>!file.startsWith('packages/')||/vendor|three|renderer|world-core|map-core|rules-core|doors/.test(file)))throw Error('Candidate geometry closure must be pure engine-owned data/math.');
  const runtime=files.map(file=>{const bytes=fs.readFileSync(path.join(root,file));return {path:file,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')};});
  return {status:'pass',sourceCommit:audit.sourceCommit,source,sourceBytes:source.reduce((sum,f)=>sum+f.bytes,0),runtime,runtimeBytes:runtime.reduce((sum,f)=>sum+f.bytes,0),schema,rights:audit.rights.headless,registration:'Candidate only; no root export/schema/capability/version/pin changes.',remainingGate:'Confirmed-impact transactions, all six actually bound host services, durable receipts and complete-game save staging.'};
}
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url){const result=checkWindowQueries();if(process.argv.includes('--write')){const folder=path.join(root,'artifacts/farmyard-windows');fs.mkdirSync(folder,{recursive:true});fs.writeFileSync(path.join(folder,'source-package-closure-report.json'),JSON.stringify(result,null,2)+'\n');}console.log(JSON.stringify(result,null,2));}
