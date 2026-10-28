# Tinderbox flat-yard adapter

This is a tested external-consumer candidate for Tinderbox at commit `8a8405681614662a92f9b98fb9b9600bd06d3ad1`. Nautilus data passes through that game's actual exterior compiler and simulation in the conformance tests. Tinderbox's production entry, dependency pins and saves are unchanged. This proof establishes a bounded data exchange; it does not establish production adoption, rendered asset integration, or compatibility with all three games.

The runtime entry is `@nautilus-engine/map-core/adapters/tinderbox`. It imports only Nautilus's public map API. The game supplies its own simulation, art and persistence. The byte-preserved game modules live under `tests/fixtures/consumers/tinderbox/<commit>/` solely as conformance evidence; the adapter never imports them.

```js
import {
  createTinderboxScene, saveTinderboxScene, loadTinderboxScene,
  exportNautilusMap
} from '@nautilus-engine/map-core/adapters/tinderbox';
// createSimulation comes from the consuming game's own simulation entry.

const scene = createTinderboxScene(portableMap, {
  region: {x: 10, y: 20, width: 20, height: 16},
  playerStart: 0,
  markerPolicy: 'select-player-preserve-markers',
  outsidePolicy: 'require-unmodified-yard',
  seed: 1947
});
const game = createSimulation({scenario: scene.scenario, seed: scene.policy.seed});
const savedScene = saveTinderboxScene(scene);
const restoredScene = loadTinderboxScene(savedScene);
const returnedMap = exportNautilusMap(restoredScene);
// Stop the consuming simulation through game.dispose() when finished.
```

`region` is an explicit rectangle of whole Nautilus tiles, 2–64 metres on each axis. Nautilus's integer tile centre `(x,y)` becomes `(x-region.x+0.5,y-region.y+0.5)` in Tinderbox, whose world starts at the outside tile boundary. Units remain metres; vertical wall dimensions are unchanged. All four squad starts and the travel marker must fit inside the region. Every terrain tile outside it must be untouched `yard`, and every wall must fit including its complete thickness. Authored terrain, walls and markers outside the region cause rejection. The complete 240×240 map, including its unmodified outside plane, is retained in `portableMap`.

Tinderbox has one controlled bear. `playerStart` explicitly selects one of the four squad-start indices, 0–3. The required `select-player-preserve-markers` policy stores all starts and the exit as named, translated markers in `scenario.nautilus` and retains their original data in the sidecar. The other three starts do not become actors; exits have no win/transition behavior in this profile. Known editor character identity, species, outfit, weapon and heading fields survive as the complete original marker in each `scenario.nautilus.starts[i].source` (and corresponding exit `source`) as well as in the map sidecar. The selected slot deliberately chooses the game’s controlled bear; it does not turn a goat, authored weapon, facing direction, faction, dialogue or shop setting into Tinderbox gameplay. Tinderbox owns its bear identity, initialization and rules. Unknown functional marker fields and character-rule/resource data outside this supported identity schema reject. The selected player needs the pinned game's 0.56 metre collision-disc clearance. No squad, tactical combat, AFT rules, characters or damage state is translated.

## Supported map content

Only `aft-map-v2` is accepted. The public Nautilus parser validates it before translation. Legacy maps must be migrated deliberately before using this adapter.

| Nautilus content | Tinderbox projection |
| --- | --- |
| `yard`, `floor`, `ground-concrete`, `ground-asphalt`, `ground-tiles` | Planar `paving` |
| `ground-grass` | `grass` terrain patches |
| `ground-wood-planks` | `wood` terrain patches |
| Axis-aligned wall runs at `z=0`, one story | Native wall exterior modules, 2 m high and 0.16 m thick |
| Wall `wood` | Physical `wood`, inherited wood facade skin |
| Wall `brick` | Physical `masonry`, inherited brick facade skin |
| Wall `concrete` | Physical `masonry`, inherited plaster facade skin |
| Root `metadata` | Opaque, nonfunctional authoring data preserved in the full sidecar |

Paving textures and the distinction between brick/concrete physical materials are coarser in the pinned game. These translations are explicit policies, and original terrain/material identifiers survive inverse export. The actual Tinderbox module compiler owns resolved collision and heat-blocking parts. Skin IDs never choose burn behavior. Walls are descriptors; this adapter adds no new collision or fire implementation to the game.

