/** PRIVATE component types only. No strict/browser capture union or success DTO. */
export type Unbound = 'UNBOUND';
export interface NativeView {
 readonly root: object | null;
 readonly cellCount: number;
 diagnostics(): Readonly<{disposed:boolean;ownedGeometry:number;triangles:number;logicalState:string;viewId:string}>;
 dispose(): Readonly<{complete:boolean;viewId:string}>;
}
export interface ComponentInput {readonly document: object;readonly projection:object;readonly choice:Readonly<{skinId:string;version:1;variantSeed:number}>;}
export interface ComponentRoom {readonly maxTriangles?:number;readonly maxCells?:number;readonly current?:()=>boolean;readonly signal?:AbortSignal|null;}
export interface ComponentOwner {
 acquire(input:ComponentInput,room?:ComponentRoom):Promise<NativeView>;
 attach(root:object,role:'candidate'):void;
 acquireArtwork(sha256:string,readEncoded:(blob:Readonly<object>,exactReceiver:Uint8Array)=>Promise<void>,options?:Readonly<{isCurrent?:()=>boolean;signal?:AbortSignal|null}>):Promise<Readonly<{resident:true;blobSha256:string}>>;
 isViewCurrent(view:NativeView,options?:Readonly<{isCurrent?:()=>boolean;signal?:AbortSignal|null}>):boolean;
 borrowView(view:NativeView):Readonly<{readonly root:object|null;release():void}>;
 retryRelease(view:NativeView):Readonly<{complete:boolean}>|null;
 snapshot():Readonly<{formalCaptureBinding:Unbound;formalMeterPairing:Unbound;hostAuthority:Unbound;publicEditorAdoption:false;[key:string]:unknown}>;
 render(camera:object):void;
 readPixel(x:number,y:number):readonly number[];
 dispose():unknown;
}
export function createBrowserAppearanceOwner(options:Readonly<{THREE:object;mount?:HTMLElement;width?:number;height?:number;baselineAtlas:object;baselineMaterial:object;scene:object;limits?:Readonly<Record<string,number>>}>):ComponentOwner;
