# Artist tile-stack Gate A handoff

The four reusable painterly families and native-height studies are implemented
under `candidates/tile-stack/art/`. Branch `codex/tile-stack-finishes` starts at
fixed brief `5d69c2130eb64b6f4e31bc672e884bdc33bf47d2`; runtime remains reviewed
`2502646482218524fd5129641da769bb82462e4d`. No protected host/provider files,
source fences, old workshop/saves, 294 studies, public exports, consumer pins,
package versions or private Sites audience changed.

## Fixed API for Architect, Editor and UI

- `tileFinishCatalogue()` exposes four immutable cards: `skin.brick-pavers`,
  `skin.stone-flags`, `skin.timber-boards`, `skin.poured-concrete`, each version 1.
- `tileFinishBinding()` is `{id:"nautilus-tile-finish-catalogue",version:1,
  digest:"4da6c7e85b9819aa6c6d847b0447d5baa80db77a824a04e24579209ccc0c381b"}`.
  One active version per stable ID; duplicate IDs across versions refuse.
  Bind that complete immutable mapping for the workspace.
- `tileFinishChoice()` accepts exactly `{skinId,version,variantSeed}`. Canonical
  source retains only existing `interior.skinId` and uint32 `variantSeed`;
  catalogue version/digest belongs in Editor's checkpoint binding.
- `createTileFinishPool({THREE,atlas,maxMaterials?})` and
  `bindTileFinishView({view,projection,choices,pool,current?})` implement leased
  whole-owner appearance after actual public-provider acquisition. The pool
  owns only newly created MeshStandardMaterials; geometry/maps/base pools/Three
  are borrowed. Default ceiling 64 materials, no new textures, max 32 owners.
- `createArtStudyView` and `setStudyVisibility` are private presentation fixtures,
  not authoring authority. See the candidate README for the executable usage
  card, base/atlas restrictions, disposal order and complete checklist.

This matches the catalogue policy in Editor's fixed proposal
`cfd5a3226a687b9b166e240666a34c75ef3e7972`. UI emits `draft.finishId` and shows
the stable family version. Editor resolves it through the bound mapping. The
geometry context must first be accepted by the actual provider; catalogue
labels alone do not make a menu row available. Existing three legacy finishes
remain host-owned compatibility choices.

The early metadata-only API is immutable commit
`84bcb886a25826ba710b9c285316bee5582fa7ef`. Its metadata source manifest is a
historical record of that checkpoint. This complete candidate adds the digest
and explicit refusal policy; use this handoff's fixed commit when integrating.

## Evidence and limits

Seventeen focused source and actual-installed Node tests cover strict metadata,
360 accepted finish/shape/D4/detail applications, the 24 refused combinations,
exact canonical buffers/source/UV/material intervals, locked joined-neighbour
isolation, cancelled/limited acquisition, shared leases, reentry and throwing
native Three material/geometry observers. Borrowed pools/neighbours survive.

The valid-source D4 failure is retained in `line-d4-refusal.json`: exact source
bundle/recipe/placement, successful actual-public-core open, direct public
failure, unchanged before/after source hashes, full dependency hashes, and the
derived cap angle's explicit `-0` token and IEEE754 `8000000000000000`. A second
diagnostic call-through observes arguments without replacing any result. The
production binding never normalises controls, retries or weakens validation.
Only the two recorded line poses are unavailable for that reason. Architect
must authorize/review any focused provider correction separately.

Each browser mode passes 19 checks and 15 captures, including four finish
previews, sixteen actual public shape surfaces, selected-floor inspection,
honest overview/cutaway, keyboard/wheel/form guards and 390/320 CSS px layouts.
Source and installed semantic hashes agree. Installed code comes from physical
offline public core/renderer/compatibility packages. The appearance candidate
and accepted view-budget helper are explicitly private copied inputs, with
their dependency hashes. No source fallback or fake public registration is
allowed by the installed request policy. The exact reviewed atlas response is
hash-checked in the browser. No new raster generation or bitmap copies occur.

The compatibility fixture uses fifteen aligned 8×4 m planes at explicit heights
0 through 29.68 m. Its separate nonuniform artist fixture uses explicit heights
0 through 35.1 m (F03 is 7 m); its profile is not Editor's different nonuniform
proposal. Labels/ordinals never supply heights. The public repair makes all
fifteen owners in one fixture operation, with fourteen lower locks and 105
persisted `cross` relations requiring 2 m. Measured headless work for this
fixture is 16 steps, 435 spatial tests, 1,950 geometry evaluations. Native
detail-zero presentation has 450 triangles, 480 derived cells and 152,910
cell-work units. Two complete views have 900 triangles/960 cells. Visibility
does not subtract allocations. The unchanged private host coordinator enforces
two roots/50,000 triangles/1,024 cells, including acquisition/retirement.

The .12 m interval is reservation metadata. All geometry stays at its canonical
base height. Double-sided paint adds no slab, underside, wall, support, query,
navigation, fire or playable-game capability. Follow/contact controls explain
the missing actual subject/service. Artist's finish menu is explicitly an
appearance preview; it does not change saved source or supply a journal/CAS,
undo/redo/save migration or the Gate B real authoring workflow.

## Recommendation and integration checklist

Accuracy: prefer native explicit floor identities, canonical borders and
unchanged original curve controls. Cosmetic paint should not rewrite physical
boundary material. This is geometric correctness, not physical calibration.

Efficiency: reuse the existing atlas/public provider/view coordinator. One
borrowed texture and bounded leased materials avoid bitmap duplicates and
extra detail geometry. The counts above are fixture measurements; shader and
device/frame-time performance remain unmeasured. The atlas kernel adds a
per-fragment cost that needs a representative benchmark before speed claims.

Narrative: broad flagstones, brush-painted brick/timber/concrete and clearly
labelled native floors are the preferred shared building look for tactical map
authoring (subjective). Game-specific support/fire/occupancy stays separate.
Adoption is a Gate A candidate; preserve the old styles and saves.

1. Architect freezes this exact catalogue/API together with Editor/UI/Coder.
2. Bind ID/version/digest once; resolve friendly `finishId` into canonical source.
3. Use actual public geometry, one shared Three, reviewed loaded atlas and
   explicit opaque MeshStandard base bindings for the new profile.
4. Stage appearance under the current view ticket before attachment. Keep the
   unchanged aggregate budget owner; retire appearance before geometry.
5. Map Editor `selected-floor` to artist `selected`; pass explicit cutaway ID.
   Reuse one actual floor controller/widget and retire input before mode changes.
6. Preserve both known D4 unavailable reasons until separately reviewed repair.
7. Gate B owns real stack/finish history, uncertain-ack recovery and save/reload
   checks. Root owns host refactor/fences/registration and combined promotion.

Review helpers are bounded isolated browsers/servers, closed in finally. Exact
PID+creation-time+executable and released-port checks are retained in the helper
retirement JSON files. Disposable installed consumers are removed. Nothing
remains running for this handoff.

Final repository validation passed: `npm run check`, `npm test` (929/929),
`npm run test:upstream` (32/32), and `npm run build` (519 checked module paths).
All fifteen source/installed capture bytes also match exactly. The complete
task/dependency/evidence hashes and gate-log hashes are in `source-manifest.json`.
Three source review helper lifetimes (including the initial failed URL probe)
and one installed review lifetime are verified gone, with their ports released.
