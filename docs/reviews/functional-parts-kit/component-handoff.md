# Native workshop kit: builder handoff

Follow the [shared handoff standard](../../component-handoffs.md). Status: **artist geometry/semantic candidate; public ABI and playable adoption pending**. The adjacent [guide index](README.md) and each entry in [definitions.json](../../../art/functional-parts-kit/definitions.json) point here. This source card does not register a runtime API, schema or capability.

## Identity and readiness

| Field | Value |
| --- | --- |
| Content | `native-workshop-kit`, exact content version 1 |
| Definitions | `native-slab-2x2`, `native-slab-2x1`, `native-wall-2m`, `native-door-bay`, `native-stair-14`, each version 1 |
| Baseline / scope | Main/docs `78d37b6cd3ba5de5c25d4922b4ba301b13491caa`, runtime v0.8.0 / `8c4670450cb2b38c1e1abd811d633c22de9e2b7c`; commissioned scope `04f915dd8b16c242d47b1e054b2406aedcbdefc8` |
| Entry at this stage | Artist-source `art/functional-parts-kit/kit.js` and optional host-Three `three.js`. No public installed parts entry is supplied or invented here. |
| Contracts | Plain versioned content recipes and geometry evidence, not the final authored/save schema. Package-1 API/profile/schema/capability identities await Coder's architect-distributed checkpoint. |
| Source / notices | Existing atlas and catalogue conventions plus the AFT-pinned horse, exact bytes in [sources.json](sources.json); retain [Nautilus notices](../../../NOTICE.md) and the original Three MIT notice. No new licence grant. |
| Owners | Artist: definitions, native art/semantics and measurement parity. Coder: public schema/compiler/query/save contract. UI: shared presentation/player binder. Editor: authoring/history. Architect: fixed integration. Game: policy and separate adoption. |

This kit supplies actual visual parts and connection evidence. A successful adopted game must additionally compile and bind them through the accepted public contracts. A working source preview is not an installed-player or editor integration claim.

## Connections and minimal source example

| Connection | Builder supplies / checks | Boundary or missing work |
| --- | --- | --- |
| Definitions / authoring | Exact definitions and recipe version, fresh scene/instance identities, typed internal support references | Final ABI/compiler and deterministic namespacing/source maps are Coder-owned. Local IDs are scoped to their assembly. |
| Renderer / resources | One existing Three namespace, retained scene/renderer/camera, existing painted atlas | The artist library borrows Three/atlas and owns its generated geometry/materials. Runtime resolver/package example awaits Coder. No donor/editor-private imports should enter a game. |
| Doors | Committed open/closed state keyed through the compiled semantic door identity | This preview poses a leaf only. Shared interaction provider supplies locking, permissions, operation obstruction, transactions/events and saves. Do not duplicate the leaf as a static wall. |
| Stairs / geometry | Actual floor/support identity, explicit route/contact profile, active actor dimensions and live/offscreen occupancy | [Resolve the support/profile fixture](abi-request.md) before playable traversal. Structural centreline headroom is not a complete body sweep. |
| Actor / animation | Existing accepted visual provider at scale one, supplied playback time, family/equipment coverage | Native unarmed horse is the current reference. Bare-bear fit remains provisional. Stair contact animation is UI/shared-provider work, not a flat-ground pose relabelled as climbing. |
| Authoritative host / save | Atomic revalidation/commit, costs and effect deduplication, matching complete checkpoint | No live state, clock, inventory or saved game is owned by the artist data. Public runtime/save contract remains pending. |

This **working source-only** example creates both layouts with the same content library. `hostThree`, `hostScene` and `atlas` are explicitly supplied/owned by the caller; no canvas or renderer is constructed by the library.

```js
import {assembly, placedAssembly, measuredParts} from './art/functional-parts-kit/kit.js';
import {createKitLibrary} from './art/functional-parts-kit/three.js';

const library = createKitLibrary(hostThree, {atlas, lod: 'game'});
const recipes = [assembly('longhouse'),
  placedAssembly(assembly('cross-workshop'), [20, 0, 14], 1)];
const models = recipes.map(recipe => {
  const visual = library.createModel(recipe);
  hostScene.add(visual.root);
  for (const part of measuredParts(recipe)) {
    if (part.door) visual.setDoorOpen(part.partId, false);
  }
  return visual;
});
// A future accepted shared binder observes committed state and updates all
// compiled door identities. These initial source poses execute no gameplay.
for (const model of models) model.dispose();
library.dispose(); // Does not dispose atlas, hostScene or host renderer.
```

The runnable [review consumer](../../../art/functional-parts-kit/review.js) adds the native character, actual paint and camera views. It uses private source paths only for review. Replace the example above with the accepted installed public entry/provider example when Coder distributes the ABI; do not copy this source layout into a production game as automatic wiring.

