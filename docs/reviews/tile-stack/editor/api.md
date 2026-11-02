# Editor Gate A: adapter and workspace proposal

Fixed brief/base: `5d69c2130eb64b6f4e31bc672e884bdc33bf47d2`. Runtime baseline: `2502646482218524fd5129641da769bb82462e4d`. This candidate changes no protected host files, source fences, public exports, pins, versions or old saves. Architect must reconcile this first proposal with UI/Coder/Artist before freezing it. No real fifteen-floor session is claimed at Gate A.

## Explicit UI adapter version 2

Discriminator: `{kind:"nautilus-tile-stack-editor-adapter",version:2}`. The fifteen required own methods retain their signatures: `getSnapshot`, `subscribe`, `setTool`, `selectOwner`, `setDraft`, `review`, `apply`, `cancel`, `undo`, `redo`, `save`, `open`, `recover`, `retryPresentation`, `dispose`. Return/error/Promise conventions remain those of [the accepted v1 interface](../../smart-tile-editor/contract.md). New data is never silently passed to a v1 adapter. `assertTileStackAdapter` requires the explicit v2 snapshot discriminator.

Optional own methods:

- `lockOwner(ownerId)`: existing false→true lock Review result, followed by explicit Apply.
- `setInspection({mode,cutawayFloorId})`: derived visibility only. Mode is `selected-floor`, `overview` or `cutaway`. First two require `null`; cutaway requires a declared ID. Enable only with `actions.setInspection`. Artist's actual-height inspection presentation still needs a fixed relay; this hook grants no solid-floor/support capability.

Use the one existing host-supplied floor controller and DOM widget, outside the adapter. `floorControllerRecords(binding)` projects its exact fifteen `{id,label,elevationM}` records. The widget shows at most five labels; UI does not create another controller or derive heights. Input/draft/review ownership retires before drawing-plane **or mode** changes. Existing key/wheel/form guards remain; canvas wheel remains zoom. Follow/contact controls require actual supplied subjects/services, with honest unavailable reasons.

Snapshot is the accepted v1 field set with `version:2` and these additions:

```text
interface: {kind:"nautilus-tile-stack-editor-adapter",version:2}
workspace: {id,checkpointVersion:2,policyToken,
            floorProfile:{id,version},floorTableId,floorTableToken,
            sourceSha256,finishBinding:{id,version,digest}}
floors[]: {id,label,elevationM,source:{kind:"legacy-layer",layerIndex}
                                 |{kind:"authored-tile"}}
finishCatalogue: {id,version,digest,entries:[{id,version,label,available,reason}]}
inspection: {mode:"selected-floor"|"overview"|"cutaway",cutawayFloorId:null|ID}
limits: <unchanged SMART_TILE_LIMITS values>
```

All snapshot data is detached plain data. Existing `floor` remains `{id,label,elevationM,mode}` from the real controller. Owners/history/phases/diagnostics/readiness/resources retain existing meanings. `tileStackActions` reuses `smartTileActions`, adding `stack` (= setDraft) and `setInspection` (= setDraft and actually bound inspection). UI has no second permissive phase/history/recovery machine. Unknown acceptance still freezes editing, undo/redo and save/open.

The finish catalogue above is a UI projection of the fixed Artist data, not its renderer/resource schema. Available rows require `reason:null`; unavailable rows require a nonempty reason. UI presents labels, stable IDs and unavailable reasons; it cannot infer support from a family name. Exact Artist/Coder result shapes need Architect relay before binding them. No uncommitted peer input or fake public provider is implied.

Closed draft shapes:

```text
rectangle: <old rectangle fields plus finishId>
path:      <old path fields plus finishId; original level controls retained>
finish:    {tool:"finish",ownerId,finishId}
stack:     {tool:"stack",ownerId:null,origin:[x,y],widthM,depthM,seed,
            floorIds:[IDs in declared table order],minimumClearanceM,
            lockPolicy:"all-except-highest",finishId}
```

Stack uses 2–15 unique selected floor IDs, native metre dimensions, uint32 seed and an explicit positive clearance. `validateStackDraft` validates structure only; it never lowers clearance or claims feasibility. The public-v1 planner must supply all required per-reservation obligations and refusals. One Review covers the complete request; one Apply commits it once. UI never creates owners/locks/relations or source recipes. New finish IDs resolve through a fixed catalogue; compatibility choices may retain `skin.painterly`, `skin.slate`, `skin.sandstone`. Version 1 keeps its old `skinId`/draft shapes unchanged.

Readiness keys remain authoring/shape/visual/query/support/navigation/fire/water/game, each `{state}`; visual remains `{state,revision}`. Candidate review does not advance confirmed visual revision. No live gameplay binding is fabricated. Aggregate budgets remain two roots, 50,000 triangles, 1,024 cells, including hidden/acquiring/retiring allocations. Resolver limits remain 32 owners/recipes, 256 steps, 32 closure and 100,000 spatial/geometry work units. Fifteen 8×4 decks imply 480 one-metre cells per view and 960 for accepted plus candidate: source-derived counts, not measured device performance.

