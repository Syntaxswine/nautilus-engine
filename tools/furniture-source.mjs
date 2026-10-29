// Fixed, read-only Git-object import. Never reads or changes donor worktree files.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';

export const PIN='fb6e20aa6e7d0cfe8793b4b7f693552d69a3a18b';
export const SOURCE_ROOT='vendor/farmyard-furniture/'+PIN;
const prefix='sites/tactical-animal/',art=prefix+'dist/art/library/',aft=prefix+'dist/aft/';
const engineAft='vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/';
export const SOURCE_FILES=[
  ...['catalog.js','catalog.json','furniture.js','book-spines.svg'].map(name=>art+name),
  aft+'tactics/painted-environment-scene.js',aft+'tactics/painted-furniture.js',
  ...['material-atlas-v2.png','cargo-materials-v1.png'].map(name=>aft+'assets/environment/painted-study/'+name),
  aft+'tactics/vendor/THREE-LICENSE.txt',prefix+'tests/library-furniture.test.mjs',
  'docs/art/library/README.md','docs/art/library/review.json'
].sort();
const hash=data=>createHash('sha256').update(data).digest('hex');
const normalized=data=>hash(Buffer.from(data.toString('utf8').replaceAll('\r\n','\n')));
const root=fileURLToPath(new URL('../',import.meta.url));

export function furnitureAdapterSources(directory=root) {
  const original=fs.readFileSync(path.join(directory,SOURCE_ROOT,art+'furniture.js'),'utf8').replaceAll('\r\n','\n');
  const helper=fs.readFileSync(path.join(directory,SOURCE_ROOT,aft+'tactics/painted-environment-scene.js'),'utf8').replaceAll('\r\n','\n');
  const start=original.indexOf('export function createLibraryFurniture('),end=helper.indexOf('export function createPaintedEnvironment('),soft=helper.indexOf('export function softBox(');
  if(start<0||soft<0||end<soft)throw Error('Reviewed furniture factory/helper boundaries changed.');
  const header='// Engine adapter of Farmyard '+PIN+'. Original bytes and rights are in '+SOURCE_ROOT+'/provenance.json.\n';
  const factory=original.slice(start).replace('createLibraryFurniture({','createFurnitureFactory(T,{').replace('softBox(1,1,1','softBox(T,1,1,1').replaceAll('map.needsUpdate=true;','map.colorSpace=T.SRGBColorSpace;map.anisotropy=4;map.needsUpdate=true;');
  return {
    'packages/furniture-core/factory.js':header+`import {FORMS,SKINS,BOOK_SKIN_ATLAS,specification} from '../../${SOURCE_ROOT}/${art}catalog.js';\nimport {softBox} from './soft-box.js';\n\n`+factory,
    'packages/furniture-core/soft-box.js':header+helper.slice(soft,end).trimEnd().replace('softBox(w,h,d','softBox(THREE,w,h,d')+'\n'
  };
}

export function checkFurnitureSource(directory,sources,tracked) {
  const pin=sources.farmyardFurniture;
  if(pin?.commit!==PIN||pin.root!==SOURCE_ROOT)throw Error('Furniture requires its reviewed fixed source pin.');
  const manifestPath=SOURCE_ROOT+'/provenance.json',manifest=JSON.parse(fs.readFileSync(path.join(directory,manifestPath)));
  const trackedFile=name=>{if(tracked&&!tracked.has(name))throw Error('Untracked furniture source/dependency: '+name);};
  trackedFile(manifestPath);
  if(manifest.commit!==PIN||manifest.repository!==pin.repository||JSON.stringify(manifest.files.map(file=>file.path))!==JSON.stringify(SOURCE_FILES))throw Error('Furniture source manifest/inventory changed.');
  for(const entry of manifest.files){
    const name=SOURCE_ROOT+'/'+entry.path;trackedFile(name);const bytes=fs.readFileSync(path.join(directory,name));
    if(bytes.length!==entry.bytes||hash(bytes)!==entry.sha256)throw Error('Furniture source bytes changed: '+entry.path);
    if(tracked){const indexed=execFileSync('git',['-C',directory,'show',':'+name],{windowsHide:true,maxBuffer:8*1024*1024});if(hash(indexed)!==entry.sha256)throw Error('Git would alter furniture source bytes: '+entry.path);}
  }
  for(const binding of manifest.sharedDependencies){
    trackedFile(binding.enginePath);const bytes=fs.readFileSync(path.join(directory,binding.enginePath));
    if(hash(bytes)!==binding.engineSha256||normalized(bytes)!==binding.normalizedLfSha256)throw Error('Furniture shared dependency drift: '+binding.enginePath);
  }
  for(const resource of manifest.runtimeResources){
    trackedFile(resource.enginePath);if(hash(fs.readFileSync(path.join(directory,resource.enginePath)))!==resource.sha256)throw Error('Furniture texture bytes changed: '+resource.key);
  }
  for(const [name,expected]of Object.entries(furnitureAdapterSources(directory))){trackedFile(name);if(fs.readFileSync(path.join(directory,name),'utf8')!==expected)throw Error('Furniture source adapter changed; review/regenerate it deliberately: '+name);}
  return {files:manifest.files.length,bytes:manifest.files.reduce((sum,file)=>sum+file.bytes,0)};
}

