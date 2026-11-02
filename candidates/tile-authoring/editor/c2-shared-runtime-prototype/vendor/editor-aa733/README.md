# Private C2 session phase ports — design proposal

Status: **design only, not authorized for runtime implementation**, 2026-11-02.
This proposes two methods on `profile.c2PhasePorts`, inside the existing private
frozen profile supplied to `createSmartTileSession`. It adds no constructor
argument, session, authority, history, public export, registry or saved field.
The accepted planning checkpoint remains `c558d0a1020575ef9b966491a45eddc568dbda9f`.
The current C1 integration input is Architect's fixed
`0b72d5129c7ceedf1a6f371d8b01bd9c4ba4b9f9`.

[Types](types.d.ts), [closed DTO schema](proposal.schema.json),
[usage card](usage-card.json) and [source evidence](source.json) belong to this
proposal. The two files in `references/` preserve the accepted amended Core
Stage A ABI at `8b4cd72c2d8f424d6811196d9651916bb7e9e2bd` byte for byte.
They are type/schema references, not Core runtime imports. Returned Stage B and
Plan3 candidates are excluded. The fixed Artist interface input is
`f029e7e75e225c5f973052552deb61403a2fc915`, read only for pairing design; its
runtime is not imported or declared integrated. Artist pairing remains a
separate fixed review.

Amendment to fixed b088: [owned work contract](WORK-METER.md) and
[work-port types](work.d.ts) require a coordinator-owned attempt meter BEFORE
source/history/DTO preparation and carry it through real ticket and complete
actual WAL validation. All counter implementations remain unbound; this remains
design-only. Core6d is a read-only pairing reference, not combined adoption.

## Minimal changes proposed for later scoped authorization

| Location | Proposed addition; current code stays unchanged here |
| --- | --- |
| Existing private frozen profile | Optional frozen own-data `c2PhasePorts` with exactly `kind`, `version`, `prepare`, `restore`. No default activation or capability from a profile-name string. |
| `packages/windows-authoring/journal.js` | One metered `inspectLive({action}, work)` returning a bounded head/metadata capability. At most one selected target is copied through that handle. No new constructor option, ticket operation, persisted state or mutation in inspection. |
| Same coordinator's work owner | Begin before source/history reads or DTO construction; supply the same intrinsic work/reservation capability through the hook, late ticket, actual codec/WAL and Apply guards. No caller counter or new phase budget. |
| Existing session preparation branch | Recognize only the trusted opted-in phase object; await its preparation before real ticket/operation/WAL creation. All unopted branches execute the existing Plan1/legacy algorithm. |
| Existing session lifecycle | Retain a private owned phase handle through Review/Apply/recovery; dispatch restore for initial load/reopen/presentation retry. Accept/reject/promote remains in this same coordinator. |
| Existing native view manager | Its existing `acquire`, `promote`, `cancel` and accounting remain the sole manager route. No external-record insertion, second manager or uncounted Artist root. A fixed adapter bridge must expose the same actual candidate to Artist. |

The opted-in branch does not weaken the Plan1 metadata equality check. Plan2
still has `tilePreparation:'source-unchanged'`, while its private phase handle
declares `retain-existing` or `replace-owned`. Serialized Plan2 or a new property
on a command cannot select the branch. The coordinator verifies the exact frozen
profile pairing and privately retains its handles; data, TS brands and DTO
digests never establish runtime ownership.

Routing is explicit in the trusted private profile, before acquisition or ticket
creation; a refusal never falls back to another route:

