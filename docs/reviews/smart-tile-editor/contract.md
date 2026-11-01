# Smart Tile Editor interface v1 — foundation

Implementation base: exact reviewed Root `0fbc5c3630e257dfcd7a6ea82027634dfe6989b6`. This is an Editor-local reference-host contract, not a public engine schema/export/capability or a game-adoption claim. The first foundation commit fixes checkpoint/action-state semantics and pure conformance. Controller, storage, input, render acquisition and interactive acceptance follow on this same branch. Prior window checkpoints remain preserved.

## Boundaries and dependencies

Use the actual public `core/tiles`, `core/tiles/art`, `core/tiles/art/example`, `renderer/tiles/art/three` and the host Three. `prepareTileEdit`/`createRetainedTileConsumer` owns matching and finite alternative selection. Public example factories supply source recipes. The host owns exactly one atomic CAS/history/journal. Reuse the accepted resource-free journal algorithm already in `packages/windows-authoring/journal.js` as a generic serialized-history helper; do not instantiate a window-authoring document, add a second undo stack, or change its existing runtime. No independent matcher, input router, floor authority, private presenter or v2 fallback is introduced.

The source map is read-only. Its complete original JSON string is retained verbatim, with unknown bounded fields and character/resource data. Public map validation/inspection never replaces it with normalized output. Tile authority is a sibling complete canonical v1 bundle. Window/parts/world/block composition is refused rather than unwrapped or nested. The proof does not change portable map/block formats or the legacy editor outside this session.

## Checkpoint and recovery

Exact checkpoint fields:

```text
kind: nautilus-smart-tile-editor-checkpoint
version: 1
document: {id, sourceJSON, floorBinding, tileBundle}
floorBinding: {id: editor-supplied-native-floors-v1, version:1, floors}
floors[]: {id:string, label, elevationM, legacyLayer}
journal: {kind:nautilus-smart-tile-editor-journal, version:1,
          serial, receipts, pending:null|operation}
```

The supplied floor table is authoritative: preserve IDs/order/native elevations, bind each source layer explicitly and require exact equality with tile-layout floors. This proof uses the real native selector/controller records; it does not derive metres from a layer index. Current legacy renderer mapping is provided by the existing Editor adapter (2.12 m); that mapping is not a generic world or wall-height policy. Whole-shape IDs, controls, dimensions, seeds, templates and locks live in the canonical bundle. Derived cells, meshes, controller tickets, kernel handles and material objects never enter checkpoint data.

Operation v1 is `{kind:nautilus-smart-tile-editor-operation,version:1,id,documentId,action,expected,request,targetBundle}`. `action` is edit/undo/redo; `expected` contains the complete accepted checkpoint token and captured context token. `request.id` must equal the original operation ID. Edit requests retain the actual public repair request; history requests retain an explicit restore target/digest. Store the whole request and target in the pending write-ahead record before attempting acceptance. Do not regenerate IDs or alternatives during recovery.

A settled receipt is `{id,operationDigest,outcome,beforeToken,afterDocumentDigest,operation}`. Outcomes are committed/not-committed. Pending staging leaves the document unchanged; acceptance changes the document and appends its receipt atomically. The checkpoint token covers source, floors, bundle and the complete settled journal, excluding only the separately checked pending record. Serial equals receipt count. At 128 receipts or any aggregate limit, refuse without eviction/compaction/reset.

History is **session-only**: up to 64 combined undo/redo entries and 16 MB, using the existing journal's trimming and preparation tickets. Saving/reopening preserves accepted source plus the durable operation journal, but starts empty Undo/Redo. A pending checkpoint reopens frozen for same-ID recovery. Same-session recovery uses the original history ticket; reopening recovery starts fresh history after authoritative settlement. Undo/redo compile their exact saved targets through public `openTileBundle(...,{requireResolved:true})` and use the same host CAS, not another repair resolver.

The trusted synchronous storage boundary reads the authoritative complete checkpoint and writes a prospective one with a last-moment active fence. Known false means no write. Throws/nonboolean acknowledgements mean unknown. Recovery reads the same authoritative request: exact matching receipt/target confirms acceptance; exact unchanged before/pending state can settle refusal; divergence remains frozen. Never adopt a foreign document, create a new request, replay an accepted edit or overwrite a recovery record merely because a callback threw. A positive acknowledgement remains committed even if later display/notification/cleanup fails.

