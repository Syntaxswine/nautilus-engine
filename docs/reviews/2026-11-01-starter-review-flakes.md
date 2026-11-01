# Starter review flakes: the phone capture and the Start key (2026-11-01)

`npm run review:starter` failed CI on and off, in two separate ways. The empty phone capture was a race in the review's own timing. The Start key failure was a defect in the title's close handler, which the review's timing exposed. Main already carried a correction for the first (`b8dd25d`), which its record called a hypothesis until CI proved it. This record measures that correction, then finds and measures the second failure. Main repaired the handler in `4ed97f2` while this record was in review, so [the fix](#the-fix) is main's, and it is re-measured on the merged tree.

- **Commits:** the probes `b405fcc` and `62869c7`, on a scratch branch cut from main `69115f6`, not merged; a review-only fix, `ef3a293`, on main `3868ff6`; the re-measure on `e6f52e2`, the merge of main `d7ed966`.
- **Rigs:** GitHub `ubuntu-latest` runners (4 vCPUs, 16 GB; AMD EPYC 7763, AMD EPYC 9V45, Intel Xeon 8573C), Chromium 151.0.7922.34, Playwright 1.62.1, SwiftShader. Locally, headless Edge 156 on Windows 11.
- **Labels:** **measured** = run and counted; **inference** = the reading that best fits the counts, not observed directly.

## What CI showed (measured)

The 239 runs GitHub lists from 2026-10-28 to 2026-11-01 (`census.tsv`), of which 66 ran `review:starter`:

| Ending | Without `b8dd25d` (61 runs) | With it (5 runs) |
| --- | --- | --- |
| Empty phone capture (`Page.captureScreenshot: Unable to capture screenshot`) | 13 (21 %), always the first phone capture | 0 |
| Start key: `#game` never visible after Enter | 2 | 0 |

Five passes prove little: a 21 % flake passes five in a row 30 % of the time. So both races were measured with paired arms over the real review on real runners. A probe branch turned each element of the correction into a switch, and `probe-starter-capture.mjs` looped the whole review on six runners, arms shuffled within each cycle.

## The phone capture (measured)

Run 41264912700, 576 full reviews, 72 per arm:

| Arm | Change from the flow before `b8dd25d` | Empty captures | 95 % interval |
| --- | --- | --- | --- |
| old | none | 10 | 6.9–24.1 % |
| viewport | captures the viewport, not the full page | 13 | 10.0–28.9 % |
| front | `bringToFront` | 9 | 5.9–22.4 % |
| state | layout metrics and page state read first | 6 | 3.1–17.3 % |
| close | desktop page closed first | 0 | 0–5.0 % |
| paint | visible Start, fonts, two animation frames | 0 | 0–5.0 % |
| delay | one second's wait | 0 | 0–5.0 % |
| main | all of `b8dd25d` | 0 | 0–5.0 % |

The arms fall into two groups: 38 of 288 failed in the first four and 0 of 288 in the last four. The old arm's rate shows the probe could fail. The second probe's 994 reviews, all with the correction, had no empty capture (at most 0.37 %).

- **`b8dd25d` holds.** It has two independent safeguards: closing the desktop page and waiting for paint each remove the failure alone.
- **Not the cause:** full-page capture (the viewport arm fails as often), and focus or visibility (`bringToFront` does nothing, and the page reported itself visible and focused after all 38 failures). The layout read does not remove it either.
- **Timing:** the empty answer comes early, at a median of 128 ms against 411 ms for a good capture. Every failure was retried, and the first retry succeeded in 38 of 38. The time from load to the capture call is the same in failed and passed captures (medians 38 and 37 ms).
- **Runners:** five of the six runners failed, on all three CPU models. The rate varied by runner (0 to 16 of 96).

**Inference:** with another page open, Chromium answers a capture in a fresh page's first frames before that page has a surface to copy. Neither the browser's internals nor its logs were observed, so this explains the counts without proving the path. `bringToFront` and the layout metrics showed no effect on the failure. They stay in the review: they are harmless, and the metrics are useful diagnostics.

## The Start key (measured)

Probe 1 found this in 14 of 576 reviews, spread across six of its eight arms; it is the same `#game` timeout as the two CI runs above. After the census closed, main failed at the same step in run 41281793610 (`47c7fe1`). That run kept no final DOM, so its own cause is not proved; the ten failures below kept theirs.

`<dialog>.close()` restores focus to the opener at once, and the `close` event fires later. The title's handler then focused the opener again, whatever had happened to focus in between (`packages/game-ui/title.js` before `4ed97f2`). The review pressed Escape, moved focus to Start and pressed Enter. If the event came after that focus, Enter went to Credits and reopened it.

- **Forced order:** closing the dialog and focusing Start in one task left focus on Credits two frames later, and Enter then reopened Credits.
- **The obvious fix fails.** Waiting for focus to be on Credits waits for nothing, because the browser has already put it there. A control caught this:

