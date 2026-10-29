# Extended height and floor navigation plan

Proposed addition to the [modular engine blueprint](engine-blueprint.md), 29 October 2026. Reviewed baseline: Nautilus 0.7.0, main `d9dc5f9cdc298209f83517e76c3c0db5ff409596`. This is a design and implementation plan; it does not raise current limits or advertise a new capability.

The engine needs genuinely usable height for the user's fifteen-story models. Show **five floor labels at a time**, with up/down controls, while keeping the data range independent of the visible controls. Support tall buildings as world geometry and connected playable spaces, rather than treating a taller mesh as proof of multi-floor gameplay.

## Recommended behavior

| Context | Floor navigation | Camera and visibility |
| --- | --- | --- |
| Desktop editor | Five labels, active floor highlighted, previous/next floor arrows; Page Up/Page Down; wheel over the floor selector | Wheel over the scene keeps its existing zoom role. Floor changes update the working plane and cutaway, without moving placed content |
| Desktop gameplay | Same controls where manual inspection is supported; selected-character follow and explicit return-to-character | Inspection is free and cannot issue movement/attacks, spend AP or reveal unknown information |
| Phone gameplay | Follow the main/selected character through confirmed floor transitions; use the existing eye/contact control to inspect eligible contacts on other floors | An above/below indicator can explain a known contact's elevation. Eye inspection follows that contact; returning to the character or deliberately resuming movement restores character-follow |
| Phone editor | Retain compact manual floor buttons and arrows | An editor may have no character to follow. Automatic gameplay follow cannot replace authoring controls |

The arrows move the active floor one step; clicking a number jumps directly. Keep the selected floor visible and near the middle of the five-label strip when possible; clamp the window at the map's ends. For example, an active floor 13 can show `11 12 [13] 14 15`. Labels identify actual floors, not page positions. Show fewer buttons for a smaller declared range, and provide a full floor/height readout for clarity.

Display naming is profile data: a game may call the ground floor G or 1 without changing stored indices. Preserve old maps' indices and labels through their compatibility profile. A floor index is not a metre height, and a roof or decorative crown does not automatically create another occupiable story.

Keep following, contact inspection and manual inspection as explicit camera modes. Manual inspection must not snap back every frame. Follow transitions use the actor's confirmed support/traversal floor, not rounding an animated model's height; this avoids flicker on stairs and ramps. When detection of an inspected contact ends, stop following its live position immediately: return to actor-follow by default, or keep only a last-known view if the game's policy permits it. Camera transitions should respect reduced motion.

Wheel input over the selector must not also zoom or scroll the page. Normalize wheel/trackpad input so one gesture cannot race through many floors. Page keys must respect focused text fields, menus and modals. A floor change during a building stroke cancels the uncommitted preview with clear feedback; it never commits geometry to a different floor. Floor selection alone does not add a geometry edit or undo entry.

## Current constraints

The ceiling is a contract issue, not just the number of buttons. At the reviewed baseline:

| Boundary | Existing constraint |
| --- | --- |
| [Inherited layer helpers](../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/map-layers.js) | Six layers total; five ordinary playable layers and a special top/canopy layer; accepted documents declare three to six |
| [Portable map schema](../schemas/aft-map-v2.schema.json), [block schema](../schemas/aft-block-v1.schema.json) and [block validator](../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/core/blocks.js) | The map schema explicitly caps six layers. Block runtime validation enforces the ceiling; the block structural schema does not independently express it |
| [Wall-run validation](../packages/map-core/wall-runs.js) and [document commands](../packages/map-core/document.js) | Six-layer bounds and one-to-five-story runs are explicitly checked |
| [Roof commands](../packages/map-core/roof-document.js), [roof schema](../schemas/sloped-roofs-v1.schema.json) and [roof tools](../apps/editor/roof-tools.js) | Roof eaves are limited to layers 1–5; the UI lists those heights explicitly |
| [Inspection](../packages/map-core/inspection.js), editor previews and inherited runtime | Shared layer constants feed picking, previews, traversal and visibility; special top-layer behavior needs review |
| [Inherited map keys](../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/core/maps.js), block/editor keys and breach/structure keys | Several readers accept only a single-digit floor suffix, so the floor 9-to-10 transition needs explicit coverage |
| [Hybrid combat impacts](../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/hybrid-combat.js) and [fall support](../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/fall-damage.js) | Impact layers clamp to five and support searches start below the same ceiling; tall rendering alone cannot prove correct impact/fall behavior |

The public map core still delegates substantial behavior to the pinned inherited implementation. Raising one constant or widening a selector would leave other validators, formats and semantic assumptions inconsistent. The original vendor bytes remain unchanged; new engine-owned adapters/contracts need a deliberate review of that dependency closure.

## Height contract and compatibility

Use **32 ordinary floor positions as the initial proposed capacity target**, giving fifteen-story buildings room for roof access and future content. Keep this target provisional until the sparse-data/query prototype passes representative tests. It is a declared supported range, not an instruction to allocate or simulate 32 complete maps. The user's fifteen-story use case is the minimum acceptance requirement.

The extended contract should define a per-map floor range, stable floor identities, native metre heights, the standard story-height profile, content/traversal references and finite bounds for roofs/ornament. Preserve original model scale and plinth offsets. Keep roof/canopy roles independent of “the highest global floor”; a small building can have a roof far below a neighbouring tower's top floor. Reserve a deliberate extension path for basements without pretending negative levels already work.

