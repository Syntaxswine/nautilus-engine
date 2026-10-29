# Standard doors and stairs

Status: implemented candidate for architect/Coder review; API/profile v1. Baseline: Nautilus commit 8c4670450cb2b38c1e1abd811d633c22de9e2b7c. Consumer adoption is separate.

Optional entry: `@nautilus-engine/map-core/interactions`. Profile **bounded-kinematic-v1**, sidecar **nautilus-standard-interactions v1**. The [starter yard](../examples/game-starter.html) is a working reference consumer. [Asset handoffs](asset-handoffs.md) explains the adoption checklist.

This module supplies open/close/unlock transactions, reach and obstruction feedback, body-aware walking, continuous stair-route execution and saved travel progress. It runs in Node without DOM, storage, renderer, timers or random draws. It does not change portable maps, building meshes, character sheets, AP, stamina, inventory or game pins.

## Use it

```js
import {
  createInteractionState, createInteractionActor, createInteractionQueries,
  previewInteraction, applyInteraction, advanceTraversal
} from '@nautilus-engine/map-core/interactions';

// world is a validated native-height AABB world. Doors are separate dynamic
// records, not duplicated as permanently solid surfaces in world.surfaces.
let interactions = createInteractionState({worldId: world.id, doors, stairs});
let mover = createInteractionActor({
  id: player.id, position: player.feet, floorId: player.floorId,
  radiusM: .25, heightM: 1.7, speedMps: 2
});
const queries = {
  ...createInteractionQueries(world, {actors: () => allCurrentMovers()}),
  // This callback checks permission only. It must not consume the key.
  canUnlock: ({door, actor}) => keys.canUnlock(actor.id, door.id)
};
queries.validateBindings(interactions);

const preview = previewInteraction(interactions, mover, {targetId}, queries);
if (preview.ok) {
  const result = applyInteraction(interactions, mover, preview.command, queries);
  if (result.ok) {
    // Compare expected revisions and commit all affected game records atomically.
    // Persist before broadcasting result.events to animation/audio.
    game.commitInteractions(result);
  }
}

// The game advances its own fixed clock. No import starts a loop.
// Pausing the game means supplying no elapsed time.
const next = advanceTraversal(interactions, mover, {seconds: fixedSeconds}, queries);
```

The complete reference binding is [game-starter-host.js](../examples/game-starter-host.js). Its yard has a real gate opening and a stair flight to a 2.12 m deck. These dimensions are an example, not a forced floor height. UI inspection never commits a result. A game commits only the returned records, then refreshes its current local references.

## Authored records

Coordinates are metres, `{x,y,h}`, with `h` at the actor's feet. Three uses `(x,h,y)`. Do not use floor index as height or resize collision independently of the art.

| Record | Required data and meaning |
| --- | --- |
| Door | `id,label,floorId,position,reachM,closedBounds,openBounds,motionBounds,open,locked`. Bounds have `min/max:{x,y,h}`. `openBounds:null` explicitly means an open portal with no leaf collider. A locked door must be closed. Motion bounds contain both poses. |
| Stairs | `id,label,from,to,path,widthM,clearanceM,bidirectional,reachM`. Both endpoints name `{floorId,surfaceId,position}`. Path contains 2–128 ordered points exactly joining them. Routes have a monotonic height and horizontal run, including landings. |
| Mover | `id,revision,position,floorId,radiusM,heightM,speedMps,traversal`. It is a small movement record, separate from the game's RPG/character record. `floorId` stays at the departure floor during travel; `traversal` explicitly reports the transition. Arrival confirms the destination floor. |
| Saved traversal | Stair ID, direction, original approach/route points and travelled distance. Restore with the matching authored route. A changed route rejects before the next step. |

Use `createInteractionState` and `createInteractionActor` for new records. `openInteractionState` / `openInteractionActor` and their `serialize…` counterparts validate and copy existing records without healing, refilling, resetting progress or choosing another route. Save both records with the world/content version and game state in one durable checkpoint. Actor records use this profile's schema definition; do not treat them as a complete game save.

Sidecars are limited to four million JSON characters and 4096 records of each interaction type; these are validation bounds, not performance promises. Saved mover routes are limited to 4106 m including the approach.

State and actor revisions are bounded to 1e9. A game must checkpoint/migrate deliberately before exhausting them. There is no hidden receipt eviction. Revision-stamped intents are single use: applying one again to the committed state returns `STALE_ACTION` and no events. Event IDs derive from world identity and committed world revision. Persist revisions across saves; rebase world identity when intentionally forking a simulation.

## Behavior and bindings

`previewInteraction(state,actor,{targetId,kind?},queries)` proposes `open-door`, `close-door`, `unlock-door` or `traverse-stairs`. Omitting kind chooses open/close or stairs. Locked doors require an explicit unlock intent and permission. Unlocking does not also open the leaf. A command carries world and actor identities/revisions.

