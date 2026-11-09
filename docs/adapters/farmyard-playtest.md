# Farmyard solo door playtest

Connect `createFarmyardPlaytestConnector({prepareHost})` to the Workshop's existing `connectGame` entry. The connector validates the full portable export, retains the original JSON it receives, and stages a fresh host before adoption. Farmyard owns the live leaf, movement, sight, AP and save codec. The profile borrows the existing Nautilus door and geometry ceilings.

## Accepted Workshop export

Use `FARMYARD_PLAYTEST_PROFILE` and `preflightFarmyardPlaytest({json, contract})` from `@nautilus-engine/map-core/adapters/farmyard/playtest`. The input is Workshop AFT v2 JSON with all 240 × 240 ground cells at one metre per tile and ground axes `x`, `y`. The profile accepts three to six declared layers with empty upper layers and runs the portable map's full validation.

| Content | Binding |
| --- | --- |
| Ground | Yard, floor, crate cells, asphalt, grass, gravel and concrete |
| Edges | Plain `wall`, `door-wood-closed`, and `door-steel-closed` on canonical east or south ground keys with in-map anchors. At most 256 leaves and 8192 edge and crate entries combined |
| `starts[0]` | One solo actor at the authored cell centre with optional heading. Farmyard supplies the actor and loadout |
| `starts[1..3]` | Portable squad markers retained as source records |
| `exits[0]` | Portable travel marker retained as a source record |
| Start metadata | Blank default Workshop character records and valid identities. Optional heading belongs to the solo spawn |

East anchor `e:20:25` places the leaf at (20.5, 25) metres. South anchor `s:20:25` places it at (20, 25.5) metres. The player's starting cell centre stays (20, 25). The returned session lists the marker roles and coordinates. The full original records, including their character identities, remain in `session.sourceJSON`.

Use empty guards, props, stairs, climbs and canopies. Empty lock and foliage records are allowed. Windows, extra geometry and map extensions, painted foliage, door locks, authored guard records, non-default actor properties, and unbound terrain or edges are refused before staging. Refusals expose `code`, `path`, and a message. `UNBOUND_FOLIAGE` also includes `details.cells`, and `INVALID_MAP` includes the portable validation messages.

## Bind a production host

`prepareHost({authoredMap, signal})` stages the embedding game's ready host offscreen. At the reviewed Farmyard pin, initialize it with `createSoloGame(DEFAULT_BUILD, 1947, WINDOW_REVIEW_ID, {authoredMap})`. Return a fresh host object with a `dispose()` method. The factory owns partial setup until it returns the host. Honor the abort signal and release partial setup on a rejected preparation. The disposer may be asynchronous and should settle independently of the connector's open and disposal promises.

```js
import {createFarmyardPlaytestConnector} from '@nautilus-engine/map-core/adapters/farmyard/playtest';

const connector = createFarmyardPlaytestConnector({prepareHost: stageFarmyardSoloHost});
const disconnect = window.nautilus.connectGame(connector);

const {session, cleanupError} = await window.nautilus.sendToGame();
if (connector.activeSession === session) showFarmyardHost(session.host);
if (cleanupError) reportPlaytestError(cleanupError);

// On teardown, disconnect the Workshop handoff and retire the host.
disconnect();
const disposalError = await connector.dispose();
if (disposalError) reportPlaytestError(disposalError);
```

`stageFarmyardSoloHost`, `showFarmyardHost` and `reportPlaytestError` belong to the embedding application. A successful `openMap` returns `{session, cleanupError}`. The newest valid open owns adoption. Preflight refusals leave active and pending work in place. Supersession or `cancelOpen()` aborts staging and retires any host it later returns. A failed preparation keeps the active host. Adoption publishes the fresh host before retiring the previous one. Disposal waits for outstanding opens and is idempotent. Late candidate cleanup errors are attached to the rejected open. The game saves and reloads the retained state with Farmyard's own `encodeSave` and `decodeSave`.

## Start fixture and proof

In a checkout, call `doorPlaytestDocument(createMapDocument, 'e').export()` using the [start fixture](../../tests/fixtures/farmyard-playtest/door-start.mjs). Its sole door is immediately east of the starting actor. Pass `'s'` for the south-facing steel fixture. Run `node --test tests/farmyard-playtest.test.mjs tests/game-handoff.test.mjs` and `npm run test:farmyard-playtest:installed`.

The proof uses the original Farmyard application hand handler and solo host from commit `4a0bd292ee09abb7f61e743289f5a40f09655b2c`, which contains production playtest change `5cd3f22f40d3009e54405be25bb19c1a6451c06d`. The [test-only provenance](../../vendor/farmyard-playtest/4a0bd292ee09abb7f61e743289f5a40f09655b2c/provenance.json) records exact Git blobs, byte counts and hashes. The pinned test harness supplies a lightweight DOM and view for the production handlers. Browser presentation is checked with the combined editor integration.

For this playtest, Farmyard's production host gives fidelity to the played mission's clearance, AP and persistence. One retained simulation avoids duplicate movement and door work by design. Processor cost is unmeasured. Seeing the authored door change where a player can walk and see is the intended playtest experience.
