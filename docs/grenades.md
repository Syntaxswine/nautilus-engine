# Farmyard grenade component

Optional Nautilus 0.9 component. Public entries are `./grenades` and `./grenades/aim`; component identity is `item:grenade`. The source pin is Farmyard `251bf8094b5f9ebe44208443084c1a6d6658512a`. The optional public module is an engine-owned extraction; its runtime never imports the donor or editor. The complete preserved original workproduct is conformance evidence, not a second game runtime dependency. Production Farmyard retains its current implementation and pin.

## Usage card and smallest example

`GRENADE_COMPONENT` describes the profile, guide, aim entry, required host services and refused features. `GRENADE_CONTRACT` distinguishes API/command/schema versions from the source commit and profile. State schema is `nautilus-grenade-state` version 1, `urn:nautilus:schema:grenade-state:1`, in [grenade-state-v1.schema.json](../schemas/grenade-state-v1.schema.json). Profile `farmyard-static-same-plane-v1` implements capability `nautilus-grenades-static-planar-v1` version 1. Aiming is separately optional capability `nautilus-grenade-aim-v1` version 1.

```js
import {
  createGrenadeExample, previewGrenade, stageGrenade,
  openGrenadeState, serializeGrenadeState, grenadeContext
} from '@nautilus-engine/map-core/grenades';
import {GrenadeAim} from '@nautilus-engine/map-core/grenades/aim';

let sidecar = createGrenadeExample();
const aim = new GrenadeAim();
aim.start();
const actor = sidecar.actors[0];
const point = aim.aim({x: actor.x, y: actor.y}, {x: 1, y: 0}, 10);
const command = {version: 1, id: 'throw-1', expectedRevision: sidecar.revision,
  actorId: sidecar.control.actorId, point: {x: 23, y: 10}};
const preview = previewGrenade(sidecar, command); // No resources or RNG consumed.
if (preview.ok) {
  const staged = stageGrenade(sidecar, command); // Revalidates current sidecar.
  if (staged.ok) {
    // In the reference fixture only, sidecar is the complete authority.
    // A retained game must compare and atomically commit the host projection too.
    sidecar = staged.next;
    // Dispatch staged.consequences once and present staged.presentation after commit.
  }
}
const restored = openGrenadeState(serializeGrenadeState(sidecar));
const relevantContext = grenadeContext(restored);
aim.cancel();
```

The optional headless core profile exposes the equivalent subpaths beneath `@nautilus-engine/core`. No timer, storage, renderer, fetch or implicit random source is used. Dispose host-owned input/presentation bindings normally; the headless module owns no persistent process, listener or asynchronous resource.

## Supported world and source behavior

This is a **static AABB, same-ground-plane, nonreactive** profile. Actors use Farmyard's continuous ground x/y metres and explicit layer z=0. Authored trajectory z is metre height above that ground, not an actor layer. The module refuses other floors. Geometry snapshots have separate wall, walking and air filters: crates can block a landing or flight without becoming a standing blast wall; prop reservations do not fill the air. The 33-point sinusoidal authored arc, 97-point wall/fog footprint, 10 m throw range, 5 m blast, 120 raw base damage and self-danger math match the source. They are presentation/game rules, not calibrated ballistic physics. There is no fuse, bounce or authoritative midflight state.

Equipped pistol, pistol-offhand and SMG cost 2.5 AP; other supported source weapons cost 5. A stowed pistol grants no discount. Throws keep the weapon equipped, spend one finite grenade and synchronize all matching grenade-pack rounds. Preview checks current AP before engagement. The explicit accepted engagement policy can refill AP on entering player combat before debit; zero living guards instead selects won and does not refill. Loading, previewing and adopting a host checkpoint never refill anything. The source epsilon permits AP down to -1e-7 in a host context; accepted debit clamps at zero exactly as the source.

