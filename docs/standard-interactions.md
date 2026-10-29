# Standard doors and stairs

Status: implemented candidate for architect/Coder review; API/profile v1. Baseline: Nautilus commit 8c4670450cb2b38c1e1abd811d633c22de9e2b7c. Consumer adoption is separate.

Optional entry: `@nautilus-engine/map-core/interactions`. Profile **bounded-kinematic-v1**, sidecar **nautilus-standard-interactions v1**. The [starter yard](https://github.com/Syntaxswine/nautilus-engine/blob/9d33ca65edf7b4d6b169d50e17dfc6bb40276373/examples/game-starter.html) is a working reference consumer. [Asset handoffs](asset-handoffs.md) explains the adoption checklist.

This module supplies open/close/unlock transactions, reach and obstruction feedback, body-aware walking, continuous stair-route execution and saved travel progress. It runs in Node without DOM, storage, renderer, timers or random draws. It does not change portable maps, building meshes, character sheets, AP, stamina, inventory or game pins.

The source/static workshop route is /examples/game-starter.html. The larger yard is linked at the fixed reviewed candidate; it is not bundled into headless runtime packages.

## Use it

```js
import {
  createInteractionState, createInteractionActor, createInteractionQueries,
  previewInteraction, applyInteraction, walkActor, advanceTraversal,
  serializeInteractionState, serializeInteractionActor,
  openInteractionState, openInteractionActor, interactionRequirements
} from '@nautilus-engine/map-core/interactions';
import {createWorld, assertWorldCompatible}
  from '@nautilus-engine/map-core/world';
import {negotiateCapabilities} from '@nautilus-engine/map-core/capabilities';

// This complete minimal host uses the installed AABB provider. No donor imports.
const world = createWorld({
  id: 'my-yard', name: 'Minimal yard', widthM: 10, depthM: 10,
  floorCount: 2, storyHeightM: 2.12, groundHeightM: 0, heightM: 6
});
const panel = (id, floorId, x1, x2, h) => ({
  id, floorId, role: 'floor',
  bounds: {min: {x: x1, y: 0, h}, max: {x: x2, y: 10, h}},
  supports: true, supportFloorId: floorId
});
world.surfaces = [
  panel('yard', 'floor-0', 0, 10, 0),
  panel('deck', 'floor-1', 6, 10, 2.12)
];
let state = createInteractionState({
  worldId: world.id,
  doors: [{
    id: 'gate', label: 'gate', floorId: 'floor-0',
    position: {x: 3, y: 5, h: 0}, reachM: 1.5,
    closedBounds: {min: {x: 3, y: 4.2, h: 0}, max: {x: 3.1, y: 5.8, h: 2}},
    openBounds: null, // Deliberate portal-only open pose in this small example.
    motionBounds: {min: {x: 3, y: 4.2, h: 0}, max: {x: 3.1, y: 5.8, h: 2}},
    open: false, locked: false
  }],
  stairs: [{
    id: 'deck-route', label: 'deck stairs',
    from: {floorId: 'floor-0', surfaceId: 'yard', position: {x: 3.5, y: 5, h: 0}},
    to: {floorId: 'floor-1', surfaceId: 'deck', position: {x: 7, y: 5, h: 2.12}},
    path: [{x: 3.5, y: 5, h: 0}, {x: 5.7, y: 5, h: 2.12}, {x: 7, y: 5, h: 2.12}],
    widthM: 1.2, clearanceM: 2, bidirectional: true, reachM: .75
  }]
});
let mover = createInteractionActor({
  id: 'player', floorId: 'floor-0', position: {x: 2, y: 5, h: 0}
});
const queries = createInteractionQueries(world, {actors: () => [mover]});
const consumer = {
  id: 'minimal-aabb-host', contractVersion: 1,
  schemas: [
    {id: 'nautilus-extended-world', versions: [1]},
    {id: 'nautilus-standard-interactions', versions: [1]}
  ],
  capabilities: [
    {id: 'nautilus-extended-height-v1', versions: [1]},
    {id: 'nautilus-world-aabb-v1', versions: [1]},
    {id: 'nautilus-standard-interactions-v1', versions: [1]}
  ]
};
assertWorldCompatible(world, consumer);
const readiness = negotiateCapabilities(interactionRequirements(state), consumer);
if (!readiness.ok) throw Error('Supply the missing interaction capability.');
queries.validateBindings(state);
const presented = new Set();
// Example host authority: one synchronous owner. A real game includes its
// inventory/cost/save records in the same durable transaction.
function commit(result) {
  if (!result.ok) throw Error(result.reason);
  if (result.expected.worldRevision !== state.revision ||
      result.expected.actorRevision !== mover.revision) throw Error('Stale commit');
  state = result.state;
  mover = result.actor;
  for (const event of result.events) {
    if (presented.has(event.id)) continue;
    presented.add(event.id); // Bind animation/audio here after durable commit.
  }
}
function use(targetId) {
  const preview = previewInteraction(state, mover, {targetId}, queries);
  if (!preview.ok) throw Error(preview.reason);
  commit(applyInteraction(state, mover, preview.command, queries));
}
use('gate');
commit(walkActor(state, mover, {direction: {x: 1, y: 0}, seconds: .75}, queries));
use('deck-route');
commit(advanceTraversal(state, mover, {seconds: .5}, queries));
const checkpoint = {
  interactions: serializeInteractionState(state),
  actor: serializeInteractionActor(mover)
};
// Stage and validate both before replacing the live pair. Persist the matching
// world/content version, event receipts and remaining game state alongside them.
const stagedState = openInteractionState(checkpoint.interactions);
const stagedMover = openInteractionActor(checkpoint.actor);
queries.validateBindings(stagedState);
state = stagedState;
mover = stagedMover;
for (let step = 0; step < 40 && mover.traversal; step++)
  commit(advanceTraversal(state, mover, {seconds: .25}, queries));
if (mover.floorId !== 'floor-1') throw Error('The route did not finish');
// The immutable query snapshot owns no renderer/timer/disposable host resource.
```

The complete reference binding is [game-starter-host.js](https://github.com/Syntaxswine/nautilus-engine/blob/9d33ca65edf7b4d6b169d50e17dfc6bb40276373/examples/game-starter-host.js). Its yard has a real gate opening and a stair flight to a 2.12 m deck. These dimensions are an example, not a forced floor height. UI inspection never commits a result. A game commits only the returned records, then refreshes its current local references.

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

## Remaining authoring integration

For compatible records, the same standard recipe binds the selected query provider once; a new building supplies semantic data instead of copied donor gameplay code. This candidate does not yet include a compiler that extracts every existing prefab/catalogue door, leaf pose and stair route into these records, nor a universal rig-presentation binder. That is unfinished authoring integration: Coder owns the semantic compiler/provider contract, Editor the authoring/export binding, Artist the stable native part/pose evidence, and Architect the accepted integration. The reference yard supplies those records explicitly. Do not advertise every catalogue building as automatically playable.

## Builder checklist

- [ ] Pin the reviewed engine and authored world/route versions.
- [ ] Validate the sidecar and negotiate its schema/capability plus the world requirements.
- [ ] Bind actual semantic door bounds, landing IDs and continuous routes at native scale.
- [ ] Select the AABB provider only for matching geometry; connect mesh/curved queries where required.
- [ ] Supply live actors, permissions, explicit host time and atomic save/commit authority.
- [ ] Keep visual/audio events downstream of committed state; restore poses without replay.
- [ ] Run the actual game path, both stair directions, obstruction/lock feedback and mid-flight restore.