`applyInteraction` rechecks reach, permissions and current occupancy, returning copied `state,actor,events,expected`. Rejection returns no events and leaves inputs unchanged. The host must still compare/commit atomically; a returned result does not write the live world.

`walkActor(state,actor,{direction:{x,y},seconds},queries)` performs upright horizontal walking with a bounded speed. Diagonal input is normalized. `advanceTraversal(state,actor,{seconds},queries)` walks the saved centreline in either allowed direction, checking every crossed segment. Each step accepts 0–1 seconds. A live blocker stops the whole proposed step at the last committed position; clearing it allows resumption. It never teleports to the other floor. Start includes a supported walk to the entry, not a snap. Arrival rechecks landing support. Use smaller explicit fixed steps for responsive stopping.

Custom query providers must declare matching `worldId` and return `{ok:true}` or `{ok:false,code,reason}` from the required methods:

| Method | Responsibility |
| --- | --- |
| `canSetDoor({state,actor,door,open})` | Can the complete pose change happen now? Include all actors and the actual leaf sweep when the game needs exact hinges. |
| `canUnlock({state,actor,door})` | Permission/key/lock policy. Required for unlock; no default permission or skill roll. |
| `landing({state,actor,landing})` | Confirm floor, named support, body footprint and game eligibility. |
| `walk({state,actor,from,to})` | Continuous clearance and support along ordinary walking, including live actors/doors. |
| `sweep({state,actor,from,to})` | Continuous body clearance along a stair segment. Authored route supplies the walking support between confirmed endpoints. |

All queries are pure; they cannot spend costs, alter locks, move actors or trigger effects. Missing bindings give `MISSING_BINDING` with an action to take. Readiness is not a permission to skip commit-time checks. Cost, key consumption and multiplayer authority belong in the same host transaction as the accepted result.

## Reference provider limits

`createInteractionQueries(world,{actors})` reuses Nautilus's static spatial index. Supply **all current authoritative movers**, including offscreen actors; omitted `actors` means a deliberately single-actor world. Hidden floors remain in queries. The provider uses an upright **rectangular** body with a conservative square footprint, authored axis-aligned surfaces, dynamic closed/open door boxes, and a conservative full motion box for door operation. It is not a capsule/triangle/curved-silo solver. Flat walking checks union coverage under the entire swept footprint rectangle; diagonal walks near floor edges can reject conservatively. Door pose changes are binary authoritative changes; cosmetic interpolation does not postpone collision truth.

Stairs use authored, sloping polylines and declared width/head clearance, with live sweeps and endpoint support. They do not generate stair meshes, infer routes from artwork, validate every tread, solve navmeshes, move arbitrary rigid bodies, simulate falling, ladders, crouching, opening a door while already on stairs, or reverse a route mid-flight. A blocked route pauses and can resume. Use a different versioned provider/profile for those needs. Curved Coldwell geometry requires its actual geometry provider; these boxes must not be declared exact mesh support.

Call `validateBindings` at adoption/load: it checks world identity, native bounds and named landings. Runtime previews additionally check the actual actor body and route. World capabilities and `interactionRequirements(state)` must each negotiate against the consumer's real supported manifest; accepting the schema alone does not adopt a game.

## Decisions for the next game

- Match feet origin, body size, art bounds and floor elevations. Include door openings and slab holes in actual collision.
- Choose whether locks use keys, permissions or skill checks; select costs and who commits them.
- Provide live occupancy and update dynamic door colliders/path caches from committed state, including offscreen changes.
- Keep sounds, rig poses and effects downstream of committed event IDs. Restoring a save sets poses without replaying one-shot effects.
- Choose stair speed, turn/AP policy and stopping behavior. Pause explicit time when menus are open.
- Preserve matching world/route versions in saves. Reject unsupported geometry with an actionable message; never substitute a flat map.
- Review both directions, wide/tall actors, occupied/locked doors, stale commands, mid-flight saves and rendering-window boundaries in the actual game.

No Farmyard, AFT or Tinderbox runtime/pin is changed by this engine module.

## Builder checklist

- [ ] Pin the reviewed engine and authored world/route versions.
- [ ] Validate the sidecar and negotiate its schema/capability plus the world requirements.
- [ ] Bind actual semantic door bounds, landing IDs and continuous routes at native scale.
- [ ] Select the AABB provider only for matching geometry; connect mesh/curved queries where required.
- [ ] Supply live actors, permissions, explicit host time and atomic save/commit authority.
- [ ] Keep visual/audio events downstream of committed state; restore poses without replay.
- [ ] Run the actual game path, both stair directions, obstruction/lock feedback and mid-flight restore.
