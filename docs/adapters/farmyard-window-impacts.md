# Confirmed pane impact and retained save candidate

Status: **bounded implementation candidate for Architect review**. This continues
accepted compile/query head `38db463ac44acb5d9a93d3d94a7532123d0c121c` on
`codex/farmyard-window-impacts`. It supplies headless state, confirmed-impact,
transaction and complete retained-save boundaries. Public root registration is
**unapplied**: automatic approval review rejected that integration-owned change.
[The exact registration request](../reviews/farmyard-windows/impact-registration-request.json)
is reviewable separately. Until it is approved and the declared package proof
passes, full-profile adoption remains unavailable; the installed proof is an
explicit private overlay. Engine release version and consumer pins are unchanged.

| Builder field | Implemented boundary |
| --- | --- |
| Proposed entries | `./windows` (kernel/geometry), `./adapters/farmyard/windows` (native definitions and retained host connector) |
| Schema/API | `nautilus-window-pane-state` v1; `nautilus-farmyard-window-host-save` v1; geometry snapshot v1 |
| Named policy | `farmyard-quarter-turn-first-hit-pane-v1`; exact accepted native bounds/joins/IDs/quarter turns; a confirmed first glass hit stops and breaks one pane |
| Authority | Explicit trusted synchronous host callback, bound through an opaque authority handle. A query, saved mask or `confirmed:true` value cannot authorize a fresh transition. |
| Durable identity | Canonical typed host command + round + index, scoped by profile/scene/state/content epoch/content digest in receipts |
| Persistence | Complete 128-record journal, exact initial geometry/masks, current masks/tokens, complete retained source, set representation and original sequence origin |
| Ownership | Host retains rolls, actual weapon costs/stock, scheduling, guard policy, actors, geometry composition, inventory, clocks/RNG and persistence |
| Source | Fixed Farmyard `251bf8094b5f9ebe44208443084c1a6d6658512a`; [immutable source hashes/notices](../reviews/farmyard-windows/source-audit.json), original bytes separate from adapters |
| Limits | Existing 1,024 placements/15,360 members; 128 durable impacts; aggregate complete save 8 MB/500,000 nodes/depth 24; no eviction/repair/implicit migration |

`createWindowState(compiled,{id,contentEpoch,broken})` is only for a deliberately
new authority epoch. `broken` must explicitly equal the compiled initial host
observation. `openWindowState(baseCompiled,input)` validates the saved scope,
complete journal and deterministic native-member replay. It never calls a new
constructor to replace saved history. The returned state is immutable;
`windowStateGeometry(state)` yields its exact current opaque query handle.
`serializeWindowState(state)` writes that complete state. These pure operations
validate portable history; they do not authenticate an untrusted remote save or
adopt it into a live host. Trusted whole-save approval and atomic adoption are
separate required bindings.

`stageConfirmedWindowImpact(currentGeometry,state,packet,{authority})` first
checks current scope and canonical identity, then finds the durable receipt.
An exact retry returns that receipt, current state and empty effects/consequences
before new-request stale checks. Changed payload under that key returns
`COMMAND_ID_CONFLICT`. Another state/epoch/content refuses before receipt lookup.
A fresh request must match current revision, exact geometry digest/revision and
native first window hit at its precise point/direction. Embedded origins refuse.
The active trusted authority must attest the exact receipt/geometry/host/query
tokens. No authority or a bare boolean returns `UNCONFIRMED_IMPACT`.

The packet retains the approved fields and makes the exact query proof explicit:

```js
{
  version: 1, id: windowImpactId(hostCommandId, round, 0),
  profileId, sceneId, stateId, contentEpoch, contentDigest,
  expectedRevision, placementId, partId, paneId, definitionDigest,
  confirmation: {
    hostCommandId, round, impactIndex: 0,
    geometryRevision, geometryDigest, hostToken, queryToken,
    cause: 'bullet', point: {x,y,h}, direction: -1,
    ray: {purpose:'projectile', floorId:'ground', from:{x,y,h}, to:{x,y,h}}
  }
}
```

