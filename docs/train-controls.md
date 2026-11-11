# Train controls

The optional train HUD binds the real `TrainConnector` from the [drivable train module](drivable-trains.md). Its usage card is `TRAIN_CONTROLS_CARD`, exported with `mountTrainControls` from `@nautilus-engine/map-core/trains/ui`. Load `@nautilus-engine/map-core/trains/style.css` in the host document. Headless core packages contain the train runtime and guide, and omit the DOM controls.

The source/static playtest is `/examples/train-yard.html`. It uses the shared world-size steam and electric fleets, a native goat worker, two continuous rounded circuits and retained walking/support/commit services. The joystick returns after a confirmed exit. A passenger service drives one complete lap and stops back at its platform. An occupied coach has no driver controls. Steam starts with the Tinderbox notched lever; the **Steam controls** selector also offers the full panel. Switching releases the previous authority and preserves actor resources and mute.

## Play the yard

Walk with WASD, arrow keys, the on-screen direction buttons or the analog walking joystick. Approach a named entrance and choose its Enter button. Cab entry enables the instrument panel. Coach entry starts a one-lap ride. The coal tender has no entry action.

The compact steam control adapts Tinderbox's raised wooden grip and square gate. F II uses full power, F I half power, N coasts with power and brake released, and R uses half reverse power. Normal finger release keeps the accepted notch engaged. Pull the chain to select neutral/full brake. Brake to a complete stop before reversing. Refused shifts retain the accepted gear, and the grip follows confirmed state. Arrow keys select notches; Home selects R, End selects F II and B brakes.

The full steam panel uses warm painted timber, iron and brass. Drag its reverser to Forward, Neutral or Reverse, set the requested power and hold **Hold regulator**. Pull its hanging brake chain to brake. Electric uses a separate cool commuter fascia with direction buttons, a brake paddle and confirmed traction, aboard and brake lamps. Aboard indicates occupancy; the connector has no physical door sensor.

In the full steam/electric panel, release the regulator/power control to brake; the brake chain or paddle takes priority. With that panel focused, F/N/R select direction, up/down adjust power, Space holds power and B brakes. Stop fully before exiting. The dial and lamps always follow confirmed host state. Lever direction and power selections are requests.

A sparse synthesized steam whistle follows the first confirmed departure under the current input owner; commuter chimes follow confirmed boarding/exit. Accepted compact shifts also produce a short click. Mount, restore, repeated updates, refused requests and boundary jitter stay silent. Audio requires a trusted interaction. The Sound button mutes it; hosts can supply `muted` and call `controls.setMuted(boolean)`. The host owns preference persistence. Disposal stops active sounds and closes the component's own audio context. These are short WebAudio approximations, with no recorded locomotive sound or physical-speaker calibration claimed.

Use Overview to see both circuits and Follow player to return to the nearby view. Save and Reload preserve the complete actor/train checkpoint. Reload releases held input and brakes. A restored passenger service requires the explicit Resume button after stopping.

## Bind a retained game

```js
import {mountTrainControls} from '@nautilus-engine/map-core/trains/ui';

// The game supplies its already-bound TrainConnector and existing joystick.
const controls = mountTrainControls(hudSlot, {
  session: game.connector,
  actorId: playerId,
  steamProfile: 'compact-notched', // Optional; default 'classic' preserves existing behavior.
  walkingElement: joystick.element, // A direct child of hudSlot.
  setWalkingEnabled(enabled) {
    joystick.setEnabled(enabled);
    if (!enabled) gameInput.clearHeldWalking();
  },
  focusWalking() { gameInput.element.focus(); }
});

// Before a host pause or modal, release the existing input owner.
controls.setBlocked(true);
// Closing the modal does not resume power.
controls.setBlocked(false);
// Retire the UI before disposing or replacing its borrowed session.
controls.dispose();
```

The host supplies `game.connector`, the actor ID, a HUD element, its direct-child walking control, and the walking input enable/clear/focus callbacks. These illustrative joystick/game-input names are retained host adapters. The component creates no joystick, physics, world, renderer, actor, clock or save system. `createTrainSession` supplies the matching runtime contract. The fixed [retained yard host](https://github.com/Syntaxswine/nautilus-engine/blob/86e8a6c3cccbeb67cd96a2a02d5d1c383d1c9114/examples/train-yard-host.js) demonstrates actual actor, access, landing and atomic-commit bindings.

Mount returns `element`, `refresh`, `releaseInput`, `setBlocked`, `setActor`, presentation `state` and idempotent `dispose`. State reports the configured `steamProfile` and confirmed `notch` (0=F II, 1=F I, 2=N, 3=R; null outside compact steam). Electric always retains its existing controls. To change the configured profile, release/dispose the old mount before binding a replacement to the same retained session. It borrows the slot, walking element and session. Only its own DOM, subscriptions and input listeners are retired. Disposal while occupied keeps walking disabled until the host assigns another input owner. Confirmed disembark restores walking/focus.

The runtime owns exclusive input leases. Classic held controls release on key/pointer release; compact's normal release ends its drag while retaining the accepted notch lease. Safety cancellation, lost capture during a gesture, pause, blur, hidden page, actor/cab change and disposal retire the original actor/lease. A second finger's chain takes priority. A late release cannot control a new occupant. No pointer press or latched authority is saved/replayed by the UI. The host owns action validation, effects, resources, authority and persistence.

Stock skin selection on `.nautilus-train-controls` follows authoritative `data-stock`. Preserve `style.css`, adjacent `compact.css`/`art/steam-cab-surface.svg` and their resource layout. Compact uses the pinned wood PNG and Besley/Old Standard regular TTF files under `vendor/tinderbox-train-controls/fb0628605c274550ff8abad50b151843f08747d1/`, with source records and full font notices. The three binaries total 3,116,098 bytes and load only for compact controls; classic/electric do not fetch them. The compatibility package explicitly includes these files; headless Core omits their binary/UI payload. Keep readable brake/refusal states, keyboard labels, focus outlines, reduced-motion behavior and safe-area spacing. Speed enters in m/s and displays in km/h. The component owns no spatial geometry or saved state.

## Review and source

The reviewed UI implementation is fixed at `004d244397fc88a2c411388dd9046858772c020e`, retaining the classic behavior from `5577773727b757c3142cb2ded0a10315e25cd41d` and adapting Tinderbox `fb0628605c274550ff8abad50b151843f08747d1`. Its isolated fixture/evidence remain source-only. The integrated `public.js` adds the usage card and profile discovery while preserving the reviewed implementation. Its disconnected fixture is never gameplay authority. The [Tinderbox integration record](reviews/2026-11-11-tinderbox-train-controls.md) records the source, choices and combined checks; the [original train integration](reviews/2026-11-10-drivable-train-playtest.md) records the foundation.

Before adopting, verify both fleets' cab and coach paths, stopped supported exits, retained resources, refused/retried actions, pointer/key cancellation, actor/cab changes, pause/modal handling, safe restore and disposal. Run the game's own desktop/touch checks on its exact engine pin. A browser phone viewport establishes layout/input evidence; it is not a physical-device performance measurement.
