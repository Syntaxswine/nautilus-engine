# Reusable train-control HUD

| Field | Candidate contract |
| --- | --- |
| Identity/status | `nautilus-train-controls`, UI candidate v1; no released package export. Engine connector `nautilus-drivable-trains` v1 / `bounded-rail-driver-v1`, fixed pin `32cce619ac1b8930ac7636dc49aa8704ce08cc92`. |
| Guide/example | [UI guide](README.md), [source fixture](fixture/index.html), [engine contract](../../docs/drivable-trains.md). Coder owns the live session and playable reference; Architect integrates shared exports and the two-circuit playtest. |
| Required inputs | Exact `TrainConnector`, actor ID, one host-provided HUD container, its existing walking element, `setWalkingEnabled(enabled)` and focus restoration. The disabling callback must clear the host's held walking input. |
| Optional inputs | Unique `newId(kind)` allocator (default UUID), requested initial power (default35%), `focusWalking()` and `onError(error,{phase})`. IDs must be fresh, synchronous and stable; no world mutations inside allocation. |
| Units/space | UI fits a roughly288–354 CSS px HUD slot, reflowed within safe areas. Host measures that slot for camera/viewport framing. Speed comes in m/s and displays as km/h; no unit changes in commands. Spatial axes/collision are inapplicable to this DOM part. |
| Actions | Snapshot-owned Enter/Exit tuples; local F/N/R and power request; exclusive per-gesture drive lease; exact-original-lease release. Authoritative validation/commit stays in Core/host. No walking or train simulation is duplicated. |
| Lifecycle | One post-commit invalidation subscription. Blur/hidden/modal/focus loss/pointer release/cab change/disposal clear held power. `setBlocked(true)` before opening a host modal; false does not resume power. Dispose UI before retiring its borrowed session. |
| Persistence | Owns no save. Do not persist pointers, keys or lease IDs. Real restore revokes held input and applies neutral/full brake through the connector policy. Preserve World/Miniature and portable railway saves in Core. |
| Game decisions | HUD positioning and camera-safe area, theme, input focus, pause/menus, audio, actual actors/entrances/landing permissions and host-only passenger service. Coal tenders acquire no riding action from artwork. |
| Evidence boundary | Fixed fixture is always disconnected. Browser protocol tests can establish UI release/ownership behavior, not actual train motion/boarding or native content. Real steam/electric loops, moving coach ride, stopped platform exit and game adoption require Architect's combined playtest. |

```js
import {mountTrainControls} from './packages/train-ui/index.js';
// Load packages/train-ui/style.css. session is the fixed real host connector,
// not a replacement simulation. Keep the existing walking control instance.
const ui = mountTrainControls(hudSlot, {
  session, actorId: playerId, walkingElement: existingJoystick.element,
  setWalkingEnabled(enabled) { existingJoystick.setEnabled(enabled); },
  focusWalking() { gameInputSurface.focus(); }
});
// Before host modal/scene pause: ui.setBlocked(true).
// After closing: ui.setBlocked(false). Old held power does not resume.
// On selected actor replacement: ui.setActor(nextActorId).
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
`setBlocked(bool)`, `setActor(id)`, readonly presentation `state`, and idempotent
`dispose()`. It reports synchronous dispatch outcomes but rereads for display.
The UI cannot turn a successful callback or preview into occupancy/drive authority.
Unknown/malformed transport outcomes disable controls and report the error;
never automatically replay an action with a replacement ID.

Theme variables are `--rail-panel`, `--rail-ink`, `--rail-muted`, `--rail-brass`
and `--rail-brake` on `.nautilus-train-controls`. Keep brake/readout contrast,
labels, focus outline and reduced-motion behavior when reskinning. Steam and
electric share the restrained enamel/cream/brass panel. The walking joystick
returns in its original host slot; no second keyboard/movement owner is created.

## Design evaluation

Accuracy: prefer a separate direction request and prominent brake over a single
unlabelled throttle joystick. Requested state remains distinct from confirmed
speed/direction/power. Cab-relative commands are passed unchanged; Core owns
stop-before-reverse, signals and occupancy. This is game control mapping, not
calibrated locomotive instrumentation.

Efficiency: the component renders on invalidation/input, reuses its panel DOM,
borrows the host clock and creates no renderer/textures. This is a code-based
estimate; no hardware/FPS benchmark is claimed. Keep the same small controls for
both stock profiles instead of separate control systems.

Narrative: the painted green enamel, warm brass, cream dial and red brake follow
the existing Farmyard/Nautilus art language and original railway timber/steel.
Prefer this restrained shared skin for the requested steam/electric playtest;
games can change theme tokens. This is a visual judgment to review at desktop
and narrow-phone sizes, including actual shared stock/actors in the final host.

## Adoption checklist

- [ ] Bind Coder's finished, fixed live implementation with real actor/landing/commit services.
- [ ] Reserve the existing movement HUD slot and retire held walking input on boarding.
- [ ] Walk → Enter cab → hold power → brake → stop → reverse → stop → Exit on each real circuit.
- [ ] Ride a moving coach, return/stop at the platform and Exit with no driver controls.
- [ ] Exercise both electric cabs, signal waits, refused/retried actions and tender no-entry.
- [ ] Release on pointer cancel/up/lost capture, keyup, blur/hidden/modal, actor/cab change and disposal; never resume automatically.
- [ ] Restore focus/walking only after confirmed disembark; preserve borrowed session on unmount.
- [ ] Verify desktop/touch/keyboard,320px layout, safe areas and readable brake/refusal states.
- [ ] Run final project/package/browser gates on the integrated result; commit exact pins and stop disposable helpers.
