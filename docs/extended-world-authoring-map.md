# Extended-world editor implementation map

Reviewed baseline: `ddfd43cf4b156eeb82b5c27772fe977ec10b0633`, Nautilus 0.7.0. This records the editor-owned native fixture and a separate authoring host built on the [reviewed world contract](extended-world-core.md). Legacy map/block limits and the pending furniture/window branches stay separate. Root package, capability, version, distribution and main-editor launch wiring belong to the architect.

After `npm run build`, serve `dist/` and open [the extended-world workshop](../examples/extended-world.html). This is a **built-only** entry: the existing build copies `apps/editor/*.js` to `app/` and every example/dependency into the static bundle. It has its own five-label controller and one keyboard owner; it does not install itself over the inherited map editor.

## Existing boundaries

| Boundary | Current implementation | Consequence for this tranche |
| --- | --- | --- |
| Native visual units | `BUILDING_CONTRACT`: 2 m walls, 0.12 m slabs, 2.12 m story interval, 1 × 1.65 m doors | Use exact native metre heights; do not stretch the tower or equate an index with metres |
| Native floor surfaces | `packages/building-catalog/three.js` emits slab top at `floor.height` and underside 0.12 m lower | Ground slab extends to −0.12 m; the new contract must allow that finite geometry or prescribe an explicit plinth transform |
| Portable layers | Pinned `map-layers.js`: three to six layers, five ordinary levels plus a canopy convention | Preserve this legacy profile; the extended editor needs a separate document route |
| Oriented walls / roofs | `wall-runs.js` limits six levels/five stories; `roof-document.js` rejects unsupported elevations before edits | Reuse dimensions as reference, not the old wall/roof validators for tall data |
| Saves / history | Existing public map documents and stamped saves have reviewed schema/capability contracts | New world edits/history/serialization must use the committed new contract, with no relabelled legacy JSON |
| Impacts / support | Pinned hybrid combat clamps impact indices to the legacy maximum; inherited support assumes the existing range | Query high geometry through the new provider and assert native height/stable object IDs; never route tall results through a legacy clamp |
| Presentation | Existing workshop depends on inherited map rendering/controller | Add an isolated `apps/editor/extended-world.js` host after API intake; root owns build/entry/package wiring |

The original model's decorative floors, roof and crown do not establish occupiable spaces or runtime movement. This fixture uses explicit structural/query proxies rather than claiming that a donor landmark has been fully bound to gameplay.

## Deterministic acceptance layout

`tools/fixtures/fifteen-story.mjs` retains a private physical recipe and binds it through `makeFifteenStoryWorld()` to the actual schema. `node tools/generate-extended-world-fixture.mjs` reproducibly writes `examples/native-fifteen-story.world.json`. Positions use ground X/Y and vertical H in metres. Fifteen occupied tower stories use indices 0–14 with explicit surfaces at `index × 2.12`. The roof-access datum at index 15 is 31.8 m high; it is not a sixteenth occupied story. A two-story neighbour has its independent roof at 4.24 m.

The footprint is a bounded 32 × 24 m site. Rectangular slabs leave a 2 × 4 m stairwell open. Fifteen flights use fourteen 0.08 m thick open-riser treads each, with explicit lower/upper landings and a walk-around strip. This differs deliberately from the visual catalogue's solid-filled stair blocks: repeated solid wedges would close the headroom above the lower flight. Thin treads leave 2.04 m between repeated flights. Structural engineering/collapse is outside this query fixture.

Stable `floor:9` and `floor:10` identities have separate slabs, doors, actors and a connecting stair link. Native door openings are 1.65 m; 1.6 m actor proxies fit them. These proxies do not bind a character rig, stats, inventory or movement scheduler. Expected queries include high support, closed/open door contacts, a floor-14 impact at 30.48 m, the low roof, and the tower roof landing.

