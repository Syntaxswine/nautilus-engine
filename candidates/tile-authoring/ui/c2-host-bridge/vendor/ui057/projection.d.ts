/** DESIGN PROPOSAL ONLY. Not exported, installed, authoritative, or implemented.
 * Scalar/record mirrors below describe copied C0 values; the fixed C0 schema is
 * normative. No DTO, symbol, handle, profile string or UI epoch grants Apply.
 */
export type Id = string;
export type Digest = string;
export type Vec2 = readonly [number, number];
export type Vec3 = readonly [number, number, number];
export interface Pin { readonly id: Id; readonly revision: number; readonly contentDigest: Digest }
export interface Expected {
  readonly workspaceRevision: number; readonly workspaceDigest: Digest;
  readonly hostDocumentDigest: Digest; readonly hostAuthorityToken: Digest;
  readonly authorityContextToken: Digest; readonly contentDigest: Digest;
  readonly decorationDigest: Digest; readonly resourceSetDigest: Digest;
  readonly floorProfileDigest: Digest; readonly stackConstraintsDigest: Digest;
  readonly tileLayoutDigest: Digest; readonly tileCatalogueDigest: Digest;
}
export interface Diagnostic {
  readonly code: Id; readonly path: string; readonly message: string;
  readonly action: string; readonly ownerIds: readonly Id[];
}
export interface Target { readonly ownerId: Id; readonly surfaceId: Id; readonly floorId: Id; readonly bindingDigest: Digest }
export interface GridRef { readonly id: Id; readonly version: 1; readonly digest: Digest }
export interface SourceGrid { readonly id: Id; readonly version: 1; readonly originM: Vec2; readonly cellSizeM: Vec2; readonly profile: 'owner-local-grid-v1' }
export interface SourceFrame {
  readonly id: Id; readonly sourceAnchorId: Id; readonly floorSlot: Id; readonly floorOffsetM: number;
  readonly profile: 'owner-local-level-top-v1'; readonly originM: Vec3;
  readonly axes: readonly [readonly [1,0,0], readonly [0,1,0]]; readonly normal: readonly [0,0,1];
  readonly grid: SourceGrid; readonly geometryDigest: Digest; readonly frameDigest: Digest;
}
export interface Layer { readonly id: Id; readonly order: number; readonly label: string; readonly opacity: number; readonly blendProfile: 'source-over-linear-premultiplied-v1' }
export interface Transform { readonly positionM: Vec2; readonly sizeM: Vec2; readonly rotationRad: number; readonly mirrorU: boolean; readonly pivotUV: Vec2 }
export type Mask = { readonly kind: 'all-surface' } | {
  readonly kind: 'grid-spans'; readonly grid: GridRef;
  readonly rows: readonly { readonly j: number; readonly spans: readonly { readonly i0: number; readonly count: number }[] }[];
};
export interface Graphic { readonly artwork: Pin; readonly form: 'stamp'|'detail'; readonly transform: Transform; readonly opacity: number; readonly tintLinearRGB: Vec3; readonly mask: Mask; readonly wrap: 'clamp'|'repeat' }
export interface Mark { readonly id: Id; readonly revision: number; readonly target: Target; readonly layerId: Id; readonly ordinal: number; readonly graphic: Graphic; readonly groupId: Id|null }
export interface ResourceRef { readonly kind: 'nautilus-artwork-resource-ref'; readonly version: 1; readonly artwork: Pin; readonly imageViewDigest: Digest }
export interface Basis { readonly documentId: Id; readonly contentRevision: number; readonly expected: Expected; readonly floorId: Id }
export interface Gate { readonly enabled: boolean; readonly reason: Diagnostic|null }
export interface Observation {
  readonly profiles: {
    readonly host: 'nautilus-tile-authoring-c2-host-v1'; readonly appearance: 'owner-local-rectangle-appearance-v1';
    readonly ledger: 'owned-appearance-transition-v1'; readonly decoder: 'png-rgba8-srgb-straight-v1';
    readonly sampler: 'linear-premultiplied-bilinear-frame-v1'; readonly clip: 'candidate.level-rectangle-top-v1';
  };
  readonly authority: {
    readonly hostAuthorityToken: Digest; readonly authorityContextToken: Digest; readonly presentationProfileDigest: Digest;
    readonly floorId: Id; readonly mode: 'manual'|'character-follow'|'contact-inspection'; readonly floorEpoch: number;
    readonly providerTokenDigest: Digest; readonly resourceContextEpoch: number; readonly geometryContextEpoch: number;
    readonly rendererContextId: Id; readonly rendererContextEpoch: number;
  };
  readonly visual: { readonly acceptedViewIdentityDigest: Digest; readonly presentationStateDigest: Digest; readonly retirementDebtDigest: Digest };
  readonly history: { readonly journalDigest: Digest; readonly generation: number; readonly stateDigest: Digest };
  readonly resourceLeaseSetDigest: Digest;
  readonly ledger: { readonly sequence: number; readonly scopeDigest: Digest; readonly preservedObjectsDigest: Digest; readonly geometryLeaseSetDigest: Digest; readonly geometryObjectsDigest: Digest };
}
export interface SurfaceChoice { readonly ownerId: Id; readonly ownerLabel: string; readonly definition: Pin; readonly surfaceId: Id; readonly surfaceLabel: string; readonly floorId: Id; readonly floorLabel: string; readonly locked: boolean }
export interface SurfaceSelection {
  readonly ownerId: Id; readonly surfaceId: Id; readonly floorId: Id;
  readonly bindingState: 'unresolved'|'prospective'|'bound'|'refused';
  readonly target: Target|null; readonly frame: SourceFrame; readonly grid: GridRef|null;
  readonly pose: { readonly originM: Vec3; readonly quarterTurns: 0|1|2|3; readonly mirrorX: boolean; readonly locked: boolean; readonly definition: Pin };
  readonly selectedLayerId: Id|null; readonly selectedMarkId: Id|null;
  readonly layers: readonly { readonly value: Layer; readonly markIds: readonly Id[]; readonly opacityStatus: 'opacity-enabled'|'hidden-by-opacity' }[];
  readonly marks: readonly { readonly id: Id; readonly revision: number; readonly layerId: Id; readonly ordinal: number; readonly artwork: Pin; readonly groupId: Id|null }[];
  readonly selectedMark: Mark|null;
  readonly groups: readonly { readonly id: Id; readonly floorId: Id; readonly memberMarkIds: readonly Id[] }[];
  readonly message: string;
}
export type ArtworkDependency =
  | { readonly route: 'retained-two-ops'; readonly state: 'source-exact'|'descriptor-missing'|'bytes-stale'|'bytes-missing'|'bytes-corrupt'; readonly missingPort: 'verifiedBuiltinByteOwner'|null }
  | { readonly route: 'builtin-prefix'; readonly state: 'producer-missing'|'bytes-unverified'|'bytes-stale'|'bytes-missing'|'bytes-corrupt'|'prefix-validated'; readonly missingPort: 'constructBuiltinDependencyPrefix'|'verifiedBuiltinByteOwner'|null };
