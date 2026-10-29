import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url)),digest=data=>createHash('sha256').update(data).digest('hex');
export function checkBear(tracked=null){
  const pin=JSON.parse(fs.readFileSync(path.join(root,'upstream.json'))).bear;if(!pin||pin.commit!=='4f5f53917990ec03b2f14c65f067e4b99ec8fcaa'||pin.root!=='vendor/aft-bear/'+pin.commit)throw Error('Bear source pin/layout changed without a deliberate intake.');
  const manifest=JSON.parse(fs.readFileSync(path.join(root,pin.root,'provenance.json')));if(manifest.commit!==pin.commit)throw Error('Bear provenance pin mismatch.');
  for(const file of manifest.files){const name=pin.root+'/'+file.path;if(tracked&&!tracked.has(name))throw Error('Untracked bear source: '+name);const data=fs.readFileSync(path.join(root,name));if(data.length!==file.bytes||digest(data)!==file.sha256)throw Error('Immutable bear source bytes changed: '+name);}
  const adaptations=JSON.parse(fs.readFileSync(path.join(root,'docs/reviews/bear/adaptations.json')));if(adaptations.sourceCommit!==pin.commit)throw Error('Bear adaptation source pin mismatch.');
  for(const file of adaptations.files){if(tracked&&!tracked.has(file.output))throw Error('Untracked bear execution adapter: '+file.output);if(digest(fs.readFileSync(path.join(root,file.output)))!==file.sha256)throw Error('Bear generated adapter changed: '+file.output);}
  return {files:manifest.files.length,bytes:manifest.files.reduce((n,file)=>n+file.bytes,0),adaptations:adaptations.files.length};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))console.log(JSON.stringify(checkBear()));
