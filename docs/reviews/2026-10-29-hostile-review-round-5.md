# Hostile review, round 5: rung 1 after the answer to round 4

**Reviewed:** `064f4df`, `176a29f` and `87805df`, the answer to [round 4](2026-10-29-hostile-review-round-4.md), and `d91e23a`, its record.

**Method.**
- One hostile reviewer (Claude) worked in its own sandbox worktree at `d91e23a`. It re-ran the answer's mutation proof and wrote its own probes and mutants.
- **This is the last round.** The user ended the review loop after it. The project's architect is making a large pass over the engine, and these details would soon be stale. So round 5's findings are recorded here, each with a direction for the architect, and are not answered.
- After the review, `aed3921` corrected four of the answer's own statements and bounds that round 5 measured as wrong. See [after the review](#after-the-review).
- Evidence is in [`evidence/hostile-review-round-5/`](evidence/hostile-review-round-5/README.md).

## Score: 8.5 / 10

**What held up (reviewer, measured):**
- **The record reproduces.** A re-run of `answer-proof.mjs --browser` gave:
  - all 25 headless verdicts and their failing tests, with `check`, the build and `test:package` for every row;
  - all six browser failure messages, with times within 0.4 s. The exception is the pristine run, which took 45.6 s; the record says 49.5 s.
- **`dist/`** hashes the same on `9ff1957` and `87805df`: 1028 files, `b1a94d57…`.
- **The page double's documented rules hold in headless Edge 156** (`reviewer/dom-probes.json`, P01–P07, P10, P11, P14–P16):
  - an unchanged write still records;
  - `textContent` replaces all children;
  - writing a text node's data records;
  - the option implications and refusals;
  - creation order.
- **SF4's agreement is bitwise.**
  - The adapter and the pinned game give identical face values and verdicts on 601 consecutive doubles (`reviewer/threshold-r5.json`).
  - The probes sit 5e-11 m either side of the threshold, about 14,000 grid steps of 3.55e-15 m, so their verdicts are deterministic.
  - The test's comment gives the right reason, and the agreement is stronger than it states: both sides evaluate the same expression on the same floats.
- **The liveness probe.**
  - It reports a frozen page as frozen, after 26.9–27.0 s.
  - The longest main-thread task measured was 1.4 s, quiet or stressed, so a live page is unlikely to read as frozen. A misreport would change only the message, not the verdict.
  - The save step takes 0.08–0.30 s against its 10 s bound.
- **Load order (read from the code).** `editor-3d.js` installs the tools during its synchronous module evaluation, and deferred module scripts run in order. So Send exists before the bridge on any machine. N16's equivalence does not depend on one machine's timing, which settles a "not verified" item from round 4.
- **CI.** All eight browser-job runs of `064f4df`, `176a29f`, `87805df` and `d91e23a` passed.

**What keeps it from 9.** Held to round 4's standard, the answer again closes the instances shown and not their class:
- the deployed Send click is pinned by its text, not by its wiring (SF2);
- the double accepts `observe()` arguments that Chromium refuses (SF3);
- one one-line fault moves the settings feedback out of Settings and passes every gate, the browser included (SF1);
- faults that start an extra load end at the per-test bound, not at a named assertion (SF5);
- the new 20 s per-test bound sat at 97–98% of a stressed run (SF4, corrected in `aed3921`).

**Why nothing is must-fix (reviewer, judgment).** No finding reaches an incapable host or sends the wrong map.

## Findings

"Measured" means the reviewer ran it. File references are at `d91e23a`.

