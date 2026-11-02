/** PRIVATE connector ports. Proposed before implementation; not public grammar,
 * a Host factory, meter implementation or authority inferred from copied data.
 */
import type {WorkbenchDocument,Expected,Graphic,Mask,Pin,Command} from '../../../../packages/tile-authoring-core/index.js';
import type {ExistingC1Read,Observation,Form,Basis,BuiltinArtworkPack} from './vendor/ui057/projection.js';
export type DeepRead<T>=T extends readonly unknown[]?{readonly[K in keyof T]:DeepRead<T[K]>}:T extends object?{readonly[K in keyof T]:DeepRead<T[K]>}:T;
export interface CompleteRead<R=unknown,B=unknown> extends ExistingC1Read {
 readonly snapshot:{readonly document:DeepRead<WorkbenchDocument<R,B>>;readonly expected:DeepRead<Expected>;readonly source?:unknown;readonly hostProtocolVersion?:1;readonly missingBindings?:readonly string[]};
 readonly presentation:ExistingC1Read['presentation'] & Readonly<{
  command:DeepRead<Command<R>>|null;scope:string;targetOwnerIds:readonly string[];selectedCaptureMarkIds:readonly string[];
  review:Readonly<{requestId:string;reviewToken:string}>|null;
  outcome:Readonly<{outcome:'committed'|'rejected'|'unknown';committed:boolean|null;requestId:string;presentation?:'ready'|'pending'|'failed';writesFrozen?:true;recoveryRequestId?:string}>|null;
  actions:Readonly<Record<string,{readonly enabled:boolean;readonly diagnostics:readonly unknown[]}>>;
 }>;
 readonly commandJSON?:string|null;
}
export interface SourceReadOwner<Source,R=unknown,B=unknown> {
 /** Existing source owner returns its actual complete source/read, drawing floor
  * and OWNED nonserializable source handle. No DTO digest grants recognition. */
 capture(actualWorkbenchRead:CompleteRead<R,B>):Readonly<{scope:Source;read:CompleteRead<R,B>;floorId:string;observation:Observation|null;phase:'idle'|'draft'|'preparing'|'review'|'applying'|'recovery-required'|'presentation-error';originalRequestId:string|null}>;
 isCurrent(scope:Source,actualWorkbenchRead:CompleteRead<R,B>):boolean;
 /** Actual existing owner/context identities, not UI-minted authority names. */
 observe(scope:Source):Readonly<{sourceGeneration:number;ownerLifetimeId:string;contextId:string;contextEpoch:number;mutationEpoch:number}>;
}
export type GraphicField='form'|'positionM'|'sizeM'|'rotationRad'|'mirrorU'|'pivotUV'|'opacity'|'tintLinearRGB'|'mask';
export interface FormInputOwner<Read> {
 /** First/add full forms in057/5a7 carry no touched provenance. Root must pair
  * actual input with this exact form. Missing provenance is UNBOUND; never infer
  * touch from inequality with a hard-coded UI default. This is intent, not auth. */
 touched(actualIssuedRead:Read,actualForm:Form):readonly GraphicField[]|null;
}
export interface SurfaceResult {
 readonly kind:'nautilus-tile-authoring-surface-target';readonly version:1;readonly ok:true;readonly committable:false;
 readonly sourceDocumentDigest:string;readonly workspaceRevision:number;
 readonly surface:unknown;readonly bindingSeed:unknown;readonly target:unknown;readonly grid:unknown;
 readonly state:'existing'|'prospective';readonly existingBinding:unknown|null;readonly work:unknown;
}
export interface PreparationBinding<Source> {
 /** Observes the actual SAME-session reviewed Core/native/meter connection.
  * Starts no attempt. Inspection work and encoded bytes grant no readiness.
  * Leave UNBOUND until that actual session preparation path is reviewed. */
 isBound(source:Source,service:object):boolean;
}
export type BytePreflight<Capability>=Readonly<{status:'verified';basis:Basis;artwork:Pin;bytes:Capability}>|Readonly<{status:'refused';basis:Basis;diagnostics:readonly unknown[]}>;
/** Exact accepted d8 API. Encoded-byte preflight is never native readiness. */
export interface SelectedArtworkOwner<Read,Attempt,Capability> {
 resolveRetainedBytes(read:Read,artwork:Pin):BytePreflight<Capability>;
 constructBuiltinDependencyPrefix(read:Read,artwork:Pin):Readonly<{status:'validated';basis:Basis;artwork:Pin;packs:readonly [BuiltinArtworkPack,...BuiltinArtworkPack[]];bytes:Capability}>|Readonly<{status:'refused';basis:Basis;diagnostics:readonly unknown[]}>;
 isByteScopeCurrent(bytes:Capability):boolean;
 observeByteScope(bytes:Capability):Readonly<{basis:Basis;artwork:Pin;sourceDigest:string;editingWorkCredit:0}>;
 /** LATER real session.prepare only; pre-command construction never calls it. */
 forAuthoringAttempt(bytes:Capability,attempt:Attempt):Readonly<{status:'borrowed';bytes:Capability}>|Readonly<{status:'refused';code:string}>;
}
export interface SelectedBytesBinding<Read,Capability> {
 /** Existing host retains the selected acquisition lease. Non-owning lookup
  * only; bridge never acquires, copies, retains, releases or caches PNG bytes. */
 resolve(actualIssuedRead:Read,artwork:Pin):Capability|null;
}
export interface AllocatedIds {
 readonly requestId:string;readonly opIds:readonly string[];
 readonly layerIds:readonly string[];readonly markIds:readonly string[];readonly chunkIds:readonly string[];
}
export interface IdOwner<Source> {
 /** Exactly once AFTER validated form/source/selected dependency prefix and all
  * callbacks pass. No ticket, history, WAL or second commit is created here. */
 allocate(source:Source,counts:Readonly<{operations:number;layers:number;marks:number;chunks:number}>):AllocatedIds;
}
export interface OwnedPreparationCancellation<Source> {
 /** Same existing session/connection/request and actual preparation generation.
  * This must not report availability from a DTO flag or token alias. */
 owns(source:Source,originalRequestId:string,service:object):boolean;
 /** Existing session.cancel + generation/AbortSignal/cleanup escrow only.
  * Never use on unknown acceptance or release uncertain accepted resources. */
 cancel(source:Source,originalRequestId:string,service:object):Readonly<{cancelled:boolean}>;
}
export interface ConstructorPorts<Read,Source,Capability,R=unknown,B=unknown> {
 readonly sourceOwner:SourceReadOwner<Source,R,B>;
 readonly formInputOwner:FormInputOwner<Read>|null;
 readonly preparationBinding:PreparationBinding<Source>|null;
 readonly selectedBytesBinding:SelectedBytesBinding<Read,Capability>|null;
 readonly idOwner:IdOwner<Source>|null;
 readonly preparationCancellation:OwnedPreparationCancellation<Source>|null;
}
