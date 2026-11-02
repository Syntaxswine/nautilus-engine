/** Documentation of the PRIVATE construction seam in the pinned meter.js.
 * Not exported by the JSON/consumer API; not an Artist/Host/Native counter.
 * Do not fund execution from callbacks, reports or a DTO. Actual trusted Core
 * implementation alone invokes this seam. All other backends remain UNBOUND.
 */
type Phase='source'|'planning'|'capacity'|'prepared-data'|'final-bind'|'final-guard'|'cleanup'|'actual-wal';
type MetadataFlow='inputBytes'|'outputBytes'|'copyBytes';
interface PrivateCoreSink {
 take(actualCoreReferenceDelta:number):void;
 flow(kind:MetadataFlow,octets:number):void;
 flowMany(raw:Partial<Record<MetadataFlow,number>>):void;
 control(actualOwnerFieldVisits:number):void;
 bindSource(paidVerifiedCompleteSourceDigest:string):void;
 sourceDigest():string|null;
 snapshot():import('./files/candidates/tile-authoring/core/c2/browser-owned-v1/index.js').WorkSnapshot;
 budget:object|null;
 setBudget(actualCoreBudget:object):void;
 stamp(hash:(observation:object)=>string):import('./files/candidates/tile-authoring/core/c2/browser-owned-v1/types.js').AttemptBudgetStamp;
 verifyStamp(data:import('./files/candidates/tile-authoring/core/c2/browser-owned-v1/types.js').AttemptBudgetStamp):boolean;
}
interface PrivateCorePair {
 readonly profileDigest:string;
 execute<T>(attempt:import('./files/candidates/tile-authoring/core/c2/browser-owned-v1/index.js').Attempt,reservation:import('./files/candidates/tile-authoring/core/c2/browser-owned-v1/index.js').Reservation,phase:Phase,originalOpaqueSource:object,actualCoreOperation:(sink:PrivateCoreSink)=>T):T;
}
// pairCoreOwner(actualOwner) returns PrivateCorePair. This is internal source
// documentation, not a consumer registration API. No actual external sink pair,
// decoder work observer, native resource authority, Host/WAL or history owner is
// implemented or enabled by this packet. No asynchronous/thenable operations.
