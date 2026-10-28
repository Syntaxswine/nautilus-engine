# Farmyard golden contour halo

Candidate ID: `FC-7db49df-search-halo`. Status: accepted and implemented as an optional engine presentation package; consumer migration is deferred.

## Source and ownership

The user approved the animated contour treatment and wider body profile in Farmyard, then requested its delivery to the Nautilus architect. Reviewed source: `Syntaxswine/farmyard-commando`, full commit `7db49df29a9ff412d06d205f4bc48f75297bce51`, following renderer commit `03c9c026f17cab26b81a99af0ecf95c345d5d150`.

Preserved paths are `sites/tactical-animal/dist/search-halo.js`, `sites/tactical-animal/tests/search-halo.test.mjs` and `sites/tactical-animal/search-halo-porting.md`. The original files are reference evidence; the engine runtime is a separately maintained extraction. Farmyard's gameplay eligibility adapter stays outside the engine. Its source branch is reviewed at the full commit, never loaded as a moving branch or copied from uncommitted worker files.

The architect owns the public interface, extraction, combined tests and integration. Bounded helper assignments covered a read-only renderer/resource/compatibility review and the Git-object provenance importer. No art or game UI replacement was needed. Weekly scout workflow documentation from `e52250bc8f0e20e81910c17cadb0db8ab0316017` is incorporated separately; future scout candidates use the existing coder/artist/UI helper routing described there.

## Design selection

| Criterion | Comparison and evidence |
| --- | --- |
| Accuracy | An alpha/posed-mesh contour follows the rendered object more closely than a bounding rectangle or generic marker. This is a symbolic interaction cue, not a simulation of emitted light. Standard depth rejects foreground-hidden surfaces. Transparent depthless occluders, custom vertex deformation and alternate depth modes are outside the supported contract. |
| Efficiency | Code inspection and pass-count tests give `2 + 2 × width profiles` renders: four for standard, six for standard plus wide. The mask/light buffers are 0.75× CSS dimensions, targets/materials are reused and retired proxies release owned materials. A marker overlay is expected to be cheaper. No comparative GPU timings or device performance claims are made. |
| Narrative | The user-approved honey/amber/pale-gold light follows painted art and drifts in uneven pools. Wide 1.75 preserves body readability while standard 1 preserves the approved prop treatment. This is the preferred optional searchable-object cue for Farmyard-like painted tactical scenes. Exclamation marks for discovered scenario items and extraction flags serve distinct meanings and remain separate policies. This visual preference is subjective and user-directed. |

Recommendation: retain the two approved presets and the exact shader bodies, expose an optional rendering effect, and leave eligibility/discovery rules to each game. Do not enable it automatically in the map workshop, AFT or Tinderbox. Start with an explicit standard-depth, NoToneMapping, full-frame WebGL2 contract. A future HDR or batched adaptation needs its own visual/performance review rather than silently changing scene appearance or ownership.

## Compatibility and dependency evidence

The importer preserves original Git bytes and records SHA-256/lengths. The dependency closure maps donor Three r180 module/core and MIT notice to Nautilus's existing AFT files. They differ only by CRLF/LF, verified after comparison-only normalization; both original hashes remain recorded. Farmyard's `solo-game.js` and `world-grid.js` imports belong to excluded policy exports. No second Three instance or donor runtime is shipped. Existing UI-material, map/rules and game pins remain unchanged. Original notices and unspecified per-file rights remain subject to `NOTICE.md`; provenance adds no license grant.

## Acceptance and verification

Required checks are source hash/dependency closure integrity, headless map/rules regression suites, original upstream tests, static build and browser review of the extracted effect. Focused halo regressions cover borrowed-resource ownership; geometry/material array/alpha/sprite updates; manual world matrices and skin binding; independent widths; supplied/reduced-motion time; CSS/DPR changes with equal physical dimensions; explicit clears under disabled host flags; success/failure state restoration; and rejected unsupported pipelines/batching/custom silhouettes. A regression also compares the shader bodies to the archived reviewed source.

The isolated browser example uses a painted alpha sprite and a posed engine-owned skinned fixture, both width profiles, fixed/moving phases, an opaque foreground occluder and removal/reduced-motion controls. Visual checks and final command results are recorded in the integration delivery. Donor evidence reports an unchanged chest comparison across 54,168 channels; that is Farmyard evidence, not a claim of pixel-identical rendering across new scenes or devices.

No map formats, saved state, random streams, AP, rule profiles or consumer package pins change. Engine adoption does not migrate the donor games. The effect is available through the new package subpath and browser example; the existing workshop remains a map-authoring application.

## Integration results

The isolated engine example passed live browser checks in the Codex in-app browser on Windows, with a 1265 × 720 viewport and DPR 1. Fixed phases 0/3 changed the contour light; reduced motion returned phase 0; removed targets retired both proxies; the foreground wall hid covered contours; width changes reused the same seven renderer textures. No browser warnings/errors were reported. The prop region stayed identical across the two mesh widths (74,250 compared channels, zero changed). A fixed-viewport comparison is required: full-page capture can resize `vh` content and reset its drawing buffer during capture.

The inherited 8-bit scene intermediate produces small precision differences from a direct render: this fixture's background differed by one channel level; a floor/grid region had mean channel difference 0.98644 and maximum 8, including MSAA differences. This is recorded as a supported LDR pipeline limitation, not a pixel-perfect output claim. Clear color is explicitly refreshed in the active offscreen color space before clearing. Transparent scene coverage, automatic LOD updates and unsupported tone/depth/compositor modes reject explicitly instead of producing a misleading mask.

All 15 focused halo regressions pass, including the later opaque-output and LOD cases. The importer passed 11 disposable fixture checks for byte preservation, dry runs, immutable destinations, import drift and substantive Three mismatches. Full delivery runs source integrity/closure checks, all Nautilus tests, all 32 inherited tests and the build. The [review still](../reviews/evidence/search-halo.png), [occlusion still](../reviews/evidence/search-halo-occlusion.png) and [pixel comparison](../reviews/evidence/search-halo-pixels.json) preserve representative evidence.

The temporary preview exited gracefully through its verified stop file; port 4527 was released, with restart material and a cleanup receipt retained locally. The scout's `NE-cc52f89-wall-runs` pilot is a separate accepted review. Its combined angled-wall/halo acceptance remains part of the architect's subsequent integration, rather than a claim made by this isolated effect fixture.
