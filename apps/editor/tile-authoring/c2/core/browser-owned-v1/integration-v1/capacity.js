// Pre-Native real-source head capacity. Full actual WAL branches are a later
// mandatory guard; this conservative data result grants no ticket/write credit.
import {kernelSourceAccess} from './kernel.js';
import {actualJournalAccess} from './journal.js';
import {sourceAccess} from './owner.js';
import {HOST_LIMITS} from '../capacity.js';
import {hash,equal,fail,captureShape} from '../data.js';
import {jsonBytes} from '../budget.js';
import {finishData} from '../output.js';
import {PROFILE_DIGEST,SCOPE} from '../contract.js';
const bounds=new WeakMap();
const need=(v,c,p,m)=>{if(!v)fail(c,p,m);};
function dimensions(v,b,depth=0){b.take();let nodes=1,maxDepth=depth;if(v&&typeof v==='object')for(const x of Object.values(v)){const z=dimensions(x,b,depth+1);nodes+=z.nodes;maxDepth=Math.max(maxDepth,z.depth);}return {nodes,depth:maxDepth};}
export function deriveActualCapacity(owner,t,p,input,b){
 const access=sourceAccess(owner),{a}=access.current();access.requirePurpose('authoring');
 // Read only own identity-bearing ports before inspecting any actual data.
 const expected=['kernel','journal','head','selected','obligations','source','work'];if(!input||typeof input!=='object'||![Object.prototype,null].includes(Object.getPrototypeOf(input)))fail('C2_CAPACITY_PORTS','/capacity','Own actual source ports required.');for(const key of Reflect.ownKeys(input)){const d=Object.getOwnPropertyDescriptor(input,key);if(typeof key!=='string'||!expected.includes(key)||!d?.enumerable||!Object.hasOwn(d,'value'))fail('C2_CAPACITY_PORTS','/capacity','No getters, DTO count reports or history arrays.');}for(const key of expected)need(Object.hasOwn(input,key),'C2_CAPACITY_PORTS','/'+key,'Every actual source port is explicit.');
 const {kernel,journal,head,selected,obligations,source,work}=input,k=kernelSourceAccess(kernel,owner),j=actualJournalAccess(journal,owner);need(j.kernel===kernel&&access.verifyAttempt(work)===a,'C2_CAPACITY_OWNER','/capacity','Same actual owner, codec, journal and original attempt required.');
 const hr=journal.requireHead(head,work);journal.requireObligations(obligations,work,head);kernel.requireCheckpoint(source);
 need(!head.data.pendingTicket&&hr.action===p.plan.original.action,'C2_CAPACITY_HEAD','/head','A settled exact-action actual head is required.');
 const c=k.binding.codec.open(source);need(c===source&&c.journal.pending===null&&c.journal.receipts.length<128,'C2_CAPACITY_SOURCE','/checkpoint','A real settled codec-owned checkpoint with receipt room is required.');
 need(equal(t,c.document,p.before,b)&&k.binding.codec.token(c)===p.plan.original.expected.hostAuthorityToken,'C2_CAPACITY_SOURCE','/checkpoint','The actual checkpoint must match the owned Core plan and original Host token.');
 need(!c.journal.receipts.some(r=>r.id===p.plan.original.requestId),'C2_REQUEST_REUSED','/journal','Do not buy new capacity for a retained original ID.');
 need(hash(t,c.journal,b)===p.plan.sourceCapture.history.journalDigest&&head.data.generation===p.plan.sourceCapture.history.generation&&head.data.stateDigest===p.plan.sourceCapture.history.stateDigest,'C2_CAPACITY_CAPTURE','/history','Owned Core capture must describe this same actual source journal and head.');
 const sf=kernel.documentFacts(c.document),tf=kernel.documentFacts(p.plan.targetDocument);need(sf.data.documentDigest===head.data.currentDocumentDigest&&sf.data.encodedBytes===head.data.currentDocumentBytes,'C2_CAPACITY_SOURCE','/head','Actual history document text and source facts must agree.');
 if(hr.action==='edit')need(selected===null,'C2_CAPACITY_SELECTION','/selected','An edit has no selected history target.');else{const s=journal.requireSelected(selected,work,head);need(s.fact.data.documentDigest===p.plan.targetHostDocumentDigest&&equal(t,s.document,p.plan.targetDocument,b),'C2_CAPACITY_SELECTION','/selected','The actual one selected full history target must equal the owned Core target.');}
 const h=head.data,oldBytes=h.undo.encodedBytes+h.redo.encodedBytes;
 const historyEntries=hr.action==='edit'?h.undo.entries+1:h.undo.entries+h.redo.entries;
 const historyBytes=hr.action==='edit'?h.undo.encodedBytes+sf.data.encodedBytes:oldBytes-tf.data.encodedBytes+sf.data.encodedBytes;
 const before=jsonBytes(c),target=tf.data.encodedBytes,command=jsonBytes(p.plan.command),request=jsonBytes(p.plan.original.hostRequest),origin=jsonBytes(p.plan.original),current=dimensions(c,b),next={nodes:tf.data.nodes,depth:tf.data.depth},op=dimensions(p.plan.command,b),original=dimensions(p.plan.original,b);
 const upperBounds={walBytes:3*before+4*target+4*(command+request+origin)+65536,historyBytes,checkpointNodes:3*current.nodes+4*next.nodes+4*(op.nodes+original.nodes)+4096,checkpointDepth:Math.max(current.depth,next.depth+6,op.depth+8,original.depth+8),historyEntries,receipts:c.journal.receipts.length+1};
 for(const [key,max]of Object.entries({walBytes:HOST_LIMITS.checkpointBytes,historyBytes:Math.min(HOST_LIMITS.historyBytes,h.limits.maxBytes),checkpointNodes:HOST_LIMITS.checkpointNodes,checkpointDepth:HOST_LIMITS.checkpointDepth,historyEntries:Math.min(64,h.limits.maxEntries),receipts:128}))need(Number.isSafeInteger(upperBounds[key])&&upperBounds[key]>=0&&upperBounds[key]<=max,'C2_CAPACITY_EXHAUSTED','/upperBounds/'+key,'The actual source-bound conservative envelope does not fit.');
 need(target<=h.limits.maxDocumentBytes,'C2_CAPACITY_EXHAUSTED','/target','The actual full target must fit the same real journal.');
 // All actual historical ResourceRefs come from the paid scan, including frames
 // outside the selected head. The full set is retained in the private bound.
 const ledger=p.plan.sourceCapture.ledger,chargedBefore=b.snapshot().unitsCharged;
 const result={kind:'nautilus-tile-authoring-browser-capacity-bound',version:1,committable:false,accountingScope:SCOPE,profileDigest:PROFILE_DIGEST,original:p.plan.original,sourceCheckpointToken:p.plan.original.expected.hostAuthorityToken,targetHostDocumentDigest:p.plan.targetHostDocumentDigest,sourceJournalDigest:hash(t,c.journal,b),sourceHistoryGeneration:h.generation,sourceHistoryStateDigest:h.stateDigest,governingLimitsDigest:hash(t,{authoring:p.plan.limits,host:HOST_LIMITS},b),limits:HOST_LIMITS,upperBounds,work:{chargedBefore,chargeThisPhase:0,chargedAfter:chargedBefore},sourceOwnerLifetimeId:ledger.ownerLifetimeId,sourceLedgerScopeDigest:ledger.scopeDigest,sourceMutationEpoch:ledger.mutationEpoch,planDigest:hash(t,p.plan,b),attemptBudget:b.stamp(v=>hash(t,v,b)),basis:'conservative-headless-data-bound'};
 result.work.chargedAfter=b.snapshot().unitsCharged;result.work.chargeThisPhase=result.work.chargedAfter-chargedBefore;captureShape(t,'BrowserCapacityBound',result,b);const value=finishData(result,b);bounds.set(value,{owner,attempt:a,plan:p.plan,kernel,journal,head,source,selected,obligations,work,actualWalValidated:false});return value;
}
export function actualCapacityAccess(value,owner){const x=bounds.get(value);if(!x||x.owner!==owner)fail('C2_CAPACITY_UNBOUND','/capacity','Actual source-owned same-owner capacity required.');return x;}