/** Built-in resourceRef is an expected Core descriptor, not source adoption or byte proof. */
export interface PaletteEntry {
  readonly artwork: Pin; readonly label: string; readonly resourceRef: ResourceRef; readonly frameId: Id;
  readonly origin: 'workspace'|'builtin-offer'; readonly dependency: ArtworkDependency;
  readonly availability: 'retained'|'preparable'|'loading'|'unavailable'|'failed';
  readonly thumbnail: 'unavailable'|'loading'|'verified'|'failed';
  readonly reason: Diagnostic|null;
}
export interface Projection {
  readonly kind: 'nautilus-c2-overlay-ui-projection-proposal'; readonly version: 1;
  readonly basis: Basis; readonly observation: Observation|null;
  readonly availability: 'unavailable'|'inspect-only'|'editable'; readonly message: string;
  readonly choices: readonly SurfaceChoice[]; readonly selection: SurfaceSelection|null;
  readonly palette: readonly PaletteEntry[]; readonly chosenArtwork: Pin|null;
  readonly groupsPresent: boolean;
  readonly current: {
    readonly state: 'idle'|'draft'|'preparing'|'review-ready'|'committed'|'refused'|'unknown';
    readonly requestId: Id|null; readonly recoveryRequestId: Id|null;
    readonly presentation: 'not-reported'|'ready'|'pending'|'failed'; readonly message: string;
    readonly diagnostics: readonly Diagnostic[];
  };
  readonly gates: {
    readonly selection: Gate; readonly firstMark: Gate; readonly 'content.import': Gate; readonly 'surface.layers': Gate;
    readonly 'decoration.add': Gate; readonly 'decoration.update': Gate; readonly 'decoration.remove': Gate;
    readonly review: Gate; readonly apply: Gate; readonly cancel: Gate; readonly recover: Gate;
  };
  readonly deferred: { readonly selectedDefaults: 'unavailable'; readonly bytePacks: 'unavailable'; readonly combinedPlacement: 'unavailable' };
}

