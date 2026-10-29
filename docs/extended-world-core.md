# Extended world core candidate

This is the first bounded contract/query tranche from [the height plan](extended-height-plan.md) and [engine blueprint](engine-blueprint.md), based on reviewed main `ddfd43cf4b156eeb82b5c27772fe977ec10b0633`. Source entry: `packages/world-core/index.js`. Package exports, root schema/capability registration, distributions, installed-package proof, editor integration and release promotion belong to architect integration. This candidate does not alter the legacy map/block, wall/roof v1 or donor bytes, and does not establish a tall-game runtime.

## Pinned data shape

`kind: 'nautilus-extended-world'`, `version: 1`, `profileId: 'native-metres-v1'`. Schema ID: `nautilus-extended-world`; schema URI: `urn:nautilus:schema:extended-world:1`; candidate structural document: `packages/world-core/extended-world-v1.schema.json`. `openWorld` also checks arithmetic, bounds, references and budgets which JSON Schema cannot express. The candidate schema stays alongside its module because the root `schemas/` directory is automatically included in distribution; the architect owns promotion/registration and the corresponding package whitelist change.

Every position is `{x,y,h}` in metres: x/y are the horizontal ground axes, h is native vertical height. A Three adapter maps these to `(x,h,y)`. Floor index, label and height are distinct. All records have globally unique stable ASCII IDs (1–96 characters, alphanumeric first, then alphanumeric/`._:-`). IDs are never decoded as coordinates or single-digit suffixes.

```js
import {
  createWorld, openWorld, serializeWorld, compileWorld, worldRequirements
} from '../packages/world-core/index.js'; // candidate source path

const world = createWorld({
  id: 'tower', name: 'Native tower', widthM: 240, depthM: 240,
  floorCount: 16, storyHeightM: 2.12, groundHeightM: 0,
  minHeightM: -0.12, heightM: 40
});
// Assign exact model-authoritative elevations and labels before adding geometry.
world.floors.forEach((floor, index) => {
  floor.elevationM = Number((index * 2.12).toFixed(2));
});
world.floors[15].label = 'Roof'; // declared occupiable roof access at 31.8 m
const h = world.floors[0].elevationM;
world.surfaces.push({
  id: 'ground-slab', floorId: 'floor-0', role: 'solid',
  bounds: {min: {x: 2, y: 2, h: -0.12}, max: {x: 14, y: 14, h}},
  supports: true, supportFloorId: 'floor-0'
});
const restored = openWorld(serializeWorld(world));
const queries = compileWorld(restored);
const support = queries.findSupport({
  position: {x: 4, y: 4, h: 1}, maxDropM: 2, requireFloor: true
}); // confirms floor-0; never rounds animated height into a floor transition
const requirements = worldRequirements(restored);
```

The rounding in this example expresses this model's authored centimetre elevations. It is not a loader/converter rule. Other models can provide any valid finite elevations. A binding must use the same stored elevations for surfaces and link landings; equality is exact, with no automatic rescaling, height guessing, clamping or load-time rounding. The factory computes initial elevations from the caller's explicit `storyHeightM` using ordinary JavaScript arithmetic; the explicit floor records are authoritative after creation. Exported `standardStoryHeightM` is **2.12 m**, the accepted native kit's **2 m wall plus 0.12 m slab**. It is shared kit metadata, not an implicit conversion or a replacement for authored heights. Explicit 3 m sample elevations and the legacy tactical 3 m profile remain valid and distinct; no fixture or load is rescaled. An alternative architectural recommendation requires its own design decision. Native 2.12 m stories, a 31.8 m roof deck, a 4.24 m low roof and a −0.12 m slab are covered by tests.

Root fields are exactly `{kind,version,id,name,profileId,bounds,floors,surfaces,entities,links}`. There is no implicit opaque extension bag in v1; unknown fields reject. A future semantic extension needs a deliberate schema/capability decision.

