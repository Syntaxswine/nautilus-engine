# C1 Editor host checkpoint

This is the Editor-owned implementation checkpoint for the rectangle-first tile
library. Architect authorized a new branch from accepted main
`d869410625b246cfff2b51089e7878c31951775c` (tree
`485cac35ec3060f8962c94e05b8f451907d44a3b`). The canonical C0 inputs remain Core
`43227894c50ec62b71806978195fff2c650eb388` and UI
`678ceb609d05d2bc13e2a1f83cc7ab7e0e3c5cf2`.

**Dependency gate:** the actual C1 Core runtime and UI component are separate
builders' deliveries. Architect accepted UI component
`fac180e2909ba499146bb8e4560c79cf4794ca93`; its exact nine paths are imported
unchanged and recorded in `ui-import.json`. The reviewed Core follow-up is pending.
The new entry and actual C1 tests deliberately import the production modules;
there is no C0 fixture, copied worker source, alternate constructor or executor
fallback. This checkpoint is not a completed integration or a passing full-gate
claim. See `validation.json` for checks actually run.
The adjacent [usage card](usage-card.json) records the dependency gate and host
connections; it is Editor documentation, not public capability registration.

## Ownership

Seven new modules live in `apps/editor/tile-authoring/`:

| File | Responsibility |
| --- | --- |
| `checkpoint.js` | Closed complete-v3 policy, exact source/target bindings and separate storage namespace over the existing codec |
| `seed.js` | Explicit fresh workspace with the complete original map and fifteen native floor records |
| `profile.js` | Actual pure Core plan/bind/query adapters and final live resource checks |
| `session.js` | Thin composition over the existing shared session |
| `host-service.js` | One authorized connection, one-use retained reviews, canonical outcomes and borrowed UI view/history ports |
| `jsonl.js` | Bounded duplicate-safe JSON syntax reader and canonical transport forwarding |
| `presentation.js` | Composition of the actual native presenter and read-only access to its resource/debt ledger |

The only shared runtime edit is the approved opt-in v3 path in
`apps/editor/smart-tile/session.js`. Existing view, journal and authority
algorithms are unchanged. Existing B2 source is unchanged. The explicit build
exception is one `cpSync` for the new directory in `tools/build.mjs`.

UI owns the three new files under `apps/editor/tile-authoring/ui/`. Architect
owns navigation, public registration, source fences, distribution and promotion.
The new example is `examples/tile-authoring-editor.html` with its companion
script. No version, consumer pin, game or Sites change belongs to this checkpoint.

## Host contract

The canonical seven-method `HostService` is the same object used by human UI and
the injected JSONL port. JSONL has no storage or command executor. Each transport
call checks live host authorization. The private connection retains the actual
review ID and apply packet; serialized review JSON does not confer permission.

The UI borrows `getSnapshot`, `subscribe`, `collectCommand`, `discardDraft`,
`allocateIds`, history methods and the existing floor/input/resource owners.
Its atomic view contains `{snapshot,presentation,commandJSON,readiness,resources}`.
`snapshot` is the canonical full document/derived Source/Expected view. The
presentation supplies the exact retained apply packet and outcome; it does not
reconstruct them from displayed JSON. Stage performs no preparation or write.

The saved document is exactly `nautilus-tile-workbench-document@3`. It retains
`id,sourceJSON,floorBinding,finishBinding,tileBundle,constraints`, plus
`contentRevision,authoring,resourceRefs`. The derived Source is never saved.
V3 uses `nautilus-tile-authoring-editor-v3:<workspaceId>` and explicit closed v3
checkpoint/journal/operation envelopes over the same existing codec algorithm.
No v1/v2 save is migrated, normalized or overwritten.

New geometry commands retain one actual public preparation. Pure Core planning
and target binding do not create handles or establish authority. The ordinary
consumer still owns the opaque preparation and final CAS. Exact geometric
Undo/Redo retains the existing complete historical-target restoration route;
it does not call repair or invent a new layout revision.

