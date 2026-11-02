# Procedural sloped roofs

Version 1 contract, prepared against frozen integration commit `d9a948fa80328be8dccb560efbb70efcda8ed5b4`. The independent artist branch also retains the newer 48 native maps and 48 native blocks in commits `07fa3245012252d13bb99c0f747ae7ed4c7c39d7` and `9f65eb69e5af1105703887bef453d5dd31abe663`; those are a separate handoff. Existing building recipes, catalogue and native maps are immutable inputs to this work.

## Portable envelope

```js
slopedRoofs: {version: 1, roofs: [{
  id: 'house:roof', x: 10, y: 10, width: 12, depth: 8,
  z: 1, style: 'gable', axis: 'x', direction: 1, pitch: 35,
  overhang: .3, material: 'slate', seed: 42
}]}
```

All fields shown except `direction` are required. A missing extension means no roofs. A present extension must contain `version` and `roofs`, with optional `metadata`; each roof also accepts optional `metadata`. Other unsupported versions and fields are errors even with an empty array. The one compatibility default is `direction:1` when omitted; `roofsOf` and generated geometry return it explicitly. No other defaults repair imported data.

| Field | Version 1 meaning and limits |
| --- | --- |
| `id` | Unique within this envelope; 1–96 ASCII word characters, colon, dot or hyphen |
| `x`, `y` | Finite ground metres at the minimum corner of the footprint before overhang; fractional coordinates allowed |
| `width`, `depth` | Finite 0.5–240 m along map X and Y respectively |
| `z` | Integer eaves layer 1–5; outer eaves top height is exactly `z * 2.12` m |
| `style` | `gable`, `hip`, `shed` |
| `axis` | `x` or `y`, parallel to the ridge or shed high edge |
| `direction` | Optional numeric `1` or `-1`, default `1`; sign of the shed's rise along the cross-axis; validated but geometrically ignored for gable/hip |
| `pitch` | Finite 5–75 degrees; slope across the ridge/high edge |
| `overhang` | Finite 0–2 m, extending equally beyond all four footprint edges |
| `material` | `slate`, `clay`, `metal` |
| `seed` | Integer 0–4,294,967,295, including zero; controls stable paint phase and restrained face tint |
| `metadata` | Optional opaque plain JSON object for authoring/source/provenance notes; no effect on geometry, UVs, material selection or appearance |

Both `slopedRoofs.metadata` and each `roof.metadata` may contain nested plain objects, dense arrays, strings, booleans, null and finite numbers. The metadata namespace itself must be an object, with the ordinary or null prototype. Cycles, non-finite numbers, undefined, functions, symbols, BigInt, class instances, Dates, Maps/Sets, typed arrays, accessors, hidden/symbol properties and sparse or decorated arrays are rejected without invoking getters or changing the input. Repeated non-cyclic references are accepted. Unknown geometry fields remain errors; putting an opaque geometry-like note inside metadata cannot override any roof parameter.

`roofsOf(map)` returns detached per-roof metadata, and `createSlopedRoof(spec).spec` does the same. Metadata is omitted entirely from those copies when absent, with no undefined placeholder. The envelope metadata stays on the original map; `roofsOf` remains a roofs-only array API, so map serializers must preserve the full `slopedRoofs` envelope. JSON import/export retains nested source notes at both levels.

The envelope holds at most 4,096 roofs. `roofErrors(map, size = 240)` uses a finite 0.5–240 m square world; every expanded footprint must stay inside `[0,size]` on both ground axes, inclusive, with no bounds tolerance or clipping. Pass `24` when validating a native block. Roof positions use edge coordinates; native map tile centres and wall runs use `[-.5,size-.5]`. Core geometry and `createRoofGroup` preserve edge coordinates exactly. The editor's RoofScene applies `group.position.set(-.5,0,-.5)` once: roof `x:10,width:12` then spans native tiles 10–21, physical X 9.5–21.5. Block transforms use their edge boundaries and 24 m offsets. Do not apply the half-metre shift twice.

Roof height may extend above the highest eaves layer; it is not clamped to a tactical layer. Hosts own their layer declarations, visibility and physical limits. A gable's rise is `tan(pitch) * expandedSpan/2`; a shed's rise is `tan(pitch) * expandedSpan`. A shed with `direction:1` rises toward positive map Y when `axis:'x'` and positive map X when `axis:'y'`; `direction:-1` reverses that rise. The pair supports all four cardinal shed slopes without changing the footprint.

A hip uses the same cross-ridge rise as a gable. The inset at either ridge end is `min(expandedRun, expandedSpan)/2`. With a long ridge axis, all four planes have the requested pitch. A square becomes a pyramid. A short requested ridge axis also becomes a centred point, with steeper end hips: it preserves the requested cross-ridge pitch and never silently rotates the roof. A positive ridge length of at most 0.0000001 m is likewise collapsed to its centre to avoid numerical slivers. Consumers may restrict the unusual short-axis shape in their own authoring UI.

