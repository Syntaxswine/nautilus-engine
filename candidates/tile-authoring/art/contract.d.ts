/** CONTRACT PROPOSAL ONLY. No implementation/export/registration exists. */
export type Digest = string;
export type ImmutableRef = Readonly<{id:string;version:number;digest:Digest}>;
export type ImageRef = Readonly<{id:string;version:number;sha256:Digest}>;
export type Target = Readonly<{ownerId:string;surfaceId:string;floorId:string}>;
export type LocalAnchor = Readonly<{
 profile:'owner-local-xy-m-v1';frameId:string;positionM:readonly[number,number];
 rotationRad:number;sizeM:readonly[number,number];pivotUV:readonly[number,number];
 placementPolicy:'follow-owner-D4';
}>;
export type LocalMask = Readonly<{profile:'surface-only-v1'}> | Readonly<{
 profile:'authored-grid-cells-v1';gridId:string;gridVersion:number;
 cells:ReadonlyArray<readonly[number,number]>;
}>;
export type GraphicMark = Readonly<{
 id:string;target:Target;anchor:LocalAnchor;artwork:ImmutableRef;layerId:string;
 order:number;opacity:number;tintSRGB:readonly[number,number,number];mask:LocalMask;
}>;
export type ImageResource = Readonly<{
 id:string;version:number;sha256:Digest;uri:string;
 mediaType:'image/png'|'image/webp';width:number;height:number;bitDepth:8;channels:'RGBA';
 colourSpace:'sRGB';alpha:Readonly<{storage:'straight';
  sampling:'linear-premultiplied-bilinear-v1';zeroAtOrBelow8:number}>;
 decodedBaseBytes:number;
 atlas:Readonly<{origin:'top-left';columns:number;rows:number;gutterPx:number;
  frames:ReadonlyArray<Readonly<{id:string;rectPx:readonly[number,number,number,number];
   pivotUV:readonly[number,number]}>>}>;
}>;
/** Coder supplies a validated, source-bound projection; this is not a new
 * planner or a claim that mesh/cell addresses may be persisted. */
export interface PreparedGraphicsProposal {
 readonly kind:'candidate.local-surface-graphics-projection';readonly version:1;
 readonly sourceToken:Digest;readonly contextToken:Digest;readonly artworkBinding:ImmutableRef;
 readonly marks:ReadonlyArray<GraphicMark>;
 /** Core compiles complete persisted layer/mark order. Every projected mark
  * occurs exactly once under its exact target; providers never sort by IDs. */
 readonly paintOrder:ReadonlyArray<Readonly<{target:Target;markIds:ReadonlyArray<string>}>>;
 readonly surfaceTokens:ReadonlyArray<Target & {frameToken:Digest;footprintToken:Digest}>;
 readonly costs:Readonly<{marks:number;binReferences:number;derivedBufferBytes:number;
  uniqueDecodedArtworkBytes:number}>;
}
/** Borrowed handles from the actual provider, never saved. Exact namespace,
 * source/context/frame/footprint and owner/floor identities must match. */
export interface SurfaceBindingProposal {
 readonly target:Target;readonly sourceToken:Digest;readonly frameToken:Digest;
 readonly footprintToken:Digest;readonly meshes:ReadonlyArray<unknown>;
 /** 16 finite column-major values: render world [x,height,y] → source-owner
  * [u,v,height], including exactly one native/render axis swap and inverse D4.
  * Host/Core must bind the agreed frame profile, not infer it from mesh UVs. */
 readonly worldToOwner:ReadonlyArray<number>;
 readonly facePolicy:'front-facing-only-v1';
}
export interface VerifiedArtworkLeaseProposal {
 readonly ref:ImageRef;readonly texture:unknown;readonly samplerProfileToken:Digest;
 readonly decodedBytes:number;readonly gpuBytes:number;
 /** Releasing a view lease never deletes durable blobs/document references. */
 release():void;
}
export interface AlbedoCompositionLeaseProposal {
 /** Root must accept a shared finish+overlay albedo seam. Arbitrary borrowed
  * onBeforeCompile callbacks must not be overwritten or silently chained. */
 readonly pass:'local-source-over-after-base-albedo-before-lighting-v1';
 release():void;
}
export interface GraphicAppearanceProposal {
 /** Visibility cannot remove charges, delete source or imply support. */
 setVisibleTargets(targets:ReadonlyArray<Target>):void;
 diagnostics():Readonly<{state:'staged'|'bound'|'retiring'|'retired';marks:number;
  ownedMaterials:number;ownedGeometry:number;ownedTextures:number;
  materialLeases:number;artworkLeases:number;derivedBufferBytes:number}>;
 /** Latch retirement, exhaust all actions even when native listeners throw.
  * Host keeps unverified retirement charged until the receipt settles. */
 dispose():void;
 retired():Promise<Readonly<{verified:boolean;remainingCharges:number}>>;
}
export interface LocalGraphicProviderProposal {
 /** Shared host budget reservation occurs BEFORE any acquisition. Materials,
  * buffers, image decode and all retirement participate in that one budget.
  * No history, storage, gameplay event, clock or secondary authority lives here. */
 acquire(options:Readonly<{
  THREE:unknown;projection:PreparedGraphicsProposal;
  surfaces:ReadonlyArray<SurfaceBindingProposal>;
  artwork:ReadonlyArray<VerifiedArtworkLeaseProposal>;
  albedo:ReadonlyArray<AlbedoCompositionLeaseProposal>;
  budgetTicket:unknown;current:()=>boolean;
 }>):GraphicAppearanceProposal;
}