function snapshot(repo,write) {
  const git=args=>execFileSync('git',['-c','safe.directory='+path.resolve(repo).replaceAll('\\','/'),'-C',repo,...args],{windowsHide:true,maxBuffer:16*1024*1024});
  if(git(['rev-parse',PIN+'^{commit}']).toString().trim()!==PIN)throw Error('Reviewed furniture commit is unavailable.');
  const read=name=>git(['show',PIN+':'+name]);
  const records=SOURCE_FILES.map(name=>{const bytes=read(name);return {path:name,blob:git(['rev-parse',PIN+':'+name]).toString().trim(),bytes:bytes.length,sha256:hash(bytes),role:name.startsWith(art)&&!name.endsWith('furniture.js')?'catalogue-or-resource':'reference'};});
  const sharedDependencies=['three.module.js','three.core.js','THREE-LICENSE.txt'].map(name=>{
    const sourcePath=aft+'tactics/vendor/'+name,source=read(sourcePath),enginePath=engineAft+'tactics/vendor/'+name,engine=fs.readFileSync(path.join(root,enginePath));
    if(normalized(source)!==normalized(engine))throw Error('Source Three/notice differs from the reviewed engine host: '+name);
    return {sourcePath,sourceSha256:hash(source),enginePath,engineSha256:hash(engine),normalizedLfSha256:normalized(source),resolution:'Host supplies Three; original imports are reference only. Reuse existing notice, never load a second Three.'};
  });
  const runtimeResources=[['atlas','material-atlas-v2.png'],['cargo','cargo-materials-v1.png']].map(([key,name])=>{
    const sourcePath=aft+'assets/environment/painted-study/'+name,source=read(sourcePath),enginePath=engineAft+'assets/environment/painted-study/'+name;
    if(hash(source)!==hash(fs.readFileSync(path.join(root,enginePath))))throw Error('Existing engine paint differs from source: '+name);
    return {key,sourcePath,enginePath,sha256:hash(source)};
  });
  runtimeResources.push({key:'bookSkins',sourcePath:art+'book-spines.svg',enginePath:SOURCE_ROOT+'/'+art+'book-spines.svg',sha256:hash(read(art+'book-spines.svg'))});
  const manifest={schemaVersion:1,donor:'farmyard-furniture',repository:'https://github.com/Syntaxswine/farmyard-commando',commit:PIN,candidate:'FC-fb6e20a-library-furniture',reportCommit:'f67439c9f848042d1647ea428e494bca2749dc32',files:records,sharedDependencies,runtimeResources,
    referenceOnly:['furniture.js and painted-environment-scene.js retain original static Three imports but are never live renderer dependencies.','painted-furniture.js is design/provenance evidence, not a runtime dependency; its transitive mission closure is excluded.','Original tests/review are evidence, not a deployed gallery or software renderer.'],
    runtimeEntries:['packages/furniture-core/index.js','packages/furniture-core/three.js'],
    adaptations:'Vendor bytes unchanged. Separate generated factory/helper receive host Three; geometry/part recipes are retained. Cropped texture clones explicitly use source sRGB/anisotropy settings without changing borrowed atlases.',
    rightsStatus:'Inherited AFT art and new contribution have no declared blanket art license. Original source notices retained; provenance adds no license grant. Three has its separate MIT notice.'};
  if(write){const destination=path.join(root,SOURCE_ROOT);if(fs.existsSync(destination))throw Error('Immutable furniture snapshot already exists.');
    for(const name of SOURCE_FILES){const target=path.join(destination,name);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,read(name));}
    fs.writeFileSync(path.join(destination,'provenance.json'),JSON.stringify(manifest,null,2)+'\n');
    for(const [name,text]of Object.entries(furnitureAdapterSources())){const target=path.join(root,name);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,text);}
  }
  return {commit:PIN,files:records.length,bytes:records.reduce((sum,file)=>sum+file.bytes,0),written:write};
}
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url){
  const option=process.argv.indexOf('--repo');if(option<0)throw Error('Use --repo <read-only Farmyard checkout> [--write]; the full reviewed pin is fixed in this importer.');
  console.log(JSON.stringify(snapshot(process.argv[option+1],process.argv.includes('--write'))));
}
