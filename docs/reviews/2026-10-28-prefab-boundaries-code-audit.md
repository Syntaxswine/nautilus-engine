# Prefab portability and transaction audit

Reviewed 2026-10-28. The initial editor-assets source was `fb098afebe74afcaa3d7814858f7583129bb4b0e` (parent `33833ac8afdb3aedff45f0902e79efc8590f25a9`). The architect then froze the composed wall/halo/prefab baseline at **`1ae6ea751854c1b1b046a98546d08b5de015b8ec`**. All remaining reproductions and this corrective pass use that exact commit. The superseded raw-AFT wrapper bypass is not a remaining finding against the frozen composition.

The coder merged the frozen commit normally in its own checkout, resolved conflicts to its exact tree, and verified tree equality before repairs. Fixed Git objects supplied the audit snapshots; no donor or worker's uncommitted files were read or changed. The original building catalogue `ee7c18ecdc2669168247b94a82156634b2c4ffe5` was inspected only for its integration contract. The architect subsequently supplied registry checkpoint `cbc3478a22395efb34475dc19a86b2f1995210e5`, adopted independently after preserving a hashed repair checkpoint. Registry identity meaning comes from that helper, not this audit. No art-source change, main merge, consumer-pin change or Site publication belongs to this repair.

## Evidence and reproducible blockers

The baseline's **37 wall/prefab tests passed**. Additional probes reproduced the following issues on the frozen baseline. Here `core` is the public map entry, `catalogue` is the existing Gross `PREFAB_CATALOGUE`, and `placement` is `{asset:'albany-cottage',x:40,y:40,turns:0,clearance:2}`.

| Blocker and reproduction | Baseline result | Corrective behavior |
| --- | --- | --- |
| `createBlockDocument().apply({tool:'building-generate',options:{seed:'audit',count:1,assets:['albany-cottage'],area:{x:24,y:24,width:48,depth:48},clearance:2}})` | `ok:true`, one hidden canvas instance and one undo entry; portable export unchanged with no building; validation empty. | Reject before generating or touching history. |
| `blockDoc.replace(placeBuilding(blockDoc.editor.map,placement).map)` | Prefab accepted in the internal full-size canvas, then omitted from the exported block. | Block workspace rejects every prefab envelope, including empty envelopes and replacement candidates whose canvas lacks block `kind`. |
| `parseMap(JSON.stringify({...validLegacy24x24,buildingPrefabs:{version:99,catalogue,instances:[]}}))` (also a populated supported v1 envelope) | Migrated to map v2 with the entire prefab field removed. | Validate/reject unsupported parent formats before migration. A placeholder recipe with prefab metadata also rejects before expansion can discard it. |
| Put numeric ID `123` into a valid instance, then load it. | Accepted and retained as a number despite the portable string-ID contract. | Require canonical string IDs. |
| Apply `building-remove` with explicit ID `missing` and coordinates inside `building-1`. | Deleted `building-1` and added undo history. | An explicit missing target rejects; coordinate picking is used only when no ID was supplied. |
| Call `removeBuilding` on an envelope changed to version 99. | Accepted and erased the unsupported envelope when removing its final instance. | Validate before mutation, consistently with placement and generation. |
| Add nested envelope notes, then delete its final instance. | All notes and other envelope metadata disappeared. | Retain an empty supported envelope when it has metadata; preserve nested metadata through edits, rotation, undo and save/reload. A bare empty envelope may still be omitted. |
| Place a building while a distant angled wall exists (or merely load an empty prefab envelope alongside walls). | Blanket wall-run prohibition. | Permit separate footprints; reject wall thickness touching or entering the complete lot/clearance. |

The frozen composition already rejected empty future-version and unknown-catalogue envelopes at capability negotiation. Regression coverage retains this behavior and extends it to mutations. Rejected overlaps, insufficient generation space, blocked sector replacement and invalid imports already preserved history in the baseline; the new tests preserve those guarantees, including redo, revision and changed flags.

Source SHA-256 values below were computed from the frozen Git blobs before repairs:

| Source path | SHA-256 at 1ae6ea7 |
| --- | --- |
| `packages/prefab-core/index.js` | `81c0459368529a431499d0ab421b1798b6ecf002680cff4a86f9877cb16c651f` |
| `packages/map-core/prefab-document.js` | `4061edee1a325bdbe1134274d213cc08cfaf972dca14c96b45828ba509c0df34` |
| `packages/map-core/prefab-maps.js` | `8c10186bb63aa8c778944a7c2ffbfba377faa1738d3e3ed04a834320d9f6a98e` |
| `packages/map-core/prefab-blocks.js` | `6591d82c2c6cd21183e18c1e3011a09860d1a0ac2b6b071ef3cbc876f19a55f5` |
| `packages/map-core/prefab-generator.js` | `5131c2b257d251f35017bce74103858624254d86b0516c6a23f093ee304c8dea` |
| `packages/map-core/prefab-rotation.js` | `983b0fade849222d1c7910ba362f1bdc33248a6277a90085934e5207e8fb76f8` |