Keep the existing aft-map-v2 and aft-block-v1 contracts unchanged. Introduce an engine-owned extended map/layer schema or explicitly versioned profile with a required height capability. Decide the exact schema shape in the contract tranche before implementation. A legacy loader must reject unsupported height data before opening it. No truncation, clamping to floor 5, flattening, guessed height conversion or relabelled legacy schema.

Migration must preserve all existing geometry, actor locations, traversal links and extensions, with a receipt and recoverable original. Preserve the legacy profile's existing render/tactical height mappings; the extended profile must define authoritative world heights and audited conversions. Export back to a legacy format succeeds only when every required feature and height is representable. Otherwise return actionable diagnostics listing the affected objects/floors.

Retain explicit byte, object, floor and geometry limits for untrusted saves/imports. Review the existing 4,000,000-byte map limit for the new schema using real tall-building fixtures; do not silently relax the legacy limit or allow an unbounded allocation. Blocks, connected generation, capture, rotation, roofs, wall runs and whole-building references must preserve the extended floor identities or reject the operation explicitly.

The current flat Farmyard and bounded Tinderbox adapters continue rejecting unsupported upper floors. A new selector must not imply that either game already supports tall buildings. Add runtime height support through each consumer's own reviewed change and exact capability/pin.

## Runtime and cost

Upper-floor tile records are already sparse, but inherited reachability/visibility work includes dense arrays indexed across every floor. Extend sparse authored content with spatially indexed floor/chunk query data. Empty intermediate floors must not require dense copies of every 240-by-240 cell array. Audit fixed-length arrays, cache keys, packed coordinates, single-digit floor parsers, visibility masks, top-layer sentinels and six-level loops; do not encode a future expandable range in an unchecked fixed-width bitmask. The editor's whole-world/show-all loading behavior also needs a deliberate tall-building review.

Render the focused floor and the surrounding structure required for a legible scene, with explicit cutaways/ghosting for other floors. Demand-load detailed interiors where appropriate. Visibility culling must not delete authoritative simulation: an unseen upper-floor guard, projectile, fire or stair link can still matter. Preserve nearby vertical geometry for collision, support, sight, sound and shadows even when its visual layer is hidden.

Compile doors, stairs, ramps, ladders, roof access and any future lift as semantic links between real floor locations. Invalid/missing landings must fail validation. Query and perception providers must use native height; a two-dimensional distance check or floor-label match alone is insufficient. Sound/visibility notifications must obey the game's actual knowledge rules and cannot disclose hidden contacts just because they occupy another floor.

## Accuracy, efficiency and narrative

**Accuracy:** Explicit native heights and connected floors represent tall buildings better than stretched meshes or relabelled six-layer maps. They still need matching collision, openings and traversal; standard story intervals are a game-scale convention, not a universal architectural measurement. Prefer semantic floor records and metre-based queries, with legacy mappings preserved deliberately.

**Efficiency:** Sparse storage, focused rendering and indexed queries are the preferred starting point for tall buildings. This is an estimate from the current data/query structure, not a measured speedup. Rendering fewer floors does not bound simulation cost by itself. Compare five-, fifteen- and proposed thirty-two-story fixtures on named desktop and phone devices; record save bytes, memory, query time, active actors, frame-time distribution and load/disposal behavior.

**Narrative:** Five visible labels make height accessible without filling the screen with controls. Prefer deliberate manual control in the editor and character-follow/contact inspection for phone gameplay. These are usability judgments to confirm with an actual tall-building workflow. Preserve whole-building exterior views as a separate visual option; choosing an editing floor must not accidentally hide the building the artist is reviewing.

## Bounded implementation order

| Step and proposed owner | Concrete scope | Exit evidence |
| --- | --- | --- |
| 1. Architect + Coder: contract audit/prototype | Inventory all height assumptions, choose extended schema/capability/migration and sparse representation; define source-profile mappings | Legacy golden files unchanged; fifteen-story fixture with roof access validates; unsupported consumer rejects before load; measured memory/save/query baseline |
| 2. Editor + UI: floor selector | Five-label sliding strip, arrows, desktop wheel/key scope, input focus, readout and cancellation | Floor 1/5/6/9/10/15 and range ends reachable; active floor always visible; no accidental zoom, placement or undo; no hard-coded six-button layout |
| 3. Coder + Artist: model and world binding | Map native model floors and openings to geometry/query/traversal records; separate roofs from the global top layer | Existing fifteen-story asset retains scale; stairs/landings/doorways, cross-floor rays, high-floor impacts and falling/support agree with geometry; no actor/geometry loss after save/reload |
| 4. UI + Coder: gameplay follow | Explicit actor/contact/manual camera modes and known-contact elevation cues, behind each supported consumer adapter | Walk between floors, inspect a visible contact above/below, lose the contact, return to the character; no AP/targeting/knowledge side effects or camera jitter |
| 5. Architect: integration | Compatibility, package, authoring, runtime and device review at full commits | Tall edit → undo/redo → export → reload → play/save/reload, including keys/traversal across floors 9 and 10; legacy round trips; negative capability checks; scoped performance results and verified release promotion |

This is an additional contract/authoring tranche in the modular blueprint. It can be prepared alongside the first small Farmyard rules adoption; expanding height is not a prerequisite for borrowing a stat function or a visual asset. Publishing the selector ahead of the extended contract must retain the current validated range and clearly report that taller gameplay support is still pending.
