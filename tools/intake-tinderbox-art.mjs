// Bounded Git-object intake. Donor working files and refs are never changed.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
export const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export const SOURCE_COMMIT='e261e7c749a4957470195b993a53051cae15416f';
export const SOURCE_ROOT='vendor/tinderbox-art/'+SOURCE_COMMIT;
const nativeRoot='packages/tinderbox-art/native/';
const mapping={
 'assets/art/exposition-new-york/forms.js':'forms.js',
 ...Object.fromEntries(['catalogue','prop-metrics','props','tank-state','plans','engine'].map(n=>['assets/art/landmark-interiors/'+n+'.js',n+'.js'])),
 'assets/art/landmark-interiors/index.js':'interiors.js',
 'assets/art/horticulture-waterfront/index.js':'waterfront.js'
};
const wall='vendor/nautilus-engine/90054d07134116a5d9661f8318a76fe68f922aad/packages/map-core/wall-runs.js';
const evidence=['assets/art/landmark-interiors/manifest.json','assets/art/landmark-interiors/nautilus-assembly.json',
 'assets/art/horticulture-waterfront/manifest.json','assets/art/horticulture-waterfront/kit.json',
 'art/source/landmark-interiors/sources.json','art/source/landmark-interiors/evidence/derivatives.json',
 'art/source/horticulture-waterfront/sources.json','docs/art/landmark-interiors/README.md',
 'docs/art/horticulture-waterfront/handoff.md'];
const sha=b=>createHash('sha256').update(b).digest('hex');
function adapted(name,buffer){
 let text=buffer.toString('utf8').replaceAll('\r\n','\n');
 const rewrites={"'../exposition-new-york/forms.js'":"'./forms.js'","'./index.js'":"'./interiors.js'",
  ["'../../../"+wall+"'"]:"'../../map-core/wall-runs.js'"};
 for(const [a,b] of Object.entries(rewrites))text=text.replaceAll(a,b);
 return Buffer.from(text);
}
export function verifyTinderboxArt({tracked=false}={}){
 const pin=JSON.parse(fs.readFileSync(path.join(root,'upstream.json'))).tinderboxArt;
 if(pin?.commit!==SOURCE_COMMIT||pin.root!==SOURCE_ROOT)throw Error('Tinderbox art upstream declaration differs from the reviewed pin.');
 const manifest=JSON.parse(fs.readFileSync(path.join(root,SOURCE_ROOT,'provenance.json')));
 if(manifest.commit!==SOURCE_COMMIT)throw Error('Tinderbox art source pin changed.');
 const index=tracked?new Set(execFileSync('git',['-c','safe.directory='+root.replaceAll('\\','/'),'-C',root,'ls-files','-z'],{encoding:'utf8'}).split('\0')):null;
 for(const entry of manifest.files){
  const file=SOURCE_ROOT+'/'+entry.path,b=fs.readFileSync(path.join(root,file));
  if(b.length!==entry.bytes||sha(b)!==entry.sha256||createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex')!==entry.gitBlob)throw Error('Changed Tinderbox source bytes: '+file);
  if(index&&!index.has(file))throw Error('Untracked Tinderbox source: '+file);
  if(index&&execFileSync('git',['-c','safe.directory='+root.replaceAll('\\','/'),'-C',root,'rev-parse',':'+file],{encoding:'utf8',windowsHide:true}).trim()!==entry.gitBlob)throw Error('Git index changed original Tinderbox bytes: '+file);
 }
 for(const [from,to]of Object.entries(mapping))if(!adapted(from,fs.readFileSync(path.join(root,SOURCE_ROOT,from))).equals(fs.readFileSync(path.join(root,nativeRoot,to))))throw Error('Unrecorded art adaptation: '+to);
 return {commit:SOURCE_COMMIT,files:manifest.files.length,bytes:manifest.files.reduce((n,f)=>n+f.bytes,0),adaptedModules:Object.keys(mapping).length};
}
export function intake(repo,{write=false}={}){
 const git=args=>execFileSync('git',['-c','safe.directory='+path.resolve(repo).replaceAll('\\','/'),'-C',repo,...args],{windowsHide:true,maxBuffer:16*1024*1024});
 if(git(['rev-parse',SOURCE_COMMIT+'^{commit}']).toString().trim()!==SOURCE_COMMIT)throw Error('Missing fixed source commit.');
 const names=[...new Set([...Object.keys(mapping),wall,...evidence,...git(['ls-tree','--name-only',SOURCE_COMMIT]).toString().trim().split('\n').filter(n=>/^(?:license|notice|copying)(?:\.|$)/i.test(n))])].sort();
 const buffers=new Map(names.map(n=>[n,git(['show',SOURCE_COMMIT+':'+n])]));
 // Exact published-master equivalence for the smaller waterfront kit.
 const stable='dc7f537a83a7e832a0dfa0757d0b2700b909c053';
 for(const n of ['assets/art/horticulture-waterfront/index.js','assets/art/exposition-new-york/forms.js',wall])if(!buffers.get(n).equals(git(['show',stable+':'+n])))throw Error('Waterfront differs from the inspected published integration: '+n);
 const files=names.map(n=>({path:n,bytes:buffers.get(n).length,sha256:sha(buffers.get(n)),gitBlob:git(['rev-parse',SOURCE_COMMIT+':'+n]).toString().trim()}));
 const provenance={schemaVersion:1,repository:'https://github.com/Syntaxswine/tinderbox',commit:SOURCE_COMMIT,
  sourceStatus:'Published fixed artist candidate, deliberately reviewed for this optional visual intake; not donor master or production gameplay acceptance.',
  publishedMasterComparison:stable,files,
  adaptations:'Original vendor bytes unchanged. Nine runtime copies normalize CRLF to LF and redirect only forms/engine imports. Existing Nautilus wall compiler replaces the returning donor copy.',
  rightsStatus:'Retain embedded notices and the historical source registers. No blanket donor license was found; provenance is not a new license grant. No research pixels enter runtime.'};
 if(write){
  if(fs.existsSync(path.join(root,SOURCE_ROOT)))throw Error('Immutable snapshot exists.');
  for(const [name,b]of buffers){const p=path.join(root,SOURCE_ROOT,name);fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,b);}
  fs.writeFileSync(path.join(root,SOURCE_ROOT,'provenance.json'),JSON.stringify(provenance,null,2)+'\n');
  fs.mkdirSync(path.join(root,nativeRoot),{recursive:true});
  for(const [from,to]of Object.entries(mapping))fs.writeFileSync(path.join(root,nativeRoot,to),adapted(from,buffers.get(from)));
 }
 return {commit:SOURCE_COMMIT,files:files.length,bytes:files.reduce((n,f)=>n+f.bytes,0),written:write};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const i=process.argv.indexOf('--repo');console.log(JSON.stringify(i>=0?intake(process.argv[i+1],{write:process.argv.includes('--write')}):verifyTinderboxArt({tracked:process.argv.includes('--tracked')})));
}