| Record | Fields and meaning |
| --- | --- |
| `bounds` | `{widthM,depthM,minHeightM,heightM}`; x in `[0,widthM]`, y in `[0,depthM]`, h in `[minHeightM,heightM]`. `heightM` is the absolute upper height from datum, not the distance from the lower geometry bound. Negative `minHeightM` permits slabs, foundations and plinth geometry without creating negative playable floors |
| `floors[]` | `{id,index,label,elevationM}`; 1–32 ordinary positions, contiguous indices 0…count−1, strictly increasing **nonnegative** explicit elevations. Labels are profile presentation data; IDs need not contain a number. Basements/negative indices are unsupported |
| `surfaces[]` | `{id,floorId,role,bounds,supports,supportFloorId}`; bounds are `{min:{x,y,h},max:{x,y,h}}`. Role is `floor`, `roof` or `solid`. `floorId` is an authoring anchor, not a height inference. Every panel has positive horizontal area; solids also have positive thickness. Floor panels are zero-thickness collision/support surfaces at their exact floor elevation |
| `supportFloorId` | A floor ID or null. A non-null ID requires `supports:true` and an exact match between that floor's elevation and the surface's top face. Floor panels must confirm their own floor. A roof can provide support without declaring an occupiable ordinary floor. Adding roof access requires a separate floor position and a matching support reference |
| `entities[]` | `{id,kind,content:{id,version},floorId,position,yawRadians,supportSurfaceId}`. Kind is `actor` (a spawn anchor, not a saved character/runtime actor) or `content`. Versions are exact host-provided content pins, not a request to load a moving asset. Yaw is in `[−π,π]`; geometry retains native scale and explicit pivot/plinth height. Actor anchors require a matching supporting landing. Content can use null support for decorative/embedded placements. No collision or traversal is inferred from a content mesh |
| `links[]` | `{id,kind,from,to,bidirectional}`; kind is `stairs`, `ladder` or `ramp`. Each endpoint is `{floorId,surfaceId,position}` on the named supporting top face at the exact floor elevation. Missing floors, missing landings, wrong heights or same-floor links reject. These are semantic endpoint links, not generated stair meshes or executed movement |

Roofs have no relationship to the highest global floor. The fifteen-story synthetic fixture explicitly uses 3 m stories: floor elevations 0–42 m, a separately declared roof-access position at 45 m, a lower annex roof at 5.5 m and an ornament extending to 48 m. These sample dimensions do not define the standard kit. The ornament creates no extra floor. The Editor-native test uses the accepted 2.12 m kit and its declared roof deck at 31.8 m. Both preserve their own explicit coordinates.

## API and query boundaries

- `createWorld(options)` creates a copied, empty geometry world. All example options are required except `minHeightM`, which defaults to zero only when omitted. It creates floor IDs `floor-0`…`floor-N`, labels `1`…`N`; callers may deliberately replace these before validation. There are no allocated tile grids.
- `openWorld(objectOrJSON)` returns a validated independent copy, or throws `WorldError` with `code` and structured `diagnostics[{code,path,message,action}]`. Loading does not mutate the input or current host state. `validateWorld(input)` returns those diagnostics, or `[]` on success.
- `serializeWorld(input)` returns validated, compact, deterministically key-ordered JSON. Array order and every saved number/identity remain intact. This saves static authored world data, not clocks, moving actors, resources, dynamic doors or a complete game.
- `worldRequirements(input)` returns the existing `{schema,required,optional}` requirement shape. Height capability `nautilus-extended-height-v1` is always required. Nonempty surfaces add `nautilus-world-aabb-v1`, entities add `nautilus-world-placements-v1`, and links add `nautilus-world-traversal-links-v1`, all at version 1. Root manifest registration remains separate. A declared capability is a promise the consumer must implement; it is not proof of runtime adoption.
- `assertWorldCompatible(input,consumer)` checks an explicit contract-v1 consumer manifest before returning a copy. It accepts the existing manifest's optional version/descriptions. Duplicate schema/capability IDs or versions reject consistently with contract-v1 negotiation. Missing schema, required semantics or exact supported versions reject; missing-feature diagnostics use the corresponding `/required/N` array path. Existing `negotiateCapabilities(worldRequirements(world), manifest)` can also perform the review; no legacy consumer automatically gains these capabilities.
- `compileWorld(input)` validates/copies a **static** snapshot. It returns `snapshot()`, `getFloor(id)`, `recordsForFloor(id)`, `linksFrom(id)`, `stats()`, `queryBounds(bounds)`, `traceSegment({from,to})` and `findSupport({position,maxDropM,requireFloor})`. Unknown query fields reject rather than suggesting unimplemented behavior. Snapshot/record results are copies. `linksFrom` respects direction, while `recordsForFloor` includes links touching that floor.

