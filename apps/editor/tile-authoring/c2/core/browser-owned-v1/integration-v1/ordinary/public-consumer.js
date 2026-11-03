// Calls the ORIGINAL retained public consumer exactly once. No post-result
// metrics/counter DTO is accepted. A full source-backed bound is spent first.
import * as ActualTiles from '../../../../../../../../packages/tiles-core/index.js';
import {sourceAccess} from '../owner.js';
import {fail,jsonBytes} from '../../budget.js';
import {Budget,readData,fields,equal} from '../../data.js';
import {ordinaryRequestSource} from './index.js';
const results=new WeakMap();
function sourceSize(v){let nodes=1,text=0;if(typeof v==='string')text=v.length;else if(v&&typeof v==='object')for(const [key,value]of Object.entries(v)){text+=key.length;const child=sourceSize(value);nodes+=child.nodes;text+=child.text;}return {nodes,text};}
export function requireOwnedPublicResult(owner,value,plan){const r=results.get(value);if(!r||r.owner!==owner||r.plan!==plan||r.attempt!==sourceAccess(owner).current().a)fail('C2_PUBLIC_PREPARED_UNBOUND','/prepared','Use the original actual public result from this same owner/plan/attempt.');return r;}
export function createOwnedPublicConsumer(owner,services){const access=sourceAccess(owner);access.current();const ports={};for(const key of ['read','compareAndSwap']){const d=Object.getOwnPropertyDescriptor(services??{},key);if(!d||!Object.hasOwn(d,'value')||typeof d.value!=='function')fail('C2_PUBLIC_SERVICES','/services/'+key,'Own original synchronous consumer service required.');ports[key]=d.value;}let preparation=null;
 const actual=ActualTiles.createRetainedTileConsumer({read(){if(!preparation)fail('C2_PUBLIC_READ_UNBOUND','/read','Read only inside the actual owned public prepare.');const sink=access.coreSink(),b=sink.budget??new Budget({},sink);if(!sink.budget)sink.setBudget(b);else b.attach(sink);const snapshot=readData(ports.read(),b,b.limits.sourceBytes);fields(snapshot,['bundle','token','contextToken','cancelled'],'/snapshot',['bundle','token','contextToken']);if(!equal(ActualTiles,snapshot.bundle,preparation.before.tileBundle,b))fail('C2_PUBLIC_SOURCE_CHANGED','/snapshot/bundle','The real public consumer must read the exact fully validated planned source.');return snapshot;},compareAndSwap:ports.compareAndSwap});return Object.freeze({
 prepare(request){const {a,r}=access.current(),p=ordinaryRequestSource(owner,request);if(p.attempt!==a||a.workProfile?.route!=='ordinary-c1-no-active-marks')fail('C2_PUBLIC_PROFILE_UNBOUND','/profile','The complete owned ordinary command/source must bind its work profile before repair.');
  const raw={publicSteps:request.maxSteps,publicSpatialTests:request.maxSpatialTests,publicGeometryEvaluations:request.maxGeometryWork};
  // Source policy: each public domain is fully spent at its own captured bound;
  // 65,536 helper units conservatively cover bounded C1 metadata/ordering/copies.
  // Engine/driver CPU time is not measured and result.work is never credit.
  const input={bundle:p.before.tileBundle,request},size=sourceSize(input);const units=raw.publicSteps+raw.publicSpatialTests+raw.publicGeometryEvaluations+65536+16*(size.nodes+Math.ceil(size.text/16)+Math.ceil(jsonBytes(input,4000000)/64));access.conservative('public',units,raw);
  const claim={source:actual,attempt:a,phase:r,request};access.opaqueBegin(claim);let value;try{if(preparation)fail('C2_PUBLIC_REENTRY','/prepare','One actual retained consumer operation.');preparation=p;value=actual.prepare(request);}catch(error){access.opaqueEnd(claim);access.fail();throw error;}finally{preparation=null;}access.opaqueEnd(claim);if(value.ok)results.set(value,{owner,attempt:a,plan:p.plan,request,actual});return value;
 },apply(prepared){const result=results.get(prepared);if(!result||result.actual!==actual||result.owner!==owner)fail('C2_PUBLIC_PREPARED_UNBOUND','/prepared','This same actual consumer owns the handle.');const {a,r}=access.current();access.requirePurpose('authoring');if(result.attempt!==a||r.phase!=='apply-wal')fail('C2_PUBLIC_APPLY_PHASE','/apply','The original attempt and explicit apply escrow must continue.');fail('C2_PUBLIC_APPLY_WAL_UNBOUND','/apply','Actual same-operation complete WAL guards have not been paired.');},dispose(){access.current();actual.dispose();}
 });}