**Accuracy:** Prefer explicit surfaces, openings and supported link endpoints over scaled/tiled decorative shells for tall-world authoring. The native story/door sizes are game conventions, not architectural measurements. Volumetric slabs use `solid`; roofs use their explicit roof role. Treads between declared datums support geometry but do not confirm an invented intermediate floor. Actor anchors and their box proxies have distinct global IDs. **Efficiency:** The measured initial save is 70,224 UTF-8 bytes: 352 box bodies, two actor anchors, fifteen links and sixteen floor records, with zero dense cells. This is a size/count observation, not a CPU or frame-rate benchmark. **Narrative:** Prefer the tower beside a low neighbour for this editor acceptance case: it makes independent roofs and changes of scale visible (a subjective usability judgment). Preserve donor visual recipes unchanged.

## Committed interfaces and authoring boundary

World checkpoint: `fbb57293805ecae34569ab3dd9f689ffea53beb0`, including `97085997ba7c6b811d506fe3f72776afcca94cf3` and `7aaec081ddb3a83139bf713cff53d6bbc0823dd0` validation/native-kit follow-up. UI checkpoint: `e0977e785857277a1c59acc1134ada5156a3fa4b`, including `a92ed7b73eaf9569b4670f516ebf760362ee083d`. Only those immutable Git objects were adopted; worker checkouts were not read or changed. The editor imports their source entries; root public-export promotion remains separate.

`apps/editor/extended-world-document.js` adds editor history and `put-surface` / `remove-surface` commands around `openWorld`, `serializeWorld` and `compileWorld`. A preview has a revision-bound token and a separate ghost snapshot. Queries/export/save continue to use committed geometry. Invalid edits/imports preserve the current document and redo stack. Validation catches missing supports and dangling stair/actor references. No-op applies add no history. Undo/redo retain at most 64 snapshots and 16 MB of serialized history (both caps apply); a valid new document resets history. This is editor state, not a second portable schema.

`apps/editor/extended-world.js` mounts the host. Select a surface or drag a rectangle, type native min/max coordinates, preview, then apply. Drawn horizontal coordinates snap to 0.01 m; typed coordinates are explicit. Changing floors cancels previews and active drags, with feedback and no undo entry. A cancelled pointer release or stale preview token cannot commit on another floor. The two SVG projections use real AABBs, with the working plan fitted to the selected geometry. They require no WebGL, model dependency or animation loop. At most 1,600 bodies are drawn per view, with shown/total counts disclosed; the complete snapshot remains authoritative for queries, saves and export. This structural view is preferred provisionally for the bounded contract/workflow review; textured model/rig binding and GPU performance need separate review.

The `Save here` action writes an editor-only envelope under `nautilus-engine:extended-world-editor:1`, retaining the complete committed world and selected floor ID. `Restore saved` validates both before replacing the current document. Opening the page starts the fixture; recovery is explicit. JSON export/import carries the portable extended-world document, not view state or undo history. Corrupt/future/legacy imports and malformed saves leave the active world intact. Async file loads are discarded if another document operation supersedes them or the committed document changes while reading.

Both legacy targets (`aft-map-v2`, `aft-block-v1`) return explicit representability refusal. Eleven of this fixture's floor positions would collide with or exceed the special legacy canopy convention. No legacy file is produced and no geometry is clamped or dropped. Legacy-to-world conversion is not implemented by this host.

The initial fixture, native 9/10 support, closed/open static door poses, floor-14 impact and both roofs are exercised through the actual query provider. Floor IDs are never decoded as a last digit or inferred from a height. Display labels are separate: `floor:9` is labelled 10 and `floor:10` is labelled 11.

This is authoring plus **static AABB/segment/downward-support queries and semantic stair endpoints**. Door edits produce another authored static box pose. There is no dynamic door component, sphere/capsule sweep, stair route executor, movement, fall/damage rule, animation, combat/AP spending, fire, perception, consumer-game integration or adopted actor rig. A geometric contact is not a combat result. The full later runtime acceptance in the height plan remains separate.

Run the four repository gates and, after building, `node tools/review-extended-world.mjs`. The [browser review](reviews/2026-10-29-extended-world-editor.md) records desktop/320 px authoring, persistence, source/build hashes, captures and verified helper cleanup.
