# Reusable train-control HUD

| Field | Candidate contract |
| --- | --- |
| Identity/status | `nautilus-train-controls` v1. Classic/compact are integrated in fixed base `db656a6d717ad36aabe32955b47a09b8badb116e`; compact opposite-direction assistance is the current bounded candidate. Engine connector remains `nautilus-drivable-trains` v1 / `bounded-rail-driver-v1`. |
| Guide/example | [UI guide](README.md), [source fixture](fixture/index.html), [engine contract](../../docs/drivable-trains.md). Coder owns the live session and playable reference; Architect integrates shared exports and the two-circuit playtest. |
| Required inputs | Exact `TrainConnector`, actor ID, one host-provided HUD container, its existing walking element, `setWalkingEnabled(enabled)` and focus restoration. The disabling callback must clear the host's held walking input. |
| Optional inputs | `steamProfile:'classic'|'compact-notched'` (default classic), unique `newId(kind)` allocator (default UUID), classic initial power (default 35%), host `muted` preference, `focusWalking()` and `onError(error,{phase})`. IDs must be fresh, synchronous and stable; no world mutations inside allocation. Compact uses fixed power notches and leaves electric behavior compatible. |
| Units/space | Classic fits a roughly 288–354 CSS px HUD slot. Compact's mechanical square is 138px standard, 124px narrow and 96px landscape, with readouts/Exit/mute beside it. Measure the whole component for camera-safe space. Speed comes in m/s and displays as km/h; no unit changes in commands. |
| Actions | Snapshot-owned Enter/Exit tuples; classic local F/N/R and power request or explicit compact power notches; exclusive input-owner lease and exact-original-lease release. Authoritative validation/commit stays in Core/host. No walking or train simulation is duplicated. |
| Lifecycle | One post-commit invalidation subscription. Classic hold release clears power; compact normal notch release retains the accepted owner. Safety cancel/blur/hidden/modal/focus loss/cab change/disposal release both profiles. `setBlocked(true)` before a host modal; false never resumes power. Dispose UI before retiring the borrowed session. |
| Persistence | Owns no save. Do not persist pointers, keys or lease IDs. Real restore revokes held input and applies neutral/full brake through the connector policy. Preserve World/Miniature and portable railway saves in Core. |
| Game decisions | HUD positioning and camera-safe area, input focus, pause/menus, saved audio preference, actual actors/entrances/landing permissions and host-only passenger service. Skin is chosen from authoritative stock. Coal tenders acquire no riding action from artwork. |
| Evidence boundary | Fixed fixture is always disconnected. Browser protocol tests can establish UI release/ownership behavior, not actual train motion/boarding or native content. Real steam/electric loops, moving coach ride, stopped platform exit and game adoption require Architect's combined playtest. |

The [compact profile guide](COMPACT-PROFILE.md), [source record](compact-source.json)
and [packaging handoff](compact-handoff.json) describe its persistent notch policy,
real retained-host checks, pinned texture/fonts and complete notices. Select it
explicitly through `steamProfile`; the current default and electric panel remain.

```js
import {mountTrainControls} from './packages/train-ui/index.js';
// Load style.css with its adjacent art/steam-cab-surface.svg. session is the real connector,
// not a replacement simulation. Keep the existing walking control instance.
const ui = mountTrainControls(hudSlot, {
  session, actorId: playerId, walkingElement: existingJoystick.element,
  setWalkingEnabled(enabled) { existingJoystick.setEnabled(enabled); },
  focusWalking() { gameInputSurface.focus(); },
  // steamProfile: 'compact-notched',
  // muted: settings.audioMuted,
});
// Before host modal/scene pause: ui.setBlocked(true).
// After closing: ui.setBlocked(false). Old held power does not resume.
// On selected actor replacement: ui.setActor(nextActorId).
// On audio setting changes: ui.setMuted(settings.audioMuted).
// Before unmount, persist ui.state.feedback.muted in host settings if desired.
// On unmount: ui.dispose(); then retire the owned game session separately.
```

`existingJoystick.setEnabled` is illustrative host glue, not a new Nautilus
movement API. Adapt the retained movement owner exactly once. Use a focusable
keyboard scope around the slot; native buttons/inputs work without global keys.
The component borrows the slot and walking element, removes only its own DOM and
listeners, and never disposes the session. During confirmed driver/rider state,
walking stays disabled even if the train UI is disposed; the host must provide
its next input/menu owner. Restore walking/focus only on confirmed on-foot state.

`mountTrainControls` returns `element`, `refresh()`, `releaseInput(reason)`,
`setBlocked(bool)`, `setActor(id)`, `setMuted(bool)`, readonly presentation `state`, and idempotent
`dispose()`. It reports synchronous dispatch outcomes but rereads for display.
The UI cannot turn a successful callback or preview into occupancy/drive authority.
Unknown/malformed transport outcomes disable controls and report the error;
never automatically replay an action with a replacement ID.

