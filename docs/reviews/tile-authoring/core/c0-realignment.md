# C0 contract realignment

Fixed parent: Core `7772910059d86c00c84475af489be812ff225c5d`.
Artist input: `f5bfda9ec0f639018ccfee2415b1f70502e77cae`.
Full B1 binding input: `4b0499cc776fcd85fdd415fa7344982b75fbf8fb`.
Reconciliation inputs: Editor `845f72389743ebc37e02b21183c49d523faf3180`, UI `4d1e5da37031b89afbcb7b6fb47e6a03a606de25`.
Root decision: Core777 is the sole command/query/pack grammar. This checkpoint does not import a worker branch or edit another checkout.

| Area | C0 contract |
| --- | --- |
| Input grammar | Exact777 operations[], Expected, Pin{id,revision,contentDigest}, query/pack/transport and true/false/null outcomes. No aliases or dual parser. |
| Artwork | Mandatory immutable page-bound imageView, explicit top-left frame, sampler/alphaFloor8; all30 Artist frames explicitly mapped to Core pins. Original manifest/PNG/provenance bytes preserved. |
| Appearance | Linear tint; mark source-over then grouped layer opacity (.375 oracle); finite transparent stamp; detail repeats inside its own frame/mask; explicit pivot/mirror/current owner D4/source-frame binding. |
| Decoders | PNG first required actual decoder; no decoder implemented here. Optional WebP is unbound without independent actual decoder proof. |
| Saved document | kind nautilus-tile-workbench-document, version3; all six B1 fields plus contentRevision, AuthoringModule@1 and typed resourceRefs. Source projection is read-only. |
| Resources | Exact typed pin+immutable-descriptor-digest set; one library authority. Bytes staged outside commands; same complete document adoption/history/recovery. |
| History | Ordinary nonempty accepted command increments once. Exact Undo/Redo restores the old whole document/revision. Journal/checkpoint token provides freshness. NO_CHANGE preserves redo; metadata does not prepare geometry or invent a layout revision. |
| Authority | Same Editor-owned service and retained review for UI/JSONL; serialized review is not a capability. |
| Budget |8 layers/4096 marks per saved chunk/1024 resident marks/32MiB additional decoded allocations (copies charged);2 roots/50k triangles/1024 cells;8 contributors per bin/32768 aggregate references/4MiB derived/4 pages; **one64 owned appearance-material total including existing finishes and compositor**. All unmeasured refusal ceilings. |

The schema, types, discovery, full v3 example, explicit mapping, mathematical sampling vectors and negative fixtures agree. Seventeen focused tests and independent schema/hash/archive checks are contract evidence. They do not establish an actual decoder, executor, shader, browser workflow, history implementation or device performance.

Accuracy favours explicit immutable image views and full native B1 bindings: hidden frame inference or reduced saved profiles can change meaning. Efficiency favours shared page bytes, sparse marks, one authority and one allocation budget; the savings are code-based estimates, not timing measurements. Narrative favours per-instance wear and mirrored road graphics following their tile; each game can choose content/profile restrictions. Preserve existing compatible source profiles. The provisional rendering recommendation remains on-surface linear compositing after base albedo and before lighting, subject to actual clipping and shared finish/compositor proof.

Next Root gates: stacked main acceptance, then C1 actual create/clone/revise -> preset -> place two -> upgrade one through the one Editor service; C2 implements overlays after that. No executor/runtime registration, version, package, consumer pin, protected host or Sites audience change belongs to C0.

Immutable metadata evidence in candidates/tile-authoring/core/inputs/ is copied byte-for-byte from the named Git commits and verified by raw SHA. Standard Node tests use these copies, including the original777 schema, so shallow CI needs no worker branch fetch. Actual three-blob archive verification reads PNG bytes from the fixed Artist Git objects; no bitmap is duplicated in this role source. These evidence inputs are not a second runtime artwork authority.
