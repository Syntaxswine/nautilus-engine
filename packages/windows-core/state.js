import {WINDOW_GEOMETRY_CONTRACT as C,WINDOW_PANE_CONTRACT as P,WINDOW_HOST_SERVICES} from './contract.js';
import {data,fields,id,integer,canonical,clone,freeze,fail} from './data.js';
import {readCompiled,reviseWindowGeometry} from './compiler.js';
import {checkWindowImpact,windowReceiptId,sameWindowScope,checkedWindowHit,authorizeWindowImpact,digest,ownService} from './impact.js';
const known=new WeakMap();
function remember(state,base,geometry){data(state);freeze(state);known.set(state,{base,geometry});return state;}
export function requireWindowState(state){const value=known.get(state);if(!value)fail('WINDOW_STATE_REQUIRED','/state','Use a validated immutable state returned by create/open/stage.');return value;}
export const windowStateGeometry=state=>requireWindowState(state).geometry;
export const windowStateBaseGeometry=state=>requireWindowState(state).base;
export function createWindowState(compiled,input){
  const options=data(input);fields(options,['id','contentEpoch','broken'],'/options');id(options.id,'/options/id');id(options.contentEpoch,'/options/contentEpoch');const initial=readCompiled(compiled);
  if(canonical(options.broken)!==canonical(initial.document.observedBroken))fail('INITIAL_MASK_MISMATCH','/options/broken','A fresh epoch must explicitly match the compiled host observation. Never use construction to restore a saved journal.');
  return remember({kind:P.kind,version:1,id:options.id,profileId:C.profileId,sceneId:compiled.sceneId,contentEpoch:options.contentEpoch,contentDigest:compiled.contentDigest,initial:{broken:clone(options.broken),geometryRevision:compiled.queryRevision,geometryDigest:compiled.geometryDigest},revision:0,geometryRevision:compiled.queryRevision,geometryDigest:compiled.geometryDigest,broken:clone(options.broken),receipts:[]},compiled,compiled);
}
function transition(base,state,geometry,packet){
  const hit=checkedWindowHit(geometry,packet),broken=clone(state.broken),outcome=hit.kind==='glass'?'pane-broken':'solid-hit';
  if(outcome==='pane-broken'){const panes=Object.hasOwn(broken,hit.placementId)?broken[hit.placementId]:[];Object.defineProperty(broken,hit.placementId,{value:[...panes,hit.paneId],enumerable:true,writable:true,configurable:true});}
  integer(geometry.queryRevision+1,0,Number.MAX_SAFE_INTEGER,'/geometryRevision');const nextGeometry=reviseWindowGeometry(geometry,broken,geometry.queryRevision+1),receipt={id:windowReceiptId(packet),type:'confirmed-window-impact',command:clone(packet),revision:state.revision+1,outcome,geometryBefore:geometry.geometryDigest,geometryAfter:nextGeometry.geometryDigest,effects:[]};
  return {geometry:nextGeometry,receipt,state:{...state,revision:state.revision+1,geometryRevision:nextGeometry.queryRevision,geometryDigest:nextGeometry.geometryDigest,broken,receipts:[...state.receipts,receipt]}};
}
export function openWindowState(compiled,input){
  readCompiled(compiled);const s=data(input);fields(s,['kind','version','id','profileId','sceneId','contentEpoch','contentDigest','initial','revision','geometryRevision','geometryDigest','broken','receipts'],'');
  if(s.kind!==P.kind||s.version!==1||s.profileId!==C.profileId||s.sceneId!==compiled.sceneId||s.contentDigest!==compiled.contentDigest)fail('CONTENT_MISMATCH','/','Pane state must bind the exact scene/profile/content.');id(s.id,'/id');id(s.contentEpoch,'/contentEpoch');digest(s.geometryDigest,'/geometryDigest');fields(s.initial,['broken','geometryRevision','geometryDigest'],'/initial');
  const fresh=createWindowState(compiled,{id:s.id,contentEpoch:s.contentEpoch,broken:s.initial.broken});if(canonical(fresh.initial)!==canonical(s.initial))fail('CONTENT_MISMATCH','/initial','Initial observations and geometry tokens must match the preserved base snapshot.');
  integer(s.revision,0,P.maximumReceipts,'/revision');if(!Array.isArray(s.receipts)||s.receipts.length!==s.revision)fail('INVALID_JOURNAL','/receipts','Retain the complete journal; revision equals its length.');
  let current=fresh,geometry=compiled;const seen=new Set();
  for(const [i,r]of s.receipts.entries()){
    const p=checkWindowImpact(r.command);sameWindowScope(p,current);const key=windowReceiptId(p);if(seen.has(key)||p.expectedRevision!==i)fail('INVALID_JOURNAL','/receipts/'+i,'Receipt identities and revisions must be complete and unique.');seen.add(key);
    const replay=transition(compiled,current,geometry,p);if(canonical(r)!==canonical(replay.receipt))fail('INVALID_JOURNAL','/receipts/'+i,'Receipt differs from deterministic native-member replay.');current=replay.state;geometry=replay.geometry;
  }
  if(canonical(s)!==canonical(current))fail('STATE_MISMATCH','/','Current masks/tokens must equal complete journal replay.');return remember(s,compiled,geometry);
}
export function serializeWindowState(state){requireWindowState(state);return canonical(state);}
export function stageConfirmedWindowImpact(compiled,state,input,options={}){
  const {base,geometry}=requireWindowState(state);readCompiled(compiled);const p=checkWindowImpact(input);sameWindowScope(p,state);const key=windowReceiptId(p),prior=state.receipts.find(r=>r.id===key),result={ok:false,code:null,reason:'',next:state,receipt:null,repeated:false,effects:[],consequences:[],expected:{state:serializeWindowState(state),geometryDigest:geometry.geometryDigest,geometryRevision:geometry.queryRevision}};
  if(prior)return canonical(prior.command)===canonical(p)?{...result,ok:true,receipt:clone(prior),repeated:true}:{...result,code:'COMMAND_ID_CONFLICT',reason:'This durable identity already names a changed payload.'};
  if(p.expectedRevision!==state.revision)return {...result,code:'STALE_WINDOW_REVISION',reason:'The pane revision changed.'};
  if(compiled.geometryDigest!==geometry.geometryDigest||compiled.contentDigest!==state.contentDigest)return {...result,code:'STALE_WINDOW_GEOMETRY',reason:'Use the exact current state geometry.'};
  if(state.revision===P.maximumReceipts)return {...result,code:'JOURNAL_LIMIT',reason:'Retain every receipt; explicit archival/migration is required at capacity.'};
  const hit=checkedWindowHit(geometry,p);if(!Object.hasOwn(options??{},'authority'))fail('UNCONFIRMED_IMPACT','/authority','Bind the trusted confirmation authority.');const {authority}=ownService(options,['authority'],'/options');authorizeWindowImpact(authority,p,hit);
  const next=transition(base,state,geometry,p),owned=remember(next.state,base,next.geometry),effects=next.receipt.outcome==='pane-broken'?[{type:'window-pane-broken',receiptId:key,placementId:p.placementId,paneId:p.paneId,point:clone(p.confirmation.point),direction:p.confirmation.direction,cause:p.confirmation.cause}]:[];
  return {...result,ok:true,next:owned,receipt:clone(next.receipt),effects,consequences:[{type:'invalidate-window-geometry',receiptId:key,geometryDigest:next.geometry.geometryDigest,geometryRevision:next.geometry.queryRevision}]};
}
export function windowRequirements(value){const geometry=known.has(value)?windowStateGeometry(value):value,authored=readCompiled(geometry).document.placements.length>0;return {schema:{id:P.kind,version:1},required:authored?[{id:P.capability,minVersion:1,maxVersion:1},...WINDOW_HOST_SERVICES.map(({id,minVersion,maxVersion})=>({id,minVersion,maxVersion}))]:[],optional:[]};}
