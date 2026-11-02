# Gate A proof-correction validation

Proof-only follow-up to reviewed `fdd06015525a3e1df5c46c05b3efce3e92092b7f`. The planner's five runtime modules, API types and fixture module remain byte-identical. Public core, host, schemas, exports, caps and pins remain unchanged. See oracle-correction.md for the defect, corrected boundary and exact rejection controls.

All four required gates passed: `npm run check`; `npm test` 940/940; `npm run test:upstream` 32/32; `npm run build` with 519 checked module paths. validation.json preserves exact log hashes. The first parallel full-suite run had one unchanged package-probe failure after 20.48 seconds with empty stderr; that test has a 20-second child timeout. It passed alone, the direct child returned the expected registration-pending refusal, and the full unmodified command passed after the other gates finished. No code, timeout or test setting was changed to obtain the pass. The original failed log hash and diagnostic observations are retained.

All 278 normal distribution files in the actual offline-installed core match source bytes. Public tiles retain their 14-module, 91,604-byte closure. The explicitly separate copied private helper has five runtime modules, with separate fixture/tool copies. All 28 focused installed checks pass with zero skipped/todo/cancelled tests. Eighteen complete scenario outputs match source exactly. The Node probe observed zero forbidden DOM/storage/renderer/network/clock/RNG accesses.

The independent oracle now derives intended source from accepted bundle/constraints and intent, then checks actual plan/submission, overall/public outcomes, successful complete target source and content/catalogue/layout hashes, next constraints/bindings, and relevant old/new closure/discovery/obligations. It permits a valid plan followed by public refusal. Fixture expectation markers are extra assertions only. The evidence artifact is privately versioned 2 to keep the bound plan separate from the labelled damaged public submission.

Twelve cases receive independent interval/source/output predictions. All 18 receive outcome/target-envelope checks; the six lowered-budget cases remain covered by actual source/installed core and focused tests rather than claimed interval cost prediction. Sixteen mutations of actual outcomes/outputs are rejected with inputs and expectations fixed, including eight complete coherent target controls. Each architect counterexample has an explicit rejection witness in interval-oracle.json. Both Decimal-loaded and ordinary JSON-loaded evidence pass the same oracle checks.

The fifteen-deck fixtures retain 105 crossings and measured core work 16 steps / 435 spatial tests / 1,950 geometry units. Their next-source/reservation inspection has 210 obligations. The added stronger-top profile predeclares F14 at 31.8 m, creates the tower at 2 m, then finishes only deck.14 at requested 3 m: 91 unrelated crossings remain 2 m and 14 top-owner crossings become 3 m. The independent oracle validates the complete returned source, constraints and 420 old/next obligations. These are deterministic counts, not processor/GPU timing benchmarks.

Reproduce:

```powershell
node tools/tile-stack-core-measure.mjs
python tools/tile-stack-core-oracle.py artifacts/tile-stack-core/source.json
node tools/tile-stack-core-node-probe.mjs
node tools/tile-stack-core-installed.mjs
node tools/tile-stack-core-audit.mjs
npm run check
npm test
npm run test:upstream
npm run build
```

After commit, `node tools/tile-stack-core-audit.mjs --verify-commit` verifies Git/raw byte equality for all 15 recorded source inputs and proves the seven candidate source/type/fixture files equal reviewed fdd0601. The audit also checks 64 protected files and candidate exclusion from all four normal distributions. Foreground process exit/deleted scratch receipts are in installed-proof.json: all children exited, stage/consumer removed, no server/ports/retained helper. A final exact task-tagged proof/parser process inspection found no leftovers; unrelated processes were not modified.

Gate A re-approval remains with Architect. Gate B still owns atomic bundle-plus-constraints checkpoint/history/CAS/recovery and the real browser workflow. This correction adds no runtime feature, registration, resolver, retained factory or game capability.
