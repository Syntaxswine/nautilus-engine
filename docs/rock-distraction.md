# Rock pickup, lob and impact distraction

This bounded headless slice exposes `ROCK_ITEM`, `ROCK_PROFILE`, `ROCK_CONTRACT`, `createRock`, `openRock`, `serializeRock`, `pickupRock`, `previewRockThrow`, `throwRock`, `stepRock`, and `evaluateRockNoise` from `packages/items-core/index.js`. `ROCK_CONTRACT` identifies capability `nautilus-rock-items-v1`, version 1, state/noise version 1 and metre units. The architect owns public `./items` exports/package wiring. It imports no cast, map, inventory, clock, renderer, storage, audio or random stream. Consumer-owned sidecars and commit ledgers remain separate from portable maps and Nautilus save schemas.

**Checkpoint status:** initial core candidate for the playable consumer. The API/data shapes below are the integration contract; final regression results will be added after the bounded acceptance pass.

## Item, profile and state

`ROCK_ITEM.id` is `item:rock`; each rock requires its own explicit portable instance ID. IDs use 1–64 ASCII letters/digits/`_.:-`, beginning with a letter/digit. No UUID or randomness is generated implicitly. The host must enforce uniqueness across its rock registry, including loaded sidecars.

```js
import {createRock,openRock,serializeRock,ROCK_PROFILE} from './packages/items-core/index.js';
const rock=createRock({id:'rock-1',position:{x:3,y:2,h:.055},profile:{noiseRadius:8}});
const copy=openRock(serializeRock(rock));
```

Coordinates are `{x,y,h}` in **metres**: ground axes x/y, scalar native height h. A layer index is never a height. `createRock({id,position,profile?})` creates world state; `openRock(objectOrJSON)` validates and copies complete version-1 state; `serializeRock(rock)` validates and returns canonical JSON. Invalid/cross-version state throws. Loads never invent missing clocks, positions, owners or receipts. Unknown fields, accessors, nonfinite numbers and unsupported physics profiles reject.

The portable sidecar is:

```js
{
  kind:'nautilus-rock', version:1, id:'rock-1', itemId:'item:rock', revision:0,
  profile:{id:'rock-distraction-v1',pickupReach:1.5,maxThrowRange:12,noiseRadius:8,
    gravity:9.81,radius:.055,stepHz:90,timeUnitsPerSecond:90000,
    maxAdvanceSeconds:1,maxFlightSeconds:10},
  phase:'world', position:{x:3,y:2,h:.055}, ownerId:null,
  flight:null, lastImpact:null
}
```

World/flying rocks have positions and no inventory owner. Carried rocks have their actor's `ownerId`, `position:null`, and no flight; the host presents them at the actor/rig. A flying rock stores `{id,commandId,sourceActorId,origin,target,velocity,aimTime,ticks,pendingUnits}`. `id` here is the explicit unique throw ID. `velocity` is initial metres/second, `aimTime` seconds, `ticks` completed 90 Hz steps and `pendingUnits` unprocessed integer clock units. A landed rock has `flight:null` and keeps the emitted noise in `lastImpact`. That receipt does not replay on later updates or loading.

Defaults are explicit **game tuning**, not calibrated reach/acoustics. Creation may tune pickup reach (.25–3 m), maximum native 3D throw range (.5–30 m), and noise radius (0–50 m). Other profile fields identify the saved v1 physics/time algorithm and must match. The .055 m sphere matches the architect's centred, native-scale visual. Source grenade radius was .045 m; only gravity/aimed-lob math and the 90 Hz integration interval are retained.

## Commands and staged results

All pickup/throw/step operations return `{ok,rock,events,inventoryDelta,expected,reason,code,...}`. Inputs remain immutable. `expected` is the full canonical source sidecar string for an atomic host compare-and-swap; a revision alone does not identify a pending clock remainder. Rejected operations return the unchanged copied rock and empty events/deltas. Malformed source state returns `rock:null`. Creation/load/serialization are strict data constructors, not staged commands.

