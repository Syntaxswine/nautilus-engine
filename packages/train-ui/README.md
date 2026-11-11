# Train controls

The default **classic** controls are integrated in fixed engine base
`4d0f7e495d75a607c9bc4c026ab100c50e7c07b4`. This bounded revision adds the
explicit steam-only **compact-notched** profile, adapted from Tinderbox commit
`fb0628605c274550ff8abad50b151843f08747d1`. The v1 connector semantics remain.
The [builder card](USAGE-CARD.md) defines ownership; the [compact guide](COMPACT-PROFILE.md)
explains persistence, coasting, cancellation and its pinned resource closure.
Architect owns the final rendered-yard integration and combined delivery.

The optional DOM module is `index.js`, re-exported by the existing `public.js`;
load `style.css` in the same document. It imports the adjacent `compact.css`.
Keep the adjacent `art/steam-cab-surface.svg` URL available with the stylesheet.
Compact also needs its pinned wood/fonts and OFL notices; see the exact
[packaging handoff](compact-handoff.json). The public facade, root package/build,
examples and consumer pins are unchanged by this revision. The UI owns
no simulation clock, railway kernel, actor/occupancy rule, renderer or saved state.

```js
const ui = mountTrainControls(hudSlot, {
  session, actorId: playerId, walkingElement: existingWalking.element,
  setWalkingEnabled: enabled => existingWalking.setEnabled(enabled),
  steamProfile: 'compact-notched', // omit for classic; electric stays classic
  muted: settings.audioMuted
});
```

Compact has four power notches: F II (100%), F I (50%), N (coast) and R (50%).
Finger release ends the drag and keeps an accepted notch engaged. Pulling the
chain selects neutral/full brake; cancellation, blur, hidden/modal state,
context changes, revocation and disposal still retire the exact owned lease.
A refused shift rereads confirmed controls; stationary drag never retries it.
Mount/reload acquires no authority and emits no cue. It keeps the same contextual
Enter/Exit, walking gates and mute controls. `state.notch` is a confirmed display,
not a save or a way to grant input authority.

The connector's `snapshot.train.stock` chooses the skin. Steam has an original
ochre/timber, brass and iron fascia, a draggable three-detent **reverser** and a
**pull-chain brake**. Electric has a cool commuter fascia, direction buttons,
a brake paddle and confirmed traction/occupancy/brake lamps. No door-closed
indicator is implied: the connector has no physical door state.

With the default classic profile, the reverser and direction buttons select the driver's request. Drag up for
forward, centre for neutral and down for reverse; arrows and Home/End also work.
The dial, applied power and braking read only the latest actor snapshot. Choose
a direction and power setting, then hold **Hold regulator / Hold power**
(pointer, Space/Enter while focused).
Release applies the original lease's neutral/full-brake policy. **B** or the red
brake takes priority over a power gesture. Grabbing the chain applies full brake
immediately; pulling moves its grip. Release/cancel retires its original lease.
F/N/R and up/down set the requested
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

Ordinary successful commands produce no visible confirmation paragraph.
Electric lamps reflect confirmed power with no brake/hold, confirmed occupancy,
and confirmed brake respectively. Steam gives one short departure whistle per
boarding after the player's accepted power lease actually starts moving.
Electric gives a restrained boarding/exit chime after its own committed action
changes occupancy. Mount, restore, subscriptions, refusals, repeated results
and individual throttle changes never generate a cue by themselves.

Audio is an original small WebAudio synthesis, an approximation rather than a
recording. It requires a trusted user gesture and an available running context;
unsupported/suspended audio stays silent without queuing a stale cue. The
labelled Sound button and `ui.setMuted(true)` mute it. Pass `muted` from host
settings; save `ui.state.feedback.muted` before unmount if the player changed it.
The component owns and closes its audio context, nodes and listeners. Reduced
motion removes lever/chain transitions; indicators remain steady. Refusal text
and accessible requested/confirmed readouts remain available without sound.

Run the disconnected fixture with a short-lived source HTTP server and open
`/packages/train-ui/fixture/index.html`. `node packages/train-ui/tools/review.mjs`
owns a bounded isolated browser/server and closes both in `finally`. Screenshot
and UI evidence are stored under `evidence/`; the [mechanical review](evidence/MECHANICAL-REVIEW.md)
records the earlier classic revision. The [compact review](evidence/COMPACT-REVIEW.md)
records current evidence. The visible fixture always returns `FIXTURE_ONLY`.
Focused browser checks also bind the actual retained yard/Core connector with
explicit ticks, without claiming rendered/native-art acceptance. Node tests in
`tests/feedback.test.mjs` and `tests/compact.test.mjs` cover cue gating, detents,
real authority, coasting and checkpoint revocation. Fixture artwork is an original
code-native layout illustration, not shared train/actor acceptance. The live
playtest must use the actual railway/rolling-stock and character assets.