/** Proposed private top-level UI field. Existing base data passes unchanged to
 * readTileAuthoringUIView. Root must freeze additional projection comparisons;
 * attaching this field alone is NOT a sufficient C2 invalidation fence.
 */
export interface ExistingC1Read {
  readonly snapshot: { readonly document: { readonly id: Id; readonly sourceJSON: string; readonly contentRevision: number; readonly floorBinding: unknown; readonly finishBinding: unknown }; readonly expected: Expected };
  readonly presentation: { readonly includeSelectedDecorationDefaults: false; readonly retainedApplyRequest: Readonly<{ requestId: Id; reviewToken: Digest; expectedTargetDigest: Digest }> | null };
}
export type C2Read<C1View extends ExistingC1Read> = Readonly<C1View & { readonly overlay: Projection }>;
export type MaskDraft = { readonly kind: 'all-surface' } | { readonly kind: 'grid-cells'; readonly cells: readonly { readonly i: number; readonly j: number }[] };
export interface GraphicDraft { readonly form: 'stamp'|'detail'; readonly transform: Transform; readonly opacity: number; readonly tintLinearRGB: Vec3; readonly mask: MaskDraft }
export type Change =
  | { readonly field: 'artwork'; readonly value: Pin }
  | { readonly field: 'layerId'; readonly value: Id }
  | { readonly field: 'form'; readonly value: 'stamp'|'detail' }
  | { readonly field: 'positionM'|'sizeM'|'pivotUV'; readonly value: Vec2 }
  | { readonly field: 'rotationRad'|'opacity'; readonly value: number }
  | { readonly field: 'mirrorU'; readonly value: boolean }
  | { readonly field: 'tintLinearRGB'; readonly value: Vec3 }
  | { readonly field: 'mask'; readonly value: MaskDraft };
/** Form intents below are local port arguments, not JSONL/command aliases. */
export type Form =
  | { readonly kind: 'first-mark'; readonly artwork: Pin; readonly layer: { readonly label: string; readonly opacity: number }; readonly graphic: GraphicDraft; readonly dependency: 'retained' }
  | { readonly kind: 'first-mark'; readonly artwork: Pin; readonly layer: { readonly label: string; readonly opacity: number }; readonly graphic: GraphicDraft; readonly dependency: 'builtin-import' }
  | { readonly kind: 'decoration.add'; readonly artwork: Pin; readonly layerId: Id; readonly graphic: GraphicDraft }
  | { readonly kind: 'decoration.update'; readonly markId: Id; readonly expectedRevision: number; readonly changes: readonly Change[] }
  | { readonly kind: 'decoration.remove'; readonly markIds: readonly Id[] }
  | { readonly kind: 'surface.layers'; readonly layers: readonly ({ readonly kind: 'existing'; readonly value: Layer } | { readonly kind: 'new'; readonly label: string; readonly order: number; readonly opacity: number })[]; readonly removedLayerMarkIds: readonly Id[] };
/** Core/Host-produced canonical PNG artwork pack, never assembled by UI.
 * Current built-in closure contains only the chosen artwork and its actual
 * dependencies/page/notices. No discovery-time all30 adoption is permitted.
 */
