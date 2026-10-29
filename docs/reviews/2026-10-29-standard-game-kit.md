# Standard game interactions and title-screen candidate

Baseline: Nautilus v0.8.0, full commit **8c4670450cb2b38c1e1abd811d633c22de9e2b7c**. This is an optional implementation candidate; the architect owns engine release and cross-game adoption. No donor, worker checkout, game pin, tag, main merge or publishing setting is changed.

## Delivered boundary

- Headless standard-interactions v1 sidecar and bounded-kinematic-v1 mover: pure previews, revision-stamped commits, open/close/unlock, current occupancy, continuous upright walking/stair progress, arrival support and complete mid-route persistence.
- Reference AABB provider over the existing world-core spatial index. It checks the complete swept body and conservative support footprint; doors use closed/open/motion boxes. Curved/triangle worlds need their own query provider through the same interface.
- Optional DOM title screen and stylesheet: start/continue/settings/credits, save inspection, replacement confirmation, native modal focus cycling, loading/error/retry and stale-request/disposal guards.
- Original SVG title illustration, responsive reference yard, exported usage cards, shipped developer guides and builder checklists.

The new contract records optional interaction semantics separately from unchanged portable maps/blocks. It does not claim complete movement/physics, infer collision from meshes or migrate Farmyard. Actor resource costs, inventory, multiplayer authority, effects and game saves remain explicit transaction bindings.

## Reuse and design choices

Sources already present at the baseline: pinned AFT **781246a668c723d5a4c5463e70534cc04b6a5641**, core/maps.js (grid doors/stair neighbors and validation); engine world-core (static AABB tree and confirmed support); existing headless transaction/floor-controller conventions. Pinned Farmyard **b2f2b6bd033cc3dbc8b572caa251244d283829c8** remains the workshop visual direction. No new donor import or runtime dependency was added. The illustration and title code are original Nautilus work.

**Accuracy.** For real-time yards, continuous authored routes represent walking distance and interrupted progress more faithfully than an immediate layer transition. They remain kinematic centreline motion, with rectangular bodies and conservative boxes rather than calibrated human/hinge physics. Endpoint support and head/body checks are code-verified correctness properties, not real-world validation. Prefer an actual curved/mesh provider for Coldwell. Retain AFT's existing grid/AP behavior for compatibility rather than silently replacing it.

**Efficiency.** Code-based estimate: static broad-phase work reuses the world BVH; doors/live actors are checked linearly and support coverage operates on nearby panels. Validation, serialization limits, copied transaction data and query arguments add linear work in the supplied interaction set. These costs are explicit; maximum record limits are not a usable scene-size benchmark. The reference yard is small and no phone FPS or city-scale CPU claim is made. Reuse the game's existing world provider and caches where possible.

**Narrative.** Subjective recommendation for Farmyard and a new real-time adventure: share readable door feedback, continuous stairs and menu flow, while supplying game-specific paint, title, cast, costs and sound. Keep richer door/fire/curved-world consequences optional where they serve Tinderbox or Coldwell. The neutral template follows Nautilus's green, paper and brass palette; it does not replace a game's identity.

## Acceptance

The reproducible browser runner is tools/review-game-starter.mjs, using the existing isolated short-lived review harness. It covers real keyboard/touch controls, locks/keys/occupancy, closed-door blocking, both stair directions, mid-flight save/reload/export/import, atomic invalid-import rejection, new-game confirmation, input isolation, loading/failure/retry races and disposal. It also reviews 390px touch, 320px phone and 640px reflow equivalent to the available width after 200% zoom on 1280px. The reflow check is not a native zoom measurement.

A preliminary source review found and fixed modal Tab cycling; a test-runner correction opened the scenario details before operating its controls. Final frozen-source evidence and cleanup receipts are recorded in the adjacent evidence directory after validation. The installed core proof exercises real public imports and a door transaction; the compatibility proof checks the optional title/CSS exports and all shipped guide URLs.

This candidate is not production adoption of Farmyard, AFT, Tinderbox or the full Coldwell map.

## Frozen acceptance evidence

Reviewed source commit: **9d33ca65edf7b4d6b169d50e17dfc6bb40276373** (implementation 4c95f4f844430aff1018b501b69f79e5e19b3324 plus the CI acceptance wiring). All 371 engine tests, 32 upstream regressions, integrity/closure check, build, installed core proof and installed compatibility UI proof pass. The built browser run passes all nine groups with zero unexpected errors or failed resources. See [acceptance JSON](evidence/standard-game-kit/acceptance.json), [validation](evidence/standard-game-kit/validation.txt) and [cleanup verification](evidence/standard-game-kit/cleanup-verification.json).

Desktop and phone captures were visually inspected. The final helper receipt confirms supported browser/HTTP shutdown; exact PID/creation identities and all recorded ports were rechecked after exit. No review browser/server remains running. The 640px capture is a reflow equivalent, not a native browser zoom measurement.
