# Browser-review lifetime correction

Main CI run `41427166758` completed all three native tile workflows, then rejected
the installed helper's declared lifetime: `10:24:36.087Z` to `10:34:36.088Z`,
600,001 ms for a configured 600,000 ms limit. The source and built helpers
declared exactly 600,000 ms. All reports retained 19 passing checks, 11 captures
and closed browser/server receipts.

The producer used separate clock reads for start and expiry. It also started a
fresh full timeout after identity capture and metadata writes. One captured time
now defines both timestamps and the actual deadline; setup consumes that budget
and timer arming uses its remaining duration. The verifier keeps its strict bound.

Four deterministic component regressions run the actual record/arming helper
with an advancing clock, delayed setup, one millisecond remaining, exhausted
setup, and setup failures. Original failed CI artifacts remain unchanged.

Repository gates and fresh source/built/installed browser evidence are required
before delivery. Application code, formats and resource limits are unchanged.