Every living target is visited in original array order, including the thrower and allies. Raw damage is round(120 × max(.2, 1 − distance/6)), followed by ceil(endurance/10) resistance once and HP floored at zero. A fatality also clears AP, burning and movement, marks dead, and emits a body-registration consequence. The loop continues after self-fatality. Surviving guards within 20 m of the thrower alert without LOS, remember the thrower's position and reset alert age. Ordinary lost/won/contact phase facts are staged. The source-equivalent ordinary sight refresh stages detection, guard sight alerts, conditional fog expansion and phase/refill facts before commit. Required sight inputs are species, heading, stance, sneaking and nullable legacy cone; known roster profiles and the original default sight/cone fallback for unlisted species are explicit, so cast stays with the host. Inherited Object.prototype names such as toString, constructor and __proto__ explicitly reject: the pinned source misreads those names as sight profiles. Normal unlisted species such as bear retain the default fallback. World snapshots retain grid dimensions, visible/seen cells and fogAt; control retains detected IDs. The host synchronizes those staged results with its queues, views, logging and complete body/loot registry.

The support record requires explicit false assertions for windows, fueled targets, volatile targets, fire and multilevel context. Known window/glass geometry is independently refused even if the assertion is false. The public Farmyard projection inspects the closed supported source profile and rejects known reactive source fields, held or stowed fueled flamethrowers, active fires/burning and nonzero layers before creating a context. Unknown source functional fields produce structured paths instead of disappearing. Retain all source-only fields in the game's original state; the projection is not a replacement game save.

Full Farmyard can conditionally detonate a fueled target before later targets, consume its saved LCG, kill/ignite other units and change window geometry before subsequent LOS. Its main window blast follows the direct target loop. These require typed future `fuel-tank-detonation-v1`, `window-blast-v1`, `volatile-target-detonation-v1`, `active-fire-v1` and `multilevel-blast-v1` bindings. None is silently approximated or deferred until after costs in this profile. Use the complete retained game implementation for such a scene or a separately reviewed profile; do not label this subset complete Farmyard compatibility.

## Retained host context and atomic commit

The sidecar contains only the relevant grenade projection and a bounded durable journal. A game retains its cast, inventory, movement, AI, turns, RNG, geometry production and whole-game persistence. Actor projection fields do not authorize replacing a full game actor. Apply accepted resource/pack/ordinary casualty/control deltas by stable ID while preserving unrelated host fields.

`adoptGrenadeContext(sidecar, {version:1,id,expectedRevision,world,actors,control,support})` records an explicit fresh host checkpoint after movement, injury, AP spending, equipment or geometry changes. It preserves exact supplied damaged/spent values and every previous command identity. The public `projectFarmyardGrenadeContext(source,{geometry,bounds})` can construct this projection from the pinned flat Farmyard state while retaining its actual geometry provider. `bounds` is optional when the source declares bounds or a rectangular map. Supply the complete current compiled geometry; a crop or omitted obstacle is not a supported adapter.

All staged results carry `expected.state` (the complete old sidecar serialization) and `expected.context` (the canonical complete relevant host projection). Before committing, compare the stored sidecar and freshly projected host context against these expected values, then persist host consequences and `next` atomically. `matchesGrenadeContext(sidecar, context)` checks the latter relationship. Reject a mismatch and reproject; do not overwrite newer host damage or refill resources. Required retained services are `atomic-grenade-context-commit-v1`, `farmyard-visibility-refresh-v1` and `farmyard-body-registration-v1`. `grenadeRequirements` and `assertGrenadeCompatible` negotiate these versions before adoption; declarations do not implement the services.

The single durable ID namespace covers throws and context checkpoints. Receipt IDs encode the type-preserving JSON tuple `["grenade-v1", sidecarId, commandId]`, so numeric/string IDs and delimiters cannot collide. Reusing an ID for a different kind/payload rejects. Exact retry returns the old receipt and **current** next state, with no new costs, consequences or presentation. Stale new commands reject. The journal retains at most 128 records and data is bounded to 8 million UTF-8 JSON bytes / 500,000 nodes; it never evicts old identities. Prospective aggregate state is checked before an accepted stage/checkpoint; reaching node/byte limits refuses without changing resources or returning an unsaveable next state. Reaching a limit needs an explicit reviewed archival/migration policy, not a new sidecar that allows old IDs to spend again.

