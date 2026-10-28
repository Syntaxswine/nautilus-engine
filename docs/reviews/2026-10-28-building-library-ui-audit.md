# Building library UI repair and review

Reviewed the fixed prefab contribution `fb098afebe74afcaa3d7814858f7583129bb4b0e`, gallery `ee7c18ecdc2669168247b94a82156634b2c4ffe5`, and composition `44e5a8bf8789ad5533a22f8de99f3c5fe0ad2bf1`. The corrective pass uses the architect's frozen `1ae6ea751854c1b1b046a98546d08b5de015b8ec`.

The requested normal merge is `112ea48172a2a74e6f7a83880e22706269066d92`. Earlier UI changes had been cherry-picked into the integration history; overlap resolutions chose the frozen versions. The resolved merge tree was verified byte-for-byte identical to the frozen tree before the repair. Existing UI branch history is preserved.

## Owned repair

Runtime changes are limited to `apps/editor/editor.css` and `apps/editor/assets.js`. `tests/editor-assets-lifecycle.test.mjs` and this audit/evidence cover those changes. Editor-owned building/provider code, `tools/build.mjs`, game consumers, source pins and hosting settings are outside this patch.

The asset library now retires failed or unfinished preview sessions before reusing their canvas, scopes asynchronous callbacks to the owning scene, and keeps an old selection completion from scheduling work for the new preview. Draw failures disable placement and display the error inside the modal. Explicit retries clear stale failure state and obtain a fresh scene. Cleanup clears the active reference before disposal, attempts context release in `finally`, replaces the canvas, and invalidates close/pagehide selections. Healthy completed previews retain the existing reuse path.

The frozen source already declared the replaceable canvas with `let` (line 19). A reported const-reassignment failure was not reproduced in this exact baseline. The repair retains `let`; close/reopen tests exercise the reassignment and would catch a regression.

Header CSS styles navigation links consistently with buttons, gives tablet actions a three-column grid, and reserves a brand row plus two action rows on phones. The map, tools and property drawer use the same header-height variable. Phone library dialogs use a bounded result list above a full-width inspector, a reachable sticky close heading and one outer scrolling flow. Text is allowed to wrap; action labels are not clipped or replaced by icons. The existing painted palette, native scene geometry and asynchronous host-handoff implementation are retained.

## Evidence and limits

All four new controller regressions failed against the frozen implementation and passed after the repair:

| Case | Frozen behavior | Repair behavior |
| --- | --- | --- |
| Failed preview followed by a successful explicit retry | Stale failure kept Use disabled | Error is cleared for a fresh scene; successful retry enables Use |
| Renderer throws during draw | Exception escaped and Use remained enabled | Error is shown in the library, Use disables, owned scene/context retire |
| Close, reopen, then resolve the old selection | Old completion queued a frame for the new preview | Canvas is replaced and the retired callback cannot queue a frame |
| Change selection while its preview is pending | Unfinished renderer retained for the next selection | Old scene/context retire; late work cannot change the selected asset or queue a redraw |

The tests execute the actual controller body with explicit DOM/renderer fault doubles and two fixture assets. They are state/resource regressions, not rendered-image, GPU-memory or performance measurements. The live blueprint fixture remains unchanged.

[Structured replay evidence and source hashes](evidence/building-library-ui-replays.json) also record two reproducible Editor-owned timing faults. A failed prefab load made one load attempt; the next selection made no new attempt, had no diagnostics and no models. The layout handler previewed map version 0, stored revision 1 after its model wait, and accepted an apply against map version 1. These are controlled source replays, not a claim of a live map interaction.

Source-derived phone constraints at 390 × 844: a 132 px header reserves a 34 px brand row and two 35 px navigation rows; six actions fit three columns with a minimum 32 px control height. The workspace receives 628 px. The property drawer begins at 142 px with a 94 px bottom inset (608 px available). Modal outer width is 374 px; results cap at 160 px and the preview canvas is 220 px high. Desktop header height remains 72 px; tablet height is 96 px. These values describe the declared CSS policy, not measured browser rectangles.

The architect confirmed the in-app renderer is disabled. A static local-file header fixture was also rejected by the browser URL policy before rendering; no workaround or browser reset was attempted. No live final-map GPU review, phone screenshot or touch-device acceptance is claimed here. The architect owns the explicitly authorized isolated headless Edge review on the combined final scene after worker imports.

## Findings handed to other owners

1. **Architect: duplicate Building library navigation.** The frozen build injects a same-page gallery link while `installBuildingLibrary()` adds a modal button with the same text. They open different catalogs; the gallery route leaves the editor without an unsaved-work guard. The architect reports removing the duplicate link after the freeze. This patch does not edit shared build composition.
2. **Editor: failed prefab loading cannot recover.** `PrefabLayer.update()` leaves its rejected `pending` promise set. A second selection clears scene diagnostics but performs no retry, allowing an empty preview to be marked ready. Reset/rethrow the failed load and require a usable loaded assembly before enabling placement. Frozen source: `apps/editor/prefab-scene.js` lines 13–14, `prefab-preview.js` lines 17–20, and `buildings.js` lines 56–61.
3. **Editor: layout revision sampled too late.** `buildings.js` lines 86–101 record the document revision after `await scene.open(...)`. If the embedding API edits that same document during the wait, the stale candidate is accepted and apply regenerates against different state. Capture/check document identity and revision before the wait. The preview catch at line 96 also needs a ticket/session guard to avoid overwriting a later selection's status.
4. **Gallery owner: startup failures remain hidden.** `apps/buildings/library.js` lines 3–8 initialize WebGL and await the atlas/reference data before binding controls, without a visible error path. A context or fetch failure leaves the static Loading state and an empty catalog. Surface a failure in that page with a deliberate retry/reload path; the editor's runtime-error banner does not cover the gallery.

The frozen bridge still includes the earlier awaited host handoff and visible Settings feedback. This repair does not modify that bridge or capability policy; final combined browser acceptance belongs to the architect.

## Required checks and evaluation

`npm run check` passed: 603 pinned files, 344 editor assets, the headless boundaries/rendering closure, and 48 original-building exports verified. `npm test` passed all 95 tests, including the four new controller regressions. `npm run test:upstream` passed all 32 tests. `npm run build` passed with 11 recorded deployment patches, 322 module paths checked and own/adapted script syntax verified. Node.js `v24.15.0`, Windows.

**Accuracy:** Native dimensions, model identity and placement data remain unchanged. A preview is marked usable only after its own successful load; errors remain distinct from ready state.

**Efficiency:** Completed healthy previews are reused. Failed or unfinished sessions release their owned scene/context, canvas and queued work. Additional scene creation on a pending selection is a deliberate ownership tradeoff. Counts/state were tested; no CPU/GPU speed or memory improvement is claimed.

**Narrative:** Prefer legible full labels and feedback beside the action that failed, with the existing painted workshop treatment. Prefer a vertically scrollable phone inspector over two narrow competing panes. These are UI design judgments; the final combined headless Edge review must confirm spacing and rendered appearance.

No background preview, watcher, custom browser process or retained helper was launched by this pass. No browser global reset or application-setting change was made.
