# Functional parts: builder handoff

The optional parts facade compiles explicit native part recipes into matching static world geometry, door/stair interactions and presentation bindings. A host binds its retained mover getter and permission policy once per compiled scene. Adding another compatible authored assembly uses the same compiler and interaction kernel.

## Identity and readiness

| Field | Candidate contract |
| --- | --- |
| Public imports | `@nautilus-engine/core/parts` and `/parts/fixtures`; compatibility package uses `@nautilus-engine/map-core/parts` instead. |
| API/envelope version | 1. Runtime package remains 0.8.0 pending architect integration; pin the full reviewed commit, not the moving branch. |
| Authored schema | `nautilus-functional-parts`, version 1; URI `urn:nautilus:schema:functional-parts:1`. |
| Definition schema | `nautilus-part-definition`, version 1; exact `id` + `contentVersion` plus compiler-generated SHA-256 lock. |
| Compiled output | `nautilus-compiled-parts`, version 1. JSON is inspectable but cannot be installed as an authoritative scene cache. |
| Runtime save | `nautilus-parts-runtime-save`, version 1, profile `bounded-parts-runtime-v1`. |
| Geometry/presentation profiles | `native-quarter-turn-parts-v1`, definition `native-aabb-parts-v1`, render bindings `native-part-bindings-v1`; query contract 1 / `bounded-kinematic-v1`. |
| Capability | `nautilus-functional-parts-v1`, version 1, plus actual world/interactions capabilities derived by the compiler. |
| Status | Implementation/conformance candidate. The included procedural fixture is conformance-only, with a 1.85 m aperture and 1.7 m test body. It is not an approved art kit or a production game integration. |
| Source/notices | Engine-owned compiler/runtime; existing interaction candidate `25224b9f7994db29d2e05ebdce279c73f4434c1e` with foundation repair `673a656bff1e6e928052f2bb18c378d25048fb47`. See package `NOTICE.md`; no new donor bytes. Original conformance definitions explicitly use source commit `null`. |
| Owners | Coder: ABI, compiler, authoritative runtime, schemas and distribution. Artist: measured native kit/actor evidence. Editor: authoring/history/copy policy. UI: optional presentation/player and readiness UX. Architect: fixed-commit review, integration and release. |

`partsUsageCard()` links this installed guide. `schemaDocuments()` from `/contracts` resolves all four JSON Schemas and their local world/interaction references. Structural schemas complement executable validation: reference integrity, total instance/depth counts, geometry, provider readiness, byte budgets and journal consistency require the executable facade.

## Connect retained services

| Connection | Contract and responsibility | Failure/remedy |
| --- | --- | --- |
| Definitions, required | `discoverPartDefinitions(definitions)` and `compileParts(document,{definitions,bodyProfile})`; explicit plain data, exact content versions, no loader/network. | `MISSING_PART_DEFINITION`, `DUPLICATE_DEFINITION`, `INVALID_PARTS_DATA`. Supply the exact reviewed registry. |
| Body, required for functional doors/stairs | Measured maximum `{radiusM,heightM}` in metres. Each runtime actor must fit this maximum and actual apertures. | `MISSING_BODY_PROFILE`, `APERTURE_BODY_TOO_TALL/WIDE`, `BODY_TOO_LARGE`, `PARTS_BODY_PROFILE_MISMATCH`. Choose genuinely fitting content/body dimensions; do not resize the actor silently. |
| Queries, required for runtime actions | `createPartsQueries(scene,{actors:()=>authoritativeActors,canUnlock?,canLock?})` creates the declared AABB provider with scene identity. Getter includes every live blocker, including hidden floors. Callbacks are synchronous and pure. | `MISSING_PARTS_QUERY_BINDING`, `MISSING_BINDING`, `DOOR_OCCUPIED`, `DOOR_BLOCKED`, `BLOCKED`. Bind once; rebuild when geometry changes. |
| Permissions, required for lock/unlock actions only | `canUnlock({state,actor,door})` / `canLock(...)` return `{ok,code?,reason?}`. Borrowed callbacks are rechecked during commit. | Absent callback: `MISSING_BINDING`. Denied callback keeps its explicit code/reason. Key consumption/cost policy belongs to the atomic host transaction. |
| Time/input, required for movement | Host proposes finite `seconds` in `[0,1]`, walk direction components in `[-1,1]`, or an interaction target. Core reads no clock, RNG, DOM or input device. | Invalid fields/numbers reject. `NO_PARTS_CHANGE` is an unchanged movement sample, not a commit. |
| Atomic persistence/commit, required | Host checks `expectedRevision` and atomically stores returned runtime together with its own costs, resources and checkpoint. Commands use unique host IDs. | `STALE_PARTS_ACTION`, `REPLAYED_PARTS_COMMAND`, `PARTS_COMMAND_ID_REUSED`. Preserve accepted state; never retry effects from an old intent. |
| Presentation/materials, optional to headless core | Read `scene.renderBindings` under `native-part-bindings-v1` and committed runtime state. Supply retained Three/material/actor providers through the separately reviewed UI/Artist seam. | Core does not create a renderer, resolve art files or certify material IDs. Missing presentation must preserve gameplay state and show UI readiness failure. |

