# Weekly scout — 2 November 2026

Three worthwhile new integration briefs and one research watch item emerged. Prioritize Farmyard's multi-sector authoring feedback, then its bounded town/footprint adapters. Tinderbox's new fire review tools are promising shared tooling; its fluid fire reference remains unaccepted research. No assets or runtime were imported.

## Fixed sources and deduplication

| Source | Reviewed checkpoint | Change since the previous scan |
| --- | --- | --- |
| Nautilus main | `8184f06aa587542b026352a739f3766d1794c4fe` | Doors, window runtime/authoring/native presentation and tile authoring are now present. Current-main CI passed. |
| Farmyard main | `48754983ab3646ddf783c736fe478c6882c02412` | Merged Mount Dora geographic atlas, production footprint art and continuous walking-tour integration; published CI passed. |
| AFT main | `25d0e91858be0fa5ea7d54132a4a642624bd9aa7` | Unchanged from the prior intake. Do not resend the animal completion/bear work. |
| Tinderbox master | `dc7f537a83a7e832a0dfa0757d0b2700b909c053` | Unchanged. Fire work below is on published worker branches, not an integrated game release. |
| Tinderbox fire runtime | `d054a9aeaf5563fb0daf2c2324c85cef6e6c4365` | Private comparison driver, exact-entry delivery/receipts, workload/GPU evidence and bounded binary preparation. |
| Tinderbox fluid reference | `034c5138318feac6cc42e33f6dd4a9e282d55312` | Finite original Mantaflow contact reference; quality, actual browser data/shaders and cost remain pending. |

The scout branch was updated from the exact passing Nautilus checkpoint without resetting it. Its only conflict was the older UI helper title in `docs/weekly-scouting.md`; the current `UI, Nautilus Engine` name was retained. Runtime bytes match reviewed main. Earlier scout-only window reports remain preserved.

The [architect queue](2026-10-30-architect-queue.md) already owns animal completion, medicine/waterfront/landmarks, Coldwell feedback and exterior ghosts. Preserve those assignments and the active tile/codec/UI work. This week supersedes the old missing-window assessment: window core, authoring and native presentation are implemented, so no duplicate window order is sent. Catalogue presence, proposal files and test-only donor copies still do not prove consumer adoption.

Farmyard's production kit copies five building/roof modules from Nautilus `2502646482218524fd5129641da769bb82462e4d`. All five match that source and today's engine byte for byte. The useful return is new geographic/footprint/residency adaptation, not reimporting our own buildings or paintings. Asset categories: existing 2D painted atlas/materials are reused; new 3D value is source-footprint assembly and support/ownership; no new shared character movement is proposed. The fire reference is an animated visual effect, not a character movement set.

## FC-4875498-sector-project — P1, proposed

**Type/consumers:** map authoring architecture and conformance content for Nautilus, AFT and Farmyard, potentially Tinderbox. Source is Farmyard main above. Review roots: `maps/mount-dora/{README.md,project.json,features.json}`, `source/{NOTICE.txt,authoring-config.json}`, `workshop/{model.js,atlas.js,project-proposal.md,audit.json}`, `docs/maps/mount-dora-editor-feedback.json` and `tools/maps/build-mount-dora.py`. Full file hashes are in the [evidence manifest](2026-11-02-weekly-scout.sources.json).

The project preserves a common east/south metre grid, WGS84 local projection, 42 adjoining 240 m sectors and 950 footprint identities, including courtyard holes and 88 buildings crossing boundaries. Thirty-nine maps open through the inherited mission-oriented contract; all-water A05/A06/A07 are preserved and explicitly refused rather than receiving invented spawn platforms. The donor's native workshop receipt exercises edit, undo/redo and export/reopen with source metadata intact. Current map-core still delegates mission validation and exposes no project/georeference/dirty-sector-switch contract.

**Accuracy:** prefer original source vectors, shared origins and explicit missing elevation/interiors over snapping a whole geographic project to independent sector centres or adding fake land to pass validation. This is flat, unsurveyed geographic blockout; heights, some widths and vegetation remain declared approximations. Hash correctness does not establish geographic truth.

**Efficiency:** prefer a lightweight project/atlas wrapper opening one native document at a time. A full-town terrain address space is 2,419,200 cells before extra geometry; that is arithmetic, not CPU/GPU timing. Keep bounded metadata and avoid allocating all sector scenes merely to select a map.

**Narrative:** subjectively prefer legible geography and continuous feature identity for a town/campaign setting. Preserve each game's mission requirements separately; an authoring sector need not already contain a playable combat setup.

**Recommendation/work:** Coder proposes an optional versioned project/georeference sidecar and explicit terrain-only authoring profile, without weakening the original portable map/game validators. Editor owns separate select/open actions and dirty-document negotiation; UI audits navigation, refusal/retry explanations and phone/keyboard use. Artist only supplies source/display references if needed. Estimated medium effort, roughly 3–5 focused days plus review. Queue behind the architect's current tile/codec work.

