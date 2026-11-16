# Drivable train candidate review

Coder candidate based on reviewed `8efe3da49186f36b07e19da9a31777fe46a71874`, branch `codex/drivable-trains`. Connector/types/fixture first checkpoint is `32cce619ac1b8930ac7636dc49aa8704ce08cc92`. The final fixed candidate SHA is supplied in the Architect handoff. UI and package adoption remain separately reviewed integration work.

Implemented retained-actor Enter/Exit, cab ownership, coach riding, safe input leases, independent forward/reverse kinematic motion, shared protected track and separate durable runtime checkpoints. Actual model-local entrance groups agree with headless anchors, including duplicate coaches and the reversed electric cab. Adult actors retain their dimensions and explicitly refuse Miniature apertures they cannot fit.

The source/static reference `/examples/train-yard.html` uses two genuine side-by-side rounded circuits. Car and attached actor positions remain continuous across the seam in both directions. It uses the native goat worker from the existing unchanged AFT pin and the shared world-size steam/electric fleets. Both cabs support manual forward, brake, stop, reverse and safe Exit. Boarding a coach at its platform starts a retained station operator for one lap; the passenger cannot drive. The operator stops and exits back at the platform. A saved service restores paused with neutral/full brake and explicit Resume. Leaving a paused service also retires its operator's cab ownership.

## Validation

`node --test tests/drivable-trains.test.mjs tests/train-yard.test.mjs tests/railway-train.test.mjs tests/railway-traffic.test.mjs tests/railway-stock-scale.test.mjs tests/railway-track-kit.test.mjs tests/railway-routes.test.mjs` passed **43/43**. This includes legacy portable map/history/scale/playback checks, headless authority/resource/checkpoint tests, native entrance geometry agreement, two-circuit seam travel, real one-lap passenger services, both manual cab workflows and touch-independent input-release rules. No DOM, renderer or timer is imported by the session entry.

`node tools/review-train-yard.mjs` passed in isolated **Edge 157.0.4341.46**, source mode. It exercised keyboard walking, contextual cab entry, actual pointer-held forward, release/brake/stop, reverse and Exit; moving Save/Reload with no repeated entry effect; both coach departures/laps/Exit; manual electric cab forward/reverse/brake/Exit; and actual touch hold/cancel/Exit at **390 × 844**. The full laps were accelerated using explicit `.05 s` host-clock calls after visible live departure, not wall-clock performance measurements. A subsequent conservative aperture-dimension correction and paused-service exit correction have focused coverage in the final 43-test run.

Local visual/receipt files are in `artifacts/train-driving-review/`: `desktop-walk-up.png`, `desktop-driving.png`, `two-closed-circuits.png`, both `*-coach-riding.png`, `electric-cab-manual.png`, `touch-driver-braked.png`, `report.json`, and `cleanup-receipt.json`. The final receipt confirms browser close and HTTP close through their owning APIs. An earlier sandbox launch failure is preserved as `sandbox-launch-failure.json`; a scoped isolated run succeeded. No preview or watcher is retained.

The Architect explicitly owns the four full project gates once on the combined Coder/UI candidate, plus installed-package and built integration review. Those full checks are not claimed for this intermediate source handoff. `package.json`, `upstream.json`, `tools/build.mjs`, `tools/distribution.mjs` and all donor bytes are unchanged.

## Limits and review decisions

- Independent circuits currently support one consist per loop, with no circuit junction graph or mixed open/circuit layouts. These runtime routes do not alter portable map versions 4–6. Open routes retain shared diamond/turnout protection in both directions.
- This is bounded kinematic movement, not calibrated traction, wheel slip, derailment, slopes or physical train collision response. Signal protection applies an authoritative safety hold. The preference and accuracy/efficiency/narrative assessment are in the usage card.
- Boarding settles onto a named attachment. The reference hides actors inside opaque cars rather than clipping them through closed shells. Train door animation, climbing/interior navigation and richer actor presentation are separate art/game policies.
- The retained demo uses supported flat ground, conservative oriented train bodies for walking and one native adult actor profile. It does not certify arbitrary meshes, multiplayer authority or pedestrian/train physical response.
- Passenger service runs one lap to its platform. An unstaffed coach away from that platform refuses service and explains how to return the train. Passenger stop requests are not in this connector.
- Plain temporary host controls keep the source reference playable. The UI agent's separately owned panel and public package/export wiring belong to the Architect's combined integration.
