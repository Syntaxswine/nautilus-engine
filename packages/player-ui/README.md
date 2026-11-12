# Shared player interface — Stage 1 candidate

This optional source candidate assembles status, one contextual action presenter,
walking input, existing train controls, the existing title flow, notifications,
setup and owned map/inventory slots. It borrows a retained game host. It creates
no actor, world, renderer, game clock, persistence, geometry or rules kernel.

API, configuration and component versions are **1**. The reviewed engine base is
`7f50cb2a48aef87a16fc0465997549be9ed88dc2`, package version `0.10.0`.
The exact engine base, content identity/source pin, actor, component versions,
settings and resolved service bindings travel in exported recipes. This is a
candidate layered on that base; its own files/hashes are in [source.json](source.json).
Architect owns public registration and the final integrated engine pin. No public
`/player-ui` entry or installed-package acceptance is claimed yet.

Start with the [usage card](usage-card.json), [source fixture](fixture/index.html),
[executable consumer](fixture/main.js) and [review evidence](evidence/checks.json).
Each component descriptor points back to this guide and card. A renderer-only or
headless consumer can import descriptors/configuration without creating DOM.

## Connect a retained game once

The fixture contains scene/render/clock policy. Ordinary scene code creates no
walking joystick, key listener, contextual button or setup form. Its only
gameplay-input call per host tick is `ui.advanceInput(seconds)`.

```js
// Source candidate imports, relative to packages/player-ui/fixture/main.js.
import {mountPlayerUI, createPlayerConfiguration,
  createTrainPlayerProvider} from '../index.js';

const content = {id: 'my-retained-yard', version: 1, sourcePin: reviewedCommit40};
const provider = createTrainPlayerProvider({
  host: retainedYard, content, inputElement: canvas,
  setUIPaused: blocked => { uiClockGate = blocked; },
  onHudBounds: bounds => cameraAdapter.useHudBounds(bounds)
});
const ui = await mountPlayerUI(uiSlot, {
  providers: [provider], configuration: createPlayerConfiguration({content})
});
// In the retained host's existing loop, while all clock gates allow it:
ui.advanceInput(Math.min(seconds, .05));
// Host advances its own world and draws its own scene.
// At retirement: await ui.dispose(); then dispose only hosts you own.
```

`retainedYard` supplies the v1 train connector, `walk(x,y,seconds)` and copied
actor resources. This particular adapter supports **player only**, because the
retained yard mover only moves that actor. `setUIPaused` controls an independent
UI clock gate; combine it with other pause owners rather than unpausing an
unrelated game menu. UI retirement releases only its own gate and subscriptions.
The borrowed canvas, host, actor, save, renderer and camera remain game-owned.

Other games can supply registered services matching [descriptors.js](descriptors.js).
The shell's base requires scene read/subscription, a UI pause gate and HUD-bounds
publication. Walking, trains, camera and title are optional selected components.
Missing services, wrong versions/semantics, ambiguous providers and unsupported
configurations produce diagnostics before activation. The generated menu disables
unavailable component choices and explains the connection that is missing.

| Service | Meaning and boundary |
| --- | --- |
| `nautilus.player-scene` | Confirmed actor/context/position/status, exact content identity and actor IDs; `read`, `subscribe` and optional borrowed input element. Ground coordinates are world x/y, height h, in metres. |
| `nautilus.walk-intent` | Request endpoint `request({version:1,actorId,vector:{x,y},seconds})`. Normalized world-ground vector, at most 0.1 seconds; host validates movement/geometry. Pace scales the request, never actor stats. |
| `nautilus.ui-pause` | `acquire(owner)` returns an initially unblocked independent `setBlocked`/`dispose` gate. Its acquisition must not change world/input authority. |
| `nautilus.hud-bounds` | `publish({version:1,viewport,occlusions,safe})`, measured CSS pixels in viewport client coordinates. Rectangles include full readouts, actions, notifications and nonempty extension slots. |
| `nautilus.train-connector` | Existing v1 retained connector: confirmed `readForActor`/`subscribe`, authoritative `dispatch`. Requests still carry exact Expected data, actor, car and lease identities. |
| `nautilus.camera-settings` | Optional `prepare(settings,{signal})` stages UI-only follow/overview and relative zoom. Resolve readiness/refusals here. Return `commit()` and `dispose()`; commit synchronously accepts the prepared state before notifying observers, and disposal frees staging without reverting accepted settings. |
| `nautilus.title-flow` | Optional `options` for existing `mountTitleScreen`, including required title/onStart and optional saved-game metadata/continue/art/credits. Callbacks must honor cancellation. The shell owns visibility, setup, focus and pause hooks. |

