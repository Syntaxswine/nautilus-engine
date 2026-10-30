# Farmyard single-leaf door adapter

## Builder card

| Field | Contract |
| --- | --- |
| Identity/status | `door:farmyard-single-leaf`, reviewed-source implementation candidate; production registration and game adoption remain Architect-owned work. |
| Entry | Proposed optional `@nautilus-engine/core/adapters/farmyard/doors` (`./adapters/farmyard/doors` in the compatibility package). The adjacent facade is implemented; the source package export is deliberately unchanged in this slice. |
| Versions | Adapter API, command, state and host-save version 1. Named profile `farmyard-single-ground-leaf-endpoint-v1`, version 1. Base package 0.8.0 at `03c0d06ebea59720751f7c678f6165d1c179cadd`; Architect assigns composed package metadata. Pin the full accepted implementation commit from its handoff. |
| Source | Farmyard `251bf8094b5f9ebe44208443084c1a6d6658512a`; exact 22-module, 151,675-byte test-only subset reused from reviewed engine candidate `c7beb44fa254b2d72657f7e3a959920216f09b35`. [Hashes and notice record](../reviews/farmyard-doors.sources.json). No runtime import of that snapshot. |
| Purpose | Open/close a single ordinary ground door while retaining the game's actors, movement, inventory, progression, RNG and complete persistence. One source-sized current solid leaf serves walking, sight, projectiles, grenades and presentation. |
| Requirements | Door behavior capability `nautilus-farmyard-doors-v1` plus the four version-1 services below, schema `nautilus-farmyard-door-state` v1, a complete published-source projection and all current geometry. Call `assertFarmyardDoorCompatible(state, consumer)` before use. |
| Space | Metres; integer-centred ground cells `(x,y)`; source actor `z` is a layer and must be zero. An `e:x:y` centre is `(x+.5,y)`, `s:x:y` is `(x,y+.5)`. Leaf 1.12 × 2 × .16 m, reach 1.65 m, actor radius .23 m. Rendering uses `(x,height,y)`. Swing is explicitly ±1. |
| State | Adjacent `door-state-v1.schema.json` and `door-host-save-v1.schema.json`; `farmyardDoorUsageCard()` returns package-safe URLs for both and this guide. Commands use stable typed IDs, expected revisions and explicit `open`/`close`. |
| Example/proof | Connection example below; [installed consumer](../../tests/fixtures/farmyard-doors/package-proof.mjs). Run `node tools/test-farmyard-doors-package.mjs`; this uses a disposable export overlay, leaving production metadata unchanged. |
| Limits | 256 doors, 128 actors, 8,192 static boxes, 1,024 queued route entries; complete journal 128 receipts; complete input/save ≤8,000,000 UTF-8 bytes, ≤500,000 nodes, depth ≤24. No receipt eviction. |

## Bind retained services once

`connectFarmyardDoors` validates the source data and service readiness, then borrows these synchronous host functions. The connection allocates no timer, mover, renderer, listener, storage or network resource.

