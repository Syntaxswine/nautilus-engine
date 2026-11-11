import type {Pin,ImageBlob} from '../../../../packages/tile-authoring-core/index.js';
import type {SharedArtworkLocation} from '../../../../packages/assets/artwork.js';
export interface EncodedStreamDescription {
 readonly artwork:Pin;readonly blob:ImageBlob;readonly location:SharedArtworkLocation;readonly url:string;
 readonly scope:'pre-command encoded resource only';readonly editingWorkCredit:0;readonly authoringAttempt:'UNBOUND';readonly decoder:false;readonly physicalReclamation:'UNMEASURED';
}
export interface EncodedStreamObservation {
 readonly occupied:boolean;readonly phase:string;readonly responses?:number;readonly receivers?:number;
 readonly deliveredViews?:number;readonly deliveredBytes?:number;readonly maxBacking?:number;readonly detachedReceivers?:number;
 readonly cancelAcknowledged?:boolean;readonly closedAcknowledged?:boolean;readonly physicalReclamation?:'UNMEASURED';
}
export interface BuiltinEncodedStream {
 open(blob:ImageBlob,options:{readonly signal:AbortSignal}):AsyncIterableIterator<Uint8Array>;
 describe():EncodedStreamDescription;
 inspect():EncodedStreamObservation;
}
/** Private Root construction. Browser origin is measured; Node origin and public
 * package anchor are trusted configuration, never command/palette URL fields. */
export function createBuiltinEncodedStream(options:{
 readonly artwork:Pin;readonly profile?:'renderer'|'assets'|'compatibility';readonly assetAnchorURL?:string;readonly origin?:string;
}):BuiltinEncodedStream;