Ports also record semantic service/version, request/confirmed/event role, schema,
units/frame, cardinality and ownership/lifetime. Matching two numbers is insufficient.
Descriptor metadata stays outside runtime-core's strict module schema. Validation
compiles it into supported modules/hosts/bindings; existing `startModules` owns
prepare/start/rollback/stop/dispose. This is a UI module, not another lifecycle engine.

## Choose, change, try

Enter, the accessible Setup button, or `{version:1,type:'menu',open:true}` opens
setup. Games can bind a gamepad Start action to that same intent; this candidate
does not install a physical gamepad poller. Native buttons retain Enter activation.
Text fields and menus suppress gameplay. Return/Escape restores the appropriate
walking, driver or title focus; released keys, captures and leases stay released.

The menu generates component choices/settings from `PLAYER_COMPONENTS`, including
the same defaults and change policy consumed by JSON validation and agents.
Farmyard phone, Tinderbox cab and desktop presets select meaningful settings.
Apply validates and prepares the candidate, then closes for an immediate trial.
Export copies the **accepted** recipe into the JSON field. Load validates a draft
for review; Apply activates it. Invalid JSON never replaces the accepted setup.

Skin, walking pace, mute and staged camera settings are live-safe. Skin changes
keep the existing mounted train actuator and its lease/world state. Layout,
steam-control profile and component selection require pause. Exit the train before
removing its controls. Changing retained actor/content or an existing service
binding requires Stage 2 and returns a named refusal. No setting here resets,
heals, refills or replaces a character/save.

The descriptor also selects text, icon-with-text or pictogram actions without
changing their intent/eligibility or accessible names. Presenter CSS can replace
`.pui-action-icon[data-icon-ref="train-entry"]` (or another provider icon reference)
with game art. Keep that decoration inside the existing button; its stable action
binding remains owned by the shell.

Prepared controls live in detached owned DOM and cannot acquire live input.
Cancellation, a newer request (even an invalid one), missing resources or failed
preparation retains the accepted config/view. Behavior changes release old input
before transfer. Failure never replays it. Ownership transfers before retiring
old widgets, so their disposal/visibility callbacks cannot reactivate a new view.
Owned DOM attachment is checked again for cancellation/disposal before acceptance.
The shell then publishes the accepted config and view, ends preparation
cancellation, and enters the prepared camera's non-cancellable `commit()`. That
method must atomically accept its prepared settings before post-update
notifications; readiness refusals belong in `prepare`, not `commit`. Notifications
can re-enter configuration, abort the caller's signal, throw or dispose the UI.
They observe the accepted setup, and the outer result stays `committed:true`.
A newer valid request starts from that setup; a newer invalid request cannot
undo it. Post-update exceptions are reported as committed observer errors through
`onError`. Cancellation before this point keeps the accepted camera/config/view.
Arbitrary host writes outside this staged contract cannot be rolled back by a DOM
shell. Disposal synchronously blocks owned native input, then retires resources.

`mountPlayerUI` accepts an initial AbortSignal; `applyConfiguration` accepts its
own signal. Title metadata may still be pending when mounting returns. `ui.ready`
reports the initial metadata check; `dispose()` is immediately available and
aborts owned title work. Late metadata/start completions cannot restore a retired
title, focus, input or a save. A title callback still owns any game transaction it
starts and must obey its own abort/commit contract.

## One action and control path

```js
const offered = ui.readActions().actions.find(a => a.enabled);
const receipt = ui.dispatch(offered.intent); // same offer as its button/hotkey
const view = ui.readControls();
ui.dispatch({version: 1, type: 'control', context: view.context.token,
  offer: view.train.context, control: {kind: 'notch', notch: 1}});
```

Actions expose stable provider/action/target identities, verb, label, icon reference,
eligibility/reason and an opaque offer. Buttons, touch, E and agent dispatch propose
the same request. E acts only when exactly one eligible action is available.
Generic `actionProviders` let a retained door/item adapter provide that same
descriptor/request contract; its authoritative provider still decides permissions,
costs and confirmation. The Node test uses a door action to exercise this contract.
Real door/item scene adoption remains Stage 4.

