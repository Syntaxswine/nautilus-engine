/** Private component candidate. Brands are documentation, never ownership proof. */
import type {WorkbenchDocument,Pin,Artwork,Graphic,ResourceRef,TilesV1} from '../../../../packages/tile-authoring-core/index.js';
import type {Basis,C2Read,ExistingC1Read,BuiltinArtworkPack,BuiltinDependencyPrefixOwner,Diagnostic} from './vendor/ui057/projection.js';
export type {Basis,C2Read,ExistingC1Read} from './vendor/ui057/projection.js';

declare const sourceBrand:unique symbol,bytesBrand:unique symbol,copyBrand:unique symbol,attemptBrand:unique symbol;
export interface SourceScope {readonly [sourceBrand]:true}
export interface VerifiedByteScope {readonly [bytesBrand]:true}
export interface ExportCopyLease {readonly [copyBrand]:true}
export interface AuthoringAttempt {readonly [attemptBrand]:true}
export interface SourceObservation {
 readonly basis:Basis;readonly document:WorkbenchDocument;
 readonly sourceGeneration:number;readonly ownerLifetimeId:string;
 readonly contextId:string;readonly contextEpoch:number;readonly mutationEpoch:number;
}
export interface SourceScopeOwner<Read> {
 /** Actual validated complete source; copied/foreign reads must not resolve. */
 resolve(read:Read):SourceScope|null;
 observe(scope:SourceScope):SourceObservation;
 isCurrent(scope:SourceScope):boolean;
}
export interface ResourceCaps {
 readonly maxBlobBytes:number;readonly inputBytes:number;readonly outputBytes:number;
 readonly workUnits:number;readonly nodes:number;readonly depth:number;
 readonly ownedEncodedBytes:number;readonly chunkBackingBytes:number;readonly chunks:number;
 readonly inFlight:number;readonly deadlineMs:number;readonly leaseReferences:number;readonly backingStores:number;
}
export const BUILTIN_RESOURCE_CAPS:ResourceCaps;
export interface AuthenticatedMetadataPorts {
 sharedArtwork(pin:Pin):Artwork;
 sharedArtworkDefaults(pin:Pin):Graphic;
 sharedArtworkImage(pin:Pin):Readonly<{artwork:Pin;resourceRef:ResourceRef;blob:Artwork['body']['blob'];imageView:Artwork['body']['imageView']}>;
}
export interface EncodedStreamPort {
 /** Separate async acquisition. Full fixed/unshared backing is charged. */
 open(blob:Artwork['body']['blob'],options:{readonly signal:AbortSignal}):AsyncIterable<Uint8Array>;
}
export interface CoreWork {
 readonly unitsCharged:number;readonly inputBytes:number;readonly outputBytes:number;
 readonly definitionVisits:number;readonly maskCellsEvaluated:number;
 readonly dependencyEdges:number;readonly resourceReferences:number;
}
export interface PortableValidator {
 /** Bind the actual accepted importer, never a caller cost/success DTO. */
 importTileContentPack(tiles:TilesV1,input:{pack:unknown;entries:{entry:string;bytes:Uint8Array}[];limits:{inputBytes:number;outputBytes:number;plannerUnits:number;nodes:number;depth:number}}):Readonly<{pack:unknown;entries:readonly Readonly<{entry:string;bytes:Uint8Array}>[];work:CoreWork}>;
}
export interface LaterAuthoringAttemptOwner {
 /** Session starts its one actual attempt before Source/history reads. */
 isCurrent(attempt:AuthoringAttempt,source:SourceScope):boolean;
 /** Must charge actual borrow/copy through that same live attempt. */
 borrowVerified(scope:VerifiedByteScope,attempt:AuthoringAttempt):VerifiedByteScope;
}
export interface Refusal {
 readonly status:'refused';readonly basis:Basis;
 readonly missingPort:'verifiedBuiltinByteOwner'|null;readonly diagnostics:readonly Diagnostic[];
}
export type BytePreflight=Readonly<{status:'verified';basis:Basis;artwork:Pin;bytes:VerifiedByteScope}>|Refusal;
export interface ByteScopeObservation {
 readonly resourceScopeId:string;readonly basis:Basis;readonly artwork:Pin;
 readonly blob:Artwork['body']['blob'];readonly sourceDigest:string;readonly coreWork:CoreWork;
 readonly resourceWork:Readonly<{workUnits:number;inputBytes:number;outputBytes:number}>;
 readonly editingWorkCredit:0;
}
export interface OwnerDiagnostics {
 readonly scope:string;readonly heldBytes:number;readonly reservedBytes:number;readonly stores:number;
 readonly inFlight:number;readonly leaseReferences:number;readonly cachedPages:number;
 readonly providerFault:string|null;readonly withinDeclaredCapacity:boolean;readonly caps:ResourceCaps;
 readonly browserWideMeter:'UNBOUND';readonly decoder:false;readonly native:false;readonly authority:false;
 readonly physicalReclamation:'UNMEASURED';
}
export interface BuiltinOwner<C1View extends ExistingC1Read> extends BuiltinDependencyPrefixOwner<C1View,VerifiedByteScope> {
 acquireBuiltinBytes(read:C2Read<C1View>,selected:Pin,options?:{readonly signal?:AbortSignal}):Promise<BytePreflight>;
 /** Exact retained record+descriptor+bytes yields no prefix, never packs:[]. */
 resolveRetainedBytes(read:C2Read<C1View>,selected:Pin):BytePreflight;
 isByteScopeCurrent(bytes:VerifiedByteScope):boolean;
 retain(bytes:VerifiedByteScope,reason:'candidate'|'pending'|'export'|'cache'):VerifiedByteScope;
 release(bytes:VerifiedByteScope|ExportCopyLease):Readonly<{releasedReference:true;heldBytes:number;physicalReclamation:'UNMEASURED'}>;
 copyOut(bytes:VerifiedByteScope):Readonly<{entry:string;bytes:Uint8Array;copyLease:ExportCopyLease}>;
 observeByteScope(bytes:VerifiedByteScope):ByteScopeObservation;
 forAuthoringAttempt(bytes:VerifiedByteScope,attempt:AuthoringAttempt):Readonly<{status:'borrowed';bytes:VerifiedByteScope}>|Readonly<{status:'refused';code:'AUTHORING_ATTEMPT_OWNER_UNBOUND'}>;
 diagnostics():OwnerDiagnostics;
}
export function createBuiltinByteOwner<C1View extends ExistingC1Read>(options:{
 tiles:TilesV1;metadata:AuthenticatedMetadataPorts;sourceOwner?:SourceScopeOwner<C2Read<C1View>>;
 reader?:EncodedStreamPort;portable?:PortableValidator;limits?:Partial<ResourceCaps>;
 authoringAttemptOwner?:LaterAuthoringAttemptOwner;
}):BuiltinOwner<C1View>;
export interface SelectedPack {
 readonly basis:Basis;readonly sourceDigest:string;readonly selected:Pin;
 readonly record:Artwork;readonly graphic:Graphic;readonly resourceRef:ResourceRef;
 readonly blob:Artwork['body']['blob'];readonly pack:BuiltinArtworkPack;
 readonly route:'retained-two-ops'|'builtin-prefix';readonly metadataBytes:number;
}
/** Pure detached DTO only. No byte capability or Apply permission. */
export function produceSelectedBuiltinPack(tiles:Pick<TilesV1,'tileLayoutToken'>,input:{document:WorkbenchDocument;basis:Basis;selected:Pin;metadata:AuthenticatedMetadataPorts}):SelectedPack;
