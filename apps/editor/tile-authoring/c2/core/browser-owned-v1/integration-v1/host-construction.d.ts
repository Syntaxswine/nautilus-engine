/** Source-private Host producer verifier. Not a consumer index export. */
import type * as C from '../../../../../../../packages/tile-authoring-core/index.js';
import type {SourceOwner,SourceKernel,ActualAuthority,RootProfile,Checkpoint,HistoryOptions,SessionJournal,DocumentFact,AuthorityObservation} from './index.js';
declare const retained:unique symbol,inspection:unique symbol;
export interface RetainedCommandControl {readonly [retained]:true}
export interface RetainedInspection {readonly [inspection]:true}
export interface RetainedReference {readonly requestId:string;readonly command:Readonly<C.Command>;readonly expected:Readonly<C.Expected>}
export interface PaidRetainedCommand extends RetainedReference {readonly inspection:RetainedInspection}
export interface HostConstructionSource {readonly kind:'nautilus-private-kernel-host-construction-source';readonly version:1;readAuthority():Checkpoint;authorityToken():string;authorityObservation():AuthorityObservation;constructSessionJournal(input:{checkpoint:Checkpoint;options:HistoryOptions}):SessionJournal;documentFacts(document:unknown):DocumentFact;encodedDocument(document:unknown):string;requireCheckpoint(value:unknown):true;checkpointEncoding(value:unknown):Readonly<{text:string;entry:string}>;validateRetainedCommand(input:unknown):Readonly<C.Command>;captureRetainedCommand(actualDraft:unknown):RetainedCommandControl;retainedCommandReference(control:RetainedCommandControl):RetainedReference;inspectRetainedCommand(control:RetainedCommandControl):PaidRetainedCommand;requireRetainedInspection(inspection:RetainedInspection):PaidRetainedCommand;matchesActualAuthority(value:unknown):boolean;matchesActualCodec(value:unknown):boolean;matchesActualProfile(value:unknown):boolean}
export function kernelConstructionSourceForHost(kernel:SourceKernel,input:{owner:SourceOwner;authority:ActualAuthority;profile:RootProfile}):HostConstructionSource;
