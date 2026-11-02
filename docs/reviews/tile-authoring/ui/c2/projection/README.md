# C2 UI projection and private port proposal

**Design only; Root freeze required.** This package adds declarations, a closed
finite schema and data controls under docs. It implements no UI, Host, pointer
owner, authority, decoder, catalogue, history, public export or saved field.
The accepted plan at 0e8b54a and C1 runtime remain unchanged. Push is withheld.

The exact types are in [projection.d.ts](projection.d.ts), finite shapes in
[projection.schema.json](projection.schema.json), and pinned inputs/fixture
meaning in [source.json](source.json). [validation.json](validation.json) records
static checks only. The namespace/schema ID is documentation, not registration.

## Atomic read and unchanged C1 reader

Propose one private derived field, overlay, on the SAME workbench getSnapshot()
return. C2Read<C1View> retains every existing C1 field and reference; it adds no
saved state or service method. Editor derives/freeze-publishes the complete pair
atomically through its existing subscription. UI passes the finite read through
the unchanged readTileAuthoringUIView. C1's capture-false default stays false;
Stage B capture is unavailable. The renderer/handle side is never serialized.

Projection.basis copies actual snapshot.document.id, contentRevision, ALL twelve
snapshot.expected values and the existing declared drawing floor. It is not a
freshness token: Undo/Redo can restore an older contentRevision. The full original
sourceJSON and floor/finish bindings remain in the C1 read and retain byte/value
identity checks. No UI computes a digest, normalizes source, or refreshes Expected.

The immutable projection contains readable copy/surface/floor choices, exact
definition/artwork Pins, current source frame/grid/pose, layer and mark membership,
opacity-derived status, selected values, current review/result summary, contextual
disabled reasons and unavailable Stage B/Plan3 slots. Exact IDs/provenance and raw
observations stay in the existing collapsed Technical details. There are no image
URLs, raw bytes, matrices, promises, callbacks, live handles or lease capabilities
inside the DTO. Every projected list is bounded. An unprojectable surface becomes unavailable rather than truncating membership or dropping saved data. The palette is a projection of retained library records/refs;
an unadopted catalogue item cannot silently become a selectable workspace item.

observation copies existing private SourceCapture observation fields only: the
fixed profile tuple, authority/floor/provider/resource/geometry/renderer contexts,
accepted visual/error/debt, history observation and ledger/lease-set observations.
It may be null. It does not capture a new source lease or history target, and a
populated DTO/profile tuple is not proof of ownership or Review readiness.

## Required Core/Editor first-binding route

1. selectExisting receives only a listed owner/surface choice from that atomic
   read. Editor rechecks the actual connection, source, selection, floor/mode,
   lock, definition Pin and supported rectangle profile. Canvas uses the same
   route through acceptCanvasSelection and the EXISTING input owner's hit.
2. Core/Host resolves the actual current owner pin, semantic Surface, native
   floor, authored grid and current pose. A Root-approved pure resolver must
   supply exact MarkTarget, bindingDigest and GridRef.digest. UI does not call
   a hashing primitive, guess a digest, copy another owner's binding, or use a
   cached stroke matrix. The reviewed 8b4 sourceSurface validator checks those
   values; a UI-facing resolver/constructor is still a dependency to freeze.
3. Return/publish a prospective selection for an unpainted surface, with target,
   frame and grid copied from that Core/Host derivation. This is inspection data;
   it adopts no SurfaceBinding, resources, ticket or document. Any unresolved or
   refused binding disables firstMark. Existing bound selections use exact saved
   layers/marks and the same currentness checks.
4. Numeric controls or the existing gesture owner build the same finite Form.
   Source target/grid hashes and fresh IDs are absent from first-mark form input.
   Core/Host constructs canonical masks from source-grid cells; form/wrap pairing
   and C0 bounds are checked independently of disabled HTML validity behavior.
5. constructOverlayCommand rechecks the ORIGINAL read against the actual current
   Host snapshot and private currentness predicate. It reserves IDs ONCE through
   the existing allocation owner: one request, two operation IDs, a fresh layer,
   mark and chunk/ordinal as needed. C1's current allocator lacks this exact C2
   return set; its scoped extension must be frozen, not guessed by UI.
6. The first-mark success shape is exactly two ordered operations: surface.layers
   with one fresh Layer and no removed marks, then decoration.add with revision 1,
   groupId:null and the SAME target/layer. Expected is the unmodified original
   twelve-field snapshot.expected. This route requires no saved layer/binding
   already present and no import/geometry operation hidden in the batch.
7. The port returns a canonical command or a refusal; it NEVER collects/prepares/
   applies it. The existing coordinator stages under decoration.add only when
   firstMark AND both canonical operation gates are current. Its build callback
   runs once, then the post-construction fence permits one collectCommand call.
   A source/callback change discards the result without producer/ID replay or a
   fresh Expected. Actual Review/Apply stays on the existing seven-method service.

