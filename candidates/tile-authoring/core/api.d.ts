/** CONTRACT/DESIGN ONLY. No exported implementation or commit authority.
 * contract.schema.json is normative; R is the caller's closed public-v1 recipe
 * type, validated by the ACTUAL public core. No arbitrary author JS is accepted.
 */
export type Id=string;
export type Digest=string;
export type V2=[number,number];
export type V3=[number,number,number];
export interface Pin {id:Id;revision:number;contentDigest:Digest}
export interface ImmutableRecord<B> {kind:string;version:1;id:Id;revision:number;body:B;contentDigest:Digest}
export interface Notice {id:Id;licenseRef:string;attribution:string;noticeText:string;source:{repository:string;commit:string;path:string}}
export interface Grid {id:Id;version:1;originM:V2;cellSizeM:V2;profile:'owner-local-grid-v1'}
export interface Surface {id:Id;sourceAnchorId:Id;floorSlot:Id;floorOffsetM:number;profile:'owner-local-level-top-v1';originM:V3;axes:[[1,0,0],[0,1,0]];normal:[0,0,1];grid:Grid;geometryDigest:Digest;frameDigest:Digest}
export type Definition<R=unknown>=ImmutableRecord<{label:string;recipe:R;sourceProfile:'local-level-region-v1'|'local-flat-field-v1'|'local-level-path-v1';surfaces:Surface[];requires:Id[];notices:Notice[]}>;
export type Artwork=ImmutableRecord<{label:string;blob:{sha256:Digest;byteLength:number;mediaType:'image/png'|'image/webp';widthPx:number;heightPx:number;colorSpace:'srgb';alphaMode:'straight'};channels:['color','alpha'];requires:Id[];notices:Notice[]}>;
export type Mask={kind:'all-surface'}|{kind:'grid-spans';grid:{id:Id;version:1;digest:Digest};rows:{j:number;spans:{i0:number;count:number}[]}[]};
export interface GraphicTransform {positionM:V2;sizeM:V2;rotationRad:number;mirrorU:boolean;pivotUV:V2}
export interface Graphic {artwork:Pin;form:'stamp'|'detail';transform:GraphicTransform;opacity:number;tintLinearRGB:V3;mask:Mask;wrap:'clamp'|'repeat'}
export interface Layer {id:Id;order:number;label:string;opacity:number;blendProfile:'source-over-linear-premultiplied-v1'}
export type Preset=ImmutableRecord<{label:string;definition:Pin;defaultLayers:{surfaceId:Id;layer:Layer}[];defaultMarks:{id:Id;surfaceId:Id;layerId:Id;ordinal:number;graphic:Graphic}[];requires:Id[];notices:Notice[]}>;
export interface Content<R=unknown> {kind:'nautilus-tile-content';version:1;id:Id;definitions:Definition<R>[];presets:Preset[];artwork:Artwork[]}
export interface MarkTarget {ownerId:Id;surfaceId:Id;floorId:Id;bindingDigest:Digest}
export interface Mark {id:Id;revision:number;target:MarkTarget;layerId:Id;ordinal:number;graphic:Graphic;groupId:Id|null}
export interface SurfaceBinding {ownerId:Id;surfaceId:Id;floorId:Id;definition:Pin;geometryDigest:Digest;frameDigest:Digest;gridDigest:Digest;bindingDigest:Digest;layers:Layer[]}
export interface StrokeGroup {id:Id;floorId:Id;memberMarkIds:Id[];capturedPhase:{profile:'captured-floor-plan-v1';originXYM:V2;transform:GraphicTransform;artwork:Pin;ownerPoseDigests:{ownerId:Id;digest:Digest}[]}}
export interface Decorations {kind:'nautilus-local-decorations';version:1;surfaces:SurfaceBinding[];chunks:{id:Id;marks:Mark[]}[];groups:StrokeGroup[]}
export interface AuthoringModule<R=unknown> {kind:'nautilus-tile-authoring-module';version:1;library:Content<R>;decorations:Decorations;ownerPins:{ownerId:Id;definition:Pin;preset:Pin|null}[]}
export interface StackConstraints {kind:'nautilus-stack-constraints';version:1;floorProfileId:Id;minimumClearanceM:number;owners:{instanceId:Id;primaryReservationId:Id}[];managedRelations:{id:Id;kind:'cross';a:Id;b:Id;clearanceM:number}[]}
/** Pure complete source projection; not a second journal/checkpoint authority.
 * Editor owns the outer versioned codec and one existing journal/history/CAS. */