## Headless API

The public `./roofs` entry exports the headless contract; `./roofs/three` exports the optional host-renderer adapter. These entries are available in the compatibility package and the appropriate core/renderer distribution profiles. From the source checkout:

```js
import {ROOF_FEATURE, ROOF_LIMITS, roofErrors, roofsOf, createSlopedRoof}
  from './packages/roof-core/index.js';
const errors = roofErrors(map, 240); // string[]; never normalizes or edits map
const specs = roofsOf(map);         // validated detached copies; throws on errors
const roof = createSlopedRoof(specs[0]);
```

`ROOF_FEATURE` is `nautilus-sloped-roofs-v1`. `roofsOf` and `createSlopedRoof` validate against the default 240 m world; block hosts must also call `roofErrors(block,24)`. Invalid individual specs throw `TypeError` before generating geometry.

The result is JSON serializable: plain `positions`, `normals`, `uvs`, `colors`, `indices` arrays; contiguous `{start,count,materialIndex}` groups; `materialSlots` with IDs and roles; copied `spec`; render-coordinate `bounds:{min,max}`; two ridge/high-edge endpoints; `eavesHeight`, `rise`, `thickness`, `appearance`, and measured geometry `metrics`. Positions and bounds use `(mapX,height,mapY)`, indices are counterclockwise from outside, face normals have unit length, and each UV unit is one metre **along the plane**. A repeated texture should therefore repeat once per UV unit. Paint phase does not depend on world translation or global RNG state.

Geometry is a closed, consistently wound shell: sloped upper planes, matching lower planes offset 0.12 m vertically, and fascia on every boundary. This preserves the native slab interval, with normal thickness `0.12*cos(facePitch)`. Gable fascia follows the sloped perimeter. The roof is not a solid attic volume and does not add attic end walls, rafters, dormers, openings, fire cells, collision or walkable surfaces. Hosts need deliberate assemblies for those features. Overlapping independent roofs are not boolean-unioned.

## Host Three.js adapter

```js
import {createRoofGroup} from './packages/roof-core/three.js';
const root = createRoofGroup(THREE, spec, {
  atlas: alreadyLoadedBuildingAtlas, // optional, no loader or network inside adapter
  materialMap: {metal: mySharedRoofMaterial}, // optional Map or object of materials
  // textures: {slate: myTileableTexture},   // optional host textures, one repeat/m
  // grey: true,
});
scene.add(root);
root.dispose(); // geometry and generated materials only; host resources stay alive
```

Returns an actual `THREE.Group` containing one indexed mesh and three material groups: selected roof material, `fascia`, `soffit`. Default maximum is three draw calls per roof per pass; shadows introduce their own passes. `materialMap` keys are `slate`, `clay`, `metal`, `fascia`, `soffit`; supplied host materials take precedence and remain unchanged, including in grey mode. A host material must enable vertex colors itself if it wants the seeded tint. Host textures and materials are borrowed and never disposed. The adapter owns only its geometry and generated materials; `dispose` is idempotent and removes the root from its parent.

The explicit `PAINTED_ROOF_MATERIALS` mapping selects the existing original 4×4 building atlas: slate cell 8, clay cell 9, blue-grey sheet metal cell 7, dark oak fascia cell 14, wood soffit cell 5. Pass `assets/buildings/painted-materials-v2.png` as an sRGB host texture with its identity transform. The adapter repeats the selected cell once per metre in the shader, retaining compact geometry and using explicit derivatives at repeat seams. This optional shader hook requires the pinned Three.js map fragment and WebGL2; another renderer should use a deliberate material adapter or tileable host textures. No Three.js module is imported. No atlas is loaded, cloned or modified. At very small screen sizes atlas mip levels can mix neighbouring cells; a host can provide separate tileable textures when it needs stricter filtering. Without an atlas or tileable textures, the default materials use quiet palette colors for inspection rather than claiming a painted finish.

## Ownership and consumer handoff

The integrated public document preserves roofs through edits, history, full-map/block serialization, capture, rotation and seeded block generation. The editor exposes exact or dragged roof placement; capability negotiation rejects hosts that cannot preserve roofs. See [editor controls](editor-roofs.md) and the architect's [combined acceptance](intake/2026-10-28-reusability-roofs.md). The artist's isolated geometry evidence below records the earlier handoff, rather than the final combined suite. Nothing here edits the 48 native building assets or inserts roof objects into them. Consumers must preserve the extension and reject `ROOF_FEATURE` explicitly if they cannot realize it; an unsupported or future envelope must never disappear on export.

Tinderbox is the first deliberate adapter target; all three games can share the portable roof mesh and original painted atlas through their own adapters. No game checkout, consumer pin, published Site, fire substrate or navigation system is changed by this package.