Metadata uses the exact unchanged geometry/appearance source. It skips prepare,
acquire, promote and recovery rebuild. The shared session retains the actual
accepted view plus an immutable fingerprint captured only on a real promotion.
It checks identity/liveness without advancing that lease's visual revision.
Presentation error and unverified retirement debt survive metadata edits and
metadata Undo/Redo. Actual aggregate manager/native-pool charges remain bounded.

The follow-up allocation guard privately records the real before-state and the
actual candidate returned by this session's acquisition. Admission checks its
target bundle, original view identities, exact manager charges and pool changes.
Only that transition is admitted. Final guards require its exact live ledger;
foreign allocation/release ABA increments a private allocation epoch and refuses.
Neither admission nor the dynamic resource ledger restamps public Expected or
the stable authority generation. Verified retired view records are released;
unverified records remain charged. An artwork decoder/allocation adapter is
explicitly unavailable in C1 rather than reporting assumed zero allocations.

Unknown acknowledgement freezes mutations and overwriting saves. The complete
operation and potentially adopted references remain retained. Recovery uses the
original request ID. Cold recovery reads the existing pending record or retained
receipt; it never replays a command. A known durable acknowledgement remains
committed even if later presentation fails.

## Bounded use and evidence

The acceptance sequence is create A1 (8x4), clone B1, revise B2 (8x5), save P1
explicitly pinned to B1, place two independent copies in one command, and upgrade
only owner one. Old versions, unused recipes, owner two, P1 and original anchors
remain intact. Paths, overlays, artwork import/capture and content-pack export
receive explicit unavailable/refusal results in C1.

`tests/editor-tile-authoring-c1.test.mjs` uses the actual Core producers, planner,
retained consumer, native Three geometry and finish pool. Its atlas is synthetic
and it has no DOM/WebGL: it is not rendered, installed-package, device or
performance evidence. It covers exact history, source-unchanged allocations,
real no-change/redo, cold uncertainty, stale context, actual disposal-listener
debt and existing presentation failure. Its Core runtime dependency must be
present before execution.

The JSONL tests cover syntax/forwarding only and label their borrowed service
double accordingly. Required final evidence is actual source/built/installed
human UI plus JSONL workflow, desktop/320/390 px inspection, save/reopen/history,
unknown outcome recovery and the four project gates. No performance measurement
or C2 renderer/decoder support is claimed by proposed cost bounds.

The isolated candidate source probe used Core `981a496a8fda395dd70838f5f1361b44e3fc7b70`,
UI `2e4730e56db86d9336455ba1671d8ded788ff9da`, and Editor
`52f4a52481c47e2186e099165e1058988d7997e1`. It copied 176 files from exact Git
objects, with per-file hashes under `artifacts/editor-tile-authoring-c1-staging-8e09f144-c390-4ba4-8480-2bcc7ae56dd0/`.
It passed five tests and refused four at `AUTHORING_WORK_LIMIT` during the
full-map library sequence. Core's compile-cache/copy-charge follow-up remains
pending; no cap was raised. This probe is not adoption or a successful full C1
integration. Subsequent allocation/transport unit checks passed all six cases;
the accepted UI protocol tests plus these units passed 40 cases. Protocol tests
keep their explicit Core/Host/native-unbound labels.

## Builder checklist

- Supply the reviewed public Core namespace, actual v1 tiles, producer/sealer,
  immutable finish catalogue and complete native floor controller.
- Bind one synchronous durable writer with the existing final CAS guard; share
  the bound codec with that authority and session.
- Bind verified live atlas/base/artwork leases. Count acquiring and unverified
  retiring allocations; a logical zero is not a cleanup receipt.
- Give the UI and JSONL the same authorized service connection. Keep original
  request identities, explicit selected owners, full pins and command bytes.
- Preserve complete source/resources through refusal, history and uncertainty.
  Do not delete potentially adopted blobs or restamp an old visual lease.
- Treat every game query, support, navigation, collision, fire and water binding
  as unbound until a separate reviewed consumer supplies it.