| Intent | Route |
| --- | --- |
| Unopted profile or existing C1 Plan1 command | Existing algorithm and guards, including metadata geometry/appearance equality. No unconditional interception of C1 commands by C2. |
| Core Stage A `content.import`, `surface.layers`, `decoration.add`, `decoration.update`, `decoration.remove` | These remain Core planning scope. This amendment's small meter control is ONE existing-mark opacity update; it is not completed overlay wiring. First import/layers/add and subsequent edits need the paired seams listed in WORK-METER.md. No partial-command split. |
| Live history with the same supported opacity difference and unchanged complete bundle/constraints/source bindings | Opted-in Plan2 history path using the inspected exact target and `command:null`; other composition remains gated. |
| Geometry-changing history/placement with marks, Stage B defaults, grouping or other unsupported composition | Preserving refusal before creating a ticket until the applicable fixed Stage B/Plan3 route is accepted. Do not treat the old geometry-only restore as a complete marked-world restore. |

Where a C1 route lacks the actual required resource pairing on a marked document,
report that missing binding; preserving its guard does not grant new readiness.

## Read live history without starting a ticket

The existing journal exposes `snapshot`, `beginUndo`, `beginRedo`, `beginEdit`,
`beginOpen`, `beginRebuild`, `accept`, `reject`, `cancel` and `setContext`. It has
no copied-target inspection API. Calling `beginUndo` to find its target creates
a ticket and advances the private ordinal, so it cannot perform the early read.

Proposed `inspectLive({action}, work)` returns an owned head with exactly
`LiveHistoryInspection` metadata: kind/version, existing private ordinal as
generation, revision/contextKey, current document digest/bytes, undo/redo
counts/byte totals and current head metadata, state digest, pending flag and
fixed limits. It exposes no whole-history text arrays. Inspection uses the
already-created owned meter and neither mutates ordinal/revision nor creates a
ticket, compiles, allocates native resources, writes, notifies or returns a live
pending ticket. Only `head.copySelected(work)` may copy the one selected text.

The sum of both stacks remains at most 64 entries and 16,000,000 encoded UTF-8
bytes; each text uses the current 16,000,000-byte document ceiling. Schema
character bounds do not replace encoded-byte checks. No limit is increased.
The coordinator binds actual owner metadata and its metered state digest, then
copies/parses the exact selected target under a prior reservation. Current source
digest/bytes must match the actual document. Resource obligations come from owned
entry facts or a metered owner-side scan, never free full-stack copies or assumed
empty nonselected entries. A pending live ticket refuses another prepare.

Immediately after final bind, the coordinator reads `inspectLive()` again and
requires the same owned head, generation, context, source metadata and digest. It then
calls the EXISTING `beginUndo`/`beginRedo` synchronously, before any callback or
await, and verifies `ticket.targetText` against the copied selection. Edit uses
the existing `beginEdit` with the final bound document. A mismatch rejects the
actual ticket and retires unadopted preparation; it never restamps the selection.
History generation catches cancel/context/ticket ABA even if content is equal.

Ticket creation itself advances that ordinal. Currentness therefore has three
coordinator-owned phases: before-ticket compares the original inspection exactly;
ticketed permits only the same real ticket object at original ordinal + 1 with
unchanged base revision/context/selected target; staged additionally permits only
the exact original operation's pending WAL and unchanged settled receipt prefix.
The coordinator records those actual identities synchronously. It cannot admit a
second ticket, foreign same-count transition or arbitrary caller-supplied digest.
The phase handle's currentness predicate recognizes only these owned transitions;
it never refreshes Expected, SourceCapture, original generation, bindings or token.

This is live session history. Cold/new-session reopen starts a new history with
undo/redo zero; the unchanged checkpoint retains its actual transaction journal,
receipts and pending operation. Do not reconstruct old stacks/cursor from those
receipts. The original in-memory history is retained only while that session owns
it. Persisted receipts/pending keep their required bytes independently.

## Hook arguments, results and capabilities

`prepare(input, scope)` receives one closed `PrepareInput` and a borrowed live
`PrepareScope`. Edit carries its original canonical Command@1 and no history
selection. Undo/Redo carries `command:null`, a selection with the same action and
no reconstructed edit. All cases include the actual source checkpoint/document,
unchanged 12-field Expected, context, bounded live-head metadata and six resource-reference
obligation sets. The source checkpoint/journal digests and command/request IDs
are checked against the actual original source, not accepted merely from JSON.
`workAtEntry` records already charged DTO/source work; its ownership and carry
must match `scope.work`, which existed before those values were prepared.

