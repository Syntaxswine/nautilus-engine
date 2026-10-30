import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {root} from './intake-tinderbox-art.mjs';
export const MEDICINE_COMMIT='988b4aca32343c9f2e566db74bb018c705820742';
export const MEDICINE_ROOT='vendor/tinderbox-medicine/'+MEDICINE_COMMIT;
const names=['assets/art/medicine-pickups/index.js','assets/art/medicine-pickups/marks.js','assets/art/medicine-pickups/manifest.json','src/art/materials.js','src/art/resources.js','art/source/medicine-pickups/control-symbols-source.svg','art/source/medicine-pickups/mark-source.json','art/source/medicine-pickups/provenance.json','docs/art/medicine-pickups/handoff.md'];
const hash=b=>createHash('sha256').update(b).digest('hex');
function outputs(read){
 const factory=read(names[0]).toString().replaceAll('\r\n','\n').replace("'../../../src/art/materials.js'","'./medicine-palette.js'").replace("'./marks.js'","'./medicine-marks.js'");
 const palette=/export const PALETTE=Object\.freeze\(\{[\s\S]*?\}\);/.exec(read('src/art/materials.js').toString())?.[0];if(!palette)throw Error('Medicine palette source changed.');
 return {'medicine.js':factory,'medicine-marks.js':read(names[1]).toString().replaceAll('\r\n','\n'),'medicine-palette.js':palette.replaceAll('\r\n','\n')+'\n'};
}
export function verifyTinderboxMedicine({tracked=false}={}){
 const pin=JSON.parse(fs.readFileSync(path.join(root,'upstream.json'))).tinderboxMedicine;
 if(pin?.commit!==MEDICINE_COMMIT||pin.root!==MEDICINE_ROOT)throw Error('Medicine upstream declaration differs from the reviewed pin.');
 const m=JSON.parse(fs.readFileSync(path.join(root,MEDICINE_ROOT,'provenance.json')));if(m.commit!==MEDICINE_COMMIT)throw Error('Medicine source pin changed.');
 const index=tracked?new Set(execFileSync('git',['-c','safe.directory='+root.replaceAll('\\','/'),'-C',root,'ls-files','-z'],{encoding:'utf8'}).split('\0')):null;
 const read=n=>fs.readFileSync(path.join(root,MEDICINE_ROOT,n));
 for(const f of m.files){const b=read(f.path);if(b.length!==f.bytes||hash(b)!==f.sha256||createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex')!==f.gitBlob)throw Error('Medicine source bytes changed: '+f.path);if(index&&!index.has(MEDICINE_ROOT+'/'+f.path))throw Error('Untracked medicine source.');if(index&&execFileSync('git',['-c','safe.directory='+root.replaceAll('\\','/'),'-C',root,'rev-parse',':'+MEDICINE_ROOT+'/'+f.path],{encoding:'utf8',windowsHide:true}).trim()!==f.gitBlob)throw Error('Git index changed medicine bytes.');}
 for(const [name,text]of Object.entries(outputs(read)))if(fs.readFileSync(path.join(root,'packages/tinderbox-art/native',name),'utf8')!==text)throw Error('Unrecorded medicine adaptation: '+name);
 return{commit:MEDICINE_COMMIT,files:m.files.length,bytes:m.files.reduce((n,f)=>n+f.bytes,0)};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const i=process.argv.indexOf('--repo');if(i<0)console.log(JSON.stringify(verifyTinderboxMedicine({tracked:process.argv.includes('--tracked')})));
 else{
  const repo=process.argv[i+1],git=args=>execFileSync('git',['-c','safe.directory='+path.resolve(repo).replaceAll('\\','/'),'-C',repo,...args],{windowsHide:true,maxBuffer:1024*1024});
  const buffers=new Map(names.map(n=>[n,git(['show',MEDICINE_COMMIT+':'+n])]));
  for(const n of names.slice(0,2))if(!buffers.get(n).equals(git(['show','dc7f537a83a7e832a0dfa0757d0b2700b909c053:'+n])))throw Error('Medicine differs from published master.');
  const files=names.map(n=>({path:n,bytes:buffers.get(n).length,sha256:hash(buffers.get(n)),gitBlob:git(['rev-parse',MEDICINE_COMMIT+':'+n]).toString().trim()}));
  if(process.argv.includes('--write')){
   if(fs.existsSync(path.join(root,MEDICINE_ROOT)))throw Error('Immutable medicine snapshot exists.');
   for(const [n,b]of buffers){const f=path.join(root,MEDICINE_ROOT,n);fs.mkdirSync(path.dirname(f),{recursive:true});fs.writeFileSync(f,b);}
   fs.writeFileSync(path.join(root,MEDICINE_ROOT,'provenance.json'),JSON.stringify({schemaVersion:1,repository:'https://github.com/Syntaxswine/tinderbox',commit:MEDICINE_COMMIT,files,adaptations:'None in vendor. Runtime normalizes CRLF, redirects two imports and selects only the unchanged PALETTE constant, excluding unused DOM texture-generation code.',rightsStatus:'Original SVG, contours, notices and provenance retained. No blanket license grant is added.'},null,2)+'\n');
   for(const [n,text]of Object.entries(outputs(n=>buffers.get(n))))fs.writeFileSync(path.join(root,'packages/tinderbox-art/native',n),text);
  }
  console.log(JSON.stringify({commit:MEDICINE_COMMIT,files:files.length,bytes:files.reduce((n,f)=>n+f.bytes,0),written:process.argv.includes('--write')}));
 }
}
