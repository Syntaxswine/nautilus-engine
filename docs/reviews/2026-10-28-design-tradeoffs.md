# Initial design recommendations

These assessments apply the user's [accuracy, efficiency and narrative criteria](../design-evaluation.md) to the first rules review. They are recommendations, not new runtime defaults or consumer migrations. Efficiency observations below come from code inspection; no CPU benchmark or matched visual comparison was performed for this review. Narrative preferences are design judgments.

The [rules source inventory](2026-10-28-rules-sources.json) records the reviewed integration commits. AFT comparisons below use Nautilus's immutable `781246a668c723d5a4c5463e70534cc04b6a5641` import; Farmyard and Tinderbox use the integration commits in that inventory. Additional fire and trajectory sources were read from pinned Git objects, without fetching or changing donor worktrees. Source links below identify those exact revisions.

## Percentage attacks and AFT's D20 attacks

**Accuracy:** Neither roll mechanism has an intrinsic realism advantage. Under the intended uniform-draw model, AFT's hit probability is `0.05 + 0.90 × ((chance − 5) / 90)`, which equals the same `chance / 100` targeted by Farmyard's percentage comparison. The 5…95 band and critical rules are game abstractions. Muzzle position, angular spread, obstruction and actual impacts are the more relevant fidelity questions. AFT's separate trajectory model represents those geometric causes, but this review does not establish empirical ballistic accuracy.

**Efficiency:** Prefer Farmyard's percentage kernel for a plain hit decision. It uses one random draw and comparison; AFT's kernel uses two draws plus the D20/ordinary branch. Both are constant work per shot. This establishes fewer operations, not a measured frame-rate advantage. Trajectory and collision queries must be assessed separately; AFT's miss adjustment can add a bounded 16-step silhouette search when required.

**Narrative:** AFT is more useful when exceptional rolls affect the story or presentation. Its natural-one result feeds a conspicuously wild miss, and its trajectory can report incidental impacts. Those consequences can support memorable tactical accidents. Farmyard's simple roll is preferable when the game only needs a legible success/failure decision. The D20 label alone adds little if a consumer discards its consequences.

**Recommendation:** Favor Farmyard's direct percentage approach as the general-purpose hit-decision foundation for new consumers. Favor AFT's richer roll/trajectory combination for tactical scenes that deliberately use its dramatic misses and collateral consequences. Evaluate the geometric model separately from the die. Both explicit profiles remain implemented for compatibility; no existing game or API default changes in this documentation update.

