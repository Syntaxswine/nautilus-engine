// New private continuation from immutable63f and reviewedRoot648 only.
// All prior runtime/proof bytes, including the independently failed63f, stay put.
import fs from 'node:fs';import path from 'node:path';import {execFileSync} from 'node:child_process';import {fileURLToPath} from 'node:url';import {createHash} from 'node:crypto';
const here=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),root=path.resolve(here,'../../../..'),base='63f3506daced32e2ac135e008e00ac939ca90f87',rootPin='648cad33c3e0e1f36b4313b1492b1a750492ece4',old='candidates/tile-authoring/ui/shared-controller/',sha=b=>createHash('sha256').update(b).digest('hex');
const git=args=>execFileSync('git',['-c','core.longpaths=true',...args],{cwd:root,windowsHide:true,maxBuffer:16e6});
const inputs=[],derivations=[];
function input(commit,source){const bytes=git(['show',commit+':'+source]);inputs.push({commit,path:source,bytes:bytes.length,sha256:sha(bytes)});return bytes.toString('utf8');}
function save(output,source,changes=[],prefix=''){
 let text=source;
 for(const {from,to} of changes){if(text.split(from).length!==2)throw Error('One immutable anchor required: '+output+' '+from);text=text.replace(from,to);}
 const bytes=Buffer.from(prefix+text),file=path.join(here,output);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,bytes);derivations.push({output,sourceSha256:sha(Buffer.from(source)),changes,prefix,bytes:bytes.length,sha256:sha(bytes)});return text;
}
const member=fs.readFileSync(path.join(here,'coordinator-resource-method.js.txt'),'utf8'),hubMember=fs.readFileSync(path.join(here,'hub-resource-method.js.txt'),'utf8');
const original=input(rootPin,'apps/editor/tile-authoring/ui/panel.js');
const resourceSemantic=save('proposal/root-panel.resource-guard.js.txt',original,[{from:'    get pending(){return pending;},',to:member+'    get pending(){return pending;},'}]);
save('root-resource-guard.mjs',resourceSemantic,[{from:"from './commands.js'",to:"from '../shared-controller/vendor/root648/commands.js'"}],'// Private Root648 continuation: only an added displayed-resource guard; existing actions unchanged.\n');
let diff;try{diff=execFileSync('git',['-c','core.autocrlf=false','diff','--no-index','--no-ext-diff','--',path.join(here,'../shared-controller/vendor/root648/panel.js'),path.join(here,'proposal/root-panel.resource-guard.js.txt')],{cwd:here,windowsHide:true});}catch(e){if(e.status!==1)throw e;diff=e.stdout;}
let patch=diff.toString('utf8');patch=patch.replace(/^diff --git .+$/m,'diff --git a/apps/editor/tile-authoring/ui/panel.js b/apps/editor/tile-authoring/ui/panel.js').replace(/^--- .+$/m,'--- a/apps/editor/tile-authoring/ui/panel.js').replace(/^\+\+\+ .+$/m,'+++ b/apps/editor/tile-authoring/ui/panel.js');fs.writeFileSync(path.join(here,'proposal/root-resource-display-guard.patch'),patch);
save('hub.mjs',input(base,old+'hub.mjs'),[{from:"from './vendor/root648/panel.js'",to:"from './root-resource-guard.mjs'"},{from:'  beginResourceUI(){',to:hubMember+'  beginResourceUI(){'}]);
save('mount.mjs',input(base,old+'mount.mjs'),[{from:"from './c1-mount.mjs'",to:"from '../shared-controller/c1-mount.mjs'"}]);
save('resource-control.mjs',input(base,old+'resource-control.mjs'),[
 {from:' async function load(){',to:' async function load(){\n  const latched=displayed;'},
 {from:'   end=hub.beginResourceUI();',to:'   const guard=hub.captureResourceDisplay(latched);\n   end=hub.beginResourceUI();'},
 {from:"   // Use the actual issued read, after pending callbacks. Never pass a Root\n   // display clone or mint source/selection authority in this control.\n   const read=getSnapshot.call(binding);\n   if(!current())throw issue('UI_RESOURCE_RETIRED','The artwork loading connection changed.');\n   if(!read?.overlay.chosenArtwork)throw issue('UI_RESOURCE_SELECTION_REQUIRED','Select an artwork revision first.');\n   render();await loadSelected.call(resourceActions,read);",to:"   render();\n   if(!current())throw issue('UI_RESOURCE_RETIRED','The artwork loading connection changed.');\n   // Last source comparison occurs after pending/render/currentness callbacks.\n   // The guard returns the actual issued read, never its parsed display copy.\n   const read=guard.read();\n   if(own(resourceActions,'loadSelected')!==loadSelected){retired=true;throw issue('UI_RESOURCE_RETIRED','The artwork loading port changed.');}\n   if(!read?.overlay.chosenArtwork)throw issue('UI_RESOURCE_SELECTION_REQUIRED','Select an artwork revision first.');\n   await loadSelected.call(resourceActions,read);"}
]);
save('hub.d.mts',input(base,old+'hub.d.mts'),[{from:' readonly pending:boolean;\n attach(',to:" readonly pending:boolean;\n captureResourceDisplay(displayed:PairingRead):Readonly<{read():PairingRead}>;\n attach("}]);
for(const name of ['mount.d.mts','resource-control.d.mts'])save(name,input(base,old+name));
save('tests/fixture.mjs',input(base,old+'tests/fixture.mjs'),[{from:"from '../vendor/root648/commands.js'",to:"from '../../shared-controller/vendor/root648/commands.js'"}]);
save('tests/baseline.test.mjs',input(base,old+'tests/hub.test.mjs'));
save('tests/browser-fixture.mjs',input(base,old+'tests/browser-fixture.mjs'),[
 {from:"from '../vendor/root648/commands.js'",to:"from '../../shared-controller/vendor/root648/commands.js'"},
 {from:"from '../c1-mount.mjs'",to:"from '../../shared-controller/c1-mount.mjs'"},
 {from:'const observers=new Set(),errors=[]',to:'const hooks={read:null,current:null},observers=new Set(),errors=[]'},
 {from:'getSnapshot(){return value;}',to:'getSnapshot(){hooks.read?.();return value;}'},
 {from:'isAdditionalConnectionCurrent:()=>!disposed',to:'isAdditionalConnectionCurrent:()=>{hooks.current?.();return!disposed;}'},
 {from:'return{binding,shared,resourceActions,calls,errors,emit,',to:'return{binding,shared,resourceActions,calls,errors,emit,hooks,'}
]);
save('tests/review.html',input(base,old+'tests/review.html'),[{from:'href="../vendor/root648/styles.css"',to:'href="../../shared-controller/vendor/root648/styles.css"'}]);
save('tests/types.mts',input(base,old+'tests/types.mts'));
// Same16 real-DOM controls; outputs/imports go to this new follow-up only.
save('tools/baseline-browser-review.mjs',input(base,old+'tools/browser-review.mjs'),[
 {from:"base='candidates/tile-authoring/ui/shared-controller'",to:"base='candidates/tile-authoring/ui/shared-controller-display-guard'"},
 {from:"output='ui-shared-controller-dom'",to:"output='ui-resource-display-guard-baseline'"},
 {from:"path.join(here,'evidence')",to:"path.join(here,'evidence/baseline-dom')"},
 {from:"'resource-control.mjs','c1-mount.mjs'",to:"'resource-control.mjs','root-resource-guard.mjs'"},
 {from:"'vendor/source.json','vendor/root648/panel.js','vendor/root648/commands.js','vendor/root648/styles.css'",to:"'source.json','coordinator-resource-method.js.txt','hub-resource-method.js.txt'"},
 {from:"import('/candidates/tile-authoring/ui/shared-controller/tests/browser-fixture.mjs')",to:"import('/candidates/tile-authoring/ui/shared-controller-display-guard/tests/browser-fixture.mjs')"}
 ]);
const manifest={kind:'private-resource-display-guard-derivation',baseline:base,reviewedRoot:rootPin,inputs,derivations,defaultC1:'Original63f opt-in continuation unchanged; standalone default C1 remains original Root algorithm',coordinator:'One original Root factory continuation; only captureResourceDisplay added; old action implementations unchanged',noPush:true};
fs.writeFileSync(path.join(here,'derivation.json'),JSON.stringify(manifest,null,2)+'\n');console.log(JSON.stringify({baseline:base,root:rootPin,derivedFiles:derivations.length,RootGuardMembersAdded:1,RootWrites:0}));