Use one installed core provider for compile/runtime calls: immutable scene/runtime handles are private-branded by that module instance. Pass data and the host's authoritative functions into the optional presentation layer. A second physical copy of core cannot install another copy's handles. No event bus, global entity manager, renderer, storage, clock or module planner is required.

## Small runnable connection

Run the following in an offline installed `@nautilus-engine/core` consumer. This example retains the host's actor getter and permission policy. Its persistence function represents a host-owned atomic store; a real game replaces that function with its transaction and deduplicated effect sink. See `tests/fixtures/parts/package-proof.mjs` and `npm run test:package` for the executable installed-consumer proof, including both stair directions and duplicate requests.

```js
import {
  compileParts, assertPartsCompatible, createPartsRuntime, createPartsQueries,
  previewPartsAction, applyPartsAction, pendingPartsEvents, claimPartsEvents,
  serializePartsRuntime, openPartsRuntime
} from '@nautilus-engine/core/parts';
import {partsConformanceFixture} from '@nautilus-engine/core/parts/fixtures';
import {createInteractionActor} from '@nautilus-engine/core/interactions';
import {engineManifest} from '@nautilus-engine/core/contracts';

const fixture = partsConformanceFixture();
const prepared = compileParts(fixture.document, {
  definitions: fixture.definitions, bodyProfile: fixture.bodyProfile
});
if (!prepared.ok) throw Error(JSON.stringify(prepared.diagnostics));
const scene = assertPartsCompatible(prepared.scene, engineManifest());
const stair = scene.interactions.stairs[0];
let runtime = createPartsRuntime(scene, {actors: [createInteractionActor({
  id: 'player', floorId: stair.from.floorId, position: stair.from.position
})]});
const hostData = {character: {hp: 37, ap: 0}, rng: {cursor: 2}};
let durableWire = serializePartsRuntime(scene, runtime, hostData);
// Example retained in-memory store; replace with a real atomic durable commit.
function persistAndAdopt(next, expectedRevision) {
  if (runtime.revision !== expectedRevision) throw Error('Concurrent host change');
  const wire = serializePartsRuntime(scene, next, hostData);
  durableWire = wire;
  runtime = next;
}
const queries = createPartsQueries(scene, {
  actors: () => runtime.actors, // add all game-owned dynamic blockers here
  canUnlock: () => ({ok: true}),
  canLock: () => ({ok: true})
});
let sequence = 0;
function act(request) {
  const preview = previewPartsAction(scene, runtime, {
    id: 'example-' + ++sequence, actorId: 'player', ...request
  }, queries);
  if (!preview.ok) throw Error(preview.reason);
  const result = applyPartsAction(scene, runtime, preview.command, queries);
  if (!result.ok) throw Error(result.reason);
  persistAndAdopt(result.runtime, result.expectedRevision);
}
act({kind: 'interact', targetId: stair.id});
act({kind: 'advance', seconds: 0.5});
const pending = pendingPartsEvents(scene, runtime);
if (pending.length) {
  const claim = claimPartsEvents(scene, runtime, {
    id: 'example-effects-1', sceneId: scene.id,
    expectedRevision: runtime.revision, eventIds: pending.map(event => event.id)
  });
  if (!claim.ok) throw Error(claim.reason);
  persistAndAdopt(claim.runtime, claim.expectedRevision); // save before effects
  // Send claim.events to the game's presentation sink, deduplicated by event.id.
}
const staged = openPartsRuntime(scene, durableWire);
// Validate staged.hostData using the game's own resource schema before adoption.
runtime = staged.runtime; // mid-stair distance preserved; staged.events is []
console.assert(runtime.actors[0].traversal.distanceM > 0);
console.assert(staged.hostData.character.hp === 37);
console.assert(staged.hostData.character.ap === 0);
// No owned process, renderer or subscription was created; host services survive.
```