export interface Source<R=unknown,B=unknown> {kind:'nautilus-tile-authoring-source';version:1;id:Id;revision:number;originalSourceJSON:string;floorProfile:{id:Id;version:number;floors:{id:Id;elevationM:number}[]};finishCatalogue:{id:Id;version:number;contentDigest:Digest};tileBundle:B;stackConstraints:StackConstraints|null;authoring:AuthoringModule<R>}
export interface Expected {workspaceRevision:number;workspaceDigest:Digest;hostDocumentDigest:Digest;hostAuthorityToken:Digest;authorityContextToken:Digest;contentDigest:Digest;decorationDigest:Digest;resourceSetDigest:Digest;floorProfileDigest:Digest;stackConstraintsDigest:Digest;tileLayoutDigest:Digest;tileCatalogueDigest:Digest}
export interface Placement {ownerId:Id;originM:V3;floorBindings:Record<Id,Id>;transform:{quarterTurns:0|1|2|3;mirrorX:boolean};locked:boolean;anchorIds:Id[];freshMarkIds:{templateId:Id;markId:Id}[];freshLayerIds:{templateId:Id;layerId:Id}[];chunkId:Id}
export interface AnchorDecision {markId:Id;action:'preserve-identical'|'reanchor'|'delete';replacement:Mark|null}
export interface Pack<R=unknown> {kind:'nautilus-tile-content-pack';version:1;manifest:Content<R>;blobEntries:{sha256:Digest;byteLength:number;entry:string}[];requires:Id[]}
export type Operation<R=unknown>= {opId:Id}&(
 {kind:'recipe.create';body:{definition:Definition<R>}}|
 {kind:'recipe.clone'|'recipe.revise';body:{base:Pin;definition:Definition<R>}}|
 {kind:'preset.save';body:{preset:Preset}}|
 {kind:'preset.place';body:{preset:Pin;placements:Placement[];defaults:'copy-explicit'|'empty'}}|
 {kind:'placement.upgrade';body:{ownerIds:Id[];from:Pin;to:Pin;anchorDecisions:AnchorDecision[];newRecipeAnchorIds:{ownerId:Id;anchorIds:Id[]}[]}}|
 {kind:'owner.remove';body:{ownerIds:Id[];deleteDecorationIds:Id[]}}|
 {kind:'decoration.add';body:{chunkId:Id;mark:Mark}}|
 {kind:'decoration.update';body:{markId:Id;expectedRevision:number;replacement:Mark;groupPolicy:'preserve-whole-group'|'detach-explicit'}}|
 {kind:'decoration.remove';body:{markIds:Id[];groupPolicy:'preserve-whole-group'|'detach-explicit'}}|
 {kind:'surface.layers';body:{target:MarkTarget;layers:Layer[];removedLayerMarkIds:Id[]}}|
 {kind:'stroke.group';body:{group:StrokeGroup}}|
 {kind:'content.import';body:{pack:Pack<R>;conflict:'refuse-different-content'}});
export interface Command<R=unknown> {kind:'nautilus-tile-authoring-command';version:1;requestId:Id;expected:Expected;operations:Operation<R>[];budgetProfile:'authoring-reference-proposal-v1'}
export interface Diagnostic {code:Id;path:string;message:string;action:string;ownerIds:Id[]}
export interface Bindings {commandDigest:Digest;sourceWorkspaceDigest:Digest;targetWorkspaceDigest:Digest;sourceHostDocumentDigest:Digest;targetHostDocumentDigest:Digest;sourceAuthorityToken:Digest;authorityContextToken:Digest;sourceContentDigest:Digest;targetContentDigest:Digest;sourceDecorationDigest:Digest;targetDecorationDigest:Digest;sourceConstraintsDigest:Digest;nextConstraintsDigest:Digest;floorProfileDigest:Digest;sourceResourceSetDigest:Digest;targetResourceSetDigest:Digest;resourceLeaseSetDigest:Digest;presentationProfileDigest:Digest;allocationLedgerDigest:Digest}
export interface CostBounds {planning:{unitsCharged:number;inputBytes:number;outputBytes:number;definitionVisits:number;maskCellsEvaluated:number;dependencyEdges:number;resourceReferences:number};sourceMarks:number;maxLayersOnSurface:number;newBlobBytes:number;declaredUniqueDecodedBytes:number;residentMarksAllViews:number;rootsAllViews:number;trianglesAllViews:number;cellsAllViews:number;boundKind:'proposal-only-not-performance-measurement'}
export interface Review<R=unknown,B=unknown> {kind:'nautilus-tile-authoring-review';version:1;requestId:Id;reviewToken:Digest;bindings:Bindings;targetSource:Source<R,B>;costBounds:CostBounds;tilePreparation:'public-v1-prepared'|'source-unchanged';resourceReadiness:'host-bound';status:'reviewable'}
export interface Refusal {kind:'nautilus-tile-authoring-refusal';version:1;requestId:Id;ok:false;targetSource:null;diagnostics:Diagnostic[]}
export type ApplyOutcome={outcome:'committed';requestId:Id;committed:true;workspaceDigest:Digest;hostDocumentDigest:Digest;authorityToken:Digest;receiptId:Id;presentation:'ready'|'pending'|'failed'}|{outcome:'rejected';requestId:Id;committed:false;diagnostics:Diagnostic[]}|{outcome:'unknown';requestId:Id;committed:null;recoveryRequestId:Id;writesFrozen:true;potentiallyCommittedResources:'retain-until-same-id-recovery'};
export type Query<R=unknown,B=unknown>={kind:'requirements.inspect';subject:Pin|Source<R,B>}|{kind:'content.export';presetRefs:Pin[];includeAllDependencies:true};
/** Proposed identical human/agent host service. Not implemented in this tranche.
 * reviewToken belongs to ONE live authorized connection, not portable JSON. */
export interface HostService<R=unknown,B=unknown> {
 describe():{kind:'nautilus-tile-authoring-discovery';version:1;status:string;executorImplemented:boolean;publicRegistration:boolean;schema:string;commands:{name:string;schemaPointer:string;effectDomain:string}[]};
 snapshot():{source:Source<R,B>;expected:Expected;hostProtocolVersion:1;missingBindings:Id[]};
 query(query:Query<R,B>):Promise<{kind:'nautilus-tile-authoring-requirements';version:1;subjectDigest:Digest;requiredProfiles:Id[];requiredResources:Pin[];unavailable:Diagnostic[]}|{kind:'nautilus-tile-content-export-plan';version:1;pack:Pack<R>;manifestDigest:Digest;blobSetDigest:Digest;status:'host-byte-export-required'}|Refusal>;
 prepare(command:Command<R>):Promise<Review<R,B>|Refusal>;
 apply(request:{requestId:Id;reviewToken:Digest;expectedTargetDigest:Digest}):Promise<ApplyOutcome>;
 cancel(reviewToken:Digest):{cancelled:boolean};
 recover(requestId:Id):Promise<ApplyOutcome>;
}
