/** Private design mapping only. A type/callback/boolean never authenticates a
 * producer. Corebfd pre-Native components execute; live Root/Artist pairing is pending. */
import type {Command,WorkbenchDocument,Expected,Bindings} from '../../../../packages/tile-authoring-core/index.js';
declare const brand:unique symbol;
type Owned<Name extends string>=object&{readonly [brand]:Name};
export type Attempt=Owned<'same-owner-attempt'>;
export type ActualCheckpoint=Owned<'actual-codec-checkpoint'>;
export type ActualHead=Owned<'same-journal-head'>;
export type ActualTicket=Owned<'same-journal-ticket'>;
export type ActualPhase=Owned<'same-phase-native-result'>;
export type ActualInvocation=Owned<'same-current-authority-invocation'>;
export type ActualJournalOwner=Owned<'Core-registered-live-journal'>;
export type PreparedTargetAssociation=Owned<'same-attempt-prepared-target-acquisition'>;
export type ActualManagerRecord=Owned<'same-existing-C1-manager-record'>;
export interface ActualViewsManager extends Owned<'same-native-owner-existing-C1-manager'> {
 acquire(association:PreparedTargetAssociation,current:()=>boolean):Promise<{ok:true;record:ActualManagerRecord}|{ok:false;code:string}>;
 promote(record:ActualManagerRecord):boolean;cancel():void;dispose():void;
 readonly accepted:object|null;
 snapshot():Readonly<{accepted:number;candidate:number;acquiring:number;retiring:number;roots:number;triangles:number;cells:number;maxRoots:number;maxTriangles:number;maxCells:number}>;
}
export type ActualRetirementHandle=Owned<'same-C1-retiring-record'>;
export type ActualLogicalReleaseReceipt=Owned<'actual-original-view-release-result'>;
export interface BeginControl {
 readonly action:'edit'|'undo'|'redo';
 /** Same already-retained reference, not parsed/cloned by Kernel prologue. */
 readonly draft:unknown;readonly lockId:string|null;
}
export interface PrepareAttempt {
 readonly work:Attempt;readonly signal:AbortSignal;
}
export interface ActualWal {
 readonly pending:{readonly checkpoint:ActualCheckpoint;readonly checkpointJSON:string};
 readonly committed:{readonly checkpoint:ActualCheckpoint;readonly checkpointJSON:string};
 readonly notCommitted:{readonly checkpoint:ActualCheckpoint;readonly checkpointJSON:string};
}
export interface OwnedPreparationInput {
 readonly action:'edit'|'undo'|'redo';readonly captured:Owned<'source'>;
 readonly head:ActualHead;readonly selection:Owned<'one-selected-target'>|null;
 readonly obligations:Owned<'complete-obligations'>;readonly draft:unknown;readonly lockId:string|null;
}
export interface HostMethodMap {
 /** Proposed original construction site, AFTER actual same-ID cold reconcile.
  * Core authenticates the actual Native owner.manager; never allocate a second. */
 adoptActualManager(input:{checkpoint:ActualCheckpoint;authority:object;codec:object;history:object;historyRead:object;presentation:object;hostContext:()=>object;onDiagnostic:(code:string)=>void}):ActualViewsManager;
 /** Proposed C2-only ORIGINAL construction seam; no second journal. The paired
  * Core factory privately retains ActualJournalOwner under original bootstrap. */
 constructActualJournal(options:Readonly<{initialText:string;contextKey:string;maxEntries:number;maxBytes:number;maxDocumentBytes:number}>):Readonly<{journal:object;historyRead:object}>;
 /** Root semantic adaptation of4ade line210. No source read before this call. */
 beginPrepare(checkpoint:ActualCheckpoint,control:BeginControl):PrepareAttempt;
 captureRetainedIngress(attempt:PrepareAttempt,action:BeginControl['action'],sameDraft:unknown,sameLockId:string|null):void;
 originalRequestId(attempt:PrepareAttempt):string;
 captureSource(attempt:PrepareAttempt,input:{authority:object;codec:object;checkpoint:ActualCheckpoint;hostContext:object}):Owned<'source'>;
 captureObligations(attempt:PrepareAttempt,captured:Owned<'source'>,head:ActualHead,selection:Owned<'one-selected-target'>|null):Owned<'complete-obligations'>;
 bindSourceOnce(attempt:PrepareAttempt,captured:Owned<'source'>,head:ActualHead):void;
 sourceCurrent(attempt:PrepareAttempt,input:{generation:number;head:ActualHead;admittedTicket:ActualTicket|null;authority:object;codec:object;authorityObservation:object;invocation:ActualInvocation|null}):boolean;
 prepareInput(attempt:PrepareAttempt,input:OwnedPreparationInput):object;
 /** Opaque actual same-attempt full target/projection/choice association. The
  * adopted manager queues this exact carrier; no ambient lastDocument. */
 bindActualTargetAcquisition(attempt:PrepareAttempt,input:object,options:{purpose:'prepare'|'restore'|'c1-prepaint'}):PreparedTargetAssociation;
 bindActualManagerCandidate(attempt:PrepareAttempt,record:ActualManagerRecord,acquisition:PreparedTargetAssociation):Owned<'same-owner-native-candidate'>;
 requireOwnedPrepared(attempt:PrepareAttempt,phase:ActualPhase):void;
 serializeBoundDocument(attempt:PrepareAttempt,document:WorkbenchDocument):string;
 adoptActualTicket(attempt:PrepareAttempt,head:ActualHead,ticket:ActualTicket,targetJSON:string):void;
 createActualOperation(attempt:PrepareAttempt,input:{action:BeginControl['action'];phase:ActualPhase;ticket:ActualTicket}):object;
 beforeActualWal(attempt:PrepareAttempt,input:{checkpoint:ActualCheckpoint;operation:object}):void;
 recordActualWal(attempt:PrepareAttempt,actualWal:ActualWal):void;
 validateActualCommit(transaction:object,input:{checkpoint:ActualCheckpoint;hostContext:object;actualManagerRecord:object|null;authority:object;authorityObservation:object;invocation:ActualInvocation|null;purpose:'stage'|'commit'}):boolean;
}
export interface ActualManagerRetirementPort {
 capture(exactOriginalRetiringRecord:ActualManagerRecord):ActualRetirementHandle;
 retry(handle:ActualRetirementHandle,actualOwnerReceipt:ActualLogicalReleaseReceipt):Readonly<{complete:boolean;code?:string}>;
}
/** Pending Artist/Core-authenticated association, carried through the original
 * views-manager job; no mutable lastDocument or geometry-only lookup. */
