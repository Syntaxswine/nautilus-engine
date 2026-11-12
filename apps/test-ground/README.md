# Night Ledger independent test ground

This is a **test-only independent consumer**, separate from the retained Night
Ledger fixture and shipped engine packages. Architect owns review, registration
and main integration. It uses the complete installed compatibility package at
accepted engine baseline `0640dab2f8dfe5d9facbe9ded831855e0376d22a`, through public
setup, native actor, interaction, item and Three entries. It does not open a donor,
an editor runtime or a sibling game. No consumer pin or historical fixture changes.

The main ground is 64 × 64 metres. Two fixed 16 × 16 metre plots face a central
safe court and connecting paths. The 2 m grid, 2.12 m story height, 1.2 m passage,
2 m door leaf, 0.28 m actor radius and 1.8 m actor collision height are explicit
fixture choices. The accepted native goat retains its original visual dimensions.
The rock uses the public native model at its original 0.055 m radius; its larger
ground ring is a locator, not the item mesh or collision body. Walls/paths/signs
are original procedural test scenery. No ledger, crate or cabinet artwork is
claimed. An adjoining 240 × 180 m railway area is reserved outside this runtime
world, and the south strip remains open for later driving work. Neither runs a
transport provider.

## Reproduce from an installed package

Prerequisites are the repository's Node >=22, existing npm, isolated Edge and
Playwright used by `tools/art-review-browser.mjs`. Type checks take an existing
read-only TypeScript compiler. No dependency download or npm publication occurs.

From the repository root:

```powershell
node apps/test-ground/tools/install.mjs --fresh
node apps/test-ground/tools/focused.mjs C:/path/to/typescript/lib/tsc.js
node apps/test-ground/tools/run.mjs --output artifacts/night-ledger-agent.json
node apps/test-ground/tools/review.mjs
```

The installer packs the complete compatibility distribution, installs the actual
tarball offline without scripts, verifies every installed provenance byte, copies
this consumer and generates its browser import map from **package exports**.
`artifacts/night-ledger-installed/latest.json` identifies the exact archive,
installed page, code hashes and measured reproduction steps/time. The browser
proof serves that installed page, audits all runtime resource requests and closes
its own isolated browser/server in `finally` with a six minute bound. No preview
is retained. Tools may read repository packaging/review helpers; runtime files
import only public package specifiers or this consumer's own relative files.

`--fresh` creates a new consumer directory instead of reusing an installed one.
Timing records scripted setup on the existing developer machine, including
packing, offline installation and byte verification. It excludes prerequisite
installation, design/implementation time and fresh human onboarding. It does not
establish “a new game in minutes.” `evidence/checks.json` records actual host/app
code bytes and lines rather than treating them as automatic engine wiring.

## Choose, try and verify

The ordinary shared UI owns status, contextual action buttons, E, keyboard and
touch movement, setup/presets/material/camera settings, focus and input release.
Application controls live only in its published map/inventory extension slots.
WASD/arrows and the shared joystick walk. E operates the sole eligible nearby
action; a button selects explicitly. Enter opens generated player setup. The
camera menu offers follow and full-ground overview.

**Fixtures & golden checks** opens the consumer's checklist/composition dialog.
Plot contents, mission objective/target, expected observation profile and observer
availability are separate recipe fields. Gatehouse supplies a door; recovery store
supplies a door and a rock. A rock objective on a gatehouse gives
`OBJECTIVE_INCOMPATIBLE` before activation. Unregistered placement/floor/version
changes are refused. No matching texture implies a semantic connection.

* **Try · reset** explicitly creates a fresh sandbox at that fixture's declared
  approach, with 37 health, 9 AP and 11 stamina. **Explicit sandbox reset** returns
  to the central spawn. These are deliberate resets, never save repair. Changing
  seed requires `reset` with a new complete recipe, not a live settings swap.
