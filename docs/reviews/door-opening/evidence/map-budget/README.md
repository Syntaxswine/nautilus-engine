# Map-workshop job headroom

The [cancelled map-workshop job](https://github.com/Syntaxswine/nautilus-engine/actions/runs/43355003820/job/131654841019)
ran on `ab48de13f042a3724db45f2d7f1fb2959cd54ac6`. Its actual GitHub annotation
states: “The job has exceeded the maximum execution time of 15m0s”.

The job took 904 seconds. All 31 executed steps succeeded, including the source
audit, 1,318 tests, upstream tests, build, package/tile/oracle checks, artifact
upload and final cleanup. Two post-action hooks were skipped; no step failed.
`job.json` preserves all step timestamps/conclusions, `annotations.json` preserves
the annotation, and the log excerpt plus full-log digest preserve supporting evidence.

Only `jobs.map-workshop.timeout-minutes` changes from 15 to 30. All other workflow
bytes, other job budgets, commands, assertions and per-test limits remain exact.
This is measured successful-work headroom, not a runtime or test relaxation.

Focused checks validate the sole numeric YAML-scalar change against the workflow
GitHub already parsed, its exact byte reversal, runtime invariance, JavaScript
guard syntax, all 23 indexed source records and two registration tests. The
workflow row is resealed in the existing door ledger/guard. Unchanged broad
local suites were not repeated; exact-head CI will run the full four gates and
matrix before Architect merge.

Approved runtime `98c63a743b02782e1904b730abddb206311c10b0`, its clean archive
`5ebcfa72a44b35a74b3821069d0c897902e45ff6d1c9ce2b0dc0842de31c86b8`,
prior browser proofs and the qualified pause disclosure remain unchanged. The
preserved archive copy was rehashed. No background helper was started or retained;
the Architect's preview and deadline remain untouched. Faster walking is queued
outside this change.
