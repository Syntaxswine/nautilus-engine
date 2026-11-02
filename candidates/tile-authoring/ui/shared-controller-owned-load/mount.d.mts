import type {PairingAdapter} from './adapter.mjs';
import type {SharedControllerHub} from './hub.mjs';
import type {ResourceActions,ArtworkLoadControl} from './resource-control.mjs';
export interface MountedPanel {readonly element:HTMLElement;refresh():unknown;dispose():unknown}
export interface LibraryOptions {readonly tiles:unknown;readonly authoring:unknown;readonly rectangleSpec:(fields:unknown,context:unknown)=>unknown;readonly onError?:(error:unknown)=>void}
export interface OverlayOptions {readonly thumbnailPresentation?:unknown;readonly canvasInput?:unknown;readonly onError?:(error:unknown)=>void}
export function mountSharedTileAuthoringUI(options:{readonly libraryContainer:HTMLElement;readonly overlayContainer:HTMLElement;readonly binding:PairingAdapter['binding'];readonly isAdditionalConnectionCurrent:()=>boolean;readonly libraryOptions:LibraryOptions;readonly overlayOptions?:OverlayOptions;readonly resourceActions?:ResourceActions|null}):Readonly<{library:MountedPanel;overlay:MountedPanel;resources:ArtworkLoadControl;hub:SharedControllerHub;dispose():unknown[]|undefined}>;