```js
const pickup=pickupRock(rock,{
  commandId:'pickup-1',rockId:rock.id,expectedRevision:rock.revision,
  actorId:'actor-1',actorPosition:{x:3,y:2,h:0},permitted:true,capacity:true
});
const command={commandId:'throw-command-1',throwId:'throw-1',
  rockId:pickup.rock.id,expectedRevision:pickup.rock.revision,actorId:'actor-1',
  origin:{x:3,y:2,h:1.4},target:{x:10,y:2,h:.055},permitted:true};
const preview=previewRockThrow(pickup.rock,command); // no delta/event or mutation
const launch=throwRock(pickup.rock,command);         // recomputes from current state
```

Pickup requires world phase, matching rock/revision, a finite 3D actor position within reach, and explicit host pickup/capacity permissions. It produces one inventory delta `{version:1,actorId,itemId:'item:rock',instanceId,quantity:1}` and a `rock-picked-up` event. The actor owns that carried instance. Throw requires the same owner, current instance/revision, explicit action permission and finite origin/target within 3D range. It produces exactly one quantity -1 delta, flying state and a `rock-thrown` event. That event is a release receipt, **not noise**. `permitted` includes whatever action costs/turn rules the host approves; the engine spends no AP, stamina or inventory itself. No grenade fuse, scatter, damage, blast or alarm is introduced.

The preview returns `trajectory:{id,commandId,sourceActorId,origin,target,velocity,aimTime,ticks:0,pendingUnits:0}`. It predicts the unoccluded aimed lob, not an impact or noise position. Roots/rigs supply release origins. The host must not substitute a rig animation endpoint or cursor target for a confirmed contact.

## Fixed-step flight and explicit swept contacts

```js
const advanced=stepRock(launch.rock,{dt:1/60,world:{sweepSphere(query){
  // query: {from,to,radius,rockId,throwId,sourceActorId,step,t0,t1}
  // from/to are sphere centres in metres; t0/t1 are seconds since release.
  return null; // no collision, NOT undefined
}}});
```

The adapter is synchronous, deterministic and read-only against the host's chosen world snapshot. It returns `null`, a contact, or up to 64 contacts. A contact is **exactly** `{fraction,point:{x,y,h},surfaceId,kind}`: fraction is 0–1 along the supplied centre segment; point is the actual surface contact; surfaceId is an explicit portable ID; kind is `ground`, `wall`, `ceiling` or `object`. The engine derives the sphere centre on the segment and validates the contact point is within its radius plus 1e-6 m. It does not infer normals, geometry, a ground height or collision from the target. Old AFT `{t,x,y,h,normal,...}` contacts need an explicit adapter to this contract rather than being passed through as if surface/centre were the same.

The lowest fraction wins, including fraction zero and very slow contacts. Simultaneous surfaces use a deterministic surface/kind/point tie break. Invalid contacts anywhere in the returned batch reject the entire staged update, including earlier candidate substeps. Adapter exceptions also reject; no source time/state is consumed. The rock stops at this first collision, becomes a reusable world item at its sphere centre, and emits exactly one noise at the supplied surface point. No bounce, later fuse endpoint or timeout noise is used.

`dt` is seconds, finite and 0–1 per call, representing a whole number of 1/90000-second units. `1/30`, `1/60`, `1/90`, `1/120`, `1/144` and integral millisecond durations are supported. Sub-quantum/unsupported fractions reject; the host retains them in its clock rather than this API silently discarding them. State saves the pending integer units, so equivalent supported frame partitions issue exactly the same 90 Hz sweeps. Positions come from the saved launch and absolute tick time, avoiding variable-frame integration drift. Midflight save/reload preserves that clock and replay.

The result's `timing` reports `inputUnits`, `simulatedUnits`, `pendingUnits`, and `unspentUnits` explicitly; units convert through `ROCK_PROFILE.timeUnitsPerSecond`. After impact, unspent time belongs to the host's overall simulation. Already-settled updates return no events, no inventory delta and all supplied time unspent. There are at most 90 sweeps per accepted call. If the adapter finds no impact within ten seconds, the update rejects atomically with `flight-limit`; no ground or sound is invented.

