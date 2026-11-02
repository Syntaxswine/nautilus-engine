# Owned attempt work — amendment to b088

Design only. This closes the work/input/output ownership gap returned in Root's
pairing review of `b0888e86bc6d65a99ff4688da90c640aa022c12f` with Core
`6d30535589ebdae0110199a324b324ecbe7d674f`. It implements no meter, reader,
public-kernel counter or codec observer. The existing constructors/defaults,
Plan1 guards, twelve Expected fields, nineteen bindings and saved formats stay
fixed. Browser-feasibility drafts and combined Plan3 are not adopted.

## Start before preparing any input

The same session coordinator owns one `CoordinatorWorkOwner`. It begins an
attempt **before** reading/copying/hashing/parsing/serializing its source,
checkpoint, history, obligations or hook DTO. The initial identity retains the
actual original source object and coordinator context epoch without traversing
the payload. Limits come from the owned fixed policy and may only tighten;
normalization/validation work is charged under the initial fixed ceiling.

Ingress work used to build the attempt is not free. Either it runs after this
meter starts, or the actual owned parser's once-only report is consumed before
further preparation. A UI counter, previously serialized diagnostic or matching
ID cannot supply that report. If this pairing is unavailable, refuse C2 before
constructing SourceState or copying history. Separate transport-only validation
does not grant additional editing credit or a second attempt budget.

After metered source/head capture, only the coordinator seals the original
checkpoint token, context token, head digest and generation through `bindSource`.
It validates the exact retained original-source identity; this is once only.
No hook can bind a new source, widen limits, reset/close the owner or mint a meter.
The initial opaque identity permits counted reads before digests exist; it does
not authorize an edit. Stale source capture ends the attempt, not a rebase.

`PrepareInput.workAtEntry` and `RestoreInput.workAtEntry` are descriptive snapshots
of work already consumed constructing those DTOs. `scope.work` is the SAME live
private capability that began earlier. The hook verifies that snapshot with its
owner; counters/IDs in JSON cannot mint it. The returned prepared/restored handle
retains that same `work` object for later coordinator work. Source/history copying
outside the hook therefore cannot disappear into a fresh hook budget.

## Reserve before work; consume actual reports once

The closed types in [work.d.ts](work.d.ts) distinguish these values:

| Value | Meaning |
| --- | --- |
| `charged` | Actual observed cumulative values in each named domain below. |
| `reserved` | Unspent same-domain upper bounds for owned calls/escrow; not measured work. |
| `unresolved` | Bounds held for started calls whose actual report is unavailable; never relabelled actual zero or actual upper bound. |

For each dimension, admission requires `charged + reserved + unresolved + new
reservation <= that domain's effective allowance`. There is NO scalar sum across
domains, implicit conversion, shared pool of interchangeable units or CPU-time
claim. An operation may report several quantities for the same work; each is
consumed once in its own domain. Existing per-object limits still apply.

| Domain / exact field | Unit and reference ceiling |
| --- | --- |
| `authoringReferenceUnits` | Only the actual Core authoring reference model; at most its tightening-only 1,000,000 plannerUnits. Host/decoder/Artist ticks cannot be added. |
| `artistPreparationTicks` | Actual increments in Artist's preparation model, separately bounded by its existing at-most-1,000,000 limit. Its mixed cumulative carry is not an authoring receipt. |
| `decoderTicks` | Actual ScratchJob ledger ticks, separately referenced to the fixed renderer's 64,000,000 default job bound. The first route has allowance **0** and runs no decoder. |
| `publicSteps`, `publicSpatialTests`, `publicGeometryEvaluations` | Three distinct actual public-kernel counts; reference maxima 256 / 100,000 / 100,000, separately tightened to the actual request. All have allowance **0** on the first route; counters remain unbound. No conversion to authoring units is assumed. |
| `inputBytes`, `outputBytes` | Actual payload octets read/emitted; strings use UTF-8, never character counts. Proposed aggregate attempt allowances are no greater than existing 6,000,000 / 4,000,000 bounds, in addition to per-object checks. |
| `hostNodeVisits` | Actual structural-reader/codec node visits, not authoring reference units. Proposed additional aggregate ceiling 1,000,000; each existing Core/Host node/depth limit remains. |
| `copyBytes` | Actual copied octets across backing/string/DTO copies; proposed additional aggregate ceiling 6,000,000. No inferred copies/sharing or conversion from decoder ticks. |