Acceptance: exact 42-sector hashes and neighbor origins; 39 normal imports plus three expected water refusals before the new profile; no fabricated terrain/markers; bounded unknown metadata round trips; dirty-switch cancel preserves document/history; edit/undo/redo/export/reopen; cross-boundary source identity and ownership; missing sector/refused capability does not replace the open document. Public installed example and guide must distinguish authoring readiness from gameplay readiness. Retain OpenStreetMap attribution and ODbL 1.0 records for geographic databases separately from code/art notices; this report does not interpret or grant new rights.

## FC-4875498-streamed-footprints — P2, proposed

**Type/consumers:** optional large-world rendering/query/save adapters and 3D footprint assembly. Same fixed Farmyard main. Roots: `sites/tactical-animal/{mount-dora-runtime.md,dist/mount-dora-world.js,dist/mount-dora-progress.js,dist/mount-dora-entry.js,dist/mount-dora-view.js}`, production `dist/mission-art/mount-dora/{kit.js,manifest.js,placements.js,provenance.json,SOURCE-NOTICE.md}`, and `docs/art/mount-dora/production.md`.

The new adapter queries complete intersecting bounds, including objects anchored outside the current window. It separates render residency from terrain/collision authority; supports holes, native oriented wall slabs, circles and capsule rails; retains shared-wall owners; and records explicit `retain-source-walls`, `replace-source-walls` and `additional-solids` policies. Footprint-derived roofs are clipped to concavities/courtyard holes. Town-to-game translation subtracts half a metre exactly once for art, solids and actors. These are outdoor/flat-world policies, not automatic Coldwell or landmark-interior support.

**Accuracy:** prefer actual footprint holes and source-owned wall/support records over filling a rectangular prefab lot or equating an AABB with exact collision. Preserve water beneath mapped support corridors. Facades, 2 m walls/2.12 m story pitch, boardwalk width and some landmark forms remain approximations, not surveys.

**Efficiency:** prefer bounded indexed residency and per-placement retirement for town-scale scenes. Source limits are nine decoded sectors, two concurrent/nine queued fetches and a nine-block 24 m render window. Full explored bits occupy 302,400 raw bytes; static terrain is omitted from saves. These are code limits/counts, not physical-phone speed or memory certification. Quantized focus changes avoid redundant raycasts; measure transparent-material cost separately.

**Narrative:** subjectively prefer continuous outdoor travel, source-readable landmarks and presentation-only occluder fading. Keep collision authoritative while fading visuals. Gold interaction emphasis and Tinderbox's sparse exterior ghost remain different effects; do not replace them indiscriminately.

**Recommendation/work:** Coder should extract the smallest optional residency/source-identity and complete-bounds query seam, then review footprint/collision policies against current world/parts services. Reuse existing native artwork and original wall helper; no donor game loop, guard AI, tour mission or wholesale data import. Artist reviews native clipping/joins/focus roles; Editor/UI connect fixed public APIs after that contract. Share infrastructure with the already queued Coldwell/landmark work where compatible while preserving distinct geometry profiles. Estimated large effort, at least a week with scene/device acceptance; a small fixture/contract can come first.

Acceptance: continuous movement through a four-sector corner; spanning building and shared-wall ownership; real boardwalk entrance/join/return with water retained; bounded request/cache/resident counts; failed/aborted/late loads; complete-bounds selection; courtyard holes and material/texture ownership; pose unchanged on failed visit; save/resume preserves position, injury/resources/equipment and discovery without static data or effect replay. A source/art revision mismatch must refuse explicitly. Require public package example, actual native editor/game browser checks and representative device budgets. The donor's exact PR head passed native tour/workshop CI; that does not establish Nautilus adoption or physical-phone performance.

## TB-d054a9a-fire-review-tools — P2, research/tooling candidate

**Type/consumers:** reusable rendering comparison and source-evidence tooling for all three games. Source is unmerged Tinderbox runtime `d054a9aeaf5563fb0daf2c2324c85cef6e6c4365`. Roots: `tools/fire-realism/{profiling.js,delivery.js,resources.js,check-delivery.mjs,fixed-pose.js}`, `docs/engineering/fire-realism/{runtime-driver.md,delivery.md,binary-delivery.md}`, and `tests/integration/fire-factory-receipt.test.mjs` with its synthetic fixture.

The driver compares one effect at a time at identical frozen authoritative poses, camera/resolution and workload hashes; uses interleaved fire/no-fire trials; rejects disjoint/noisy/unavailable timer evidence; and reports incremental GPU cost separately from complete-scene time. Approval records bind exact mode, commit, module, named export and complete resource hashes. A same-byte module with a different own export cannot reuse another factory's receipt. An absent descriptor is unconfigured, not accepted. Cold preparation has cancellation, rollback and bounded resource ownership.

