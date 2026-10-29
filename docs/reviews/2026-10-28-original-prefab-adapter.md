# Original building provider intake

Frozen integration baseline: `1ae6ea751854c1b1b046a98546d08b5de015b8ec`. Original artist source: `ee7c18ecdc2669168247b94a82156634b2c4ffe5`. The editor branch merged the baseline normally; its merge tree matched the frozen baseline before this adapter's changes. No donor checkout, original recipe, texture, exported model, Gross catalogue file or vendor byte was changed.

## Registry and ownership

`packages/prefab-core/registry.js` adds a fixed 61-entry registry: thirteen Gross houses and 48 original architectural designs. The three AFT structure presets remain ordinary editable stamps. Original metadata preserves the reviewed source commit, catalogue hash/input hashes, reference IDs/URLs, explicit floors, room/triangle counts and a conservative game-mesh envelope including closed/open doors and overhangs. `tools/prefab-original-catalog.mjs` verifies its original inputs against fingerprints checked from the fixed Git objects before regenerating metadata. CI does not need the historical commit in its shallow checkout.

The legacy Gross identity remains exactly `tinderbox-gross-housing-v1@6693bfa3fea2edec77649d830de5ac68ba4c1a50`. The new combined identity is `nautilus-gross-original-v1@6693bfa3fea2edec77649d830de5ac68ba4c1a50+ee7c18ecdc2669168247b94a82156634b2c4ffe5`. It does not redefine the old identity.

Core integration uses these helpers:

| API | Meaning |
| --- | --- |
| `buildingAsset(id)` / `BUILDING_ASSETS` | Lookup / immutable 61-entry registry |
| `isPrefabCatalogue(id)` | Accept only the two fixed identities |
| `catalogueHasAsset(catalogue, id)` | Old Gross rejects original IDs; combined accepts both collections |
| `catalogueForAssets(ids, currentCatalogue)` | Reject unknown identities/assets; retain Gross-only saves; choose combined when original content is deliberately added; never downgrade an existing combined catalogue |
| `ORIGINAL_BUILDING_FEATURE` | Additional explicit consumer capability `nautilus-original-buildings-v1` whenever originals occur |
| `DEFAULT_RESIDENTIAL_ASSETS` | Small explicit pool; six placements fit the modal's 96 × 96 m clear area at 2 m clearance |

The adapter only delegates the existing `prefab-core/index.js` asset lookup to the new registry. Coder owns mutation, generation, validation, catalogue upgrade and capability enforcement; Architect owns final root feature composition, build/header links and versioning. A provider-only editor build guards original placement/generation until its map contract advertises the original-building capability. It still permits model inspection. Final whole-map approval requires the composed core.

## Renderer and library

The host's existing Three.js instance is passed to both providers. Gross keeps its exact native assembly and current material/floor batches. The original provider calls the artist's `createBuildingModel` with `lod: 'game'`, borrows one shared 1254 × 1254 atlas and preserves the authored vertices, metre units, normals, physical UVs and door pivots. The original source's detailed recipe and source/game comparison remain available through the optional gallery link. Ground-level floor materials are copied with a depth bias to avoid coincident floor/ground surfaces; source geometry is not lifted or scaled.

Providers own their geometry/material templates; the scene owns loaded libraries and atlas lifetime. Copies share templates. Unused collections release their resources. Failed load entries are removed for a subsequent selection to retry; rapid switches cannot install stale models, and loads finishing after closure dispose themselves. Provider/model/library disposal is idempotent.

The main modal lists all 61 whole buildings and three stamps, with explicit collection/search filters. Generation offers the residential default, the 13 Gross houses, the 24 original homes, all 48 originals, all 61, or the selected whole building. Original descriptions state that rooms are unfurnished and arrangements are original interpretations, not measured reconstructions. Only Gross displays a Gross plate. Originals show their actual reference links, original blueprint JSON and a distinctly named detailed-gallery/download action within the modal.

Layout previews capture document identity and revision before generation/model loading, then check both after the await. A host edit during loading cannot be accepted as a newly current candidate. Preview success/failure, dialog closure and completed add operations are ticket-guarded so late work cannot overwrite or close a newer selection. Draw failures visibly disable placement and retire the owned preview scene.

Gross cutaways retain the existing clipping and selected-floor behavior. Original cutaways use the artist's native visibility groups through the selected floor, with roofs and external walls removed. No room, ornamental turret, stair or visible hinged door is promoted to a gameplay navigation/fire/collision claim.

## Accuracy, efficiency and narrative

**Accuracy.** Both providers retain one metre units, 2 m walls, 0.16 m wall thickness, 0.12 m slabs, 2.12 m floor spacing and the native compressed door dimensions. Original footprints derive from the complete mesh and door poses; nominal width/depth alone would omit porches and overhangs. Gross's source-specific historical plans and plinths stay intact. The 48 original arrangements use modern/historic reference vocabulary and descriptive room grids, rather than claiming exact period-blueprint reconstruction. Consumer actor clearance, collision, navigation, fire, destruction and stairs remain explicit work.

**Efficiency.** Prefer the existing game derivative for ordinary placement. The artist catalogue measures 763,402 game triangles versus 1,358,208 detailed-source triangles across all 48 models; this is geometry evidence, not a frame-rate result. Original surfaces are already grouped by kind, floor and material, so they bypass Gross's additional batching. Used templates and the atlas are shared within a scene; the full 69.89 MiB export set is not loaded to place one building. Keep the existing provisional per-map instance limit. Large districts still need measured rendering/culling/LOD work.

**Narrative.** Subjective recommendation: keep Gross for period neighbourhood identity and expose original residential/civic/commercial/farm choices for broader settlements. Painted game geometry is the preferred ordinary AFT/Farmyard authoring profile. Tinderbox can use the retained floors/openings as source information but needs its own gameplay adapter. The detailed gallery remains an optional close-authoring view.

## Verification and rendering scope

Provider/registry tests cover identity/membership/transition rules, 61/48/13/3 inventories, all original models' recorded envelopes and four placement rotations, unit scale, native cutaways, shared atlas ownership, retry after failure, rapid same/cross-collection changes and late-load disposal. Existing Gross geometry tests retain their source-specific scope.

Controller timing tests execute the real modal controller with explicit DOM/renderer doubles. They replay revision/document replacement during layout loading, stale rejections after a new selection, close/reopen and queued native closure, draw failure, and a completed add operation after a newer selection. These are behavior/ownership checks without WebGL.

Worker checks on the frozen integration branch pass: `npm run check -- --tracked`; `npm test` (108 tests); `npm run test:upstream` (32 tests); and `npm run build` (328 local module paths plus own/adapted script syntax/link checks). Original catalogue export hashes still match. No retained browser/server helper was started by this provider pass.

The current in-app browser session has reported WebGL allocation failure, including on an independent blank WebGL2 probe; Architect/UI audit reports `GL_RENDERER Disabled`. Source geometry/provider tests do not establish a successful GPU render in that session. Architect owns the final composed editor's visual/interaction review using the user-authorized isolated Edge workflow. Its observations must be recorded separately; earlier artist gallery evidence is source evidence and is not a substitute for combined-editor visual approval. This provider pass starts no retained browser/server helper and claims no final live-map approval.