| Host function | Service and responsibility |
| --- | --- |
| `read()` | Return the current `{doorState,host}`. The connection immediately detaches both records; it never returns this loan to callers or query services. Preserve the existing source host and all its unrelated state. |
| `geometry(detachedHost)` | Pure complete current source collider query. The adapter calls it with a detached copy and refuses mutation. Include every door once, ordinary scenery and offscreen blockers. Wrong/missing source door footprints produce `DOOR_COLLIDER_MISMATCH` / `MISSING_DOOR_COLLIDER`. |
| `compareAndSwap(candidate)` | `atomic-farmyard-door-context-commit-v1`: compare **all three** `expected.state`, `expected.context`, `expected.host` against current live values, then check `candidate.canCommit()` immediately before replacing both records in one synchronous transaction. Return a boolean. No await or partial write. The final write fence refuses a disposed/expired operation and closes when CAS returns or throws. Candidate host/state are separate owned copies from every returned result. The complete host token includes unrelated ammunition, inventory, RNG, stamina and source revisions, so independent changes cannot be overwritten. |
| `invalidateRoutes({receiptId,consequences})` | `farmyard-route-invalidation-v1`: discard borrowed route/geometry caches after an accepted door change. The accepted host already has an empty queue and stopped controlled actor. Authoritative queries must derive from the current host immediately; publishing a cache is not a second collision authority. |
| `publishVisibility({receiptId,world,control})` | `farmyard-visibility-refresh-v1`: publish the **already computed** forced fog/detection/contact result. Do not call source `refresh()` again or award contact AP again. |
| `publishColliders({receiptId,colliders})` | `farmyard-current-door-collider-v1`: publish the complete current geometry to dependent views/caches. The new solid leaf appears once in the same data used by movement, sight, bullets and grenades. |
| Optional `present(presentation)` | Show the accepted endpoint/collider using the receipt ID. No AP, damage, inventory or door mutation from an animation callback. Artist/UI bindings remain host work. |

This is the complete installed connection example. `store` is the game's existing authoritative record pair; the other five callbacks are its retained geometry/cache/view services. Bind this once per host and use the same connection for all compatible doors/scenes. This main-thread example performs a synchronous atomic replacement; a server/database host supplies its equivalent transaction.

```js
import {
  connectFarmyardDoors, serializeFarmyardDoorState,
  farmyardDoorContextToken, farmyardDoorHostToken,
  projectFarmyardDoorContext, FARMYARD_DOOR_COMPONENT,
  FARMYARD_DOOR_CONTRACT
} from '@nautilus-engine/core/adapters/farmyard/doors';

export function wireFarmyardDoors({store, geometry, invalidateRoutes,
  publishVisibility, publishColliders, present}) {
  const project = host => projectFarmyardDoorContext(host, {
    geometry: geometry(host)
  });
  const consumer = {
    id: 'farmyard-retained-host', contractVersion: 1,
    schemas: [{id: FARMYARD_DOOR_CONTRACT.schemaId, versions: [1]}],
    capabilities: [FARMYARD_DOOR_CONTRACT.capability,
      ...FARMYARD_DOOR_COMPONENT.requiredHostServices
    ].map(id => ({id, versions: [1]}))
  };
  return connectFarmyardDoors({
    consumer, read: () => ({doorState: store.doorState, host: store.host}), geometry,
    compareAndSwap(candidate) {
      if (candidate.expected.state !== serializeFarmyardDoorState(store.doorState)
        || candidate.expected.context !== farmyardDoorContextToken(project(store.host))
        || candidate.expected.host !== farmyardDoorHostToken(store.host)
        || !candidate.canCommit()) return false;
      store.doorState = candidate.doorState;
      store.host = candidate.host;
      return true;
    },
    invalidateRoutes, publishVisibility, publishColliders,
    ...(present ? {present} : {})
  });
}
```

Construct the initial sidecar with `createFarmyardDoorState({id, ...projectFarmyardDoorContext(host,{geometry:geometry(host)})})`. Keep each complete command, including its original expected revision, for durable retry. `binding.preview({version:1,id,expectedRevision,actorId,doorId,action:'open'})` is pure. `binding.perform(theSameCommand)` revalidates and stages before the host CAS. Use stable source door IDs, the first squad actor's original typed ID and your own stable command identity.

The lower-level `previewFarmyardDoor`, `stageFarmyardDoor` and `adoptFarmyardDoorContext` are pure; they never call a host callback or apply returned effects. `stageFarmyardDoorHost` / `adoptFarmyardDoorHost` also prepare a complete copied source host and validate the prospective **joint save**, returning `hostNext` and the full expected tokens. Custom hosts can use those directly with an atomic store instead of the provided connection.

Every returned `next` / `hostNext` is detached from authoritative records, including success, refusal, adoption, retry and unknown outcomes. The host may install the exact records supplied to CAS; mutating a returned result must not mutate that installed store. Borrowed query inputs and outputs, publication arguments and staged load results are also separated.

