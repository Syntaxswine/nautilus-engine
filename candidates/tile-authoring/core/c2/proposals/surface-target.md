# First surface target — separate producer proposal

Status: proposal only, for Architect freeze before implementation. This adds no runtime/public export, canonical command/query, operation, authority or persisted schema. It is separate from the combined Plan3 profile and may serve the accepted private Stage A painting flow. No combined placement is needed to derive a target for an already placed unpainted rectangle.

## Gap and proposed boundary

Reviewed public C1 createRectangleDefinition returns immutable Surface/Grid descriptors, not a placed owner's MarkTarget, prospective binding or SourceGridRef. inspectTileAuthoringRequirements returns dependency requirements, not these descriptors. Accepted private A sourceSurface is internal and requires a caller-supplied bindingDigest. There is no reviewed public producer for the missing first-paint target; requiring UI to recreate that hash would duplicate Core policy. Fixed Main818 model.js/geometry.js and accepted A operations.js (8b4cd72c2d8f424d6811196d9651916bb7e9e2bd) establish the existing domains below.

Propose private pure deriveTileSurfaceTarget(tiles,{document,expectedSource,selection,limits?}). selection is exactly explicit ownerId, surfaceId and the CURRENT definition Pin. expectedSource is the captured complete hostDocumentDigest and contentRevision (named workspaceRevision), supplied before UI work. The function strictly copies and validates the COMPLETE v3 document, native original-map/floor bindings, resolved public bundle, all immutable records/digests/notices, ownership, decorations and resource closure. It verifies expectedSource against that unchanged input, owner pin and actual placed recipe/content digest, then resolves exactly the selected existing semantic surface and floor. It does not select the first mesh, choose IDs, infer UVs or look up a moving definition.

Only the current supported local, zero-base, four-line level rectangle with the accepted owner-local-level-top-v1 frame/native XY axes and zero surface floorOffsetM/originM.z is accepted. Validate native floor mapping/elevation, source anchor, grid profile and exact source/frame/grid digests. Locked owners refuse even for a prospective target. Missing/ambiguous owners/surfaces, stale source or pin, unsupported source profiles/frame/shape/required profiles, unresolved references and malformed existing bindings refuse; never normalize or repair them. Other geometry requires a separately accepted producer profile.

## Result and hash domains

The result is detached frozen DATA: sourceDocumentDigest/revision, state:existing|prospective, complete saved source Surface descriptor, bindingSeed (the exact eight binding fields WITHOUT layers), MarkTarget and SourceGridRef. existingBinding is the exact existing SurfaceBinding including its layers/order when present, otherwise null. A prospective seed is NOT a saved SurfaceBinding: the frozen C0 schema requires one to eight explicit layers, so do not invent an invalid empty-layer binding or insert a default layer. If present, preserve the existing binding and descriptor exactly after validation. Never reorder layers, rewrite pins, replace hash strings or fill missing fields.

Use the ACTUAL public tileLayoutToken over plain canonical data, as existing Core hash does. It hashes its canonical sorted-key JSON using the fixed SHA implementation; no domain prefix, raw renderer bytes or new salt is introduced. Relevant source domains are:

| Value | Exact existing domain |
| --- | --- |
| Definition contentDigest | Complete immutable definition record with only contentDigest removed, including kind/version/id/revision/body/notices |
| Recipe instance contentDigest | The actual public compileTileRecipe(definition.body.recipe).contentDigest; do not substitute definition.contentDigest |
| Source hostDocumentDigest | Complete unchanged WorkbenchDocument@3; its sourceJSON string is a field, including original string contents |
| Source geometryDigest | {profile:surface.profile,frame:definition.body.recipe.frame,shape:definition.body.recipe.shape} |
| Source frameDigest | COMPLETE saved surface with only frameDigest removed; includes id/sourceAnchorId/floorSlot/floorOffsetM/profile/originM/axes/normal/grid/geometryDigest |
| gridDigest | COMPLETE saved surface.grid, including id/version/originM/cellSizeM/profile |
| bindingDigest | {ownerId,surfaceId,floorId,geometryDigest,frameDigest,gridDigest} with EXACT selected current source values |
| MarkTarget | {ownerId,surfaceId,floorId,bindingDigest} |
| SourceGridRef | {id:surface.grid.id,version:surface.grid.version,digest:gridDigest} |