The example's interaction IDs are compiled data. A placed assembly never requires manually entered world-space door/stair records. Preview is pure; apply repeats live queries. Rejected results return the unchanged runtime and `events:[]`. Successful action commits also return `events:[]`; effects stay in the pending outbox until a separate durable claim.

## Authoring ABI and semantic identity

All fields are exact and required unless explicitly marked optional below. Unknown fields/versions, accessors, hidden/symbol fields, sparse arrays, functions, nonfinite values and nonplain objects reject before cloning or invoking user values. Authored documents may preserve `connection.to:null` as incomplete work; compilation returns an actionable failure without replacing the last accepted preview/history.

| Record | Shape and semantics |
| --- | --- |
| Definition | `{kind,version,id,contentVersion,label,profileId,parameters,floors,parts,source}`. `source` contains `{project,commit,path,notice,guide}`. Content version is an exact opaque ASCII key, not a range. Definitions are immutable content; changing bytes changes the SHA lock even if the author reused a version. |
| Parameter | Number: `{id,type:'number',default,min,max,unit:'metres'|'scalar'}`; boolean: `{id,type:'boolean',default}`. Numeric values may use `{parameter,scale,offset}`; boolean conditions may use `{parameter}`. No expressions/scripts beyond these typed substitutions. |
| Local floor | `{id,elevationM}`. Functional instances resolve the transformed elevation to exactly one explicit existing world floor. The compiler never invents a layer-to-metre conversion or floors with duplicate elevations. |
| Document | `{kind:'nautilus-functional-parts',version:1,profileId:'native-quarter-turn-parts-v1',revision,world,instances,connections}`. `world` is an unchanged strict world-v1 base. |
| Instance/assembly | `{id,definition:{id,version},transform:{x,y,h,quarterTurns},parameters,initial,mode,children}`. Translation is metres; quarter turns are integers 0–3. IDs are globally unique across the tree. Empty definitions can be assembly containers. A decorative parent forces decorative descendants. |
| Initial override | `{partId,open?,locked?}` with at least one setting, targeting this instance's declared door. Defaults remain in the definition; accepted live state is kept separately in runtime. |
| Typed connection | `{id,kind,from:{instanceId,partId},to:{instanceId,partId}|null}`. Kinds: `door-aperture`, `stair-from`, `stair-to`. Local bindings and external bindings cannot both occupy one source port. Cross-assembly targets in the same document are allowed and validated. |

Common part fields are `{id,type,floorId,material}`. Native procedural recipes are explicit:

| Type | Additional data |
| --- | --- |
| `slab` | `bounds:{min,max}` with `{x,y,h}` points; top equals the local floor height. `holes:[{id,enabled,rect:{min:{x,y},max:{x,y}}}]` cuts real geometry. |
| `solid` | Native `bounds`; no supporting top is inferred. |
| `wall` | `axis:'x'|'y',origin,lengthM,heightM,thicknessM,openings:[{id,enabled,offsetM,widthM,heightM,bottomM}]`. Opening IDs become portal semantics. |
| `door` | `portalId` (same-instance aperture ID or `null` for a typed external connection), `axis,origin,hand:'start'|'end',hingeInsetM,leaf:{widthM,heightM,thicknessM,offsetM,bottomM},swing:-1|1,reachM,initial:{open,locked}`. Swing is exactly a signed quarter turn. Native offsets are preserved. |
| `stairs` | `from/to:{floorId,surfaceId,position}`, explicit `path:[{x,y,h},...]`, `widthM,clearanceM,bidirectional,reachM`. `surfaceId` is a same-instance slab part ID or `null` for the typed external connection. The actual route must clear solids, dynamic leaves and the measured body. |