`committed:true` means the authoritative transaction succeeded. A later view/cache publication error is reported in `presentationErrors` and cannot undo or repeat the action. Error formatting inspects only a safe own data message; hostile thrown values/getters/coercions cannot escape after a known commit. Repair views from current saved state, without re-spending AP or replaying a receipt. Consumers must keep authoritative geometry queries current even if a cache/view publication fails. `STALE_HOST` means CAS returned false; publish nothing and capture again.

The connection rejects synchronous nested `preview`, `perform`, `adopt` or `save` with `REENTRANT_OPERATION` throughout borrowed read/query/CAS/publication callbacks. Run subsequent operations after the current method returns. Disposal is always allowed: read/query disposal prevents reaching CAS; the final `canCommit()` check fences disposal during the host comparison; disposal after an acknowledged write retains `committed:true` and stops remaining publication. Before each publication the connection compares current detached state/host with its accepted snapshot. Later independent authority changes stop stale output with `publicationStopped:'stale'`; an unreadable store stops it as `'unavailable'`. Intentional disposal reports `'disposed'`. The already accepted action remains committed in every case.

A CAS exception or non-boolean acknowledgement has an **unknown** outcome, since it may occur after a durable write. The result is `code:'COMMIT_OUTCOME_UNKNOWN'`, `committed:null`, empty consequences/presentation and `recovery:{command,receiptId}` containing the original typed command and ID. It does not claim rollback or publish speculative views. Read authoritative persistence and retry that exact original command, preserving its original expected revision and payload; an already stored receipt recovers quietly even after intervening movement/adoption/close/reload. Do not allocate a new ID for an unresolved attempt. If a retry reports stale context/revision without a receipt, resolve the authoritative journal/host first rather than guessing whether the earlier write happened. Invalid async CAS services must not write using an expired fence.

Dispose the connection when leaving the host; this disables its methods and leaves all borrowed movement, renderer and persistence services alive. The component has no timer, async load or late-owned resource to dispose.

## Adopt fresh host context and restore complete saves

Movement, injury, phase changes, AP use, guard alerts, routes or relevant geometry can change independently. Before a new door action/save, project the fresh host. If `matchesFarmyardDoorContext(state,projection)` is false, capture `{version:1,id,expectedRevision,...projection}` and pass that **complete captured command** to `binding.adopt`. Keep it for retry. The adoption CAS compares its fresh context, not the old sidecar's context. If the live host changed since capture, `STALE_CONTEXT` refuses adoption. An unchanged new capture returns `NO_CONTEXT_CHANGE` without adding a receipt. Changes confined to inventory/RNG/stamina need no context receipt; the complete host CAS/save still preserves them.

Adoption copies exact actor coordinates, HP, AP, guard state and current door poses. It never moves an actor out of scenery, heals, replenishes resources, normalizes damage, reruns visibility or grants encounter AP. No native mover is created. A new action without relevant adoption returns `CONTEXT_ADOPTION_REQUIRED`.

Legacy omitted `isMoving` / `alert` flags are projected with the source's false semantics; omitted `lastKnown` / `alertAge` use null/zero only for calculation. Loading/adopting preserves raw field absence. A new accepted action follows source **write intent**: first-squad stop always writes `isMoving=false`, and each living guard that sees the hero receives `alert=true`, a fresh `{x,y}` last-known record and `alertAge=0`, even if the normalized values compare equal. Unseen actors keep their original omitted fields. Subsequent retained `endTurn` behavior is tested against the original source, including the visible guard's age increment.