## Floor/checkpoint/storage proposal

Two literal profiles are predeclared: `aft-native-fifteen@1` (0 through 29.68 m using the exact fifteen values from the brief) and `nonuniform-fifteen@1` (0 through 42.7 m, with F03 at 6.75 m). Both retain stable IDs F00–F14, labels 1–15, real legacy references 0/1/2 on F00/F01/F02 and twelve authored tile-only identities. Heights are explicit data, never index times a height. Unknown versions/profiles, forged/duplicate layers, malformed variants, altered table identity, records or source bytes refuse. No active table mutation API exists.

```text
checkpoint: {kind:"nautilus-smart-tile-editor-checkpoint",version:2,
             document:{id,sourceJSON,floorBinding,finishBinding,tileBundle},journal}
floorBinding: {kind:"nautilus-tile-stack-floor-binding",version:1,id:<table ID>,
               profile:{id,version:1},sourceSha256,floors:[...above...]}
finishBinding: {id,version:1,digest:<fixed catalogue content digest>}
journal: {kind:"nautilus-smart-tile-editor-journal",version:2,
          serial,receipts,pending:null|operation}
operation: <same v1 semantic fields and expected token/contextToken, version:2>
```

The complete original three-layer source JSON string is retained verbatim, including whitespace and bounded unknown data. Its raw-byte SHA-256 binds the exact source. Public map validation does not replace it with normalized output. The complete canonical v1 tile bundle uses the exact `{id,elevationM}` floor table. Finish choices and `cross.clearanceM` remain source in that bundle; the exact original request stays in pending/settled operation data. Meshes/cells/visibility are derived.

Storage namespace: `nautilus-smart-tile-editor-stack-v2:<workspace ID>`, created only when absent. The original `nautilus-smart-tile-editor-proof-v1` stays with the accepted workshop. No automatic migration, overwrite of an existing namespace, old receipt restamping, journal reset or pending clearing. These are new workspaces, not expanded legacy maps.

Live context must bind document/layout identities, raw source hash, exact floor table/profile identity, fixed finish catalogue identity, selected floor/mode/epoch and actual presenter/pool token. The table/catalogue are predeclared before the authority opens, not updated during a write/session.

## Smallest shared-policy seam: Gate B required

Concrete conflict: the frozen v1 codec requires `legacyLayer` on every floor and hardcodes checkpoint/journal/operation version 1. Its session imports that codec, hardcodes draft planning and lacks complete table/profile identity in live context. Fifteen-floor data must not be disguised as v1 or forced through a bypass.

Propose one extracted `createCheckpointCodec(policy)` containing the **existing** receipt/token/stage/settle/recovery algorithm. Policy supplies format discriminators, `validateDocument`, `assertDocumentTransition` (read-only bindings/layout identity) and schema-specific operation validation. The v1 policy retains exact old semantics. The v2 policy adds the document/floor/catalogue boundary. Authority/storage borrow that one codec; their writer fence/CAS/unknown-ack algorithm stays unchanged. Do not create a second candidate CAS/recovery implementation.

The same session accepts explicit codec/draft-planner/snapshot/context policy hooks. It retains one resource-free `createWindowAuthoringJournal`, one retained public tile consumer, one input owner/view coalescer/borrowed floor controller. Never mount old and stack coordinators together. Positive acknowledgement remains committed after display failure; retry presentation without replay. Unknown acknowledgement retains the original request and freezes overwrite until same-ID recovery.

Gate A implements pure floor/document policy and empty new-workspace proposals. Noninitial v2 journals must refuse until the shared codec extraction is accepted; do not copy recovery or clear them to make them load. Recovery fixtures exercise the unchanged real v1 authority/history for compatibility and specify the v2 obligations. Gate B must demonstrate those obligations on actual fifteen-floor checkpoints before acceptance.

Builder checklist: Architect reconciles fixed adapter/planner/catalogue/UI commits; approves the narrowly scoped codec/session extraction and corresponding source-fence adaptation; preserves v1 save/behavior compatibility; binds components once; reruns old 27 browser checks plus fifteen-floor/nonuniform/finish/recovery cases; owns registration/CI/promotion. No consumer, package version or Sites changes belong to this candidate.

Accuracy: explicit native tables and real layer references are preferred for tall authoring; flat skins do not certify physical floors. Efficiency: shared history/authority and unchanged ceilings are code-based cost controls, with no benchmark claim. Narrative: friendly shared finishes and tall-floor inspection are the recommended building workflow (subjective), while preserving the old workshop.