* **Apply composition** pauses/releases the original input, validates/prepares
  geometry and visuals, persists a complete candidate, then accepts it once.
  An occupied plot or a carried item owned by the replaced plot refuses the swap.
  Neighbouring roots, door/item records, player pose/resources and durable receipts
  are preserved. Only replaced plot visuals are retired. Objective/expectation
  changes do not rebuild scenery. Cancelled/refused preparation keeps the old scene.
* **Run selected** executes the two committed golden baselines in isolated
  headless instances of the same public host/action provider. It does not reset
  the accepted manual sandbox. The runner requests through the public action
  router, then reads real confirmed state and passage queries. The renderer/native
  controls are exercised separately in browser evidence. No visual pass or complete
  manual travel is inferred from a headless run.
* Selection is separate from outcome. Unchecked means disabled/not run. Missing
  observations disable selection and return unavailable without dispatching a
  command, even when a previously stored selection requested that fixture. Pending,
  running, passed, failed, unavailable and stale remain distinct. Deferred subsystem
  rows are never selectable or passed. There are no bounded asynchronous observation
  waits here: the supported providers publish synchronously in the atomic commit.

“New transition after baseline” requires a closed/world baseline, one new committed
event, the current outcome and exact fixture AP cost. “Current-state audit only”
can audit an already-open door or already-carried rock, and explicitly makes no
claim about a new command, event, inventory gain or cost. Such an audit cannot pass
a golden transition test; Run selected returns unavailable until transition
observations are selected. Mission completion and verification have separate fields.
An initial manual mission stays pending until an action is attempted. Conditions,
event identities and baselines are exported, not inferred from clicks.

The explicit **Broken acknowledgement · expect FAIL** probe spends the declared
door cost and returns an accepted receipt while deliberately withholding the door
transition/event. Verification fails `door.open`, `passage.clear` and
`new.door-opened-events`. This is a labelled test fault, never a replacement for
normal door behavior. “Passage observer unavailable” demonstrates missing support.
Golden expectations are committed in `content-data.json`; no run rewrites them.
They remain subject to Architect review before main integration.

## Authority, costs and persistence

`host.js` is one small consumer transaction/persistence service around the public
pure `walkActor`, `previewInteraction`, `applyInteraction`, `pickupRock`, world and
query APIs. One accepted snapshot contains world geometry, the interaction sidecar,
the sole actor, resources, rock sidecars, events and receipts. Returned state is
detached. There is no copied mover, input handler, inventory framework or mutation
of `createDefaultWorld` closures. The shared setup borrows these published services
and the content renderer, while owning its existing clock, camera and native/UI
lifetimes. Retirement of the setup spares borrowed services; this application then
retires its own surface/host.

`test-ground-costs` v1 deliberately charges 1 AP for opening/closing a door and 2
AP for picking up a rock, with four inventory slots. These are **fixture policies**,
not universal engine rules. At commit the host compares the full offer's actor,
resources, item source, world/recipe and plot generations; revalidates current
permission, reach, capacity and cost; checks the item API's complete expected rock
source; stages inventory/ownership/cost/event/receipt together; and persists before
publishing. A save failure or stale source leaves all accepted fields unchanged.
Durable command IDs deduplicate retries and reloads. Each explicit new sandbox
gets an identity-only namespace, preserved by reload and included in its world,
events and receipt IDs. It does not alter seeded gameplay or golden expectations.
Reusing an ID for another
request refuses. Event IDs are deduplicated independently. Bounded history refuses
at its limit rather than forgetting IDs and allowing a replay.

The missing generic inventory/commit provider is a follow-up integration gap.
Architect explicitly approved this narrow host-owned transaction seam. A larger
game must supply its own transactional resource authority or a later reviewed
provider; widgets do not create one.

