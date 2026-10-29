# Hostile review, round 2 of 5: rung 1 (falsifiers for S2 and S3)

**Reviewed:** `fb8b26a`, the first cut of rung 1 of [round 1's fix order](2026-10-28-hostile-review-round-1.md). Rung 1 closes two round-1 findings:
- **S2:** three guards that could be disabled while all 203 tests still passed.
- **S3:** the editor's game handoff, which only a 30-second browser timeout caught.

**Method.** One hostile reviewer (Claude) worked in its own sandbox worktree. The author re-checked the must-fix finding, answered every finding, and re-ran the reviewer's own mutation instrument against the answer. Round 3 reviews the answer. Evidence is in [`evidence/hostile-review-round-2/`](evidence/hostile-review-round-2/README.md).

## Score: 6 / 10

**What held up (reviewer, measured):**
- All ten of the first cut's mutants died, each by exactly the test aimed at it.
- An 81-step old-versus-new behavioural diff of `window.nautilus` found 0 differences.
- The browser acceptance's six captures stayed byte-identical to the committed record.

**What didn't:**
- The editor's own glue could still skip the tested module.
- 25 plausible mutants survived. 21 were in the guards and their siblings, and 4 were in the editor glue.

## Findings and the answer

The answer is in the commit that follows `fb8b26a` on `claude/mutant-falsifiers`.

| ID | Finding (reviewer) | Answer |
| --- | --- | --- |
| **MF1** (must-fix) | `window.nautilus.sendToGame` in `editor.js` could skip the tested module. No headless test runs `editor.js`. With the page wired to bypass the checks (E01), check, test (208/208) and build passed. The browser job failed only through a 30 s `waitForFunction` timeout (73 s run), and its call-count assertion never ran. *The author confirmed by code-reading that no test or check imports `editor.js`.* | The connect/send state (connected host, default export, stale-disconnect rule) moved into `createGameHandoff` in `apps/editor/game-handoff.js`. `editor.js` only assigns its members, and a headless test covers the state. The browser acceptance's two waits now resolve as soon as a host is called, and the call count is asserted first. |
| **SF1** | One wall configuration tested, so 13 clearance mutants survived, each with a witness map it got wrong. Examples: corners (`hypot` replaced by `max` or a sum), off-centre and backwards-drawn walls, the near wall listed first, radius drift, three of the four bounds. | A 15-probe table. Each probe's expected verdict must match both the adapter and the pinned Tinderbox `freePoint` on the compiled obstacles. The adapter's radius is asserted equal to the pinned `DEFAULT_CONFIG.player.radius`. |
| **SF2** | The handoff's validation refusal was untested (H01 survived). A map whose exit is ringed by water reached a host that declared every feature. | That map is now refused for every host, with its validation message and 0 calls. |
| **SF3** | The 32-building limit was held at one entry point (`EditingDocument.open`) and for one catalogue. B04 and B05 survived. | Refusal is asserted for 32 versus 33 buildings through `openDocument`, `loadBlueprint`, `parseMap`, `validateMap`, `prefabErrors` and `requiredMapFeatures`, under both the Gross catalogue and `COMBINED_PREFAB_CATALOGUE`. |
| **SF4** | `parseSave`'s exit was untested (P01 survived): loading a save could mint identities. | The save round trip is asserted to equal the authored map, and loading one save twice is asserted deterministic. |
| N1 | `checkGameAdapter` was asserted by class only, and never with `null`. | The exact message is asserted for `null`, `undefined`, `{}`, a feature list without `openMap`, and a non-function `openMap`. |
| N2 | The host's `this` was not pinned (H02 survived). | The stub host records `this`, and the test asserts it is the host. |
| N3 | A silent host's partial default was undetected (H03 and H04 survived), and wall runs were never exercised. | The fixture now has a wall run, so it needs all four features. A host that declares nothing is refused on each single-feature map, naming that feature. |
| N4 | Two preconditions were weaker than their comments. | Each now asserts what its comment says: the editor normalizes the map and mints different identities, and the raw handoff input differs from the validated export. |
| N5 | The author's harness could not tell a crash or hang from a kill. | The proof below uses the reviewer's instrument, which reports CRASH and TIMEOUT separately. |

## The answer, measured

**Mutation sweep.** This is round 2's instrument and mutant list, plus seven mutants for the moved state (G01–G07) and the page-wiring bypass (E01).
- Each mutant ran against the touched test files first; any survivor there was re-run on the full suite.
- The pristine baseline passed 211/211 first, and every file was restored byte for byte.

| Group | Mutants | Killed | Survived |
| --- | --- | --- | --- |
| Rung 1's ten | 10 | 10 | 0 |
| Clearance (C01–C17) | 17 | 17 | 0 |
| Persistence (P00–P04) | 5 | 4 | P00, a neutral control that must survive |
| 32-building limit (B01–B05) | 5 | 5 | 0 |
| Handoff checks (H00–H07) | 8 | 7 | H00, a neutral control that must survive |
| Moved state (G01–G07; G01–G03 are round 2's E04, E03 and E02) | 7 | 7 | 0 |
| Page wiring (E01) | 1 | 0 | E01, which only the browser can see (below) |

All 21 of round 2's survivors in the guards now die. A further variant also dies: a send that keeps the missing-host check but skips the capability checks (G07b, a targeted run).

**MF1 in the browser.**
- With E01 wired into the page, the build passes.
- `review:integration` exits 1 in 41 s with **"Versioned host missing roof support was called."** That is the call-count assertion, raised 1 s after the last capture.
- Round 2's run of the same bypass took 73 s and ended in the timeout, 31 s after the last capture.
- `editor.js` was restored and the bundle rebuilt afterwards.

**Gates and browser acceptance:**
- `check --tracked`, `test` (211/211), `test:upstream` (32/32), `build` and `test:package` pass.
- In `review:integration`, the capable host is called once with 6 buildings, the roof-less versioned host is refused, and there are no page errors.
- All six captures are byte-identical to the committed record.

## Behaviour changes (judgment)

`sendToGame` now reads the default export through a closure (`() => window.nautilus.export()`) instead of `this`, so a detached `sendToGame()` call now works where it used to throw. The checks, the messages, their order and the host's view are unchanged. Round 3 is asked to confirm this against round 2's 81-step equivalence harness.
