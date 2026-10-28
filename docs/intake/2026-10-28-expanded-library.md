# Expanded asset and building integration

This intake composes the reviewed contour/wall baseline with the editor asset browser, Gross house authoring, the original architectural catalogue and its searchable gallery. [The contribution manifest](2026-10-28-expanded-library.sources.json) records full source commits and selected raw Git-object hashes. Worker checkouts and donor working copies remain read-only to the architect. Original supplemental AFT paints and Tinderbox sources remain byte-preserved under separate vendor pins.

## Shared boundaries

- The existing headless wall map/document/block/generator modules remain underneath the prefab wrappers. The public API retains both features and validates their versions before host handoff.
- The wall scene remains underneath the prefab scene, using one pinned Three instance, existing lighting and native metre scale. No donor material or mesh is rescaled to fit a lot.
- The generated Gross registry and its saved catalogue identity remain available. New original designs use a separate immutable collection identity; adding original content is an explicit authored transition, not a redirect of an old identity.
- AFT shed/workshop/checkpoint stamps remain editable ordinary map geometry. Whole-building references preserve their provider geometry and descriptive interiors. Unsupported legacy blocks and consumer capabilities reject visibly.
- The standalone gallery keeps the 48 original designs, detailed/game views, plans, source references and downloads. Its searchable dropdown and missing-WebGL floor-plan fallback are included.

## Review corrections

Directly replacing the editor controller/scene would have bypassed the approved wall adapters. The integration instead chains the extensions and retains both sets of guarded build patches. Regression tests exposed a lost wall-version capability check; the composed boundary now restores it.

The coder was assigned another pass for demonstrated block-workspace data loss, unsupported legacy-map migration, placeholder/empty-envelope metadata loss, permissive IDs and deletion targeting/version issues. The editor was assigned a collection/provider pass so the new originals participate in actual placement and seeded layouts. The UI pass addresses narrow headers and preview resource ownership. Delivery records below distinguish completed verification from environment limitations.

## Design choice

| Criterion | Assessment and recommendation |
| --- | --- |
| Accuracy | Preserve each provider's actual geometry, floor spacing, doors/openings and source records. The original catalogue and Gross houses interpret architectural references; they are not measured construction reconstructions. The common 2 m walls and 1.65 m doors intentionally retain the inherited game scale. Conservative lots account for visible bounds and access space, and do not claim to be interior collision or navigation. Prefer editable AFT stamps for small tactical structures and preserved whole assemblies for authored houses. |
| Efficiency | Measured source evidence: the 48 original game derivatives total 763,402 triangles versus 1,358,208 detailed-source triangles (43.8% reduction), with 69.89 MiB of raw geometry buffers. Prefer the game derivative for settlement authoring. Shared provider templates/materials and bounded deterministic lot searches are code-based cost estimates, not frame-time or mobile-GPU measurements. The 32-instance authoring limit is provisional; dense settlements still require representative benchmarks and further culling/LODs. |
| Narrative | Subjective preference: Gross catalogue compositions suit period neighbourhoods and Tinderbox's architectural focus; the broader original homes, civic, commercial and farm designs suit AFT/Farmyard regional variety. Preserve both profiles with clear collection/source labels. Retained floors and apertures are useful inputs for Tinderbox, but richer fire, fuel and destruction remain its explicit consumer work. |

Prefer the shared headless placement contract and provider-specific visual assemblies for map authoring. Do not make detailed architectural simulation a mandatory cost for the tactical games. A catalogue entry or declared capability alone does not integrate a game.

## Acceptance record

The initial composed integrity/build checks passed: 603 pinned source files, 344 asset-browser entries, 48 original models and 322 resolved built modules. The focused 37 wall/prefab regressions and 32 upstream regressions passed after composition. Final worker repair commits and delivery checks are recorded below when settled.

The architect inspected the original catalogue contact sheet and interior evidence. The current in-app browser reports GL_RENDERER Disabled and fails WebGL context creation before editor initialization; its initial failure was recorded in the owning task's local review artifacts. That failure is an environment limitation, not evidence that the combined live scene rendered. The initial diagnostic preview was stopped and port 4527 released. Any later visual acceptance must identify the browser/renderer and exact reviewed scope.

## Adoption scope

No consumer pins, donor files or game rules are changed. The existing private Site identity/audience is preserved; this request delivers through the configured GitHub integration branch and existing pull request. Gameplay collision, navigation, confirmed impacts, doors, fire and persistence remain consumer adapters. The incoming bear remains an intake note until a compatible fixed model/animation/equipment contribution is reviewed.
