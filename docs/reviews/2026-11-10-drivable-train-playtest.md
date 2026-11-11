# Drivable train integration

The requested playtest is two simple circuits with the shared world-size steam and electric trains. A player walks to a named entrance, boards a cab to drive or a coach to ride, then stops and disembarks onto supported clear ground. Cab controls replace the walking joystick. Passenger trips return to a boarding stop without granting the rider driving authority.

## Reviewed inputs

- Railway/content baseline `8efe3da49186f36b07e19da9a31777fe46a71874`, including the preserved Miniature profile and shared signals.
- Initial connector/types/disconnected fixture `32cce619ac1b8930ac7636dc49aa8704ce08cc92`, accepted only for UI preparation. Its Node fixture has on-foot, driver and rider modes, detached reads and explicit `FIXTURE_ONLY` refusals. This checkpoint alone implements no live driving.
- Runtime/reference `4f7f15965c3b8c105faa27ace99c26989a33dd1f`, with the reviewed input-capacity correction `86e8a6c3cccbeb67cd96a2a02d5d1c383d1c9114`.
- Initial UI candidate `e898cd60a023577fffc4c5b26c318c0be220b13f`, followed by finished mechanical/feedback revision `5577773727b757c3142cb2ded0a10315e25cd41d`. The revised runtime, styles, declarations, audio and original art are retained byte-for-byte. The public wrapper adds the engine usage card.

## Design decisions

Accuracy favors named moving entrances, car-local occupancy, a complete train following the route in both directions, and safe supported exits. The two circuits must close continuously rather than teleporting a consist from one endpoint to another. Acceleration and braking are bounded game kinematics. This tranche does not claim a physically calibrated rail simulation.

Efficiency favors the existing shared assets, a host-driven clock and the retained actor/query/commit services. Simulation remains independent of the renderer and DOM. The playtest has two nearby loops and platforms, keeping the complete boarding workflow easy to inspect. These are code/design choices, with no physical-phone or frame-rate measurement claimed.

Narrative favors a warm timber/ochre/iron/brass steam panel with a mechanical reverser and fictional pull-chain brake, and a distinct cool commuter fascia with confirmed-state lamps. Sparse whistle/chime cues replace success paragraphs while refusals remain readable. These are subjective presentation choices, informed by fixed Tinderbox references and original code-native artwork. The original small train artwork and existing map saves remain useful compatibility profiles. The reference demonstrates optional shared-engine adoption without changing a game consumer pin.

## Review gates

The finished integration must prove cab entry, forward motion, stopping, reverse and safe exit for both fleets; coach entry, an actual circuit ride and exit for both fleets; continuous seam crossing by every car; correct active-cab facing; input cancellation and restoration of walking; explicit refusals for invalid entry/exit or stale authority; and appropriate save/restore behavior. Relevant protected-track behavior remains covered by focused runtime checks.

The architect runs the four required engine delivery gates on the combined result and reviews the actual built desktop and touch workflows. Only fixed commits are imported. Disposable browser/test helpers stop after review. A user playtest preview is separately recorded, registered and given a real automatic expiry, with its source and restart information preserved.

## Finished runtime review

The first candidate could exhaust its retired-input ledger while an input was still active. At the 8192-owner boundary that could prevent releasing the throttle and produce a checkpoint the loader rejected. The builder received the reproducible boundary case and corrected admission to reserve retirement capacity for active owners. New owners refuse before capacity is exhausted; existing input updates, release and exit continue to work. Restore accepts a fully retired ledger with no live input. Malformed releases no longer spend reserved slots. The architect's focused run passed all 19 train/yard tests, including the boundary cases.

The initial integrated built Edge review passed walking, contextual cab entry, forward/brake/reverse/exit for both fleets, one complete coach lap and exit for both fleets, and save/reload while moving. The touch review used actual CDP touch events at 390×844, including cancellation and restoration of walking. Full coach laps used explicit recorded .05-second host-clock steps after live departure; this is functional evidence, not a wall-clock performance claim. Screenshots and receipts are local under `artifacts/train-playtest-review/`.

The isolated Core tarball also imported `@nautilus-engine/core/trains` in Node, entered a cab, advanced, restored a moving occupied car with full brake and preserved injured/spent actor resources. Its UI alias was absent. SDK profiles omit fixtures, tooling and evidence. The static copy omits the UI fixture/tests/tools/evidence; the live page uses the actual train runtime and retained yard services.

Two existing historical guards initially rejected the deliberate train export/build additions. They now authenticate the exact current train additions before comparing the unchanged historical view. The image guard separately required registration of the original steam surface: only its reviewed SHA-256 is accepted, and altered bytes refuse. Original source records and immutable hashes remain unchanged.

## Combined acceptance, completed 2026-11-11

- `npm run check`: passed, including historical editor/authoring authentication and the separately authenticated SVG.
- `npm test`: 1219/1219 passed. After the final SVG registration, the two integration cases were also rerun successfully, including altered-art rejection.
- `npm run test:upstream`: 32/32 passed.
- `npm run build`: passed, 593 module paths and 12 recorded deployment patches.
- Current public facade and type fixture: strict TypeScript passed, including five negative controls. The fixed UI candidate reports 45 browser groups and 11 audio tests; these remain explicitly distinct from live-host acceptance.
- Built Edge157 review: both fleets' manual forward/brake/reverse/exit and real coach laps/exit passed. A native mouse drag selected the steam reverser detents without moving the train; the chain stopped a powered train and superseded its old input owner. The actual departure triggered the whistle graph, commuter boarding triggered its chime, and traction/brake lamps followed committed controls. Reload stayed silent and applied full brake. No physical-speaker listening or loudness calibration is claimed.
- Actual touch walking/cancellation, cab entry, contained driver panels and walking restoration passed at both 390×844 and 320×844. Native touch driving/cancellation also passed in the live scene.
- Fresh offline Core tarball installation: headless cab entry, motion, occupied-car restoration, released input, retained resources and absence of the UI alias passed under Node24.15.0.

Local records are under `artifacts/train-playtest-gates/`, `artifacts/train-playtest-review/`, `artifacts/train-walking-review/` and `artifacts/train-installed-proof/`. The review tools are committed for reproduction. Disposable browser/server lifetimes exited, cleanup receipts were checked, and their loopback ports refused connections. The retained user preview has a separate process/source/restart record and lifecycle registration, a private STOP marker and a real 48-hour timer. A one-second run of the same launcher demonstrated expiry, process exit and port release before the retained run.

## Limits

The yard has two independent closed circuits, with manual cabs and a retained operator for each one-lap passenger service. It does not connect the circuits through an interlock, simulate locomotive physics, provide walkable interiors or add boarding animation. A native goat is shown while on foot and hidden inside the occupied car; its movement animation is a neutral pose. The existing railway junction/signal behavior remains covered separately. Phone viewport evidence does not establish physical-device performance. No game consumer pin or private Sites audience changes.
