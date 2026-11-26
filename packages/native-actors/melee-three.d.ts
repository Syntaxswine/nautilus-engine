import type {NativeActorView,SharedNativeRenderer,NativeFootSupport} from './three.js';
import type {NativePoseCheckpoint} from './index.js';
import type {MeleePresentation} from '../melee-core/index.js';
export interface NativeMeleeView extends NativeActorView {
  readPresentation():(MeleePresentation & {gripErrorM:number;scaled:false;articulated:boolean})|null;
}
/** Standing native goat only. Ranged articulation has no ballistic authority. */
export function prepareNativeMeleeActor(options:{renderer:SharedNativeRenderer;actorId:string;model?:'goat';motion?:'native-gait'|'neutral-only';roles?:readonly ('idle'|'walk')[];readPresentation:()=>MeleePresentation;checkpoint?:NativePoseCheckpoint;footSupport?:NativeFootSupport;signal?:AbortSignal;resourceURL?:(packageURL:string)=>string;fetchResource?:typeof fetch}):Promise<NativeMeleeView>;
