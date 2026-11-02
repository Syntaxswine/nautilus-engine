# Shared stacked workspace integration

Architect accepted fixed Editor source
`4b0499cc776fcd85fdd415fa7344982b75fbf8fb`. The integration preserves that
commit as a provenance parent and promotes only four shared host files and nine
workspace modules. [The source record](b1-sources.json) binds original Git
objects, exact current bytes and literal import relocations. Private candidate
planner/policy implementations are not duplicated in the active engine tree.

The original fifteen-file Smart Tile manifest remains historical and unchanged.
Its four coordinator/codec changes are authenticated individually; the other
eleven files and the existing UI stay fixed. One common codec, authority,
retained consumer, history and resource coordinator serve explicit v1/v2
profiles. Bundle and constraints share the complete operation, receipts,
Undo/Redo and original-ID recovery.

Review reproduced and closed the two authority defects before promotion:
non-null rectangle targets refuse rather than becoming new construction, and
complete initial checkpoints are validated and owned before any namespace
access. Callback mutation cannot redirect the owned save. Snapshot projection
now carries the floor-table identity and typed floor origins. All six added
cases and the original failure witnesses pass. The four common files remain
unchanged from the reviewed first B1 checkpoint; 37 legacy compatibility cases
and exact default token/storage/recovery parity therefore carry forward.

The seventeen workspace cases run with actual public cores and the registered
planner. Their presentation stand-in is explicitly resource-only: it does not
certify native geometry, browser rendering or device performance. Reproduce
them with `node --test tests/editor-tile-stack-b1*.test.mjs`.

The next gate binds the actual UI, native finish/geometry providers, source and
installed browser workflows. Main promotion requires those results and the
combined repository checks. No game pin, release, journal migration or Sites
audience changes accompany this source promotion.

Combined validation on the promoted tree passed `npm run check -- --tracked`,
all 947 tests, all 32 upstream regressions and the 527-module static build.
The unchanged v1 workshop then passed its complete 27-case browser workflow
in source, built and actual offline-installed modes (81 cases and 18 captures).
The current-input matrix verifier passed, including installed public bindings,
semantic parity and recorded browser/server cleanup. Evidence is in
`artifacts/tile-stack-integration/b1-gates/` and
`artifacts/smart-tile-editor-matrix.json`.

The first browser attempt failed before opening a page because sandboxed Edge
could not launch. That failure is retained separately in `gates.json` and the
original log. The approved isolated Edge rerun is recorded in
`browser-gates.json`; no test or product timeout was increased. Browser touch
emulation and native software rendering are not physical-device performance
measurements. The live fifteen-floor B2 workflow remains the next gate.
