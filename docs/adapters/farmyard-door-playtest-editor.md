# Send a Workshop door map to Farmyard

Use the optional [Workshop binding](../../examples/farmyard-door-playtest.js) once the built Workshop exposes `window.nautilus`. The embedding application supplies a Farmyard host. **Settings → Send to game** stages the current map and reports refusals in Settings. If the map has painted foliage, clear it with the Workshop foliage tool or undo the stroke before sending again.

The host factory receives `{authoredMap, signal}`. At the reviewed Farmyard pin, initialize the solo game with `createSoloGame(DEFAULT_BUILD, 1947, WINDOW_REVIEW_ID, {authoredMap})`. Stage the game offscreen and return a ready host with a `dispose()` method. Honor the abort signal and clean up partial setup if staging fails. The Workshop binding works with the connector copied into the build. A bundled application can use the same recipe with the optional installed connector and its core peer. [Connector installation and accepted map profile](farmyard-playtest.md)

```js
import {bindFarmyardDoorPlaytest} from './examples/farmyard-door-playtest.js';

const binding = bindFarmyardDoorPlaytest(window.nautilus, stageFarmyardSoloHost);
binding.events.addEventListener('open', ({detail: {session, cleanupError}}) => {
  if (cleanupError) reportPlaytestError(cleanupError);
  if (binding.activeSession === session) showFarmyardHost(session.host, session.markers);
});

// When the embedding application removes the game.
const disposalError = await binding.dispose();
if (disposalError) reportPlaytestError(disposalError);
```

Show the first Workshop start, `starts[0]`, as **Solo start**. The other three starts are **Squad markers (retained)** and the exit is **Travel marker (retained)**. Farmyard supplies one actor at the solo start. The other markers remain in the original map records in `session.sourceJSON` for the embedding application to display.

A successful send presents the retained Farmyard host after adoption. Use its native hand action, movement, sight, AP and save controls. A refused map keeps the current game and the Workshop undo stack. The `open` event carries any cleanup error from replacing an earlier host. When the embedding is removed, `dispose()` disconnects Send to game and retires the host.

Run `npm run build` and `node tools/review-farmyard-door-playtest.mjs` to replay the browser proof in isolated Edge on Windows. The driver opens a compatible yard through the Workshop import control, places the wood door with the canvas tool, and clicks Send to game. It uses Farmyard's original hand and save/resume controls in a test iframe. The view is lightweight. The driver uses the game simulation to position the actor and sets the player phase for the occupied-close and 1 AP checks. The foliage proof uses the canvas brush and Settings at 390 CSS pixels, then exercises Workshop undo/redo and host detach. The pinned game snapshot and test view are served only by the review harness. Evidence and cleanup receipts are written under `artifacts/farmyard-door-playtest-editor/`.
