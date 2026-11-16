# Stage 1 review record

Base: `7f50cb2a48aef87a16fc0465997549be9ed88dc2`. This is the optional
source candidate assigned by `docs/projects/player-setup-composition.md`.
The machine record [checks.json](checks.json) records final counts, exact source
hashes, resource bytes and helper retirement. [browser.json](browser.json) lists
the final focused groups and measured viewport/HUD rectangles.

The source scene uses existing native train art and retained actors/resources;
it shows a player viewpoint and labels native actor startup as Stage 2.
Cab control, coach ride/exit and return to walking use the real retained train
host. Protocol edge checks use explicit host ticks. Browser phone viewports
prove layout/input, not physical handset performance. Audio proof covers native
activation, graph/lease lifecycle and cancellation; speakers were not reviewed.

The Node suite covers plain-data/config/semantic compatibility, strict runtime
compilation, generic door-action contracts, context reentry, pause ownership,
real retained walking receipts and existing train behavior. Type checks include
negative controls for source ownership, opaque requests and supported API values.
The full engine gates, public registration, installed recipe and real-yard
adoption remain Architect/Stage 2/Stage 3 work, as assigned in the project scope.
No donor, Core, root build/export, example or consumer pin was edited.

Three failed review attempts remain part of helper history:

1. The first browser callback completed its four groups, then the harness rejected
   two unattributed 404 console messages. Their request URLs were not captured.
   The fixture now declares an empty favicon and later runs have no console or
   resource errors. Favicon causation was not independently established.
2. The native-event fixture reused a deterministic drive command ID after remount
   and expected another committed result. Code inspection identified that reuse;
   the test now shares only its mount prefix and supplies fresh command IDs.
   It still verifies old presenter offers reject and retained native events do not
   unlock audio. No production command retry was added.
3. A text-field check clicked a disclosure already left open by the prior recipe
   export check, closing it before looking for the textbox. The test now observes
   its open state first; no menu behavior or timeout limit changed.

The first measured landscape safe rectangle was only about 42 CSS pixels tall.
The candidate now chooses the largest clear rectangle around actual occlusions,
including the usable region beside landscape controls, and the camera consumes
both coordinates. This is measured DOM geometry and an algorithmic UI choice;
CPU/FPS gains and fresh-builder setup time are unmeasured.

All disposable browser/server lifetimes, including failed attempts, have exact
PID/creation-time records, restart descriptions, deadlines and cleanup receipts.
The verifier checks exited identities and binds each released port. No preview,
watcher, browser or cleanup daemon is retained by this task.
