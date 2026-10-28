# Character, skill and combat throughlines

The user asked Nautilus to refine its coding architecture around the shared character sheets, skills, RPG combat and checks. This review selects an initial reusable rules boundary and implements it without changing the three growing donor games.

## Evidence

Reviewed locally observed integration commits, by reading Git objects rather than worker files:

| Game | Reviewed commit | Relevant implementation |
| --- | --- | --- |
| Animal Factory Tactics 3D | `d3b0ccc8660c6c824b0f45dff1c7b29f2321e091` | `dist/tactics/character-stats.js`, `character-screen.js`, `core/engine.js`, `dialogue-state.js`, `climbing.js`, `helicoid-shot.js` |
| Farmyard Commando | `fb386a5888d12b6bad409b657e92b3e4cc25eb28` | `sites/tactical-animal/dist/solo-game.js`, `interactions.js`, `aft/tactics/character-stats.js`, `app.js` |
| Tinderbox | `8a8405681614662a92f9b98fb9b9600bd06d3ad1` | `src/simulation/index.js`, `config.js`, `tests/simulation/model.test.js`, `docs/architecture.md` |

No remote fetch was performed. Full source paths, byte counts and SHA-256 hashes are in [the inventory](2026-10-28-rules-sources.json). AFT and Farmyard's stat source differs only in line endings; the normalized hashes match. Relevant reused AFT algorithms already exist in Nautilus's immutable `781246a668c723d5a4c5463e70534cc04b6a5641` snapshot. Nine reviewed files also match existing imported bytes exactly. The map/render import pins remain unchanged.

## Findings and choices

The user subsequently established accuracy (true to life), efficiency (processor cost) and narrative (game-specific story, appearance and experience) as the comparison metrics. [The explicit assessments and recommendations](2026-10-28-design-tradeoffs.md) supplement these original findings and explain which design is preferred for each use case. Profile preservation alone is insufficient as a selection rationale.

- The 14-stat system is active in AFT's stat-enabled runtime and Farmyard's solo game. Resource/accuracy/resistance formulas and one-point training are a strong shared foundation. Named mercenary defaults, guard defaults and legacy species progression belong to content profiles rather than the engine's neutral character constructor.
- AFT's existing dossier has useful labelled stats/resource projection, but `character-screen.js` also imports inventory operations, combat queries, art and DOM construction. Nautilus extracts the data projection into a pure function and leaves the existing UI in place. Farmyard remains the presentation direction for a future shared sheet UI.
- AFT dialogue has the strongest committed-check design: minimum/chance gates, bounded modifiers, preview tokens, saved random state, pinned content, one-attempt receipts and replay validation. Nautilus retains that full boundary and exposes a smaller preview/resolve API for individual checks.
- Combat probabilities differ. AFT aimed firearms use its D20/ordinary-accuracy model; Farmyard uses direct percentages. AFT climbing has its own route, fatigue/load, critical-failure and saved-stream logic. Nautilus exposes explicit profiles and preserves original climbing helpers rather than silently replacing one policy with another.
- Both tactical games compute previews before spending resources. Farmyard's interaction factory accepts simulation dependencies, which supports reuse without putting game rules in UI handlers. Nautilus validates AP and stamina together and returns data/events; host permissions and world modifiers are explicit.
- Tinderbox has direct HP damage, fixed simulation ticks, separate player/world clocks, command ordering, snapshots and events. Its frame-rate replay tests substantiate that architecture. It does not yet contain the same RPG sheet or turn/AP economy. Nautilus adopts the boundary; fire, drugs and clock tuning stay with Tinderbox.
- A roll succeeding and a projectile hitting are different outcomes in AFT and newer Farmyard impact handling. The shared attack resolver spends accepted costs and reports the roll; confirmed impact is a separate raw-damage operation.

## Delivered scope and verification

`packages/rules-core` provides a versioned portable character, labelled sheet projection, existing derived formulas, training, saved-seed checks, full dialogue staging, explicit shot profiles, atomic AP/stamina costs and confirmed-impact damage. Compatibility exports preserve the original AFT climbing/injury shapes. `docs/rules.md` specifies APIs and consumer responsibilities.

The new boundary tests cover strict save loading, zero-resource preservation, training without healing/refill, probability boundaries, deterministic replay, stale dialogue previews, repeated attempts, tampered receipts, critical bands, blocked-action costs and RNG, separate climb RNG, and resistance application. Run the complete repository check, tests, original editor regressions and build before delivery. Validation results are recorded after the final run below.

Validation: integrity/closure and source-evidence checks passed; all 23 Nautilus tests and all 32 original editor regressions passed; the 0.2 static build succeeded. The built rules module also imported headlessly, and HTTP checks returned 200 for the workshop, rules entry, rules documentation and source inventory. Browser DOM inspection confirmed v0.2.0, the example map and normal editor status with no warning/error console entries. A screenshot could not be captured because the app browser reported a zero-width/zero-height viewport, even with its visibility enabled. No editor layout or rendering logic was changed in this milestone. The task-owned preview exited normally and port 4517 was verified released.

No consumer was migrated. No worker branch, donor worktree, game save or existing map schema was changed. Shared inventory/effects, an encounter scheduler, general content registries and a shared character-sheet UI remain future work.
