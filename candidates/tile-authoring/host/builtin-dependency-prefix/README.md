# Private selected-builtin byte and prefix owner

This is a private component candidate for the internal UI057 `BuiltinDependencyPrefixOwner` port. It has no package export, Editor adoption, decoder, renderer, transaction, history, upload, thumbnail or gameplay integration. No persisted C0/v3 grammar changes. The UI057 declaration in `vendor/ui057/projection.d.ts` is byte-preserved design evidence, not a claim that all its proposed ports are implemented here.

For the browser editor, prefer separate asynchronous acquisition followed by synchronous construction. It fits UI057's order: validate the selected dependency first, then allocate authoring request/operation IDs once, then use the same retained session. Keeping acquisition separate makes cancellation and late byte ownership explicit without creating a second edit transaction.

## Ports and order

`createBuiltinByteOwner` captures the actual public tiles token, authenticated metadata functions, an actual validated `SourceScopeOwner`, encoded stream and accepted Core portable importer. Own function descriptors are captured before invocation. Missing source, stream or importer ports refuse. These are Root-paired implementation ports; caller JSON claiming to be an owner, validator or meter is not a backend.

1. An existing Host source owner recognizes the exact live read and exposes its complete already-validated v3 document, complete Expected, selected floor, owner lifetime, source generation and context/mutation epochs. Copied/foreign reads refuse. The source owner must advance epochs on mutation/context changes, including ABA. It must not certify mutable caller data as current. Source schema/Host validation remains that owner's job.
2. `await owner.acquireBuiltinBytes(read, fullPin, {signal})` creates a bounded **resource** scope, not an authoring attempt. The owner selects the exact full Pin from authenticated metadata, binds the complete source digest/Basis, reads the complete original PNG, counts full incoming backing capacities, copies into its private fixed/unshared buffer, verifies actual SHA-256 and invokes the actual accepted `importTileContentPack`. It never exposes that private array.
3. For a fresh source, synchronous `constructBuiltinDependencyPrefix(read, fullPin)` rechecks the current source stamp, Basis and exact metadata. Success is UI057's `validated` result with a **nonempty one-pack prefix** and the opaque live byte scope. No I/O or authoring ID allocation occurs here. This does not import into the source.
4. For an already-retained exact canonical artwork plus exact resource descriptor, `resolveRetainedBytes` yields verified bytes with **no prefix**. It refuses incomplete/conflicting retained data instead of repairing it. `constructBuiltinDependencyPrefix` refuses this route rather than returning `packs:[]`.
5. The actual future session must start its one authoring attempt before its Source/history reads. `forAuthoringAttempt` requires a paired current owner to charge/adopt/borrow the selected bytes through that same attempt, with no new nested work budget or prefetch editing credit. The browser-wide meter/attempt integration is **UNBOUND** here and defaults to refusal. This component cannot authorize Apply.

`produceSelectedBuiltinPack` is a pure detached data producer, not a byte proof. The canonical C0 pack contains exactly the selected original artwork record/full notices, empty definitions and presets, its full PNG entry and the selected record's required profiles. It has no invented outer digest and does not seed all 30 records. The accepted resource-ref digest domain is `{blob,imageView}`. Original default graphics/transforms remain exact; no UI hash/pack construction is needed.

Constructors and the pure producer throw on malformed port/data descriptors. Owner operations with a usable read Basis return structured refusals. A malformed read without that Basis can throw before provider admission; no replacement Basis is invented.

## Resource accounting and lifetime

Default ceilings are 4,000,000 bytes per blob, 6,000,000 resource input bytes, 4,000,000 resource output bytes, 1,000,000 private work units, 200,000 nodes and depth 32; constructor-wide limits are 64 MiB encoded backing/reservations, one acquisition in flight, 1,024 lease references, 1,024 backing/reservation rows, 65,536 chunks with at most 65,536-byte incoming **whole backing**, and an actual 30-second acquisition deadline. Options may only tighten these limits. They are finite component ceilings, not measured performance targets or whole-browser RAM bounds.

