# Architect decisions: furniture and building intake

Recorded 28 October 2026, America/New_York. This adopts the scout report from full commit `f67439c9f848042d1647ea428e494bca2749dc32`; the [report](2026-10-28-furniture-and-building-assets.md) and its source inventory remain unchanged. Accepted work below is an implementation assignment, not a claim that the asset is released or adopted by a game.

## Canonical baseline

GitHub PR #1 was merged as `581258aa506798dca3909bfd41ec39d3ee23b550`. Its complete tree `eb51023ff08d41261af8bb573e366140ee43d01e` equals the reviewed `v0.5.0` source commit `12ad8c9b1c96637cd05c8e344692063bfde385f3`. Both post-merge CI jobs passed in [run 40810028875](https://github.com/Syntaxswine/nautilus-engine/actions/runs/40810028875), including the four project gates, installed core proof and real-browser workflow. The clean primary local main checkout was fast-forwarded to the same merge. No existing release tag was moved.

Tinderbox currently preserves eight files from the exact Nautilus window-kit commit `90054d07134116a5d9661f8318a76fe68f922aad`, including five runtime modules. That is a bounded immutable asset import, not a moving branch dependency or adoption of the complete 0.5 engine. Its source remains a separate engine intake candidate. No consumer pin is changed by this report.

## Decisions

| Candidate | Decision | Boundary and next evidence |
| --- | --- | --- |
| `FC-fb6e20a-library-furniture` | Accepted for the next bounded implementation | Optional shared visual provider plus editor inspection. Eight forms, six finishes and two contents states produce 96 variants. Placement, save-schema changes, navigation/fire/inventory and halo support are outside this tranche. |
| `TB-b61fa09-hopkins-houses` | Accepted for investigation; runtime import deferred | Review the centered window-kit prerequisite first, then select a small lazy-loaded provider slice. Do not import another Nautilus copy, replace the existing Gross snapshot or redirect saved catalogue identities. |
| `TB-b689f55-new-york-building` | Deferred | Preserve both study and grid editions. The grid edition reaches L15 / 31.80 m beyond six editable layers. No map-height extension is selected. A separately named visual-landmark profile needs its own compatibility decision and performance evidence. |
| `TB-f25fd7b-row-torch` | Deferred | Review after the first furniture/provider tranche. Party-wall descriptors and optional flame presentation can be shared; ignition, inventory and timing rules stay in Tinderbox. |
| `FC-60aeeed-mill-props` | Deferred | Extract generic scales, loads and desk forms after furniture. Mission ownership, AP/save rules and scenario bindings stay in Farmyard. |

Existing H-plan apartment source `e5abac574ccf7c9d2cf3839b20f32dc6e09c525e` and measured-building source `8631b0cfc6005f3004956afa50ec0e46e5f69278` remain separate queued architect intakes. Their presence on artist branches does not include them in 0.5.0. The active frontier stockade assignment continues; no new art redesign is requested for this intake.

The proposed Hopkins pilot at `b61fa093e3491fb2f109f1f4b0ca5591d2637cc9` is `hopkins-4-21` (faceted bay), `hopkins-4-26` (high-attic cottage) and `hopkins-4-34` (pier foundation/open undercroft): five published levels, 34 rooms and 23 centered window bays. Keep its curated catalogue distinct from Gross/original, preserve their saved identities/default pools, and use the reviewed local window API. Do not copy Tinderbox's nested Nautilus snapshot or replace the frozen Gross assembler with the newer one. Exterior authoring is the proposed first profile; furnished cutaways remain optional and unmeasured.

## Furniture contract and ownership

The selected source is Farmyard `fb6e20aa6e7d0cfe8793b4b7f693552d69a3a18b`, preserving source `library-furniture/3`. Use engine-owned namespaced IDs `furniture:library.<form>.<finish>.<contents>` with copied headless specifications. The proposed API is `listFurnitureAssets`, `furnitureAsset` and optional host-supplied-Three `loadFurnitureAssets`; workers must confirm the committed signatures before the editor imports them.

