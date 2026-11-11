# Train controls

The optional train HUD binds the real `TrainConnector` from the [drivable train module](drivable-trains.md). Its usage card is `TRAIN_CONTROLS_CARD`, exported with `mountTrainControls` from `@nautilus-engine/map-core/trains/ui`. Load `@nautilus-engine/map-core/trains/style.css` in the host document. Headless core packages contain the train runtime and guide, and omit the DOM controls.

The source/static playtest is `/examples/train-yard.html`. It uses the shared world-size steam and electric fleets, a native goat worker, two continuous rounded circuits and retained walking/support/commit services. The joystick returns after a confirmed exit. A passenger service drives one complete lap and stops back at its platform. An occupied coach has no driver controls.

## Play the yard

Walk with WASD, arrow keys, the on-screen direction buttons or the analog walking joystick. Approach a named entrance and choose its Enter button. Cab entry enables the instrument panel. Coach entry starts a one-lap ride. The coal tender has no entry action.

In a cab, choose Forward or Reverse, set the requested power and hold **Hold power**. Release to brake. The red Brake control takes priority. With the panel focused, F/N/R select direction, up/down adjust power, Space holds power and B brakes. Stop fully before reversing or exiting. The dial and confirmed status always come from the host. Direction and power selections are requests.

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

Theme hooks on `.nautilus-train-controls` are `--rail-panel`, `--rail-ink`, `--rail-muted`, `--rail-brass` and `--rail-brake`. Keep readable brake/refusal states, keyboard labels, focus outlines, reduced-motion behavior and safe-area spacing. Speed enters in m/s and displays in km/h. The component owns no spatial geometry or saved state.

## Review and source

The original UI implementation is fixed at `e898cd60a023577fffc4c5b26c318c0be220b13f`; its isolated fixture/evidence remain source-only. The integrated `public.js` entry adds the usage card while preserving that implementation. Its disconnected fixture is never used as gameplay authority. The [integration record](reviews/2026-11-10-drivable-train-playtest.md) records the real host, correction and combined checks.

Before adopting, verify both fleets' cab and coach paths, stopped supported exits, retained resources, refused/retried actions, pointer/key cancellation, actor/cab changes, pause/modal handling, safe restore and disposal. Run the game's own desktop/touch checks on its exact engine pin. A browser phone viewport establishes layout/input evidence; it is not a physical-device performance measurement.
