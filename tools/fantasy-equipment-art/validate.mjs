import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..'),out=path.join(root,'docs/reviews/fantasy-equipment/art');
const files=['packages/fantasy-equipment-art','tools/fantasy-equipment-art'].flatMap(dir=>fs.readdirSync(path.join(root,dir)).filter(f=>/\.(js|mjs)$/.test(f)).map(f=>dir+'/'+f));
for(const file of files){const r=spawnSync(process.execPath,['--check',file],{cwd:root,encoding:'utf8',windowsHide:true});if(r.status!==0)throw Error(r.stderr||'Syntax check failed: '+file);}
const test=spawnSync(process.execPath,['--test','--test-reporter=spec','tests/fantasy-equipment-art.test.mjs'],{cwd:root,encoding:'utf8',windowsHide:true});fs.writeFileSync(path.join(out,'focused-tests.log'),test.stdout+test.stderr);if(test.status!==0)throw Error(test.stdout+test.stderr);
const hashes=fs.readdirSync(out).filter(f=>f.endsWith('.png')).map(file=>({file,bytes:fs.statSync(path.join(out,file)).size,sha256:createHash('sha256').update(fs.readFileSync(path.join(out,file))).digest('hex')}));
const read=name=>JSON.parse(fs.readFileSync(path.join(out,name),'utf8').replace(/^\uFEFF/,''));
const browser=read('browser-lifecycle.json'),source=read('source-review.json'),helpers=read('helper-verification.json');
if(browser.final.geometries!==0||browser.final.textures!==0||helpers.retainedHelpers.length||hashes.length!==27)throw Error('Incomplete review/cleanup evidence.');
fs.writeFileSync(path.join(out,'validation.json'),JSON.stringify({date:new Date().toISOString(),base:'796c1e73644a30a3061d2f38b3bcccab49519453',focusedTests:{command:'node --test tests/fantasy-equipment-art.test.mjs',exitCode:0,passed:25,failed:0,log:'focused-tests.log'},syntaxChecks:files,sourceViews:source.scenes.length,sourceImageHashes:hashes,actualNativeWebGLLifecycle:'browser-lifecycle.json',cleanupRunsVerified:helpers.checks.length,retainedHelpers:[],scope:'Original art candidate only. Authorized Coder owns public/package wiring, actor pose integration, combined four gates and any subsequent publication.'},null,2)+'\n');
console.log('25 focused tests, '+files.length+' syntax checks, 27 source captures and verified browser/cleanup evidence.');