## Accuracy, efficiency and narrative

The sloped shell preserves continuous gable/hip/shed silhouettes and true surface normals, unlike a flat cap or a stair-step imitation made from native slabs. It offers explicit fascia and metre-scale painted UVs. It remains a stylized architectural shell: no uniform-normal construction thickness, roof intersections, gutters, individual tiles, attic walls or structural framing.

For AFT and Farmyard tactical views, prefer this compact shell plus broad painted color/value groups when roofs are visible; native flat caps remain useful for playable flat roofs. Keep roof visibility and tactical occupancy separate. For Tinderbox, prefer the same portable envelope for authoring and appearance, with a future deliberate adapter to its richer roof/fire substrate. Rendering an intact shell alone says nothing about ignition, spread, failure, smoke, traversability or shot blocking.

Measured in the isolated WebGL2 review, for a 6×4 m footprint at the same camera:

| Constructed comparison | Rendered triangles | Draws per pass | Architectural result |
| --- | ---: | ---: | --- |
| One native-style flat slab | 12 | 1 | Flat cap; deliberately has no pitched silhouette |
| Eight instanced 0.5 m stepped slabs | 96 | 1 | Discrete silhouette; the gaps and steps are visible |
| Generated gable shell, three material groups | 20 | 3 | Continuous slope, closed fascia and underside |

These are measured **constructed comparison objects**, not counts extracted from the native map renderer. Instancing keeps the stepped example's draw count low. The new gable has 79% fewer triangles than that particular stepped example and more draws; this is not a claim that it runs faster. Generated sheds use 12 triangles / 24 vertices; gables 20 / 40; long hips 20 / 44; point hips 16 / 40. Atlas repetition adds no geometry. Each generated roof has three groups/draws per ordinary pass; shadow passes and host material changes add their own costs. Large layouts still need host batching, culling and an actual game benchmark.

The parameterized planes are the preserved source for this reusable shell. The existing catalogue's higher-detail building sculpts, original recipes and painted source atlas remain intact; no new ornamental sculpt or high-poly roof asset is claimed. Detail here comes from the settled silhouette and registered painterly material, with a deliberately compact mesh.

## Verification and visual evidence

`tests/roof-core.test.mjs` adds 15 meaningful tests: immutable JSON contracts, metadata round-trip/deep copies and rejection of cyclic/non-JSON metadata, metadata-independent geometry/appearance, malformed/future envelopes (including empty), unsupported enums and numeric bounds, duplicate IDs, map/block overhang limits, measured pitch, both axes and shed signs, long/square/short hip degeneracies, deterministic seeded appearance, physical UV lengths, positive enclosed volume, watertight paired edges, outward normals, host material ownership and partial-failure disposal. The shell checks cover 144 style/axis/direction/aspect/pitch combinations, including 0.5 m and 239 m dimensions and near-square ridges. All **48 local + 32 pinned-upstream tests** pass. `npm run check` validates the unchanged 534 vendor files, 48 original buildings, 48 native maps and 48 native blocks; `npm run build` also passes.

The renderer review uses six specimens spanning every material/style, both axes and both shed signs at 58 CSS px/m, plus matched grey form, wireframe, underside and cropped 110 px/m paint detail. Visual inspection confirms continuous silhouettes, closed visible fascia/soffits, stable repeated paint density and distinct material values. Short-axis hips can expose a steep opposite top face even from the underside camera; this is the documented shape, not a hole. The existing paint has illustrated form values, so the adapter uses restrained roughness/metalness under dynamic lighting; final game lighting still needs its own review.

- [Painted roof sheet](reviews/sloped-roofs/painted.png), [grey form](reviews/sloped-roofs/grey.png), [wireframe](reviews/sloped-roofs/wire.png)
- [Underside and fascia](reviews/sloped-roofs/underside.png), [close paint detail](reviews/sloped-roofs/detail.png), [matched comparison](reviews/sloped-roofs/comparison.png)
- [Measured browser report and image SHA-256 values](reviews/sloped-roofs/browser-checks.json)

Reproduce with `node docs/reviews/sloped-roofs/review.mjs` using Node 22+, Playwright and Edge. It serves the worktree source in a task-owned loopback harness, launches its own isolated browser, records exact helper identities/restart inputs, and closes the browser/server in `finally` or after 120 seconds. The final run had zero browser/resource errors; both processes exited and the port was released. It never attaches to the user's browser or starts a retained preview. The earlier native-building preview also reached its existing 30-minute expiry and released port 52429.

The report records software WebGL2 in Edge, for correctness only. No frame-time, physics, fire, navigation or game-integration claim follows from these images. Editor save/import/undo/rotation and consumer capability checks are covered by the separate integrated acceptance linked above. The narrow Tinderbox map adapter currently rejects roof data until the game has a deliberate roof/fire binding.
