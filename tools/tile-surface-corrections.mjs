// One reviewed correction to a generated angle; authored data stays unchanged.
// Immutable Git-object reads belong to the caller. Importing is inert.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';

export const TILE_SURFACE_CORRECTION_SOURCE='93a94778779b800227f3886b1ca63fae1abc2543';
export const TILE_SURFACE_CORRECTION_BASE='2502646482218524fd5129641da769bb82462e4d';
export const TILE_SURFACE_PREPARE_PATH='packages/tile-visuals/prepare.js';
export const TILE_SURFACE_METADATA_PATH='packages/tile-visuals/source.json';
const directory='candidates/tile-stack/core/line-d4-provider-patch/';
const preimageSha256='eaaee23e079ed9e0d0f91454b1ffcbe732f053f6f44cc63ef612db15dd7e287e';
const patchedSha256='fb6ec8359a1ca2c3bfd739861cb7734d70f65a7ec5fe57375c357c536998d7e3';
const metadataSha256='a8bf1320dc270a9021bfcf495cfb6370ec1484b738cf00d4c1c4154ce6f78831';
const from='radius:r,startRad:start,sweepRad:sweep';
const to='radius:r,startRad:Object.is(start,-0)?0:start,sweepRad:sweep';
const correction=Object.freeze({
  path:TILE_SURFACE_PREPARE_PATH,
  sourceCommit:TILE_SURFACE_CORRECTION_SOURCE,
  integrationBase:TILE_SURFACE_CORRECTION_BASE,
  manifest:Object.freeze({path:directory+'manifest.json',sha256:'99345464175cd8955add7b2e727f31657e8b72c9dcb9389dbc23b38ca2f5af9d'}),
  patch:Object.freeze({path:directory+'derived-start-zero.patch',sha256:'c7eac2b728479132a4badd9ab2fc819fead29530e6fe2dee07f862289cbe6173'}),
  originalSha256:preimageSha256,
  patchedSha256,
  from,to,occurrences:1,
  scope:'Canonicalize only a generated offset-arc startRad; authored data, validators, meshes and schemas remain unchanged.'
});
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const row=(file,bytes)=>({path:file,bytes:bytes.length,sha256:sha(bytes),gitBlob:createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex')});
const text=bytes=>{assert.ok(Buffer.isBuffer(bytes),'Supply exact Git-object bytes.');const value=bytes.toString('utf8');assert.ok(Buffer.from(value,'utf8').equals(bytes),'Reviewed source must be exact UTF-8.');return value;};

// Returns exact expected current bytes, never mutates source or applies a patch
// to disk. The public metadata change is derived from the fixed registered base.
export function tileSurfaceCorrection({object}){
  assert.equal(typeof object,'function','Supply an immutable Git-object reader.');
  const exact=(commit,file,digest)=>{const bytes=object(commit,file);assert.ok(Buffer.isBuffer(bytes));assert.equal(sha(bytes),digest,'Reviewed correction object changed: '+file);return bytes;};
  const manifest=JSON.parse(text(exact(TILE_SURFACE_CORRECTION_SOURCE,correction.manifest.path,correction.manifest.sha256)));
  const patch=text(exact(TILE_SURFACE_CORRECTION_SOURCE,correction.patch.path,correction.patch.sha256));
  const preimage=exact(TILE_SURFACE_CORRECTION_SOURCE,directory+'prepare.baseline.js.txt',preimageSha256);
  const original=exact(TILE_SURFACE_CORRECTION_BASE,TILE_SURFACE_PREPARE_PATH,preimageSha256);
  assert.ok(preimage.equals(original),'The reviewed patch must start from the registered public provider.');
  for(const [key,value]of Object.entries({kind:'nautilus-private-provider-patch-proof',version:1,runtimeBaseCommit:TILE_SURFACE_CORRECTION_BASE,targetFile:TILE_SURFACE_PREPARE_PATH,sourcePreimageFile:'prepare.baseline.js.txt',patchFile:'derived-start-zero.patch',patchSha256:correction.patch.sha256,originalSha256:preimageSha256,patchedSha256}))assert.equal(manifest[key],value,'Reviewed patch manifest '+key);
  assert.deepEqual(manifest.files.filter(file=>file.path===TILE_SURFACE_PREPARE_PATH),[{path:TILE_SURFACE_PREPARE_PATH,bytes:original.length,sha256:preimageSha256}]);
  const removed=patch.split('\n').filter(line=>line.startsWith('-')&&!line.startsWith('---')).map(line=>line.slice(1));
  const added=patch.split('\n').filter(line=>line.startsWith('+')&&!line.startsWith('+++')).map(line=>line.slice(1));
  assert.equal(removed.length,1);assert.equal(added.length,1);
  const source=text(original);assert.equal(source.split(from).length-1,1,'Generated-angle correction must occur exactly once.');
  assert.equal(source.split('\n').filter(line=>line===removed[0]).length,1,'Patch preimage line differs.');
  assert.equal(added[0],removed[0].replace(from,to),'Only the generated startRad expression may change.');
  const prepare=Buffer.from(source.replace(from,to),'utf8');assert.equal(sha(prepare),patchedSha256,'Correction postimage differs.');

  const originalMetadata=exact(TILE_SURFACE_CORRECTION_BASE,TILE_SURFACE_METADATA_PATH,metadataSha256);
  const metadata=JSON.parse(text(originalMetadata));assert.equal(JSON.stringify(metadata,null,2)+'\n',text(originalMetadata),'Preserve the registered metadata serialization.');
  assert.equal(Object.hasOwn(metadata,'runtimeCorrections'),false,'Correction is separate from historical registration metadata.');
  assert.deepEqual(metadata.runtime.filter(file=>file.path===TILE_SURFACE_PREPARE_PATH),[{path:TILE_SURFACE_PREPARE_PATH,bytes:original.length,sha256:preimageSha256}]);
  const next={};
  for(const [key,value]of Object.entries(metadata)){
    next[key]=key==='runtime'?value.map(file=>file.path===TILE_SURFACE_PREPARE_PATH?{path:file.path,bytes:prepare.length,sha256:patchedSha256}:file):value;
    if(key==='metadataAdaptations')next.runtimeCorrections=[correction];
  }
  assert.deepEqual(next.runtimeCorrections,[correction]);
  const metadataBytes=Buffer.from(JSON.stringify(next,null,2)+'\n','utf8');
  return {
    correction,
    overrides:{
      [TILE_SURFACE_PREPARE_PATH]:{original,expected:prepare,originalRow:row(TILE_SURFACE_PREPARE_PATH,original)},
      [TILE_SURFACE_METADATA_PATH]:{original:originalMetadata,expected:metadataBytes,originalRow:row(TILE_SURFACE_METADATA_PATH,originalMetadata)}
    },
    requiredGitCommits:[TILE_SURFACE_CORRECTION_SOURCE,TILE_SURFACE_CORRECTION_BASE]
  };
}