export interface BuiltinArtwork {
 readonly kind: 'nautilus-tile-artwork'; readonly version: 1; readonly id: Id; readonly revision: number; readonly contentDigest: Digest;
 readonly body: {
  readonly label: string;
  readonly blob: { readonly sha256: Digest; readonly byteLength: number; readonly mediaType: 'image/png'; readonly widthPx: number; readonly heightPx: number; readonly colorSpace: 'srgb'; readonly alphaMode: 'straight' };
  readonly imageView: { readonly profile: 'finite-raster-frame-v1'; readonly pageDigest: Digest;
   readonly frame: { readonly id: Id; readonly rectPx: readonly[number,number,number,number]; readonly origin: 'top-left'; readonly imageTop: 'local-positive-v' };
   readonly sampler: { readonly profile: 'linear-premultiplied-bilinear-frame-v1'; readonly alphaFloor8: number; readonly mipmaps: false; readonly stampOutside: 'transparent'; readonly detailWrap: 'repeat-frame' } };
  readonly channels: readonly ('color'|'alpha')[]; readonly requires: readonly string[];
  readonly notices: readonly { readonly id: Id; readonly licenseRef: string; readonly attribution: string; readonly noticeText: string; readonly source: { readonly repository: string; readonly commit: string; readonly path: string } }[];
 };
}
export interface BuiltinArtworkPack {
 readonly kind: 'nautilus-tile-content-pack'; readonly version: 1;
 readonly manifest: { readonly kind: 'nautilus-tile-content'; readonly version: 1; readonly id: Id; readonly definitions: readonly []; readonly presets: readonly []; readonly artwork: readonly BuiltinArtwork[] };
 readonly blobEntries: readonly { readonly sha256: Digest; readonly byteLength: number; readonly entry: string }[]; readonly requires: readonly string[];
}
export interface ContentImportOperation { readonly opId: Id; readonly kind: 'content.import'; readonly body: { readonly pack: BuiltinArtworkPack; readonly conflict: 'refuse-different-content' } }
export type OverlayOperation =
  | ContentImportOperation
  | { readonly opId: Id; readonly kind: 'surface.layers'; readonly body: { readonly target: Target; readonly layers: readonly Layer[]; readonly removedLayerMarkIds: readonly Id[] } }
  | { readonly opId: Id; readonly kind: 'decoration.add'; readonly body: { readonly chunkId: Id; readonly mark: Mark & { readonly revision: 1; readonly groupId: null } } }
  | { readonly opId: Id; readonly kind: 'decoration.update'; readonly body: { readonly markId: Id; readonly expectedRevision: number; readonly replacement: Mark & { readonly groupId: null }; readonly groupPolicy: 'preserve-whole-group' } }
  | { readonly opId: Id; readonly kind: 'decoration.remove'; readonly body: { readonly markIds: readonly Id[]; readonly groupPolicy: 'preserve-whole-group' } };
export interface OverlayCommand { readonly kind: 'nautilus-tile-authoring-command'; readonly version: 1; readonly requestId: Id; readonly expected: Expected; readonly operations: readonly OverlayOperation[]; readonly budgetProfile: 'authoring-reference-proposal-v1' }
export type FirstMarkForm = Extract<Form, { readonly kind: 'first-mark' }>;
export interface RetainedFirstMarkCommand extends Omit<OverlayCommand, 'operations'> {
  readonly operations: readonly [
    { readonly opId: Id; readonly kind: 'surface.layers'; readonly body: { readonly target: Target; readonly layers: readonly [Layer]; readonly removedLayerMarkIds: readonly [] } },
    { readonly opId: Id; readonly kind: 'decoration.add'; readonly body: { readonly chunkId: Id; readonly mark: Mark & { readonly revision: 1; readonly groupId: null } } }
  ];
}
export type RetainedFirstMarkForm = Extract<FirstMarkForm, { readonly dependency: 'retained' }>;
export type BuiltinFirstMarkForm = Extract<FirstMarkForm, { readonly dependency: 'builtin-import' }>;
export interface BuiltinFirstMarkCommand extends Omit<OverlayCommand, 'operations'> {
 readonly operations: readonly [ContentImportOperation, ...ContentImportOperation[], RetainedFirstMarkCommand['operations'][0], RetainedFirstMarkCommand['operations'][1]];
}
export type FirstMarkCommand = RetainedFirstMarkCommand | BuiltinFirstMarkCommand;
export type Construction =
 | { readonly status: 'constructed'; readonly basis: Basis; readonly route: 'retained-first-mark'; readonly command: RetainedFirstMarkCommand }
 | { readonly status: 'constructed'; readonly basis: Basis; readonly route: 'builtin-prefix-first-mark'; readonly command: BuiltinFirstMarkCommand }
 | { readonly status: 'constructed'; readonly basis: Basis; readonly route: 'appearance-edit'; readonly command: OverlayCommand }
 | { readonly status: 'refused'; readonly basis: Basis; readonly diagnostics: readonly Diagnostic[] };
