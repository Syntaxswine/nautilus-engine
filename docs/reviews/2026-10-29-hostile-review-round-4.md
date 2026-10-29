# Hostile review, round 4 of 5: rung 1 after the answer to round 3

**Reviewed:** `651e5aa`, `b131fd4` and `576c4c2`, the answer to [round 3](2026-10-29-hostile-review-round-3.md), and `09ecbef`, its record. Rung 1 of [round 1's fix order](2026-10-28-hostile-review-round-1.md) must close two findings and leave the editor unchanged:
- **S2:** three guards that could be disabled while every test still passed.
- **S3:** the editor's game handoff, which only a 30-second browser timeout caught.

**Method.**
- One hostile reviewer (Claude) worked in its own sandbox worktree at `09ecbef`. That commit's code is byte-identical to `576c4c2`.
- The author re-measured the four should-fix findings with mutants written from the code, independently of the reviewer's mutant list. Three nits were wrong statements, and the author fixed them in `484bb56`.
- **The review loop stopped here, then resumed.** Round 4 found nothing must-fix, so the loop stopped. The user then asked for the four should-fixes to be answered and for a round 5 to review the answer. The answer is `064f4df`, with two follow-ups, `176a29f` and `87805df`; see [the answer, measured](#the-answer-to-round-4-measured).
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
| **SF1** | **The headless suite cannot see the page's observers.** The double (`tests/editor-host-bridge.test.mjs:29-32`) stores its targets, ignores the options and never delivers a record. The tests call the callbacks by hand. Each of these one-line faults in `apps/editor/editor.js` passes check, test and build:<br>- **N01** writes `disabled` on every refresh (`:34`). In the real page, that write queues a record even when the value is unchanged, so the refresh triggers itself and **the editor freezes at load**. The browser job fails after 31.9 s on `page.goto`, with no capture.<br>- **N03** has the status mirror observe `characterData` only (`:28`). The browser fails 30.1 s after the last capture, at the save step's wait.<br>- **N04** drops the feedback's once-only guard (`:23`). Feedback elements pile up: 3 at load and 7 after one wall edit, where the pristine page holds 1. The browser fails 30.1 s after the last capture, clicking Save.<br>- **N02** has Send's observer watch `childList` (`:48`). It passes every gate, the browser included. | N01–N04 each pass 215/215 and `check`. Under N01 the browser job fails after 32.4 s, with a `TimeoutError` on `page.goto` (`tools/review-engine-integration.mjs:13`). | **Answered in `064f4df`.** The direction:<br>- Give the double three properties the page relies on: an observer gets only what its options select; each write to `disabled`, `textContent` or a child list queues a record, delivered after the step; and a test fails if one write is delivered more than about ten times.<br>- Assert a single feedback element after several refreshes.<br>- In the browser, bound `goto` and the save step as the handoff block's waits are bound. Add a liveness probe, so that a frozen page is reported as frozen. |
| **SF2** | **`open()` is checked without the `await` that makes it wait for the editor.** The real `editor3d.open` resolves only after the scene has loaded. The double's `open` (`tests/editor-host-bridge.test.mjs:122`) resolves at once. **N06** drops the page's `await` (`editor.js:17`) and passes every gate, the browser included. Under N06, read from the code: `open()` resolves while the editor is still loading, a scene failure never reaches the caller, and the editor's own status replaces the Example yard's. | N06 passes 215/215 and `check`. | **Answered in `064f4df`.** The direction: let the double's `open` resolve on a promise that the test releases. Assert that `N.open()` is still pending before the release, and that a rejecting `open` makes `N.open()` reject. |
| **SF3** | **Nothing tests that the Send click waits for an asynchronous host.** This predates rung 1 and lives in `tools/`. The click path's wait exists only in two build patches. **F01** drops `launchPlaytest`'s `return` (`tools/build.mjs:40`). **F02** drops the click handler's `await` (`tools/editor-wall-adapter.mjs:41`). Each passes every gate, with identical captures. Under either, read from the code: a host whose `openMap` later rejects is reported as "Map sent to the connected game". | F01 and F02 each pass 215/215, `check`, the build and `test:package`. | **Answered in `064f4df`.** The direction: add two hosts. One resolves only after the test has read the status, which must still read "Sending map…". The other rejects, and the status must show its message. |
| **SF4** | **The clearance table pins the radius only to within 5 mm.** **C30** widens the tolerance from `1e-10` to `1e-3` (`packages/adapters/tinderbox/index.js:157`). It passes the suite, and gets 0 of 295 usable random maps wrong. The nearest probe faces sit 5 mm either side of the radius, and the random maps use a 1 cm grid. Take a wall whose face is 0.5595 m or 0.5599 m from the spawn: the pristine adapter refuses it, C30 accepts it, and the pinned Tinderbox then refuses that spawn at start-up with an uncoded `Error: Invalid player spawn/tool`. | C30 passes 215/215 and `check`. The reviewer's `consequence-c30.mjs`, re-run, reproduces its output byte for byte. | **Answered in `064f4df`**, more tightly than the direction, which was to add faces 0.1 mm inside and outside the radius, at map x 20.6399 and 20.6401. |
| NIT 1 | The corrected comment in `apps/editor/game-handoff.js:19-21` still said that `editor.js` assigns these members. In fact `editor.js` re-implements `hasGameAdapter` as its own getter (`:15`), the surface E07 mutates. | — | **Fixed in `484bb56`.** |
| NIT 2 | The round-3 evidence README called the sweep 80 mutants, E13–E21. `round4-mut.json` holds 82, E13–E23 with no E19. | — | **Fixed in `484bb56`.** |
| NIT 3 | `tests/game-handoff.test.mjs:97`, labelled "A refused adapter keeps the connected host", checked only that nothing refreshed. G08 died instead on line 99, on the next send's "Connect a game adapter first." | On `484bb56`, G08 fails at `:97` with "A refused adapter keeps the connected host" (`answer/g08-label.json`). | **Fixed in `484bb56`.** The line asserts `hasGameAdapter` under that label, and the refresh check has a label of its own. |
| NIT 4 | "The bridge stops observing the body once Send exists" (`tests/editor-host-bridge.test.mjs:76`) also passes when the page never observes the body (N16). In the real page, where Send exists at load, N16 is equivalent. | — | Open. |
| NIT 5 | The bridge test's block case checks only Send (`tests/editor-host-bridge.test.mjs:86-87`). N11 (the quick button ignores a block) and N12 (the title follows `disabled`) pass every gate. | — | **Fixed in `064f4df`.** The block cases check the quick Send button and Send's title. |
| NIT 6 | The bridge test's import check compares names, not module specifiers (`tests/editor-host-bridge.test.mjs:61-62`). A page that imports a same-named binding from another module passes, and the test would then run its own binding. | — | Open. |
| NIT 7 | The editor glue outside the handoff is outside every test: options and Escape, Example yard, About, the `nautilus-properties` id, and the feedback's `role` and `aria-live`. N05, N07–N10, N13 and N14 each pass the suite. Applied together, they pass the browser with identical captures. | — | Partly fixed in `064f4df`: SF2's Example yard test covers that button's load path (N07, N13, N14). The rest stays open, outside rung 1's scope. |
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

## The answer to round 4, measured

`064f4df` answers SF1–SF4 and NIT 5. Two follow-ups came from the author's own checks while the proof ran:
- **`176a29f`** brings two of the page double's rules into line with the DOM. In the DOM, `attributeOldValue` implies `attributes`, so a mutant that uses it is no longer killed falsely. Writing a text node's data now queues a characterData record.
- **`87805df`** stops three faults from hanging the bridge test. The first formal run, on `064f4df`, stalled at N07 for 12 minutes. Under N07, N14 and F04, a test awaited a click that waits on a load or a host the test never releases. Each now fails by assertion, in 3.3–3.5 s.

The proof below ran on `87805df`. None of the three commits changes anything under `apps/` or `packages/`.

| Finding | The answer |
| --- | --- |
| **SF1** | **The bridge test's page double follows the DOM.** `tests/editor-host-bridge.test.mjs` runs `editor.js` on a tree of elements whose writes queue records as the DOM queues them:<br>- `textContent`, `innerHTML` and `append` queue childList records when a node is added or removed.<br>- Setting an attribute records even an unchanged value; removing one records only a present one. `disabled`, `hidden` and `title` reflect their attributes.<br>- An observer receives only what its options select: its target or, under `subtree`, a descendant; a type it observes; an attribute its filter names.<br>- Records arrive after the step, in a microtask, for the observers that existed when it ran.<br>- The tenth delivery caused by one write fails the test, where the browser would freeze.<br><br>A control test fails a self-triggering observer and pins those rules. The tests assert one settings feedback after every refresh.<br><br>**In the browser** (`tools/review-engine-integration.mjs`):<br>- Each load wait is bounded at 20 s, and the save step at 10 s.<br>- A failed wait first asks whether the page still answers, so a frozen editor is reported as frozen.<br>- One settings feedback is asserted after load, after a wall edit and after the handoff. |
| **SF2** | The editor double's `open()` resolves when the test releases it. `N.open()` must still be pending before the release, and it must reject when the editor's load rejects.<br><br>The Example yard is announced only after the editor has loaded it. A failed load, the loading guard and the confirmation before replacing edits are checked too: N07, N13 and N14, from NIT 7. |
| **SF3** | The two patches behind the Send click move verbatim into `tools/editor-game-handoff.mjs`:<br>- `LAUNCH_PLAYTEST`, which was inline in `build.mjs`;<br>- `SEND_CLICK`, which was inline in `editor-wall-adapter.mjs`.<br><br>The build refuses to deploy any other text. A headless test checks that the editor adapter deploys `SEND_CLICK`, then runs both texts on the page double with the pinned `parseMap`, against two hosts:<br>- one that answers only when released: until then the status must read "Sending map…", and a second click must wait;<br>- one that rejects: its message must be shown.<br><br>The browser acceptance adds the same manual host. |
| **SF4** | Two probes straddle the threshold that the adapter and the pinned game share:<br>- wall x 20.63999999985: the face is 1.5e-10 m inside the radius, and both refuse;<br>- wall x 20.63999999995: the face is 5e-11 m inside, and both accept. |
| NIT 5 | The block cases check the quick Send button and Send's title (N11, N12). |

**Why SF4 goes past the direction's 0.1 mm pair.** Both checks refuse a face nearer than the radius less `1e-10` m:
- the adapter, at `packages/adapters/tinderbox/index.js:157`;
- the pinned game, at its `geometry.js:35`.

The map validator accepts any finite wall endpoint, and with its snap step at 0 the editor keeps an endpoint where it is drawn. A pair 0.1 mm apart would leave every tolerance below 0.1 mm alive: the same gap, one decade down. A tolerance of exactly 0.1 mm would be decided by float noise, because the 20.6399 face computes to −9.99999999992e-5 m (`answer/threshold-probe.json`). At these coordinates the float error is about 1e-15 m: x 20.64 computes to the radius plus 5.6e-16 m.

**The mutation proof** (`answer/answer-proof.json`) ran on `87805df` in a clean sandbox, whose `git status` was empty before and after. The pristine suite passed 218/218 first. `check --tracked` passes under every mutant. "New" marks a mutant the answer added to round 4's.

| Mutant | Result | Failing tests |
| --- | --- | --- |
| N01 refresh writes `disabled` every time | killed | All 7 bridge tests: the page reports a self-triggering observer at load. |
| N17 Send's observer drops its attribute filter (new) | killed | All 7 bridge tests, the same way: the title written on every refresh re-triggers it. |
| N02 Send's observer watches childList | killed | Send follows the host. |
| N03 status mirror observes characterData only | killed | The engine before any host; the Example yard; the deployed Send click. |
| N04 feedback once-only guard dropped | killed | The engine before any host; Send follows the host. |
| N11 quick Send ignores a block (NIT 5) | killed | Send follows the host. |
| N12 Send's title follows `disabled` (NIT 5) | killed | Send follows the host. |
| N16 body observer never installed | survives, as expected: equivalent while Send exists at load (NIT 4) | — |
| N06 `open()` without `await` | killed | `open()` waits; the Example yard. |
| N07 Example yard replaces edits when the user cancels | killed | The Example yard. |
| N13 Example yard load failure reported as success | killed | The Example yard. |
| N14 Example yard ignores the loading guard | killed | The Example yard. |
| Z00 neutral control in `editor.js` | survives, as expected | — |
| F01 `launchPlaytest` drops `return` | killed; the build and `test:package` pass | The deployed Send click. |
| F02 the click handler drops `await` | killed; the build and `test:package` pass | The deployed Send click. |
| F04 the click never sets `busy` (new) | killed | The deployed Send click. |
| F05 `launchPlaytest` loses its host guard (new) | killed | The deployed Send click. |
| F03 the build deploys another playtest text (new) | the suite passes, and the build refuses | — |
| Z01 neutral control in `tools/editor-game-handoff.mjs` | survives, as expected | — |
| C30 clearance tolerance 1 mm | killed | Bear clearance agrees with the pinned game. |
| C40 tolerance 1 nm (new) | killed | Bear clearance. |
| C41 tolerance 0.3 nm (new) | killed | Bear clearance. |
| C42 tolerance 0.12 nm (new) | survives, as expected: it lies inside the probes' window, between 5e-11 and 1.5e-10 m | — |
| C43 tolerance 0.04 nm (new) | killed | Bear clearance. |
| C18 clearance epsilon dropped | killed | Bear clearance. Rounds 3 and 4 left it alive. |

**In the browser** (the same file). Each run is the build, then `review:integration` under the mutant. A pristine run came first and passed in 49.5 s. Afterwards `dist/` hashed as it did before.

| Mutant | Fails | Message |
| --- | --- | --- |
| N01 | after 27.1 s, at load, before any capture | "The editor froze while loading: its page stopped answering." |
| N17 | after 26.9 s, at load, before any capture | The same. |
| N03 | 11.4 s after the second capture, at the save step | "Failed while saving in this browser", with the status ("Saved in this browser…") and the stale feedback ("Preparing scene…"). |
| N04 | after 6.2 s, before any capture | "Expected one settings feedback after loading, found 3." |
| F01 | 3.1 s after the last capture | "Send did not wait for the host", with the status already "Map sent to the connected game…". |
| F02 | 2.9 s after the last capture | The same. |

Under round 4, N01 failed after 32.4 s with a bare `TimeoutError`, and N03 and N04 failed by 30 s timeouts. F01 and F02 passed.

**`dist/`** (`answer/dist-digests.json`): 1028 files with one digest, `b1a94d57…`, on both `9ff1957` and `87805df`.

**The load bound** (`answer/load-latency.json`):
- On a quiet machine the editor was ready in at most 3.6 s: navigation took 2.4–2.5 s, then 0.8–1.1 s more.
- Under 16 busy loops on 16 logical cores it was ready in at most 6.2 s, with navigation taking 3.5–4.6 s.
- On CI, every run of `064f4df`, `176a29f` and `87805df` passed. On `064f4df`, the first capture came 16.4 s and 13.9 s after the job started.

**Gates on `87805df`** (`answer/gates-87805df.txt`), in the same sandbox:
- `check --tracked` (603 pinned files), `test` (218/218), `test:upstream` (32/32), `build` and `test:package` pass.
- `review:integration` passes in 46 s (`answer/compare-87805df.json`). The six captures, the host record and the build provenance are byte-identical to round 3's committed record, with no page errors and no failed requests. The handoff record adds `manual`, and `closed` now quotes the manual host's refusal.

**Round 3's 82-mutant sweep, re-run unchanged** (`answer/sweep-87805df.json`), in the same sandbox, with `git status` empty before and after: 78 killed. The four survivors are the three neutral controls (P00, H00 and C00) and E16, which is equivalent. Against round 3's record, one verdict changed: C18 is now killed.

**What the answer leaves open:**
- N16 survives (NIT 4). C42 survives: a tolerance between 5e-11 and 1.5e-10 m.
- The double keeps `innerHTML` markup unparsed. Its `querySelector` knows only the two selectors the bridge uses, and throws on any other.
- A frozen page is reported as frozen only after the 20 s load bound and a 5 s probe, 27 s in all. The cause is now named, but the wait is still long.
- NIT 6, the rest of NIT 7, and NIT 8 stay open.

## Behaviour changes

None. `484bb56` corrects a comment, one test's assertion and labels, and a count in a README. `064f4df`, `176a29f` and `87805df` change tests and review tools only. `064f4df` moves two deployment patch texts verbatim into their own module, and `dist/` hashes as before.

## Not verified

- **Other browsers.** N01's freeze was seen in Chromium (headless Edge) only. The DOM standard says a write that leaves an attribute unchanged still queues a record; Firefox and WebKit were not tried.
- **SF2's and SF3's consequences** were read from the code in round 4. `064f4df` builds a held host and a rejecting host, both headlessly and in the browser.
- **CI.** The review's own runs were local. `064f4df` passed both of its CI runs, push and pull request, browser job included.
- **The page double's DOM rules** come from the DOM standard. In a browser, only Chromium was tried: headless Edge here, and Chromium on CI.
- **Load order on other machines.** That Send exists before the bridge runs is a timing fact of this page, measured on one machine, without a slow network or a throttled CPU.
- **The third round-2 erratum** was not re-measured.
- **One lost run record.** The reviewer's first headless run lost its JSON. `headless-run1.log` is the record for its 29 mutants, and the survivors that matter were re-run with full records (`headless-run2.json`).
