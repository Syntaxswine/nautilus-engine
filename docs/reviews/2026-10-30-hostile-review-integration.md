# Architect integration of the closed Rung 1 review

The five-round hostile-review loop is closed. Its final **8.5/10, nothing must-fix** verdict applies to Rung 1's handoff tests and corrections, not certification of the whole engine or adoption by a production game. The original records and evidence remain unchanged.

## Fixed inputs and composition

- PR 3: `f04ac3050bd333f46d6fee51b9588ae0515a3071`.
- PR 4: `0052fc7cbccd952b6199763ebc4cbaf46978c2d1`, including the final code correction `aed392116e7aab1e1dacbd76449a4dd8eef8d1d9`.
- Current integration base: canonical main `e8a66b1f4ead9a6f56c5609bd2a881caceb66b32`, **v0.10.0**. The handoff's older `ddfd43c` main reference is historical.
- Both PR tips' recorded GitHub checks passed, including PR 4's final docs-only commit. Those checks did not prove the composition with current main.

The architect preserves both exact contribution histories. The handoff state moves into the headless editor helper, and the existing deployed Send patches become shared test/build inputs. Core map, rules, saved formats, donor bytes, source pins and consumer adoption remain unchanged.

Current main adds floor-navigation installation, its public getter, deferred observer retirement and the native-height help link. Composition retains those changes and adapts the real-page bridge double to their actual lifecycle and module URL. The browser review retains current authoring, undo/redo, save/reload, import/export, generation and schema checks while adding the reviewed host-await/refusal and liveness diagnostics.

## Corrections owned by this integration

- **Round-5 SF1:** assert the feedback's exact Settings-heading parent and dialog ancestry in the bridge double, and its Settings-heading descendant placement in the real browser. The closed desktop Settings state must not create vertical page overflow.
- **Round-5 NIT 5, external bound:** give the entire `map-workshop` CI job a **15-minute** timeout. This bounds a starved test process even when an in-process timer cannot run. It does not fix every observer loop or guarantee a named assertion for that class.
- Preserve `aed3921`'s **120-second** per-test bound, **30-second** browser load bound and pending-observer notification order. Treat the earlier timings as historical measurements, not current-machine performance promises.
- Clarify the cascade-bound diagnostic: a finite cascade can exceed the double's limit without proving that a real browser freezes.

The original [round-5 record](2026-10-29-hostile-review-round-5.md) retains its at-review statuses. This architect ledger records later integration work without rewriting that evidence.

## Remaining targeted follow-up

| Finding | Priority and owner | Concrete next step |
| --- | --- | --- |
| SF2: deployed Send wiring | P2, Architect / UI helper | Check the actual built import and single handler assignment; execute that built handler with loading and failed-validation inputs. The current browser checks catch the recorded wiring faults, while text equality alone does not prove wiring. |
| SF3: observer argument conversion | P2, UI test harness | Reject invalid targets and filters according to the browser, with focused real-browser parity probes. Preserve the documented double's limitations until this is implemented. |
| SF5: unexpected extra loads | P2, UI test harness | Assert expected load/host-call counts before awaiting held promises, or reject unexpected calls immediately. The 120-second bound remains a fallback, not a cause-specific diagnostic. |
| NIT 1: adjacent-double clearance boundary | P3, Architect / adapter maintainer | Consider the adjacent representable pair when numerical policy changes. This is floating-point compatibility, not a claim of physical accuracy. |
| NIT 2: selector/member false failures | P3, UI test harness | Support production DOM forms when needed and state unsupported forms explicitly. Avoid interpreting double-only failures as browser defects. |
| NIT 5: cross-microtask delivery budget | P2, UI test harness | Bound deliveries across microtasks within one test step. The external CI timeout is implemented separately. |
| NIT 6: unparsed markup | P3, UI test harness | Retain the stated limitation; verify markup semantics in-browser when messages or rendering change. |
| NIT 7: inherited import/accessibility/completion gaps | P2/P3, Architect / UI helper | Target import specifiers, feedback semantics and actual control completion. Retain the documented N16 load-order equivalence rather than counting it as a missing kill. |

These are queued maintenance tasks after active helper checkpoints, not a sixth review round or prerequisites invented for this accepted handoff.

## Original engine-purpose findings

The [round-1 findings](2026-10-28-hostile-review-round-1.md) also remain useful architectural inputs. Current engine release discipline and optional parts, rules, visuals and host adapters advance that plan, but do not by themselves close production consumer refusal, all cross-repository pins, catalogue/editor registration or editor-created functional asset authoring. Track those through the [modular blueprint](../modular-foundation.md), [functional editor parts scope](../projects/functional-editor-parts.md) and [architect queue](../intake/2026-10-30-architect-queue.md). In particular, a working test consumer is not a changed production game.

## Current-composition validation

Current composed checks passed:

- Tracked source/dependency checks and all **575 engine tests**, with zero failed or cancelled; **32 inherited regressions** passed.
- Static build passed with **436 linked module paths** and 11 recorded vendor deployment patches. All 11 patches, including both Send-path outputs, match the prior 0.10 build bytes.
- Actual installed core passed against the pinned Tinderbox compiler/simulation and current rock, progression, module/world, grenade and functional-parts bindings.
- Isolated Edge **156.0.4314.56** acceptance passed: editing/undo/redo, generation, roof work, saves/reload, JSON import/export, responsive layouts, incapable-host refusal, current/explicit exports and delayed host success/refusal. No page errors or failed resource requests.
- Six fresh captures retained; desktop and phone views inspected. The task-owned Node/Edge lifetimes ended and port 63796 was released; supported close receipts verified.

Code/configuration input projection: `5397398919b4f8612b771615f9801f7958450fd025a54e8a1710a8c228d0b047`.

[Current evidence, input binding and cleanup](evidence/hostile-review-integrated/manifest.json) distinguish this pre-commit local composition from the historical mutation proofs. The local browser report records its pre-merge parent; checked-inputs.json seals the actual tested code/configuration trees. Exact-head GitHub checks and merged-main verification remain promotion gates. No five-round mutation sweep was rerun.