Compilation builds a balanced AABB bounding-volume tree over authored surfaces and sparse floor buckets for records. Empty floors retain only their small floor metadata. `queryBounds` returns `{surfaces,visitedNodes,examinedSurfaces}`; `stats` reports records, allocated buckets, tree nodes, compact UTF-8 save bytes and `denseCells:0`. Each spatial query uses the same full authoritative snapshot regardless of visible floors or cutaways. Host rendering choices cannot remove hidden geometry from these queries.

`traceSegment` returns the nearest contact or null: `{surfaceId,anchorFloorId,role,fraction,point,normal,startedInside}`. Fractions range 0–1 along the finite segment. Equal-distance ties use lexicographic surface ID. Contact with a closed boundary is inclusive. A segment starting on/in a surface reports fraction zero and a zero normal with `startedInside:true`; the host must handle its chosen separation policy. A hit's authoring anchor is not a confirmed support floor. Contacts are geometric evidence only, with no damage, resources, attack roll, animation or impact event applied.

`findSupport` searches downward by **metres**, returning `{surfaceId,floorId,anchorFloorId,role,point,dropM}` or null. Only top faces explicitly tagged `supports:true` participate. It stops at the nearest such face. If `requireFloor:true` and that face has no confirmed floor, it returns null; it does **not** tunnel through to a floor underneath. `requireFloor:false` exposes that contact with `floorId:null` for host policy. This query does not check actor footprint/head clearance, occupancy or injury, simulate falling, or make an ineligible top face walkable.

Equal-height eligible top faces tie by ascending lexicographic surface ID, then `requireFloor` is applied to the winner. For example, coincident faces `aaa-unconfirmed-roof` (`supportFloorId:null`) and `panel-1` (`supportFloorId:'floor-1'`) select `aaa-unconfirmed-roof`. `requireFloor:false` exposes that unconfirmed contact; `requireFloor:true` returns null even though a confirmed floor exists at the same height. This conservative tie policy is deterministic across input record order and save/reload. Coincident support bindings should name consistent confirmed floors when the host needs a confirmed landing.

This provider implements exact intersections for its authored axis-aligned boxes/panels. When used as a proxy for a rotated/sloped/detailed mesh, it is an approximation. No sphere/capsule sweep, arbitrary mesh raycast, staircase/ramp surface solver, pathfinder, moving geometry, terrain compiler, perception/knowledge system or complete physics/movement service is promised. Unsupported role/link/query fields reject. Native model bindings and those runtime providers need separate reviewed capabilities.

## Bounds and legacy handling

Joint limits are explicit: 32 ordinary positions; 32,768 surfaces; 8,192 placements; 4,096 links; width/depth at most 4,096 m; geometry h within −2,048…2,048 m; nonnegative floor elevations; 8,000,000 UTF-8 save/input bytes; 24 plain-data nesting levels; 2,000,000 visited values; at most 65,536 entries in any raw input container. Coordinate query components are finite within ±1,000,000 m; support drop is at most 4,096 m. Limits apply together: maximum counts do not guarantee acceptance with every ID/text field at its own maximum. Symbols, accessors, cycles, prototype objects, sparse arrays, hidden properties, nonfinite numbers and unknown schema/profile versions reject.

The separate 8 MB world budget permits bounded larger sparse record collections (code-based estimate: tens of thousands of panel records can exceed 4 MB). The measured 32-story workload below uses only 358 KB, so this is headroom, not a measured minimum or permission for dense arrays. Legacy input/report preservation stays capped at **4,000,000 UTF-8 bytes**. No existing legacy limit changes.