**Accuracy:** this improves reproducibility and causal attribution of rendering comparisons, not physical fire realism. Prefer exact entry/workload binding over trusting a commit label or comparing different scenes. No current result establishes calibrated heat, airflow, ignition or material science.

**Efficiency:** prefer rejecting inconclusive/noisy GPU evidence and retaining paired raw samples over substituting CPU frame timing for GPU cost. Borrow the measurement protocol before importing the whole private driver. Fire-specific binary ceilings, including 98 MiB sparse capacity, are workload choices; they must not become global engine budgets. No optimization ratio is accepted by this scout.

**Narrative:** better matched motion/scene review can preserve readable flames, smoke, characters and HUD while optimizing. Visual quality remains a subjective, separately reviewed criterion; a passing receipt test does not prove attractive fire.

**Recommendation/work:** Coder extracts a small benchmark/report schema and exact-entry lineage proof into optional tooling, with one host-supplied scene example. Artist defines comparable visual/motion cases; UI only if a reusable review surface is selected. Estimated small prototype (1–2 focused days), medium generalization after review. Do not promote Tinderbox fire assets or expand runtime loading permissions as a side effect. The verifier explicitly is not a JavaScript sandbox and cannot prove arbitrary same-origin code safe; source and installed-closure review remain required.

Acceptance: synthetic same-byte/different-export counterexample; exact reference-to-optimized linkage; changed workload/pose or paired baseline invalidates comparison; unavailable/disjoint/noisy GPU produces inconclusive, never a speedup; fresh-document source verification; partial/aborted load retirement; borrowed masks/depth survive; raw sample export and empty/non-burning workload refusal. Keep physical measurements and quality approval independent.

## TB-034c513-fluid-contact — P3 watch only

Unmerged artist `034c5138318feac6cc42e33f6dd4a9e282d55312` supplies a finite original Blender/Mantaflow four-cell grass contact reference under `assets/art/fire-realism/fluid-contact/`, documented in `docs/art/fire-realism/fluid-contact-stage2-handoff.md`. It does not change gameplay simulation or production defaults. The 3.2-second emitting source has a finite smoke-tail adaptation; other layouts, sustained fire and missing observed age are explicitly unsupported.

Accuracy preference is provisional: original density/temperature/flame fields represent richer visual structure than repeated opaque cards, but shader/appearance acceptance and physical calibration are unproved. Efficiency counts are substantial: 76,464,872 compressed resource bytes, 88,072,548 shared sparse bytes and 7,077,888 CPU bytes for two dense RGBA slots, with the same nominal texture storage. The reported actual Node proof peaked at 660,852,736 RSS bytes; this is not a GPU measurement. Narrative quality must be judged in matched native motion, not inferred from CFD provenance or geometry counts.

Do not import this reference now or interrupt the donor's ongoing acceptance work. Revisit after its architect supplies a fixed accepted reference, actual browser/shader and data evidence, supported camera/source envelope and measured representative budgets. Tinderbox can lead richer fire where it serves the game; tactical games should retain cheaper optional policies. No helper implementation assignment is requested for this watch item this week.

## Checks and handoff boundaries

Independently inspected 47 immutable review roots, verified all 42 declared sector hashes/byte counts and five inherited building/roof module hashes, and confirmed those five modules already match current Nautilus. Four Farmyard source test files passed **29 tests** at `2faee8cb91dd6e859338300c90488af16387d262`; their dist/tests/map trees match the reviewed merge. An isolated five-file Git-object snapshot of the fire runtime passed **8 exact-entry receipt/measurement contract tests**. Those use synthetic GPU values and acceptance records, not actual GPU or quality evidence. Both source checkouts were left untouched.

Visually inspected the committed native shoreline-sector image and production contact sheet. They support the stated source/topology/appearance observations; no new live browser, physical-device benchmark or fire render was performed. No preview server or retained helper was created. Focused commands finished; prior donor/architect helpers were untouched.

Current-baseline scout checks passed: `npm run check -- --tracked` (603 pinned files plus current component closures), `npm test` (1,099 passed), `npm run test:upstream` (32 passed) and `npm run build` (552 module paths). These validate the report branch on reviewed main, not implementation or visual acceptance of the proposed candidates. This report changes no runtime, donor pin, consumer pin or Site audience. The evidence manifest lists review roots, not an approved transitive/dynamic import closure.

Review and prioritize these candidates, choose what fits Nautilus, and subdivide accepted work into bounded assignments for the appropriate existing coder, artist and UI helpers; define interfaces and acceptance checks, then review their combined contributions in the architect worktree. Preserve the existing queue and active tile work, use Editor for authoring changes, and do not equate this handoff with acceptance or publication. Every implemented component needs its packaged usage card, public connection example and builder checklist under the current component-handoff standard.
