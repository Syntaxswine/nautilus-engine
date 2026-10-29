# Wall-run art audit: native panels, 45-degree runs and cut ends

**Recommendation:** retain the native-panel run design as the shared geometry foundation. Fix the brick material lookup before accepting material parity. Decide how closed facade corners will be finished before calling the resulting buildings finished art. No runtime, vendor, consumer or house-catalogue changes are included in this review.

Reviewed candidate `NE-cc52f89-wall-runs`, exact commit **`cc52f89de6333a1d94e2dfe45d47d1317369fac0`**, parent `d3c577fbf78974dc0a20660d46748a83758fd51f`. The art branch preserves its existing sculpt/paint workflow commit `4164ef8ca3dee63c2c131739a44e638403f0ffbc`.

## Method and source boundary

Read two fixed Git objects, `apps/editor/wall-scene.js` and `packages/map-core/wall-runs.js`, into a nonshipping local fixture. Their SHA-256 hashes match the scout evidence: `e097ce31fda5d5ea92bef2cacd3a9682d9004435583892da5b1bb666b732e062` and `fc148cf133b790afe9d53deb9f4eb915d2dc5e509f46e3a74706f3eb3fe1b186`. Only import paths were adapted. The fixture calls the original `wallMaterial` and `rebuildWalls` methods on a minimal scene host; it does not recreate their geometry or material logic.

All reference geometry, material pixels and Three.js imports come from Nautilus's existing AFT pin **`781246a668c723d5a4c5463e70534cc04b6a5641`**. The reference uses `hybrid-world.js` wall descriptors and the inherited `InspectionScene.material`. The wood reference applies AFT's existing wood surface to the native panel geometry; AFT has no ordinary `wall-wood` edge type. No Tinderbox research artwork or new skins were used.

Browser: headless Edge **156.0.4314.50**, WebGL 2, software ANGLE/SwiftShader, 1440 × 1040 viewport, DPR 1. Matched lighting; native inspection at 58 CSS px/metre and close inspection at 110. The cuts also have opposite -20°/160° headings to expose both broad faces; the 45°/30° native camera views a 45° panel edge-on. Joint silhouettes use a clearly diagnostic 1400 px/metre top view. These captures establish appearance and geometry, not hardware performance or full-editor acceptance.

## Findings and required decisions

