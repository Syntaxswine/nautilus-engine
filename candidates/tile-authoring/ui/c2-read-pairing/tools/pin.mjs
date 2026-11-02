// Fixed Git objects only. Root explicitly authorized its reviewed frozen staged
// coordinator blob; no moving Root/worker file is imported.
import fs from 'node:fs';import path from 'node:path';import {execFileSync} from 'node:child_process';import {fileURLToPath} from 'node:url';import {createHash} from 'node:crypto';
import {moduleReferencesBatch} from '../../../../../tools/module-references.mjs';
const here=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),root=path.resolve(here,'../../../..'),sha=b=>createHash('sha256').update(b).digest('hex');
const git=(args)=>execFileSync('git',args,{cwd:root,windowsHide:true,maxBuffer:16e6}),inputs=[];
function save(bytes,dest,origin){const file=path.join(here,dest);fs.mkdirSync(path.dirname(file),{recursive:true});if(fs.existsSync(file)&&!fs.readFileSync(file).equals(bytes))throw Error('Preserve original '+dest);fs.writeFileSync(file,bytes);inputs.push({...origin,vendored:dest,bytes:bytes.length,sha256:sha(bytes)});}
const a4='a4eb631c940fe916052dc253d3678f8fbac13c51',bridgePath='candidates/tile-authoring/ui/c2-host-bridge/bridge.mjs',original=git(['show',a4+':'+bridgePath]);save(original,'vendor/a4/bridge.original.mjs.txt',{commit:a4,path:bridgePath});
const blob='5e061e9ef0ad643ad5b77b238f751734a4e6849f',panel=git(['cat-file','blob',blob]);if(sha(panel)!=='81e0d2ad2aaa52c01b9d1d3ed172b5bef951b4f8e7440c8218e591f787425db4')throw Error('Unreviewed Root panel');save(panel,'vendor/root-coordinator/panel.js',{gitBlob:blob,path:'apps/editor/tile-authoring/ui/panel.js',review:'Root accepted 51 protocol +26 DOM groups; borrowed Host remained fixture; explicit frozen Git-blob input'});
const base='471a1b8340af446f4eaff2ff87623dfd68e39ee4',commands='apps/editor/tile-authoring/ui/commands.js';save(git(['show',base+':'+commands]),'vendor/root-coordinator/commands.js',{commit:base,path:commands});
const ui='5a7cb4ce728d158f42d997e076c296459cb259aa',queue=['candidates/tile-authoring/ui/c2-runtime/forms.js','candidates/tile-authoring/ui/c2-runtime/component.js'],seen=new Set();
while(queue.length){const file=queue.shift();if(seen.has(file))continue;seen.add(file);const bytes=git(['show',ui+':'+file]);save(bytes,'vendor/ui5a7/root/'+file,{commit:ui,path:file});if(/\.js$/.test(file))for(const spec of moduleReferencesBatch([{filename:file,source:bytes.toString('utf8')}])[0].specifiers){if(!spec.startsWith('.'))throw Error('No fallback');queue.push(path.posix.normalize(path.posix.join(path.posix.dirname(file),spec)));}}
save(git(['show',ui+':candidates/tile-authoring/ui/c2-runtime/styles.css']),'vendor/ui5a7/root/candidates/tile-authoring/ui/c2-runtime/styles.css',{commit:ui,path:'candidates/tile-authoring/ui/c2-runtime/styles.css'});
save(git(['show',ui+':candidates/tile-authoring/ui/c2-runtime/vendor/NOTICE.md']),'vendor/notices/ui5a7.md',{commit:ui,path:'candidates/tile-authoring/ui/c2-runtime/vendor/NOTICE.md'});
let derived=original.toString('utf8');const changes=[];
function once(from,to){if(derived.split(from).length!==2)throw Error('Derivation anchor changed: '+from);derived=derived.replace(from,to);changes.push({from,to});}
once("from './vendor/ui5a7/","from '../c2-host-bridge/vendor/ui5a7/");once("from './query.mjs'","from '../c2-host-bridge/query.mjs'");once("from './construct.mjs'","from '../c2-host-bridge/construct.mjs'");once('export function createC2HostBridge(','export function createPairingBridgeOwner(');
const hook=` function withCurrentRead(currentRead,originalRead,visit){
  requireConnection();if(reading||constructing||typeof visit!=='function')throw failure('C2_PAIR_REENTRY','Use one synchronous owned read check outside construction.');
  const current=entryFor(currentRead),original=entryFor(originalRead);
  const check=()=>{guard(current,current.version);guard(original,original.version);
   if(!current.capture||current.capture.scope!==original.capture?.scope||current.version!==original.version||current.selectionVersion!==original.selectionVersion||!sameData(current.basis,original.basis)||!sameData(currentRead.overlay.selection,originalRead.overlay.selection)||!sameData(currentRead.overlay.chosenArtwork,originalRead.overlay.chosenArtwork))throw failure('C2_PAIR_SCOPE_CHANGED','Both actual reads must retain the same source handle, generation, selection and complete original Basis.');
  };
  check();const result=visit(originalRead);if(result&&typeof result.then==='function')throw failure('C2_SYNC_PORT_REQUIRED','The owned current-read callback is synchronous.');check();return result;
 }
`;
once(' const sourceOwner=Object.freeze({',hook+' const sourceOwner=Object.freeze({');once('return Object.freeze({getSnapshot,overlayPorts,sourceOwner,','return Object.freeze({getSnapshot,overlayPorts,sourceOwner,withCurrentRead,isConnectionCurrent:connection,');
fs.writeFileSync(path.join(here,'bridge-owner.mjs'),derived);
let component=git(['show',ui+':candidates/tile-authoring/ui/c2-runtime/component.js']).toString('utf8');const componentChanges=[];
for(const [from,to]of [["from './contract.js'","from './vendor/ui5a7/root/candidates/tile-authoring/ui/c2-runtime/contract.js'"],["from './forms.js'","from './form-producer.mjs'"],['valuesForMark(mark)','valuesForMark(mark,view?.overlay.chosenArtwork??null)']]){if(component.split(from).length!==2)throw Error('Component adaptation anchor changed');component=component.replace(from,to);componentChanges.push({from,to});}
const componentPrefix='// Explicit private continuation of 5a7; original bytes and adaptations in vendor/source.json.\n';component=componentPrefix+component;fs.writeFileSync(path.join(here,'component.mjs'),component);
fs.writeFileSync(path.join(here,'vendor/source.json'),JSON.stringify({kind:'private-read-pairing-fixed-inputs',baseline:a4,rootCoordinator:{gitBlob:blob,sha256:sha(panel),authorization:'Explicit Root frozen staged Git-object input; no moving worktree import'},inputs,derivation:{source:'vendor/a4/bridge.original.mjs.txt',output:'bridge-owner.mjs',changes,sha256:sha(Buffer.from(derived))},componentDerivation:{source:'vendor/ui5a7/root/candidates/tile-authoring/ui/c2-runtime/component.js',output:'component.mjs',prefix:componentPrefix,changes:componentChanges,sha256:sha(Buffer.from(component))}},null,2)+'\n');
console.log(JSON.stringify({originalInputs:inputs.length,derivedBridgeBytes:Buffer.byteLength(derived),rootPanelSha256:sha(panel),a4BaselineUntouched:true}));