export type ActualTargetAcquisition=PreparedTargetAssociation;
export interface ExactOperationDataInput {
 readonly action:'edit'|'undo'|'redo';readonly originalId:string;
 readonly before:ActualCheckpoint;readonly target:WorkbenchDocument;
 readonly command:Command|null;readonly expected:Expected;readonly authoringBinding:Bindings|null;
 readonly actualHead:ActualHead;readonly actualTicket:ActualTicket;
}
/** Source snapshots carry no permission. Only the actual read frame mints a
 * private SourceScope; epochs/currentness come from actual producer facts. */
export interface SourceReadOwner<Read> {
 read():Read;
 capture(exactIssuedRead:Read):Owned<'source-read'>;
 isCurrent(source:Owned<'source-read'>):boolean;
 observe(source:Owned<'source-read'>):Readonly<{document:WorkbenchDocument;basis:object;sourceGeneration:number;ownerLifetimeId:string;contextId:string;contextEpoch:number;mutationEpoch:number}>;
 isBound():boolean;
}
/** Composition-only local witness. This is deliberately not SourceReadOwner:
 * production SourceRegistry/meter/head ownership remains unpaired. */
export interface WorkbenchReadFrame<Read> {
 composeProfile(profile:object):Readonly<object>;
 bindWorkbench(actualWorkbench:object):void;
 read():Read;
 capture(exactIssuedRead:Read):Owned<'local-read-frame-only'>;
 witness(handle:Owned<'local-read-frame-only'>):Readonly<{checkpoint:ActualCheckpoint;document:WorkbenchDocument;token:string;contextToken:string;hostContext:object;current:object}>;
 isCurrent(handle:Owned<'local-read-frame-only'>):boolean;
 dispose():void;
}
export interface MissingExecutablePairings {
 readonly coreSourceRegistry:'UNBOUND';readonly continuedSourceValidator:'UNBOUND';
 readonly actualHeadCapacity:'UNBOUND';readonly editorObserverBackend:'UNBOUND';
 readonly codecResourceFacts:'UNBOUND';readonly artistPhaseOwner:'UNBOUND';
 readonly productionHostFactory:'UNBOUND';
}