Theme variables include `--rail-panel`, `--rail-ink`, `--rail-muted`, `--rail-brass`,
`--rail-edge` and `--rail-recess` on `.nautilus-train-controls`; `data-stock` comes
only from the connector. Steam also loads its original painted SVG surface.
Keep brake/readout contrast, labels, 44px targets, focus outline and reduced
motion behavior when reskinning. The walking joystick
returns in its original host slot; no second keyboard/movement owner is created.

Compact is a separate input policy: normal notch release keeps its accepted
lease, N coasts, and the chain brakes/neutralizes. Every safety cancellation
still closes the original actor/lease, and new input uses a fresh ID. Displayed
notch comes from confirmed controls, including after refusals. Rebinding profiles
must dispose the old component first and preserve the host's mute preference.

An opposite compact notch requests full brake on the current owned lease, then
engages the selected direction after an authoritative stop. Confirmed grip and
brake stay separate from `state.pendingNotch:0|1|3|null`. Normal finger release
retains this request; N, another notch, chain, safety/context changes, Exit,
failure and disposal cancel it. It is never saved or restored, and no queued
callback may take over another lease. See the [current reverse proof](evidence/REVERSE-REVIEW.md).

Steam reverser drag selects F/N/R; it does not start motion. Native direction
buttons and F/N/R keys remain alternatives. Drag cancellation restores the prior
selection. Grabbing the chain starts full brake, including while holding power;
pointerup/cancel releases only that gesture. The ring's travel is presentation,
not a second force model. Space/Enter and B remain available.

Commuter lamps mean accepted traction power with no brake/signal hold, confirmed
occupancy (**ABOARD**), and confirmed brake. No physical door sensor exists in
this connector. Do not relabel occupancy as door-closed or infer it from artwork.

Sounds require a trusted user gesture and confirmed transitions from this UI's
accepted actions. Steam whistles at first actual departure on its held lease,
once per boarding. Electric chimes on committed boarding and exit. There is no
mount/restore/repeat/throttle-update cue. The mute button and `setMuted` stop
current sounds; unmute never replays an old one. Audio contexts are lazy, owned
by this component and closed on disposal. Host settings own persistence. These
original synthesized sounds approximate whistle/chime; replace them deliberately
if a game requires recordings. Quiet success text remains accessible; blocked
actions keep visible reasons. See [review and limits](evidence/MECHANICAL-REVIEW.md).

## Design evaluation

Accuracy: prefer the separate direction request, confirmed gauge and explicit
brake. The lever suggests a locomotive reverser; the pull-chain brake is an
intentional game fiction requested for intuitive use, not a historical claim.
The electric lamps show only available confirmed fields. Core retains
stop-before-reverse, signals, occupancy and cab-relative meaning. No pressure,
fuel, physical door state or traction-force measurement is invented.

Efficiency: prefer one shared input/lease system with two CSS/SVG presentations.
It renders on invalidation/input, reuses DOM, borrows the host clock and creates
no renderer or polling loop. The small SVG has no heavy filters; WebAudio is lazy
and cues are sparse with bounded duration. These are code-based cost estimates,
not hardware/FPS measurements.

Narrative: for steam/Tinderbox-style machinery, prefer the warm worn ochre,
timber, dark iron, brass dial, reverser and chain over the prior common green
button panel. For the commuter train, prefer cool steel, restrained controls,
state lamps and a short chime. This is a visual judgment, reviewed at desktop,
390px and 320px. [Immutable visual references](art/references.json) informed the
direction for classic, whose art and whistle/chime are original. Compact's
deliberate Tinderbox code/art/font import is recorded in compact-source.json.
Adoption status: classic is integrated in the fixed engine base. Compact is a
bounded adaptation candidate with real retained-host input checks; Architect
owns the rendered stock/actor review and final package/example integration.

## Adoption checklist

- [ ] Bind Coder's finished, fixed live implementation with real actor/landing/commit services.
- [ ] Reserve the existing movement HUD slot and retire held walking input on boarding.
- [ ] Walk → Enter cab → hold power → brake → stop → reverse → stop → Exit on each real circuit.
- [ ] Ride a moving coach, return/stop at the platform and Exit with no driver controls.
- [ ] Exercise both electric cabs, signal waits, refused/retried actions and tender no-entry.
- [ ] Release on pointer cancel/up/lost capture, keyup, blur/hidden/modal, actor/cab change and disposal; never resume automatically.
- [ ] Restore focus/walking only after confirmed disembark; preserve borrowed session on unmount.
- [ ] Verify desktop/touch/keyboard,320px layout, safe areas and readable brake/refusal states.
- [ ] Include the adjacent original SVG surface in static/package copies; load the scoped stylesheet.
- [ ] For compact, preserve the adjacent compact CSS and exact pinned wood/fonts, OFL notices and source records listed in compact-handoff.json.
- [ ] Bind saved audio preference; verify whistle/chime volume on speakers/headphones, trusted input, mute and scene disposal in the real host.
- [ ] Run final project/package/browser gates on the integrated result; commit exact pins and stop disposable helpers.