| ID | Finding (reviewer) | Direction for the architect | Status |
| --- | --- | --- | --- |
| **SF1** | **The settings feedback can leave the Settings dialog, and every gate passes** (measured). R02 changes `heading.append(feedback)` (`apps/editor/editor.js:26`) to `document.body.append(feedback)`. It passes the bridge test (7/7), the suite (218/218) and `check`. In the browser, the build and `review:integration` pass in 45.0 s. Five of the six captures change, but nothing asserts captures. In the page (`reviewer/r02-place.json`), the feedback becomes a visible 1280×40 bar at y 887 while Settings is closed, the dialog loses it, and the page grows to 937 px and scrolls. The tests find the feedback by its id anywhere. | Pin its parent in both places. In the double, assert `feedback.parentNode === heading`. In the acceptance's `feedbacks()`, assert `closest('#editor-settings .settings-heading')`, and that the page does not scroll vertically. | Open |
| **SF2** | **The build pins the Send click's text, not its wiring** (measured). `tools/build.mjs:57` checks that `SEND_CLICK` occurs once and that `editor-playtest.js` equals `LAUNCH_PLAYTEST`. No check covers the binding the deployed click uses: `import {launchPlaytest} from './editor-playtest.js';` in the pinned `editor-3d-tools.js:24`.<br>- D01 makes the wall adapter swap that import for a local `launchPlaytest` that does not return the send.<br>- D02 appends a second `$('playtest').onclick=` after `SEND_CLICK`.<br>Each passes the bridge test, 218/218, `check`, the build with its new refusal, and `test:package`. The browser catches both: D01 with "Send did not wait for the host", 5.3 s after the last capture; D02 with "Send left the status unchanged…" and page errors, 12.5 s after it.<br>The test also stubs two guards with constants, so these survive every headless gate, the build included: W04 drops `if(validate().length)return;` and W05 changes `busy\|\|isLoading()` to `busy` (`reviewer/sweep-r5b.json`). | Make the build refuse anything but exactly one `import {launchPlaytest} from './editor-playtest.js';` and exactly one `$('playtest').onclick=` in the built `editor-3d-tools.js`. Better, have the headless test evaluate the click from the text the build produces, with stubbed imports. Drive `isLoading()` true and `validate()` non-empty once each. | Open |
| **SF3** | **The double is laxer than WebIDL** (measured, `reviewer/dom-probes.json`). The same code was run in Edge 156 and in the double built from the test file's own text:<br>- P08: a string `attributeFilter` makes Edge throw a `TypeError`, but the double accepts it and matches by substring;<br>- P09: `observe(null)` makes Edge throw, but the double accepts it.<br>R01 changes `attributeFilter: ['disabled']` to `'disabled'` (`editor.js:48`). It passes the bridge test, 218/218 and `check`. In the browser the module throws at 2.3 s, so lines 49–58 never run and the Example yard and About buttons are dead (read from the code). Every acceptance step still passes. The job fails only at the end, 3.3 s after the last capture, on the harness's generic page-error check. | Convert arguments as WebIDL does: throw a `TypeError` unless the target is a node of the double and `attributeFilter` is an array-like of strings. Run probes like `dom-probes.mjs` in the CI browser job, so the double's rules are pinned to Chromium, not only to its own control test. | Open |
| **SF4** | **The new 20 s per-test bound was about as long as the test itself under load** (measured, `reviewer/bound-stress*.json`). "window.nautilus.sendToGame sends…" took 7.8 s and 7.5 s in a quiet full-suite run, 19.46 s and 19.64 s under 16 busy loops, and 2.5 s on CI. node:test counts an overrun as cancelled, which fails `npm test`. The comment "A test here takes under 2 s" held only for the file run alone. | Size the bound from the measured worst case, 60 s or more, or rely on assertions before each await (SF5). | **Fixed in `aed3921`.** The bound is 120 s, six times the stressed worst case. |
| **SF5** | **A fault that starts an extra load ends at the bound, not at an assertion** (measured, `reviewer/sweep-r5.json`).<br>- W01, the click ignores a block (`tools/editor-game-handoff.mjs:10`): "test timed out after 20000ms" after 22.8 s, counted as cancelled.<br>- W02, `open()` loads twice (`editor.js:17`): two tests time out, after 42.6 s.<br>- W03, the Example yard opens twice (`editor.js:52`): 23.2 s.<br>None names its cause. The awaits that hang are at `tests/editor-host-bridge.test.mjs:232`, `:247` and `:293`. W01 passes in the browser, because the acceptance never sends a block. In the page, Send is disabled for a block, so the guard is defence in depth (read from the code). | Settle and assert the number of loads and host calls before each await, as `87805df` did for N07, N14 and F04. Or make the held doubles refuse a call they were not told to expect. | Open. With `aed3921`'s 120 s bound these faults still fail, but later. |
| NIT 1 | **SF4's surviving window is about 1e-10 m wide** (measured, `reviewer/threshold-r5.json`). Tolerances between 5.00003e-11 and 1.49999e-10 survive: T02 at 6e-11, T03 at 1.49e-10, T06 (a relative 5.6e-11), T07 (1e-10 + 1e-14) and C42. T04 at 5e-11 and T05 at 1.5e-10 are killed. T01 (`<` becomes `<=`) survives but is equivalent here, because none of 601 consecutive doubles puts the face exactly on the threshold. | The exact boundary falls between x 20.6399999999, which is refused, and the next double, 20.639999999900002, which is accepted. Probing that pair leaves only tolerances within about 4e-15 m. | Open |
| NIT 2 | **The double is stricter than the page, which gives false kills** (measured). Each of these is equivalent in the page: S01 `'.settings-heading'`, S02 `'aside.properties'` and S03 `toggleAttribute` each fail all 7 tests in 0.3 s, and R12 `window.confirm` fails one test. In the browser S01 and S03 pass, with captures identical to the pristine run. The double also lacks `takeRecords`, the lowercasing of attribute names and `className` reflection, and it reflects `disabled` on every element (P19–P22). | Model selectors and the missing members from the page, or note each one as a limit. | Open |
| NIT 3 | **Notification timing differed from Chromium** (measured, P12). A record queued during one callback, for an observer that had nothing pending, was delivered by the double in the same pass and by Edge in a later microtask: Edge ran A, the promise, then B, and the double ran A, B, then the promise. So the comment "As the DOM does, notify the observers that existed" was wrong. Today's `editor.js` is not affected. | — | **Fixed in `aed3921`.** A pass notifies only the observers with records pending when it began, in creation order. |
| NIT 4 | **The loop guard fails a finite cascade** (measured, P13). Twelve self-writes settle in Edge, but the double fails at the tenth. The comment overstated "the browser would freeze". | — | **Comment corrected in `aed3921`.** The guard keeps failing a cascade of ten or more, by design. |
| NIT 5 | **A loop deferred by one microtask defeats both guards** (measured, `reviewer/hang-probe.json`). With N01 plus Send's observer deferring its refresh by one microtask, the bridge file ran silently for 60 s until the reviewer killed it by its PID. The loop guard resets its depth at each microtask, and the bound's timer never fires. This takes two edits, so it is a hazard rather than a one-line fault. The `map-workshop` CI job has no `timeout-minutes` (`.github/workflows/check.yml:8-18`), so such a hang would run to GitHub's 6-hour limit. | Add `timeout-minutes` to the `map-workshop` job. Count deliveries across microtasks within one test step, not only within one chain. | Open |
| NIT 6 | R04, a status writer that uses `innerHTML`, passes headlessly. This is the listed unparsed-markup limit, and it is equivalent for today's messages. | — | Open |
| NIT 7 | Round 4's NITs 4, 6, the rest of 7, and 8 stay open. R03 (the feedback loses `role`) still passes every headless gate. | — | Open |

