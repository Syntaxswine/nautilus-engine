# Train controls

The optional train HUD binds the real `TrainConnector` from the [drivable train module](drivable-trains.md). Its usage card is `TRAIN_CONTROLS_CARD`, exported with `mountTrainControls` from `@nautilus-engine/map-core/trains/ui`. Load `@nautilus-engine/map-core/trains/style.css` in the host document. Headless core packages contain the train runtime and guide, and omit the DOM controls.

The source/static playtest is `/examples/train-yard.html`. It uses the shared world-size steam and electric fleets, a native goat worker, two continuous rounded circuits and retained walking/support/commit services. The joystick returns after a confirmed exit. A passenger service drives one complete lap and stops back at its platform. An occupied coach has no driver controls.

## Play the yard

Walk with WASD, arrow keys, the on-screen direction buttons or the analog walking joystick. Approach a named entrance and choose its Enter button. Cab entry enables the instrument panel. Coach entry starts a one-lap ride. The coal tender has no entry action.

The steam cab uses warm painted timber, iron and brass. Drag its mechanical reverser to Forward, Neutral or Reverse, set the requested power and hold **Hold regulator**. Pull its hanging brake chain to brake. Electric uses a separate cool commuter fascia with direction buttons, a brake paddle and confirmed traction, aboard and brake lamps. Aboard indicates occupancy; the connector has no physical door sensor.

Release the regulator/power control to brake; the brake chain or paddle takes priority. With the panel focused, F/N/R select direction, up/down adjust power, Space holds power and B brakes. Stop fully before reversing or exiting. The dial and lamps always follow confirmed host state. Lever direction and power selections are requests.

A sparse original synthesized steam whistle follows the first confirmed departure under the current input owner; commuter chimes follow confirmed boarding/exit. Mount, restore, repeated updates and refused requests stay silent. Audio requires a trusted interaction. The panel's Sound button mutes it; hosts can supply `muted` and call `controls.setMuted(boolean)`. The host owns preference persistence. Disposal stops active sounds and closes the component's own audio context. These are short WebAudio approximations, with no recorded locomotive sound or physical-speaker calibration claimed.

Use Overview to see both circuits and Follow player to return to the nearby view. Save and Reload preserve the complete actor/train checkpoint. Reload releases held input and brakes. A restored passenger service requires the explicit Resume button after stopping.

## Bind a retained game

```js
import {mountTrainControls} from '@nautilus-engine/map-core/trains/ui';

// The game supplies its already-bound TrainConnector and existing joystick.
const controls = mountTrainControls(hudSlot, {
  session: game.connector,
  actorId: playerId,
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

Mount returns `element`, `refresh`, `releaseInput`, `setBlocked`, `setActor`, presentation `state` and idempotent `dispose`. It borrows the slot, walking element and session. Only its own DOM, subscriptions and input listeners are retired. Disposal while occupied keeps walking disabled until the host assigns another input owner. Confirmed disembark restores walking/focus.

The runtime owns an exclusive input lease per gesture. Cancellation, lost capture, key release, focus loss, blur, hidden page, actor/cab change and disposal release the original actor/lease. A late release cannot control a new occupant. No pointer press is saved or replayed. The host owns action validation, effects, resources, authority and persistence.

Stock skin selection on `.nautilus-train-controls` follows authoritative `data-stock`. Preserve the stylesheet's adjacent `art/steam-cab-surface.svg` and original-art reference record when packaging. Keep readable brake/refusal states, keyboard labels, focus outlines, reduced-motion behavior and safe-area spacing. Speed enters in m/s and displays in km/h. The component owns no spatial geometry or saved state.

## Review and source

The reviewed mechanical UI implementation is fixed at `5577773727b757c3142cb2ded0a10315e25cd41d`, following original candidate `e898cd60a023577fffc4c5b26c318c0be220b13f`. Its isolated fixture/evidence remain source-only. The integrated `public.js` entry adds the usage card while preserving the reviewed implementation, including its optional mute API. Its disconnected fixture is never used as gameplay authority. The [integration record](reviews/2026-11-10-drivable-train-playtest.md) records the real host, correction and combined checks.

Before adopting, verify both fleets' cab and coach paths, stopped supported exits, retained resources, refused/retried actions, pointer/key cancellation, actor/cab changes, pause/modal handling, safe restore and disposal. Run the game's own desktop/touch checks on its exact engine pin. A browser phone viewport establishes layout/input evidence; it is not a physical-device performance measurement.
