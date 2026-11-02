// Declarative contract metadata only: no dispatcher, authority or runtime binding.
const freeze=v=>{if(v&&typeof v==='object'){Object.values(v).forEach(freeze);Object.freeze(v);}return v;};
export const MODULE_SLOTS=freeze(['originalMap','floors','finishes','tileMap','stackConstraints','library','decorations','resources']);
export const COMMANDS=freeze([
  {name:'recipe.create',touches:['library'],meaning:'Create one new immutable definition from supported authored source.'},
  {name:'recipe.clone',touches:['library'],meaning:'Create an explicitly named copy; retain its source pin/provenance.'},
  {name:'recipe.revise',touches:['library'],meaning:'Add a new immutable revision; do not upgrade placed copies.'},
  {name:'preset.save',touches:['library','resources'],meaning:'Capture a definition pin and only explicitly selected decoration defaults.'},
  {name:'preset.place',touches:['tileMap','stackConstraints','library','decorations','resources'],meaning:'Place explicit fresh owner IDs; copy defaults only when requested.'},
  {name:'instance.upgrade',touches:['tileMap','stackConstraints','library','decorations','resources'],meaning:'Upgrade only selected owners with explicit preserving orphan decisions.'},
  {name:'instance.delete',touches:['tileMap','stackConstraints','library','decorations','resources'],meaning:'Delete the whole selected dependency set atomically.'},
  {name:'decoration.batch',touches:['decorations','resources'],meaning:'Apply one finite local or explicitly multi-owner graphic batch; no physical effect.'},
  {name:'workspace.undo',touches:MODULE_SLOTS,meaning:'Restore one exact complete document through the existing authority.'},
  {name:'workspace.redo',touches:MODULE_SLOTS,meaning:'Restore one exact complete document through the existing authority.'},
  {name:'pack.import',touches:['library','resources'],meaning:'Validate complete immutable closure, prepare blobs, then adopt references once.'}
]);
export const AUTHORING_DISCOVERY=freeze({
  kind:'nautilus-tile-authoring-service-contract',version:1,status:'contract-design',available:false,
  unavailableReason:'Shared runtime and component schemas require Architect reconciliation; this is not a registered API.',
  workspace:{kind:'nautilus-tile-workbench-document',version:3,storagePrefix:'nautilus-tile-workbench-v3:'},
  methods:['discover','inspect','prepare','apply','recover','retryPresentation','save','exportPack','dispose'],
  commands:COMMANDS,moduleSlots:MODULE_SLOTS,
  requiredBindings:['actual-public-tile-core','accepted-domain-schemas','authorisation-and-locks','one-shared-codec-authority-history','immutable-blob-store','image-decode-and-provenance','optional-preview-provider'],
  limits:{status:'proposed-unmeasured',maxLayersPerSurface:8,maxStoredMarksPerChunk:4096,maxResidentMarks:1024,maxAdditionalDecodedBytes:33554432,maxRoots:2,maxTriangles:50000},
  forbiddenClaims:['public-registration','physical-displacement','obstruction','support','navigation','damage','fire','ambient-expiry','measured-device-performance']
});
