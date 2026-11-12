import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import {execFileSync} from 'node:child_process';
import {root,distribution,moduleClosure} from '../tools/distribution.mjs';
import {checkPlayerSetupRegistration,historicalPlayerRegistrationBytes,PLAYER_SETUP_BASE,PLAYER_SETUP_REVIEW,PLAYER_UI_REVIEW,reviewedTrainSource} from '../tools/player-setup-registration.mjs';
import {checkSharedArtworkRegistration} from '../tools/shared-artwork-registration.mjs';
const cache=new Map(),object=(pin,file)=>{const key=pin+':'+file;if(!cache.has(key))cache.set(key,execFileSync('git',['-c','core.longpaths=true','show',key],{cwd:root,windowsHide:true,maxBuffer:32*1024*1024}));return cache.get(key);},read=file=>fs.readFileSync(path.join(root,file));
const plans=new Map(),plan=p=>{if(!plans.has(p))plans.set(p,distribution(p));return structuredClone(plans.get(p));};
const ports=()=>({object,read,moduleClosure,distribution:plan,indexed(file,bytes){assert.ok(bytes.equals(read(file)),'Index port must receive actual current bytes: '+file);}});
test('exact player registration preserves historical root/profile preimages and a headless core',()=>{
  const checked=checkPlayerSetupRegistration(ports());assert.equal(checked.report.reviewedRuntime,PLAYER_SETUP_REVIEW);assert.ok(checked.report.requiredGitCommits.includes(PLAYER_UI_REVIEW));
  assert.ok(checked.historicalPorts.read('package.json').equals(object(PLAYER_SETUP_BASE,'package.json')));
  for(const file of ['upstream.json','tools/build.mjs'])assert.ok(historicalPlayerRegistrationBytes(object,file,read(file)).equals(object(PLAYER_SETUP_BASE,file)));
  const core=distribution('core');for(const key of ['./player-setup','./native-actors'])assert.ok(core.exports[key]);for(const key of ['./player-setup/browser','./native-actors/three','./player-ui','./player-ui/style.css'])assert.equal(core.exports[key],undefined);
  assert.ok(!core.files.some(f=>f==='packages/player-setup/browser.js'||f==='packages/player-ui/index.js'||/three\.(?:module|core)\.js$/.test(f)));
  for(const profile of ['core','renderer','assets','compatibility'])assert.ok(!distribution(profile).files.some(f=>/^(?:tools|tests|artifacts)\/|^packages\/(?:player-ui|player-setup|native-actors)\/(?:tools|tests|fixture|evidence|source)\//.test(f)));
  assert.equal(reviewedTrainSource('packages/train-ui/index.js'),PLAYER_UI_REVIEW);assert.equal(reviewedTrainSource('packages/train-ui/feedback.js'),'d99fcf85256c90474cf570185159669caaed8070');
});
for(const file of ['packages/player-setup/browser.js','vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/goat-10k-data.json'])test('registration rejects modified reviewed source/resource: '+file,()=>{const p=ports();p.read=name=>name===file?Buffer.concat([read(name),Buffer.from('changed')]):read(name);assert.throws(()=>checkPlayerSetupRegistration(p),/Reviewed player bytes changed/);});
test('registration refuses an extra root export and an unrelated profile delta',()=>{
  const p=ports();p.read=file=>{if(file!=='package.json')return read(file);const pkg=JSON.parse(read(file));pkg.exports['./unreviewed']='./packages/player-setup/browser.js';return Buffer.from(JSON.stringify(pkg,null,2)+'\n');};assert.throws(()=>checkPlayerSetupRegistration(p),/root bytes/);
  const q=ports();q.distribution=profile=>{const d=plan(profile);if(profile==='core')d.exports['./player-ui']='./packages/player-ui/index.js';return d;};assert.throws(()=>checkPlayerSetupRegistration(q),/profile exports/);
  const upstream=JSON.parse(read('upstream.json'));upstream.aft.commit='0'.repeat(40);assert.throws(()=>historicalPlayerRegistrationBytes(object,'upstream.json',Buffer.from(JSON.stringify(upstream,null,2)+'\n')),/root bytes/);
});
test('composed historical artwork checks still reject unrelated immutable payload drift',()=>{
  const p=ports(),file='assets/artwork/local-graphics-v1/resources/organic-marks-v1.png';p.read=name=>name===file?Buffer.concat([read(name),Buffer.from('changed')]):read(name);assert.throws(()=>checkSharedArtworkRegistration(p),/shared artwork|railway bytes/i);
});
