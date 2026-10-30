# Evidence: hostile review, round 1

These are the probes behind [the round-1 review](../../2026-10-28-hostile-review-round-1.md). They are review instruments, not engine code. Every one of them reads the engine through its public modules. None writes outside `artifacts/`, except the two mutation harnesses. Those edit one engine file at a time and restore it in a `finally`.

## Running them

1. Check out `12ad8c9` in a scratch worktree. `581258a` (main after PR #1) has the same tree.
2. Copy `probes/*` into that checkout's `artifacts/exp/`. The folder is gitignored, and the probes import `../../packages/...` from there.
3. Extract the consumers next to them with `git archive <sha> | tar -x -C <dir>`:

   | Directory | Repository | Commit |
   | --- | --- | --- |
   | `artifacts/exp/aftmain` | Syntaxswine/animal-factory-tactics-3d | `25d0e918` (origin/main at review time) |
   | `artifacts/exp/fymain` | Syntaxswine/farmyard-commando | `60aeeed` (origin/main) |
   | `artifacts/exp/tbdev` | Syntaxswine/tinderbox | `0891c55` (the development line Codex was working on) |

4. From the checkout root, run `node artifacts/exp/<probe>`. Some probes need extra input:
   - `verify-vendor.cjs` needs `AFT_REPO`, `FARMYARD_REPO` and `TINDERBOX_REPO` set to local donor clones.
   - `place-probe.mjs` and `survivors.mjs` take the checkout root as their first argument.

## Probe → finding

| Probe | Finding | What it shows |
| --- | --- | --- |
| `aft-exchange.mjs` | M1, S1 | The editor's export is accepted by AFT's `parseMap` at the pin and at main, with the Nautilus fields inert. Nautilus rejects a one-guard `bull` map with a guard-count message. |
| `farmyard-exchange.mjs` | M1 | Farmyard's `adaptAftSector` accepts the export and outputs no building, roof or wall. |
| `place-probe.mjs` | M3 | Run on each art branch's own tree, its buildings are unknown to `placeBuilding`. The control house places. |
| `probes.mjs` | S8, S9 | `duplicateCharacter` refuses layer 3; wall-preview cost on a settled map. Its part C ran at 12ad8c9 and cannot show M3; use `place-probe.mjs` for that. |
| `probes2.mjs` | S2 (M14), S4, S9 | Two opens give different character IDs when line 51 is mutated. Shows which unknown keys are accepted and which rejected, and the preview validation cost. |
| `mutate.mjs`, `mutation-results.json` | S2, S3 | 18 targeted mutants: 14 killed, 3 survived, and one (M16) caught only by a browser timeout. |
| `survivors.mjs` | S2 | Independent re-run of the three survivors after a green baseline. |
| `mutant-followups.mjs`, `clearance-probe.mjs` | S2 (M05), S3 | The surviving clearance mutant accepts a spawn 0.52 m from a wall face. The editor handoff mutant fails only by a 30 s timeout. |
| `limit-probe2.mjs` | S7 | A 3.8 MB map loads, but its pretty-printed export exceeds the 4,000,000-byte limit. |
| `perf-attrib.mjs` | S9 | Where preview and validation time goes. |
| `tinderbox-forward.mjs`, `tb-advance.mjs`, `tinderbox-editor-path.mjs` | Exchange table | The flat-yard adapter scene simulates identically on the pinned closure and on Tinderbox 0891c55. |
| `verify-vendor.cjs`, `closure.cjs` | What holds up | All 617 vendored files match their donor Git blobs; import closures from Git objects. |
| `scale-compare.mjs` | Objection rejected | The two `hybrid-geometry.js` copies derive the same native scale. |