## Wall and prefab coexistence

Use the full conservative integer building lot plus authored clearance. Its physical boundaries are half a metre before the first cell center and half a metre after the last. Test the oriented wall rectangle using four separating axes, including its native 0.16 m thickness. Closed-boundary contact rejects. This detects crossing walls whose endpoints are both outside, body-only intrusion with an inset centerline, clearance intrusion and upper-story walls. It also accepts a diagonal passing outside a lot corner even when their world-axis bounds overlap.

Reservation applies to the horizontal lot on every authored layer, matching the existing conservative upper-floor reservation. It can reject an overhead wall whose vertical geometry would clear a short building. It does not certify exact 3D collision, rounded actor clearance, navigation, openings, fire, destruction or a gameplay adopter. Both feature capabilities remain required when both contain geometry; empty validated metadata alone adds no geometry capability.

**Accuracy.** Prefer oriented thickness tests to a blanket prohibition or a world-axis wall box for authoring coexistence: they represent the actual straight wall footprint while preserving explicit clearance. The enclosing building lot remains an intentional approximation covering overhangs and access space. Keep a consumer's detailed building/actor geometry separate.

**Efficiency.** Code-based estimate only: the additional test scans wall runs for each proposed lot, with four projection axes per pair. Existing occupied-cell indexing and seeded slot selection remain intact. No frame-time, CPU, GPU or large-district benchmark was performed. Measure representative dense maps before choosing spatial indexing or higher placement limits.

**Narrative.** Subjective preference: permitting houses and distant angled boundaries in one blueprint supports settlement authoring without erasing architectural intent. Explicit overlap errors are preferable to invisible geometry loss or apparent success that cannot be saved. Conservative all-layer clearance remains appropriate for this authoring milestone; finer overpasses/interiors need an explicit richer contract.

## Original catalogue integration boundary

The original 48-building package is a different provider from the 13 Gross houses. The four-file registry helper defines 61 distinct assets and two accepted immutable envelope identities: the existing Gross `tinderbox-gross-housing-v1@6693bfa3fea2edec77649d830de5ac68ba4c1a50`, and combined `nautilus-gross-original-v1@6693bfa3fea2edec77649d830de5ac68ba4c1a50+ee7c18ecdc2669168247b94a82156634b2c4ffe5`.

The core imports/reexports those helpers. It validates catalogue membership for every instance, so original IDs reject under the Gross identity. Successful original placement/generation upgrades only the copied candidate through `catalogueForAssets`; Gross-only operations retain the Gross identity, and combined saves do not silently downgrade after deleting originals. Existing nested metadata survives these changes and complete undo/redo. Capability detection requires `nautilus-original-buildings-v1` in addition to the base prefab feature when original geometry is present, before handing a map to a host. Empty supported metadata alone adds no geometry requirement. The implicit generation pool remains the original Gross pool to preserve saved seed behavior; consumers can explicitly select the combined pool or the helper's residential profile for new layouts.

Normalize the original provider's complete exported horizontal bounds, including roofs/porches, into the same lot transform contract; a main footprint's width/depth alone is insufficient. Preserve metre units, native scale, 2 m walls, 0.16 m thickness, 0.12 m slabs and 2.12 m floor intervals. The source has a front-left main-mass origin and ground slabs below zero; consumers must use provider transforms rather than equating lot coordinates with the source origin. Keep room/opening and articulated-door metadata as descriptive data. Neither room graph reachability nor a displayed building proves usable character traversal, collision or fire integration.

## Validation

Final local validation on Windows / Node `v24.15.0` / npm `11.12.1`:

- `npm run check -- --tracked`: passed; 603 pinned files, source/dependency closure, 344 editor assets, headless map/rules imports and all original building export hashes.
- `npm test`: **108 passed**. This retains the original 37 wall/prefab cases, adds ten boundary cases and four mixed-save/capability cases, and includes the helper's three registry cases alongside the other project regressions.
- `npm run test:upstream`: **32 passed**.
- `npm run build`: passed; eleven recorded deployment patches and 324 checked module paths.
- `node tools/prefab-original-catalog.mjs`: passed; all 48 fixed source bindings and closed/open-door envelopes agree with the registry metadata.
- `git diff --check`: passed for the owned repair.

The corrective pass created no preview server or retained helper. Browser/provider rendering and combined visual acceptance remain with the architect/editor helper as assigned; the previous source's renderer is not advertised as supporting originals merely because the registry exposes them. No consumer adoption, collision compiler or fire integration is claimed.

Shared delivery follow-up for architect/editor: add the original feature to public `MAP_CONTRACT.optionalFeatures`, and reconcile `tools/build.mjs`'s `building-prefabs.json` header, which currently labels its 61-asset inventory with the Gross-only catalogue ID. Those shared public-index/build files are outside this repair. The headless required-feature API and actual portable map envelopes already use the validated memberships and transitions above.
