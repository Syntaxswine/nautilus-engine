// Source-only private component boundary. Never imports a moving peer branch.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {distribution} from './distribution.mjs';
import {verifyProofInputs} from '../candidates/tile-authoring/browser-art/owner-v1/proof-input-audit.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),prefix='candidates/tile-authoring/browser-art/owner-v1/',input=JSON.parse(fs.readFileSync(path.join(root,prefix+'inputs.json'))),sha=b=>createHash('sha256').update(b).digest('hex');
const git=args=>execFileSync('git',['-c','safe.directory='+root.replaceAll('\\','/'),...args],{cwd:root,windowsHide:true,maxBuffer:256*1024*1024});
const walk=dir=>fs.readdirSync(path.join(root,dir),{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(dir+e.name+'/'):[dir+e.name]);
const files=[...walk(prefix).filter(p=>p!==prefix+'source.json'),...fs.readdirSync(path.join(root,'tests')).filter(p=>/^art-browser-owner.*\.test\.mjs$/.test(p)).map(p=>'tests/'+p),...fs.readdirSync(path.join(root,'tools')).filter(p=>/^art-browser-owner.*\.mjs$/.test(p)).map(p=>'tools/'+p)].sort().map(p=>{const b=fs.readFileSync(path.join(root,p));return {path:p,bytes:b.length,sha256:sha(b)};});
if(process.argv.includes('--record'))fs.writeFileSync(path.join(root,prefix+'source.json'),JSON.stringify({kind:'private-browser-art-source-checkpoint',version:1,baseCommit:input.baseCommit,formalBindings:'UNBOUND',publicRegistration:false,files},null,2)+'\n');
const manifest=JSON.parse(fs.readFileSync(path.join(root,prefix+'source.json')));if(JSON.stringify(manifest.files)!==JSON.stringify(files)||manifest.baseCommit!==input.baseCommit)throw Error('Private checkpoint raw bytes changed');
const names=input.dependencies.map(r=>r.path),body=execFileSync('git',['-c','safe.directory='+root.replaceAll('\\','/'),'cat-file','--batch'],{cwd:root,windowsHide:true,input:names.map(p=>input.baseCommit+':'+p+'\n').join(''),maxBuffer:256*1024*1024});let offset=0;
for(const r of input.dependencies){const end=body.indexOf(10,offset),header=body.subarray(offset,end).toString().split(' '),bytes=Number(header[2]);if(header[1]!=='blob')throw Error('Missing fixed parent '+r.path);const b=body.subarray(end+1,end+1+bytes);offset=end+1+bytes+1;if(bytes!==r.bytes||sha(b)!==r.sha256||sha(fs.readFileSync(path.join(root,r.path)))!==r.sha256)throw Error('Dependency differs from exact parent: '+r.path);}
const decoderInputPath='candidates/tile-authoring/art/c2-decoder-proof/inputs.json',proofInputs=verifyProofInputs({source:fs.readFileSync(path.join(root,prefix+'tests/browser.mjs'),'utf8'),dependencies:input.dependencies,decoderInputs:JSON.parse(fs.readFileSync(path.join(root,decoderInputPath))),decoderInputPath});
const changes=git(['diff','--name-only',input.baseCommit]).toString().trim().split(/\r?\n/).filter(Boolean);if(changes.some(p=>!files.some(f=>f.path===p)&&p!==prefix+'source.json'))throw Error('Existing/protected file changed: '+changes.join(','));
const original=input.proofInputAmendment?.originalComponentCommit;if(original){const paths=git(['ls-tree','-r','--name-only',original,'--',prefix+'review/']).toString().trim().split(/\r?\n/).filter(Boolean);for(const p of paths)if(sha(fs.readFileSync(path.join(root,p)))!==sha(git(['show',original+':'+p])))throw Error('Original d437 proof changed: '+p);}
const profiles=['core','renderer','assets','compatibility'].map(name=>({name,...distribution(name)}));for(const p of profiles)if(p.files.some(f=>f.startsWith('candidates/')||f.includes('art-browser-owner')))throw Error('Private component leaked into '+p.name);
console.log(JSON.stringify({status:'pass',privateFiles:files.length,exactDependencies:input.dependencies.length,proofInputPaths:proofInputs.allInputs.length,baseCommit:input.baseCommit,profiles:profiles.map(p=>({name:p.name,files:p.files.length,privateFiles:0})),formalBindings:'UNBOUND',existingChanges:changes.length}));
