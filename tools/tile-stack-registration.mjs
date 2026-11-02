// One explicit optional registration allowance; private C2 remains unregistered.
// All I/O/closure ports belong to the calling source fence. Importing is inert.
import assert from 'node:assert/strict';
import path from 'node:path';
import {createHash} from 'node:crypto';

export const TILE_STACK_REGISTRATION_BASE='32101fa97a8706296dcba4d9614d9d663d53a6dd';
export const TILE_STACK_REGISTRATION_ENTRIES=Object.freeze({
  './tiles/stack':'./packages/tile-stack-core/index.js',
  './tiles/finishes':'./packages/tile-finishes/catalogue.js',
  './tiles/finishes/three':'./packages/tile-finishes/finishes.js'
});
export const TILE_STACK_REGISTRATION_SUPPORT=Object.freeze([
  'packages/tile-stack-core/README.md','packages/tile-stack-core/api.d.ts','packages/tile-stack-core/source.json',
  'packages/tile-finishes/README.md','packages/tile-finishes/source.json','docs/stacked-tiles.md'
]);
export const TILE_STACK_DISTRIBUTION_LINES=Object.freeze([
  "  if(profile==='core'||profile==='compatibility')extras.push('packages/tile-stack-core/README.md','packages/tile-stack-core/api.d.ts','packages/tile-stack-core/source.json');",
  "  if(profile!=='assets')extras.push('packages/tile-finishes/README.md','packages/tile-finishes/source.json','docs/stacked-tiles.md');"
]);
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const registrationPath=file=>file.startsWith('packages/tile-stack-core/')||file.startsWith('packages/tile-finishes/');
const relative=file=>typeof file==='string'&&file&&!path.posix.isAbsolute(file)&&!file.includes('\\')&&!file.includes('%')&&!/[\x00-\x1f\x7f?#]/.test(file)&&path.posix.normalize(file)===file&&!file.split('/').some(part=>!part||part==='.'||part==='..');

export function withoutTileStackRegistration(exports){
  assert.ok(exports&&typeof exports==='object'&&!Array.isArray(exports),'Use an explicit package export map.');
  const prior={...exports};
  for(const [entry,target]of Object.entries(TILE_STACK_REGISTRATION_ENTRIES)){
    assert.equal(prior[entry],target,'Missing or changed optional tile-stack/finish export: '+entry);
    delete prior[entry];
  }
  return prior;
}

export function tileStackDistributionBytes(original){
  assert.ok(Buffer.isBuffer(original),'Supply the immutable distribution Git bytes.');
  const text=original.toString('utf8'),marker='  const files = [...new Set(';
  assert.ok(Buffer.from(text,'utf8').equals(original),'Distribution baseline must be exact UTF-8.');
  assert.equal(text.split(marker).length,2,'The distribution insertion point must occur exactly once.');
  return Buffer.from(text.replace(marker,TILE_STACK_DISTRIBUTION_LINES.join('\n')+'\n'+marker),'utf8');
}

export function checkTileStackRegistration({object,read,indexed=()=>{},moduleClosure,distribution}){
  const baseBytes=object(TILE_STACK_REGISTRATION_BASE,'package.json'),base=JSON.parse(baseBytes),packageBytes=read('package.json'),pkg=JSON.parse(packageBytes);
  for(const entry of Object.keys(TILE_STACK_REGISTRATION_ENTRIES))assert.equal(Object.hasOwn(base.exports,entry),false,'Reviewed registration was already in the frozen baseline.');
  assert.deepEqual(withoutTileStackRegistration(pkg.exports),base.exports,'Optional registration may add only the three reviewed entries.');
  for(const key of ['name','version','private','type'])assert.deepEqual(pkg[key],base[key],'Optional registration changes package '+key);
  indexed('package.json',packageBytes);
  const originalDistribution=object(TILE_STACK_REGISTRATION_BASE,'tools/distribution.mjs'),expectedDistribution=tileStackDistributionBytes(originalDistribution),actualDistribution=read('tools/distribution.mjs');
  assert.ok(actualDistribution.equals(expectedDistribution),'Distribution must equal the fixed baseline plus the two literal support lines.');
  indexed('tools/distribution.mjs',expectedDistribution);
  const preservedMetadata=['upstream.json','packages/map-core/contract-manifest.js','packages/map-core/capabilities.js'].map(file=>{
    const expected=object(TILE_STACK_REGISTRATION_BASE,file);assert.ok(read(file).equals(expected),'Optional registration changes donor pins/schema/capability metadata: '+file);indexed(file,expected);return {file,bytes:expected.length,sha256:sha(expected)};
  });
  const oldFiles=new Set(base.files);assert.equal(oldFiles.size,base.files.length);
  const closure=targets=>{
    const files=targets.length?moduleClosure(targets):[];
    assert.equal(new Set(files).size,files.length,'Duplicate optional registration dependency.');
    for(const file of files){assert.ok(relative(file),'Unsafe optional dependency: '+file);assert.ok(oldFiles.has(file)||registrationPath(file),'Optional registration imports nonpublic/private source: '+file);}
    for(const target of targets)assert.ok(files.includes(target.replace(/^\.\//,'')),'Optional entry absent from its closure: '+target);
    return [...files].sort();
  };
  const entries=Object.entries(TILE_STACK_REGISTRATION_ENTRIES),all=closure(entries.map(([,target])=>target));
  const expectedFiles=[...new Set([...base.files,...all,...TILE_STACK_REGISTRATION_SUPPORT])].sort();
  assert.deepEqual(pkg.files,expectedFiles,'Root whitelist may grow only by the reviewed optional closure and six named support files.');
  const addedFiles=expectedFiles.filter(file=>!oldFiles.has(file));
  const registeredFiles=addedFiles.map(file=>{const bytes=read(file);indexed(file,bytes);return {file,bytes:bytes.length,sha256:sha(bytes)};});
  const profiles={};
  for(const profile of ['core','renderer','assets','compatibility']){
    const selected=entries.filter(([entry])=>profile==='compatibility'||profile==='core'&&!entry.endsWith('/three')||profile==='renderer'&&entry.endsWith('/three'));
    const wanted=closure(selected.map(([,target])=>target));
    const support=profile==='assets'?[]:profile==='renderer'?TILE_STACK_REGISTRATION_SUPPORT.slice(3):TILE_STACK_REGISTRATION_SUPPORT;
    const plan=distribution(profile);
    for(const [entry,target]of entries)assert.equal(plan.exports[entry],selected.some(([key])=>key===entry)?target:undefined,profile+' optional export '+entry);
    const wantedNew=[...new Set([...wanted,...support].filter(file=>!oldFiles.has(file)))].sort();
    const actualNew=plan.files.filter(file=>registrationPath(file)||file==='docs/stacked-tiles.md').sort();
    assert.deepEqual(actualNew,wantedNew,profile+' exact optional runtime/support files');
    for(const file of wanted)assert.ok(plan.files.includes(file),profile+' optional dependency '+file);
    profiles[profile]={entries:Object.fromEntries(selected),registrationFiles:wantedNew};
  }
  assert.deepEqual(pkg.files,distribution().files,'Root whitelist must match the exact registered distribution.');
  return {
    registered:true,scope:'Separate optional v1 stack planner/finish registration; private C2 is not adopted.',base:TILE_STACK_REGISTRATION_BASE,
    entries:{...TILE_STACK_REGISTRATION_ENTRIES},support:[...TILE_STACK_REGISTRATION_SUPPORT],runtimeClosure:all,preservedMetadata,
    priorExportsUnchanged:true,publicExportsChanged:true,publicWhitelistChanged:true,addedFiles,registeredFiles,removedFiles:[],
    distributionAdaptation:{path:'tools/distribution.mjs',base:TILE_STACK_REGISTRATION_BASE,baseSha256:sha(originalDistribution),sha256:sha(expectedDistribution),insertedLines:[...TILE_STACK_DISTRIBUTION_LINES]},
    profiles,c2aRegistered:false,newSchemaOrCapability:false,pinsChanged:false,versionChanged:false
  };
}