Source max 4 MB, canonical bundle max 4 MB, complete encoded checkpoint max 16 MB, aggregate 1,000,000 nodes/depth 40. Public child bounds remain intact; a large individually valid child can still exceed the complete checkpoint budget. Unknown versions/fields, accessors, symbols, sparse arrays, nonfinite/cyclic/exotic data refuse before invocation. Original source text is retained rather than reconstructed.

## Stable UI adapter

The controller will expose one own-method adapter conforming to `SMART_TILE_INTERFACE.version === 1` in `apps/editor/smart-tile/contract.js`. UI imports that contract or consumes the adapter; it owns no history, storage, resolver or floor state.

| Method | Interface/result |
| --- | --- |
| `getSnapshot()` | Detached snapshot described below |
| `subscribe(listener)` | Immediate snapshot then updates; returns unsubscribe; observer errors are bounded and cannot undo acceptance |
| `setTool(tool)` | rectangle/path/finish; synchronously retires the previous draft before callback-capable work |
| `selectOwner(idOrNull)` | Whole-owner selection only; a hit on a derived cell resolves to its owner |
| `setDraft(draft)` | Copies the exact intent, invalidates older review and coalesces acquisition; no accepted write |
| `review()` | Promise of `{ok,reviewId?,requestId?,code?,diagnostics?}`; calls public preparation and stages native presentation |
| `apply(reviewId)` | Promise of `{ok,committed:boolean|null,requestId,code?,diagnostics?}`; accepts only the current acquired one-use review |
| `cancel(reason)` | Synchronously retires input/ticket ownership; recovery state cannot be cancelled into a new edit |
| `undo()` / `redo()` | Promise of the same commit result; validate/acquire exact target before single atomic history change |
| `save()` | `{ok,checkpointJSON?,code?,diagnostics?}`; no normal/overwriting save while acceptance is unknown |
| `open(checkpointJSON)` | Promise; full validation/acquisition before replacement; failure preserves source/history/view; unknown acceptance blocks open |
| `recover(requestId)` | Promise; authoritative reconciliation of the exact retained request only |
| `retryPresentation()` | Promise; rebuild accepted presentation only, with no command/CAS/history replay |
| `dispose()` | Synchronous retirement of ownership; drain all owned resources, preserve borrowed services/pool and durable recovery |

Snapshot fields are `{version,phase,tool,selectedOwnerId,draft,reviewId,requestId,recoveryId,revision,checkpointSerial,history,floor,owners,readiness,actions,diagnostics,resources}`. `history` is `{undo,redo,bytes,maxEntries,maxBytes}`; `floor` is the supplied `{id,label,elevationM,mode}`. Owners expose `{id,recipeId,locked,shapeKind,skinId,floorId}`. Diagnostics are bounded `{code,path,message,action}` plus available owner/port references. Resources report accepted/candidate/retiring roots and aggregate triangles/cells. UI uses derived `actions`, not its own permissive phase table.

Exact readiness declarations: keys are `authoring,shape,visual,query,support,navigation,fire,water,game`. Every value is a record with a string `state`. `authoring.state` is `saveable` or `recovery-required`; `shape.state` is `resolved` after actual public-core validation. `visual` is `{state,revision}`, where state is `accepted,candidate,pending,failed,unconfirmed` and revision is the nonnegative confirmed presentation/history revision or `null` before any confirmed view. A visible review reports `candidate`; it does not advance the confirmed revision. Unknown acceptance reports `unconfirmed`, and post-commit presentation failure reports `failed`. The six gameplay/service keys have state `unbound` throughout this proof. Controls and core saveability do not certify a visible accepted projection or gameplay provider.

Exact resources declarations: `{accepted,candidate,acquiring,retiring,roots,triangles,cells,maxRoots,maxTriangles,maxCells}`. All values are nonnegative integers. The first four count owned root allocations in each state; `roots` is their aggregate. `triangles,cells` include accepted, candidate, in-flight reserved allowances and unverified retiring allocations. The maxima are `2,50000,1024`. A reservation remains charged until acquisition resolves and either transfers actual usage or verifies retirement. Released resources are absent; an unverified cleanup remains charged. These are budgets/counts, not a frame-rate claim.

One optional own method is declared separately from the 15 required methods: `lockOwner(ownerId)` returns the same Promise review result as `review()`. It prepares a whole-instance false→true lock through public v1 repair, then requires explicit `apply(reviewId)`. A locked target refuses; unlocking/per-field locks are unsupported. UI can feature-detect this hook and must use `actions.setDraft` to gate it. It owns no lock or history state.