Source visual bindings use `(assembly instance ID, local part ID, local node ID)`, including `leaf-pivot`. When copying a recipe, pass a fresh fourth argument to `placedAssembly(recipe, position, quarterTurns, instanceId)`; moving the same instance retains its ID. Local connections remain scoped to that instance. These source identities do not prescribe Coder's compiled/runtime ID format.

## Parts, space and semantic references

Units are metres; arrays are `[X,height,Z]`, while the world compiler must explicitly convert to `{x,y,h}`. The assembly origin is its minimum-X/Z ground corner; the apron and outward door may extend beyond it. Actor origin remains the native foot datum, with no scale change. Part placement supports translation and quarter turns; no scale/mirror/free-rotation profile is requested. Finished floors are local `ground` at 0 m and `upper` at 2.12 m; roof top 4.24 m is not a third walkable floor.

| Definition | Native origin / bounds / role |
| --- | --- |
| `native-slab-2x2` | Minimum-X/Z top corner; `[0,-0.12,0]`…`[2,0,2]`. Support `top`, visual node `slab`. |
| `native-slab-2x1` | Same origin; `[0,-0.12,0]`…`[2,0,1]`. Shared half-bay creates the real hole lead-in. |
| `native-wall-2m` | Left ground edge on centre plane; `[0,0,-0.08]`…`[2,2.12,0.08]`. `wall` and `story-band` nodes; 2 m wall plus 0.12 m inherited band. |
| `native-door-bay` | Same wall origin; static frame plus all-pose motion envelope. Full numeric bounds and source/game buffers are in [definitions](../../../art/functional-parts-kit/definitions.json). Aperture `opening` is 1.20×1.90 m, cut through actual wall geometry. |
| `native-stair-14` | Bottom-flight centre on lower finished floor; `[-0.6,0,0]`…`[0.6,2.12,4]`. Four-point route extends onto explicit flat landings. `tread-01`…`tread-14` supply stepped contacts. |

Door hinge is `[0.4,0,-0.13]` relative to its bay. The pivot `leaf-pivot` owns `leaf` and visual-only `handle-inlay`. Closed yaw 0, open yaw π/2 about native +Y, opening outward toward −Z. The leaf is 1.18×1.88×0.05 m; its authored 0.13 m standoff avoids the frame. Initial state defaults closed/unlocked. Exact posed collision boxes and conservative whole-arc motion box come from the same dimensions; the decorative handle extends 0.4 mm beyond the closed collision face. The provider must declare this approximation rather than claim exact curved sweep.

The two assemblies use a 2×5 m physical upper-floor void and 70 m² of upper support. Route ports explicitly identify the lower and upper supporting slab part plus support `top`. Those support records map to visible `slab` nodes. Roof slabs belong to `upper`, carry a separate roof presentation role and disable support. No renderer visibility choice removes data, creates a third floor or grants support.

The stair is 1.20 m wide, rises 2.12 m over 4 m, with 14×0.151429 m risers and 0.285714 m goings. Vertical rays against actual upper/roof slab meshes verify 2 m structural centreline headroom. **The walking-support line is not exact tread contact or a complete swept-body query:** [ABI/profile request](abi-request.md) gives the numerical mismatch and required own-support/ordinary-walking rules. Do not remove tread/landing geometry silently or call a decorative stair navigable.

### Native actors and limits

[Measured body / visual / equipped envelopes](measurements.json) are distinct. Selected unarmed horse: actual top 1.65 m, root half-extent 0.430837 m, proposed standing mover 1.70 m high / 0.46 m half-extent. Native root scale stays one. This fits the new aperture; the original 1.65 m opening rejects the selected mover. Standing samples do not accept all motion phases.

The same source horse with HMG needs a 0.627429 m root half-extent. A 0.64 m proposed profile needs 1.28 m width and is the explicit too-large fixture for both 1.20 m budgets. It is not a resized animal or collider. The preserved bare-bear source data fits a provisional 0.50 m / 1.72 m standing profile, but accepted integrated bear/provider review remains outstanding. Re-measure each outfit/equipment/motion family before enabling it.

### Resources and ownership

Reuse `assets/buildings/painted-materials-v2.png` unchanged. Brick/plaster, dark wood, aged wood, copper and concrete come from its existing tiles at metre scale. The source visual actor uses the existing AFT `781246a668c723d5a4c5463e70534cc04b6a5641` horse/paint/equipment closure. No new donor import is made. Author/game prototype buffers are exported in [the mesh directory](../../../art/functional-parts-kit/meshes); they are source handoff files, not a production package-byte budget.