`binding.save()` returns a complete strict host-save v1 string. Stage a load with `openFarmyardDoorHostSave(wire,{geometryForHost:geometry})`. It validates the whole bounded bundle, replays the door journal, checks the closed published-source projection and compares actual current geometry/context on a detached host. Only then replace both live records atomically. Do not route it through the source game's repair/relocation decoder. Source fog/detection Sets retain their actual type and insertion order. Source object enumeration order, including edges, is preserved in the complete save and protected by the full host token. Synthetic static collider IDs are deterministic across raw geometry query order. Unrelated host fields, including source effect data, remain exact finite plain data; load emits no effects. Doors are instantaneous endpoint changes, so this profile has no mid-swing or stair progress to restore; retained route state is saved as data and stopped only by a new accepted door action.

An exact ID/payload retry returns the **current** state/host and its original receipt with `repeated:true`, empty consequences and `presentation:null`, even after intervening closes, host checkpoints, reload or journal capacity. It performs no CAS or view publication. Reusing an ID with another payload/kind fails `COMMAND_ID_CONFLICT`. Numeric `1` and string `"1"` are distinct IDs. New stale actions fail `STALE_REVISION`. A new request at 128 receipts fails `JOURNAL_LIMIT`; old IDs are preserved. Archival/migration requires a separately reviewed policy, never dropping the journal and resetting IDs.

The executable loader is stricter than structural JSON Schema: it checks references, distinct IDs/edges, collider consistency, typed replay and complete aggregate budgets. Reject getters, hidden properties, functions, symbols, toJSON hooks, sparse arrays, nonfinite numbers, cycles, unknown functional fields and incompatible profiles before live mutation. Oversized prospective state or **combined host save** returns `STATE_LIMIT` with no accepted next state/effects. Save schema registration in the shared manifest remains an explicit integration item.

## Source policy and design choice

The shared open/close/lock flag-transition primitive in `interactions/actions.js` is reused. The native `bounded-kinematic-v1` profile, parts runtime, mover history, floor checks, key bindings and conservative motion/static occupancy remain unchanged. This adapter supplies a separate source authority/context journal; a Farmyard policy is never installed under the native provider's profile ID.

| Difference and recommendation | Accuracy | Efficiency | Narrative |
| --- | --- | --- | --- |
| **Farmyard endpoint profile:** explicit Open/Close, 1.65 m rounded static reach in ≤.1 m samples, .23 m living circles against the destination leaf. Preserve for this named game. | Matches its published code. It can accept a person in a mid-swing arc or static scenery at the destination; it is an instantaneous tactical abstraction, with no physical calibration. | Code estimate: at most 18 reach samples per relevant box at the supported range; forced fog and save/replay also cost CPU. No FPS/speedup claim. | Subjective preference for existing Farmyard: preserves reachable doors, encounter reveal and AP expectations. |
| **Native conservative motion provider:** prefer for new authored Nautilus rooms with validated sweep bounds. Keep it as the default. | Includes swept rectangular bodies, motion envelope, static and other-leaf obstructions; safer clearance approximation, still not exact hinged mesh physics. | Uses shared indexed queries; relative application performance is unmeasured. The Farmyard candidate deliberately avoids a second mover/history. | Subjective preference for new spaces: fewer visibly interpenetrating operations. It would change published Farmyard outcomes and cannot be substituted silently. |
| **Source leaf scale:** preserve 1.12 × 2 × .16 m; do not fit it to a native catalogue opening by resizing collision. | Source view/footprint dimensions agree. Older decorative catalogue openings can differ; appearance alone is not a playable binding. | One current collider per leaf; no frame-by-frame animation simulation. | Source painted box presentation can be retained; any replacement art must use this same current authoritative pose. Visual acceptance of real content remains a composed Artist/UI/Architect review. |
| **Source costs/refresh:** preserve stop → AP debit → door/edge/log → geometry invalidation → forced sight/fog/contact. | Tests match exact source phase, AP, alerts, logs and revision changes. Combat/alert actions cost 1 AP; calm actions cost 0. A newly triggered contact refill occurs after that debit, as in source. | Refresh runs once per accepted door command; callbacks publish it without a second refresh. Complete replay/CAS cost is bounded but must be measured for the adopting scene. | Preserves stopped routes, revealed guards and the source contact transition. Grenade engagement-before-debit orchestration is a different policy and must not be reused here. |
| **Locks/pairs/damage/vertical/reactive:** refuse before costs. Retain native policies separately. | Source has no functional pairs, locks/keys or door damage. Legacy `edgeLocks` values are difficulty, not a native locked boolean. Guessing would invent mechanics. | Early refusal avoids partially applying unsupported mechanics; no comparative timing measured. | Games needing breach/fire/double leaves require their own complete reviewed profile. Tinderbox's richer fire remains separate. |
| **Load:** strict complete context/journal match, no source repair/relocation. Prefer for this gradual adoption. | Preserves actual injury/AP/position. Detects inconsistent edge/open/geometry instead of repairing it. | Whole-save validation/replay is an intentional bounded cost at action/adoption/load boundaries, not each frame. | Prevents hidden healing, lost injuries or moving the player during a restore. |

