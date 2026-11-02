import type {PairingRead} from '../c2-read-pairing/adapter.mjs';
import type {BorrowedWorkbench} from '../c2-host-bridge/bridge.mjs';
import type {SharedControllerHub} from './hub.mjs';
export interface ResourceActions {readonly loadSelected:(actualIssuedRead:PairingRead)=>unknown|Promise<unknown>}
export interface ArtworkLoadControl {readonly element:HTMLElement;readonly pending:boolean;load():Promise<Readonly<{status:'unavailable'|'detached'|'refreshed'|'refused';code?:string}>>;observe(view:PairingRead|null):void;refreshGates():void;dispose():void}
export function mountSelectedArtworkLoadControl(container:HTMLElement,options:{readonly binding:BorrowedWorkbench;readonly hub:SharedControllerHub;readonly resourceActions?:ResourceActions|null}):ArtworkLoadControl;
