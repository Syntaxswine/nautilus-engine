# Drivable trains

Implemented candidate, API/profile v1. Starting railway/content pin is `8efe3da49186f36b07e19da9a31777fe46a71874`. Connector checkpoint is `32cce619ac1b8930ac7636dc49aa8704ce08cc92`. The live entry is `packages/train-core/index.js`; the architect owns final package/export integration and the four full delivery gates on the combined Coder/UI result. This candidate is not a donor-game adoption. Runtime code has no DOM, storage, renderer, timer or random source.

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

## Retained host and clock

`createTrainSession({routes,placements,actorIds,host,checkpoint?})` validates the authored railway and binds 1–64 retained actors, with at most one steam and one electric consist. Missing services reject before adoption. A game gives UI only the three-method connector facade. Keep `advance`, checkpoint, switch and disposal authority in the retained host.

| Host service | Required behavior |
| --- | --- |
| `readActor(id)` | Detached finite plain JSON. Retain `id,revision,position,floorId,radiusM,heightM,mode,attachment`; keep arbitrary game resources alongside them. On foot requires `mode:'on-foot',attachment:null`. Aboard uses the selected indexed car ID as dynamic `floorId` and `{trainId,carId,entranceId}` attachment. |
| `canEnter({actor,entrance,train})` | Pure live access/clearance/permission query returning `{ok:true}` or `{ok:false,code,reason}`. Include the actual approach, boarding route and any game restrictions. Core repeats reach, stopped speed, native body fit, entrance occupancy and single-driver checks. |
| `landing({actor,entrance,train})` | Pure live support, full body clearance and occupancy query. Return `{ok:true,landing:{position,floorId,surfaceId}}` beside the selected moving entrance, or a useful refusal. Include actual floor elevation, train bodies and other actors; no guessed safe ground. |
| `commit({reason,changes})` | Synchronous atomic compare-and-commit of **all** expected actor revisions. Each patch contains only `position,floorId,mode,attachment`. Retain every other actor resource. Return `{ok:true}` only after the writes are durable in the host authority, or an explicit refusal. A refusal or throw must write nothing. Do not throw after committing. |

Use one synchronous authority. Pure queries and host commits must not mutate/re-enter the session. Reentrant mutation returns `SESSION_BUSY`; post-commit subscriber exceptions are counted in `observerErrors`, without rolling back accepted state or replaying effects. The journal retains accepted and refused outcomes. At its 4,096-receipt bound, reserved slots still allow exact-owner input releases; other commands refuse until a deliberate host migration. There is no silent eviction. Data has a four-million-character/250,000-node JSON budget, revisions are bounded at 1e9 and circuit odometers at ±1e9 m.

Retired input IDs and active leases share an 8,192-ID capacity. Acquisition reserves its eventual retirement slot; a new lease returns `LEASE_LIMIT` when no slot remains. Existing owners can still update/brake/release, and stopped actors can still exit. Releasing, exiting or restoring moves that owner's reserved slot to the retired set without increasing total usage. A checkpoint with 8,192 retired IDs and no active lease is valid and restores repeatedly with neutral/full brake; there is no reserve for unoccupied trains. Restore rejects a checkpoint whose retired IDs plus active owners exceed capacity. A deliberate host migration is required for fresh input after exhaustion; ordinary save/reload does not erase IDs or renew old input authority.

Call `session.advance(seconds)` with 0–1 explicit host-clock seconds. Pause time at a menu. The kinematic profile accelerates, coasts, brakes and allows reverse only from a stop. World stock caps at 10 m/s with .8 m/s² traction, 1.6 m/s² service braking and .08 m/s² coasting loss. Miniature uses 3, .5, 1.2 and .06 respectively. These are game parameters, not calibrated railway physics. Protected-track holds and itinerary ends force a safety stop; requested input resumes after a signal clears. Every train has an independent signed travel budget and its own speed.

Open-route motion uses shared diamond/turnout protection in both directions. A train retains its selected itinerary through reversal until every car clears the divergence; a switch request cannot move points under protected occupancy. `setTurnout(routeId,'main'|'branch')` is host authority. Signals remain shared with legacy automatic playback. The old nonnegative `advance`/reset playback API and Miniature saves retain their behavior.

The optional runtime-only route field `circuit:true` closes distinct ordered waypoints through a real final tangent curve. Do not repeat the first point. The current circuit profile deliberately supports independent nonintersecting loops, one consist per loop, without turnouts or crossings; mixed open/circuit layouts refuse. Modular signed distance preserves every car across the seam, including reverse. This extension is outside portable map data; **portable map versions 4–6 do not change**. To render matching loops use `createRailwayKit(THREE).createCircuit(waypoints,radiusM)`.

## Entrances and retained actor presentation

`railwayCarEntrances(profile,modelId)` contains named car-local points in `{x,y,h}`. `railwayEntrancesForTrain(state)` applies the actual car pose, including a reversed electric cab, and provides stable indexed `carId`, `position`, `attachedPosition`, native width/head clearance and outward direction. Train views attach matching named Three groups to the model. Duplicate steam coaches have separate identities. Steam rear-cab openings and coach vestibule steps follow their sculpt coordinates; electric doors follow the side-door positions. Coal tenders expose no entry. Actor reach and access remain live host checks.