`action.id` is an opaque stable key for the provider/action pair, encoded without
slash ambiguity. Use `providerId` and `actionId` separately rather than parsing
that key. Provider IDs and per-provider action IDs are nonempty strings; repeated
IDs within one provider reject the complete offer before presentation. DOM
buttons also expose separate `data-action-provider` and `data-action-id` metadata.

The composed train widget uses `actionPresentation:'external'`, which removes its
internal actionable Enter/Exit nodes and E shortcut. Its standalone default stays
internal. Action offers include the displayed tuple and Expected state; a stale
offer rejects rather than quietly refreshing into a different command. Control
offers bind the actual mount, actor/cab, active lease and control revision. Old
mounts cannot act through new ones, including when command-ID factories share a
mount prefix. Core remains final authority.

Stage 1's train adapter **requires the mounted DOM actuator**, including for agent
requests. It is not a headless default train controller. Agents pass plain data;
they cannot provide audio activation provenance. The native presenter accepts a
branded trusted event only during delivery; fake objects and retained events do
not unlock audio. Confirmed outcome/lease checks still decide cues. Classic agent
drive/brake requests are safe pulses; sustained native holds use existing widget
leases. Compact notches retain their existing accepted latch policy.

One control-context owner switches walking/driver/rider/menu/paused/unavailable,
releasing the old owner first. The shell never advances a world clock. Blur,
hidden page, context changes and disposal clear input. `slots.map` and
`slots.inventory` accept game extensions, with lifetime/disposal owned by that
extension; no inventory system or map gameplay is implied by an empty slot.

## Presentation and proof

Farmyard uses established industrial green grouping and an existing pinned switch
sheet; Tinderbox uses warm timber with the existing pinned wood surface. Train
controls retain their existing artwork/fonts/notices. No donor file, pin or asset
was imported or edited. Asset hashes and byte totals are recorded in source/evidence.
Resource resolution stays in the package origin; a bundler may provide equivalent
same-origin URLs/blobs through `resourceURL`. Import the adjacent `style.css`.

**Accuracy:** share confirmed action identity and retained validation. Classic and
compact remain explicit policies, not physical calibration. **Efficiency:** one
context owner and event-driven HUD bounds reuse existing lifecycle/widgets; CPU,
FPS and adoption-time savings are unmeasured. The clear HUD rectangle is computed
from measured DOM occlusions, including landscape space beside controls.
**Narrative:** Farmyard grouping is preferred provisionally for continuous phone
play; Tinderbox timber/compact is preferred for steam's mechanical character.
Those preferences are subjective. Both skins and desktop/phone profiles remain.

The rapid choose/change/try loop follows Deepnight's official
[Game feel v2 description](https://deepnight.net/games/game-feel/).
No Deepnight code or artwork is included.

Focused checks run with `node --test packages/player-ui/tests/player-ui.test.mjs`,
the existing train Node tests, TypeScript negative controls, and
`node packages/player-ui/tools/review.mjs`. The verifier records source closure,
scope, resources, exact helper lifetimes and released ports. Review browsers and
servers are bounded and close in finally; none is retained.

The [review corrections](evidence/corrections/REVIEW.md) add focused identity and
camera reentry proof on top of `03096098ec51da1bca822a892e7cfe48638e39c5`.
Run `node packages/player-ui/tools/review-corrections.mjs`, then the verifier with
`--corrections --tsc=PATH_TO_EXISTING_COMPILER`. Unaffected baseline evidence is
retained byte-for-byte; the previous camera-disposal expectation is superseded by
the explicit commit point and the focused checks of both activation paths.

- [x] Retained cab entry/control, coach ride/exit and walking/focus; shared UI/agent requests.
- [x] Generated component/settings/preset menu, camera changes and recipe validation/export/import.
- [x] Skin authority preservation; failed, cancelled, superseded and disposed candidate cleanup.
- [x] Native-event provenance, standalone train compatibility, title cancellation and borrowed-host survival.
- [x] Desktop plus 320/390 portrait and 740 landscape browser layouts; measured HUD bounds and accessible names.
- [ ] Installed public package, native actor startup, real yard adoption, physical handset and speaker review.
- [ ] Second door/item scene, measured fresh-builder setup time and final integrated engine gates.

Architect owns registration and Stage 3 adoption/broad gates; Coder owns Stage 2
executable defaults/native actor startup; Stage 4 provides independent reuse.
The fixture is labelled Stage 1 and shows native trains with a player viewpoint.
It makes no placeholder actor, bootstrap, production adoption or release claim.