## Impact and hearing contract

```js
{
  version:1,type:'rock-impact-noise',id:'noise:throw-1:impact',itemId:'item:rock',
  rockId:'rock-1',throwId:'throw-1',commandId:'throw-command-1',sourceActorId:'actor-1',
  position:{x:8,y:2,h:0},radius:8,surfaceId:'yard-floor',kind:'ground',flightTime:1.2
}
```

`position` above illustrates the adapter's actual contact, not a promised target. `flightTime` is seconds since release. The unique throw ID gives a stable event ID on replay. Source actor ID is an audit identity, not a fictitious player placed at the sound and not a guard target position.

```js
const hearing=evaluateRockNoise(noise,[{
  id:'guard-near',position:{x:9,y:3,h:0},hearingEnabled:true,audible:true,
  permitted:true,behavior:'patrol',confirmedThreat:false,incapacitated:false
}]);
// hearing: {ok,rock:null,events:[],inventoryDelta:[],requests,decisions,reason,code}
```

Up to 256 listener records are accepted. Behavior is `idle`, `patrol`, `investigating` or `combat`; all permissions/threat flags are required booleans. The host supplies hearing, audibility/occlusion, faction/action eligibility and true threat state. Range uses the full native 3D distance, including finite height. Combat, confirmed-threat and incapacitated listeners never receive distraction requests. Malformed inputs reject the whole evaluation. Listener/guard inputs remain unchanged.

Requests contain `{version:1,type:'investigate-rock-noise',id,eventId,listenerId,rockId,throwId,position,priority:'distraction'}`. Their target is only the impact point. They contain no release origin, cursor, player position or inferred chase target. The host arbitrates competing cues, finds a route and moves/animates the guard. Audio/rings are presentation effects triggered after the noise transaction commits.

## Host commit boundary

The host owns the authoritative unique rock registry, actor inventory sets, permission/cost rechecks, command receipts and noise-event ledger. Staging twice against one source can intentionally produce competing candidates; only one may commit. In one host transaction: bind command ID to its complete payload, compare `serializeRock(current)` with `result.expected`, recheck current inventory/capacity/action costs, atomically store the next rock and exact delta, then publish committed events. Reusing a command ID with another rock/payload must reject rather than returning an unrelated receipt. Persist the sidecar and ledgers together. An event outbox/ledger handles crash/replay delivery; apply/dispatch a noise ID once.

An accepted pickup adds that instance ID once to the actor's inventory; an accepted throw removes it once. A second actor's stale pickup fails the full-source comparison. A stale throw/step or replayed pre-impact snapshot cannot be committed on top of a changed rock. Saving a landed sidecar itself is sufficient to prevent sequential landed updates from emitting again, but loading/replaying an older flight deliberately reproduces its event for the host ledger to deduplicate. This slice is not a broad inventory framework or durable transaction service.

## Source/design limits

The [focused source record](reviews/2026-10-29-rock-distraction.sources.json) pins the existing unchanged AFT grenade math and records the excluded actor/noise/fuse/damage closures. Prefer the actual first swept impact for stealth distraction, with explicit native heights and saved time. This is more geometrically faithful than a target/timer sound; it does not establish physical acoustics or calibrated throwing skill. A 90 Hz small-sphere chord sweep is a bounded approximation to the parabola; host geometry must include obstacles/ground. Stopping on a wall without a later fall/bounce is the deliberate first tranche.

By code inspection, flight performs at most 90 sweeps per one-second call; hearing is linear in the supplied listener list. These bounds are not frame-rate measurements. Subjective narrative preference: an audible clack where the rock actually hits lets a guard investigate a plausible environmental cue while preserving a confirmed threat. Inventory, AI movement, acoustics, bounces and damage remain deliberate consumer/future decisions. No donor game or portable map/save format is changed.