String/integer host IDs remain distinct, with bounded ASCII strings and safe
integers; negative zero is rejected. Round/index syntax is 0–65535, but this
source profile admits **index zero only**. IDs are exactly
`JSON.stringify(['window-impact-v1',typedHostId,round,index])`; receipts are
`JSON.stringify(['window-pane-receipt-v1',profileId,sceneId,stateId,contentEpoch,contentDigest,typedHostId,round,index])`.
Target, definition, revisions, point/direction/cause, ray and host/query tokens
are payload, not another deduplication key. Retry keeps the original payload and
IDs even after later actions or reload. Derived identities are bounded at
192/768 characters. No aliases, penetration, pellets, blast cascades or additional
source impact indices are enabled. `flame` uses the matching single first-hit
flame ray; spread/fire/reactive policy remains host-owned and unimplemented here.

Glass advances the mask once; frame/sill/mullion/lower-wall hits create durable
solid-hit receipts without breaking glass. Every accepted impact advances the
kernel geometry revision and reuses immutable native content. A subsequent round
queries prospective current geometry through the new hole. Receipts retain no
replayable cosmetic effects. The fresh stage result has detached once-only
observations, published only after acknowledged persistence.

`connectFarmyardWindows(services)` requires all six own version-1 service records:

| Service ID | Binding fields after `version:1` |
| --- | --- |
| `fixed-window-definitions-v1` | `definitions: FARMYARD_WINDOW_DEFINITIONS` or the exact reviewed synchronous equivalent |
| `complete-window-query-composition-v1` | `context({source,geometry}) -> contextToken`, `capture({source,geometry,ray}) -> {hit,contextToken}`; include all current world, dynamic members and actors; null means the nearest complete-world hit is not a window |
| `confirmed-impact-authority-v1` | `confirm({source,command,hit,query}) -> {attestation,sourceNext}` only after a trusted successful outcome; return a separate prospective host with actual costs/stock/RNG effects staged by the game |
| `atomic-window-context-commit-v1` | `read() -> liveJointSave`, `compareAndSwap({expected,next,nextContextToken,canCommit}) -> boolean` |
| `window-geometry-invalidation-v1` | `invalidate(observation)`, `publish({geometry,source,receiptId})`, optional `present({receiptId,effects})` |
| `complete-window-save-staging-v1` | `validate({operation,save,previousToken}) -> true` after validating all retained game meaning, extensions and permitted save origin; false refuses |

Callbacks are borrowed and synchronous. Inputs/outputs are detached; geometry,
confirmation and whole-save validation must leave their loans unchanged. Missing
services, a metadata-only promise or version 2 refuse. The bound connection's
manifest describes actual bindings; the engine manifest must never advertise
these host promises. `windowRequirements` requires pane behavior plus all six for
authored live panes; `windowCompatibility`/`assertWindowCompatible` give individual
service/version diagnostics and binding remedies. Root currently has not
registered the new engine schema/behavior either, so offline candidate APIs do
not imply package availability.

`binding.query(ray)` returns a read-only complete-world candidate, exact host/query
tokens and packet scope. The native window query is independently checked before
a fresh stage. `windowCompleteQueryToken` binds the complete source token,
geometry digest, complete world/actor context token, ray and selected hit.
The context token must also cover borrowed geometry or actor registries that
can change independently of the retained source; it is not merely the pane
revision. The query and context calls must agree. Geometry/ray loans are frozen
detached views, and source loans are detached and checked for mutation.
Querying never creates a
successful roll or attestation. Only the host's trusted confirmation callback may
return `windowImpactAttestation(packet)` after checking its own authority. A
client must never be allowed to install that callback or approve its own save.

`binding.perform(packet)` captures intent before callbacks, stages confirmed host
and pane changes, validates the entire prospective paired save, and transfers a
separate copied `next` to CAS. The host must atomically compare `expected.token`
with `farmyardWindowHostToken(current)` (covers all retained data, state, base
geometry and sequence origin), compare `expected.contextToken` against the
complete current world/actor registry token, and call
`canCommit()` **immediately before the synchronous write**. The fence is valid
only during that CAS call; disposal/reentry/expired operations cannot revive it.
Do not write, return a promise and check the fence later.