Existing-layer add, full layer-list edits, same-target mark patches and explicit
erase use the same construction port. Patch fields are explicit; Core/Host reads
the complete old mark, preserves every unedited value, sets the exact next revision
and preserve-whole-group, and refuses reanchor/group edits. A separate visible
field is not persisted; opacity-enabled/hidden status is derived. Group data is
read-only and any groups in the document block Stage A appearance mutation.

## Private live ports and canvas/thumbnail ownership

OverlayPorts is proposed on the existing workbench binding, not the retained
service/JSONL grammar. Method names and top-level pairing require Root/Editor
freeze before implementation. They do not replace Editor's phase-port proposal.

| Port | Data and effect |
| --- | --- |
| selectExisting | Closed surface/layer/mark/artwork choice, validated against this actual read. Updates ephemeral selection through the same subscription, never history/document. |
| acceptCanvasSelection | Generic existing-owner live hit, not JSON coordinates/triangle IDs. Core/Host resolves stable target and a canonical localPointM or refusal. No UI pointer listener, raycaster or matrix. |
| constructOverlayCommand | Finite form to exact canonical command/refusal. No collect, preparation, resource acquisition, ticket or write. Full snapshot/currentness checked before and after callbacks. |
| resolveVerifiedThumbnail | Exact retained Pin/ref plus Host-owned already verified thumbnail handle, or unavailable. Handles stay live/nonserializable. Owner validates actual context/currentness; DTO brands/flags grant nothing. |
| ThumbnailPresentation.attach | Borrowed owner adapter attaches presentation to a UI element. Check currentness after callback-producing attachment. Cleanup detaches this UI attachment only; it does not retire a Host image/texture/lease. |

Numeric controls completely cover selection, U/V, size, edited radians, pivot,
mirror, form, tint, opacity, layer and mask/erase; canvas is optional. Image pivot
is top-left, local V is up. Current source frame, owner D4/origin and native/render
conversion are applied once by the existing owner. Host returns canonical finite
local values or refuses; UI does not repair derived negative zero or loaded data.

Gesture release updates the form only. Escape, blur, capture loss, second finger/
pinch, mode/floor/owner/frame/grid/pose/resource/geometry invalidation or disposal
cancels/quarantines until all-up through the same owner. Escape cannot clear an
unknown result. Keep explicit keyboard activation, IME/repeat/editable-focus
guards, stable ARIA names/focus, 14 px text and 44 px targets, and 320/390 layouts with
bounded palette scrolling. No canvas shortcut takeover or auto-Apply.

## Mandatory invalidation and callback fences

Attaching overlay alone is insufficient: C1 actionKey does not compare arbitrary
extra data. Root must freeze an opt-in additional finite comparison over the
COMPLETE overlay projection in the EXISTING coordinator, preserving C1 defaults,
semantic object-key comparison, array order and raw sourceJSON bytes. Alternatively
Editor must prove every such dependency is covered by existing compared data;
this proposal recommends the explicit additional selector. No new UI hash/token,
second coordinator or relaxed C1 SOURCE_UNCHANGED_MISMATCH guard is authorized.

| Trigger | Required response |
| --- | --- |
| Service object/method, collector, overlay-port object/method or binding replacement | Permanently retire that UI connection. No late collection or silent rebinding. |
| Any Expected field, sourceJSON, full floor/finish binding, owner/definition/frame/grid/pose/lock or source observation changes | Invalidate displayed proposal, cancel gesture, refuse stale construction/review; never restamp Expected. |
| Selection, chosen artwork/ref/revision, palette availability/thumbnail context, layer/mark revision/group membership or current diagnostics/actions change | Same synchronous subscription/invalidation and full additional-data comparison. A hidden/unpublished mutation also fails the fresh-read comparison. |
| History observation, visual error/debt or resource/geometry/renderer epoch/ledger identity changes | Root-owned live predicates and source capture remain authoritative. UI compares copied data and grants no budget/ownership credit. |
| Observer, ID allocator, Core/Host constructor, thumbnail attachment or other callback reenters/throws | Revalidate connection, original read, action gates and UI epoch after callback. No collector or replay when invalidated; preserve actual latest view and accepted state. |
| Selection/source goes A→B→A during construction | Existing observer epoch/ticket invalidates even when final data look equal. Do not mint an alternate UI authority generation. |
| Form changes while its construction is pending | Cancel its proposal through the same opt-in invalidation contract; retain the originally copied form and never rebuild it under the old request. |
| Unknown outcome | Freeze mutation/overwrite paths. Recover only from the retained C1 outcome/request, not a reconstructed projection packet. UI never retires uncertain resources. |

