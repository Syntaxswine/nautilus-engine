# Architect pilot: contour halos and diagonal walls

Reviewed 2026-10-28. The user requested a pilot of the weekly scout → architect → existing helpers workflow using Farmyard interaction halos and Tinderbox diagonal walls. The scout report is preserved at [the original brief](2026-10-28-halos-and-diagonal-walls.md), with exact Git objects/file hashes in its evidence record. This record owns adoption decisions and combined acceptance.

## Decisions and assignments

| Candidate | Decision and adopted boundary |
| --- | --- |
| `FC-7db49df-search-halo` | Accepted as an optional engine-owned rendering effect from Farmyard `7db49df29a9ff412d06d205f4bc48f75297bce51`. Keep game eligibility/discovery outside it and preserve the approved standard/wide shader treatment. Consumer adoption is explicit. |
| `NE-cc52f89-wall-runs` | Accepted as an optional shared authoring foundation from existing Nautilus contribution `cc52f89de6333a1d94e2dfe45d47d1317369fac0`, with the reviewed code/UI repairs. Retain square walls and require the wall-run capability for maps containing oriented geometry. |
| Tinderbox uncommitted housing/art research | Deferred. The observed files were not in its reviewed Git commit and are not an import source. No catalogue, skin, model or consumer pin is advanced by this pilot. |

The architect did not commission another halo port or diagonal-wall implementation. The existing contributions were reviewed and combined. Bounded read-only effect review and importer assistance preceded the pilot; after the scout handoff, the existing project helpers received these assignments:

| Owner | Owned review/repair | Reviewed contribution |
| --- | --- | --- |
| Coder, Nautilus Engine | Headless wall API, schema/capabilities, metadata, transactions, traversal, transforms and generation | `accf86132466ffaa36cd2bfeac7057837c6bf786`; [audit](../reviews/2026-10-28-wall-runs-code-audit.md) |
| UI, Nautilus Engine | Existing controls, pointer/exact edits, saves/JSON, mobile, real host handoff, material lookup and resource retirement | `689f0b42984d0ede9a6fc565b508b4c9617fb104`; [audit](../reviews/2026-10-28-wall-runs-ui-audit.md) |
| Artist, Nautilus Engine | Small fixed-source panel/material/cut/joint audit; no new art import | `6982df6e1a7a64ba7ca45e66c6dc77d2ff1a3ebb`; [audit](../reviews/2026-10-28-wall-runs-art-audit.md) |
| Architect, Nautilus Engine | Source acceptance, shared package/build/provenance, review reconciliation and combined geometry/halo fixture | Version 0.3 integration candidate; [effect contract](../render-effects.md) and [wall contract](../wall-runs.md) |

Worker/donor checkouts remained read-only to the architect. Only reviewed commits were imported. The shared build retains the effect package/examples/provenance and the guarded wall editor adaptations together; original vendor bytes remain unchanged. The GitHub integration branch is the delivery candidate. Main promotion, private Site publication and game adoption remain distinct delivery decisions under the existing workflow.

## Combined acceptance

The engine-owned fixture at `/examples/search-halo.html` places its art/posed skin at world origin `[10,0,20]`, with camera `[10,6,31]`. The occluder is an actual native-panel 45° run from `[6,24]` to `[14,16]`, with its final fractional cut. Its geometry and the small fixture visibility adapter both derive from the shared wall API. Ordinary instanced panels write scene depth; they are occluders, never halo targets.

`tests/halo-walls.test.mjs` compares the actual oriented panel triangle hits with `wallRunsIntersect`: the prop center ray hits, its upper sample misses, and the nearby body is unobstructed. A taller three-story wall blocks both prop samples. Queries preserve the fixture data. This two-sample adapter is deliberately a test policy; it does not claim to implement any game's visibility/perception system.

Live browser review confirmed the partly visible prop stayed eligible while depth suppressed the covered contour. Reduced motion used phase zero, removal retired both proxies, and restoration reused seven geometries/eight textures without browser warnings/errors. The [combined still](../reviews/evidence/diagonal-halo.png), [browser state](../reviews/evidence/diagonal-halo-browser.json) and [pixel comparison](../reviews/evidence/diagonal-halo-pixels.json) preserve the result. The opaque wall patch beneath the hidden prop had maximum channel delta 4 and mean 0.77185 when toggling the effect, consistent with the documented LDR intermediate precision; visible rim pixels reached delta 177. This supports occlusion in this fixture, not a universal renderer or performance claim.

The source effect uses one Three r180 instance and retains the shader bodies; immutable source/dependency hashes are verified. Opaque, standard-depth, NoToneMapping, full-frame WebGL2 is the supported initial pipeline. Unsupported transparent output, automatic LOD selection, alternate depth/tone pipelines, batching as targets and custom silhouettes reject explicitly.

Final combined validation: `npm run check -- --tracked` verified the original 534 pinned files, three halo reference files, shared rendering closure and headless APIs; `npm test` passed all **72** Nautilus tests, and `npm run test:upstream` passed all **32** inherited regressions (**104 total**, no failures/skips). `npm run build` produces the reconciled 0.3 workshop, recorded effect/example source hashes and nine guarded vendor adaptations. The integration PR/GitHub check run records the final build and CI result.

Both architect previews exited through their verified task-owned stop markers; their ports were released and temporary browser tabs closed. Restart material, exact process identity and cleanup receipts remain in local task records. Helper owners report their own completed cleanup in the three audits.

## Explicit deferred work

Native panel assembly is preferred for arbitrary measured walls; finished continuous facades still need a reviewed miter/junction treatment and a texture-phase policy for fractional splits. The existing butt-joint notch is bounded editor geometry, not a claim of finished catalogue art or an open through-wall crack. Detailed evidence and recommendations are in the art audit.

`wallRunsIntersect` with nonzero radius is conservative padded-slab clearance, and representative step rays are not a full-body movement solver. Tinderbox requires a deliberate oriented adapter preserving rounded actor clearance before movement, sliding, LOS, projectiles or fire can advertise adoption. Generated angled seam continuations remain unsupported and reject the full wall footprint; the original square generation path is retained.

Dense-map CPU/GPU benchmarks and baseline-versus-12-target halo measurements are deferred to consumer enablement. Render pass counts, triangle counts and test durations are not practical frame-time measurements. The optional packages are accepted without performance claims or automatic activation in a game. The user-approved visual preference and native geometry contract provide the narrative/accuracy basis; cheaper square walls or simple markers remain useful consumer choices.
