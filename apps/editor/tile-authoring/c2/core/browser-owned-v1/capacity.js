// Conservative grammar-derived DATA envelope bound. Actual Host/WAL counters
// remain UNBOUND; this result grants no write, admission or request credit.
import {fields,readData,hash,equal,captureShape,fail} from './data.js';
import {jsonBytes} from './budget.js';
import {PROFILE_DIGEST,SCOPE,BROWSER_SCHEMA} from './contract.js';
import {finishData} from './output.js';
const hostLimits=BROWSER_SCHEMA.$defs.BrowserCapacityBound.properties.limits;
export const HOST_LIMITS=Object.freeze(Object.fromEntries(Object.entries(hostLimits.properties).map(([k,v])=>[k,v.const])));
function dimensions(v,b,depth=0){b.take();let nodes=1,maxDepth=depth;if(v&&typeof v==='object')for(const x of Object.values(v)){const z=dimensions(x,b,depth+1);nodes+=z.nodes;maxDepth=Math.max(maxDepth,z.depth);}return {nodes,depth:maxDepth};}
export function deriveDataCapacity(t,p,raw,b){
 const v=readData(raw,b,b.limits.inputBytes);fields(v,['checkpoint','history'],'/capacity');
 // Headless inputs are already complete data, never a placeholder ticket/WAL.
 const c=v.checkpoint;fields(c,['kind','version','document','journal'],'/checkpoint');
 if(c.kind!=='nautilus-tile-authoring-editor-checkpoint'||c.version!==3)fail('BROWSER_CHECKPOINT_KIND','/checkpoint','Exact editor checkpoint v3 data required.');
 const j=c.journal;fields(j,['kind','version','serial','receipts','pending'],'/journal');
 if(j.kind!=='nautilus-tile-authoring-editor-journal'||j.version!==3||!Number.isSafeInteger(j.serial)||j.serial<0||!Array.isArray(j.receipts)||j.pending!==null||j.receipts.length>=128)fail('BROWSER_JOURNAL_CAPACITY','/journal','Settled bounded journal data with room for one receipt required.');
 if(!equal(t,c.document,p.before,b)||hash(t,j,b)!==p.plan.sourceCapture.history.journalDigest)fail('BROWSER_CAPACITY_SOURCE','/checkpoint','Complete original checkpoint and journal must match.');
 if(j.receipts.some(x=>x?.id===p.plan.original.requestId))fail('BROWSER_REQUEST_REUSED','/journal','Never reserve fresh work for a retained original request.');
 const h=v.history;fields(h,['generation','stateDigest','undo','redo'],'/history');
 if(h.generation!==p.plan.sourceCapture.history.generation||h.stateDigest!==p.plan.sourceCapture.history.stateDigest||!Array.isArray(h.undo)||!Array.isArray(h.redo)||h.undo.length+h.redo.length>=64)fail('BROWSER_HISTORY_CAPACITY','/history','Keep original history generation/state and all retained frames.');
 // Every retained frame is the full exact checkpoint text, counted before parse.
 let historyBytes=0,historyNodes=0,depth=0;
 for(const text of [...h.undo,...h.redo]){if(typeof text!=='string')fail('BROWSER_HISTORY_TEXT','/history','Full retained frame texts required.');historyBytes+=jsonBytes(text);const frame=readData(text,b,b.limits.inputBytes,{chargeInput:false}),z=dimensions(frame,b);historyNodes+=z.nodes;depth=Math.max(depth,z.depth);}
 const before=jsonBytes(c),target=jsonBytes(p.plan.targetDocument),command=jsonBytes(p.plan.command),request=jsonBytes(p.plan.original.hostRequest),origin=jsonBytes(p.plan.original);
 // Deliberately overbound the closed v3 stage and both settle branches: retain
 // current frame/journal three times, source/target four times, command/origin
 // four times, plus 64KiB fixed fields. No fabricated future host operation.
 const walBytes=3*before+4*target+4*(command+request+origin)+65536;
 const current=dimensions(c,b),next=dimensions(p.plan.targetDocument,b),op=dimensions(p.plan.command,b),original=dimensions(p.plan.original,b);
 const upperBounds={walBytes,historyBytes:historyBytes+walBytes+before,checkpointNodes:3*current.nodes+4*next.nodes+4*(op.nodes+original.nodes)+4096,checkpointDepth:Math.max(current.depth,next.depth+6,op.depth+8,original.depth+8,depth),historyEntries:h.undo.length+h.redo.length+1,receipts:j.receipts.length+1};
 for(const [k,max]of Object.entries({walBytes:HOST_LIMITS.checkpointBytes,historyBytes:HOST_LIMITS.historyBytes,checkpointNodes:HOST_LIMITS.checkpointNodes,checkpointDepth:HOST_LIMITS.checkpointDepth,historyEntries:64,receipts:128}))if(upperBounds[k]>max)fail('BROWSER_CAPACITY_EXHAUSTED','/upperBounds/'+k,'Conservative whole data bounds do not fit.');
 const source=p.plan.sourceCapture.ledger,chargedBefore=b.snapshot().unitsCharged;
 const result={kind:'nautilus-tile-authoring-browser-capacity-bound',version:1,committable:false,accountingScope:SCOPE,profileDigest:PROFILE_DIGEST,original:p.plan.original,sourceCheckpointToken:p.plan.original.expected.hostAuthorityToken,targetHostDocumentDigest:p.plan.targetHostDocumentDigest,sourceJournalDigest:p.plan.sourceCapture.history.journalDigest,sourceHistoryGeneration:h.generation,sourceHistoryStateDigest:h.stateDigest,governingLimitsDigest:hash(t,{authoring:p.plan.limits,host:HOST_LIMITS},b),limits:HOST_LIMITS,upperBounds,work:{chargedBefore,chargeThisPhase:0,chargedAfter:chargedBefore},sourceOwnerLifetimeId:source.ownerLifetimeId,sourceLedgerScopeDigest:source.scopeDigest,sourceMutationEpoch:source.mutationEpoch,planDigest:hash(t,p.plan,b),attemptBudget:b.stamp(v=>hash(t,v,b)),basis:'conservative-headless-data-bound'};
 // Work is a checkpoint observation BEFORE the output, never a carried credit.
 result.work.chargedAfter=b.snapshot().unitsCharged;result.work.chargeThisPhase=result.work.chargedAfter-chargedBefore;
 captureShape(t,'BrowserCapacityBound',result,b);return finishData(result,b);
}