Evidence: [AFT roll and scatter](https://github.com/Syntaxswine/animal-factory-tactics-3d/blob/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/helicoid-shot.js), [AFT trajectory and silhouette checks](https://github.com/Syntaxswine/animal-factory-tactics-3d/blob/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/ballistic-shot.js), [Farmyard live attack adapter](https://github.com/Syntaxswine/farmyard-commando/blob/fb386a5888d12b6bad409b657e92b3e4cc25eb28/sites/tactical-animal/dist/solo-game.js).

## Detailed fire and tactical burn counters

**Accuracy:** Tinderbox is the stronger starting point for causal fire simulation. Its field tracks deposited and surface fuel, heat, material-specific ignition thresholds, propagation delay, cooling and fuel consumption. AFT/Farmyard's tactical policy instead uses fire cells and burn/panic turn counters. Tinderbox's prototype heat and tuning values have not been established as calibrated physical measurements, so greater causal detail is a relative advantage rather than proof of scientific accuracy.

**Efficiency:** The tactical policy is the cheaper starting point when only burn duration and danger matter: update the fire/unit lists on simulation turns, with additional movement/collision work for panic. Tinderbox scans its grid each fixed step, considers up to eight neighbors per burning cell, performs obstruction queries and copies cell data for snapshots. Cost depends on grid size, burning area, obstacle queries and snapshot frequency. No comparable-scene CPU measurement was taken; do not claim a fixed speed ratio. Active-region updates or reduced snapshot copying are optimization candidates requiring outcome/replay checks.

**Narrative:** Prefer Tinderbox's richer behavior for Tinderbox. A fuel trail igniting, an approaching fire front and eventual burnout make the player's actions matter over time; that is central to the game's intended experience. Prefer simpler, clearly signaled fire for a tactical encounter when its role is area denial, panic or urgency. Appearance remains a separate visual-review question: the best material/effect art can be shared across different simulation detail.

**Recommendation:** Make Tinderbox the leading donor for a future detailed fire subsystem. Keep a cheaper tactical fire policy available for AFT/Farmyard unless their own design calls for fuel/heat interaction. Share useful content identifiers and ignition/burnout/presentation contracts while making richer physical state optional. This fire subsystem has not been imported into Nautilus yet.

Evidence: [Tinderbox heat/fuel field](https://github.com/Syntaxswine/tinderbox/blob/8a8405681614662a92f9b98fb9b9600bd06d3ad1/src/simulation/field.js), [prototype tuning and fixed step](https://github.com/Syntaxswine/tinderbox/blob/8a8405681614662a92f9b98fb9b9600bd06d3ad1/src/simulation/config.js), [AFT burn policy](https://github.com/Syntaxswine/animal-factory-tactics-3d/blob/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/core/engine.js), [Farmyard burn/panic adapter](https://github.com/Syntaxswine/farmyard-commando/blob/fb386a5888d12b6bad409b657e92b3e4cc25eb28/sites/tactical-animal/dist/solo-fire.js).

## Route-specific climbing and an ordinary skill check

**Accuracy:** Prefer AFT's climbing-specific model for consequential traversal. It represents route difficulty, fatigue, injury, load and rust; an ordinary skill/difficulty comparison omits those causes unless a caller rebuilds them as modifiers. Its thresholds and critical-failure rate remain balance choices without physical calibration.

**Efficiency:** A generic check has a smaller calculation. AFT's preview also sums carried weight, so repeated pathfinding previews can repeat inventory work. Cache derived load/penalties against an explicit unit/inventory revision if profiling identifies that cost; preserve invalidation and outcomes. Neither option has been benchmarked here.

**Narrative:** Different risks for a safe ladder, rusty ladder and exposed wall can make exhaustion and preparation meaningful. A plain check suits an abstract story interaction with no simulated traversal. Routine safe movement should remain fluid; the existing 100% climb path already avoids a random draw.

**Recommendation:** Favor AFT's route-aware design for world traversal and the ordinary percentile interface for abstract skill choices. Keep the distinct adapters and saved streams. The original climbing compatibility API is implemented; a portable route/character adapter remains future work.

Evidence: [AFT climbing rules](https://github.com/Syntaxswine/animal-factory-tactics-3d/blob/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/climbing.js), [existing percentile checks](https://github.com/Syntaxswine/animal-factory-tactics-3d/blob/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/dialogue-state.js).

## Per-hit resistance and continuous exposure damage

**Accuracy:** A fixed endurance reduction per hit is an RPG abstraction, not a calibrated model of protection or tissue injury. Tinderbox's time-scaled exposure is a better structural fit for ongoing heat damage, although its HP conversion still needs game tuning. Applying a fixed per-hit reduction on every small time step could erase exposure damage or make the result depend on tick size.

**Efficiency:** Both arithmetic operations are cheap. The important cost difference is when damage/exposure queries run and how many actors/cells they inspect. There is no measured efficiency winner for the complete damage pipelines in this review.

**Narrative:** Per-hit resistance supports visible RPG toughness and tactical progression. Accumulating exposure supports the urgency of escaping a fire front. A single inherited resistance rule should not accidentally make a continuous-fire game immune to small damage increments.

**Recommendation:** Retain endurance resistance for existing tactical balance, and prefer time-based exposure with an explicit damage policy for Tinderbox. Any future physical damage refinement should distinguish the damage cause and protection model. Nautilus already permits `resistance:'none'`; the consuming game owns time integration and casualty consequences.

Evidence: [shared tactical stat/resistance formulas](https://github.com/Syntaxswine/animal-factory-tactics-3d/blob/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/character-stats.js), [Tinderbox damage and clocks](https://github.com/Syntaxswine/tinderbox/blob/8a8405681614662a92f9b98fb9b9600bd06d3ad1/src/simulation/index.js).

## Shared character math, committed checks and presentation boundaries

**Accuracy:** The canonical 14-stat sheet is a consistent gameplay model, not a validated physical or psychological measurement. Prefer it over parallel legacy stat formulas for a shared schema, while documenting its abstractions. Pure previews, committed receipts and simulation-owned outcomes improve consistency and auditability; they do not by themselves improve physical fidelity.

**Efficiency:** Derive sheet values when stats change and project UI when needed. Keep simulation decisions out of drawing callbacks. Committed copies/receipts add allocation and validation cost, so use them at meaningful action/persistence boundaries. Tinderbox's full grid snapshots illustrate why a clean boundary still needs workload review. These are structural recommendations without measured CPU results.

**Narrative:** Canonical stats support recognizable specialties; game-specific cast and species profiles preserve identity. Committed dialogue attempts preserve consequences across reopening a conversation. Prefer a light check without an attempt ledger for a repeatable action that the game intentionally allows. Consistent simulation/events also help the displayed consequence match what happened.

**Recommendation:** Favor the shared 14-stat schema, AFT's committed dialogue flow for consequential choices, and simulation/presentation separation informed by Tinderbox and Farmyard's injected interaction dependencies. Favor fixed simulation time for continuous systems and an explicit AP/turn policy for tactical decisions. Those schedules serve different experiences. The headless boundaries are implemented; a universal encounter scheduler and replacement character-sheet UI are deferred.

Evidence: the [original three-game comparison and source inventory](2026-10-28-rules-foundation.md). These recommendations also explain the already-selected shared sheet projection, transactional costs and separation of attack rolls from confirmed impacts.