The scope has exactly `signal`, `work`, `isCurrent`, `native`. Its native port has exactly
`readiness`, `acquireCandidate`; it supplies no writer, authority.commit, journal
ticket creator, scene registry, ID generator or mutable floor/input owner. Native
acquisition delegates to the same session's existing `views.acquire` and returns
an owned wrapper for its actual record/view. The wrapper cannot be manufactured
from a GeometryObservation. Artist must work on that view, without independently
constructing another public projection and claiming sharing.

`prepare` returns an owned frozen phase handle or `PhaseRefusal`. Its data binds
the real SourceCapture, capacity, Plan2, actual PreparedCapture, final pure target,
original history generation/digest and scoped storage coverage. All three counts
for real tickets, real operations and durable writes are zero. The owned handle
adds `isCurrent`, `validateCommit`, `onOutcome`, `retireUnadopted` and one private
native disposition. It owns resources only; it cannot apply, accept history,
publish the document or make an authority outcome. UI/JSONL receives only the
unchanged Review@1 or structured refusal, never this live handle or its scope.
The handle retains the identical work port through the late ticket/actual WAL;
returning from the hook does not end or reset its attempt meter.

Private refusal identity is explicit: prepare scope has the original requestId
and null resource/pending-scope fields; restore scope has requestId null, its
resourceScopeId and any actual original pendingRequestId. Cleanup's ownerId is
the original request or restoration resource scope respectively. Restoring a
document never manufactures a canonical edit request ID to report a load error.

`restore(input, scope)` is a distinct load operation, described below. Function
arguments, AbortSignal and owner-map capabilities deliberately have no JSON
schema. The schema covers their named data arguments/results, never permissions.
Implementations must reject unknown own keys, getters, symbols, mutable unexpected
data and foreign handles; TypeScript structural typing alone is not that check.

## Preparation order and real transaction handoff

1. The coordinator serializes entry and creates its owned attempt meter BEFORE
   source/history inspection/hash/copy/parse/serialization or hook-DTO construction.
   It charges actual source/ingress/head work, seals the original identity once
   and passes already consumed work plus the SAME live port into prepare.
2. The hook obtains a real owned source lease and calls the accepted pure Core
   planner. Only appearance-only Plan2 is supported: exact sourceJSON, document
   identity, floor/finish binding, bundle and constraints remain unchanged.
   History uses the copied exact historical document/contentRevision.
3. The Host computes the frozen capacity-only bound from complete before/target,
   actual persisted journal/receipts/pending and live history, including all
   retained source/target/wrapper representations and prospective WAL/ticket bytes.
   It creates no dummy operation, ticket, receipt or placeholder proof. Capacity
   and preparation carry one owned ledger with separate capped work domains;
   no phase resets or converts them. Hold final-bind, late-ticket, actual-WAL, Apply and cleanup reservations
   before native acquisition; a reservation is not actual observed work.
4. Check the paired native readiness and currentness, then reversibly acquire
   verified encoded data, needed decoded/staging/material allocations and the
   actual native candidate base view. For changed pixels, its complete second
   root/cells/triangles/geometry buffers count even though bundle source is equal.
   An encoded-only retain-existing route keeps the actual error/debt/witness.
5. Admit only this owned source-to-candidate transition. Obtain actual native and
   physical ledger observations/retirement trace and the full PreparedCapture.
   Frozen source material/residency rows and all unverified debt remain charged;
   same-count foreign allocation or allocation/release ABA refuses.