| Local loop on Edge, old handler (267 each) | Reopened Credits |
| --- | --- |
| No wait | 4 |
| Wait for focus on Credits | 3 |
| Wait for the `close` event | 0 |

- **In CI** (run 41267712860, 994 full reviews, paired, old handler):

| Arm | Reviews | Passed | Start key failed |
| --- | --- | --- | --- |
| no wait | 497 | 487 | 10 (2.0 %) |
| wait for the event | 497 | 497 | 0 (at most 0.74 %) |

Fisher's exact p = 0.0019. All ten failures left the state the cause predicts: focus on Back, one dialog open, the title idle.

## The fix

`4ed97f2` on main made two changes:

- **The title.** The close handler restores the opener only if focus is still in the closed dialog or has fallen back to the document. Focus moved in the gap stays where it was.
- **The review.** It registers a listener on the open dialog before pressing Escape and waits for that listener's flag. The app's own listener runs first, so focus has settled. It then asserts that focus is on Credits, which the review did not check before. The wait uses `waitForFunction`, so an Escape that stops closing the dialog fails at its timeout rather than hanging. A second step forces the order that failed: `close()` and a focus on Start in one task, then the trusted `close` event.

A review-only fix came first (`ef3a293`, the wait probe 2 measured). It left the handler alone because the gap is about a frame and no game flow depends on it. That was the wrong call: the handler took focus from anything that moved it in the gap, a person's Tab included, so the defect was the title's and the wait only stepped around it. `4ed97f2` removes the defect, and its lines replaced `ef3a293`'s in the review.

### Re-measured on the merged tree (measured)

The figures above were taken on the old handler, so the race was measured again on `e6f52e2`. The loop ran the review's steps up to the Start key, locally on Edge, in 552 shuffled cycles over two seeds. Every arm's title went through one route, so the arms differed only in the handler's body. The old arm removes the repair's focus check, which restores the old behaviour in this flow.

| Arm | Handler | Wait in the review | Reopened Credits of 552 |
| --- | --- | --- | --- |
| old | focus check removed | none | 11 (2.0 %) |
| title | repaired | none | 0 (at most 0.67 %) |
| both | repaired | the `close` event | 0 (at most 0.67 %) |

Fisher's exact p = 0.00093 between old and title.

- **The loop can still fail.** All eleven failures left the predicted state: focus on Back, one dialog open, the game hidden.
- **The repair holds alone.** The title arm has no wait in the review and did not fail, so the wait is no longer what protects the Start key.
- **Forced order.** Before counting, in both seeds, the same order left focus on Credits in the old arm and on Start with the repair, which also shows the arms really differed.

Mutants of the built title, with a passing control (`mutants-merged.txt`):

| Mutant | Result |
| --- | --- |
| The repair's focus check removed | Killed at the forced-order assertion in 3.4 s |
| Escape no longer closes Credits | Killed at the wait in 13.2 s |

**Gates on `e6f52e2`:** `npm run build`, `npm run check` and `npm run check -- --tracked`, `npm test` (852 of 852), `npm run test:upstream` (32 of 32) and `npm run review:starter` twice on Edge pass.

## Not changed, and not verified

- **Branches behind main.** Any branch without `b8dd25d` still has the capture failure, and any without `4ed97f2` still has the Start key failure, until they merge main.
- **The repaired handler on `ubuntu-latest`.** Its rate was measured only on Edge. On CI runners it has only CI's own runs, and the wait beside it is the one probe 2 measured (0 of 497).
- **The empty capture on Edge.** It did not appear locally (the old flow passed 12 of 12 pinned to two logical CPUs), so that failure was studied only in CI. The Start key failure reproduces on both browsers.
- **The rest of the browser job.** The probes looped `review:starter` alone, not the job's other reviews.

## Evidence (`evidence/starter-review-flakes/`)

| File | What |
| --- | --- |
| `census.tsv`, `rate.mjs`, `rate.txt` | Every run GitHub listed, and the base rates |
| `probe-1/`, `probe-2/` | Each runner's results and machine |
| `probe-1-analysis.txt`, `analyze.mjs`, `timing.mjs` | Outcome by arm, intervals, timing, retries |
| `starter-probe.yml`, `probe-starter-capture.mjs`, `patch-arms.mjs`, `patch-arms-2.mjs` | The probe workflow, its driver and the arm switches |
| `probe-title-close-race.mjs`, `close-race.json` | The local three-way loop on the old handler |
| `mutate-fix.mjs`, `mutants.txt` | The mutants of `ef3a293`, on the old handler |
| `probe-title-close-race-merged.mjs`, `close-race-merged-1.json`, `close-race-merged-2.json` | The paired loop on the merged tree |
| `mutate-merged.mjs`, `mutants-merged.txt` | The mutants on the merged tree |