Canonical authored IDs use a bounded ASCII alphabet. Instance IDs are 1–24 characters; local semantic IDs are 1–32; the source alphabet permits `: /`. `partIdentity(instanceId,kind,partId)` reversibly encodes both IDs using canonical unpadded base64url; `decodePartIdentity` checks canonical form. `pieceIdentity` adds a canonical base-36 piece number. Generated IDs fit the shared 96-character grammar without truncation, substitution or hash collision assumptions. Collisions with base-world IDs reject explicitly.

Editor owns duplicate/delete/history commands. Copy must allocate fresh IDs for the entire selected tree, remap every internal connection and declare the external-edge policy: keep its explicit outside target or preserve it as unresolved `null`. Never reuse generated compiled IDs as authoring keys. Loading a document preserves authored IDs. This facade validates the resulting tree; it does not mutate another editor's history.

## Compiled output and presentation

`compileParts` returns `{ok,status,scene,diagnostics}`. Status is `functional`, `decorative`, `incomplete` or `unsupported`. Diagnostics contain stable `code`, authored `path`, `reason`, `action`, `instanceId`, `partId` and native `definitionPath`. `scene.sourceMap` also records definition ID/version, authored instance path, definition property path and generated record role. Use these fields to select the affected authoring part; preserve the complete failed document.

The immutable scene contains `world`, `interactions`, `renderBindings`, `portals`, `floorBindings`, `definitionLocks`, `bodyProfile`, actual `requirements`, `source`, `sourceMap` and a SHA-256 `id`. The fingerprint includes settled geometry, poses, initial conditions, bindings, exact content locks and body/profile identities. Revision counters and source-array indices do not establish geometry identity. Reordered registries/children/connections yield the same settled scene ID. Any geometry/content/profile change requires recompilation and a deliberate new session or reviewed migration.

Render bindings are generic `box`, `door-leaf` and `stairs` records. They share part/source IDs and native dimensions with queries. Functional boxes name a static `surfaceId`. A door binding contains hinge, full native leaf, closed/open yaw, portal ID and dynamic `doorId`; the committed interaction state chooses its pose. The leaf is never a permanent static surface. Stair bindings share the exact authoritative route, width, clearance and `stairId`. Decorative bindings use `null` interaction/surface IDs and create no collision or behavior.

World coordinates are `(x,y,h)`, with horizontal x/y and height h, all metres. Three coordinates are `(x,h,y)`; supplied door yaw already has the corresponding sign conversion. Local wall origin starts its positive x/y run; wall thickness is centred about that run. Slab bounds retain their native thickness. Quarter turns compose through parents; no automatic scale fitting occurs. The nominal kit story height is 2.12 m, while actual stored floor elevations remain authoritative.

This profile checks conservative AABB door motion envelopes against static solids, other leaves' reserved envelopes and all live occupants. Exact face contact is allowed within `1e-7` m. It may refuse a physically possible arc near a corner; it does not promise swept mesh accuracy. Stairs follow an explicit continuous support route, with actual supporting landing footprints and full-body sweeps through slab holes. Decorative treads, floor visibility and animation markers cannot establish movement or confirmed arrival.

Unsupported cases reject explicitly: scale, mirror, arbitrary rotation, curved/non-AABB worlds, paired leaves, missing/ambiguous native floors, misaligned ports, missing support, functional links to decorative support, over-budget inputs/outputs and unsupported legacy export. `exportPartsLegacy` returns `PARTS_LEGACY_EXPORT_REFUSED`; legacy readers return `UNSUPPORTED_PARTS_ENVELOPE`. Tinderbox flat-yard returns `UNSUPPORTED_CAPABILITY`. Keep the source envelope; unchanged portable map/block, character and world-v1 schemas remain separate.

## Saves, effects and lifecycle

`serializePartsRuntime(scene,runtime,hostData)` returns canonical JSON with exact scene/profile ID, definition locks, matching strict world, complete runtime and plain host-owned data. Runtime includes initial and current movers, current interaction state, bounded ordered action/claim receipts and claimed event IDs. Restore checks the whole staged bundle, replays accepted geometry/kinematics against the exact scene and compares derived records/events. It never calls live permission callbacks, consumes keys/resources or dispatches effects. An inconsistent record, route, hash, receipt or geometry identity rejects before replacing the caller's live state.

`hostData` is preserved without game interpretation. The game validates its own stats/inventory/clocks/RNG and atomically adopts both staged halves. No healing, resource refill or portable-character normalization occurs here. These hashes are consistency/content identities, not signatures or an authorization system.