## Round 4's findings, as round 5 found them

| ID | Status (reviewer) |
| --- | --- |
| SF1 | **Closed** for the rules the double states. **Open** for argument conversion (SF3) and the feedback's placement (SF1). |
| SF2 | **Closed** for `open()`'s await and the Example yard: N06, N07, N13 and N14 are killed. **Open** as a class (SF4, SF5). |
| SF3 | **Closed** for the two texts: F01, F02, F04 and F05 are killed, and the build refuses F03. **Open** for the wiring (SF2). |
| SF4 | **Closed** to 1e-10 m (NIT 1). |
| NIT 1–3 | Fixed in `484bb56`; not re-measured. |
| NIT 4 | Open: N16 still survives. |
| NIT 5 | Fixed: N11 and N12 are killed. |
| NIT 6 | Open: the import check compares names only. |
| NIT 7 | Partly fixed. |
| NIT 8 | Open. |

## The author's record, re-measured (reviewer)

**Reproduces:**
- the mutation proof: 25 of 25 verdicts and failing tests (`reviewer/compare-proof.json`);
- the browser rows: N01 26.9 s (recorded 27.1 s), N17 27.0 s (26.9 s), N03 11.5 s after the second capture (11.4 s), N04 5.9 s (6.2 s), F01 3.1 s and F02 2.9 s after the last capture (the same);
- `dist/` restored after the proof, and `git status` empty before and after;
- the `dist/` digests on `9ff1957` and `87805df`;
- "3.3–3.5 s" for N07, N14 and F04: 3.36–3.40 s;
- the SF4 numbers: −9.99999999992e-5 at 20.6399, +5.6e-16 at 20.64, and deficits of 1.5e-10 and 5e-11;
- the 82-mutant sweep's JSON. The reviewer did not re-run the sweep, but C18 is killed in its proof re-run.

