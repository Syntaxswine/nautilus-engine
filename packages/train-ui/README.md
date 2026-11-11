# Train controls

Status: **isolated UI candidate** against fixed connector
`32cce619ac1b8930ac7636dc49aa8704ce08cc92`, based on reviewed railway/content
`8efe3da49186f36b07e19da9a31777fe46a71874`. The [builder card](USAGE-CARD.md)
defines ownership and the remaining integration steps. The [fixture](fixture/index.html)
uses Coder's committed connector and always returns `FIXTURE_ONLY` from dispatch.
Live motion, boarding, riding and game adoption await the finished host connector.

The optional DOM module is `index.js`; load `style.css` in the same document.
There is no package export or workshop navigation change in this candidate.
The Architect owns final shared package/export/example integration. The UI owns
no simulation clock, railway kernel, actor/occupancy rule, renderer or saved state.

Direction buttons select the driver's request. The dial, confirmed power and
braking read only the connector's latest actor snapshot. Choose a direction and
power setting, then hold **Hold power** (pointer, Space/Enter while focused).
Release applies the original lease's neutral/full-brake policy. **B** or the red
brake takes priority over a power gesture. F/N/R and up/down set the requested
direction/power; native labelled buttons and range controls remain available.
An assistive click on a hold control is one safe drive/release pulse, not latched
unattended power. Touch/mouse or a held keyboard input supplies sustained power.

The host retains walking input and its DOM element in the supplied HUD slot.
Confirmed driver/rider state disables walking before showing train controls.
Riders receive no driving controls. Enter/Exit uses the exact offered action
tuple and Expected data. Refusals remain visible and a deliberate retry gets a
new command ID. The UI never guesses another entrance or changes cab direction
based on route sign. Rear-cab facing only formats the confirmed travel readout.

Pointer up/cancel/lost capture, keyup, blur, hidden/page exit, focus leaving the
scope, modal pause, actor/cab changes and disposal release the original lease.
No released lease ID is reused. Post-commit occupancy changes defer a cleanup
release until the current synchronous dispatch returns; it never uses the new
actor, occupancy revisions or another cab. Release refusal cannot turn an
already committed primary action into a failed Enter/Exit.

Run the fixture with a short-lived source HTTP server and open
`/packages/train-ui/fixture/index.html`. `node packages/train-ui/tools/review.mjs`
owns a bounded isolated browser/server and closes both in `finally`. Screenshot
and UI evidence are stored under `evidence/`. Fixture artwork is an original
code-native layout illustration, not shared train/actor acceptance. The live
playtest must use the actual railway/rolling-stock and character assets.
