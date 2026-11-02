# Evidence: hostile review, round 5

These are the instruments behind [the round-5 review](../../2026-10-29-hostile-review-round-5.md). They are review tools, not engine code.

## `reviewer/`: the round-5 reviewer's instruments and results, at `d91e23a`

The scripts expect to sit in a checkout's gitignored `artifacts/r5/` folder. Local paths are masked as `<sandbox>`, `<checkout>` and `<scratchpad>`.

Some files are left out:
- the raw CI job logs, 556 KB; `ci-timing.json` holds the times read from them;
- the 2.3 MB of R02 captures; `bm-r5-r02.json` holds their digests;
- the per-file `dist/` hash lists. Their digests are:
  - `9ff1957` and `87805df`: 1028 files, `b1a94d57a2fd3bc275511ec4e67608546a370b46c30484483cccefda1bb82042`;
  - `d91e23a`: 1036 files, `603b0e9a508bc4e2b6a30c7fcf29f51174130570ee7eb9b54bfabbe8e54f2f5a`;
- the long gate logs and the run logs; `gates-d91e23a.txt` is the gates' summary;
- `timed-integration.mjs`, which `timed-acceptance.mjs` generates.

| Instrument | What it shows |
| --- | --- |
| The author's `answer-proof.mjs`, re-run → `answer-proof-rerun.json`; `compare-proof.mjs` → `compare-proof.json` | The answer's mutation proof reproduces: all 25 verdicts and failing tests, and all six browser messages. |
| `dom-probes.mjs` → `dom-probes.json` | The same mutation-observer code in headless Edge 156 and in the page double built from the test file's own text (P01–P22). |
| `sweep-r5.mjs` → `sweep-r5.json`, `sweep-r5b.json` | The reviewer's mutants: R01–R04 and R12 (page glue), D01 and D02 (the click's wiring), W01–W05 (extra loads and the stubbed guards), S01–S03 (equivalent selectors and calls), and T01–T07 (clearance tolerances). |
| `bm-r5.mjs` → `bm-r5.json`, `bm-r5-r02.json` | The build and `review:integration` under the mutants the page can see, with capture digests. |
| `r02-place.mjs` → `r02-place.json` | Where the settings feedback ends up under R02, with Settings closed and open. |
| `threshold-r5.mjs` → `threshold-r5.json` | The adapter and the pinned game on 601 consecutive doubles around the clearance threshold, and the tolerance window. |
| `bound-stress.mjs` → `bound-stress.json`, `bound-stress2.json` | The bridge test's time in the full suite, quiet and under 16 busy loops, against the 20 s per-test bound. |
| `hang-probe.mjs` → `hang-probe.json` | A loop deferred by one microtask runs past both guards until it is killed by its PID. |
| `timed-acceptance.mjs` → `timed-quiet.json`, `timed-stress16.json` | The acceptance's steps timed, quiet and under 16 busy loops, including the longest main-thread task. |
| The author's `load-latency.mjs`, re-run → `load-latency-rerun.json`, `load-latency-rerun2.json` | The load times, re-measured twice. |
| `ci-timing.mjs` → `ci-timing.json` | The CI browser job's times from the start of the review step to each capture. |
| `gates-d91e23a.txt`, `gate-package.txt` | The gates on `d91e23a`. |
