# Headless map and rules boundary

The public map/rules entrypoints import plain data and rule functions. They do not import Three.js, painted scene factories, DOM/storage APIs, or a renderer, either eagerly or through a deferred renderer import. The browser owns visual inspection resources and receives the existing map, units and logical selection records.

This extraction uses reviewed integration **`d9a948fa80328be8dccb560efbb70efcda8ed5b4`** and the immutable AFT snapshot **`781246a668c723d5a4c5463e70534cc04b6a5641`**. The coder merged the reviewed integration normally and verified its exact tree before editing. Donor/vendor bytes, consumer pins, facade contracts, capabilities, persistence, package version and release tools remain unchanged. The guarded editor import adapter changes only how the browser obtains brush picking and preview footprint hints.

## Data and presentation contracts

`packages/map-core/inspection.js` is the engine-owned plain-data `InspectionDocument`. It opens the inherited map/block and placeholder inputs, retains original extension data, exposes units and returns logical selections: floor cells, object footprints, starts, edges, locks, access points and broken openings. These records contain data suitable for cloning or serialization; no scene objects, geometry factories, textures or storage handles belong to them.

`packages/map-core/editing-document.js` retains the pinned editing controller's methods over that data inspection contract. It preserves transactional previews/apply, history and document flags, six layers, room/structure stamps, character/dialogue metadata, patrols, lights, climbs, block operations and export behavior. The existing wall/prefab document layers and public facade continue to wrap it. No facade functions or portable schemas were replaced.

The extraction changes the inspection superclass import and rebases the original controller's data dependencies. The source behavior remains intact. Source SHA-256 values, computed from the reviewed Git blobs, are recorded in the extracted modules:

| Pinned source under `dist/tactics/` | SHA-256 |
| --- | --- |
| `editor-3d-model.js` | `4778bb5f8a3e7669802550614d33705f754376a52c95070b9b7a8350daf05cdc` |
| `editor-3d-controller.js` | `7474f6ebd3f3114e79d209e71585d49397b19cd5c6cbcc3de9014323544024da` |

`apps/editor/inspection-visuals.js` is the explicit browser-only adapter for `PREVIEW_FOOTPRINTS`. It derives the unchanged truck/cargo labels and tile dimensions from the pinned visual library. The guarded editor adapter routes the browser entry's footprint import there and routes brush picking to the plain editing module. The public map/rules closure has no path back to that visual adapter. Existing scene adapters retain their renderer and one shared Three instance.

## Static closure evidence

Measured unique transitive module counts and uncompressed UTF-8 source bytes, including entry modules and complete imported files. This is dependency/source-size evidence, not a bundle, memory, frame-time or CPU benchmark. Baseline values use fixed Git blobs; repaired values use the corresponding extracted source tree.

| Public entry set | Before modules | Before bytes | After modules | After bytes |
| --- | ---: | ---: | ---: | ---: |
| `packages/map-core/index.js` | 94 | 7,662,497 | 90 | 5,634,618 |
| Rules root, dialogue and AFT compatibility entries | 21 | 83,164 | 21 | 83,164 |
| Union of all four entries | 104 | 7,693,739 | 100 | 5,665,860 |

The previous path was public map facade → prefab document → wall document → donor editing controller → donor inspection model → `painted-cargo.js` → Three. Removing it also removes `painted-environment-scene.js` and its renderer dependencies from the public closure. The map closure loses **2,027,879 bytes** of reachable source. No renderer was hidden behind an asynchronous loader.

Three large plain gameplay datasets remain:

| Pinned module | Bytes | Why it remains |
| --- | ---: | --- |
| `strategic-site-data.js` | 2,886,480 | Authoring passability uses its clearance rows, links and entries; the same immutable module also contains physical ray/BVH data. |
| `factory-gameplay-data.js` | 1,706,403 | Machine clearances and physical triangle/BVH queries support existing movement checks. |
| `helicopter-gameplay-data.js` | 601,010 | Helicopter clearances and physical triangle/BVH queries support existing movement checks. |

These are gameplay collision exports, not renderer/sculpt resources containing materials, normals or UV streams. In particular, `sceneryMoveAllowed` uses `geometryBoxHit` for transitions between levels; replacing its shape with a footprint box changes validated traversal. The site module's unused ray portion could be split from its lightweight authoring profile in a later explicit data extraction. This focused pass retains physical fidelity and records the remaining cost, as directed by the architect, rather than redesigning validated content to reduce the count.

## Regression guard and validation

`tests/helpers/headless-closure.mjs` uses Node's module parser in an isolated test subprocess to discover static import/reexport requests. It derives the map/rules public entries from package exports and follows the entire transitive graph. The public-core guard rejects browser/renderer modules, external dependencies, DOM/storage/renderer machinery and opaque dynamic dependency loading. It conservatively disallows deferred import, require and executable indirection syntax. It is a regression guard for the declared architecture, not a general JavaScript sandbox.

Adversarial fixtures verify transitive reexports, misleading import text in comments/strings, lazy imports including template expressions, DOM/storage calls and injected renderer construction. A separate runtime test seals browser globals before importing all public map/rules entries, then creates/edits/inspects maps and blocks and runs character-sheet functions.

Behavior comparisons against the pinned donor cover factory metadata and logical inspections across layers, river/block/placeholder import/export and rejected opens, command previews, history/flags, high-layer edits, every structure stamp in both orientations and workspaces, and unchanged browser preview footprints. Existing generation, wall, prefab, character and rendering tests remain in the complete suite.

Local validation: **135 Nautilus tests passed**, including nine new boundary/document cases; **32 upstream regressions passed**; `npm run check` passed with 603 pinned source files; `npm run build` passed with eleven recorded deployment patches and 332 checked module paths. Renderer, gameplay-data and vendor source bytes were not edited. The architect owns final combined browser/CI approval after integrating the immutable repair.

The existing approved `npm run review:integration` harness also passed locally in isolated Edge `156.0.4314.50` with software WebGL: all 61 assemblies/three stamps, six seeded buildings, distant-wall acceptance, atomic overlap rejection, complete undo/redo, browser save/reload, portable JSON round-trip, repeated asset previews, 1280×900 desktop, 390×844 mobile without overflow, unsupported-host rejection and successful asynchronous host handoff. There were no page/resource errors or missing scene diagnostics. Evidence is under the coder worktree's ignored `artifacts/engine-integration/`. Its record identifies merge base `a91220c7f1a58bbec64b5cf5fee581f76511e85c`; the local build reviewed the extracted working-tree source, with build provenance SHA-256 `e1756388a7a81f9fbcd0be91c61d64c53dd81d73ae4d0ba1774230deadbf85e0`. Final frozen-commit approval remains with the architect. The harness closed its owned browser and HTTP server in `finally`; its cleanup receipt and released port were verified. No helper is retained.

## Design evaluation

**Accuracy:** keeping the original data editing and physical traversal behavior is preferred for compatibility. Separating rendering changes dependency ownership, not the map's geometry or collision policy. Bounds-only substitutes for the existing collider checks would require separate parity evidence and explicit profile decisions.

**Efficiency:** the measured improvement is the smaller static import closure and elimination of renderer initialization from headless consumers. The remaining gameplay datasets explain most of the source footprint. No practical CPU or memory improvement is claimed without representative measurements.

**Narrative:** this boundary should leave authored worlds, appearances, inspections and undo behavior unchanged. Games remain free to bind their own presentation and rules adapters; a headless import does not integrate any game's movement, fire or encounter loop.