## Match to Editor c558 and the pending phase proposal

Construction/selection are draft-data work. Editor alone owns source capability,
read-only live-history observation/targets, capacity-only bound, reversible native
preparation, actual admission, final pure binding, THEN the real ticket/operation/
WAL and retained Review. UI does not call those provider hooks, create placeholder
tickets or implement history. The fixed b0888e86bc6d65a99ff4688da90c640aa022c12f Editor proposal keeps
profile.c2PhasePorts.prepare/restore and inspectLive() internal and unimplemented;
Root acceptance/pairing remains pending. Existing Save/Open/Undo/Redo/retry/recovery ports
remain shared. Cold reopen does not reconstruct live history from receipts.

Plan2 retains the exact authored bundle/layout/constraints while actual candidate
base roots/cells/triangles/materials/buffers and image copies remain charged.
Unused encoded-only metadata retains actual accepted view/error/debt through the
Host; it never becomes a fake preview. Stage B bytes/default capture, Plan3 combined
placement and group mutation remain visibly unavailable. Cosmetics assert no
collision, fire, damage, support or game effect.

The UI-to-phase alignment at that fixed proposal is:

| UI concern | Editor b088 contract |
| --- | --- |
| Basis/Expected | Copy current HostService snapshot values, consistent with SourceState.document/expected; no UI builds SourceState or hashes inspectLive output. |
| History observation | UI copies a read-only SourceCapture observation subset if supplied. inspectLive/historyInspectionDigest and target stacks remain private Editor work; exact pre-stage observation publication is a freeze point. |
| Construction | Runs before service.prepare as finite draft data. PrepareScope intentionally has no ID generator; the C2 workbench allocation extension is separate and must not be added to that scope. |
| Review | A constructed command or PreparedPhaseData with zero real tickets/writes does not make Review ready. The same coordinator creates/validates its actual ticket/WAL after final bind, then exposes the unchanged Review. |
| Native/thumbnail readiness | NativeReadiness and StorageCoverage pairing, final capture and upload-owner gaps remain authoritative. A verified thumbnail or populated observation does not pair the Artist adapter or enable Apply. |
| Restore/retry | Existing workbench hooks drive internal restore. A pure load has requestId null; UI must not invent an edit ID from resourceScopeId. Actual pending recovery retains the original pending request. |
| Outcome/cancel | OwnedPreparedPhase.validateCommit/onOutcome/retireUnadopted and coordinator outcome capabilities stay private. UI only invokes existing cancel/recover/retry actions; it never settles or retires those handles. |

Before Root freeze: reconcile read/projection naming and comparison hook; provide
the Core/Host resolver and C2 allocation contract; supply a genuine owned-resource
thumbnail adapter and actual currentness/publishing guarantees; pin Editor's phase
proposal; provide live Host-generated first-binding/construction/review fixtures.
No C1 or runtime edit is authorized by these declarations.

## Fixtures and evidence limits

Five closed fixtures cover prospective source data, a bound mark and 30 exact
retained artwork Pins, unknown/frozen display, and refused construction/selection.
They copy before/Expected/binding data from committed Core witnesses carried in
accepted 8b4. The original f32 admission/response was returned; those invalid owned
ledger/response sections are NOT imported or accepted here. All fixture mutation
and transport gates are false, including the populated observation example.
No actual Host, native ownership, verified thumbnail, decoder, successful Stage,
Review, Apply or recovery is demonstrated. A positive live first-binding fixture
is deliberately pending the owner resolver; UI cannot fabricate it.

Run the local static controls with:

    node docs/reviews/tile-authoring/ui/c2/projection/verify.mjs

The driver stages exact pinned pure data-validator bytes into ignored artifacts,
checks the closed schema vocabulary/C0 references, finite data, copied source
relationships and refusal/fence counterexamples, and parses declaration syntax.
It starts no browser/server or retained helper. The base command parses declaration syntax only. Optional --typescript-root and
--python-deps arguments reuse existing isolated tooling for strict positive/negative
type consumers and independent Draft2020-12 checks, without installation or emit.
Static controls are not runtime acceptance.

The recorded full static run also compiles strict positive consumers and 14
expected negative TypeScript controls with the existing isolated TypeScript 5.8.3,
and validates both schemas/five fixtures plus closed-field mutations independently
(10 Draft2020-12 cases). Reuse those read-only tooling roots via:

    node docs/reviews/tile-authoring/ui/c2/projection/verify.mjs --typescript-root=<isolated-typescript-root> --python-deps=<isolated-jsonschema-root>

These tools are not installed by this proposal and are absent from engine/runtime
dependencies. The run reports 49 static checks, including the optional checkers.