## Persistence, validation and presentation

`openGrenadeState` first inspects plain-data descriptors, then replays throw/checkpoint records against the original context and verifies receipts/current state. Unknown fields, versions, profiles, unsupported features, accessors, functions, toJSON hooks, cycles and invalid resources reject before cloning or invoking those hooks. There is no automatic migration or resource repair. This is consistency validation, not a cryptographic authenticity claim against someone rewriting an entire authored scenario.

`presentation` is returned only for a newly accepted throw. It contains the exact authored arc and a transient source-shaped sequence. It is never part of saved state. Loading never dispatches effects; retrying never re-emits the sequence. Actor animation markers show the already committed throw and cannot spend a second grenade. Cancellation only clears `GrenadeAim`; it cannot spend AP, change fog or move the actor. `GrenadeAim`, `screenToGround`, `FIELD_CAMERA` and `grenadeCameraFrame` retain the original fixed-camera math with validated finite inputs and host-supplied nudge dt.

`GrenadeCompatibilityError` provides code, path and actionable diagnostics for invalid data. Well-formed blocked/stale/conflicting actions return ok:false with the unchanged next state. Failure has no partial debit, damage or host consequence. Host presentation failure cannot roll back or re-award an already committed action.

## Acceptance checklist

- [ ] Install an exact engine pin and use only public grenade/aim entries; locate this guide, schema, metadata and notices.
- [ ] Validate complete source projection and refuse reactive/multilevel content; retain all unadopted game state.
- [ ] Bind atomic context commit, body registration and visibility refresh before live adoption.
- [ ] Compare pure previews and accepted ordinary results against the pinned original: cost/stock/pack/weapon, low/high wall lob, wall/fog cover, self/allied damage, casualties and guards.
- [ ] Exercise rejection, cancellation, stale/conflicting/repeated IDs and host injury/movement/AP changes between throws.
- [ ] Save/reload injured/spent resources, confirm deterministic receipt integrity, and show no effect replay.
- [ ] Review desktop/phone aiming and the borrowed actor throw animation independently of command-time truth.
- [ ] Run the adopting game's own workflow/checks, retain a rollback pin and stop owned preview helpers.

For accuracy, prefer this explicit source profile when matching Farmyard's tactical abstraction; richer reactive scenes require its complete retained policies. For efficiency, the ordinary math is bounded and headless, but journal replay/data copying adds cost and no speedup has been measured. For narrative, retaining Farmyard's existing costs, damage and equipment choices preserves its authored solo experience. This component does not introduce a cast, balance redesign or production adoption.

## Playable reference and browser proof

[Grenade field](https://github.com/Syntaxswine/nautilus-engine/blob/cc49e030eca70f2708268d028ad5f7474f84e450/examples/grenade-reference.html) binds the public kernel, aiming, DOM controls, overlay and native painted horse/grenade through a small retained host. It demonstrates finite resources, ordinary casualties, refusal reasons, explicit save/load and quiet command retry. It is a component reference; production games retain their own complete state and adopt through the host contract above.

The reference host detaches returned values, checks the active durable record before writes, tracks uncertain throw and load writes, and exposes explicit validated recovery. A new confirmation has a fresh command identity even after restoring an earlier save; an actual retry retains its original identity. Loading and recovering a record never replay choreography or consequences.

Run `npm run build`, then `npm run review:grenades` and `npm run review:grenades:installed`. Set `NAUTILUS_REVIEW_SOURCE=1` for the source-tree variant. The installed proof packs and installs the compatibility package offline, redirects only the consumer fixture's public import map/style/guide URLs, and checks identical behavior groups and final context against the same fingerprinted source/build inputs. It cannot fall back to sibling source modules. Disposable isolated browser/server lifetimes close after each review; reports and captures remain under ignored `artifacts/grenade-reference-*`.
