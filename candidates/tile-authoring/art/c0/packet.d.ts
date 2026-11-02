/** C0 DESIGN ONLY. Derived renderer packets, not a saved grammar, authority,
 * decoder, shader, importer or provider implementation. Core is normative. */
import type * as Core from '../inputs/core-api.d.ts';
export type CorePin=Core.Pin;
export type CoreResourceRef=Core.ResourceRef;
/** Original Artist manifest identity is an imported provenance binding. It is
 * not a Core pin and must never be accepted as a revision/contentDigest alias. */
export type ArtistManifestBinding=Readonly<{id:string;version:number;digest:string}>;
export type Matrix4=readonly[number,number,number,number,number,number,number,number,
 number,number,number,number,number,number,number,number];
export interface CaptureBindings {
 readonly documentDigest:string;readonly checkpointToken:string;
 readonly authorityContextToken:string;readonly presentationProfileDigest:string;
 readonly resourceEpoch:number;readonly geometryEpoch:number;
 readonly resourceLeaseSetDigest:string;readonly geometryLeaseSetDigest:string;
 readonly allocationLedgerDigest:string;
}
/** Read-only resolution of one Core Artwork record. It never becomes a second
 * library or a mutable descriptor in WorkbenchDocument.resourceRefs. */
export interface ResolvedImageView {
 readonly resourceRef:Core.ResourceRef;
 readonly blob:Readonly<Core.ImageBlob>;readonly imageView:Readonly<Core.ImageView>;
 readonly decoderProfile:'png-rgba8-srgb-straight-v1';
}
export interface OrderedLayer {
 readonly layer:Readonly<Core.Layer>;
 /** Complete Core marks in ascending ordinal, retaining all graphic fields:
  * exact artwork pin, form/wrap, position/size/rotation/mirrorU/pivotUV,
  * mark opacity, saved LINEAR tint and source-grid mask. No flattened layer. */
 readonly marks:ReadonlyArray<Readonly<Core.Mark>>;
}
export interface CurrentSurface {
 readonly target:Readonly<Core.MarkTarget>;readonly definition:Core.Pin;
 readonly sourceFrame:Readonly<Core.Surface>;
 readonly currentOwnerPose:Readonly<{originM:Core.V3;
  transform:{quarterTurns:0|1|2|3;mirrorX:boolean};poseDigest:string}>;
 readonly nativeFloorElevationM:number;
 /** Column-major render-world [x,h,y] -> source-surface coordinates. Includes
  * inverse CURRENT owner pose/D4, named sourceFrame.originM and basis, and
  * exactly one render/native axis conversion. Never use captured stroke pose
  * or derived mesh UV as the current source frame. Owner origin.h already
  * includes floor height; do not add it a second time. */
 readonly worldToSurface:Matrix4;
 readonly geometryLeaseId:string;readonly geometryEpoch:number;
 readonly clipProfile:'candidate.level-rectangle-top-v1'|
  'candidate.isolated-level-line-top-v1'|'candidate.isolated-level-arc-top-v1'|
  'candidate.isolated-level-cubic-top-v1';
 readonly facePolicy:'front-facing-only-v1';
 readonly layers:ReadonlyArray<OrderedLayer>;
}
export interface AppearancePacketProposal {
 readonly kind:'candidate.local-surface-appearance-packet';readonly version:2;
 readonly captures:CaptureBindings;
 /** Captured from the complete validated WorkbenchDocument@3, never Core.Source
  * parsed as a saved alias. Content revision alone is not freshness. */
 readonly document:Readonly<{id:Core.WorkbenchDocument['id'];version:3;
  contentRevision:Core.WorkbenchDocument['contentRevision']}>;
 readonly finishBinding:Readonly<Core.WorkbenchDocument['finishBinding']>;
 readonly artistImportBinding:ArtistManifestBinding;
 readonly resources:ReadonlyArray<ResolvedImageView>;
 readonly surfaces:ReadonlyArray<CurrentSurface>;
 readonly costs:Readonly<{boundKind:'proposal-only-not-performance-measurement';
  residentMarksAllViews:number;rootsAllViews:number;
  trianglesAllViews:number;cellsAllViews:number;ownedAppearanceMaterialsAllViews:number;
  decodedAllocationBytesAllViews:number;binReferencesAllViews:number;
  derivedBufferBytesAllViews:number;atlasPagesAllViews:number;contributorsPerBin:number}>;
}
/** Borrowed live handles are supplied separately. Serialized packets never
 * mint a verified decoder, geometry lease, resource epoch or budget ticket. */
export interface VerifiedResourceLease {
 readonly resourceRef:Core.ResourceRef;readonly resourceEpoch:number;
 readonly resourceLeaseSetDigest:string;readonly decodedAllocationId:string;
 readonly decodedBytes:number;readonly gpuBytes:number;readonly texture:unknown;
 release():void;
}
export interface GeometryLease {
 readonly target:Core.MarkTarget;readonly geometryLeaseId:string;
 readonly geometryEpoch:number;readonly geometryLeaseSetDigest:string;
 readonly documentDigest:string;readonly authorityContextToken:string;
 readonly frameDigest:string;readonly geometryDigest:string;readonly poseDigest:string;
 readonly meshes:ReadonlyArray<unknown>;
}
export interface AppearanceLease {
 readonly mode:'base-finish'|'owned-combined';
 diagnostics():Readonly<{state:'staged'|'bound'|'retiring'|'retired';
  additionalOverlayMaterials:number;additionalOverlayTextures:number;
  additionalOverlayGeometry:number;additionalOverlayBufferBytes:number;
  materialLeases:number;resourceLeases:number}>;
 dispose():void;
 retired():Promise<Readonly<{verified:boolean;remainingCharges:number}>>;
}
/** ONE opt-in host-owned appearance/kernel service. Nonempty channels acquire
 * an owned combined lease directly. Do not first acquire/patch a shared cached
 * finish, clone a cached hook, or chain/overwrite its onBeforeCompile.
 * Empty channels retain the existing base-finish path with ZERO additional
 * overlay material/texture/geometry/buffer allocation. All finish caches plus
 * combined/staged/retiring materials share one TOTAL cap of 64, not 64+64. */
export interface ControlledAppearanceOwnerProposal {
 acquire(options:Readonly<{THREE:unknown;packet:AppearancePacketProposal;
  geometry:ReadonlyArray<GeometryLease>;resources:ReadonlyArray<VerifiedResourceLease>;
  budgetTicket:unknown;current:()=>boolean}>):AppearanceLease;
}