Separate tile reservation, physical body bounds and actual visual bounds. Full-tile cabinets measure 0.995 m visually versus 0.98 m for the declared body; ordinary double cabinets measure 0.895 m visually versus 0.88 m for the body. Labels/trim explain those projections. Stocked tables measure 1.16 m high versus the conservative declared 1.18 m. Fit real geometry without scaling it. Preserve full-tile +X construction orientation and the source quarter-turn placement offsets. Fresh bounds and `solidParts` matrices must reflect current transforms.

Caller atlases/renderer stay caller-owned. Libraries own shared geometry, materials and cropped texture clones; instances own their instance buffers. Define close/dispose behavior for each owner, reject creation after disposal and clean up partial/late texture loads. Existing halo support excludes instanced roots; expose that limit explicitly. Visible books are not authoritative inventory or fire state.

The three new runtime source files total 152,672 bytes: `catalog.js`, `furniture.js` and `book-spines.svg`. The dependency closure also includes `painted-environment-scene.js` for `softBox`, Three module/core/license and two inherited material PNGs. The PNGs already match the engine's pinned AFT bytes. The helper/Three/notice sources match after newline normalization only; preserve original source hashes separately and use one live host Three namespace. `catalog.json` and `painted-furniture.js` are reference metadata/design evidence, not factory imports. Optional renderer package resources must explicitly include the paint closure.

## Assignments

| Owner | Assigned scope |
| --- | --- |
| Coder, Nautilus Engine | New source importer/snapshot, minimal dependency and notice inventory, `packages/furniture-core`, headless data and optional host-Three adapter, package resource closure and meaningful geometry/lifetime tests. No editor files. |
| Editor, Nautilus Engine | Furniture category and namespaced discovery, filters, actual native-scale lazy preview, inspection-only state, rapid selection/retry/disposal behavior and browser evidence. Import only a fixed Coder checkpoint; no duplicate vendor/API implementation. |
| UI, Nautilus Engine | Read-only design/acceptance audit: compact accessible filters, body/reservation labels, phone layout, WebGL-unavailable metadata, retry and close/reopen behavior. Editor retains implementation ownership. |
| Architect, Nautilus Engine | Independent source/visual review, reconcile public discovery/package ownership, combine fixed worker commits, run all project and affected browser/installed-resource checks, select version and promote through main. |
| Artist, Nautilus Engine | Continue the approved frontier fort kit; no duplicate furniture or house redesign assignment. |

Workers start separate branches from the reviewed main baseline and preserve earlier branches. No live worker checkout, donor refs, consumer pins or Site audience is changed. This document's status is assignment/triage; no runtime source from these candidates is imported here.

## Evaluation and acceptance

**Accuracy:** prefer body reservations and exact solid parts over opaque tile blockers. Under-table spaces and double-sided shelves need tests in all quarter turns. Painted book-row gaps are visual marks, not physical holes. Preserve source dimensions and native material repeats.

**Efficiency:** prefer painted shelf rows and plain cabinets for normal tactical scenes. Independently evaluated stocked geometry counts are tall 252, wide 312, low 216, double 528, full-tile 600, ornate 1,560, small table 2,568 and large table 4,572 triangles. Batches range from eight to twelve per root. These are source geometry measurements, not frame-time or city-scale claims. Actual WebGL and representative-instance costs remain acceptance work.

**Narrative:** prefer plain cases as common economical furnishings, with ornate forms where a room's status calls for them. Empty/stocked presentation is useful across the games without forcing one inventory, discovery or fuel policy. This is a design judgment, not a measured gameplay outcome.

Delivery requires the four project gates, headless/static closure, exact source hashes/notices, installed optional resource resolution, actual rendered dimensions/aperture rays, all quarter turns, independent library/instance ownership, partial texture failures and disposal/reopen checks. Browser review covers both full-tile cases, both table sizes, double-sided and empty/stocked appearances, desktop/phone filters, failed-load retry, rapid selection changes and WebGL-disabled search/metadata. Only the combined passing implementation becomes a released feature; follow [release promotion](../releasing.md).