6. Call the actual pure binder with the exact Plan2, `prepared:null` and the
   actual PreparedCapture. It binds all nineteen existing fields under the carried
   meter. `finalBindUpperBound` is an unspent reservation, not observed work.
   Even a valid result remains `committable:false` and creates no ticket/WAL.
7. Back in the coordinator, recheck all source/context/history/capability guards.
   Create the real operation and the one real history ticket, then validate the
   complete actual prospective WAL through a paired observer of the unchanged
   actual codec, charging strict reads/copies/hash/escaping/UTF-8 encoding and
   all pending/settled branches. An estimate alone is not an actual work report.
   Missing/overflowing reports end this attempt without reset. Failure rejects
   that ticket and retires only proved unadopted resources. No durable write yet.
   History operations keep their existing persisted `command:null` and
   `authoringBinding:null`; the Core's nineteen history-bind fields remain only
   in the live phase handle. No saved operation fields are added or restamped.
8. Retain the actual operation/ticket/owned handle behind the same connection's
   one-use Review@1. Apply consumes the same three-field request and one review.
   Existing authority stage/final CAS, context checks and source visual witness
   checks remain. `profile.validateCommit` composes the retained C2 handle's
   synchronous `validateCommit`; no new binding or allocation occurs there.
9. The same coordinator accepts the actual authority outcome and real history
   ticket before notification. Only then does it promote the same manager-owned
   candidate or preserve the retained source view. Resource adoption is notified
   through `onOutcome` using a coordinator-owned outcome capability. Observer or
   promotion failure cannot reverse known commit or replay costs/history.

The unchanged source visual witness can remain current while a separate preview
is visible: accepted object/witness/error identities have not been replaced.
This preserves the final unchanged-source guard. On known acceptance the opted-in
branch handles its owned replacement before the Plan1 metadata presentation path;
the latter retains its existing equality/provenance behavior unmodified.

## Cancellation, reentry, failure and ownership

The coordinator owns cancellation and busy/generation state. It creates one
AbortController per prepare/restore and aborts on cancel, disposal, draft/context/
floor-mode change or supersession. The hooks do not start another command queue.
Mutating entry during preparation/notification follows existing reentry/phase
refusals; cancellation only invalidates, it does not start recovery or an edit.

Check `signal` and original `isCurrent()` before and after every await and any
callback-producing native attach, decode completion, preview or cleanup boundary.
Authority/storage CAS remains with the coordinator. A callback's extra retirement
or floor change never becomes a freshly captured source. Throws before possible
write are refusals; throws after possible write follow existing unknown recovery.
`validateCommit` is synchronous with no acquisition, observer calls, writes or
history mutation. External writer hooks remain fenced by the existing final guard.

| Failure/outcome | Ownership and observable result |
| --- | --- |
| Source/plan/capacity refusal | Zero ticket/operation/write; preserve complete document, live stacks/redo, accepted view/error and debt. |
| Native/admission/final-bind failure or late completion | Hook drains its acquisitions, restores accepted display and returns actual cleanup/debt. Final-bind failure creates no ticket. |
| History selection or real-WAL refusal | Coordinator rejects the one actual ticket if created, then calls `retireUnadopted`; zero durable writes. |
| Known not committed | Actual authority outcome permits rejection/retirement; preserve other live and persisted resource obligations. |
| Known committed | Adopt exact refs and accept history once, then promote; later display failure reports committed and retries presentation only. |
| Unknown | Retain original ID/operation, actual ticket if live, source/target/history/receipt/pending/export union and all uncertain resources/debt. No premature candidate cancellation/disposal. |

`onOutcome` transfers ownership synchronously before callbacks and returns a
tracked cleanup promise/observation. It cannot manufacture committed status:
only this coordinator's privately owned outcome capability can call it. Unknown
may later settle through the same original ID; committed cannot become rejected.
`retireUnadopted` is idempotent and refuses resources that might have been adopted.
All cleanup attempts every owned allocation once; missing positive retirement
receipt retains charges. Borrowed Three/materials/atlas/byte owners survive.

