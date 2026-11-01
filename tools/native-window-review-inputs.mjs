// Tools-only shared inputs for fresh native-window browser proofs.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {root,moduleClosure,distribution} from './distribution.mjs';

export const NATIVE_WINDOW_BINDINGS=[
  {specifier:'@nautilus-engine/core/windows',profile:'core',entry:'./windows',file:'packages/windows-core/index.js'},
  {specifier:'@nautilus-engine/core/adapters/farmyard/windows',profile:'core',entry:'./adapters/farmyard/windows',file:'packages/adapters/farmyard/windows.js'},
  {specifier:'@nautilus-engine/renderer/render-effects/three',profile:'renderer',entry:'./render-effects/three',file:'packages/render-effects/three.js'},
  {specifier:'@nautilus-engine/renderer/adapters/farmyard/windows/three',profile:'renderer',entry:'./adapters/farmyard/windows/three',file:'packages/native-window-presenter/three.js'}
];
export const NATIVE_WINDOW_EXAMPLES=['native-window-presenter.html','native-window-presenter.js','native-window-host.js','native-window-materials.js'];
export const NATIVE_WINDOW_RUNTIME=['cleanup.js','data.js','geometry.js','paint.js','prepare.js','three.js'].map(name=>'packages/native-window-presenter/'+name);
export const NATIVE_WINDOW_SUPPORT=[
  'packages/native-window-presenter/README.md','packages/native-window-presenter/NOTICE.md','packages/native-window-presenter/source.json',
  'vendor/farmyard-window-art/251bf8094b5f9ebe44208443084c1a6d6658512a/provenance.json',
  'vendor/farmyard-window-art/251bf8094b5f9ebe44208443084c1a6d6658512a/sites/tactical-animal/dist/aft/tactics/vendor/THREE-LICENSE.txt.original'
];
export const NATIVE_WINDOW_CAPTURES=['catalogue-desktop','skins-desktop','joins-desktop','borderless-desktop','clipping-desktop','clipping-back','broken-restored-desktop','borderless-back','clipping-phone','broken-restored-phone'];
export const NATIVE_WINDOW_CHECKS=['catalogue','skins','joins','borderless','clipping','clipping-back','acknowledged-break','durable-retry','quiet-live-restore','borderless-back','clipping-phone','phone-acknowledged-break','phone-quiet-restore'];
export const nativeWindowSha=bytes=>createHash('sha256').update(bytes).digest('hex');
export const nativeWindowJSONHash=value=>nativeWindowSha(JSON.stringify(value));
export const slash=value=>value.replaceAll('\\','/');
export function nativeWindowRegularFile(project,file){
  assert.equal(typeof file,'string');
  assert.ok(file&&!file.startsWith('/')&&!file.includes('\\')&&path.posix.normalize(file)===file&&!file.split('/').some(p=>!p||p==='.'||p==='..'),'Unsafe review path: '+file);
  let target=project;
  for(const part of file.split('/')){target=path.join(target,part);assert.equal(fs.lstatSync(target).isSymbolicLink(),false,'Symlink review input: '+file);}
  assert.equal(fs.statSync(target).isFile(),true,'Review input is not a regular file: '+file);
  return fs.readFileSync(target);
}
export function nativeWindowReviewInputs(){
  const pkg=JSON.parse(nativeWindowRegularFile(root,'package.json'));
  const profiles=Object.fromEntries(['core','renderer'].map(profile=>[profile,distribution(profile)]));
  const bindings=NATIVE_WINDOW_BINDINGS.map(binding=>{
    assert.equal(pkg.exports[binding.entry],'./'+binding.file,'Root public entry is absent: '+binding.entry);
    assert.equal(profiles[binding.profile].exports[binding.entry],'./'+binding.file,'Profile public entry is absent: '+binding.entry);
    return {...binding,package:profiles[binding.profile].name};
  });
  assert.deepEqual(moduleClosure(['packages/native-window-presenter/three.js']),[...NATIVE_WINDOW_RUNTIME].sort(),'Expected exactly six accepted native renderer modules.');
  const request=JSON.parse(nativeWindowRegularFile(root,'docs/reviews/native-window-presenter/registration-request.json'));
  assert.deepEqual([...request.explicitSupport].sort(),[...NATIVE_WINDOW_SUPPORT].sort(),'Expected exactly five native renderer support files.');
  const byProfile=Object.fromEntries(['core','renderer'].map(profile=>[profile,[...new Set(bindings.filter(b=>b.profile===profile).flatMap(b=>moduleClosure([b.file])))].sort()]));
  const browserFiles=[...new Set([...Object.values(byProfile).flat(),...NATIVE_WINDOW_EXAMPLES.map(name=>'examples/'+name)])].sort();
  const names=[...new Set([...browserFiles,...NATIVE_WINDOW_SUPPORT,'NOTICE.md','upstream.json','docs/reviews/native-window-presenter/registration-request.json',
    'tools/art-review-browser.mjs','tools/review-native-window-presenter.mjs','tools/native-window-review-inputs.mjs','tools/verify-native-window-browser-parity.mjs'])].sort();
  const files=names.map(file=>{const bytes=nativeWindowRegularFile(root,file);return {file,bytes:bytes.length,sha256:nativeWindowSha(bytes)};});
  const manifest={name:pkg.name,version:pkg.version,exports:pkg.exports,profiles:Object.fromEntries(Object.entries(profiles).map(([profile,p])=>[profile,{name:p.name,exports:p.exports}]))};
  const value={version:1,bindings,manifest,files};
  return {...value,inputSha256:nativeWindowJSONHash(value),browserFiles,byProfile};
}
export function nativeWindowInstalledPolicy(prefix){
  assert.match(prefix,/^\/artifacts\/native-window-presenter-installed-browser-[A-Za-z0-9]{6}\/$/,'Unexpected installed browser stage.');
  return {prefix,playerFiles:NATIVE_WINDOW_EXAMPLES.map(name=>prefix+'player/'+name),packagePrefixes:['core','renderer'].map(name=>prefix+'node_modules/@nautilus-engine/'+name+'/')};
}
export function nativeWindowInstalledRequestAllowed(request,prefix){
  const policy=nativeWindowInstalledPolicy(prefix),name=request.path;
  if(request.method!=='GET'||typeof name!=='string'||name.includes('%')||name.includes('\\')||path.posix.normalize(name)!==name)return false;
  if(request.search&&!(name===prefix+'player/native-window-presenter.html'&&request.search==='?mode=clipping'))return false;
  return policy.playerFiles.includes(name)||policy.packagePrefixes.some(base=>name.startsWith(base));
}
