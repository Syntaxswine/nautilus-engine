# Donnelly circulation correction

This successor addresses ordinary walking and the inferred veranda. The architect's separate [Victorian interior plan](projects/donnelly-house-interior.md) is proposal-only. It creates no runtime rooms, entrance, doors or surveyed-plan claim.

The first defect was the Mount Dora scene adapter treating a physical floor change as a new control context. The shared UI correctly released held keyboard and captured joystick input at that change. The adapter now keeps the on-foot control context stable; physical floor identity, supported travel and geometry validation remain authoritative.

The second defect was visual: the original native gait placed both hooves on the actor root's plane while real treads have different heights. The baseline ordinary keyboard probe stalled on the first tread and measured up to **.212m** penetration in actual skinned hoof vertices. A bounded optional native foot-support binding samples the canonical walkable support graph under each actual sole footprint, then uses the existing two-bone leg solve. This cannot move the authoritative actor or write resources. The ordinary setup still owns the one native view, input, camera and clock. World `(x,y,h)` still maps once to renderer `(x,h,y)`.

The new stair spacing also exposed an endpoint planning ambiguity and a rounding defect. The v2 geometry provider looks ahead .24m to emit one complete bounded step; the movement kernel trims that path to the real 3D distance budget. Computed distances within the existing `1e-8m` station tolerance use the exact node coordinates, including internal nodes, before relinquishing a partial receipt. Saved actors are never normalized on load. A slow analog budget that formerly left `h=1.37e-13m` without a receipt now ends on the exact support and can reverse normally.

| Dimension | Preserved photo v1 | Explicit photo v2 |
|---|---:|---:|
| Front veranda depth | 5m | 2m |
| Side veranda depth | 4.2m | 2m |
| Landing depth | 3.2m | 2m |
| Street plane (town x) | 403 | 403 |
| Bay, oculus and front gables (town x) | 408 | 405 |
| Riser count / rise | 4 / .212m | 5 / .1696m |
| Tread going / total run | .45m / 1.8m | .30m / 1.5m |
| Stair width | 1.8m | 1.8m |
| Stair run (town x) | 406.2–408, within veranda | 405–406.5, projecting from veranda |
| Turret centre (town x,y) | 406,484 | 402.6,481.4, attached to main corner |
| Story convention / porch floor | 2.12m / .848m | 2.12m / .848m |

These are authored inferences, not measurements of the real house. Subtract .5 from town x/y to obtain engine coordinates. Posts, rails, landing, bay, oculus, eaves, canopy and support use the same part graph. The stair canopy's collision uses its conservative minimum eave height. The original octagonal turret/cap and major gable forms remain; the documented hexagonal turret, main hipped roof and detailed style corrections are a later architectural tranche. The nominal room axes and attached corner agree with the architect's plan.

**Accuracy:** prefer the new narrow veranda for this exterior study because the supplied photo and the primary-source constraints in the architect's brief support a shallow two-sided veranda and attached corner. Dimensions remain provisional. Prefer per-hoof support over a hidden ramp or flat-foot posing for stepped surfaces: the actual mesh can occupy different treads while movement keeps its confirmed pose and natural step limits. This is code and visual evidence, not biomechanical calibration.

**Efficiency:** one authoritative graph, existing native rig and existing movement/setup avoid another controller or scene. The optional solver performs two bounded sole queries and two leg solves per changed pose; absent bindings retain the old path. This is a code-based cost estimate, not a measured processor saving.

**Narrative:** the attached corner, shallow veranda and covered approach better express this Victorian house in the town study (subjective architectural judgment). The interior remains a documented interpretation for review by room use, not a playable claim.

## Saved state and public seam

`planDonnellyExterior()` and `photo-guided-v1` keep their exact original graph and geometry identity. `planDonnellyVeranda()` and `photo-guided-v2` are explicit successors. Existing source-derived presets remain v1 unless a consumer deliberately selects v2. New/default app studies select `engine-v2`; `presentation=engine` and the named **Legacy photo study v1** selector keep `nautilus-mount-dora-session-v1:engine`. V2 writes the separate `...:engine-v2` key. Reopen uses the selected key; there is no migration or overwrite of the earlier save.

The borrowed optional `footSupport` option in `mountPlayerSetup` / `prepareNativeActor` is `{readonly id, sample({points,referenceH})}`. Four world-x-y sole corners are input; one finite walkable height in metres is output. Support comes from authoritative data, never reconstructed from renderer geometry. Mount Dora samples only its walkable support list, caps targets at reference +.53m, and excludes solid overhead balconies/roofs. Native IK rejects nonfinite, >.8m distant or unreachable targets. The sampler identity includes the authoritative geometry key through a read-only getter, so native edits and restored world state bind the current support. A changed identity refreshes stationary presentation too.

The review correction uses actual convex sole/support contact, including rotated soles and diagonal piers; edge bounding boxes cannot invent support. Both foot samples and complete reach calculations are staged before root/bone transforms or gait counters change. A refused update preserves the prior native checkpoint and all visible transforms, and a valid retry advances once. The package image audit separately authenticates exactly the architect's three SVG drawings through the current registration, retaining its rejection of other unknown images.

Absent binding preserves native checkpoint **v1**, including original fields and flat gait. Bound views use native checkpoint **v2**, requiring a matching `footSupportId`; setup/session envelopes remain version1. Restore checks the exact world geometry and actor pose before native presentation. Wrong/missing identities and malformed/distant height samples refuse. Native edits remain staged atomically by the existing world/document authority.

Focused regressions are in `tests/donnelly-circulation.test.mjs`; ordinary browser proof is produced by `tools/donnelly-circulation/`. Browser receipts measure actual skinned vertices, not a proxy foot marker. Disposable browser/server helpers close through their owning APIs and leave exact identity/port cleanup receipts. The architect owns integration and any retained user preview.
