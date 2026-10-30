// Test-only identity/negotiation oracle for the proposed ABI. No pane state
// transitions, provider, live commit, renderer or public entry is implemented.
export const PROPOSED_WINDOW_HOST_SERVICES=Object.freeze([
  {id:'fixed-window-definitions-v1',action:'Bind a fixed content lookup and verify definition/content digests before connecting panes.'},
  {id:'complete-window-query-composition-v1',action:'Bind complete current world/member/actor queries; a window-only candidate cannot confirm the nearest world hit.'},
  {id:'confirmed-impact-authority-v1',action:'Bind the trusted host impact boundary with stable typed host command, round and impact identities.'},
  {id:'atomic-window-context-commit-v1',action:'Bind atomic state/context/host comparison and the final active write fence; preserve original IDs on unknown outcomes.'},
  {id:'window-geometry-invalidation-v1',action:'Bind current geometry/route invalidation and publication after an acknowledged commit.'},
  {id:'complete-window-save-staging-v1',action:'Bind whole-save staging that preserves scope, content epoch, durable journal and retained host resources.'}
].map(service=>Object.freeze({...service,minVersion:1,maxVersion:1})));
const scopeFields=['profileId','sceneId','stateId','contentEpoch','contentDigest'];
function reject(code,path,message){const error=new TypeError(message);error.code=code;error.path=path;throw error;}
function identifier(value,path){if(typeof value!=='string'||!/^[A-Za-z0-9][A-Za-z0-9_.:/-]{0,95}(?![\s\S])/.test(value))reject('INVALID_ID',path,'Use a bounded ASCII string scope identity.');return value;}
function hostId(value){if(typeof value==='string')return ['string',identifier(value,'/confirmation/hostCommandId')];if(Number.isSafeInteger(value)&&!Object.is(value,-0))return ['integer',value];reject('INVALID_HOST_COMMAND_ID','/confirmation/hostCommandId','Use a bounded ASCII string or safe integer; negative zero, coercion and nonfinite IDs are unsupported.');}
function index(value,path){if(!Number.isSafeInteger(value)||value<0||value>65535||Object.is(value,-0))reject('INVALID_IMPACT_INDEX',path,'Use an unsigned zero-based integer from 0 to 65535.');return value;}
function revision(value,path){if(!Number.isSafeInteger(value)||value<0||value>128)reject('INVALID_REVISION',path,'Use a complete bounded window journal revision.');return value;}
export function proposalCanonical(value){
  if(value===null||typeof value==='boolean'||typeof value==='string')return JSON.stringify(value);
  if(typeof value==='number'&&Number.isFinite(value))return JSON.stringify(value);
  if(Array.isArray(value))return '['+value.map(proposalCanonical).join(',')+']';
  if(value&&typeof value==='object'&&[Object.prototype,null].includes(Object.getPrototypeOf(value)))return '{'+Object.keys(value).sort().map(key=>JSON.stringify(key)+':'+proposalCanonical(value[key])).join(',')+'}';
  reject('INVALID_PROPOSAL_DATA','/','Identity fixtures require finite JSON data.');
}
function scope(input){for(const field of scopeFields.slice(0,4))identifier(input[field],'/'+field);if(typeof input.contentDigest!=='string'||!/^[a-f0-9]{64}(?![\s\S])/.test(input.contentDigest))reject('INVALID_CONTENT_DIGEST','/contentDigest','Use the exact compiled-content SHA-256.');return input;}
export function proposalImpactId(hostCommandId,round,impactIndex){return JSON.stringify(['window-impact-v1',hostId(hostCommandId),index(round,'/confirmation/round'),index(impactIndex,'/confirmation/impactIndex')]);}
export function proposalReceiptId(packet){
  scope(packet);if(packet.version!==1)reject('UNSUPPORTED_COMMAND','/version','Use impact packet version 1.');
  const {hostCommandId,round,impactIndex}=packet.confirmation,impact=proposalImpactId(hostCommandId,round,impactIndex);
  if(packet.id!==impact)reject('INVALID_IMPACT_ID','/id','Packet id must exactly equal the canonical typed host-command/round/impact tuple.');
  return JSON.stringify(['window-pane-receipt-v1',...scopeFields.map(field=>packet[field]),hostId(hostCommandId),round,impactIndex]);
}
function sameScope(packet,current){
  scope(current);const codes=['WRONG_WINDOW_PROFILE','WRONG_WINDOW_SCENE','WRONG_WINDOW_STATE','STALE_CONTENT_EPOCH','CONTENT_MISMATCH'];
  scopeFields.forEach((field,index)=>{if(packet[field]!==current[field])reject(codes[index],'/'+field,'Impact scope must match the current saved '+field+'; original receipts cannot migrate to a new epoch.');});
}
export function proposalReceipt(packet,outcome='pane-broken'){return {id:proposalReceiptId(packet),type:'confirmed-window-impact',command:structuredClone(packet),revision:packet.expectedRevision+1,outcome,effects:[]};}
export function inspectProposalJournal(journal){
  scope(journal.scope);revision(journal.revision,'/revision');if(!Array.isArray(journal.receipts)||journal.receipts.length!==journal.revision)reject('INVALID_JOURNAL','/receipts','Preserve every receipt; revision equals complete journal length.');
  const ids=new Set();for(const [index,receipt]of journal.receipts.entries()){
    const packet=receipt.command;sameScope(packet,journal.scope);const id=proposalReceiptId(packet);proposalCanonical(packet);
    if(ids.has(id)||receipt.id!==id||receipt.type!=='confirmed-window-impact'||packet.expectedRevision!==index||receipt.revision!==index+1||!['pane-broken','solid-hit'].includes(receipt.outcome)||!Array.isArray(receipt.effects)||receipt.effects.length)reject('INVALID_JOURNAL','/receipts/'+index,'The fixture journal identity/revision/receipt is inconsistent.');ids.add(id);
  }
  return journal;
}
// Classifies structural identity only. A fresh identity still needs all future
// source-profile, confirmed-hit, complete-world, content and save validation.
export function classifyProposalImpact(journal,packet,{geometryRevision=journal.revision}={}){
  inspectProposalJournal(journal);sameScope(packet,journal.scope);const id=proposalReceiptId(packet),payload=proposalCanonical(packet),prior=journal.receipts.find(receipt=>receipt.id===id);
  if(prior)return proposalCanonical(prior.command)===payload?{status:'repeat',receiptId:id,effects:[]}:{status:'refused',code:'COMMAND_ID_CONFLICT',receiptId:id,effects:[]};
  revision(packet.expectedRevision,'/expectedRevision');if(packet.expectedRevision!==journal.revision)return {status:'refused',code:'STALE_WINDOW_REVISION',receiptId:id,effects:[]};
  if(packet.confirmation.geometryRevision!==geometryRevision)return {status:'refused',code:'STALE_WINDOW_GEOMETRY',receiptId:id,effects:[]};
  if(journal.revision===128)return {status:'refused',code:'JOURNAL_LIMIT',receiptId:id,effects:[]};
  return {status:'fresh-identity',receiptId:id,effects:[]};
}