Private one-use reservation capabilities precede owner allocations and fixed Core validation. No public numeric cost/consume API exists. The accepted importer produces real work diagnostics; the owner conservatively spends its entire remaining validation-work reservation (leaving 16,384 units for final metadata operations) before invoking it. The returned cost cannot refund/grant credit. Actual Core input/output counts and the final carrier byte count are checked. Core's returned copy and known SHA padded/word buffers are reserved before invocation; unknown scratch retirement stays charged. Core work and private conservative charges are separately reported with `editingWorkCredit:0`.

All scopes share the same constructor-wide held stores, in-flight slot, reservations and references. Hash equality does not discount distinct backings. Incoming subviews charge the full backing; shared/resizable/non-Uint8Array stores refuse using intrinsics. A provider that exceeds a reserved backing bound is recorded at its actual capacity, latches a fault and prevents further successful bounded-owner claims. That is a provider violation, not a claim that the earlier bound held. Application strings/objects and opaque WebCrypto/browser/driver storage are outside this **encoded ArrayBuffer** total; they are not reported as zero or bounded total RAM.

Cancellation/deadline/staleness stops successful admission. Pending `next`/cleanup acknowledgements keep the aggregate slot occupied until they actually settle, and late buffers remain counted. Buffers returned at EOF or by cleanup are also charged. Cleanup must positively report `done:true`; `done:false`, invalid/rejected/missing cleanup or unavailable cleanup capacity leaves the slot/debt charged. A provider that never acknowledges closure can leave this owner unavailable; no fabricated retirement or replacement acquisition is admitted. The 30-second deadline ends acquisition, not the useful lifetime of an accepted lease. Every later operation rechecks current source/epochs. Metadata/source callback reentry cannot construct/release the active scope.

`retain` creates a privately recognized reference for candidate/pending/export/cache ownership. `release` positively closes that reference only. Cached full pages, validation copies, incoming stores, export copies and unknown scratch debt remain charged; no GC or physical reclamation is claimed. A finite owner eventually refuses further work if debt/caches exhaust its caps. Pending/unknown history retention is a future Host obligation, not implemented history here.

`copyOut` creates a new counted independent array with a distinct export lease; mutations cannot affect the original. The export lease is not a verified byte scope. There is no unsafe internal typed-array alias. Frozen diagnostics expose primitive charges/caps only and cannot mutate ownership.

## Reproducible component controls

From the repository root:

```powershell
node candidates/tile-authoring/host/builtin-dependency-prefix/tests/stage.mjs
node candidates/tile-authoring/host/builtin-dependency-prefix/tests/controls.test.mjs
```

The stager reads immutable Git objects at Core53 and public metadata42. It preserves every original dependency byte/import and stages test data only into ignored `artifacts/builtin-prefix-proof`. It never reads moving worker files, installs packages or starts a browser/server. Both commits must exist locally. The controls exercise actual zero-artwork C1 data and actual original road/organic PNG bytes through the accepted importer, including the largest page. They also cover exact retained closure, real hash failure, backing/accounting/cancellation/late cleanup, aggregate debt/leases, source/context ABA, descriptor poison and callback reentry. `validation.json` records the exact run and required repository gates; component success does not claim a strict browser capture, upload or native/Editor workflow.

## Design assessment

Accuracy: exact canonical records, notices, full PNG descriptors and private verified copies are preferable to discovery-time bulk seeding or a metadata-only readiness flag. Source/basis epochs preserve the distinction between a selection and authority.

Efficiency: shared verified pages avoid repeated network acquisition for frames on the same PNG, while each real validation/output copy is charged. Spending a conservative validation reservation and retaining unknown debt favors reliable bounds over throughput; no throughput measurement is claimed. A long-lived repeated-edit browser needs the separate approved browser accounting/meter/retirement ports before adoption.

Narrative: the selected original default graphic is preserved. The adapter adds no invented visual variation or content; games can decide when to import/use a chosen asset through the one canonical authoring service.