**Does not reproduce, or is imprecise.** Each is now an [erratum in round 4's record](2026-10-29-hostile-review-round-4.md#errata-from-round-5):
- the load times "at most 3.6 s quiet, 6.2 s under 16 busy loops": two re-runs gave quiet worst cases of 4.2 s and 6.9 s, and stressed worst cases of 12.9 s and 6.4 s;
- "16.4 s and 13.9 s after the job started": those are times from the start of the review step, and later runs reached 18.6–20.1 s;
- "A test here takes under 2 s";
- "`dist/` hashes as before": true for `87805df`, but the reviewed tip `d91e23a` deploys 10 changed files under `dist/docs` (1036 files, `603b0e9a…`), which are the record itself;
- "one settings feedback after every refresh": the tests assert it twice, at load and at the end of one test;
- the double's comments on notification order and the loop guard (NITs 3 and 4).

## After the review

`aed3921` corrects what round 5 measured as wrong in the answer's own statements and bounds. Round 5's should-fixes are left for the architect.

| Where | Was | Now |
| --- | --- | --- |
| The bridge test's per-test bound | 20 s, "a test here takes under 2 s" | 120 s, with the measured 7.8 s quiet and 19.6 s stressed in its comment (SF4) |
| The double's `notify()` | every observer that existed when the microtask ran | only the observers with records pending when the pass began, as in Chromium (NIT 3) |
| The loop guard's comment | "in the browser the editor freezes" | a finite cascade of ten or more fails too (NIT 4) |
| `LOAD_MS` in the acceptance | 20 s, "at most 3.6 s quiet, 6.2 s stressed" | 30 s, Playwright's default: three runs gave 3.6–6.9 s quiet and 6.2–12.9 s stressed |

On `aed3921`:
- `test` (218/218, none cancelled), `check --tracked` and `build` pass.
- `review:integration` passes in 46 s. The six captures and the host record are identical to round 3's record, with no page errors.
- A spot check of seven mutants (N01, N03, N04, N17, N07, N14, F04) still fails the bridge test, with the same failing tests as in the proof.

## Not verified

- **Other browsers.** Only Chromium (headless Edge 156) was tried; Firefox and WebKit are not installed.
- **CI's load time** is estimated, not measured: about 4–8 s against the bound.
- **The 82-mutant sweep** was not re-run by the reviewer, and not on `aed3921`.
- **R04** was not run in the browser.
- **The 12-minute stall on `064f4df`.** The reviewer confirmed that `064f4df` and `176a29f` have no per-test bound, but did not reproduce the stall.
- **`aed3921` was not reviewed**, because the loop ended. Its mutation check is the seven-mutant spot check above.
- **The new main.** `main` moved to `ddfd43c` with the architect's PR #8. PRs #3 and #4 still merge cleanly, but no test has run on the merged result.