These are distinct bounded domains, not a claim that their numeric maxima mean
equal processor cost. The aggregate byte/visit/copy constraints are additional
non-widening first-route restrictions, not changes to C1. A valid 16 MB Host
object cannot be repeatedly emitted outside the attempt output allowance.
Larger/different routes need their own reviewed policy; no limit is increased.

Actual allocation/residency bytes stay in the existing physical resource ledger:
encoded stores, decoded copies, derived/native buffers, materials, roots/cells/
triangles and unverified retirement keep their unchanged independent caps. Work
bytes/ticks never purchase allocation headroom, and retirement never refunds
consumed work. Before allocation, BOTH the correct work-domain reservation and
actual resource-owner quota admission must hold.

Reserve before inspection, clone, allocation, parse, hash or serialization.
Counter backends claim each bounded slice before executing it. Count actual
UTF-8 bytes, JSON escaping/string-in-string output, visits and actual copies,
including full before/target/receipt/WAL representations. Actual immutable owned
cache reuse may avoid a copy/hash only when the real backend observes that path;
matching client digests or assumed sharing cannot declare work free. Fixed-size
meter metadata/bookkeeping is bounded and charged, not a recursive unbounded log.

`perform`/`performAsync` accept only a reservation plus an intrinsic operation
minted by the paired backend for that actual call. No arbitrary caller callback
or numeric cost DTO is accepted. Sync and async capabilities are distinct; an
unexpected thenable/opaque execution path is not a free continuation. The owner
serializes calls, checks attempt/phase/source/currentness and counter coverage,
consumes the actual observation once and releases the unused bound. Cumulative
kernel reports subtract their authenticated SAME-DOMAIN incoming baseline once; adding the
same carry twice or restarting at zero is invalid.

Only an authoring-kernel receipt may change authoringReferenceUnits; only the
Artist preparation owner may report artistPreparationTicks; the decoder owns
decoderTicks; public-kernel metrics keep their three names. Host/history/codec
readers report actual bytes/copies/node visits. A counter report or reservation
with a foreign domain refuses even if its value would fit another cap.
Current Artist byte-to-tick code is that component's own model, not a proven
conversion into Core units. The strict Core capture/CostBounds grammar remains
unchanged: if a producer cannot bind it using authentic compatible domain reports,
return `C2_WORK_DOMAIN_MAPPING_UNAVAILABLE`. Do not put native/decoder counts into
planningCarry or fabricate zeros to satisfy the old shape.

Transitive validation/currentness/hash work belongs to the active counted call,
including native ownership checks. A nested predicate uses that call's counter
permit; it does not recursively start another perform or reset a meter. Outside
an active call, any payload-reading final check consumes its own preheld guard
reservation. Reentrant mutation/execution refuses; cancellation only invalidates
the original scope. Mutation-free checks can still consume their measured work.

Foreign, reused, exhausted, closed or mismatched reservations/reports refuse.
Only a never-started reservation can be withdrawn. A counter that exceeds its
claimed bound ends the attempt and records the actual overrun honestly; it never
produces Review. Missing/overflowing reports or an opaque throw move the started
reservation to `unresolved` and make the attempt unavailable. They cannot become
nominal one-unit work, a zero report, another public prepare or a reset under the
same original request. Positive cleanup observations do not issue editing credit.

The owner retains the attempted ID/disposition with its connection/source scope;
if its bounded retention cannot fit, refuse rather than evicting a live record
to permit reuse. Only an explicit new attempt with a new ID after known refusal
and cleanup can receive a fresh editing meter. This is not a claim of new durable
pre-WAL deduplication state across process loss.

## Late ticket, complete actual WAL and currentness

Before native acquisition, retain separate escrows for final bind, history-head
recheck, real ticket/operation construction, actual WAL validation, required Apply
revalidation and bounded cleanup. They share the SAME ledger and per-domain
balances; no domain can borrow another's unused allowance. The
existing finalBindUpperBound is a reservation, not an observed final cost.
Unspent ticket/WAL allowance cannot be spent a second time by native preparation.
The coordinator retains critical continuation escrow handles privately.
`claimEscrow` transfers an existing bound to its intrinsic paired phase/call,
without issuing credit; it is not an ordinary withdrawable reservation. The
borrowed hook cannot release a WAL/final-bind/cleanup escrow to finance native
work. Terminal owner finish may release unused escrow only after editing closes.

