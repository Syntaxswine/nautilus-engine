/** PRIVATE CONTRACT/DESIGN ONLY. No registered service, codec or CLI exists here. */
export type Json=null|boolean|number|string|Json[]|{[key:string]:Json};
export type Digest=string;
export interface Pin {id:string;version:number;hash:Digest}
export interface SchemaPin {kind:string;version:number;schemaHash:Digest}
export type ModuleSlot='originalMap'|'floors'|'finishes'|'tileMap'|'stackConstraints'|'library'|'decorations'|'resources';
export interface ModuleSnapshot<T extends Json=Json> {schema:SchemaPin;hash:Digest;body:T}
export interface WorkspaceDocumentV3 {
  kind:'nautilus-tile-workbench-document';version:3;id:string;profile:Pin;
  modules:Record<ModuleSlot,ModuleSnapshot>;
}
export interface Expected {
  workspaceId:string;checkpointToken:Digest;contextToken:Digest;
  contentBindings:Pin[];
}
export type CommandName='recipe.create'|'recipe.clone'|'recipe.revise'|'preset.save'|'preset.place'|'instance.upgrade'|'instance.delete'|'decoration.batch'|'workspace.undo'|'workspace.redo'|'pack.import';
export interface Command {
  kind:'nautilus-tile-authoring-command';version:1;requestId:string;
  actor:{principalId:string;caller:'human'|'agent'|'consumer'};
  expected:Expected;
  operation:{name:CommandName;payload:{schema:SchemaPin;body:Json}};
}
export interface Requirements {
  schemas:SchemaPin[];features:string[];resources:ArtworkPin[];
  unavailable:{code:string;path:string;reason:string}[];
  /** Proposed ceilings are not benchmark measurements or registered capabilities. */
  limits:{status:'proposed-unmeasured';maxLayersPerSurface:8;maxStoredMarksPerChunk:4096;maxResidentMarks:1024;maxAdditionalDecodedBytes:33554432;maxRoots:2;maxTriangles:50000};
}
export interface ArtworkPin extends Pin {
  mediaType:'image/png'|'image/webp';widthPx:number;heightPx:number;
  alpha:'straight'|'premultiplied';colourSpace:'srgb'|'linear-srgb';
}
export interface Definition {
  pin:Pin;canonicalRecipeId:string;recipeDigest:Digest;
  /** Actual supported public recipe-v1 source, validated by the real core. */
  recipe:Json;requiredFeatures:string[];resources:ArtworkPin[];notices:string[];
}
export interface Preset {
  pin:Pin;definition:Pin;
  /** Empty by default; capture is an explicit Save-as-preset choice. */
  decorationDefaults:Json[];resources:ArtworkPin[];notices:string[];
}
export interface StableTarget {
  ownerId:string;surfaceId:string;floorId:string;surfaceProfile:Pin;
}
export interface LocalAnchor {
  kind:'owner-local-metres';version:1;xM:number;yM:number;
  widthM:number;heightM:number;rotationRad:number;
  /** Optional authored mask is independent of derived cells, meshes and LOD. */
  mask:null|{kind:'authored-grid-cells';version:1;gridId:string;originM:[number,number];cellSizeM:number;cells:[number,number][]};
}
export interface GraphicMark {
  id:string;artwork:ArtworkPin;target:StableTarget;anchor:LocalAnchor;
  layerId:string;order:number;opacity:number;tintRGBA:[number,number,number,number];
  blendProfile:Pin;phaseGroupId:null|string;
}
export interface ResourceReservation {
  requestId:string;reservationId:string;resources:ArtworkPin[];
  /** Opaque host lease, never serialized as authority or an absolute path. */
  lease:unknown;durableVerified:boolean;readiness:'ready'|'unavailable';
}
export interface CompleteTarget {
  documentId:string;profile:Pin;
  /** Every slot, even when unchanged. Cannot patch or omit an authority. */
  manifest:Record<ModuleSlot,{schema:SchemaPin;hash:Digest}>;
  /** Only changed module bodies; absent bodies must match accepted source. */
  replacements:Partial<Record<ModuleSlot,ModuleSnapshot>>;
}
export interface PreparedReview {
  requestId:string;reviewId:string;leaseId:string;committable:boolean;
  beforeCheckpointToken:Digest;beforeDocumentDigest:Digest;targetDocumentDigest:Digest;
  target:CompleteTarget;requirements:Requirements;resourceReservation:ResourceReservation;
  diagnostics:Json[];
}
export type Outcome=
  {status:'committed';requestId:string;checkpointToken:Digest;presentation:'ready'|'retry-required'}|
  {status:'not-committed';requestId:string;code:string}|
  {status:'unknown';requestId:string;operationDigest:Digest;retention:'hold-potentially-committed-resources'};
export interface PortablePack {
  kind:'nautilus-tile-content-pack';version:1;profile:Pin;
  definitions:Definition[];presets:Preset[];requiredSchemas:SchemaPin[];requiredFeatures:string[];
  resources:{pin:ArtworkPin;path:string;bytesBase64:string;notices:string[]}[];
  notices:string[];
}
export interface AuthoringService {
  discover():Json;
  inspect(query:Json):Promise<Requirements>;
  prepare(command:Command):Promise<PreparedReview>;
  /** Same exact current preparation/lease on human and agent paths. */
  apply(input:{requestId:string;reviewId:string;leaseId:string;expected:Expected}):Promise<Outcome>;
  recover(input:{requestId:string;operationDigest:Digest}):Promise<Outcome>;
  retryPresentation():Promise<Json>;
  save():Promise<Json>;
  exportPack(selection:{definitions:Pin[];presets:Pin[]}):Promise<PortablePack>;
  dispose():void;
}
/** Extract the existing codec once. Do not implement a second journal here. */
export interface SharedCodecPolicy {
  kind:string;version:number;
  validateDocument(value:unknown):WorkspaceDocumentV3;
  interpretCompleteTarget(before:WorkspaceDocumentV3,target:CompleteTarget):WorkspaceDocumentV3;
  validatePreparedBinding(command:Command,review:PreparedReview):void;
  documentDigest(value:WorkspaceDocumentV3):Digest;
  contextToken(document:WorkspaceDocumentV3,bindings:Json):Digest;
}
