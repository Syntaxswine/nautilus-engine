// Read immutable Git objects; never inspect or modify the artist's checkout.
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
export const commit='5d8962e7764bce3fcfff8f4dfd4883bfec97b0ee';
const root=fileURLToPath(new URL('../../',import.meta.url));
const destination='vendor/nautilus-road-vehicles/'+commit;
const read=name=>execFileSync('git',['show',commit+':'+name],{cwd:root,maxBuffer:64*1024*1024,windowsHide:true});
const names=execFileSync('git',['ls-tree','-r','--name-only',commit],{cwd:root,encoding:'utf8',windowsHide:true}).trim().split('\n').filter(name=>
  name.startsWith('packages/vehicle-visuals/')||name.startsWith('tools/vehicle-art/')||
  name.startsWith('vendor/meshoptimizer/')||['docs/road-vehicles.md','tools/editor-road-vehicles.mjs','tools/road-vehicle-registration.mjs','tests/road-vehicles.test.mjs'].includes(name));
const verify=process.argv.includes('--verify'),manifest={kind:'nautilus-reviewed-art-closure',version:1,repository:'https://github.com/Syntaxswine/nautilus-engine',commit,tree:execFileSync('git',['rev-parse',commit+'^{tree}'],{cwd:root,encoding:'utf8',windowsHide:true}).trim(),purpose:'Byte-preserved approved road artwork; engine adapters and deterministic gameplay derivatives are separate.',files:[]};
for(const name of names){const bytes=read(name),target=path.join(root,destination,name);if(verify){if(!fs.existsSync(target)||!fs.readFileSync(target).equals(bytes))throw Error('Original artwork differs: '+name);}else{fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,bytes);}manifest.files.push({path:name,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});}
const text=JSON.stringify(manifest,null,2)+'\n',target=path.join(root,destination,'source.json');
if(verify){if(fs.readFileSync(target,'utf8')!==text)throw Error('Artwork manifest differs.');}else fs.writeFileSync(target,text);
console.log(JSON.stringify({commit,files:names.length,bytes:manifest.files.reduce((n,f)=>n+f.bytes,0),verified:verify}));
