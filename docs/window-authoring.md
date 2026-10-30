# Native window authoring

Status: unregistered headless candidate on main base `5f3627cd9fc4d95f15b7f1eefafdfb1d6034475f`. Proposed entry `@nautilus-engine/core/windows/authoring`; authoring schema `nautilus-window-authoring` v1, URI `urn:nautilus:schema:window-authoring:1`. Root export, schema registry and distribution registration require Architect review. The private installed overlay proves partial availability only. There is no editor chrome, native presenter or production game adoption in this checkpoint.

`windowAuthoringUsageCard()` links this guide, the schema and [registration request](reviews/window-authoring/registration-request.json) using package-relative URLs. The existing [pane/host guide](adapters/farmyard-window-impacts.md) owns runtime behavior and the six host-service contracts. Preserve its notices and [source audit](reviews/farmyard-windows/source-audit.json).

The authoring adapter owns a complete base map, authored window references and bounded undo/redo. It prepares native geometry through the accepted public compiler. The host owns actor bodies, complete world queries, confirmed impacts, costs, clocks, inventory, pane epochs, durable receipts and atomic persistence. A separate reviewed presenter borrows the host Three namespace and owns its visual resources.

## Saved envelope and limits

The exact root fields are `kind`, `version`, `id`, `worldId`, `profileId`, `definitions:{sourceCommit,version}`, `baseBlueprint`, `placements`, `bindings`. No readiness, broken masks, runtime epochs, receipts, history, compiler handles or query revisions are saved. Unknown root/placement fields and future versions refuse.

`baseBlueprint` retains the complete portable map v2, including unknown bounded JSON, property/array order, typed numeric/string values and negative zero. Public map validation checks the base; its normalized result never replaces the original. All base edges remain the underlay, including edges covered by a window. `replace-base` refuses changes to any currently covered edge or lock; remove/move the overlay first. Removing an overlay reveals the original base. Other supported base edits retain their unknown fields and use the same history transaction.

The wrapper has an aggregate 8,000,000 UTF-8 byte, 500,000-node, depth-24 budget, at most 1,024 placements and bindings, and the inherited 4,000,000-byte base limit. Arrays are bounded to 65,536 entries. Descriptor checks precede provider/legacy validation: getters, `toJSON` functions, symbols, hidden fields, sparse arrays, cycles and non-JSON values refuse without invocation. Structural JSON Schema and executable native/reference/budget checks are complementary.

This is a separate wrapper, not an extension of parts-v1 or world-v1. Embedded `farmyardWindows`, pane-state/save/geometry authorities and old pane extension fields refuse, even when nested in base metadata. Keep the original file; no migration, repair, epoch allocation or fallback export is performed.

## Native space and identities

Definitions remain fixed to Farmyard source `251bf8094b5f9ebe44208443084c1a6d6658512a`, version `industrial-windows/2`, profile `farmyard-quarter-turn-first-hit-pane-v1`. There are 39 presets and the configurable `window.full.borderless` template. The retained [catalogue facts](../tests/fixtures/window-authoring/source-catalogue.json) are original preparation evidence from `9f525026f3185e0dce8115ce3a69f3a175ec7cf4`; historical metadata in those bytes is unchanged. [Extraction provenance](reviews/window-authoring/dependencies.json) records the two copied fixtures and small headless journal extraction from `136e3ae7227b8b280e452fc9bcd5f11c3d91ac02`.

Placement uses native planar metre `x,y`, vertical metre geometry and ground floor only. Source `z` is a layer index and only zero is supported. Positive quarter turns around +Y map a planar offset `(dx,dy)` to `(dy,-dx)`. The `quarter-turn` command requires an explicit native metre pivot; it never rounds or snaps invalid results. Upper floors, nonzero actor/prop layers, stairs and climbs remain saveable base data but prevent a nonempty-pane handoff. No layer-to-metre conversion or scale correction is guessed.

For a window of integer native width `w`, `windowPlacementAtEdge` starts its span at the selected cell: `s:x:y` gives centre `(x+(w-1)/2,y+.5)`; `e:x:y` gives `(x+.5,y+(w-1)/2)`. Axis-compatible rotations are 0/180 or 90/270. Full native placement IDs stay intact (up to 96 characters, no slash); every placement has a distinct explicit visual alias of at most 24 characters. Copies require new IDs and aliases and carry authored configuration only.