export type SelectionChoice =
  | { readonly kind: 'surface'; readonly ownerId: Id; readonly surfaceId: Id }
  | { readonly kind: 'layer'; readonly layerId: Id }
  | { readonly kind: 'mark'; readonly markId: Id }
  | { readonly kind: 'artwork'; readonly artwork: Pin };
export type Selection = { readonly status: 'selected'; readonly basis: Basis; readonly selection: SurfaceSelection; readonly localPointM: Vec2|null } | { readonly status: 'refused'; readonly basis: Basis; readonly diagnostics: readonly Diagnostic[] };

/** All methods proposed here are PRIVATE Editor-owned UI adapter ports, never
 * methods on the retained seven-method service. They are not implemented here.
 * C1View, OwnedInputHit, ThumbnailHandle are supplied by existing owners.
 * Generic handle types/DTOs do not prove ownership. No new pointer owner exists.
 */
export interface OverlayPorts<C1View extends ExistingC1Read, OwnedInputHit, ThumbnailHandle> {
  selectExisting(read: C2Read<C1View>, choice: SelectionChoice): Selection;
  acceptCanvasSelection(read: C2Read<C1View>, hit: OwnedInputHit): Selection;
  constructOverlayCommand(read: C2Read<C1View>, form: RetainedFirstMarkForm):
    | { readonly status: 'constructed'; readonly basis: Basis; readonly route: 'retained-first-mark'; readonly command: RetainedFirstMarkCommand }
    | { readonly status: 'refused'; readonly basis: Basis; readonly diagnostics: readonly Diagnostic[] };
  constructOverlayCommand(read: C2Read<C1View>, form: BuiltinFirstMarkForm):
    | { readonly status: 'constructed'; readonly basis: Basis; readonly route: 'builtin-prefix-first-mark'; readonly command: BuiltinFirstMarkCommand }
    | { readonly status: 'refused'; readonly basis: Basis; readonly diagnostics: readonly Diagnostic[] };
  constructOverlayCommand(read: C2Read<C1View>, form: Form): Construction;
  resolveVerifiedThumbnail(read: C2Read<C1View>, artwork: Pin):
    | { readonly status: 'verified'; readonly artwork: Pin; readonly resourceRef: ResourceRef; readonly handle: ThumbnailHandle }
    | { readonly status: 'unavailable'; readonly diagnostics: readonly Diagnostic[] };
}
/** Owner adapter attaches the borrowed thumbnail; cleanup removes this UI
 * attachment only. It must not retire the Host-owned image/texture/lease. */
export interface ThumbnailPresentation<ThumbnailHandle> { attach(handle: ThumbnailHandle, element: HTMLElement): () => void }

/** Missing Core/Host dependency, INTERNAL to constructOverlayCommand, not a UI
 * transport method. A validated DTO is not a verified byte capability. The owner
 * must recheck actual selected canonical closure and its existing byte scope.
 * No resource adoption, operation/history ticket, second commit or upload occurs.
 */
export interface BuiltinDependencyPrefixOwner<C1View extends ExistingC1Read, VerifiedByteScope> {
 constructBuiltinDependencyPrefix(read: C2Read<C1View>, selected: Pin):
  | { readonly status: 'validated'; readonly basis: Basis; readonly artwork: Pin; readonly packs: readonly [BuiltinArtworkPack, ...BuiltinArtworkPack[]]; readonly bytes: VerifiedByteScope }
  | { readonly status: 'refused'; readonly basis: Basis; readonly missingPort: 'constructBuiltinDependencyPrefix'|'verifiedBuiltinByteOwner'|null; readonly diagnostics: readonly Diagnostic[] };
}