Queries must use the same current source geometry for walking, sight, projectile obstruction, grenade arc/blast and presentation. An open leaf remains `kind:'wall'`; opening changes its footprint, not its solidity. No duplicate permanent closed collider survives. If a retained grenade sidecar already exists, adopt a fresh relevant geometry/context at its next action boundary using that component's command/CAS rules; never reconstruct it every frame or reuse its cost ordering for doors.

This profile requires explicit absence of pairs, lock state/difficulty, door damage, nonzero actor/object layers, active fire/fueled actors, reactive scenery and window behavior. Unknown functional facts produce actionable diagnostics with a path and remedy. Partial projection and silently dropping unsupported facts are not supported. Inventory/turn scheduling, injury, clocks, RNG, world authoring and UI remain retained host responsibilities.

## Acceptance checklist and delivery boundary

- [ ] Architect registers the optional export, both adjacent schema URLs/URIs, capability/service declarations and explicit packaged files, assigns the composed version and runs composed gates. [Concrete request](../reviews/farmyard-doors/integration-request.json).
- [ ] Installed public entry resolves its usage card, full guide, schemas and notices. Run `node tools/test-farmyard-doors-package.mjs`; its exact source movement proof covers open, movement/injury/AP adoption, close, complete save/reload, intervening retries and disposal. Temporary consumer/stage cleanup is verified; no preview server is needed.
- [ ] Supply all current geometry and supported ground actors at native source scale. Exercise both edge axes/swing signs, clear reach corners, destination occupancy, mid-arc policy, calm/alert/combat AP and stationary fog/contact.
- [ ] Bind all four version-1 services and a full state/context/host CAS. Missing bindings or unsupported profile/facts refuse before any accepted cost. Test independent host ammunition/RNG changes during commit.
- [ ] Save/restore exact actor coordinates, injury, AP, stamina, ammunition, inventory, RNG, routes, door states and journal. Reject inconsistent edges/colliders, corrupt receipts, stale context, getters/hidden data and aggregate limits before replacing live state.
- [ ] Review real-game rendering and dependent walking/sight/projectile/grenade queries from the same accepted collider, including close after open and reload. This candidate adds no UI/art; composed visual/device acceptance and production game adoption remain outstanding.
- [ ] Dispose/reopen with no repeated effects or borrowed-service teardown. No retained helper is created by this slice; installer test disposes its two temporary directories in `finally`.
- [ ] Run `node tools/farmyard-door-schemas.mjs`, focused tests, `npm run check -- --tracked`, `npm test`, `npm run test:upstream`, `npm run build`, and the candidate installed proof. Pin the accepted full commit in a separate game change. Roll back this optional adoption by restoring the prior game/engine pin; never strip receipts from an existing save.

The candidate does not alter donor worktrees, consumer pins, native part definitions, editor bindings, package metadata, CI or the private Sites audience. Root owns final native/composed review. The implementation's source parity is correctness evidence; it is not a claim of physical accuracy or a production Farmyard integration.
