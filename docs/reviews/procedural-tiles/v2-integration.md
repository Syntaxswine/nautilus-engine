# Architect acceptance: A/B tile candidate source

Date: 2026-10-31, America/New_York. Accepted scope: typed future authoring records,
bounded render-edge inspection and conservative zero/exposure evidence in source.
Native C/D evaluators and public v2 registration remain deferred.

## Fixed inputs and focused review

- Integrated base: `69115f6c283c4c60588d8462b943ea944ab17aca`.
- Initial A/B checkpoint: `859f5d63d02ad86f4f221dc113de2f3901d59c51`.
- Accepted correction: `e5329f0f525f1ad652de5a989c5e43dde9e800a1`, a direct
  child of the initial checkpoint. Both histories are preserved.
- Registered v1 remains `packages/tiles-core/index.js`; fourteen runtime files
  and four v1 schemas are byte-identical to the reviewed base. The golden corpus
  also fixes saved/compiled/requirements/field behavior.

The initial review reproduced four failures. Two independent reviewers accepted
the focused corrections from exact Git objects, with no remaining must-fix in
their correction scopes. The mathematical reviewer ran five targeted correction
tests; the dispatch reviewer ran the two targeted tests and twenty refusing live
operations on native and wrapped-v1 v2 layouts.

1. Compound raw evaluation selects retained primitive intervals and exact original
   endpoints instead of recovering an integer from floating `t*partCount`.
   P22/P23/P26 tests cover both endpoint limits, adjacent representable parameters,
   D4, reversal, translation, mandatory attributes and material events. The reported
   P22 bound is now about .7000006 micrometres against about .7 measured; a .6
   micrometre tolerance refuses.
2. Zero/exposure evidence separates analytic sign from native certainty. The
   1000-metre noisy-field counterexample still returns the unchanged v1 negative
   value at a point one micrometre inside; evidence now returns unknown and retains
   geometry. Nonzero scalar amplitude and analytic outside remain native unknown.
   Only the documented zero-amplitude/nonnegative-corner proof can qualify, subject
   to the existing domain, scale, matching and residency guards. The binary64
   smooth-in-[0,1] argument includes ties-to-even and underflowed zero behavior.
3. Every v2 optional clip validates presence and explicit bounds, including nested
   graph leaves. Null/false/zero/empty-string clips refuse. The inherited v1
   executable/schema discrepancy is documented separately and remains frozen.
4. Repair dispatch preserves complete structured v1 failures, context precedence
   and original inputs. Identified malformed v2 returns a zero-work failure.
   Null/undefined/JSON/accessor/inherited-name/cancellation cases are covered.

## Source integration and package boundary

Root adds the candidate to the normal source integrity check and an explicitly
named `test:tiles:v2:candidate` script/CI step. That command always constructs a
private offline overlay. The default candidate tool still refuses missing public
registration before creating scratch directories. Source documentation explains
this distinction; the normal README links the source guide by its repository URL.

No public export, schema registration, capability, version or distribution
whitelist changes. Independent integration inspection verified that all four
normal profiles exclude candidate-v2.js, five helper modules, all four v2 schemas
and the candidate guide. The private `/baseline` alias is a proof tool, not a
requested public API. No new host-service promise is advertised.

V2 typed graphs, ribbons, sections, stairs and graded intent remain saveable but
unresolved. Even v2 layouts wrapping only v1 recipes cannot compile, match, derive
native cells, negotiate requirements or produce a committable retained handle.
Metadata validation scaffolding never becomes authored geometry. Source records
preserve their original controls, identities, dimensions, templates and annotations.

## Validation on the integrated source

- `npm run check`: passed; 603 pinned source files, the accepted v1 closure and
  the new candidate source/schema/headless fences.
- `npm test`: 708 passed, no failures/skips/cancellations/TODOs.
- `npm run test:upstream`: 32 passed.
- `npm run build`: passed; 465 module paths and eleven recorded deployment patches.
- Focused A/B and distribution suites: 35 passed.
- Independent Draft 2020-12: eight schemas / 89 cases passed. Existing third-party
  validator dependencies were used read-only with bytecode writes disabled.
- `npm run test:tiles:v2:candidate`: 33 installed runtime tests passed, with a
  complete positive summary and no skipped/cancelled/TODO cases. The inherited
  Node test context is cleared before the independent installed runner.
- The existing actual declared v1 package and its eleven corrections passed as
  part of the full suite. Candidate availability remains `declared:false`.

The private candidate closure is twenty pure modules / 151,822 raw bytes. All
thirty-six installed runtime/support files match their source hashes. The final
local candidate archive SHA-256 is
`8b90ca9ad8c3e265f9ec1cbe1c5f68d38f695c7280e7410cdfe178c0dfc3c2c3`.
The source guide changed during integration, so this archive differs from the
worker archive recorded in its historical checkpoint. This integration record
is excluded from the private archive to avoid a self-referential hash.

Detailed local evidence is under ignored `artifacts/procedural-tiles-v2/` and
`artifacts/v2-integration-*.log`. Exact integration push/PR and post-merge CI must
pass before promotion is reported complete. This source change adds no editor,
renderer or game behavior; the existing browser workflow remains required in CI.
The immutable v0.10.0 tag and all donor/production-consumer pins remain unchanged.

## Limits and next work

Render workload limits are distinct from authored semantic-chunk limits. The full
mandatory/refinement/event union counts against its explicit cut, public-port,
aggregate and work ceilings. No original port node is truncated and no caller
window silently shrinks. Added directions interpolate retained attributes; no
analytic angular-accuracy claim is made. Possible-zero events and approximation
bounds remain separate from connectivity, support and traversal certificates.

Accuracy favors retaining native controls and distinguishing analytic evidence
from the frozen numerical evaluator. Efficiency favors bounded shared-edge work
and compact typed records; byte and work counts are measurements, while device
performance remains unmeasured. Narrative preference is the reusable painterly
terrain/road/water/barrier/height toolkit across all three games, with optional
detail and compatible donor profiles. This source acceptance does not select game
simulation policies or imply production adoption.

Boolean/ribbon/section/stair evaluators, broader contact proofs, the native artist
provider and Smart Tile editor need their own fixed reviews. Public v2 schemas,
capability identity and package registration remain an explicit later decision.

## Helper lifecycle

Only foreground headless checks ran locally. No preview server, browser, watcher
or retained helper was started. The private package tool validates the exact
temporary parent/prefix and removes its isolated stage/consumer in `finally`.
Its final report confirms cleanup. Independent reviewers retained no helpers.
