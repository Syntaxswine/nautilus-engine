import {data,fields,id,integer,finite,plain,clone,canonical,fail} from './data.js';
import {WINDOW_GEOMETRY_CONTRACT as C} from './contract.js';
import {readCompiled} from './compiler.js';
import {queryWindowSegment} from './query.js';
const authorities=new WeakMap(),scopeFields=['profileId','sceneId','stateId','contentEpoch','contentDigest'];
export function digest(value,path){if(typeof value!=='string'||!/^[a-f0-9]{64}(?![\s\S])/.test(value))fail('INVALID_DIGEST',path,'Use the exact SHA-256 token.');return value;}
function typed(value){if(typeof value==='string')return ['string',id(value,'/confirmation/hostCommandId')];if(Number.isSafeInteger(value)&&!Object.is(value,-0))return ['integer',value];fail('INVALID_HOST_COMMAND_ID','/confirmation/hostCommandId','Use a typed bounded ASCII string or safe integer, without negative zero.');}
export function windowImpactId(hostCommandId,round,impactIndex){integer(round,0,65535,'/confirmation/round');integer(impactIndex,0,65535,'/confirmation/impactIndex');const key=JSON.stringify(['window-impact-v1',typed(hostCommandId),round,impactIndex]);if(key.length>192)fail('INVALID_IMPACT_ID','/id','Derived impact identity exceeds its bound.');return key;}
export function point(value,path){fields(value,['x','y','h'],path);for(const key of ['x','y','h'])finite(value[key],path+'/'+key);}
export function checkWindowImpact(input){
  const p=data(input);fields(p,['version','id',...scopeFields,'expectedRevision','placementId','partId','paneId','definitionDigest','confirmation'],'');
  if(p.version!==1||p.profileId!==C.profileId)fail('WRONG_WINDOW_PROFILE','/profileId','Use the bounded first-hit pane profile and packet v1.');for(const key of scopeFields.slice(0,4))id(p[key],'/'+key);digest(p.contentDigest,'/contentDigest');integer(p.expectedRevision,0,128,'/expectedRevision');id(p.placementId,'/placementId');id(p.partId,'/partId',32);if(p.paneId!==null)id(p.paneId,'/paneId',32);digest(p.definitionDigest,'/definitionDigest');
  const c=p.confirmation;fields(c,['hostCommandId','round','impactIndex','geometryRevision','geometryDigest','hostToken','queryToken','cause','point','direction','ray'],'/confirmation');
  if(p.id!==windowImpactId(c.hostCommandId,c.round,c.impactIndex))fail('INVALID_IMPACT_ID','/id','Use the exact canonical typed command/round/impact tuple.');
  if(c.impactIndex!==0)fail('UNSUPPORTED_IMPACT_INDEX','/confirmation/impactIndex','The source single-path first-hit profile supports impact index zero only.');
  integer(c.geometryRevision,0,Number.MAX_SAFE_INTEGER,'/confirmation/geometryRevision');for(const key of ['geometryDigest','hostToken','queryToken'])digest(c[key],'/confirmation/'+key);point(c.point,'/confirmation/point');
  if(!['bullet','flame'].includes(c.cause)||![1,-1].includes(c.direction))fail('UNSUPPORTED_IMPACT','/confirmation','Only the named bullet/flame first-hit policy and signed direction are supported.');
  fields(c.ray,['purpose','floorId','from','to'],'/confirmation/ray');if(c.ray.floorId!=='ground'||c.ray.purpose!==(c.cause==='flame'?'flame':'projectile'))fail('UNSUPPORTED_IMPACT','/confirmation/ray','Bind a ground ray of the matching confirmed impact purpose.');point(c.ray.from,'/confirmation/ray/from');point(c.ray.to,'/confirmation/ray/to');return p;
}
export function windowReceiptId(packet){const p=checkWindowImpact(packet),c=p.confirmation,key=JSON.stringify(['window-pane-receipt-v1',...scopeFields.map(field=>p[field]),typed(c.hostCommandId),c.round,c.impactIndex]);if(key.length>768)fail('INVALID_IMPACT_ID','/id','Derived receipt exceeds its bound.');return key;}
export function sameWindowScope(packet,state){const values=[state.profileId,state.sceneId,state.id,state.contentEpoch,state.contentDigest],codes=['WRONG_WINDOW_PROFILE','WRONG_WINDOW_SCENE','WRONG_WINDOW_STATE','STALE_CONTENT_EPOCH','CONTENT_MISMATCH'];scopeFields.forEach((field,i)=>{if(packet[field]!==values[i])fail(codes[i],'/'+field,'The command must match the current durable scope before receipt lookup.');});}
export function checkedWindowHit(compiled,packet){
  const c=packet.confirmation;if(c.geometryRevision!==compiled.queryRevision||c.geometryDigest!==compiled.geometryDigest)fail('STALE_WINDOW_GEOMETRY','/confirmation','Re-query exact current geometry with the original host identity.');
  const hit=queryWindowSegment(compiled,c.ray).nearest;
  if(!hit||hit.placementId!==packet.placementId||hit.partId!==packet.partId||hit.paneId!==packet.paneId||hit.definitionDigest!==packet.definitionDigest||['x','y','h'].some(key=>Math.abs(hit.point[key]-c.point[key])>1e-7))fail('IMPACT_GEOMETRY_MISMATCH','/confirmation/point','The named current native member must be the first window hit at the exact ray entry point.');
  const p=readCompiled(compiled).document.placements.find(p=>p.id===hit.placementId),r=(p.rotation??0)*Math.PI/180,localZ=Math.round(Math.sin(r))*(c.ray.from.x-p.x)+Math.round(Math.cos(r))*(c.ray.from.y-p.y);
  if(c.direction!==(localZ<0?1:-1))fail('IMPACT_GEOMETRY_MISMATCH','/confirmation/direction','Direction must match the source local origin side.');return hit;
}
export function ownService(input,keys,path){
  if(!plain(input))fail('MISSING_BINDING',path,'Bind explicit own service data properties.');const result={};
  for(const key of Reflect.ownKeys(input)){const d=Object.getOwnPropertyDescriptor(input,key);if(typeof key!=='string'||!keys.includes(key)||!d.enumerable||!Object.hasOwn(d,'value'))fail('INVALID_BINDING',path,'Unknown, hidden or accessor service fields are unsupported.');result[key]=d.value;}
  for(const key of keys)if(!Object.hasOwn(result,key))fail('MISSING_BINDING',path+'/'+key,'A required service field is missing.');return result;
}
// Binding a trusted callback is an explicit host act. A query observation or
// client boolean cannot be used in place of this opaque authority handle.
export function createWindowImpactAuthority(input){const service=ownService(input,['version','confirm'],'/authority');if(service.version!==1||typeof service.confirm!=='function')fail('MISSING_BINDING','/authority','Bind the trusted version-1 confirmation function.');const authority=Object.freeze({});authorities.set(authority,{confirm:service.confirm,active:true,running:false});return authority;}
export function retireWindowImpactAuthority(authority){const service=authorities.get(authority);if(service)service.active=false;}
export function authorizeWindowImpact(authority,packet,hit){
  const service=authorities.get(authority);if(!service?.active)fail('UNCONFIRMED_IMPACT','/authority','Only an active explicitly bound trusted confirmation can authorize a fresh impact.');
  if(service.running)fail('REENTRANT_CONFIRMATION','/authority','Finish the current confirmation before reusing its authority.');
  const loan=clone({command:packet,hit}),before=canonical(loan);let response;service.running=true;try{response=service.confirm(loan);}finally{service.running=false;}
  if(!service.active)fail('UNCONFIRMED_IMPACT','/authority','The trusted confirmation retired before staging.');if(canonical(data(loan))!==before)fail('IMPURE_CONFIRMATION','/authority','A confirmation service cannot mutate its detached input.');
  const expected=windowImpactAttestation(packet);if(canonical(data(response))!==canonical(expected))fail('UNCONFIRMED_IMPACT','/authority','The trusted authority must attest this exact scoped geometry/query/host impact.');
}
export function windowImpactAttestation(packet){const p=checkWindowImpact(packet);return {kind:'trusted-window-impact-attestation',version:1,impactId:p.id,receiptId:windowReceiptId(p),geometryDigest:p.confirmation.geometryDigest,hostToken:p.confirmation.hostToken,queryToken:p.confirmation.queryToken};}