Boarding is a settled context transaction onto a retained car attachment. It does not simulate climbing animation or open a visual train door. Riding follows that car through curves, reversal and a circuit seam; walking stays gated by host mode. Consumers bind interior/camera/rig presentation separately. The reference hides actors inside opaque closed cars and shows their retained attachment marker. It uses the existing native goat worker and original shared world-size trains, with no character or collider resizing. Ordinary adult-sized actors cannot fit Miniature apertures; compatible small actors can use that profile. A game needing larger Miniature passenger cabins needs a separately reviewed art/geometry profile.

## Working reference and saves

Run the source/static `/examples/train-yard.html` with the project server. Its retained host is `examples/train-yard-host.js`. Two side-by-side rounded circuits each carry one world-size fleet. Walk normally using the existing interaction walker with ground support and live oriented train-body clearance. Cab entry supplies manual forward/reverse/brake. Coach entry at the boarding platform gives the actual station operator a cab lease for one lap, then brakes and exits at the platform. The passenger never receives drive authority. A manual train stopped away from its platform offers cab driving; an unstaffed coach there refuses passenger service with a return-to-platform explanation. Reverse and shared signals are exercised separately on the open-route fixtures.

```js
import {createTrainYardHost} from '../examples/train-yard-host.js';
let game = createTrainYardHost();
const before = game.connector.readForActor('player');
const enter = before.actions.find(action => action.enabled);
game.connector.dispatch({...enter.command, commandId: 'example/enter'});
// The host owns explicit time and retains its actor resources.
game.advance(.05);
const save = game.save();
const candidate = createTrainYardHost(save); // Stage complete actors + trains.
game.dispose(); game = candidate;          // Adopt only after validation.
```

`session.checkpoint()` returns a separate `nautilus-train-checkpoint` v1 with exact authored content identity, motion/path history, occupancy, active cab, switch selections and command/lease receipts. Persist it **atomically with the matching retained actors/resources**. Restore by creating a candidate session with that checkpoint and host actor save before replacing the active pair. The constructor validates the complete set, car positions, resources/attachments and receipt consistency without calling commit or replaying entry effects. Unknown fields/versions, changed content, overlapping trains or mismatched actors refuse. The host owns any deliberate migration.

Restore revokes all held input, preserving signed speed and exact car/actor poses while applying neutral/full brake. The next host-clock steps brake safely. A passenger service restores paused and requires the explicit **Resume passenger service** host action after the train stops; no saved pointer or operator power restarts on load. The reference Save/Reload buttons use one complete host envelope and preserve injured/spent resources. A restored original command receipt can acknowledge its old outcome; reread present state rather than replaying its effects.

Dispose after adopting a replacement or retiring the owning host. Disposal releases input/listeners and no borrowed renderer, actor resource or host service. It does not silently eject occupants. A replacement must preserve the saved attachment, or the host must first arrange a safe stopped exit. The reference view owns its own WebGL renderer/assets and retires them on page exit.

## Design choice and limits

For this tactical-game reference, prefer bounded kinematic rail motion over a rigid-body/steam/traction simulation. It represents acceleration, braking, cab direction, continuous cars and protected track, while omitting wheel slip, mass-dependent tractive effort, derailment, slopes and physical collision response (**accuracy**, code-based description). At most two consists and .25 m reservation substeps bound the shared traffic work; circuit sampling reuses fitted curves (**efficiency**, code estimate, no frame-rate claim). A legible lap with manual cab controls makes boarding and riding meaningful without a complex yard (**narrative**, subjective preference). Keep legacy playback for editor previews. A railway simulation game should revisit the richer physics choice with measurements.

The reference supplies a flat supported yard, conservative oriented train bodies for walking and a single native actor profile. It does not certify arbitrary train interiors, meshes, multiplayer networking, consumer-game maps or pedestrian/train collision response. Circuit interlock graphs and passenger stop requests are follow-up work; this reference always finishes one lap at its platform. The Coder reference has plain temporary host controls; the separately owned UI panel is integrated/reviewed by the architect. No public export, consumer pin, donor file or private Sites audience is changed here.

## Acceptance checklist

- [x] Bind the source candidate session and retained actor/access/landing/commit services. Public installed-package adoption remains the architect's integration check.
- [x] Walk to named cab entrances, Enter, accelerate, brake, stop, reverse, stop and Exit on both fleets.
- [x] Ride both fleets' coaches with a real operator and no passenger driving authority; deny coal-tender entry.
- [x] Check both electric cab facings and actual Three/headless entrance-anchor agreement.
- [x] Check independent signed speeds, reverse diamonds/turnouts and signal/occupied-track holds; retain legacy coverage.
- [x] Check competing drivers, stale/repeated commands, blocked landing, host rollback and resource preservation.
- [x] Save/reload motion, occupied car, cab and switches; restore neutral/full brake without one-shot effects. Retire an abandoned paused operator safely.
- [x] Review real desktop/touch input release with shared trains and native goat artwork; stop the disposable browser/server.
- [ ] Architect runs four full gates and installed/build/UI integration on the combined fixed result before GitHub delivery.

Focused evidence and narrow limitations are recorded in [the candidate review](reviews/2026-11-10-drivable-trains.md).