Each host action and event claim needs a unique durable ID. Root `revision` includes claims as well as movement/interactions, preventing an older movement write from overwriting an effect acknowledgment. Persist the claimed state **before** dispatching returned events. A crash after persistence may omit a cosmetic effect; exactly-once external delivery additionally requires the game's idempotent sink/transaction. Reload returns `events:[]`. Unclaimed events remain explicitly pending; the host decides whether a resumed presentation should claim or suppress them. Never award rewards/costs from animation callbacks.

Bounds: 8,000,000 UTF-8 bytes per complete input/save, 1,000,000 for host data, 64 definitions, 128 parts/definition, 256 total instances, 8 child levels, 1,024 connections, 128 movers and 4,096 combined action/claim receipts. This first bounded profile does not silently evict receipts. At the limit preserve the checkpoint and deliberately migrate to a new session/command namespace; continuous high-frequency production movement needs an accepted checkpoint/receipt compaction design before adoption. Large-scene pathfinding/physics and arbitrary geometry are outside this profile.

The facade allocates plain immutable data and query closures only. The host owns live state, time, persistence, input and policy; UI owns renderer subscriptions/assets it acquires. Core has no subscriptions, processes or asynchronous loads to dispose. For scene replacement, stage compile/content/presentation first, check cancellation/current selection, then atomically adopt; dispose only newly owned presentation resources on failed/late loads. Preserve borrowed host Three, services and the prior live scene. UI/Editor lifecycle proof is a separate dependent acceptance item.

## Builder checklist and evidence

- [x] Public exports, installed guide/schema URLs and offline dependency closure: `npm run test:package`, including `tests/fixtures/parts/package-proof.mjs`.
- [x] Required bindings, missing permissions, stale scene queries and actual capability negotiation: `parts-runtime.test.mjs`, `parts-boundaries.test.mjs`.
- [x] Native transforms/holes, matching geometry/render/source IDs, body clearance and generic wider/rotated layouts: `parts-compiler.test.mjs`; concrete authored/compiled JSON under `tests/fixtures/parts/`.
- [x] Entry door, continuous stairs both directions, live/offscreen obstruction, stale/repeated commands and durable effect claims: `parts-runtime.test.mjs` and installed proof.
- [x] Mid-action restore, exact content/geometry identity, tamper rejection and unchanged host HP/AP/RNG: `mid-stair-save.json`, runtime and boundary tests.
- [x] Independent JSON Schema validation: `tools/validate-parts-schemas.py` with isolated test-only `jsonschema==4.23.0`; all external refs resolved locally. This Python dependency is absent from runtime distributions.
- [ ] Approved native Artist kit/model/paint and measured real actor. Conformance proxy dimensions do not satisfy visual acceptance.
- [ ] Editor placement/move/rotate/copy/delete, single-transaction undo/redo and import/export readiness using fixed reviewed ABI/presentation pins.
- [ ] UI desktop/phone title -> prepared player, renderer parity, focus/errors, cancellation/retry, floor-follow and owned cleanup with real art. Package 0's browser evidence covers the existing reference yard only.
- [ ] Architect independent integrated review/release and a separate exact-pin game adoption. No consumer pin or Sites audience changes are included.

Run `node tools/parts-fixtures.mjs` and `node tools/parts-schemas.mjs` to verify fixed JSON and schema generation. `--write` deliberately regenerates reviewed fixture/schema bytes. Full engine gates remain `npm run check -- --tracked`, `npm test`, `npm run test:upstream`, `npm run build` and offline package tests. The implementation acceptance report records the full candidate lineage, runtime/workload and measurements; static/headless evidence makes no rendering or physical-device performance claim.

For the first two-story authoring proof, prefer this explicit native recipe over inferred collision from catalogue meshes: it connects visible openings/poses and authoritative traversal (**accuracy**, code-backed geometry checks); its bounded AABB work is inspectable, while frame-rate gains remain unmeasured (**efficiency**); selectable native art and game-owned permissions/costs preserve Farmyard/AFT/Tinderbox choices (**narrative**, provisional judgment). A richer hinge/shape provider may suit detailed interactions later. Tinderbox fire/collapse needs its own model and evidence; this profile makes no substitute claim. The compatibility interaction/world profiles remain separately usable.