`open(checkpointJSON)` reopens the current authoritative complete checkpoint, validates/acquires before resetting session-only history, and makes no storage write. A historical/foreign file returns `CHECKPOINT_AUTHORITY_MISMATCH` preserving the current source/history/view. A separate new session can inspect a different complete checkpoint under its own explicit authority. This bounded proof does not overwrite/reset an existing durable operation journal to restore an old file.

Phases: idle, draft, preparing, review, applying, recovery-required, presentation-error, disposed. Readiness separately reports authoring/saveability, shape resolution, visual acquisition and unbound query/support/navigation/fire/water/game acceptance. An engine entry or visible surface is not a gameplay provider.

Drafts are closed records:

```text
rectangle: {tool, ownerId:null|string, origin:[x,y], widthM, depthM, seed}
path:      {tool, ownerId:null|string, origin:[x,y], path:<original v1 line/arc/cubic>, widthM, seed}
finish:    {tool, ownerId:string, skinId}
```

The active real floor supplies placement h. First proof permits level local path controls, constant width and zero additional floor offset. Finish clones the selected owner's shared recipe, leaving locked neighbours and canonical boundary materials/profiles unchanged. The original repair request and versioned recipe/selection seeds persist. Rectangle overlap, Boolean/geometry Paint, graded/non-simple paths, unknown skins/profiles and unsupported repair coverage return named refusal. There is no generic Alongside workaround. Direct whole-instance lock metadata authoring must be explicit; the initial lock fixture does not imply per-field locks.

## Input, observers and resources

Rectangle/Path/Finish all use explicit Review then Apply on desktop and phone. UI fixes gesture ownership at pointer-down. A second finger cancels and consumes the whole sequence until all pointers lift. Blur, hidden document and lost capture retire input. Scoped Enter cannot Finish then Apply on one activation; native Space/assistive activation remains usable. Reuse the existing input/component direction; do not install parallel gesture routers.

Construction starts in manual floor inspection. Borrow the actual five-label controller, including its available IDs and wheel/key guards. Floor **or mode** change invalidates drafts/tickets synchronously before changing the drawing plane. Follow/Eye requires actual supplied character/contact services; this proof creates neither. UI floor controls call the real controller, never a second session-owned floor selector.

Retire operation/resource ownership before invoking observers, attach/detach, material callbacks or disposal events. Fence reentry, cancellation and stale attachment. Drain every owned geometry/root even if a callback throws; report bounded cleanup failures after structural retirement. Never dispose host Three, renderer, materials/maps, pools or neighbour roots. Keep a positive acceptance and retry only presentation after post-commit display failure.

At most two tile roots **total across accepted/candidate/retiring**, 50,000 aggregate owned triangles and 1,024 derived cells; one in-flight acquisition plus one coalesced latest intent. A retiring allocation still consumes budget until retirement is verified. Resolver proof bounds are 32 authored owners/recipes, 256 search steps, 32 closure, 100,000 spatial tests and 100,000 geometry work units. These are proof budgets, not world limits or measured phone performance. Every acquisition uses remaining aggregate budget, not a fresh per-preview allowance.

## Acceptance and remaining implementation

Pure foundation tests retain complete source/floors, exercise actual shared-recipe repair, durable original request/receipt round trips, before-/after-write recovery classification, stale/foreign refusal and unknown action freezes. Controller must add actual CAS/fault integration, the one journal instance, async view leases, shared input/floor binding, save/reopen and source/built/installed browser proof. No interactive readiness is claimed by this foundation.

First interactive sequence: create 8 x 4 m rectangle across a sector seam; add one supported straight neighbour; lock the neighbour and finish only the selected owner; preserve line/arc/cubic controls for isolated paths; place a level surface on a supplied native floor. Verify one undo per accepted operation, exact save/reopen, failed-edit redo retention, late cancel/coalescing, unknown same-ID recovery, post-commit display retry and borrowed-pool/neighbour survival. Unsupported save/export/send names the missing adapter/capability and preserves the complete source. The legacy editor and donor/game pins remain outside this session.

Accuracy: prefer native controls/floors and actual public interface proofs; flat surfaces do not imply solids. Efficiency: bounded/coalesced repair and views are code-based expectations, not benchmarks. Narrative: parameter/family growth preserves the broad construction direction and game-specific materials (subjective preference). Root owns registration, release, UI handoff and combined acceptance.

Foundation validation: all 12 new pure conformance cases pass; `npm run check`, `npm test` (827 passed), `npm run test:upstream` (32 passed) and `npm run build` (501 module paths) pass on the fixed base. No browser/presentation or completed interactive-session claim is made by this first checkpoint; that proof is required for the controller tranche.
