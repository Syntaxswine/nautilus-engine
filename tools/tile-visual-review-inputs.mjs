// Draft for tools/tile-visual-review-inputs.mjs after Root registration.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {root,moduleClosure,distribution} from './distribution.mjs';
import {checkTileVisualsSource} from './check-tile-visuals-source.mjs';

export const TILE_VISUAL_BINDINGS=[
  {specifier:'@nautilus-engine/core/tiles',profile:'core',entry:'./tiles',file:'packages/tiles-core/index.js'},
  {specifier:'@nautilus-engine/core/tiles/art',profile:'core',entry:'./tiles/art',file:'packages/tile-visuals/prepare.js'},
  {specifier:'@nautilus-engine/core/tiles/art/example',profile:'core',entry:'./tiles/art/example',file:'packages/tile-visuals/example.js'},
  {specifier:'@nautilus-engine/renderer/tiles/art/three',profile:'renderer',entry:'./tiles/art/three',file:'packages/tile-visuals/three.js'},
  {specifier:'@nautilus-engine/renderer/render-effects/three',profile:'renderer',entry:'./render-effects/three',file:'packages/render-effects/three.js'}
];
export const TILE_VISUAL_EXAMPLES=['canonical-tile-art.html','canonical-tile-art.js'];
export const TILE_VISUAL_RUNTIME=['cleanup.js','data.js','example.js','mesh.js','prepare.js','three.js'].map(name=>'packages/tile-visuals/'+name);
export const TILE_VISUAL_SUPPORT=['README.md','NOTICE.md','source.json'].map(name=>'packages/tile-visuals/'+name);
export const TILE_VISUAL_ATLAS='assets/buildings/painted-materials-v2.png';
export const TILE_VISUAL_CAPTURES=['yard','fields','seam','holes','material-shared','material-faces','fields-detail-0','fields-detail-2','seam-boundaries','phone'];
export const TILE_VISUAL_CHECKS=['yard','fields','seam','holes','material-shared','material-faces','fields-detail-0','fields-detail-2','seam-boundaries','canonical-reopen','chunk-removal','held-controls','phone','retirement'];
export const tileVisualSha=bytes=>createHash('sha256').update(bytes).digest('hex');
export const tileVisualJSONHash=value=>tileVisualSha(JSON.stringify(value));
export const slash=value=>value.replaceAll('\\','/');
export function tileVisualRegularFile(project,file){
  assert.equal(typeof file,'string');assert.ok(file&&!file.startsWith('/')&&!file.includes('\\')&&path.posix.normalize(file)===file&&!file.split('/').some(part=>!part||part==='.'||part==='..'),'Unsafe tile proof path: '+file);
  let target=project;for(const part of file.split('/')){target=path.join(target,part);assert.equal(fs.lstatSync(target).isSymbolicLink(),false,'Symlink tile proof file: '+file);}assert.equal(fs.statSync(target).isFile(),true);return fs.readFileSync(target);
}
// Decode once from the same frozen, hash-verified PNG used by the proof.
// Atlas tile cropping can use fractional source pixels; no grid divisibility
// assumption belongs at this image boundary.
let frozenAtlasPNG=null;
export function tileVisualAtlasDimensions(){
  if(frozenAtlasPNG)return frozenAtlasPNG;
  const expected=JSON.parse(tileVisualRegularFile(root,'packages/tile-visuals/source.json')).atlas;
  assert.equal(expected.path,TILE_VISUAL_ATLAS);assert.ok(Number.isSafeInteger(expected.bytes)&&expected.bytes>0);assert.match(expected.sha256,/^[a-f0-9]{64}$/);
  const bytes=tileVisualRegularFile(root,TILE_VISUAL_ATLAS);
  assert.equal(bytes.length,expected.bytes,'Atlas PNG size differs from its frozen source.');assert.equal(tileVisualSha(bytes),expected.sha256,'Atlas PNG bytes differ from its frozen source.');
  assert.ok(bytes.length>=33,'Atlas PNG is missing its complete IHDR.');
  assert.ok(bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])),'Atlas must have the PNG signature.');
  assert.equal(bytes.readUInt32BE(8),13,'Atlas must start with the PNG IHDR.');assert.equal(bytes.subarray(12,16).toString('ascii'),'IHDR');
  const width=bytes.readUInt32BE(16),height=bytes.readUInt32BE(20);
  assert.ok(width>0&&width<=0x7fffffff&&height>0&&height<=0x7fffffff,'Atlas PNG dimensions must be positive PNG dimensions.');
  frozenAtlasPNG=Object.freeze({width,height,bytes:bytes.length,sha256:expected.sha256});return frozenAtlasPNG;
}
export function tileVisualReviewInputs(){
  const checked=checkTileVisualsSource(root);assert.equal(checked.registered,true,'Tile art public registration is required.');
  assert.deepEqual(checked.runtime.map(record=>record.path).sort(),[...TILE_VISUAL_RUNTIME].sort());
  assert.deepEqual([...checked.packageSupport].sort(),[...TILE_VISUAL_SUPPORT].sort());
  assert.equal(checked.atlas.path,TILE_VISUAL_ATLAS);assert.ok(Number.isSafeInteger(checked.atlas.bytes)&&checked.atlas.bytes>0);assert.match(checked.atlas.sha256,/^[a-f0-9]{64}$/);
  const pkg=JSON.parse(tileVisualRegularFile(root,'package.json')),profiles=Object.fromEntries(['core','renderer'].map(profile=>[profile,distribution(profile)]));
  const bindings=TILE_VISUAL_BINDINGS.map(binding=>{assert.equal(pkg.exports[binding.entry],'./'+binding.file);assert.equal(profiles[binding.profile].exports[binding.entry],'./'+binding.file);return {...binding,package:profiles[binding.profile].name};});
  const byProfile=Object.fromEntries(['core','renderer'].map(profile=>[profile,[...new Set(bindings.filter(binding=>binding.profile===profile).flatMap(binding=>moduleClosure([binding.file])))].sort()]));
  const browserFiles=[...new Set([...Object.values(byProfile).flat(),...TILE_VISUAL_EXAMPLES.map(name=>'examples/'+name),TILE_VISUAL_ATLAS])].sort();
  const names=[...new Set([...browserFiles,...TILE_VISUAL_SUPPORT,'NOTICE.md','upstream.json','tools/art-review-browser.mjs','tools/check-tile-visuals-source.mjs','tools/tile-visual-review-inputs.mjs','tools/review-tile-visuals.mjs','tools/verify-tile-visual-browser-parity.mjs'])].sort();
  const files=names.map(file=>{const bytes=tileVisualRegularFile(root,file);return {file,bytes:bytes.length,sha256:tileVisualSha(bytes)};});
  const atlas=files.find(record=>record.file===TILE_VISUAL_ATLAS);assert.equal(atlas.bytes,checked.atlas.bytes);assert.equal(atlas.sha256,checked.atlas.sha256,'Painted atlas differs from the frozen source.');
  const dimensions=tileVisualAtlasDimensions();assert.equal(dimensions.bytes,atlas.bytes);assert.equal(dimensions.sha256,atlas.sha256,'Cached atlas dimensions must bind the current fingerprint.');
  const manifest={name:pkg.name,version:pkg.version,exports:pkg.exports,profiles:Object.fromEntries(Object.entries(profiles).map(([profile,plan])=>[profile,{name:plan.name,exports:plan.exports}]))};
  const data={version:1,acceptedProvider:'ca285aa76a49b74df6067caab661d7bed39bd523',integrationBase:'3e583378bee99dc8e275f1b97591af9a0406ca04',bindings,manifest,files,atlas,atlasDimensions:{width:dimensions.width,height:dimensions.height}};
  return {...data,inputSha256:tileVisualJSONHash(data),browserFiles,byProfile};
}
export function tileVisualPlayerHTML(html,bindings){
  const maps=[...html.matchAll(/<script\s+type=["']importmap["']\s*>([\s\S]*?)<\/script>/g)];assert.equal(maps.length,1,'Expected one source tile import map.');
  const old=JSON.parse(maps[0][1]);assert.deepEqual(Object.keys(old.imports).sort(),bindings.map(binding=>binding.specifier).sort());
  for(const binding of bindings)assert.equal(old.imports[binding.specifier],'../'+binding.file,'Unexpected source tile import-map target.');
  const imports=Object.fromEntries(bindings.map(binding=>[binding.specifier,'../node_modules/'+binding.package+'/'+binding.file]));
  const links=[...html.matchAll(/<link\b(?=[^>]*\bid=["']tile-art-atlas["'])[^>]*>/g)];assert.equal(links.length,1,'Expected one explicit painted atlas URL.');
  const href=/\bhref=["']([^"']+)["']/.exec(links[0][0]);assert.ok(href);assert.equal(href[1],'../'+TILE_VISUAL_ATLAS);
  return html.replace(maps[0][0],'<script type="importmap">'+JSON.stringify({imports})+'</script>').replace(links[0][0],links[0][0].replace(href[0],'href="../node_modules/@nautilus-engine/renderer/'+TILE_VISUAL_ATLAS+'"'));
}
export function tileVisualInstalledPolicy(prefix){
  assert.match(prefix,/^\/artifacts\/tile-visuals-installed-browser-[A-Za-z0-9]{6}\/$/);
  return {prefix,playerFiles:TILE_VISUAL_EXAMPLES.map(name=>prefix+'player/'+name),packagePrefixes:['core','renderer'].map(profile=>prefix+'node_modules/@nautilus-engine/'+profile+'/'),atlasPath:prefix+'node_modules/@nautilus-engine/renderer/'+TILE_VISUAL_ATLAS};
}
export function tileVisualInstalledRequestAllowed(request,prefix){
  const policy=tileVisualInstalledPolicy(prefix),name=request.path;
  if(request.method!=='GET'||request.search||typeof name!=='string'||name.includes('%')||name.includes('\\')||path.posix.normalize(name)!==name)return false;
  return policy.playerFiles.includes(name)||policy.packagePrefixes.some(base=>name.startsWith(base));
}
export function assertTileVisualSnapshot(value,{retired=false}={}){
  assert.equal(value.version,1);assert.equal(value.authority,'canonical-bundle-only');assert.equal(typeof value.bundleJSON,'string');const bundle=JSON.parse(value.bundleJSON);assert.equal(bundle.kind,'nautilus-tile-bundle');assert.equal(bundle.version,1);
  assert.equal(value.sourcePreserved,true);assert.equal(value.atlas.resource,TILE_VISUAL_ATLAS);const dimensions=tileVisualAtlasDimensions();assert.equal(value.atlas.width,dimensions.width,'Browser atlas width differs from the frozen PNG header.');assert.equal(value.atlas.height,dimensions.height,'Browser atlas height differs from the frozen PNG header.');
  for(const key of ['query','support','navigation','fire'])assert.equal(value.statuses.gameplay[key],'unbound','A surface cannot advertise '+key+' readiness.');
  assert.equal(value.statuses.presentation.provider,'nautilus.native-tile-surfaces','Use the Root-registered metadata identity.');
  assert.equal(value.policy,'canonical-surface-v1-cuts16-interior8-16-32');
  assert.ok(Array.isArray(value.interfaces)&&Array.isArray(value.renderedInstances));
  assert.equal(value.resources.hostPool.length,13,'Keep all three host maps and ten borrowed materials in the resource proof.');
  assert.deepEqual(value.resources.hostPool.map(record=>record.index),Array.from({length:13},(_,index)=>index));
  assert.equal(value.resources.hostPool.filter(record=>record.type==='texture').length,3);assert.equal(value.resources.hostPool.filter(record=>record.type==='material').length,10);
  assert.equal(value.resources.hostPool.every(record=>record.disposals===(retired?1:0)),true,'Borrowed resources disposed early or host disposal repeated.');
  assert.equal(value.resources.atlasDisposals,retired?1:0);
  assert.equal(value.provider.disposed,retired);
  if(retired){for(const key of ['instances','interfaces','ownedGeometry','triangles','quantizationLimitedRefinements'])assert.equal(value.provider[key],0);assert.deepEqual(value.interfaces,[]);assert.deepEqual(value.renderedInstances,[]);assert.equal(value.boundaryLines,0);assert.equal(value.resources.renderer.geometries,0);assert.equal(value.resources.renderer.textures,0);}
  else{assert.ok(value.provider.instances>0);assert.equal(value.provider.instances,value.renderedInstances.length);assert.ok(value.provider.ownedGeometry>0);assert.ok(value.provider.triangles>0);assert.ok(value.draw.calls>0);assert.equal(value.provider.interfaces,value.interfaces.length);assert.equal(value.boundaryLines,value.controls.boundaries?value.interfaces.length:0,'Boundary toggle changed intent without updating the actual lines.');}
  return value;
}
