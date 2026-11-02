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
inside the DTO. Every projected list is bounded. An unprojectable surface becomes
unavailable rather than truncating membership or dropping saved data. The palette
distinguishes retained workspace records from exact built-in offers projected by
the existing Core/Host content owner. Inspecting/selecting an offer adopts no
artwork, resourceRef, notice, layer or mark. UI owns no parallel catalogue.
ArtworkDependency identifies the retained two-operation route, a missing built-in
prefix producer, unverified/stale/missing/corrupt bytes, or a validated prefix.
Those copied statuses are explanatory data, never proof of byte ownership. A
built-in offer resourceRef is the expected Core descriptor; it does not assert
that the descriptor already belongs to the source.

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
   Host snapshot and private currentness predicate. First it resolves the exact
   selected artwork Pin and source-bound dependency route. No implicit latest
   lookup, UI-built pack, digest assembly or discovery-time import is allowed.
6. When the exact chosen artwork record AND every required resource descriptor
   already belong to the actual source, and their actual bytes are verified by
   the existing owner, RetainedFirstMarkCommand has exactly two operations:
   surface.layers with one fresh Layer/no removed marks, then decoration.add with
   revision 1, groupId:null and the SAME target/layer. Source artwork metadata
   alone does not establish byte readiness. Stale/missing/corrupt bytes refuse.
7. On a genuine fresh C1 workspace the artwork library/resourceRefs are empty.
   If a known built-in is selected but absent, the missing Core/Host internal
   port constructBuiltinDependencyPrefix must return the complete, canonical,
   source-bound dependency packs for that exact Pin plus the actual existing
   verifiedBuiltinByteOwner scope. It validates full PNG page descriptors,
   sampler/frames, dependency closure and notices. UI neither filters/reseals
   packs nor treats a branded DTO, thumbnail, URL or metadata hash as bytes.
   Current single-artwork built-ins need the chosen record, its full PNG page
   and complete notices, not all 30 records merely because they share a page.
8. BuiltinFirstMarkCommand contains one or more explicit content.import
   operations FIRST, then the same layers/add suffix: at least three operations
   in ONE finite command and ONE retained service transaction. Each import uses
   conflict:refuse-different-content. No hidden import, second commit or seed of
   all 30 records/notices on discovery occurs. The actual validated closure may
   determine the number of prefix operations. General user upload/export/default
   capture remains behind Stage B; this bounded built-in route is distinct.
9. Only after that validated dependency plan is known, the existing allocation
   owner reserves ONCE: one request, all prefix-plus-two operation IDs, a fresh
   layer, mark and chunk/ordinal as needed. C1's allocator lacks this exact C2
   set; its scoped extension must be frozen. Expected is the original unmodified
   twelve-field snapshot.expected for BOTH routes. Neither route requires a
   saved layer/binding, and neither adds geometry operations. Source/connection/
   epoch fences apply before and after prefix/byte-owner/allocator callbacks.
10. The port returns the complete canonical command or refusal; it NEVER
    collects/prepares/applies it. The existing coordinator stages under
    decoration.add only when firstMark, layers/add and EVERY dependency operation
    gate are current. Its build callback runs once, then the post-construction
    fence permits one collectCommand call. Invalidation discards the result
    without producer/ID replay or fresh Expected. Human controls and JSONL carry
    the SAME canonical operation sequence through the SAME seven-method service.

No accepted source-bound prefix producer/verified byte-owner pairing exists in
this proposal. The exact missing ports are constructBuiltinDependencyPrefix and
verifiedBuiltinByteOwner; the fresh-workspace fixture therefore stays unavailable.
If either is unavailable or bytes are stale/missing/corrupt, refuse the entire
construction, preserve all source, and adopt no partial layer, artwork, ref,
mark, ticket or history. Root separately reviews browser logical ownership.

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
| constructOverlayCommand | Finite form to exact canonical command/refusal. Resolves the internal source-bound built-in dependency prefix when needed, then emits one command. No collect, native preparation, resource adoption, ticket or write. Full snapshot/currentness checked before and after callbacks. |
| resolveVerifiedThumbnail | Exact selected source/built-in Pin/ref plus Host-owned already verified thumbnail handle, or unavailable. Handles stay live/nonserializable. Owner validates actual context/currentness; DTO brands/flags grant nothing. |
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
placement and group mutation remain visibly unavailable. The bounded built-in
dependency route above does not open general Stage B byte transport. Existing C1
clean presets retain their accepted behavior. Cosmetics assert no
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
the Core/Host resolver, source-bound built-in prefix/verified byte-owner pairing
and C2 allocation contract; supply a genuine owned-resource
thumbnail adapter and actual currentness/publishing guarantees; pin Editor's phase
proposal; provide live Host-generated first-binding/construction/review fixtures.
No C1 or runtime edit is authorized by these declarations.

## Fixtures and evidence limits

Ten closed fixtures cover prospective source data, a bound mark and 30 exact
retained artwork Pins, unknown/frozen display, refused construction/selection,
a genuinely fresh C1 source with ONE explicit built-in offer/missing prefix port,
and stale/missing/corrupt byte refusals. The fresh input contains zero artwork,
resourceRefs, surface bindings, layers or marks. The decorated input is used only
for already-retained cases; it is never described as a fresh workspace. The old
Core witness imports all 30 records; it is used as an OVERBROAD prefix negative
control, never as a valid bounded built-in producer or discovery-time seed.
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

The recorded full static run also compiles strict positive consumers and 21
expected negative TypeScript controls with the existing isolated TypeScript 5.8.3,
and validates both schemas/ten fixtures plus closed-field mutations independently
(28 Draft2020-12 cases). Reuse those read-only tooling roots via:

    node docs/reviews/tile-authoring/ui/c2/projection/verify.mjs --typescript-root=<isolated-typescript-root> --python-deps=<isolated-jsonschema-root>

These tools are not installed by this proposal and are absent from engine/runtime
dependencies. The run reports 70 static checks, including the optional checkers.
The Draft schema enforces closed fields and operation counts; ordered prefix/suffix,
exact selected closure, source binding and actual bytes also require Core/Host
semantic validation. Static tuple/schema acceptance cannot grant readiness.