The coordinator must not route an unknown C2 candidate through ordinary
`views.cancel()`, which retires its candidate. It keeps the same record frozen and
charged until reconciliation. Visibility changes cannot free or omit it. On
session disposal, detach/fence the scope, preserve durable byte obligations and
drain owned native cleanup; context loss or an opaque driver lifetime is reported
honestly, not converted to a false verified retirement. Root must pair this exact
candidate lifetime with Artist before implementation.

## Restore and cold recovery are part of the gate

`RestoreInput` carries a resource-scope ID (not an edit request), reason, actual
complete checkpoint/document/token/journal, current live history inspection,
derived obligation sets and original pending request ID if present. It has no
command, Origin, operation, new receipt or fake review. `restore` reacquires
immutable bytes and actual native appearance through the same owner/manager
bridge, preserves every required receipt/pending reference, validates hashes and
budgets and returns an owned restored handle with zero ticket/operation/write.
Root must pair this new restore entry; the current base-only bootstrap is not a
complete load of a document with marks.

Boot/new-session reopen creates fresh live history, then renders the actual saved
document. Pending boot retains recovery-required state and the original request;
the restore's resource-scope ID never replaces it. Retry-presentation rebuilds
only the already accepted document and does not edit history or clear receipts.
Same-session refresh retains only its already live history where that existing
policy applies; it is not proof of persisted stacks.

The coordinator performs same-ID authority recovery. Before-write cold recovery
may settle not committed; after-write cold load may already find target/receipt
and be idle. Wrong IDs preserve all state. Inspect a settled original receipt
without reprepare/reapply, new history acceptance or replayed gameplay effects.
After settlement, restore the resulting actual accepted document with fresh
native leases; do not restamp original operation bindings to the new context.
Missing bytes/profile/owner bindings preserve the complete checkpoint and refuse
editable readiness. Old live native handles are not reconstructed from JSON.

## Honest storage scope and Artist pairing

The unchanged fixed ceilings charge all observable application-owned backing
stores, encoded stores, decoder buffers, upload arrays/staging, native texture
requests, actual WebGLBuffer storage requests/identities, material/idle caches,
geometry, acquiring objects and unverified retirement. Count whole backing stores
and full RGBA page copies, not just view lengths or referenced frames. Equal
hashes are not physical sharing; identity/context/epoch and actual owner evidence
are required. Peaks include overlapping source/candidate/retained debt.

Opaque browser decoder internals and driver texture/upload internals are
**unattested**, represented as that literal status, never numeric zero or an
invented upper bound. A WebGL storage request establishes application-requested
capacity, not driver physical memory; `gl.finish` establishes completion of caller
buffer reads, not retirement or an upper bound of opaque driver staging.

`StorageCoverage` is adjacent diagnostic data, not extra frozen Core fields. A
Root-approved private pairing capability must bind the exact application-owned
scope and fixed Artist owner ports before `paired-application-scope` is usable.
A digest in a DTO is insufficient. No new permission to narrow an existing
required quota profile is inferred: if the fixed final-capture/upload-owner
contract still cannot be satisfied, return `C2_NATIVE_ACCOUNTING_UNBOUND`, with
no Review/ticket. Diagnostic rendering may remain explicitly diagnostic; do not
fill missing rows with zero, silently lift caps or claim total GPU memory safety.

| ABI boundary | Pairing requirement/status |
| --- | --- |
| Core SourceCapture → CapacityBound → PreparedCapture → final bind | Use the exact accepted amended Stage A schema/types, original Expected and nineteen bindings; no persisted grammar changes. |
| Artist original frozen capture ABI | Preserve its reference inventory and honor normalized limits/finalBindUpperBound amendments. A stale original inventory is not the amended final capture. |
| Existing manager → Artist native candidate | Artist must decorate the actual manager-owned public projection. This bridge is unbound until a fixed reviewed adapter can retain that same view. |
| Artist final capture and upload owner | Required actual live owners; presently unbound. No synthetic DTO, assumed sharing or byte estimate stands in for them. |
| Restore/pending retention → Artist owner | New proposed load seam must acquire/retain the same complete immutable resources without creating an edit or second scene authority. Separate fixed pairing required. |

