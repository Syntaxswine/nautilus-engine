// Actual Root validated-draft producer, followed by fresh paid authoring ingress.
// Readonly membership identifies a command; it grants no authoring work credit.
import {Budget,readData,fail} from '../data.js';
import {jsonBytes} from '../budget.js';
import {shape} from './ordinary/data.js';
import {sourceAccess} from './owner.js';
export function createRetainedCommandSource(owner,{tiles,frame,validatedSource}){
 const access=sourceAccess(owner),drafts=new WeakMap(),controls=new WeakMap(),inspections=new WeakMap();
 const budget=()=>{const sink=access.coreSink(),b=sink.budget??new Budget({},sink);if(!sink.budget)sink.setBudget(b);else b.attach(sink);return b;};
 function immutable(v,b){b.take();if(v&&typeof v==='object'){for(const x of Object.values(v))immutable(x,b);Object.freeze(v);}return v;}
 const record=(control,profile)=>{const r=controls.get(control);if(!r||r.profile!==profile)fail('C2_RETAINED_COMMAND_UNBOUND','/command','Exact actual Root retained-command control for this original profile required.');return r;};
 return Object.freeze({
  publish(draft,profile){const {a}=access.current(),f=frame();if(!f||f.name!=='profile.validateDraft'||!['presentation','bootstrap'].includes(a.purpose)||a.requestId!==null)fail('C2_RETAINED_COMMAND_PRODUCER','/command','Publish only the actual Root readonly validated-draft result.');const source=[...a.sourceAliases].map(validatedSource).find(Boolean);if(!source)fail('C2_RETAINED_SOURCE_UNBOUND','/source','The readonly producer must be paired with this Kernel actual validated source.');const b=budget(),command=readData(draft,b,b.limits.commandBytes);shape(tiles,'command',command,b);immutable(command,b);const n=jsonBytes(command,b.limits.commandBytes);b.take(Math.ceil(n/64));b.outputFlow(n);const control=Object.freeze({}),reference=Object.freeze({requestId:command.requestId,command,expected:command.expected}),r={profile,source,reference,readonlyAttempt:a,inspected:new WeakSet()};drafts.set(command,control);controls.set(control,r);return command;},
  capture(draft,profile){const control=drafts.get(draft);record(control,profile);return control;},
  reference(control,profile){return record(control,profile).reference;},
  inspect(control,profile){access.requirePurpose('authoring');const r=record(control,profile),{a}=access.current();if(a.requestId!==r.reference.requestId)fail('C2_ORIGINAL_REQUEST','/requestId','Start once with the actual retained command original ID.');if(validatedSource(a.source)!==r.source)fail('C2_RETAINED_SOURCE_MISMATCH','/source','Inspect against the exact captured actual Kernel source before comparing current Expected.');if(r.inspected.has(a))fail('C2_RETAINED_INGRESS_REUSED','/command','Inspect this retained command once per original attempt.');const b=budget(),command=readData(r.reference.command,b,b.limits.commandBytes);shape(tiles,'command',command,b);if(command.requestId!==a.requestId)fail('C2_ORIGINAL_REQUEST','/requestId','Retain the exact original ID after paid inspection.');immutable(command,b);const token=Object.freeze({}),value=Object.freeze({inspection:token,requestId:command.requestId,command,expected:command.expected});const n=jsonBytes(value,b.limits.outputBytes);b.take(Math.ceil(n/64));b.outputFlow(n);inspections.set(token,{attempt:a,profile,control,value});r.inspected.add(a);return value;},
  requireInspection(token,profile){access.requirePurpose('authoring');const r=inspections.get(token);if(!r||r.profile!==profile||r.attempt!==access.current().a)fail('C2_RETAINED_INSPECTION_UNBOUND','/inspection','Use the actual same-attempt paid command inspection.');access.actual('kernel',1,{hostNodeVisits:1});return r.value;}
 });
}