Save sandbox stores the complete host, exact shared setup recipe/native checkpoint,
checklist/selection/results and mission baseline. Reload prepares a complete new
host/native/UI candidate while old input is frozen. It restores spent resources,
pose and durable receipts; it does not replay commands, held gestures or effects.
World and setup/checklist identities must agree. The exact archive SHA is required,
so an export from a different assembled package is refused even if its semantic
package version is still 0.10.0. Keep the reported archive to replay its checkpoint.
Loading a recipe is a composition change, not a world save or resource reset.

## Agent and menu contract

`window.testGround.dispatch(command)` is the menu's own versioned command surface.
The serializable ground recipe accompanies the exact installed player setup recipe
in every checkpoint/report and result. Examples:

```js
await testGround.dispatch({version:1,type:'selection',ids:['golden-door-passage']});
await testGround.dispatch({version:1,type:'run-selected'});
await testGround.dispatch({version:1,type:'recipe',recipe:nextRecipe});
await testGround.dispatch({version:1,type:'try',fixtureId:'golden-rock-recovery'});
await testGround.dispatch({version:1,type:'export'}); // exact JSON, no command replay
```

`reset`, `save`, `reload` and `import` are also explicit commands. Ordinary actor
intents continue through `testGround.setup.readActions()/dispatch()` and their
current context/offer. Do not parse the shared router's opaque combined action ID.
`host.requestAction({commandId,actionId,offer})` is the test consumer's narrow durable
transaction endpoint, with the same authority used by the action presenter.

For terminal/agent reproduction, `tools/run.mjs --recipe recipe.json --selection
ids.json --output result.json` consumes the installed copy of that same checklist
service. Exit 0 means selected tests passed (or none selected), 1 a failed test and
2 unavailable support. Off never implies pass; inspect each result. Exports include
fixture/objective/observer/expectation versions and source, baseline, seed, full
ground and player recipes, semantic required ports, placement/conflicts, command
and receipt IDs, expected/observed checks and evidence scope. Relevant ground or
player setup changes mark prior results stale. Engine archive and consumer runtime
hashes also enter the dependency key, so a changed observer/host/compiler cannot
retain a green result merely because someone forgot a manual version bump.
Saved expectations that differ from
the committed registry refuse instead of being blessed from prior output.

## Evidence and limits

The focused Node proof covers atomic commit/failure/retry/reload, permission/stale
source, occupied and carried-resource swaps, neighbour preservation, independent
objective/condition changes, unavailable/disabled outcomes and stale results.
Strict installed public types include five negative controls. The isolated Edge
proof uses real native paint/model and actual keyboard/touch events, standard E/
buttons, body-aware passage, generated settings, neighbouring root identity, exact
save/report reload, missing observations, the acknowledged fault and owned cleanup.
Screenshots supplement these state assertions; they are not golden pixel tests.

Headless extent measurements compare the same actor, flat panel and query segment
in 16 m and 64 m worlds. They do not measure extra scenery, GPU/FPS or handset cost.
Browser render counters and actual startup time are reported separately. Phone
emulation proves layout/input only. No physical-device performance, historical
building accuracy, complete Night Ledger adoption or universal quest system is claimed.

**Accuracy:** explicit native dimensions, retained public query/command rules and
observed outcomes are preferred for these fixtures (code and browser evidence).
There is no physical calibration claim. **Efficiency:** bounded plots and one
authority/input/renderer avoid a duplicate runtime; timing scope is stated above.
**Narrative:** a safe court and two contrasting marked plots retain the readable
small-mission structure within a larger ground (subjective preference). Warm
Farmyard/Tinderbox materials remain selectable without changing action meaning.
Movement/heights, combat, fire, trains and road vehicles are visibly deferred with
specific missing-provider/baseline reasons.

The immutable declarative source was committed at the historical path
`examples/night-ledger/content-data.json` in `81ddf363e524e967159703246e49ef334d0d1e65`.
The final consumer lives under `apps/test-ground/` because the existing static
build intentionally treats `examples/` as a flat file directory. The content blob
is preserved byte-for-byte; no engine build/runtime change is required.