There are at most 128 wall modules, matching the game's real compiler limit. Terrain patches merge equal adjacent rows deterministically, with a profile budget of 512 resulting rectangles. Quarter-turn headings derive from wall endpoints; reversed runs retain their physical position and dimensions. There is no random content generation in this translation. A safe integer seed is retained for the consuming simulation; omitted seed defaults to the pinned game's 1947.

Guards, props, grid edges/gates/locks, upper-floor geometry, stairs, climbs, angled or multi-story walls, whole-building prefabs, sloped-roof data, other terrain and unknown functional fields are rejected. This rejection applies even when unsupported data lies outside the crop. Empty unknown feature envelopes are also rejected. New capabilities require a reviewed adapter version; a shared asset appearing in Nautilus's library does not imply its collision or simulation is supported here. AFT and Farmyard remain separate consumers with separate adoption decisions.

## Adapter scene save

A scene envelope has `schema: "nautilus.tinderbox.scene"`, `schemaVersion: 1`, an exact adapter ID/version/consumer commit, an explicit policy, the full portable map, and the derived Tinderbox scenario. Adapter version is `1.0.0`; this is the adapter contract version rather than a claim that the entire engine has reached 1.0.

`saveTinderboxScene` returns deterministic canonical JSON. `loadTinderboxScene` validates the envelope, map and policy, rebuilds the scenario from its sidecar and compares the saved scenario with that deterministic result. Changed geometry, missing markers, unsupported adapter pins or versions, and unknown save fields fail with an actionable diagnostic. This is correspondence validation, not a signature or an authenticity guarantee. A valid authoring change must be reprojected through `createTinderboxScene`.

Unknown fields reject throughout the functional schema. The explicitly nonfunctional root map `metadata` namespace survives without interpretation. Plain JSON values only are accepted: no cycles, nonfinite numbers, getters, hidden/symbol fields or custom object types. Adapter input is bounded to 5 MB of UTF-8 and 64 nesting levels; the underlying public map parser retains its own map limit. Returned data is copied; rejected loads cannot mutate source data or an existing game. There are no save migrations yet: version 1 is the first adapter schema, and future schema or adapter versions reject until a deliberate migration is supplied. This is an authoring-scene save, not a running-game snapshot: player HP/resources, heat cells, events and current simulation progress belong to Tinderbox.

`TinderboxCompatibilityError` exposes `code`, `path`, `message`, `action` and `toJSON()`. For example, `CROPPED_WALL` identifies the specific wall and asks for a region that contains both its endpoints and thickness; `SCENARIO_MISMATCH` asks for reprojection with the matching adapter. Callers must present the diagnostic instead of silently falling back to an empty scene.

## Evidence and design choice

`tests/tinderbox-adapter.test.mjs` exercises the actual pinned `compileModules`, `scenarioDefinition` and `createSimulation`, verifies original module bytes and closed imports against the source manifest, and checks wall bounds/materials, marker preservation, rejection paths, the golden scene save, inverse map parity and replay after reload. Its bear moves into the real game's wall collision and stops with that game's native radius. The golden fixture is authored for this narrow profile; it does not replace the original game's exposition scenario.

The source manifest preserves the reviewed full commit, Git blob IDs, SHA-256 hashes, byte counts and embedded comments. Its nine JavaScript files form the complete headless compiler/simulation dependency closure; the original contract and package metadata are supporting evidence. No renderer, UI, asset, save or third-party library is imported. The pinned tree has no root license file or package license field; provenance grants no new license. Existing Nautilus source notices continue to apply.

For **accuracy**, prefer the game's native metre-based compiler to approximating walls from renderer meshes: it produces the same solid rectangles and material categories the simulation uses. Its planar fire and broader material classes remain abstractions; there is no physical calibration claim. For **efficiency**, the code-based bound is one map scan (57,600 tiles), at most 128 wall descriptors and 512 merged patches. The bounded crop avoids feeding a 240 metre world into a game that accepts 64 metres; no CPU or frame-rate improvement has been measured. For **narrative**, provisionally prefer this small yard/wall profile as the first Tinderbox bridge because it makes shared geometry usable without importing AFT squad/combat conventions. This is a subjective fit to Tinderbox's single-bear fire play. Whole houses, doors, civilians and roofs need their own explicit gameplay/material decisions and visual acceptance before production adoption.
