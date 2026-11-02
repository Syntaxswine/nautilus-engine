# Evidence: hostile review, round 2

These are the instruments behind [the round-2 review](../../2026-10-29-hostile-review-round-2.md). They are review tools, not engine code.

## `reviewer/`: the round-2 reviewer's instruments and results, at `fb8b26a`

The scripts expect to sit in a checkout's gitignored `artifacts/r2/` folder. Some also need a pristine copy of the reviewed tree at `artifacts/pr`, made with `git archive fb8b26a | tar -x -C artifacts/pr`.

| Instrument | What it shows |
| --- | --- |
| `mut.mjs` → `mutants.json`, `table.md` | The 49-mutant sweep. Verdicts come from node:test's summary: KILLED, SURVIVED, CRASH or TIMEOUT. Neutral controls P00 and H00 must survive. The local sandbox path in `mutants.json` has been replaced. |
| `witness.mjs`, `witness-mut.mjs` → `witness-pristine.json`, `witness-flips.json` | A reachable map that each surviving clearance mutant gets wrong. |
| `consumer-agree.mjs`, `agree-mut.mjs` → `consumer-agree.json`, `agree-mut.json` | The adapter's verdict against the pinned Tinderbox `freePoint`, pristine and under each mutant. |
| `consequence.mjs` → `consequence.json` | What a wrongly accepted spawn costs: the pinned game refuses the scene at start-up. |
| `h01-witness.mjs`, `limit-witness.mjs`, `save-witness.mjs`, `handoff-witness.mjs` | What H01, B04/B05, P01, H02 and H05 let through. |
| `handoff-equiv.mjs` → `handoff-equiv.json`, `glue-E01.json`–`glue-E04.json` | The 81-step behavioural diff of two `window.nautilus` literals. Extract them with `git show <sha>:apps/editor/editor.js`: f04ac30 is the original editor, and fb8b26a is after the move. |
| `browser-mut.mjs` → `browser-E01.json`, `browser-E03.json` | The gates and the browser acceptance under an editor mutant. |
| `compare-acceptance.mjs` → `compare-acceptance.json` | Browser captures against the committed acceptance record. |

## `answer/`: the author's measurement of the answer

| Instrument | What it shows |
| --- | --- |
| `round3-mut.mjs` → `round3-mut.json` | Round 2's instrument and mutant list re-run on the answer, plus G01–G07 and E01. Run it with `node round3-mut.mjs <checkout>`. |
| `g07b-check.mjs` | A send that keeps the missing-host check but skips the capability checks now fails the handoff state test. |
| `browser-e01.mjs` | With a bypass wired into the page, the browser acceptance fails by its call-count assertion. `editor.js` is restored and the bundle rebuilt afterwards. |