The concrete `f029e7e` differences are gates, not implemented adapters:

- `AppearanceOwner` exposes `capture`, `prepare`, `observePrepared`,
  `retainUnknown` and `diagnostics`. Its `PrivatePreparation` explicitly has
  `formalABIAdmittable:false`. None of these results is a frozen Core capture,
  adopted editor transaction or receipt.
- `prepare` calls its own `PublicViewOwner.create` and returns only
  `candidateViewId` in data. The proposed session bridge cannot retrieve/adopt
  that native record through a JSON ID. Root must reconcile a single actual
  creation/handoff capability with the existing session manager; do not create a
  second base view to satisfy each owner independently.
- `PublicViewOwner` captures role in private accounting and rejects retirement
  of accepted views; it exposes no promotion/adoption API. A future pairing must
  atomically promote the same actual candidate and retain/retire the previous
  source under the actual outcome, updating owned accounting through its owner.
  An adapter must not mutate `.role` to evade the private checks or claim the
  old accepted root retired because the editor hid it.
- Complete restore is absent from `AppearanceOwner`. It requires an already
  owned accepted source view/document and retained bytes. A fixed load/adoption
  capability must bootstrap/retry that real appearance and preserve pending
  obligations; inventing an edit Origin or calling diagnostic prepare is not a
  load implementation.
- The fixed upload proposal requires a remaining native staging bound and
  refuses strict admission when it cannot be proven. This proposal's explicit
  application-owned coverage cannot override that requirement. Root must approve
  a compatible final contract or leave strict admission unavailable; no current
  port supplies an attested bound for opaque browser/driver staging.

## Static evidence and implementation boundary

The runnable consumer is the static checker, not a fake runtime implementation:

```powershell
node tools/editor-check-tile-authoring-c2-phase-proposal.mjs --typescript-root=artifacts/editor-c2-phase-proof-deps/typescript/node_modules/typescript --python-deps=artifacts/editor-c2-phase-proof-deps/python
```

It authenticates fixed source/reference bytes, type-checks positive and negative
live-port consumers, runs independent draft-2020-12 validation against local exact
schemas, and checks design vectors for phase order, live-history copying/staleness,
unknown retention and honest storage coverage. These are **static proposal
controls**, not native allocations, real WAL/Apply/recovery, browser acceptance,
performance or proof of an implemented journal method. They start no server.
Meter vectors are descriptors/arithmetic examples, not tests of an implemented
meter, public counter or codec adapter. Those future controls must run the real
coordinator as required by the work amendment.
The [recorded validation](VALIDATION.md) separates those static results from
implementation acceptance.

Before any implementation, Root must freeze these phase ports with exact Artist
and applicable Core inputs, authorize only named shared paths, and review failure/
restore pairing. Combined placement/marks still awaits Plan3; Stage B, public
registration/distribution, consumer pins and Sites stay separate. Existing C1 and
older host regressions plus actual three-mode workflows remain implementation
acceptance requirements, not claims made by this proposal.

For shared editor appearance, prefer the explicit opted-in phase and same native
owner over guessing metadata equality or duplicating a coordinator. **Accuracy:**
visible source/target/history/resource relationships remain explicit; no physical
gameplay capability is implied. **Efficiency:** one coordinator and a bounded
read-only history copy avoid duplicate machinery, but serialization/allocation
and work costs remain charged; performance is unmeasured. **Narrative:** local
wear/paint stays on its chosen surface/floor without changing other copies;
appearance quality remains an Artist/UI judgment. This is a provisional design
recommendation pending the actual native-owner pairing.
