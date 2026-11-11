# Drivable trains

Candidate contract checkpoint, API/profile v1. Starting railway/content pin is `8efe3da49186f36b07e19da9a31777fe46a71874`. This checkpoint freezes the connector, types and an executable, explicitly disconnected UI fixture. The live session implementation follows in this branch. It is not yet a released package or a donor-game adoption.

Card metadata is `packages/train-core/contract.js`. Types are `packages/train-core/index.d.ts`. UI owns `packages/train-ui/` and its visual demo. Coder owns train behavior, entrances, retained-host connector and the playable reference. The architect owns shared export/package integration.

## UI connection

Bind a `TrainConnector`, actor ID and a host-owned HUD slot. The UI borrows the slot, replaces walking controls only while the authoritative snapshot says driver/rider, and returns the slot on disposal. The session does not access DOM, input devices, storage, renderer or an internal clock.

Call `readForActor(actorId)` once, then `subscribe(() => render(session.readForActor(actorId)))`. Subscription is post-commit invalidation, not an immediate callback. Dispose the returned unsubscribe function. Snapshots are detached data. UI may format `speedMps * 3.6` as km/h; all command and simulation units remain metres/seconds. Ground points use `{x,y,h}`; Three uses `(x,h,y)`.

An on-foot snapshot has contextual `actions`, including refused actions with `enabled:false`, `code` and `reason`. Copy its `action.command`, append a fresh `commandId`, then dispatch. Never issue an action merely because it was previewed. Enter and Exit revalidate reach, stopped speed, authority and the actual landing. Driver mode enables drive controls. Rider mode only exposes status and Exit. `trainId`, indexed `carId` and named `entranceId` identify the actual occupied car; duplicate coach model names are not identities. `cabFacing` is +1/-1 relative to the train's authored itinerary, including the rear electric cab.

Drive commands carry the current snapshot's `expected`, `trainId`, a fresh `commandId`, an input-owner `leaseId`, `direction` (`forward|neutral|reverse`), `power` 0..1 and `brake` 0..1. The first accepted drive acquires that exclusive lease for that actor, train and occupancy lifetime. Reuse it for that gesture/input owner. A second lease cannot take over. Direction is relative to the occupied cab. Neutral allows coasting; changing the physical travel direction requires a stop. Drive input never grants boarding authority.

On pointer cancellation/release, blur, hidden/modal UI, actor/cab change or disposal, send `{type:'release', actorId: originalActorId, commandId: freshId, leaseId: originalLeaseId}`. Exact-lease release bypasses stale expected revisions and sets power 0, neutral and full brake only on its original still-owned cab. A closed/unknown lease returns a harmless refusal and cannot affect a new driver or lease. Released lease IDs are never reusable. Generate unique IDs per mount/gesture and persist no pointer presses. A new gesture acquires a new lease. The host can release a lease too when revoking an input source. Release is not an emergency-brake permission for another actor.

Dispatch acknowledgement reports `ok,committed,code,reason,commandId,repeated,observerErrors`. An accepted synchronous dispatch has committed before post-commit subscribers run. Always render by rereading; refusal changes no occupancy or resources. Repeated identical command IDs return the original outcome with `repeated:true`, without repeating effects. Reusing an ID for another payload refuses. A refused intent needs a new command ID after the condition changes. Revisions catch stale previews and out-of-order control updates; the lease release is the deliberate exception. The bounded durable journal never silently evicts receipts.

The fixture below is executable now and always returns `FIXTURE_ONLY` from dispatch. It cannot be mistaken for a gameplay session.

```js
import {trainConnectorFixture} from '../packages/train-core/connector-fixture.js';
const session = trainConnectorFixture('driver');
const snapshot = session.readForActor('player');
console.log(snapshot.mode, snapshot.train.controls, snapshot.actions[0].label);
```

## Runtime and persistence target

The live session will retain host actor identity, inventory, health and resources. Required services provide actor reads, pure access/landing queries and atomic movement/authority commits. Host time advances independently controlled trains through the shared protected track. A separate `nautilus-train-checkpoint` v1 stores motion, occupancy, active cab, switches and command/lease receipts with matching authored content. Portable railway map versions 4–6 stay unchanged. Restore stages the full checkpoint, revokes held input, applies neutral/full brake and preserves motion/attachment without replaying entry effects. Unknown or incompatible content refuses before adoption.

## Acceptance checklist

- [ ] Bind the live public session and retained actor/access/landing/commit services.
- [ ] Walk to a named cab entrance, Enter, accelerate, brake, stop, reverse, stop and Exit.
- [ ] Ride each coach without driving authority; deny coal-tender entry.
- [ ] Check both electric cab facings and moving car-local entrance/attachment anchors.
- [ ] Check independent speeds, reverse diamonds/turnouts, reservations and occupied exits.
- [ ] Check competing drivers, stale/repeated commands, blocked landing and resource preservation.
- [ ] Save/reload motion, occupied car, cab and switches; restore neutral/full brake without one-shot effects.
- [ ] Review real desktop/touch input release and native shared trains/actor artwork.
- [ ] Run delivery gates, record the fixed final pin/evidence and stop disposable helpers.