After final bind, consume actual work for the same-journal head recheck, exact
target text/operation construction and the one actual beginEdit/Undo/Redo ticket.
`CountedCodecPort.validateActualWal` must observe the ACTUAL unchanged codec:
stage the real operation, validate/serialize its complete pending branch and both
prospective committed/not-committed receipt branches. These are actual data
preflights after the real operation exists, not an authoritative acknowledgement.
Include all reader/hash/copy/escaping/encoding/validation and returned metadata
work. A grammar sizer or reserved byte estimate alone is not that observation.

The same meter continues through any actual repeated codec work at Apply/final
guards. Reusing a previously validated immutable value counts the actual reuse
path; unobserved repeated work is not omitted. A late overrun or missing codec
report rejects that one ticket, preserves document/redo and retires only proved
unadopted resources, with zero authoritative writes. No replacement budget or
ticket is created to get a passing result. If a write might already have happened,
use the existing original-ID unknown policy rather than calling it a rejection.

Currentness remains exactly the b088 three phases: before-ticket requires the
original head/source/context/generation; ticketed permits only the coordinator's
exact ticket at original ordinal + 1 with unchanged base revision/context/head;
staged additionally permits only the original operation's actual pending WAL and
unchanged settled receipt prefix. Work increases monotonically, but neither that
owned ticket transition nor pending WAL changes the meter's original source
binding, Expected, generation, SourceCapture, nineteen bindings or tokens.

Cancellation invalidates new claims/calls and ends editing; it does not refund
actual work. Every await/callback boundary checks the same signal, owner and
currentness. Cleanup consumes its previously held escrow. If cleanup's own report
is unavailable, retain unknown work/resource debt and report it; do not restart
editing or fake a positive retirement. The existing safety cleanup still attempts
owned releases; opaque callbacks cannot turn failed accounting into successful
admission. Borrowed resources remain borrowed.

## Bounded same-journal history inspection

`inspectLive({action}, work)` returns an intrinsic head capability and bounded
metadata: ordinal/generation, revision/context, current document digest/byte size,
undo/redo counts/byte totals and each current head's digest/byte size, pending flag,
state digest and unchanged limits. It returns no current/full-stack text arrays.
It is metered before reading/hashing metadata and creates no ticket. The state
digest commits those metadata fields except the digest itself; actual owner and
generation protect the same journal, not a caller's equal DTO.

`head.copySelected(work)` copies at most the one selected target under the same
meter, after a reservation based on owned entry metadata. Parsing/validation of
that target is also counted. Edit has no selected history target. Immediately
before the one real ticket, recheck that same owned head with the retained meter
and metadata; then use
the existing beginUndo/Redo synchronously and verify the exact target and owned
ordinal + 1. Core's proposed observeHead/claimOnce may adapt this SAME owner;
copySelected never claims, and the adapter must not create a second journal/claim.

Full live-history resource obligations still matter. Use actual entry-associated
owned reference facts maintained by the resource owner, or a bounded metered
owner-side scan without exporting/cloning every history text. Count any reads,
parses and copied refs; unavailable facts/counters refuse or remain unresolved.
No assumption that nonselected entries contain no resources. Cold history remains
new; retained persisted receipts/pending keep their bytes independently.

## Small first Plan2 route

The small meter-control route is `one-existing-mark-opacity-v1`: one
canonical decoration.update on an existing unlocked, ungrouped mark. Same ID at
next revision; only graphic.opacity changes, plus the normal workspace content
revision. Target owner/surface/floor/frame/grid, artwork pin/view, transform,
mask, layer/order and all other source remain exact. Undo/Redo is limited to that
same supported opacity difference, with unchanged geometry and constraints.

Require the exact artwork's already verified encoded/decoded/native leases to be
resident and current. No content import, new layers/marks/defaults, image decode,
public repair, combined placement or source normalization is part of this route.
It still needs the real owned candidate view, native/data/material observations,
complete resource accounting and final guards. Zero decoder/public allowances
mean no calls in those domains, not proof that an unobserved call cost zero.