The legacy floorBinding.sourceSha256 is separately SHA-256 of the original sourceJSON UTF-8 string. It is not hostDocumentDigest. bindingDigest intentionally does not include definition Pin, owner pose, layers, native floor presentation epoch or resources: preserve the frozen domain; the bindingSeed carries the current definition Pin and full expectedSource binds those complete document facts. Current owner pose is applied AFTER lifting local metres through the source origin/axes. Neither world coordinates nor renderer [x,h,y] conversion enters these hashes. There is no sampling/UV or raster/mesh observation in this producer.

## Work, use and stale outcomes

Limits only tighten existing finite caps: source/output4,000,000 bytes; aggregate input6,000,000; planner1,000,000 units; 200,000 nodes/depth32. Use strict acyclic own plain-data reads with no accessors/symbols/hidden fields, canonical shape and actual public compiler/bundle validation. Charge complete reads, record/source compilation bounds, traversals, hash serialization and output copies using the existing private Budget rules. Return actual seven-field work, including final unitsCharged/outputBytes. Measure COMPLETE final returned metadata including its own final work values with a finite bounded reconciliation or conservative header reservation; exact limit passes and one below refuses. No unbounded repeated full-document pass, fresh budget halfway through, hardcoded zero work or cap increase. Within a larger same authoring attempt, carry this actual work into that attempt; an independent snapshot read has its own bounded read budget and grants no editing credit.

Refusals use existing typed data/diagnostic errors plus proposed SURFACE_TARGET_STALE_SOURCE, SURFACE_TARGET_STALE_PIN, SURFACE_TARGET_UNSUPPORTED and LOCK_CONFLICT codes. Errors manufacture no request/command ID, operation or ticket. Pure data cannot tell whether the live Host changed after its source copy: the Editor must compare the result's full source digest/revision with its CURRENT snapshot before exposing/using it. Any mismatch discards the proposal; never refresh a staged command's Expected to make it pass.

Editor may expose this result through a derived snapshot/proposal port over its validated current document. Humans and JSONL still stage the same canonical batch: surface.layers with target and explicit layer IDs/order, followed by decoration.add with that target/layer and explicit mark/chunk/artwork data; content.import is explicit if required. Masks may use the returned SourceGridRef. The existing Core planner and final binder revalidate the complete original canonical command/Expected, owner lock/source/frame/grid/resources and live captures. The producer cannot insert surfaces, make operations/tickets, acquire native/decoder resources, prepare geometry, change history or authorize Apply. Its output cannot act as a capability or bypass C0/C2 guards.

## Comparison and freeze evidence

For Nautilus's first painted rectangle, deriving from current exact semantic source is preferred to UI hashing or mesh-UV inference. Accuracy: this matches the saved source and current definition pin; it is a source-correctness claim, not physical realism. Efficiency: it centralizes bounded validation/hash work and avoids a mesh readback; this is a code-based estimate without timing measurements. Narrative: the first mark targets the source-local rectangle the author selected and survives presentation changes (subjective authoring preference). Preserve all existing binding domains/profiles; unsupported forms refuse explicitly.

Before implementation freeze these closed input/result/seed types, domains and limits. Acceptance needs a genuine initially unpainted placed rectangle, existing binding preservation, exact domain oracle, stale document/pin, locked/unsupported/frame/grid and hostile-data refusals, exact/one-below work/output controls, and later actual Editor snapshot/canonical-batch review. The proposal's source-domain checks are reference evidence only; no new producer, UI hashing helper or runtime integration is implemented here.
