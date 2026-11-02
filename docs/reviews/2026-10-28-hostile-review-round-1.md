# Hostile review, round 1 of 5: Nautilus Engine 0.5.0

- **Reviewed commit:** `12ad8c9`, tip of `codex/nautilus-integration`, tag `v0.5.0`. During the review, main moved twice:
  - PR #1 merged as `581258a`, whose tree is identical to 12ad8c9.
  - PR #2 merged as `8e962a2`; it changes docs only.

  **The findings therefore apply to main's code.**
- **Judged against:** the owner's description of the engine (2026-10-28), paraphrased:
  - a menu of game UI, wiring, animation, assets and a standardized editor;
  - an editor that creates standardized assets that work together;
  - a two-way exchange with Tinderbox, Farmyard Commando and AFT-3D.

  The engine's own README, AGENTS.md, docs and approval records are judged too.
- **Method:**
  - One hostile reviewer (Claude) worked in a sandbox worktree at 12ad8c9 and read the three games through Git objects only.
  - The session that commissioned it re-checked every MUST-FIX and two SHOULD-FIX findings independently (table below).
  - Labels: **measured** = run and quoted; **code-reading** = cited source; **judgment** = assessment. This is the split `docs/design-evaluation.md` asks for.
  - Line numbers refer to these commits unless stated otherwise:
    - Nautilus 12ad8c9
    - Tinderbox 0891c55 (its active development line)
    - Farmyard 60aeeed (origin/main)
    - AFT 25d0e918 (origin/main)
- **Evidence:** [`evidence/hostile-review-round-1/`](evidence/hostile-review-round-1/README.md) has every probe, how to run it, and which finding it supports.

## Score: 4 / 10 against the stated purpose

What exists is engineered with unusual discipline:
- Every gate passes, and both installed-package proofs and the browser acceptance reproduce, down to the six committed screenshot hashes.
- All 617 vendored files are byte-identical to their donors' Git objects.
- 14 of 18 targeted mutants turn the suite red.
- Nothing loaded and unloaded in the editor leaked.

Measured against the purpose, the engine is much less than described:
- **Standardized assets.** The standard does not exist yet:
  - The three agent-built collections (measured hospital/mill/market, H-plan apartments, fort) each invented their own blueprint shape, register nowhere, and cannot be placed in a map.
  - The prefab registry admits exactly two hard-coded collections.
  - The editor cannot author a reusable building.
- **The exchange.** In code it is one unintegrated Nautilus worker commit going to Tinderbox and one unmerged Tinderbox worker commit coming back, plus donor snapshots. AFT and Farmyard consume nothing from Nautilus, and their existing loaders accept Nautilus maps while silently dropping the houses, roofs and angled walls.
- **Animation and game UI.** Two of the five pillars have no code.

The craftsmanship of what exists would rate 7 to 8. The score is for fitness to purpose.

## Independent verification of the reviewer's findings

