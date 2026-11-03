// Actual ordinary C1 plan/bind continuation. Original algorithms and public
// consumer are source-pinned; all work spends this same original owner.
import * as ActualTiles from '../../../../../../../../packages/tiles-core/index.js';
import {planTileAuthoring as originalPlan} from './runtime/c1/index.js';
import {bindTileAuthoringTarget as originalBind} from './runtime/c1/target.js';
import {ordinarySourceCall} from './scope.js';
import {sourceAccess} from '../owner.js';
import {fail} from '../../data.js';
import {createOwnedPublicConsumer,requireOwnedPublicResult} from './public-consumer.js';
const factories=new WeakMap(),requests=new WeakMap();
const own=(v,k)=>{const d=Object.getOwnPropertyDescriptor(v??{},k);if(!d||!Object.hasOwn(d,'value'))fail('C2_ORDINARY_INPUT','/'+k,'Own data required.');return d.value;};
export function ordinaryRequestSource(owner,request){const r=requests.get(request);if(!r||r.owner!==owner)fail('C2_ORDINARY_REQUEST_UNBOUND','/request','Actual same-owner ordinary plan request required.');return r;}
export function createOrdinaryCore(owner){const access=sourceAccess(owner),plans=new WeakMap(),targets=new WeakMap();let consumer=null;const api=Object.freeze({
 planTileAuthoring(tiles,input){if(tiles!==ActualTiles)fail('C2_ACTUAL_CORE_REQUIRED','/tiles','Use the original tiles namespace.');const {a}=access.current();access.requirePurpose('authoring');if(!a.sourceAliases.has(own(input,'document')))fail('C2_SOURCE_IDENTITY','/document','Use the actual original source object.');const {value,frame}=ordinarySourceCall(owner,()=>originalPlan(tiles,input));if(value.ok){const r={owner,attempt:a,plan:value,before:frame.before};plans.set(value,r);if(value.request)requests.set(value.request,r);}return value;},
 bindTileAuthoringTarget(tiles,input){if(tiles!==ActualTiles)fail('C2_ACTUAL_CORE_REQUIRED','/tiles','Use the original tiles namespace.');const {a}=access.current();access.requirePurpose('authoring');const p=own(input,'plan'),record=plans.get(p);if(!record||record.attempt!==a)fail('C2_ORDINARY_PLAN_UNBOUND','/plan','Only this actual same-attempt plan can bind.');const prepared=own(input,'prepared');if(p.route==='public-v1-repair')requireOwnedPublicResult(owner,prepared,p);else if(prepared!==null)fail('C2_ORDINARY_PREPARED','/prepared','Metadata has no fabricated public preparation.');const {value}=ordinarySourceCall(owner,()=>originalBind(tiles,input),p);if(value.ok)targets.set(value,{...record,target:value});return value;},
 constructPublicConsumer(services){if(consumer)fail('C2_PUBLIC_CONSUMER_EXISTS','/consumer','The actual session constructs one public consumer.');consumer=createOwnedPublicConsumer(owner,services);return consumer;},
 requireTarget(value){const r=targets.get(value);if(!r||r.attempt!==access.current().a)fail('C2_ORDINARY_TARGET_UNBOUND','/target','Exact actual ordinary bound data required.');return true;},
 state:()=>Object.freeze({ordinaryCore:'BOUND',oneBudget:true,fcUsedForPublicRepair:false,actualNative:'UNBOUND',actualWal:'UNBOUND',publicActivation:false})
 });factories.set(api,{owner,access,plans,targets});return api;}
