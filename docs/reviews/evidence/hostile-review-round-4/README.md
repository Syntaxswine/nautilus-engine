# Evidence: hostile review, round 4

These are the instruments behind [the round-4 review](../../2026-10-29-hostile-review-round-4.md). They are review tools, not engine code.

## `reviewer/`: the round-4 reviewer's instruments and results, at `09ecbef`

That commit's code is byte-identical to `576c4c2`. The scripts expect to sit in a checkout's gitignored `artifacts/r4/` folder. Stack traces show the sandbox as `<sandbox>`.

Some files are left out:
- logs, except `headless-run1.log`, which is the only record of the first headless run's 29 mutants (its JSON was lost);
- the author's sweep script, which is [`answer/round4-mut.mjs`](../hostile-review-round-3/answer/round4-mut.mjs) in round 3's evidence. The reviewer re-ran it unchanged.

| Instrument | What it shows |
| --- | --- |
| `mutants.mjs` | Every mutant the reviewer used: the brief's, verbatim from the author's instruments, and the reviewer's own. Each is a list of exact edits, and each needle is checked to occur once. |
| `hm.mjs` → `headless-run1.log`, `headless-run2.json`, `headless-*.jsonl` | The headless sweep: the touched test files, then the full suite, then `check --tracked`. |
| `bm.mjs` → `browser-batch1.json`, `browser-batch2.json` | The build and `review:integration` under each mutant, then a restore, a rebuild and a comparison of `dist/` with the commit. |
| `author-sweep-rerun.json`; `compare-sweep.mjs` → `compare-sweep.json` | The author's 82-mutant sweep, re-run unchanged and compared verdict by verdict with the committed record. |
| `bridge-order.mjs` → `bridge-order.out`; `bridge-order2.mjs` → `bridge-order2.json` | The load order; then the state at bridge time, and the writes to Send's `disabled`. |
| `n01-liveness.mjs` → `n01-liveness.json` | Under N01 the page's main thread never answers. The pristine page is the control. |
| `n04-growth.mjs` → `n04-growth.json`; `feedback-count.mjs` → `feedback-count.json` | Under N04 the settings-feedback elements pile up. The pristine count is the control. |
| `wait-latency.mjs` → `wait-latency-quiet.json`, `wait-latency-stress16.json` | The time from a Send click to the acceptance's wait condition, on a quiet machine and under 16 busy loops. |
| `probe-geom.mjs` → `probe-geom.json` | The 22 clearance probes' geometry, recomputed without the adapter. |
| `clear-random4.mjs` → `clear-random4.json` | Round 3's 400 seeded maps under the clearance mutants. |
| `consequence-c30.mjs` → `consequence-c30.json` | Under C30 the adapter accepts a spawn that the pinned Tinderbox refuses at start-up. |
| `c18-e16.mjs` → `c18-e16.json`; `frac.mjs` → `frac.out` | C18's float boundary, E16's equivalence, and fractional starts. |
| `g08-message.mjs` → `g08-message.json` | The assertion that killed G08 before `484bb56`. |
| `wrapper-shapes.mjs` → `wrapper-shapes.json` | The bridge test's import handling, replayed on five import shapes. |
| `compare.mjs` → `compare-baseline1.json`, `compare-final.json`; `acc-baseline1.json`, `acc-final.json` | The acceptance records against the committed one, before and after the mutation runs. |

## `answer/`: the author's re-measurement

| Instrument | What it shows |
| --- | --- |
| `verify.mjs` → `verify.json` | The should-fix mutants on `09ecbef`, with needles the author wrote from the code: N01–N04, N06, F01, F02 and C30. Each runs the full suite and `check --tracked`; mutants in `tools/` also run the build and `test:package`. N01 also runs in the browser. The script refuses a dirty tree, and records HEAD and `git status`. Run it with `node verify.mjs <checkout> <out.json> [--browser]`. |
| `g08-label.mjs` → `g08-label.json` | On `484bb56`, G08 dies on the line labelled for it. A pristine run is the control. |
| `gates-484bb56.txt`, `acceptance-484bb56.json`, `compare-484bb56.json` | The gates and the browser acceptance on `484bb56`, in a clean sandbox. The comparison is the reviewer's `compare.mjs` against round 3's committed `answer/acceptance.json`. |