**Fix: brick runs lose the brick surface.** [The fixed renderer's material lookup](https://github.com/Syntaxswine/nautilus-engine/blob/cc52f89de6333a1d94e2dfe45d47d1317369fac0/apps/editor/wall-scene.js#L13) calls `surfacePixels('wall-brick')`, while pinned `hybrid-materials.js` recognizes `brick`. The resulting RGBA array equals the neutral fallback byte-for-byte and differs from native brick. Both native and close captures show the new brick panel as grey concrete beside the brown, coursed native brick reference. Wood matches its native pixels; concrete matches the existing neutral concrete treatment. Map validated material identifiers to the native surface identifiers, for example `surfacePixels(kind)` for the currently allowed three kinds. Add a regression comparing actual brick texture pixels with the pinned brick source, then repeat the material capture. Do not replace this with new art.

**Corner finish: joined centerlines leave an outer notch.** Full and cut panels are individual closed boxes with square ends. At a shared 45° endpoint they meet and overlap on the inside, leaving a visible notch on the outer contour. This is not an entirely open joint or proof of a traversable crack. For 0.16 m thickness, the missing miter extension is approximately **0.033137 m along each run**, and the two outer cap corners are **0.061229 m apart**; these are analytic geometry values. The native-scale join is much less conspicuous than the diagnostic silhouette. The 90° diagnostic shows the corresponding square-end corner convention. Prefer a deterministic miter or a deliberately authored junction treatment for a continuous finished facade. Keep the physical centerline, thickness and collision contract consistent; an oversized cosmetic cover must not silently change them. Architect can accept the bounded editor geometry while recording this as unfinished facade treatment.

**Fractional-run phase limit, from code inspection:** each new run starts its UV phase at zero. Full one-metre repeats within one run continue into its cut panel, but splitting a wall into separate runs at a fractional metre does not preserve a continuous material phase. Review such a split after the brick lookup fix before claiming continuous masonry. This was not separately screenshot-tested.

## Geometry and surface checks

| Check | Result |
| --- | --- |
| Native panel dimensions | Both implementations use **1 × 2 × 0.16 m** |
| Floor/story spacing | **2.12 m**; two story centers at 1 and 3.12 m |
| One diagonal grid square | Length √2 m, **1 m + 0.414213562 m** cut, yaw −45° |
| Longer diagonal | 3 × 3 m run gives four 1 m panels plus **0.242640687 m** cut |
| Instance scale | Unity within **1.72e-8** floating-point error; no diagonal stretching |
| UV density | All six faces of full and cut geometry have one repeat/metre; cap U span 0.16, face V span 2, cut-face U span equals cut length |
| Winding/normals | Triangle cross products agree with outward normals; rotation preserves orientation; front/back captures remain visible |
| Collinear full/cut meeting | Descriptor endpoint discrepancy **1.57e-16 m**; no open full-to-cut seam observed in the inspected broad-face views |
| Story interval | **0.12 m** clear interval without an authored slab; crossing at height 2.06 m passes, while 1.999 and 2.121 m are blocked |

The story interval is consistent with the inherited 0.12 m slab thickness, not a reduction error. It remains visibly open when no floor/fascia was authored. Story count does not create floors, roofs, doors or windows, and this review approves no opening-anchor or consumer movement/fire integration. Internal touching cap faces and overlapping corner tops remain in the boxes; no performance or flicker guarantee follows from these static views.

## Native assembly versus purpose-built diagonal art

| Criterion | Native one-metre panels plus cut end | Purpose-built diagonal panel |
| --- | --- | --- |
| Accuracy | Verified true run length, height and thickness; works at arbitrary bearings. Corner finishing and material phase need the decisions above. | A deliberately authored √2 m asset at scale 1 would also preserve dimensions and could carry a continuous painted face. It needs exact endpoint/junction contracts. No such new asset was imported or visually validated here. |
| Efficiency | Source inspection: full panels share geometry/instances; each distinct cut width adds a geometry variant. A √2 run uses two boxes, **24 triangles**. | A simple single box of the required length could use **12 triangles** and fewer instances per repeated diagonal. A family of special angles, lengths and corners adds asset variants. These are counts/estimates, not CPU/GPU timings. |
| Narrative | Prefer this general foundation for exact plans and reusable walls across the games. Existing materials retain a common scale, but native procedural surfaces do not establish the finished painterly catalogue standard. | Prefer selectively later when continuous painting, shaped trim or a distinctive facade genuinely benefits from authored geometry. That artistic advantage remains a proposal until a pinned asset is reviewed at matched scale. |

Favor native assembly for this pilot after the material fix. Consider purpose-built pieces as an optional art layer with measured dimensions and a reviewed source pin, rather than making them a prerequisite for general angled editing. Hold the uncommitted house catalogue for its own deliberate intake.

## Evidence, reproduction and validation

Local evidence lives in **`artifacts/wall-runs-art-audit/` in the artist worktree**. These nonshipping files are intentionally outside Git; the architect should read them there. `source-evidence.json` records raw/adapted hashes; `checks.json` records nine selected captures, numeric results and zero browser/resource errors; `evidence-hashes.json` records SHA-256 values.

| Selected evidence | SHA-256 |
| --- | --- |
| [Native/close material comparison](../../artifacts/wall-runs-art-audit/materials-close.png) | `ba28fd8aa91547659cb6a9f9125ca0d85d2ce6c7460d2fee060701ae3e05cdf1` |
| [Front broad faces and cuts](../../artifacts/wall-runs-art-audit/cuts-close.png) | `7bf4e2a994add9e38f9168292130aa86f81ba59bcb8f064ceeb831399bb3c170` |
| [Reverse broad faces and cuts](../../artifacts/wall-runs-art-audit/cuts-back.png) | `1b0c865fa1ebc64173aefcede97c0040afddf863052be9422fade06c1f4b2bb3` |
| [45° diagnostic joint silhouette](../../artifacts/wall-runs-art-audit/joint45-silhouette.png) | `a52c0cbb6a04e83963192b00fce5f29e57aff6b31d7b332959dfdfa056c96a6d` |
| [Two-story gap](../../artifacts/wall-runs-art-audit/stories.png) | `f892f40c593152a5ac76314c6803d5ef209ad0c4674f7deeaa4753db581ced38` |
| [Numeric/browser checks](../../artifacts/wall-runs-art-audit/checks.json) | `677176e7fc1c869c00dd5383240c2ac7a5d920f1f7c1e0decbd7745093661a35` |

Reproduce locally with `node artifacts/wall-runs-art-audit/prepare-review.mjs`, then `node artifacts/wall-runs-art-audit/run-review.mjs`. Both scripts and the fixture are preserved with their fixed source objects. The browser runner has a two-minute automatic expiry, a STOP-file path and a `finally` cleanup; no preview is retained. Final process-exit/port verification is recorded alongside its cleanup receipt and restart instructions.

Required baseline source validation, 23 Nautilus tests, 32 upstream regressions and build passed. They validate this documentation branch's unchanged baseline, not the wall feature absent from its runtime tree. The independent fixture checks above inspect the pinned candidate. Combined halo/angled-wall acceptance, the brick fix, shared package/build conflicts and consumer capability decisions remain with the architect and assigned runtime owners.
