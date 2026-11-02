# Evidence: hostile review, round 3

These are the instruments behind [the round-3 review](../../2026-10-29-hostile-review-round-3.md). They are review tools, not engine code.

## `reviewer/`: the round-3 reviewer's instruments and results, at `c762e5c`

The scripts expect to sit in a checkout's gitignored `artifacts/r3/` folder. Some also need a pristine copy of the reviewed tree at `artifacts/pr`, made with `git archive c762e5c | tar -x -C artifacts/pr`.

Some files are left out:
- `editor.js` variants, because Git can recreate them and the build would copy `.js` files into the Sites output;
- logs;
- the author's sweep script, which is [`answer/round3-mut.mjs`](../hostile-review-round-2/answer/round3-mut.mjs) in round 2's evidence.

| Instrument | What it shows |
| --- | --- |
| `author-sweep.json` | The author's 53-mutant sweep, re-run verbatim on the commit. All 53 verdicts match the round-2 record. |
| `r3-mut.mjs` → `r3-sweep.json` | 19 new mutants: clearance (C00, C18–C27), handoff state (G08–G11) and editor glue (E05–E11). It uses the author's verdict logic. |
| `browser-mut.mjs` → `browser-mut.json`, `browser-e12.json` | The build and the browser acceptance under each editor or state mutant. Each run records how long after the last capture the failure was written: about 1 s is an assertion, 30 s a timeout. |
| `equiv3.mjs` → `equiv-*.json`, `glue-*.json`, `state-*.json` | Round 2's 81-step behavioural diff of `window.nautilus`, plus 26 extra steps. Use `git show <sha>:apps/editor/editor.js` for f04ac30, fb8b26a and f8f8f0c. |
| `clear-probe.mjs` → `clear-probe.json` | The probe table and nine witness maps under each clearance mutant, checked against the pinned `freePoint`. |
| `clear-random.mjs` → `clear-random.json` | The adapter against the pinned `freePoint` on 400 seeded maps, pristine and under C18–C27. |
| `consequence-c19.mjs` → `consequence-c19.json` | Under C19, the adapter accepts a spawn, and the pinned game then refuses it at start-up. |
| `state-witness.mjs` → `state-witness.json` | What G08, G09 and G10 change in `createGameHandoff`. |
| `compare-acceptance.mjs` → `compare-acceptance.json`, `final-compare.json`; `baseline-acceptance.json` | The browser captures against the committed acceptance record, before and after the browser mutants. |
| `g07b-check.json` | The author's targeted G07b check, reproduced. |

## `answer/`: the author's measurement of the answer

All of these ran in one clean sandbox at `576c4c2`, whose HEAD is in `head.txt`.
- `round4-mut.mjs` and `browser-mut4.mjs` refuse a dirty tree, and record HEAD and `git status`.
- `acceptance.json` records its source commit.
- `bridge-order.mjs` records neither.

| Instrument | What it shows |
| --- | --- |
| `round4-mut.mjs` → `round4-mut.json` | The 82-mutant sweep: the author's 53, round 3's 19, and ten for the page bridge (E13–E23, with no E19). Run it with `node round4-mut.mjs <checkout>`. |
| `browser-mut4.mjs` → `browser-mut4.json` | The build and the browser acceptance under each editor or state mutant. It is round 3's runner with G08 and G11 added. Run it with `node browser-mut4.mjs <checkout> E05 E06 …`. |
| `bridge-order.mjs` → `bridge-order.json` | What exists when `app/editor.js` assigns `window.nautilus` in the real page. The bridge test's doubles follow it. |
| `acceptance.json` | The browser acceptance on the answer commit, with the new `handoff` record. |