Full native presets are 2.12 m tall, distinct from the inherited 2 m wall. Native wall thickness is .20 m, frame depth .16 m and glass thickness .008 m. A template height entered as 5 metres stays 5 m; 5 storeys explicitly uses the source conversion to 10.6 m. It remains one pane, without invented mullions. Joins are explicit left/right values; adjacent placement does not auto-edit its neighbor. Dimensions do not rescale the base or imply a traversal policy.

The earlier compact/period decorative sash sculptures at commit `90054d07134116a5d9661f8318a76fe68f922aad`, `packages/window-kit/index.js` and `three.js`, are **2 m complete wall bays: .5 m flank + 1 m opening + .5 m flank**. Their IDs are `window-bay-compact` and `window-bay-period`. They are different assets from a 2 m glazing preset in this native catalogue; this authoring checkpoint does not import or reinterpret those sculptures.

Base occupancy uses the fixed edge definitions, including steel, wood, concrete and jail door semantics and locks. A retained edge occupant in `interactables` or `doors` also prevents covering its edge regardless of its name. Live actor-body occupancy belongs to the required complete-query host service; the portable map supplies no measured live bodies. Only approved `farmyard-legacy-wall-v1` boxes can use the existing clipping adapter. Native/curved geometry never receives invented legacy provenance. Clipping is a host/presentation projection; it does not delete underlay edges or change the saved map.

Only covered edge facts enter the bounded pane compiler; the complete base remains in authoring. A dense base with more than 65,536 unrelated edges does not overflow the pane fact array. Pane queries still describe panes only: the retained host must compose the whole base, other geometry and actor bodies before selecting a confirmed nearest impact.

## Minimal authoring example

These are the proposed public imports after Root registration. Today the installed proof substitutes only the explicit private candidate package prefix and records that substitution.

```js
import {blankMap} from '@nautilus-engine/core';
import {
  createWindowAuthoring, createWindowAuthoringDocument,
  windowPlacementAtEdge, windowAuthoringDimensions,
  windowAuthoringGeometryProjection, openWindowAuthoring,
  windowAuthoringUsageCard
} from '@nautilus-engine/core/windows/authoring';

const base = blankMap('Window study');
base.edges = {'s:20:21':'wall-brick'};
base.metadata = {retained:{hp:37,ap:0,clock:.125}};
const initial = createWindowAuthoring({
  id:'window-study', worldId:'study-world', baseBlueprint:base
});
const document = createWindowAuthoringDocument(initial);
const placement = windowPlacementAtEdge({
  id:'study-window', definitionId:'window.full.borderless', edge:'s:20:21',
  dimensions:windowAuthoringDimensions(2,5,'storeys')
});
const placed = document.apply({kind:'place',placement,engineInstanceId:'study-view'});
if (!placed.ok) throw Error(placed.reason);
const text = document.serialize();
const reopened = openWindowAuthoring(text);
document.undo();
document.redo();
const projection = windowAuthoringGeometryProjection(document.snapshot.prepared);
const card = windowAuthoringUsageCard();
// `reopened`, `projection` and `card` are plain data; no runtime epoch was made.
```

`place`, `remove`, `move`, `quarter-turn`, `copy`, `configure` (dimensions/joins/appearance) and protected `replace-base` each compile and accept once, producing one history entry. `open` accepts a complete document and resets history only on success. Undo/redo rebuild their target before acceptance. Defaults are 64 combined undo/redo records and 16 MB of serialized history; optional bounds are explicit and combined after asymmetric undo. A no-op edit refuses and keeps redo.

For asynchronous resource acquisition, call `document.prepare(command)`, acquire a presenter for `result.candidate.prepared` outside the document, then call `document.accept(result.candidate)` only if it is still current. Use `reject`/`cancel` on failure and dispose late or rejected resources in the caller. A later edit, invalid attempt, open, undo/redo, cancellation or context change invalidates an older ticket. Failure leaves accepted text, revision, history and preparation intact. A context change labels the prior preparation stale until an accepted rebuild. Authoring never owns a renderer or connection and cannot dispose borrowed services.

## Readiness and retained-host binding

`windowAuthoringReadiness` separately reports saveable authoring, prepared geometry, absent presenter and absent/unsupported host. `windowAuthoringCompatibility(prepared,consumer)` negotiates three actual scopes: this authoring schema, `blueprintRequirements` for the complete retained base, and `windowRequirements` for the compiled panes. It is explicitly negotiation only. A consumer cannot qualify by naming just the new authoring schema or by advertising a presenter. Empty panes require no pane capability/services; nonempty panes require `nautilus-window-panes-v1` and all six v1 host services.