`reportLegacyMigration(input,{receiptId,sourceProfile})` is deliberately a **review report**, always `ok:false`, `world:null`. It retains `original:{encoding:'utf-8',text}`; string input is verbatim, including whitespace, opaque extension fields, actors and links. Object input preserves its JSON data but cannot recover nonexistent source whitespace. Its receipt identifies source/target schema, host-supplied review ID, explicit height profile, source bytes and `converted:false`. It marks source validation `not-performed`; recognizing a legacy version does not validate that document. Use the unchanged legacy loader to validate it. Functional fields are reported as unconverted, never discarded.

Source profiles are explicit: `aft-render-v1` uses 2.12 m intervals (also the reviewed hybrid geometry convention); `aft-tactical-v1` uses the non-hybrid tactical 3 m intervals. Both retain five ordinary layers and special canopy index 5. Evidence: `packages/map-core/wall-runs.js` (`WALL_KIT`), `packages/roof-core/index.js` (`ROOF_LIMITS`), and pinned AFT `map-layers.js` / `hybrid-combat.js` at `781246a668c723d5a4c5463e70534cc04b6a5641`. The inherited combat impact clamps and fall-support ceiling remain compatibility behavior; this core never imports or extends them.

`reportLegacyRepresentability(world,{target:'aft-map-v2'|'aft-block-v1',sourceProfile})` lists unrepresentable floor IDs/paths, mismatched native heights and every unconverted surface/entity/link. It always returns `ok:false,legacy:null` while the semantic exporter is absent, including for an otherwise low/flat world. No conversion success, guessed tile mapping, actor relocation, floor truncation, source overwrite, hidden canopy reinterpretation or automatic downgrade is claimed. Blocks, generation, capture and rotation for this new contract are likewise not implemented by legacy operations. Those consumers reject the new schema/capability before opening it. The full recoverable source and diagnostics are the handoff for a future audited binder.

## Evidence and design preference

`tests/extended-world-core.test.mjs` covers save/reload, fifteen stories plus roof access, both numeric indices and labels across 9→10, sparse empty floors, sub-ground slab/native 2.12 m geometry, low/high roofs, confirmed landings, upper contacts/support, deterministic ties/boundaries, snapshot ownership, input budgets, unsupported capabilities and exact legacy originals. An isolated Node process seals browser/storage globals, RNG and clock; the static closure scan verifies that all runtime dependencies stay inside `packages/world-core/`.

Goldens and the reproducible foreground measurement script are under `tests/fixtures/extended-world/`. Run `node --expose-gc tests/fixtures/extended-world/measure.mjs`; `baseline.json` records the runtime/CPU, source hashes, inputs, warm-up/sample counts, bytes, retained index heap observations and query times. The five-/fifteen-/thirty-two-story workload uses 64 floor panels and one actor anchor per story, plus adjacent semantic links. It has no renderer or active game simulation. Timing/heap figures are observations on this host, not CI assertions, device budgets, a dense-legacy comparison or physical-phone evidence.

**Accuracy:** Prefer explicit native heights, support IDs and semantic landings for the fifteen-story authoring/query use case. AABB proxies are less faithful than full sloped/rotated mesh geometry; require a richer provider when the game depends on those contacts. Preserve both legacy height profiles rather than silently selecting one.

**Efficiency:** Prefer sparse record buckets plus spatial indexing over extending the inherited dense layer-by-cell work. Empty intermediate floors allocate no grids. Code inspection supports bounded record-based cost; `baseline.json` provides a scoped desktop measurement. This establishes no frame-rate or simulation-speed claim. Device/render/simulation budgets remain future integration evidence.

**Narrative:** Stable floor/roof identities and native scale support a readable tall tower beside low structures without moving either model to a global roof layer. This is a design judgment for authoring and spatial consistency. Actor-follow, five-label navigation, cutaways, known-contact privacy and the actual tall-building workflow remain Editor/UI/consumer work.

Adoption status: implemented candidate contract/static queries; legacy semantic migration/export, model-to-query binding, browser authoring and tall-game runtime deferred to explicit follow-on integration. No consumer pins, donor checkouts, main merge, private Site audience or runtime capability registration change in this branch. All objects are ordinary owned data; no timers, listeners, servers, external resources or disposal helpers are created by importing or compiling this core.
