# Hostile review, round 4 of 5: rung 1 after the answer to round 3

**Reviewed:** `651e5aa`, `b131fd4` and `576c4c2`, the answer to [round 3](2026-10-29-hostile-review-round-3.md), and `09ecbef`, its record. Rung 1 of [round 1's fix order](2026-10-28-hostile-review-round-1.md) must close two findings and leave the editor unchanged:
- **S2:** three guards that could be disabled while every test still passed.
- **S3:** the editor's game handoff, which only a 30-second browser timeout caught.

**Method.**
- One hostile reviewer (Claude) worked in its own sandbox worktree at `09ecbef`. That commit's code is byte-identical to `576c4c2`.
- The author re-measured the four should-fix findings with mutants written from the code, independently of the reviewer's mutant list. Three nits were wrong statements, and the author fixed them in `484bb56`.
- **The review loop stops here.** Round 4 found nothing must-fix, so round 5 runs only if it is asked for. The four should-fix findings stay open, each with the reviewer's direction.
- Evidence is in [`evidence/hostile-review-round-4/`](evidence/hostile-review-round-4/README.md).

## Score: 8.5 / 10

**What held up (reviewer, measured):**
- **S2 is closed.**
  - Round 3's five killable clearance survivors die: C19, C20, C23, C24 and C27.
  - All 22 probes test what their names say. Their geometry, recomputed without the adapter, matches.
  - Keeping C18 is reasonable. Only a hand-written coordinate such as x 20.639999999998 reaches it.
- **S3 is closed for the capability handoff.** Every mutant of what is sent, and to which host, dies headlessly:
  - the brief's E01, E05, E07, E09, E10, E11 and E12 (E12's first headless run);
  - the reviewer's N15, which turns a refusal into a rejected promise.

  In the browser, each one the page can see fails by assertion within 2.2 s of the last capture and names its cause.
- **The author's record reproduces.**
  - The 82-mutant sweep, re-run unchanged, gives the same verdicts and the same killing tests.
  - The 11 browser runs give the same verdicts and messages, with times within 0.1 s.
  - The load-order probe re-runs byte-identical.
- **The harness fails loudly.** Five import shapes each stop the `new Function` from building or fail an import check: a multi-line import, a trailing comment, a side-effect import, a default import and a renamed import.
- **The 10 s wait is not a timing risk.** A send resolves in 0.20–0.29 s on a quiet machine. With 16 busy loops on 16 logical cores it takes 0.30–0.42 s.
- **The editor is unchanged.** The only change under `apps/` is a comment. All gates pass before and after the mutation runs, and the six captures are byte-identical to the record.

**What keeps it from 9.** Round 3's MF1 and SF3 were fixed for the instances shown, not for their class:
- The bridge test's MutationObserver double neither reads its options nor delivers records. So the glue that talks to the page's observers is still outside the headless suite (SF1).
- Two waits are untested: `open()`'s `await` (SF2), and the click path's wait for an asynchronous host (SF3).
- The clearance table pins the radius only to within 5 mm (SF4).

