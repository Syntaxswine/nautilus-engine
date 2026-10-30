// Offline installed public-entry proof, with no donor/editor-private imports.
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {packProfile,root} from './distribution.mjs';
const out=path.join(root,'artifacts/tinderbox-art-intake/consumer');fs.mkdirSync(out,{recursive:true});
const packed=packProfile('compatibility');
const npmCli=path.join(path.dirname(process.execPath),'node_modules/npm/bin/npm-cli.js');
fs.writeFileSync(path.join(out,'package.json'),JSON.stringify({name:'tinderbox-art-installed-proof',private:true,type:'module'}));
execFileSync(process.execPath,[npmCli,'install','--offline','--ignore-scripts','--package-lock=false','--no-audit','--no-fund',packed.file],{cwd:out,windowsHide:true,stdio:'pipe'});
const guide=fs.readFileSync(path.join(root,'packages/tinderbox-art/README.md'),'utf8');
const snippet=/```js\n([\s\S]*?)```/.exec(guide)[1];
fs.writeFileSync(path.join(out,'guide-proof.mjs'),snippet);
execFileSync(process.execPath,['guide-proof.mjs'],{cwd:out,windowsHide:true,stdio:'pipe'});
const proof=`import assert from 'node:assert/strict';
import * as T from '@nautilus-engine/map-core/render-effects/three';
import {listSharedAssets} from '@nautilus-engine/map-core/assets';
import {loadTinderboxArt} from '@nautilus-engine/map-core/assets/three';
const entries=listSharedAssets().filter(a=>a.id.startsWith('tinderbox:'));
const library=await loadTinderboxArt(T);let triangles=0;
try{for(const entry of entries){const m=library.create(entry.id);try{assert.ok(m.root instanceof T.Group);assert.equal(m.diagnostics().triangles,entry.triangles);triangles+=m.diagnostics().triangles;}finally{m.dispose();}}}finally{library.dispose();}
console.log(JSON.stringify({entries:entries.length,triangles,guideSnippet:true,sharedThree:true}));`;
fs.writeFileSync(path.join(out,'proof.mjs'),proof);
const actual=JSON.parse(execFileSync(process.execPath,['proof.mjs'],{cwd:out,encoding:'utf8',windowsHide:true}));
// A source-independent browser entry loads the installed package's actual files.
const packageRoot='./node_modules/@nautilus-engine/map-core/';
fs.copyFileSync(path.join(root,'examples/tinderbox-art.html'),path.join(out,'index.html'));
let browser=fs.readFileSync(path.join(root,'examples/tinderbox-art.js'),'utf8');
browser=browser.replaceAll('../packages/',packageRoot+'packages/');fs.writeFileSync(path.join(out,'tinderbox-art.js'),browser);
const html=fs.readFileSync(path.join(out,'index.html'),'utf8').replace('./tinderbox-art.js','./tinderbox-art.js').replace('../packages/tinderbox-art/README.md',packageRoot+'packages/tinderbox-art/README.md');fs.writeFileSync(path.join(out,'index.html'),html);
const receipt={...actual,profile:packed.profile,fileCount:packed.fileCount,compressedBytes:packed.compressedBytes,integrity:packed.integrity};
fs.writeFileSync(path.join(root,'artifacts/tinderbox-art-intake/installed-proof.json'),JSON.stringify(receipt,null,2));console.log(JSON.stringify(receipt));