| Finding | Re-checked how | Result |
| --- | --- | --- |
| M1 | Re-ran `aft-exchange.mjs` and `farmyard-exchange.mjs`. Confirmed the extracted consumer files match their commits (blob compare). `git grep` for readers of `buildingPrefabs`, `slopedRoofs` and `wallRuns`: 0 files in AFT 781246a, 0 in AFT 25d0e918, 0 in Farmyard 60aeeed. | Holds |
| M2 | Ran every ref, ancestry, diff and tag check below myself. Verification also found the same flaw in main's own catalogue provenance (`ee7c18e`); see M2. | Holds, and widens |
| M3 | The reviewer's placement run used 12ad8c9, where these buildings do not exist, so it could not fail. Re-measured with `place-probe.mjs` on each art branch's own tree (e375a1a, e5abac5), with a control: registry 61, `albany-cottage` placed, all five structures "Unknown building asset". The branch diffs touch no registration surface. | Holds, with the corrected measurement |
| M4 | Read `packages/map-core/prefab-document.js:16` (the reviewer's citation lacked the folder), `docs/building-prefabs.md:52` and `registry.js`. A grep of `apps/editor` finds no asset-saving or provider-registration path. | Holds |
| S1 | Same run as M1: Nautilus rejects a one-guard `bull` map with "Use at most 46 guards…". | Holds |
| S2 | Independent harness `survivors.mjs`. Baseline 203/203. Each of the three mutants also 203/203. M05 is reachable: baseline `PLAYER_CLEARANCE`, mutant `accepted`. Tree restored clean. | Holds |

Everything else is the reviewer's measurement and was not re-run.

## MUST-FIX

### M1. Every game's existing map loader accepts Nautilus maps and silently drops their buildings, roofs and angled walls

**Claim.** The editor's Export is the documented path when no adapter is connected. It writes a plain `version: 2` map that AFT and Farmyard accept without a diagnostic, and the Nautilus geometry is lost.

**Evidence (measured).** The probe map has two prefab buildings (a Gross and an original house), one sloped roof and one 45° wall run.
- **The export.** 818,395 bytes, `validate()` = `[]`, required features wall runs, building prefabs, original buildings and sloped roofs. `version: 2`, no requirement stamp.
- **AFT `parseMap`, at the pin 781246a and at main 25d0e918.** Accepted, keeping all three fields as inert data. No AFT file reads them.
- **Farmyard `adaptAftSector`** (`sites/tactical-animal/dist/aft-sector.js:23-43`). Accepted. The output has `obstacles: 0`, `edges: 0`; the house, roof and wall are gone. The importer rejects upper floors, stairs and canopies (line 25) but never looks at the Nautilus fields.

**Root cause (code-reading).**
- Extensions ride inside the unchanged inherited format: `packages/map-core/index.js:21`, `format: 'aft-map-v2'` plus `optionalFeatures`.
- Capabilities are enforced only in `sendToGame` (`apps/editor/editor.js:21-28`), which needs a connected adapter. No game has one.
- Export writes the plain map (`packages/map-core/editing-document.js:146`), not the `nautilus-save` envelope that carries requirements (`packages/map-core/persistence.js:75-81`).

**Hurts:** the exchange with AFT and Farmyard, and the assets pillar. Angled walls vanish from play, so units would walk through them. It contradicts AGENTS.md: "reject unsupported map features explicitly rather than silently dropping geometry".

**Direction.** Make required features travel in-band. When a map needs Nautilus features, export the stamped envelope or a new format id, so pre-Nautilus loaders refuse it. Maps without Nautilus features can keep the inherited bytes. Each game should also get a guard that refuses unknown functional top-level keys. Emitting buildings as native geometry (see 07fa324 under M3) is the alternative that old loaders already understand.

### M2. The Tinderbox exchange runs between unintegrated worker branches in both directions, forms a cycle, and the copies have drifted

**Claim.** Each side pins the other's unreleased worker commit, and the same houses now render differently in the two repositories.

**Evidence (measured unless marked):**
- **Tinderbox → Nautilus.** `upstream.json` pins `tinderboxPrefabs` at `6693bfa`.
  - In Tinderbox, only `codex/art-assets` and its remote contain that commit.
  - It is not an ancestor of `origin/master` (the default branch) or of 0891c55.
- **Drift.** `git diff --stat 6693bfa 0891c55 -- src/art/gross-housing.js` reports 27 insertions and 11 deletions: Nautilus window bays, `arch` openings, a `roofBuilder` hook, and gable/dormer/spire materials repainted from shingle to exterior. Nautilus still assembles Gross houses from the 6693bfa bytes (`apps/editor/prefab-providers.js:1`). Of its 66 vendored prefab files, 12 are identical on Tinderbox's development line, 1 has drifted and 53 no longer exist there (reviewer).
- **Nautilus → Tinderbox.**
  - `src/art/nautilus-windows.js:1-4` imports `vendor/nautilus-engine/90054d0…/packages/window-kit/…`.
  - 90054d0 is the tip of `codex/editor-assets` (package 0.3.0).
  - `packages/window-kit/index.js` exists at 90054d0 but not at 12ad8c9 or at main (8e962a2).
  - No tag contains 90054d0; `v0.5.0` is the only tag.
  - The vendored copy is on 8 Tinderbox worker branches and not on `origin/master`.
- **Cycle (code-reading).** Tinderbox 0891c55 vendors Nautilus 90054d0, which vendors Tinderbox 6693bfa. Nautilus 12ad8c9 also vendors Tinderbox 6693bfa.
- **Nautilus's own provenance has the same flaw (measured in verification).** main names `ee7c18e` as the source of the 48 original buildings:
  - 49 entries in `packages/prefab-core/original-catalogue.js` and 48 in `packages/assets/catalogue.js`;
  - the combined catalogue id at `packages/prefab-core/registry.js:4`.

  ee7c18e is reachable only from `codex/nautilus-art`; main holds its cherry-pick 44e5a8b. A map that places an original building stores `buildingPrefabs.catalogue = "nautilus-gross-original-v1@6693bfa…+ee7c18e…"`. **The identity written into saved maps names one unmerged worker commit in each repository.**
- **Unusable on the Nautilus side.** The houses that use the Nautilus window bay (Hopkins 13 and 15, and more on `art-assets`) are not in Nautilus's 61-asset registry.
- PR #2's `docs/intake/2026-10-28-asset-decisions.md` already calls the window-kit import "a separate engine intake candidate". The engine side is still unreleased.

**Hurts:**
- Tinderbox's exchange and the assets pillar: one catalogue house now has two appearances.
- Reproducibility: Nautilus integrates by cherry-pick, so `codex/editor-assets` will never be merged. If it is deleted, 90054d0 becomes unreachable on GitHub, and both repositories' provenance records point at nothing.

**Direction.**
- Integrate the window kit into a tagged release (or retire it) and re-pin Tinderbox to the tag.
- Pin Tinderbox prefabs to a Tinderbox mainline commit once that art lands on master.
- Protect every cross-repo pin with a tag.
- Tag `ee7c18e` (and Tinderbox's `6693bfa`) so the ids already written into saved maps stay resolvable, or move the catalogue id to mainline commits with a compatibility alias.
- Add a "pin vs donor mainline" drift report to weekly scouting.

### M3. The agent-built structures follow no shared asset standard and cannot be composed

**Claim.** The hospital, mill, market, H-plan apartments and fort are islands with incompatible blueprint shapes, and the engine offers no data-driven way to register them.

**Evidence:**
- **Not placeable (measured).** Each branch ran its own engine (`place-probe.mjs`).
  - On e375a1a: `ellis-hospital-two`, `boott-mill-four` and `quincy-market-hall` are rejected.
  - On e5abac5: `alder-court` and `mercer-courts` are rejected.
  - Every rejection reads "Unknown building asset". The registry stays at 61 and the control `albany-cottage` places.
- **No registration (measured).** `git diff --name-only 12ad8c9 <branch>` for 8631b0c, e375a1a and e5abac5 touches none of: `package.json`, `packages/prefab-core/registry.js`, `packages/assets/catalogue.js`, `packages/map-core/contract-manifest.js`, `schemas/`, `apps/editor/`. Each branch adds a self-contained `art/`, `assets/`, `packages/<collection>/`, test and tool.
- **Four blueprint shapes for one domain (measured from the JSON):**

  | Collection | Version stamp | Height field | Contract keys | Render axes |
  | --- | --- | --- | --- | --- |
  | Original 48 (`assets/buildings/models/*.blueprint.json`) | none | `stories` | `slab`, `floorSpacing` | `[x,height,z]` |
  | Measured (8631b0c) | `schema: "nautilus-measured-building-art"`, version 1 | `levels` | `slabThickness`, `floorInterval` | `[x,height,y]` |
  | H-plan (e5abac5 `*.assembly.json`) | `version: 1`, no schema | `stories` (plus `masses`, `courts`, `cores`) | — | `[x,height,y]` |
  | Measured part | none | `size`, `attachments` | — | — |

  The *values* agree (1 m units, 2 m walls, 0.16 m walls, 0.12 m slabs, 2.12 m floors). The keys and axis labels do not, and `schemas/` has no building schema.
- **Hard-coded registry (code-reading).**
  - `packages/prefab-core/registry.js:1-7` fixes two collections and a combined catalogue id built from two commit hashes.
  - `catalogueForAssets` (`registry.js:13-17`) is binary (`provider==='original'`).
  - A third collection therefore needs engine code edits, not data.
- **Duplicated pipelines (code-reading).** Each collection re-implements compiler, mesh and renderer: `building-catalog`, `measured-buildings`, `h-plan-buildings` and `fort-apache`. The fort's `geometry.js:1-2` says it was forked from 8631b0c with "no dependency on that collection". None imports `roof-core`, `wall-runs` or the window kit. The measured and H-plan tests never import `map-core` or `prefab-core`.
- **The composable version exists but is not integrated (code-reading).** `07fa324` ("Build 48 editable buildings with native game-editor brushes", 222 files) turns all 48 designs into plain `aft-map-v2` maps and `aft-block-v1` blocks. It is on `codex/nautilus-art` only.

**Hurts:** the assets pillar and the standardized editor, the core of the owner's description.

**Direction.**
- Define one building-asset manifest schema: id, collection, version, units, origin, bounds, levels, openings, materials and required capability.
- Add a provider-registration API that the registry, shared catalogue and editor read as data.
- Make the three art branches conform before intake.
- Choose deliberately, per use, between opaque prefab references and native-brush construction (07fa324).

### M4. The "standardized editor" cannot create a standardized asset

**Claim.** Users can place catalogue buildings but cannot author one. The only user-authored reusable unit is AFT's 24 × 24 block, and blocks cannot contain buildings.

**Evidence (code-reading).**
- Collections exist only as code modules (`registry.js:1-8`, `catalogue.js`, `original-catalogue.js`), regenerated by `tools/prefab-catalog.mjs` and `tools/prefab-original-catalog.mjs`.
- In a block, `packages/map-core/prefab-document.js:16` throws "Building prefabs belong to full maps".
- `docs/building-prefabs.md:52`: "Legacy 24 × 24 blocks cannot represent these references".
- `apps/editor/` has no "save as asset" command, no manifest writer and no provider registration.

**Label:** code-reading and judgment.

**Hurts:** the editor pillar: "allows the creation of standardized assets that work together".

**Direction.** Let the editor save a captured region (geometry, roofs, walls, openings) as a versioned asset in the M3 manifest format. 07fa324 is a ready starting point.

## SHOULD-FIX

| # | Finding | Evidence | Direction |
| --- | --- | --- | --- |
| S1 | **The AFT vocabulary drifted under the same schema id and version.** Nautilus rejects current AFT maps with a misleading message. | **Measured:** AFT main accepts a `bull` guard; Nautilus `openDocument` and `loadBlueprint` reject a one-guard map with "Use at most 46 guards (50 characters including the squad)". **Code-reading:** AFT 25d0e918 `dist/tactics/core/maps.js:64` adds `bear, bull, rabbit, dog`; both are "aft-map v2". AFT main is 16 commits past the pin, and at least 22 of 528 vendored AFT files have changed upstream. Negotiation covers only the four Nautilus features (`contract-manifest.js:9-18`), so no consumer can declare a vocabulary subset. | Version the content vocabulary as its own capability, report unknown species precisely, and re-pin AFT. |
| S2 | **Three guards have no test that can fail** (mutation survivors; [re-verified](#independent-verification-of-the-reviewers-findings)). | **M05:** `adapters/tinderbox/index.js:157` `< radius - 1e-10` → `< -1` passes 203/203, and a spawn 0.52 m from a wall then goes from `PLAYER_CLEARANCE` to accepted. The suite's case (`tests/tinderbox-adapter.test.mjs:191-192`) puts the start *on* the wall, so `INVALID_MAP` fires first and only the error class is asserted. **M14:** `persistence.js:51` `return raw` → re-export passes 203/203, though two opens of one map then mint different character IDs; the persistence fixtures have zero units. **M18:** `prefab-core/index.js:39` limit ×100 passes 203/203, and a 33-building import is then accepted. | Add the three falsifiers and assert codes, not classes. When an assertion changes, re-run the mutant it was written to kill. |
| S3 | **The editor's capability handoff is guarded only by the CI browser job, and there it fails by timeout.** | **Measured:** with `apps/editor/editor.js:26-27` removed, `npm test`, `check` and `build` pass. `review:integration` exits 1 only through a 30 s `waitForFunction` timeout. The real assertion (`tools/review-engine-integration.mjs:98`) is never reached. | Test `sendToGame` headlessly with a stub adapter and assert host call counts. |
| S4 | **The unknown-field policy differs between extensions.** | **Measured:** a prefab instance with `scale: 2, mirror: true`, an unknown envelope key, and a wall segment with `height: 9, door:{…}` are all accepted and exported, and the renderer ignores them. A roof with `scale: 2` is rejected (`roof-core/index.js:80`). | Apply the roofs' closed-schema rule (an explicit `metadata` slot, everything else rejected) to every functional extension. |
| S5 | **One map uses three coordinate frames.** | **Code-reading:** wall runs use tile centres `[-0.5, size-0.5]` (`wall-runs.js:21`). Roofs use tile edges `[0, size]` (`roof-core/index.js:93-95`). Prefab lots use integer cells with a −0.5 m transform (`prefab-core/index.js:13-22`). The Tinderbox adapter adds +0.5 m (`adapters/tinderbox/index.js:139,145,161`). Collections label axes `[x,height,z]` or `[x,height,y]`. | One documented frame for all portable data; convert only at the renderer. |
| S6 | **The "405-entry shared asset catalogue" is mostly names.** | **Measured:** 341 entries are `content-binding-required` (id, name, category, dimensions, source, note; no model, material or URL). 3 are inspection-only and 61 are renderable buildings. `docs/intake/2026-10-28-reusability-roofs.md:17` presents all 405 as borrowable. | Say "61 renderable buildings + 344 AFT content ids", or add bindings. |
| S7 | **The editor can export a file the persistence API refuses.** | **Measured:** a 3,803,944-byte map loads. Its pretty-printed export (`editing-document.js:146`) is 4,211,490 bytes, and `loadBlueprint`/`createSave` reject it at the 4,000,000-byte limit. There are four different limits: 4,194,304 chars, 4,000,000 chars, 4,000,000 bytes and 5,000,000. | Measure on compact canonical JSON with one shared constant. |
| S8 | **The extraction froze an upstream bug.** | **Measured:** `duplicateCharacter` to layer 3 of a 6-layer map fails "Keep the duplicate inside the current map or block." (`editing-document.js:142` tests `z>2`). AFT fixed this in `a20b343a` (2026-10-23): `editor-3d-controller.js:139` uses `>=MAP_LEVELS`. | Diff the extracted controller against upstream in weekly intake; port the fix. |
| S9 | **Cost at the authoring limits.** | **Measured** (draw calls and CPU, not GPU frame time): 32 buildings issue 2,342 draw calls per frame (an empty map issues 573). A wall-run drag preview takes a median 26–30 ms. The 19 ms validation chain includes 12.9 ms of inherited AFT validation and 5 ms of `siteIndex` rebuilt per call. Every wrapper re-parses the full JSON (`roof-maps.js:7`, `prefab-maps.js:7`, `maps.js:38`). | Instance or merge per template, cache the site index by revision, parse once. |
| S10 | **The same features exist two to four times across the repositories.** | **Code-reading:** building instances (Nautilus `buildingPrefabs`, Tinderbox `compileBuildings`, both capped at 32). Sloped roofs (`roof-core`, Tinderbox `gross-housing.js` and `hopkins-housing.js`, `fort-apache/roofs.js`, measured roofs). The editor (Nautilus's AFT extraction, Farmyard's vendored designer at a20b343a, AFT's own). | Weekly scouting flags parallel implementations, and `design-evaluation.md` picks one per feature. |
| S11 | **Animation and game UI have no code.** | **Code-reading:** no clip, rig, mixer or skeleton contract in `packages/` or `apps/`. The only motion is door pivots and the halo phase. `docs/weekly-scouting.md:12,36` lists "animated movements" as an asset category, and AFT main has new animal animations. `package.json` exports no UI; Farmyard's switch skins dress only the editor (`editor.css:10,12`). | Either declare both out of scope for 0.x in the README, or start with contracts (a clip/rig manifest, a UI component kit). |

## NIT

- **N1.** `docs/reviews/evidence/reusability-roofs/acceptance.json` records `final.drawCalls: 1`. That is the last of two passes; an empty map issues 573 draw calls per frame. The field cannot represent scene cost.
- **N2.** Version labels are ambiguous: 90054d0 says 0.3.0 but carries 0.4-era prefab work plus the window kit. Only `v0.5.0` is tagged.
- **N3.** `tools/serve.mjs:7` deletes a pre-existing STOP file, while `serve-building-library.mjs` refuses to start when one exists. `serve.mjs` also serves dotfiles (`dist/.openai/hosting.json`) and answers any HTTP method. It binds to loopback only, so the risk is low.
- **N4.** The acceptance record's `assetCloseReopen: 2` is a literal (`review-engine-integration.mjs:113`). Its loop proves the preview reloads, not that resources are released. The reviewer's own leak measurement found none.
- **N5.** `createMapDocument()` mints random character UUIDs, so two new documents never export identically.

## Pillars at 12ad8c9

| Pillar | Status | In code | Missing |
| --- | --- | --- | --- |
| Game UI | Partial (editor only) | Editor header, drawer, About modal, library dialogs; Farmyard skins as editor chrome | Any game-facing UI kit: no export, no HUD, menu or dialog components |
| Wiring | Partial, no consumer | `connectGame`/`sendToGame`, manifests and negotiation, stamped saves, Tinderbox flat-yard adapter, headless rules | An adapter any game uses; a vocabulary capability (S1); requirements inside exported files (M1). Farmyard and AFT adapters exist only in `docs/architecture.md:79-85`. |
| Animation | Missing | Door pivots and halo phase only | Clip, rig and retarget contracts; animation assets |
| Assets | Partial | 61 placeable buildings with headless compilers and Three providers; sloped roofs; wall runs; a 405-id catalogue | A shared asset schema (M3); bindings for 341 of 405 ids (S6). Window kit, measured, H-plan, fort and editable buildings are unintegrated. |
| Standardized editor | Partial | AFT editor fork plus wall, prefab and roof layers; maps and 24 × 24 blocks; seeded lots; undo/redo; IndexedDB; JSON | Authoring a reusable asset (M4); data-driven collection registration (M3) |

## The exchange

| Direction | Mechanism | Pin | State | Problems |
| --- | --- | --- | --- | --- |
| AFT → Nautilus | Byte snapshot in `vendor/aft`, plus `aft-assets` | 781246a (on AFT main) | Reproducible; 528/528 blobs match | 16 commits stale; at least 22 vendored files changed upstream; new species rejected (S1); missing upstream fix (S8) |
| Nautilus → AFT | None: no file in any of AFT's 76 refs mentions Nautilus | — | Not consumed | Nautilus exports load with their extensions inert (M1) |
| Farmyard → Nautilus | Byte snapshots: UI skins and the search-halo reference | b2f2b6b, 7db49df (on Farmyard main) | Reproducible; 6/6 and 3/3 match | The halo now exists twice; Farmyard has not adopted the engine copy |
| Nautilus → Farmyard | None: only `search-halo-porting.md` mentions Nautilus | — | Not consumed | Farmyard ships its own AFT designer (S10); its importer drops Nautilus geometry (M1) |
| Tinderbox → Nautilus | Gross-house snapshot; test-only conformance closure | 6693bfa (`codex/art-assets` only); 8a84056 (master) | Reproducible; 66/66 and 11/11 match | Prefab pin on an unmerged branch and drifted (M2). The adapter scene simulates identically on 0891c55. |
| Nautilus → Tinderbox | Tinderbox vendors 8 files (window kit, `wall-runs.js`, 2 AFT helpers, notices) | 90054d0 (`codex/editor-assets`, in no release) | Byte-identical; used on Tinderbox worker branches, not master | Source absent from every Nautilus release; cycle (M2); the Tinderbox adapter is not used by Tinderbox |

**Lossless?** Only the Tinderbox adapter round trip. It stores the complete map as a sidecar and refuses unsupported content with codes. Every other path is lossy (M1).

**What each game would get today:**
- **From main** (code identical to 12ad8c9):
  - Tinderbox: engine 0.5.0 without the window kit, so its Hopkins window art would break if it moved off 90054d0. It would also get no Hopkins, measured, H-plan, fort or editable buildings.
  - AFT: an editor that rejects its current animals.
  - Farmyard: a map format whose extensions its importer drops.
- **From current pins:** Tinderbox has 90054d0 (0.3.0-era code plus the window kit). AFT and Farmyard have nothing.

**Unintegrated branch work.** `git cherry` against the integration line, with superseded cherry-pick variants set aside:

| Branch | Superseded variants | Real unintegrated work |
| --- | --- | --- |
| engine-coder | all 5 | none |
| nautilus-art | ee7c18e | 4164ef8 (sculpt-first art workflow), **07fa324** (48 editable native-brush buildings), 9f65eb6 (fixed preview port) |
| editor-assets | 4 of 6 | 17479ad and **90054d0** (window kit, which Tinderbox depends on) |
| editor-roofs, nautilus-ui, diagonal-walls | all | none |
| measured, fort, H-plan | — | 8631b0c, e375a1a, e5abac5 |

## What holds up (verified by the reviewer)

- **Byte provenance is exact.** All 617 vendored and fixture files match their donors' Git blobs at the pins: AFT 528, aft-assets 3, Farmyard 6, halo 3, Tinderbox prefabs 66, conformance 11. `npm run check` catches a single appended byte.
- **Reproducibility is real.** The four gates pass. The installed-package proofs reproduce the documented tarball sizes and integrity. The browser acceptance reproduces all six committed screenshot SHA-256 values.
- **Most guards are guarded.** 14 of 18 mutants were killed by their own assertions. Among them: the adapter key whitelist, crop and scenario checks; catalogue identity; roof/lot and wall/lot reservation; lot overlap; flat ground; roof capability; version-range negotiation; the headless renderer import; recipe change; vendor bytes.
- **No leaks.** 20 building-library open/close cycles kept 3 canvases and the renderer memory unchanged. An 8-building map with roofs and walls raised GPU objects from 85 geometries / 28 textures to 537 / 35, and reopening a blank map returned exactly to 85 / 28.
- **Editing is transactional.** Rejected edits leave history intact. Export → open → export is byte-stable after the first open.
- **The Tinderbox adapter does what it says.** It rejects unsupported content with codes, and its scene simulates identically on the pinned closure and on Tinderbox 0891c55 (player at `[14.86, 4.156]` after 120 ticks on both).
- **The headless boundary holds.** Map and rules entries load in Node without a DOM or renderer, and a renderer import is caught.
- **The scoping is honest.** The docs repeatedly disclaim performance, adoption and gameplay semantics. The overclaims found are specific (S6, and the "bidirectional" and "flat-map subset" sentences), not systemic.

## Objections considered and rejected (do not re-raise)

- **Two divergent `hybrid-geometry.js` copies** (the AFT pin and Farmyard-via-Tinderbox). They differ only in line endings and derive the same native scale (`scale-compare.mjs`).
- **Units differ between collections.** They do not: every collection uses 1 m units, 2 m walls, 0.16 m walls, 0.12 m slabs and 2.12 m floors. Only key names and axis labels differ (M3, S5).
- **The playtest opener/origin/token handshake.** The built editor replaces AFT's `editor-playtest.js` with an in-page call (`tools/build.mjs:40`). There is no postMessage or cross-origin surface in the build. The original AFT bridge checks source, origin, type and a random token, and is same-origin only.
- **Preview-server path traversal.** Both servers resolve against `dist`, enforce the root prefix and bind 127.0.0.1.
- **Prototype pollution through `Object.assign` in `blocks.js:71`.** A JSON `__proto__` key is an own data property, so `[[Set]]` writes the property and does not change the prototype. Not exploitable.
- **The engine-coder, nautilus-ui, editor-roofs and diagonal-walls patches as lost work.** They are superseded cherry-pick variants.
- **The Tinderbox conformance closure is stale.** It is pinned at 8a84056 but forward-compatible with 0891c55 (measured).
- **The roof/lot overlap mixes frames.** It does not: both map cell i to `[i, i+1]` (`roof-data.js:9-12`, `prefab-core/index.js:23-26`).

## Not verified

- GitHub CI results: PR #2 claims a green post-merge run, but no network calls were made.
- The structure branches' own suites (8631b0c, e375a1a, e5abac5): code and tests were read but not run.
- Real GPU frame time and mobile hardware. The preview pane was hidden, so the figures are draw calls and CPU submit time.
- The window kit's geometry and Tinderbox's use of it, beyond byte identity.
- Whether Farmyard's vendored designer or AFT's own editor keeps or drops the inert fields when it re-saves a Nautilus map. Only the `parseMap` and `adaptAftSector` entry points were tested.
- `review:buildings`, `pack:renderer` and `build:buildings` were not run.
- Licensing of vendored content beyond NOTICE.md.

## Proposed fix order (awaiting the owner's decision)

1. **Falsifiers first (S2, S3).** Add three tests that kill the surviving mutants, plus a headless `sendToGame` test. This is engine-only, changes no format, and makes the later rungs safer.
2. **Fail loudly across the exchange (M1).** Export the stamped envelope (or a new format id) whenever a map needs Nautilus features; inherited content keeps its bytes. Each game's own guard against unknown keys belongs to that game's owner.
3. **Pin hygiene (M2).** Release or retire the window kit, and tag every cross-repo pin. Re-pin Tinderbox prefabs once that art reaches Tinderbox master. Weekly scouting should report pin drift.
4. **The asset standard (M3, M4).** Write a proposal before code: one building-asset manifest, data-driven registration, and "save as asset" in the editor, choosing between native-brush construction (07fa324) and opaque references for each use. Then make the three art collections conform before intake.
5. **The rest (S1, S4 to S11).** Vocabulary versioning and an AFT re-pin; closed schemas; one coordinate frame; one size limit; porting AFT's upper-layer fix; scope wording for the catalogue, animation and UI; performance; one implementation per feature.

Round 2 re-reviews whatever lands.
