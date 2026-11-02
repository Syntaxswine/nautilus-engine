// Private SAME-owner correction from fixed Git objects only. Earlier failures stay
// byte-exact. Producer final facts are required, never inferred from a predicate.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';import {fileURLToPath} from 'node:url';import {createHash} from 'node:crypto';
const here=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),root=path.resolve(here,'../../../..'),BASE='81c0233d84f024fe7750aacee67f6cdaf1494219',READ='938ea1f78d305d86c163f9e4e84033236916e897',ROOT='e4d798cd30857e4a77c8875817f9f333286eb32c',prefix='candidates/tile-authoring/ui/shared-controller-display-guard/',sha=b=>createHash('sha256').update(b).digest('hex');
const git=args=>execFileSync('git',['-c','core.longpaths=true',...args],{cwd:root,windowsHide:true,maxBuffer:32e6}),inputs=[],outputs=[];
function source(commit,file){const b=git(['show',commit+':'+file]);inputs.push({commit,path:file,bytes:b.length,sha256:sha(b)});return b.toString('utf8');}
function save(file,original,edits=[],before='',after=''){let text=original;for(const e of edits){const count=text.split(e.from).length-1;assert.equal(count,e.occurrences??1,file+' anchor '+e.from);text=text.split(e.from).join(e.to);}const bytes=Buffer.from(before+text+after),target=path.join(here,file);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,bytes);outputs.push({path:file,sourceSha256:sha(Buffer.from(original)),edits,before,after,bytes:bytes.length,sha256:sha(bytes)});return before+text+after;}
const finalGuard=fs.readFileSync(path.join(here,'root-final-guard.js.txt'),'utf8'),member=save('coordinator-resource-method.js.txt',source(BASE,prefix+'coordinator-resource-method.js.txt'),[{from:'        // read() has completed all additional-source/currentness callbacks. Take\n        // the final actual read now, compare its data, and call no user callback\n        // between this comparison and returning it to the resource dispatcher.',to:'        // Finish callbackful snapshot/currentness checks, then authenticate the\n        // original issued read with the actual producer-owned final observation.'},{from:'        return raw;',to:finalGuard}]);
const originalRoot=source(ROOT,'apps/editor/tile-authoring/ui/panel.js'),semantic=save('proposal/root-panel.owned-read.js.txt',originalRoot,[{from:'    get pending(){return pending;},',to:member+'    get pending(){return pending;},'}]);
save('root-resource-guard.mjs',semantic,[{from:"from './commands.js'",to:"from '../shared-controller/vendor/root648/commands.js'"}],'// Private Root648 continuation: one displayed-resource guard with actual source-owned final facts.\n');
save('hub.mjs',source(BASE,prefix+'hub.mjs'));
save('mount.mjs',source(BASE,prefix+'mount.mjs'));
save('resource-control.mjs',source(BASE,prefix+'resource-control.mjs'),[
 {from:" const loadSelected=own(resourceActions,'loadSelected'),getSnapshot=own(binding,'getSnapshot'),events=",to:" const readOwner=own(binding,'resourceReadOwner'),captureRead=own(readOwner,'capture'),visitRead=own(readOwner,'visit');\n const loadSelected=own(resourceActions,'loadSelected'),getSnapshot=own(binding,'getSnapshot'),events="},
 {from:"if(own(resourceActions,'loadSelected')!==loadSelected||own(binding,'getSnapshot')!==getSnapshot)",to:"if(own(resourceActions,'loadSelected')!==loadSelected||own(binding,'getSnapshot')!==getSnapshot||own(binding,'resourceReadOwner')!==readOwner||own(readOwner,'capture')!==captureRead||own(readOwner,'visit')!==visitRead)"},
 {from:"const bound=typeof loadSelected==='function'",to:"const bound=typeof loadSelected==='function'&&typeof captureRead==='function'&&typeof visitRead==='function'"},
 {from:"  if(typeof loadSelected!=='function')return{status:'unavailable',code:'UI_RESOURCE_UNBOUND'};",to:"  if(typeof loadSelected!=='function'||typeof captureRead!=='function'||typeof visitRead!=='function')return{status:'unavailable',code:'UI_RESOURCE_UNBOUND'};\n  if(!latched?.overlay.chosenArtwork)return{status:'unavailable',code:'UI_RESOURCE_SELECTION_REQUIRED'};"},
 {from:"   const read=guard.read();\n   if(own(resourceActions,'loadSelected')!==loadSelected){retired=true;throw issue('UI_RESOURCE_RETIRED','The artwork loading port changed.');}\n   if(!read?.overlay.chosenArtwork)throw issue('UI_RESOURCE_SELECTION_REQUIRED','Select an artwork revision first.');",to:"   if(own(resourceActions,'loadSelected')!==loadSelected){retired=true;throw issue('UI_RESOURCE_RETIRED','The artwork loading port changed.');}\n   const read=guard.read();\n   // Pure descriptor/lifetime checks only; no callback after final source facts.\n   if(disposed||retired||own(resourceActions,'loadSelected')!==loadSelected||own(binding,'getSnapshot')!==getSnapshot||own(binding,'resourceReadOwner')!==readOwner||own(readOwner,'capture')!==captureRead||own(readOwner,'visit')!==visitRead){retired=true;throw issue('UI_RESOURCE_RETIRED','The artwork loading port changed before dispatch.');}"}
]);
const bridgeFinal=fs.readFileSync(path.join(here,'bridge-final-owner.js.txt'),'utf8'),adapterFinal=fs.readFileSync(path.join(here,'adapter-final-owner.js.txt'),'utf8');
save('bridge-owner.mjs',source(READ,'candidates/tile-authoring/ui/c2-read-pairing/bridge-owner.mjs'),[
 {from:"from '../../../../apps/editor/tile-authoring/ui/panel.js'",to:"from './root-resource-guard.mjs'"},
 {from:'entry={read,base,capture,basis,scope,',to:'entry={read,originalBaseRead:raw,base,capture,basis,scope,'},
 {from:' const sourceOwner=Object.freeze({',to:bridgeFinal+' const sourceOwner=Object.freeze({'},
 {from:'return Object.freeze({getSnapshot,overlayPorts,sourceOwner,withCurrentRead,',to:'return Object.freeze({getSnapshot,overlayPorts,sourceOwner,resourceReadOwner,withCurrentRead,'}
]);
save('adapter.mjs',source(READ,'candidates/tile-authoring/ui/c2-read-pairing/adapter.mjs'),[
 {from:"from './form-producer.mjs'",to:"from '../c2-read-pairing/form-producer.mjs'"},
 {from:' const binding=Object.freeze({service:',to:adapterFinal+' const binding=Object.freeze({resourceReadOwner,service:'},
 {from:'return Object.freeze({binding,getSnapshot,overlayPorts,acquireSelected,leaseOwner,',to:'return Object.freeze({binding,getSnapshot,overlayPorts,acquireSelected,leaseOwner,resourceReadOwner,'}
]);
save('adapter.d.mts',source(READ,'candidates/tile-authoring/ui/c2-read-pairing/adapter.d.mts'),[
 {from:"export interface PairingOptions<Source,R=unknown,B=unknown> {",to:fs.readFileSync(path.join(here,'final-owner-types.js.txt'),'utf8')+"\nexport interface PairingOptions<Source,R=unknown,B=unknown> {"},
 {from:"readonly bridgePorts?:Omit<Partial<ConstructorPorts<PairingRead<R,B>,Source,SelectedLease,R,B>>,'selectedBytesBinding'>;",to:"readonly bridgePorts?:Omit<Partial<ConstructorPorts<PairingRead<R,B>,Source,SelectedLease,R,B>>,'selectedBytesBinding'|'sourceOwner'>&{readonly sourceOwner?:ConstructorPorts<PairingRead<R,B>,Source,SelectedLease,R,B>['sourceOwner']&{readonly finalReadOwner?:ProducerFinalReadOwner<Source,CompleteRead<R,B>>|null}};"},
 {from:'readonly overlayPorts:OverlayPorts<CompleteRead<R,B>,unknown,unknown>};',to:'readonly overlayPorts:OverlayPorts<CompleteRead<R,B>,unknown,unknown>;readonly resourceReadOwner?:FinalReadOwner<PairingRead<R,B>>|null};'},
 {from:' getSnapshot():PairingRead<R,B>;',to:' readonly resourceReadOwner:FinalReadOwner<PairingRead<R,B>>|null;\n getSnapshot():PairingRead<R,B>;'}
]);
for(const name of ['hub.d.mts','mount.d.mts','resource-control.d.mts'])save(name,source(BASE,prefix+name),name==='mount.d.mts'?[{from:"from '../c2-read-pairing/adapter.mjs'",to:"from './adapter.mjs'"}]:[]);
save('tests/fixture.mjs',source(BASE,prefix+'tests/fixture.mjs'),[
 {from:"import {TILE_AUTHORING_EXPECTED_FIELDS}",to:"import {createProtocolSourceOwner} from './protocol-source-owner.mjs';\nimport {TILE_AUTHORING_EXPECTED_FIELDS}"},
 {from:' const observers=new Set()',to:' const producer=createProtocolSourceOwner(value);value=producer.rawModel;\n const observers=new Set()'},
 {from:'const next=structuredClone(value);fn(next);value=next;if(publish)for(const fn of [...observers])fn(value);',to:'producer.replace(fn);value=producer.rawModel;if(publish)for(const fn of [...observers])fn(binding.getSnapshot());'},
 {from:'const binding={service,getSnapshot(){hooks.read?.();return value;}',to:'const binding={service,resourceReadOwner:producer.finalReadOwner,getSnapshot(){hooks.read?.();return producer.issue();}'},
 {from:'return{binding,calls,hooks,update,get value(){return value;},',to:'return{binding,calls,hooks,update,get value(){return value;},get lastRead(){return producer.lastRead;},get connectionCurrent(){return producer.live;},setConnectionCurrent(value){producer.setLive(value);},isIssued:producer.isIssued,'}
]);
save('tests/baseline.test.mjs',source(BASE,prefix+'tests/baseline.test.mjs'));
save('tests/source-guard.test.mjs',source(BASE,prefix+'tests/resource-guard.test.mjs'),[
 {from:'hooks.current?.();return true;',to:'hooks.current?.();return f.connectionCurrent;'},
 {from:'assert.equal(guard.read(),s.f.value)',to:'assert.equal(guard.read(),s.f.lastRead)',occurrences:2}
]);
save('tests/browser-fixture.mjs',source(BASE,prefix+'tests/browser-fixture.mjs'),[
 {from:'defaultC1=false,resourceMode=null',to:'defaultC1=false,resourceMode=null,ownerBound=true'},
 {from:"import * as tiles",to:"import {createProtocolSourceOwner} from './protocol-source-owner.mjs';\nimport * as tiles"},
 {from:' let value=structuredClone(initial),',to:' const producer=createProtocolSourceOwner(initial);\n let value=producer.rawModel,'},
 {from:' const emit=()=>',to:" Object.defineProperty(hooks,'live',{get:()=>producer.live,set:value=>producer.setLive(value),enumerable:true});\n const emit=()=>"},
 {from:'for(const fn of [...observers])fn(value);',to:'for(const fn of [...observers])fn(binding.getSnapshot());'},
 {from:'const update=fn=>{fn(value);emit();};',to:'const update=fn=>{producer.replace(fn);value=producer.rawModel;emit();};'},
 {from:'const binding={service,overlayPorts,',to:'const binding={service,overlayPorts,resourceReadOwner:ownerBound?producer.finalReadOwner:null,'},
 {from:'getSnapshot(){hooks.read?.();return value;}',to:'getSnapshot(){hooks.read?.();return producer.issue();}'},
 {from:'resourceActualReads:[]',to:'resourceActualReads:[],liveAtDispatch:[]'},
 {from:'calls.resourceActualReads.push(read===value);',to:'calls.resourceActualReads.push(producer.isIssued(read));calls.liveAtDispatch.push(producer.live);'},
 {from:'hooks.current?.();return!disposed;',to:'hooks.current?.();return!disposed&&producer.live;'},
 {from:'get value(){return value;}',to:'get value(){return producer.model;},replace(fn){producer.replace(fn);value=producer.rawModel;}'}
]);
save('tests/review.html',source(BASE,prefix+'tests/review.html'));
save('tests/types.mts',source(BASE,prefix+'tests/types.mts'));
save('tests/resource-guard.types.mts',source(BASE,prefix+'tests/resource-guard.types.mts'));
save('tools/baseline-browser-review.mjs',source(BASE,prefix+'tools/baseline-browser-review.mjs'),[
 {from:'shared-controller-display-guard',to:'shared-controller-owned-load',occurrences:2},
 {from:'ui-resource-display-guard-baseline',to:'ui-resource-owned-load-baseline'},
 {from:"'source.json','coordinator-resource-method.js.txt','hub-resource-method.js.txt'",to:"'derivation.json','coordinator-resource-method.js.txt','tests/protocol-source-owner.mjs'"}
]);
save('tools/browser-review.mjs',source(BASE,prefix+'tools/browser-review.mjs'),[
 {from:'shared-controller-display-guard',to:'shared-controller-owned-load',occurrences:2},
 {from:'ui-resource-display-guard-focused',to:'ui-resource-owned-load-focused'},
 {from:'ui-resource-display-guard-input',to:'ui-resource-owned-load-input',occurrences:2},
 {from:'structuredClone(h.value.overlay.chosenArtwork)',to:'JSON.parse(JSON.stringify(h.value.overlay.chosenArtwork))',occurrences:2},
 {from:"'hub-resource-method.js.txt'",to:"'tests/protocol-source-owner.mjs'"},
 {from:" await page.evaluate(()=>reset());await load().click();await page.waitForFunction(()=>h.calls.resourceLoad===1);",to:fs.readFileSync(path.join(here,'tools/browser-additions.js.txt'),'utf8')+"\n await page.evaluate(()=>reset());await load().click();await page.waitForFunction(()=>h.calls.resourceLoad===1);"}
]);
const manifest={kind:'private-source-owned-final-resource-dispatch',baseline:BASE,readPairing:READ,Root:ROOT,inputs,outputs,producerPort:'sourceOwner.finalReadOwner.capture(scope, actualBaseRead) and visit(ticket, scope, actualBaseRead, visit); actual source-private WeakMap/epoch required; no external callbacks during final visit',missingProducerPort:'Resource load UNBOUND/disabled; no predicate or ready flag fallback',sameOwnerReadPort:'binding.resourceReadOwner.capture(actualIssuedRead), visit(ticket, actualIssuedRead, visit)',withCurrentRead:'Preserved callbackful helper, never used as atomic final dispatch permission',noRootWrites:true,noPush:true};
fs.writeFileSync(path.join(here,'derivation.json'),JSON.stringify(manifest,null,2)+'\n');console.log(JSON.stringify({status:'derived',baseline:BASE,outputs:outputs.length,CoreCopies:0,newSourceEpochFieldsInDTO:0,noRootWrites:true,noPush:true}));