`SmallOpacityCommand` narrows only the PRIVATE hook argument, not C0 persisted
Command. Actual source comparison proves eligibility. Missing actual counters,
incompatible domain/capture mapping or other edits yield the closed
`WorkUnavailableRefusal` before native/ticket work, with respectively
`C2_ATTEMPT_COUNTER_UNAVAILABLE`, `C2_WORK_DOMAIN_MAPPING_UNAVAILABLE` or
`C2_SMALL_PLAN2_ROUTE_UNAVAILABLE`. The declarations implement none of those
counters. Restore remains its separately scoped, currently unbound path; this
small work policy grants no new cold decode or combined restoration behavior.

This control is NOT completed overlay wiring or the user milestone. That milestone
is ONE real canonical command from a clean C1 library: the selected built-in
`content.import` prefix, then `surface.layers` and `decoration.add`; afterwards
actual edit/remove/layers/history must work through the same authority.
Minimal remaining paired seams are:

1. The fixed authorized private producer
   `0597fc3b7ed9213842df90e8a1bbd4d0887ba49f` and actual Core planning/binding,
   with owned incoming source/command/target counts; no moving source or caller
   counter. This component is authorized for future wiring, not imported here.
2. Actual immutable selected artwork bytes, decoder/upload/retention owners and
   genuine separate-domain reports. First-mark acquisition needs a separately
   reviewed policy within unchanged caps; it cannot borrow this control's zero
   decoder allowance or convert decoder ticks into authoring units.
3. One actual native candidate with final capture, admission, promotion and
   positive release/remaining-debt ownership, counting source plus candidate and
   every actual byte/material allocation. Browser-profile pairing is a separate
   review; strict old ABI does not become available by changing labels.
4. The counted same-journal claim and complete actual codec/WAL observer, with
   one ticket/operation/Apply for all three operations and same-ID uncertainty
   retaining introduced resources. No separate import/paint commits.
5. Exact saved source/history/resource closure for edit/remove/layers/Undo/Redo,
   pending/receipt/export obligations and cold recovery; deletion does not imply
   that retained artwork bytes or native debt are safe to collect.

Missing counters or first-mark acquisition/presentation bindings remain typed
unavailable; this design checkpoint enables none of those live paths.

## Explicit unbound counters and recovery

No backend is implemented by these declarations. In particular the accepted
public kernel has no paired live counter port here. Existing CostBounds numbers
or a maximum-step reservation alone do not supply a complete actual public call
report. Any route needing that call must refuse `C2_ATTEMPT_COUNTER_UNAVAILABLE`
before it runs. Host source/history, native, authoring and actual-codec coverage
must likewise be paired before their corresponding operation. Check required
counter availability before payload preparation and native acquisition, rather
than discovering a known missing port after allocating a candidate.

Unknown outcome seals editing, retains the original meter/ticket/operation and
resource union, and permits only actual original-ID reconciliation. It never
replans, prepares, recreates a ticket or resets work for Apply. After cold loss,
the old volatile meter is unavailable, not reconstructed as zero. A fresh bounded
read-only recovery/restore scope may count actual checkpoint/receipt reads under
the SAME coordinator; its resource-scope ID is not a replacement edit ID or new
editing credit. It cannot replay the old command. Preserve actual durable
receipts/pending and unresolved old obligations. Future combined boot must settle
the original outcome before new decode/native work; generic Plan2 restoration
does not bypass that separate route's ordering gate.

## Acceptance boundary

New vectors/type/schema checks describe these obligations and reject malformed
descriptors or arithmetic examples. They do not prove an implemented meter or
actual charges. Eventual implementation controls MUST exercise the real
coordinator and counter adapters: multibyte/source/history work before hook entry;
exact/one-below aggregate limits; reservation versus consumption; foreign/reused
reports; opaque failure; cancellation/reentry; late ticket/WAL overrun; legal
ordinal + 1/pending transitions; foreign same-count mutations; and unknown/cold
recovery without replay/reset. Actual public-kernel and codec counters remain
explicitly unbound until that separate scoped implementation and review.
