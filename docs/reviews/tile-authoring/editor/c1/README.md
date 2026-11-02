# C1 Editor host checkpoint

This is the Editor-owned implementation checkpoint for the rectangle-first tile
library. Architect authorized a new branch from accepted main
`d869410625b246cfff2b51089e7878c31951775c` (tree
`485cac35ec3060f8962c94e05b8f451907d44a3b`). The canonical C0 inputs remain Core
`43227894c50ec62b71806978195fff2c650eb388` and UI
`678ceb609d05d2bc13e2a1f83cc7ab7e0e3c5cf2`.

**Dependency gate:** the actual C1 Core runtime and UI component are separate
builders' deliveries. Architect accepted Core runtime
`3df11ce6e62fb94806e30652b87168949f8ef4dd` with documentation tip
`eedfc0149cbaa5715445ed2dc909c2d694a81d50`, UI follow-up
`f94b57b2cebce55fc27cc94dea7a9fe39ec20193`, and review helper
`08540b0ec8acd1be8b9d9929187d82a7300a59c2`. Their exact approved paths are imported
unchanged and recorded in `core-import.json`, `ui-import.json`, and
`helper-import.json`. Actual browser/package acceptance is underway.
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

The private operation target is a closed `nautilus-tile-authoring-target-fields@1`
record: exact fixed-source binding plus complete bundle, constraints, content
revision, authoring module and resource references. The saved document retains
the original JSON/floor/finish/workspace source once. Reconstruction validates
the source binding and complete target; public reviews contain the full v3
document. Receipt replay uses no external source or worker checkout. There is
no journal algorithm change, compaction, pruning or receipt reset.

Fresh maps use compact JSON; loaded source bytes remain exact. Bounded caches
reuse only freshly inspected, fully validated content hashes and actually owned
frozen checkpoint identities. Returned caller ordering is preserved. Mutable or
shallow-frozen DTOs, duplicate keys, negative zero and changed record bytes are
rechecked. Current authority/context/resource/admitted-ledger guards still run.

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
full-map library sequence. At that point Core's compile-cache/copy-charge follow-up
was pending; no cap was raised. This probe is not adoption or a successful full C1
integration. Subsequent allocation/transport unit checks passed all six cases;
the accepted UI protocol tests plus these units passed 40 cases. Protocol tests
keep their explicit Core/Host/native-unbound labels.

The current actual six-command CPU/native flow passes through producers,
retained consumer, shared host and JSONL with zero metadata prepares and exactly
two geometry prepares/applies. Current UI/cache/resource/transport controls pass
48 checks. `tools/editor-direct-tile-authoring-c1.mjs` preserves that finite
review entry. Its synthetic atlas has no rendered/installed/device claim.
The complete current history/recovery suite passes eight cases. The six-edit,
six-undo, six-redo/reopen case took 242 seconds; all eight cases took 521 seconds.
These are elapsed CPU/native test durations including assertions and checkpoint
reads, not renderer or physical-device performance measurements. The Architect
is attributing that repeated work before another broad run.

The actual source browser completed the human six-edit workflow and unchanged
metadata-view/resource checks. The Architect then requested an isolated profile;
the reviewed STOP mechanism closed that browser/server during history, and its
partial report, earlier failures and cleanup receipts remain preserved. This is
not a complete browser pass. Source/built/installed matrices and `npm test`
remain pending. The build (562 module paths) and 32 inherited upstream checks
pass. `npm run check` stops at the old registration comparison owned by the
Architect; this role does not weaken that fence. Superseded profiling runs
stopped through their owning exec sessions are not successful current evidence.

The collector supports `--workflow-only` for the six human edits plus desktop
and 320/390 px presentation; its report explicitly excludes history, save,
JSONL and recovery in that mode. Default mode retains the full matrix and the
unchanged 600-second helper lifetime. Per-command/history progress timestamps
are appended with a run ID. Installed proof stages the floor DOM/CSS as hashed
host files, with its single floor-model import bound to the actual public Core
export; it does not expand either package's exports or use a source fallback.

The immutable stager accepts a separate full `--core-docs` pin for exactly
`docs/reviews/tile-authoring/core/c1-validation.json`, verifies that it is the
only runtime-to-docs-tip difference, and authenticates every Core import-audit
row against Git bytes and its chosen per-path pin. The current 196-file source
stage passes that check. One exact hash-pinned UI proof tool has an explicit
two-local-import tooling closure: its selected test exercises the early
unapproved-pin refusal, without invoking its computed fixed-Git constructor
loader. All runtime and test modules retain the strict ordinary import parser.

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