**Why nothing is must-fix (reviewer, judgment).** No fault found reaches an incapable host or sends the wrong map. Earlier rounds ranked a fault that the browser catches only by a timeout in two ways:
- must-fix when it bypassed the capability checks (round 2's MF1);
- should-fix when it did not (round 3's SF3).

N01–N04 do not bypass them.

## Findings

Line numbers are at `576c4c2`. "Re-measured" is the author's run on `09ecbef` (`answer/verify.json`): the full suite, then `check --tracked`, plus the build and `test:package` for mutants in `tools/`.

| ID | Finding (reviewer) | Re-measured | Status and direction |
| --- | --- | --- | --- |
| **SF1** | **The headless suite cannot see the page's observers.** The double (`tests/editor-host-bridge.test.mjs:29-32`) stores its targets, ignores the options and never delivers a record. The tests call the callbacks by hand. Each of these one-line faults in `apps/editor/editor.js` passes check, test and build:<br>- **N01** writes `disabled` on every refresh (`:34`). In the real page, that write queues a record even when the value is unchanged, so the refresh triggers itself and **the editor freezes at load**. The browser job fails after 31.9 s on `page.goto`, with no capture.<br>- **N03** has the status mirror observe `characterData` only (`:28`). The browser fails 30.1 s after the last capture, at the save step's wait.<br>- **N04** drops the feedback's once-only guard (`:23`). Feedback elements pile up: 3 at load and 7 after one wall edit, where the pristine page holds 1. The browser fails 30.1 s after the last capture, clicking Save.<br>- **N02** has Send's observer watch `childList` (`:48`). It passes every gate, the browser included. | N01–N04 each pass 215/215 and `check`. Under N01 the browser job fails after 32.4 s, with a `TimeoutError` on `page.goto` (`tools/review-engine-integration.mjs:13`). | **Open.**<br>- Give the double three properties the page relies on: an observer gets only what its options select; each write to `disabled`, `textContent` or a child list queues a record, delivered after the step; and a test fails if one write is delivered more than about ten times.<br>- Assert a single feedback element after several refreshes.<br>- In the browser, bound `goto` and the save step as the handoff block's waits are bound. Add a liveness probe, so that a frozen page is reported as frozen. |
| **SF2** | **`open()` is checked without the `await` that makes it wait for the editor.** The real `editor3d.open` resolves only after the scene has loaded. The double's `open` (`tests/editor-host-bridge.test.mjs:122`) resolves at once. **N06** drops the page's `await` (`editor.js:17`) and passes every gate, the browser included. Under N06, read from the code: `open()` resolves while the editor is still loading, a scene failure never reaches the caller, and the editor's own status replaces the Example yard's. | N06 passes 215/215 and `check`. | **Open.** Let the double's `open` resolve on a promise that the test releases. Assert that `N.open()` is still pending before the release, and that a rejecting `open` makes `N.open()` reject. |
| **SF3** | **Nothing tests that the Send click waits for an asynchronous host.** This predates rung 1 and lives in `tools/`. The click path's wait exists only in two build patches. **F01** drops `launchPlaytest`'s `return` (`tools/build.mjs:40`). **F02** drops the click handler's `await` (`tools/editor-wall-adapter.mjs:41`). Each passes every gate, with identical captures. Under either, read from the code: a host whose `openMap` later rejects is reported as "Map sent to the connected game". | F01 and F02 each pass 215/215, `check`, the build and `test:package`. | **Open.** Add two hosts. One resolves only after the test has read the status, which must still read "Sending map…". The other rejects, and the status must show its message. |
| **SF4** | **The clearance table pins the radius only to within 5 mm.** **C30** widens the tolerance from `1e-10` to `1e-3` (`packages/adapters/tinderbox/index.js:157`). It passes the suite, and gets 0 of 295 usable random maps wrong. The nearest probe faces sit 5 mm either side of the radius, and the random maps use a 1 cm grid. Take a wall whose face is 0.5595 m or 0.5599 m from the spawn: the pristine adapter refuses it, C30 accepts it, and the pinned Tinderbox then refuses that spawn at start-up with an uncoded `Error: Invalid player spawn/tool`. | C30 passes 215/215 and `check`. The reviewer's `consequence-c30.mjs`, re-run, reproduces its output byte for byte. | **Open.** Add faces 0.1 mm inside and outside the radius, at map x 20.6399 and 20.6401. |
| NIT 1 | The corrected comment in `apps/editor/game-handoff.js:19-21` still said that `editor.js` assigns these members. In fact `editor.js` re-implements `hasGameAdapter` as its own getter (`:15`), the surface E07 mutates. | — | **Fixed in `484bb56`.** |
| NIT 2 | The round-3 evidence README called the sweep 80 mutants, E13–E21. `round4-mut.json` holds 82, E13–E23 with no E19. | — | **Fixed in `484bb56`.** |
| NIT 3 | `tests/game-handoff.test.mjs:97`, labelled "A refused adapter keeps the connected host", checked only that nothing refreshed. G08 died instead on line 99, on the next send's "Connect a game adapter first." | On `484bb56`, G08 fails at `:97` with "A refused adapter keeps the connected host" (`answer/g08-label.json`). | **Fixed in `484bb56`.** The line asserts `hasGameAdapter` under that label, and the refresh check has a label of its own. |
| NIT 4 | "The bridge stops observing the body once Send exists" (`tests/editor-host-bridge.test.mjs:76`) also passes when the page never observes the body (N16). In the real page, where Send exists at load, N16 is equivalent. | — | Open. |
| NIT 5 | The bridge test's block case checks only Send (`tests/editor-host-bridge.test.mjs:86-87`). N11 (the quick button ignores a block) and N12 (the title follows `disabled`) pass every gate. | — | Open. |
| NIT 6 | The bridge test's import check compares names, not module specifiers (`tests/editor-host-bridge.test.mjs:61-62`). A page that imports a same-named binding from another module passes, and the test would then run its own binding. | — | Open. |
| NIT 7 | The editor glue outside the handoff is outside every test: options and Escape, Example yard, About, the `nautilus-properties` id, and the feedback's `role` and `aria-live`. N05, N07–N10, N13 and N14 each pass the suite. Applied together, they pass the browser with identical captures. | — | Open, and outside rung 1's scope. |
| NIT 8 | The 10 s wait passes on any change of status text. So two sends in a row with the same result would fail it falsely, and an unrelated status change would satisfy it. Today's order gives three different texts, and the reviewer saw no background status changes. | — | Open. Nothing fails today. |

## Round 3's findings, as round 4 found them

| ID | Status (reviewer) |
| --- | --- |
| MF1 | **Closed** for what is sent and to which host: E01, E05, E06, E07, E09, E10, E11, E12 and E17 die headlessly. **Open** for the page's observers and `open()` (SF1, SF2). |
| SF1 | **Closed.** One new survivor sits below the table's resolution (SF4). |
| SF2 | **Closed.** G08 dies headlessly, and so do G09–G11 and the reviewer's G12 and G13. One check was mislabelled (NIT 3, now fixed). |
| SF3 | **Closed** for the handoff block. **Open** as a class (SF1). |
| N1, N2, N4 | Closed. |
| N3 | Closed, but the README miscounted the sweep (NIT 2, now fixed). |
| Round-2 errata | Accurate. The third, "two of its rows credit fewer killing tests", was not re-measured. |

## The reviewer's mutants

Headless means the touched test files, then the full suite (215 tests), then `check --tracked`. Browser means the build and `review:integration` under the mutant. Its time runs from the last capture to the failure.

| Mutant | Headless | Browser |
| --- | --- | --- |
| E01, E05, E09, E10, E11, E12 (what is sent, and to which host) | killed (send test) | assertion, 0.9–2.2 s, naming the cause |
| E06, E07, G12 (the Send button's state) | killed (buttons or load test) | assertion, 0.1–2.2 s |
| G09, G10 (refresh order) | killed (the author's sweep, re-run) | assertion, 0.8 s and 2.2 s |
| E17, G08, G11, G13, N15 | killed | pass: the acceptance does not exercise these paths |
| **N01** refresh writes `disabled` every time | **survives** | **timeout**, `page.goto`, 31.9 s, no capture |
| **N03** status mirror observes `characterData` only | **survives** | **timeout**, the save step's wait, 30.1 s |
| **N04** feedback reinstalled on every refresh | **survives** | **timeout**, clicking Save, 30.1 s |
| **N02** Send's observer watches `childList`; **N06** `open()` without `await` | **survive** | **pass** |
| **F01, F02** the click path's wait dropped (`tools/`) | **survive** | **pass** |
| N11, N12 (block case), N16 (body never observed, equivalent) | survive | pass |
| N05, N07–N10, N13, N14 (glue outside the handoff) | survive | all seven at once: pass, captures identical |
| C19, C20, C23, C24, C27, C28, C34 (clearance) | killed | — |
| **C30** tolerance 1 mm | **survives**, 0 random maps wrong | — (SF4) |
| C18 (epsilon dropped) | survives, kept | — |
| C29, C33 (sub-tile bound padding) | survive, unreachable: a fractional start is refused as `INVALID_MAP` | — |

## The author's re-measurement

**The should-fix mutants** (`answer/verify.json`). The author wrote the needles from the code at `09ecbef`, independently of the reviewer's `mutants.mjs`, and ran each mutant in a clean sandbox with a restore in a `finally`. The pristine suite passed 215/215 first.

| Mutant | Full suite | `check --tracked` | Build, `test:package` | Browser |
| --- | --- | --- | --- | --- |
| N01 refresh writes `disabled` every time | 215/215 | pass | — | fails after 32.4 s, with a `TimeoutError` on `page.goto` while waiting for `networkidle`. No capture is taken. |
| N02 Send's observer watches `childList` | 215/215 | pass | — | — |
| N03 status mirror observes `characterData` only | 215/215 | pass | — | — |
| N04 feedback once-only guard dropped | 215/215 | pass | — | — |
| N06 `open()` without `await` | 215/215 | pass | — | — |
| F01 `launchPlaytest` drops `return` | 215/215 | pass | pass, pass | — |
| F02 click handler drops `await` | 215/215 | pass | pass, pass | — |
| C30 clearance tolerance 1 mm | 215/215 | pass | — | — |

All eight survive every headless gate, as the reviewer measured. `git status` was empty before and after.

**C30's consequence.** The reviewer's `consequence-c30.mjs`, re-run in the author's worktree, writes the same output byte for byte. Walls whose faces are 0.5595 m and 0.5599 m from the spawn are refused by the pristine adapter and accepted by C30. The pinned Tinderbox then refuses each spawn with `Error: Invalid player spawn/tool`.

**NIT 3's fix** (`answer/g08-label.json`, on `484bb56`). The pristine state test passes 5/5. Under G08 it fails at `tests/game-handoff.test.mjs:97:67`, with "A refused adapter keeps the connected host" and `actual: false`.

**Gates on `484bb56`** (`answer/gates-484bb56.txt`, `answer/compare-484bb56.json`), in a clean sandbox whose `git status` was empty before and after:
- `check --tracked` (603 pinned files), `test` (215/215), `test:upstream` (32/32), `build` and `test:package` pass.
- `review:integration` passes in 48 s. Against the committed round-3 record:
  - the six captures are byte-identical;
  - so are the `handoff` and `host` records;
  - there are no page errors and no failed requests;
  - the whole record is identical apart from its commit and browser fields.

## Behaviour changes

None. `484bb56` corrects a comment, one test's assertion and labels, and a count in a README.

## Not verified

- **Other browsers.** N01's freeze was seen in Chromium (headless Edge) only. The DOM standard says a write that leaves an attribute unchanged still queues a record; Firefox and WebKit were not tried.
- **SF2's and SF3's consequences** are read from the code. No rejecting host was built.
- **CI.** Nothing in this round ran on GitHub Actions.
- **Load order on other machines.** That Send exists before the bridge runs is a timing fact of this page, measured on one machine, without a slow network or a throttled CPU.
- **The third round-2 erratum** was not re-measured.
- **One lost run record.** The reviewer's first headless run lost its JSON. `headless-run1.log` is the record for its 29 mutants, and the survivors that matter were re-run with full records (`headless-run2.json`).