`bindWindowAuthoringHandoff(prepared,consumer,services)` performs that negotiation and invokes the existing `connectFarmyardWindows` with the **actual** service bindings. Connection reads the retained complete host save, checks its existing pane authority, captures its complete context and asks its whole-save validator to accept the current save. It must not debit, commit, reset masks/receipts/epochs, publish or replay effects. A refusal throws before returning a connection; accepted authoring stays available. Borrowed service implementations must honor their documented read/validation purity.

The result is `{authoring,connection,compatibility,adopted:false}`. It validates prerequisites and an existing retained host; it does not convert this portable base into a complete game save, install the authored geometry or make an unrelated live host match the document. A game adapter must stage the entire prospective save, preserve resources/unknown fields/typed sets, reject unsupported map features, and use the existing atomic host adoption path separately. That map-to-game projection and production adoption remain unimplemented here. Do not use a successful prerequisite binding as a playable-ready flag. Dispose the returned connection when its binding task ends; do not dispose the host.

`windowAuthoringGeometry` is a same-core opaque handle for retained-host use. A separately installed presenter receives only `windowAuthoringGeometryProjection`, the existing detached public `inspectWindowGeometry` shape. It never validates another package instance's handle, authorizes impacts or stores pane state. Presenter acceptance and acknowledged effects are outside this checkpoint; preview readiness remains false.

Nonempty legacy map, block, generation and unsupported consumer handoffs refuse. An **empty** overlay can export its complete unchanged base payload with `exportWindowAuthoringLegacy`; this deliberately omits wrapper identity and is not an envelope round trip. Keep the wrapper for lossless authoring save/load. No donor/game pin or production save is changed.

## Builder acceptance checklist

- [ ] Root has reviewed the fixed candidate and applied the exact export/schema/support registration request; actual declared-package proof passes without a private overlay.
- [ ] Installed usage-card guide/schema/request URLs resolve. The public-import example above runs without editor, donor-worktree, browser, DOM or storage imports.
- [ ] Preserve the complete base and source definition pin. Test metre/storey heights, ground centres, explicit pivots, long IDs/short aliases and manual joins with the game's content.
- [ ] Place/remove/move/turn/copy/configure, undo/redo, failed open and save/reopen preserve underlay and unknown base fields. Test late preparation and combined history budgets.
- [ ] Door/jail/lock/occupant/overlap/bounds conflicts refuse before acceptance. Keep live body geometry with the complete host service and reject unsupported floors/exports.
- [ ] Negotiate authoring, actual base and compiled pane requirements; missing any one of the six actual service bindings refuses. Saveable, preview and gameplay adoption remain separate states.
- [ ] The game's prospective complete-save adapter and reviewed presenter are supplied separately. Preserve existing masks, epoch, receipts, spent resources and unknown fields; restore without replaying effects.
- [ ] Dispose acquired/late presenter resources and returned owned connections while preserving borrowed host services. Record actual game checks and stop disposable helpers.

## Design decision and evidence

For this bounded Farmyard pane-authoring use case, prefer the fixed native compiler plus lossless base underlay to resizing windows to fit old wall art or extending old runtime fields. **Accuracy:** source dimensions, semantic doors and explicit pivots agree with the accepted native model, while real traversal/body/physical glass behavior remains host policy. **Efficiency:** bounded full-document preparations/history avoid another live simulation; copying/compilation costs grow with the base and panes (code-based estimate, no frame-rate claim). **Narrative:** explicit presets/finishes and the tall sheet preserve Farmyard's industrial appearance; Tinderbox's decorative sash bays remain separate compatible art (subjective preference). Richer multilevel/traversal policies need their own reviewed profile rather than silent conversion.

Focused tests are `tests/window-authoring.test.mjs`; executable fixtures are `tools/fixtures/window-authoring.mjs`. `node tools/test-window-authoring-package.mjs --candidate` records a clearly private installed overlay, plain projection crossing a physical package boundary, guide/schema URLs and cleanup. After Root registration the same tool without `--candidate` must prove the actual declared core. Independent Draft 2020-12 cases and the four required gates are recorded in the checkpoint review. No browser evidence is claimed because no presentation/chrome changes are included.
