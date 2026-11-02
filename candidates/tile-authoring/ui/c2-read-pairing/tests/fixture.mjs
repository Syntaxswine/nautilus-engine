// PROTOCOL source/session/preparation/action fixtures only. Actual frozen Root
// coordinator, approved 5a7 forms, a4 constructor, Core0597/53d, d8 and PNG run.
import fs from 'node:fs';import assert from 'node:assert/strict';
import {harness,painted,pin,metadata} from '../../c2-host-bridge/tests/fixture.mjs';
import {createC2ReadPairingAdapter} from '../adapter.mjs';
import {attachTileAuthoringOverlayCoordinator} from '../vendor/root-coordinator/panel.js';
import {fieldDefaults,valuesForMark,formFromFields,formInputOwner as producedInputOwner} from '../form-producer.mjs';
import {assertAvailable,checkConstruction} from '../vendor/ui5a7/root/candidates/tile-authoring/ui/c2-runtime/contract.js';
export const artwork=pin(metadata.listSharedArtwork().find(r=>r.id==='artist.graphic.road-number-0'));
const png=new URL('../../../../../assets/artwork/local-graphics-v1/resources/road-marks-v1.png',import.meta.url);
export function fixture({retained=false,liveProtocol=true,onChunk=null}={}){
 const document=retained?painted(artwork):undefined;if(document){document.authoring.decorations.surfaces=[];document.authoring.decorations.chunks=[];}
 const h=harness(document?{document}:{});h.bridge.dispose();
 const calls={builds:0,forms:0,collect:[],prepare:0,apply:0,reader:0,formReads:[],rawBuildReads:[],snapshots:0},leases=new Set(),scopeFacts=new WeakMap();let scope=null,metaEpoch=0,adapter=null,protocolReady=liveProtocol;
 const sourceOwner={capture(raw){const captured=h.sourceOwner.capture(raw);if(!scope||scopeFacts.get(scope)!==captured.scope){scope=Object.freeze({});scopeFacts.set(scope,captured.scope);}return{...captured,scope};},isCurrent(value,raw){return scopeFacts.has(value)&&h.sourceOwner.isCurrent(scopeFacts.get(value),raw);},observe(value){return{...h.sourceOwner.observe(scopeFacts.get(value)),mutationEpoch:metaEpoch};}};
 const service=Object.freeze(Object.fromEntries(['describe','snapshot','query','prepare','apply','cancel','recover'].map(name=>[name,(...args)=>{if(name==='prepare'||name==='apply')calls[name]++;return h.service[name](...args);}])));
 const workbench={...h.workbench,service,
  getSnapshot(){calls.snapshots++;const raw=h.workbench.getSnapshot();if(liveProtocol)for(const name of ['content.import','surface.layers','decoration.add','decoration.update','decoration.remove'])raw.presentation.actions[name]={enabled:true,diagnostics:[]};return raw;},
  collectCommand(command){calls.collect.push(command);return h.workbench.collectCommand(command);}
 };
 const formInputOwner={touched(read,form){calls.formReads.push(read);return producedInputOwner.touched(read,form);}};
 const idOwner={allocate(value,counts){return h.idOwner.allocate(scopeFacts.get(value),counts);}};
 const reader={async *open(blob){calls.reader++;const bytes=fs.readFileSync(png);assert.equal(bytes.length,blob.byteLength);for(let i=0;i<bytes.length;i+=32768){onChunk?.(api,i);yield new Uint8Array(bytes.subarray(i,i+32768));}}};
 adapter=createC2ReadPairingAdapter(workbench,{reader,bridgePorts:{sourceOwner,idOwner,formInputOwner,preparationBinding:liveProtocol?{isBound(){return protocolReady;}}:null}});
 const controllers=new Set();
 const api={h,adapter,workbench,calls,
  select(choice){const result=adapter.overlayPorts.selectExisting(adapter.getSnapshot(),choice);assert.equal(result.status,'selected',JSON.stringify(result));return adapter.getSnapshot();},
  selectSurface(ownerId='owner.one'){return this.select({kind:'surface',ownerId,surfaceId:'top'});},
  selectArtwork(){return this.select({kind:'artwork',artwork});},
  async acquire(read){const result=await adapter.acquireSelected(read);if(result.status==='verified')leases.add(result.bytes);return result;},
  form(read,overrides={},dirty=new Set()){calls.forms++;return formFromFields(read,{...fieldDefaults,...overrides},dirty,'first-mark');},
  controller(extra={}){const c=attachTileAuthoringOverlayCoordinator(adapter.binding,{readAdditionalData:read=>read.overlay,isAdditionalConnectionCurrent:adapter.isConnectionCurrent,strictCallbackReads:true,...extra});controllers.add(c);return c;},
  stage(controller,{afterBuild=null,values={},dirty=new Set()}={}){const displayed=controller.view,form=this.form(displayed,values,dirty);api.producedForm=form;assertAvailable(displayed,form);return controller.stage('decoration.add',(_snapshot,_view,raw)=>{calls.builds++;calls.rawBuildReads.push(raw);const result=adapter.overlayPorts.constructOverlayCommand(raw,form),command=checkConstruction(displayed,form,result);afterBuild?.(command);api.builtCommand=command;return command;});},
  mutateMetadata(){metaEpoch++;},
  setProtocolReadiness(value){protocolReady=value;},
  replaceOpaqueHandle(){const prior=scope,next=Object.freeze({});scopeFacts.set(next,scopeFacts.get(prior));scope=next;},
  release(bytes){adapter.leaseOwner.release(bytes);leases.delete(bytes);},
  close(){for(const c of controllers)c.dispose();for(const bytes of leases)adapter.leaseOwner.release(bytes);leases.clear();adapter.dispose();h.dispose();}
 };
 return api;
}
