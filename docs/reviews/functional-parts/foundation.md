# Functional-parts foundation repair

29 October 2026. Package 0 of the [authorized scope at `04f915dd8b16c242d47b1e054b2406aedcbdefc8`](https://github.com/Syntaxswine/nautilus-engine/blob/04f915dd8b16c242d47b1e054b2406aedcbdefc8/docs/projects/functional-editor-parts.md). Branch: `codex/functional-parts-core`. Fixed UI source: `25224b9f7994db29d2e05ebdce279c73f4434c1e`; reviewed documentation baseline: `78d37b6cd3ba5de5c25d4922b4ba301b13491caa`. The merge at `89f7acd` preserves both parents before the repair. Title implementation, donor snapshots, main, production game pins and Sites remain outside these fixes. The bear candidate remains on `codex/bear-provider` at `a99e9317c85b23d5afd5b9232f4e4ca0bfb369e3`.

This is the bounded foundation checkpoint. The full parts schema/compiler/runtime-save checkpoint follows separately; the reference yard is not the project's completed editor/real-art proof.

## Confirmed failures and fixes

[Fixed-source reproductions](foundation-reproductions.json) replay the old input functions from the exact Git object. Of twelve state/actor cases, ten were accepted after hidden data/prototypes were lost, and two invoked accessors. All twelve now reject with `INVALID_DATA` and zero invocation. The initial focused run also reproduced unsafe constructor destructuring and missing static/other-door obstruction checks: four failing tests and one passing native-lintel preservation test before repair.

`packages/interactions/state.js` now validates finite, acyclic, bounded plain JSON and own data descriptors before serialization or cloning. Its constructors validate raw options before destructuring/defaults. The action boundary applies the same rule before reading command/options fields. Accessors, hidden/symbol data, functions/`toJSON`, custom prototypes, sparse arrays and explicit `undefined` reject; an absent optional property still selects its documented default. IDs reject trailing newlines. Valid v1 records keep the same schema/profile, resource values, revision behavior and four-million-JSON-character limit; Unicode is not accidentally restricted to four million UTF-8 bytes.

`createInteractionQueries` now checks each complete door motion AABB against immutable static surfaces and other doors' reserved motion AABBs at binding validation and again at operation time. `DOOR_BLOCKED` names the door/obstruction and remedy. Occupants still produce `DOOR_OCCUPIED`; failed preview/apply returns no events and leaves both records unchanged. The provider deliberately reserves full envelopes, including the other door's clearance even when neither current leaf intersects. Paired/intersecting arcs require an explicitly richer provider rather than a silent exception. Exact face contact is allowed under the existing epsilon policy.

The reference yard's west jamb originally extended 0.06 m into its declared motion envelope. Its static wall now ends at the envelope boundary, without changing the gate or native kit scale. The host also omits an absent `kind` rather than sending an explicit `undefined`. These are corrections to the source reference fixture/adapter, not a second title or interaction implementation.

## Bounded generated identity mapping

Foundation implementation: [identity.js](../../../packages/parts-core/identity.js). These helpers are source-level building blocks for the next ABI checkpoint; they are not yet registered as a released public parts facade.

`partIdentity(instanceId, kind, partId)` produces `fp:<kind>:<base64url ASCII instance>:<base64url ASCII part>`. `decodePartIdentity` validates canonical encoding and returns the exact tuple. No hashing, normalization, truncation or delimiter replacement is used.

| Bound / policy | Meaning |
| --- | --- |
| Instance key | 1–24 ASCII characters under the existing interaction ID alphabet, including `:` and `/`. New authored instances will have document-global unique keys, including nested children |
| Local semantic key | 1–32 characters under that same alphabet; original longer asset/source identifiers remain explicit source references rather than being shortened |
| Kind namespace | `instance`, `floor`, `surface`, `door`, `stairs`, `visual`, `portal`, `attachment` |
| Generated output | At most 90 characters, starts with `fp:`, and lies in the intersection of strict world and interaction ID grammars |
| Invalid/overlong source | `INVALID_PART_ID` with source path and an explicit-key remedy; no silent collision-producing fallback |

Unpadded canonical base64url segments contain no `:`, making tuple boundaries unambiguous. Distinct input tuples have distinct outputs. Tests enumerate delimiter/case variants across all kinds, check maximum lengths and decoding aliases, and bind generated floor/surface/door IDs through both strict world and interaction validators. Loading preserves IDs; assembly duplication will allocate fresh authored keys and remap typed references in the next ABI/Editor work rather than rewriting opaque source data.

## Native body and aperture readiness

Foundation implementation: [clearance.js](../../../packages/parts-core/clearance.js). `apertureReadiness({body:{radiusM,heightM},aperture:{widthM,heightM}})` validates measured metre dimensions and reports `APERTURE_BODY_TOO_TALL` / `APERTURE_BODY_TOO_WIDE` without changing inputs. It is an upright rectangular-body dimension check, not a capsule, arbitrary mesh or swept-equipment solver. The parts compiler must call it using the actual measured opening and selected body profile before marking the assembly ready for that actor.

The native 1.65 m aperture and default 1.7 m mover fail readiness. A separately selected 1.85 m opening fits the same unchanged body. The interaction regression also includes an actual 1.65 m static lintel; walking the default mover through it returns `BLOCKED` without movement or resizing. Mechanical leaf operation and passage fit are separate checks. A leaf's box alone cannot supply an honest aperture measurement, and no new aperture field is smuggled into strict interaction-v1/world-v1 saves.

The first real-art kit/actor choice remains Artist work. A debug proxy and this reference SVG yard do not satisfy that later visual acceptance.

## Evidence and delivery boundary

Focused regressions: `tests/interaction-foundation.test.mjs`, `tests/part-identity.test.mjs`, and the existing `tests/standard-interactions.test.mjs` (23 passing tests). The installed core proof additionally exercises getter rejection and blocked-door readiness through public imports, along with the complete shipped interaction guide's door/stair/mid-route save workflow.

Required gates and bounded browser results are recorded with actual source hashes in [foundation acceptance](foundation-acceptance.json). The browser run reuses the fixed UI/title acceptance tool and a task-owned hidden browser/server with a real four-minute expiry and `finally` cleanup. It covers keyboard/touch controls, locks/occupancy, mid-stair save/import/reload, title cancellation/focus and responsive layouts. It is a regression of the existing reference UI, not a claim that Editor placement has been integrated.

Accuracy: prefer strict authored data and explicit native geometry over accepting lossy clone results or overlapping leaves. The AABB envelope is intentionally conservative, with exact hinge/mesh cases outside this profile. Efficiency: reuse the existing immutable spatial index and bounded validation; processor/FPS improvements are unmeasured. Narrative: preserve game-owned permissions/costs, native artwork and source character dimensions. These choices are preferred for the bounded first AFT/Farmyard proof; a richer provider remains appropriate when another game's geometry demands it.

Next checkpoint: strict definitions/instances/assemblies, one deterministic compiler producing matching static world/dynamic interactions/render bindings/source maps, and an atomic content-bound runtime save. That checkpoint will register actual public exports/capabilities and publish the executable two-story fixture before dependent Editor/Artist/UI implementation freezes against it.