The library owns cached generated geometry/materials; instances borrow them. Dispose instances/library and retain the borrowed atlas/renderer. Independent models share immutable resources, not pose roots. Door pose setters affect only that model's pivot. The caller owns loaders, scene/time, actor resources and cancellation. An adopting provider must additionally prove partial/failing/late loads and stale requests leave the previous scene intact, with borrowed resources alive. The artist preview does not implement asynchronous host/session authority.

## Saves and game decisions

Recipes contain exact definition versions, local IDs, native placement, floor roles and typed landing references. They are authored initial data, with no functions, renderer objects or arbitrary gameplay scripts. They are not the final public authored/runtime save envelope. Coder must preserve those identities and settled geometry version through compilation and a complete staged runtime save; Editor owns one-transaction move/rotate/copy/delete, history and preserving imports/exports. Unsupported legacy paths must reject explicitly, not drop parts or substitute actors.

No AP, stats, damage, resources, key inventory, permission, clocks/RNG or mission state is owned or normalized here. A game selects the accepted query/movement profile, actor/equipment limits, lock/cost policy and effect/persistence authority once through shared bindings. Accepted actions alone drive presentation. Restoring a door/stair pose must not replay sounds, costs or releases. Actual mid-stair save/resume, live/hidden blockers and atomic rejection require the combined fixed candidates.

The paint palette and module arrangement may vary while retaining exact geometry/semantics and measured clearance. A geometry/definition change needs a new content version and recompiled scene identity. Changing floor visibility is presentation only. Curves, paired doors, free rotations, rails, falling and additional geometry profiles are not silently enabled by this kit.

## Builder checklist and evidence

- [x] Supply concrete definitions and two layouts with exact native origins, local IDs, floor/support/portal/door/tread references. Evidence: [definitions](../../../art/functional-parts-kit/definitions.json), [manifest](measurements.json), [source hashes](sources.json), fixed scope/baseline above; final artist commit is recorded in the chat handoff.
- [x] Review real wall holes, leaf/frame sweep, slab openings, flat landing footprints, source/game bounds and all quarter turns. Evidence: seven [focused checks](../../../tests/functional-native-kit.test.mjs) and [native captures](browser-review.json). Structural clearance is separated from complete body/route acceptance.
- [x] Use an actual native animal and an equipment-based too-large fixture. Evidence: body/visual/equipped measurements and [door](native-door-open.jpg) / [HMG](native-hmg-oversized.jpg) views. No scale change; standing reference only.
- [x] Reuse reviewed paint/source bytes and retire disposable review helpers. Evidence: [sources](sources.json) and [exact cleanup](helper-cleanup.json); no borrowed renderer/atlas disposal by the kit library.
- [ ] Adapt to the architect-distributed Coder ABI and locate the guide, definitions, public resources and a positive example in the installed distribution. Owner: Coder/Artist; no public entry is invented here.
- [ ] Bind the shared query/interaction/save and generic presentation providers; resolve [the stair profile fixture](abi-request.md), missing connections and actionable diagnostics. Owners: Coder/UI/game builder.
- [ ] Run actual editor placement/transforms/copy/delete/history/save/import/export with atomic failed/late compilation. Owner: Editor; use the same compiler and visual bindings.
- [ ] Prove both stair directions, physical fit, ordinary/under-stair restrictions, live/offscreen obstacles, stale/repeated intents and exactly-once committed effects. Owners: Coder/UI/game builder.
- [ ] Save/reload complete matching scene/interaction/mover state mid-stair without healing/refilling or replaying effects; reject changed geometry or unsupported consumers atomically. Owners: Coder/Editor/game builder.
- [ ] Review actual desktop/phone player/title/floor-follow workflows and relevant accepted animation families. A phone viewport is layout evidence, not device performance. Owners: UI/Artist.
- [ ] Pass installed-package and consumer checks, record exact accepted pins/rollback and adopt each game separately. Owner: Architect/game owner; no main/game pin/Sites changes are made by this checkpoint.

**Accuracy:** prefer genuine enlarged openings, slab cuts and named supports to scaling actors or guessing routes from decorative meshes. Keep the continuous-line/stepped-contact approximation explicit until the shared profile is accepted.

**Efficiency:** reuse five immutable definition geometries and an existing atlas. One-of-each prototype reduction is 1,036→780 triangles (24.7%) and 427,606→294,960 mesh-JSON bytes; these are file/geometry measurements, not runtime/package or frame-rate claims. Compile/query/player costs await the shared ABI and target-device evidence.

**Narrative:** retain painterly brick, wood and concrete and each game's chosen actor/policies. This small service-building kit is preferred for the first bounded proof; Rowan conversion remains a separate audited step, and no catalogue-wide functionality is claimed.