A false acknowledgement leaves the current authority intact. A throw or
nonboolean acknowledgement returns `COMMIT_OUTCOME_UNKNOWN`, `committed:null`,
no effects and the exact original recovery command/receipt ID. Read authoritative
persistence and retry that command: before-write failure stages once; after-write
failure finds the receipt and stays quiet. Never allocate a replacement ID or
refund on an uncertain outcome. A true acknowledgement stays committed even if
publication throws, disposal occurs or another host action makes it stale.
Before each route/geometry/presentation publication the connector checks complete
current ownership and the prospective context token again and stops later
publication if stale/retired/unavailable. Exact impact retries do not consult
query/context/confirmation services, so a registry outage cannot repeat a debit.
Errors are formatted without invoking hostile message getters/coercion hooks.

The complete live/save envelope is `{kind,version,geometry,windowState,
sequenceOrigin,source,setFields}`. `createFarmyardWindowHostSave` deliberately
pairs a validated fresh/existing pane state with the retained host and explicit
native sequence origin. `openFarmyardWindowHostSave` and
`serializeFarmyardWindowHostSave` validate the complete bounded prospective
envelope. Source placement order/IDs/dimensions/joins/appearance, broken masks and
sequence must agree with pane authority. All covered current edges, jail doors,
locks, occupants and original underlays are checked again. Raw native underlays
are retained and require matching reviewed semantic facts.

Retained source fields and unknown bounded JSON remain in original field/array
order. Actor damage, spent AP/stamina/ammo, queues, clocks, seeds, inventory and
future fields are copied without normalization. Only acknowledged glass changes
the source mask, sequence and its native revision; the trusted host stages its
own other consequences. The three native fog/detection sets are explicitly
preserved through `setFields` (`seen`, `visible`, `detected` order). Missing masks
or counters refuse. Source cosmetic event tails are preserved but never produced
or replayed by loading; live once-only pane observations use the acknowledged
receipt path. No source game repair/relocation loader is called.

`binding.save()` invokes whole-save validation. `binding.restore(saved)` stages
the complete save before CAS; it refuses changed scope/content, changed initial
geometry or a missing/changed prefix of current durable receipts. No cosmetic
events replay. A changed accepted restore invalidates/publishes current geometry;
an exact restore is quiet. A new content epoch or intentional rewind requires an
explicit reviewed migration/archive, outside this API. `dispose()` retires only
the owned connection and its two-entry validation cache; borrowed host services
remain alive. The cache retains no extra durable authority and may be discarded;
all 128 receipts stay in the complete save.

Accuracy preference for this FC use case remains the source first-hit geometry
and one-pane-per-round tactical rule, not physical glass penetration. Unlike the
source's cosmetic 128-event tail, the complete receipt journal protects retries
and persistence. Efficiency: immutable geometry is revised without re-resolving
definitions/recompiling native bounds; a two-entry validated-content cache avoids
repeat replay on unchanged reads. Worst-case cold replay is bounded by 128 impacts
and 15,360 members. These are code-based bounds, not an FPS claim. Narrative
preference is subjective: stable holes and once-only break cues preserve tactical
readability; Tinderbox heat, traversal and richer materials remain separate.

The [installed conformance fixture](../../tests/fixtures/farmyard-window-impacts/package-proof.mjs)
binds real pinned source complete-world/actor queries, a retained successful-host
outcome ledger, fixture-owned one-AP/one-round debit and complete-save validator.
It proves source hit/mask parity, uncertain-write recovery after later actions,
quiet reload retries and preserved injured/spent/unknown data. It does not claim
actual weapon-cost adoption, guard AI, renderer or game integration. Existing
door/grenade capability IDs continue refusing windows before costs.

Reproduce: `node --test tests/farmyard-window-impacts.test.mjs`,
`node tools/farmyard-window-state-schemas.mjs`,
`node tools/check-farmyard-window-queries.mjs --write`, and
`node tools/test-farmyard-window-impacts-package.mjs --candidate`.
The package proof removes temporary stage/source fixtures/consumer in `finally`;
no server, browser or watcher is started. **After root registration approval**,
run the package tool without `--candidate` to require actual declared exports,
schemas and whitelist, then run the four repository gates and stop for review.
