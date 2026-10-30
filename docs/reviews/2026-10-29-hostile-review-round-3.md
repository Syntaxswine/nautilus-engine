# Hostile review, round 3 of 5: rung 1 after the answer to round 2

**Reviewed:** `f8f8f0c`, the answer to [round 2](2026-10-29-hostile-review-round-2.md), and `c762e5c`, its record. Rung 1 of [round 1's fix order](2026-10-28-hostile-review-round-1.md) closes two findings:
- **S2:** three guards that could be disabled while every test still passed.
- **S3:** the editor's game handoff, which only a 30-second browser timeout caught.

**Method.**
- One hostile reviewer (Claude) worked in its own sandbox worktree.
- The author re-checked the must-fix finding by reading the tests, measured the page's load order in the browser, and answered every finding.
- Both mutation instruments were re-run on the committed answer, and so was the browser.
- Round 4 reviews the answer.
- Evidence is in [`evidence/hostile-review-round-3/`](evidence/hostile-review-round-3/README.md).

## Score: 7.5 / 10

**What held up (reviewer, measured):**
- **The author's 53 mutants.** Re-run on the commit, 50 died. The survivors were the two neutral controls and the page bypass E01, which no headless test could see. All 21 of round 2's guard survivors died.
- **The page bypass.** E01 failed the browser acceptance by assertion in 42 s, 0.9 s after the last capture. A bypass for feature-list hosts only (E12) failed at the second wait.
- **The editor.** Round 2's 81-step harness found 0 differences, and the host's 46 property reads came in the same order.
- **The gates.** All of them passed, and the six captures matched the committed record byte for byte.

**What didn't:**
- **MF1.** The glue left in `editor.js` ran under no test. A bypass on the documented no-argument `sendToGame()` passed every gate, the browser included.
- **SF1.** Six new clearance mutants survived. One of them accepts a spawn that the pinned game then refuses at start-up.
- **SF2 and SF3.** Refreshes and refusals were only partly tested.

## Findings and the answer

The answer is in three commits after `c762e5c` on `claude/mutant-falsifiers`:
- **`651e5aa`**, the answer.
- **`b131fd4`**, a fix to one of the answer's own checks. At load, the bridge test compared the settings feedback with the status while both were empty, so a page that stopped mirroring the status passed (E23, measured).
- **`576c4c2`**, split browser messages. Under E07 the run failed with "Send is available with no host connected" while Send was disabled.

The author found both fixes before the formal runs, which were all made on `576c4c2`.

| ID | Finding (reviewer) | Answer |
| --- | --- | --- |
| **MF1** (must-fix) | **S3 was closed for the Send button, not for `window.nautilus`.** The page supplies the default export, the refresh and its own `hasGameAdapter` getter, and wires the members, but no test references `editor.js`. The Send button always passes the current export, so no gate ran the no-argument `sendToGame()` that the docs present as the API. Mutants that passed check, test (211/211), build and the browser acceptance:<br>- **E09** sends `sendToGame()` straight to the host;<br>- **E05** drops the export's call;<br>- **E10** ignores the map it is given;<br>- **E07** has the getter always return true.<br>*The author confirmed, by reading the tests, that none references `editor.js`. The acceptance calls `sendToGame` only through the Send button.* | **`tests/editor-host-bridge.test.mjs` runs the real `apps/editor/editor.js` with DOM and editor doubles,** as `building-library-lifecycle.test.mjs` runs `buildings.js`. It asserts every member of `window.nautilus`:<br>- the engine fields, `export()` with its loading check, and `open()`;<br>- the getter, and the Send buttons' state after each connect, disconnect and editor sync;<br>- both send paths for three incapable hosts and one capable host.<br>**The doubles follow the page's real load order, measured in the browser:** the Send button, the quick Send button and the settings heading already exist when the bridge runs.<br>**The browser acceptance also calls `sendToGame()` with and without a map.** The no-argument send hands the host the editor's current export byte for byte.<br>**The handoff module's comment is corrected.** |
| **SF1** | **The probe table tested one side of each axis.** Six clearance mutants survived:<br>- **C19** misreads vertical runs drawn backwards. It accepts a spawn 0.52 m from one, which the pinned Tinderbox then refuses at start-up with an uncoded error.<br>- **C20** signs the x term.<br>- **C23, C24 and C27** pad or mismatch the right and bottom bounds.<br>- **C18** drops the epsilon (float noise).<br>On 400 seeded random maps, 295 of which reached the clearance rule, C19 got 25 wrong, 10 of them false accepts. | **Seven probes, each checked against the pinned `freePoint` like the rest (22 in all):**<br>- a vertical run drawn backwards;<br>- a west-side pair at 0.52 m and 0.72 m;<br>- one start a tile inside each of the four bounds.<br>**C18 is left, as the reviewer advised.** The four natural exact-radius faces (map x 20.64 and 19.36, y 25.64 and 24.36) compute 0.5600000000000006 m, so the epsilon only matters for coordinates such as 20.639999999998 (measured). |
| **SF2** | **The state test counted refreshes but never read what they saw.** It also never refused a connect while a host was connected. G08 to G11 survived:<br>- **G09 and G10** refresh before the host changes;<br>- **G08** has a refused connect drop the host;<br>- **G11** loosens the adapter check. | **The state test records `hasGameAdapter` at each refresh and asserts the sequence.**<br>- A refused connect while a host is connected keeps that host, which the next send reaches, and refreshes nothing.<br>- Malformed adapters are asserted by their exact message, including a non-function `openMap`. |
| **SF3** | **The hardened waits failed fast only when a host was called.** E11 (`sendToGame` wired to `connectGame`), E06 (refresh not wired) and G09 still failed the browser job only by a 30 s timeout. | **Before each Send click, the acceptance asserts that the button is enabled.**<br>**After the click,** it waits up to 10 s for the status to change and leave "Sending map…". If it doesn't, it fails with the page's state. It then asserts the call count, and that the refusal names the missing feature, quoting the status.<br>**It also asserts:**<br>- Send is disabled and `hasGameAdapter` is false before the first connect and after the last disconnect;<br>- the settings feedback shows the status. |
| N1 | The new state test asserted `CompatibilityError` by class only. | It now asserts the code and the feature. |
| N2 | The save assertion's message said "deterministic" for a byte round trip. | The message is now "A loaded save serializes back to the same bytes". The round-2 record has an erratum. |
| N3 | The committed sweep record was taken on the uncommitted tree, and its browser figures had no recorded output. | **Both instruments now refuse a dirty tree and record HEAD and `git status`.** The sweeps and browser runs below ran on the committed answer, and their output is committed. The round-2 record has an erratum. |
| N4 | The disclosed behaviour change was wider than stated: `.call(other)` and a spread copy of `window.nautilus` now send the live editor document. | Recorded in the round-2 erratum. The reviewer judged it benign. |

## The answer, measured

Everything below ran in one clean sandbox at `576c4c2`.
- The sweep and the browser runner refuse a dirty tree, and record HEAD and `git status`, before and after.
- Both statuses were empty for both.
- Every mutated file was restored byte for byte, and the rebuilt `dist/app/editor.js` and `dist/app/game-handoff.js` match the commit.

**Mutation sweep** (`answer/round4-mut.json`). 82 mutants:
- the author's 53 from round 2's answer;
- round 3's 19;
- ten for the page bridge (E13–E23, no E19).

Each ran against the five touched test files first. Any survivor was re-run on the full suite. The pristine baseline passed 215/215 first. No run crashed or timed out.

| Group | Mutants | Killed | Survived |
| --- | --- | --- | --- |
| Rung 1's ten | 10 | 10 | 0 |
| Round 2's clearance (C01–C17) | 17 | 17 | 0 |
| Persistence (P00–P04) | 5 | 4 | P00, a neutral control that must survive |
| 32-building limit (B01–B05) | 5 | 5 | 0 |
| Handoff checks (H00–H07) | 8 | 7 | H00, a neutral control that must survive |
| Moved state (G01–G07) | 7 | 7 | 0 |
| Page bypass (E01) | 1 | 1 | 0. Round 2's answer could not kill it without a browser. |
| Round 3's clearance (C00, C18–C24, C27) | 9 | 7 | C00, a neutral control; C18, which is float noise (see SF1) |
| Round 3's state (G08–G11) | 4 | 4 | 0 |
| Round 3's glue (E05–E07, E09–E11) | 6 | 6 | 0 |
| Page bridge (E13–E18, E20–E23) | 10 | 9 | E16 (see below) |

**E16 is equivalent.** It has `open()` describe its raw input instead of the opened document. `describeBlueprint` opens its own input (`packages/map-core/index.js:29-30`), so the two descriptions always agree.

**Measured kills:**
- **E22** imports a module as a namespace. It is killed by the check that every import of the bridge is a named import the doubles cover.
- **E23** stops the settings feedback mirroring the status. It survived `651e5aa`'s bridge test and is killed by `b131fd4`'s.

**Browser mutants** (`answer/browser-mut4.json`). Each run is the build, then `review:integration` under the mutant, and then a restore. The time is how long after the last capture the failure was written: about 1 s means an assertion fired, and 30 s means a timeout.

| Mutant | Exit | After the last capture | The failure, quoted |
| --- | --- | --- | --- |
| E01 page bypass | 1 | 1.1 s | Versioned host missing roof support was called. |
| E05 export call dropped | 1 | 1.0 s | The host without roofs was not refused for roofs: … "Pass a map/block object or JSON string." |
| E06 refresh not wired | 1 | 0.8 s | Send is disabled with a host connected: … |
| E07 getter always true | 1 | 0.1 s | The page reports a host before any connected: … |
| E09 bypass on `sendToGame()` | 1 | 1.0 s | Versioned host missing roof support was called. |
| E10 argument ignored | 1 | 2.2 s | Declared asynchronous local host handoff failed: … (the third call got the current map, not the explicit one) |
| E11 `sendToGame` is `connectGame` | 1 | 0.9 s | The host without roofs was not refused for roofs: … "A game adapter needs openMap({json, contract})." |
| E12 bypass for feature lists only | 1 | 1.6 s | Unsupported host was called. |
| G09 refresh before the host is set | 1 | 0.8 s | Send is disabled with a host connected: … |
| G10 refresh before the host is cleared | 1 | 2.2 s | Send is still enabled after the host disconnected: … |
| G08 a refused connect drops the host | 0 | — | Passes. The page never makes a refused connect; the state test kills it. |
| G11 a looser adapter check | 0 | — | Passes. The page never connects a malformed adapter; the state test kills it. |

Round 3's runs of the same mutants:
- E05, E07, E09 and E10 passed every gate.
- E06, E11 and G09 ended in 30 s timeouts.

Every page-visible mutant now fails by assertion within 2.2 s of the last capture, and names its cause.

**Gates and browser acceptance on `576c4c2`:**
- `check --tracked`, `test` (215/215), `test:upstream` (32/32), `build` and `test:package` pass.
- In `review:integration`, the capable host gets three calls: the click, `sendToGame()` and an explicit map.
  - The first two receive the editor's current export byte for byte.
  - The third receives the explicit map.
- Both incapable hosts are refused through both paths, naming their missing feature.
- There are no page errors and no failed requests.
- All six captures are byte-identical to the committed record.

**Load order** (`answer/bridge-order.json`). When `app/editor.js` assigns `window.nautilus`, the editor, the status, the settings heading, Send and quick Send already exist. Afterwards Send is disabled, and its title is "Export JSON for a game, or connect a game adapter."

## Behaviour changes

None in the engine or the editor. The answer adds tests and browser assertions, and corrects a comment.

The acceptance record (`artifacts/engine-integration/acceptance.json`) has two changes:
- a new `handoff` field: the page's state and each refusal's text;
- `host.received`: what each of the capable host's three calls received.
