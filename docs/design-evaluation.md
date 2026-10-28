# Choosing shared designs

The user's comparison criteria are **accuracy, efficiency and narrative**. Every material difference found between donor systems needs an explicit recommendation and reasons under these three headings. Keeping compatible profiles preserves behavior; the review must also say which design Nautilus should favor, for which game or use case, and why.

| Criterion | Meaning | Evidence to record |
| --- | --- | --- |
| Accuracy | How true to life the behavior is | Causes and quantities represented; important omissions; calibration or comparison with observations; intentional abstractions |
| Efficiency | How processor friendly the system is | Update frequency, workload scaling, expensive queries, allocations and memory; relevant CPU measurements when available |
| Narrative | How well the behavior serves the particular game's story, appearance and experience | Readable cause and effect, meaningful consequences, drama, visual quality and the game's central activities; label subjective judgments |

Probability calibration and deterministic replay support correctness, but neither alone establishes real-world accuracy. A D20 does not inherently represent gunfire better than a percentage draw. Likewise, a detailed fuel/heat system needs physical validation before claiming scientific accuracy. Extra detail is valuable when it represents relevant causes and produces useful behavior.

Efficiency claims must distinguish **measured results**, **estimates from code inspection** and **untested proposals**. A count of random draws is evidence about a small part of a system, not a frame-rate benchmark. Compare representative scenes and workloads before claiming a practical CPU or memory improvement. Record runtime/device, scene size, update rate and measurement method with any numbers. Keep simulation cost distinct from rendering cost.

Narrative is game specific and partly subjective. State the intended experience and explain the preference. Visual claims need a comparable visual review; a richer simulation does not automatically produce better-looking fire. A deliberately simplified system can be the better choice when it keeps tactical decisions clear and gives the game more CPU budget for its central activities.

## Decision record

For each material difference, record:

1. **Alternatives and context:** subsystem, source commits/paths, affected games, and the behavior that matters.
2. **Accuracy:** relative strengths, abstractions and what physical evidence is missing.
3. **Efficiency:** expected scaling/update cost, measurements or an explicit unmeasured label.
4. **Narrative:** story, appearance and player-experience consequences for the named game; identify subjective preferences.
5. **Recommendation:** preferred shared foundation or preferred option per game, the decisive tradeoff, and any useful exception. If evidence is incomplete, give a provisional preference and the observation needed to settle it.
6. **Adoption status:** recommended, implemented, deferred or compatibility-only; migration, save and balance implications; relevant validation.

Do not collapse the criteria into an invented numerical score or assume one implementation wins everywhere. Explain the tradeoff in plain language. Preserving both implementations is a compatibility decision, not a substitute for recommending one. A recommendation does not itself migrate donor games or change an existing consumer's rules.

## Shared engine and different levels of detail

Favor shared material/content identifiers, simulation/presentation boundaries and useful event contracts. Permit different simulation detail when the games need it. Tinderbox should be the leading donor for richer fire behavior because manipulating fire is central to its intended play; tactical games may favor a cheaper fire policy with clear ignition, danger and burnout consequences. More detailed fire can remain an optional subsystem rather than a mandatory cost for every game.

Simplifications must be stated explicitly. A tactical burn-duration counter should not be presented as a measured temperature or fuel quantity. Richer capabilities can be optional, and unsupported data must remain explicit at adapter boundaries. Profile changes need compatibility and outcome checks, particularly for saved seeds, damage timing and existing authored content.

The [initial design assessments](reviews/2026-10-28-design-tradeoffs.md) apply this standard to the existing rules foundation. Weekly intake must use this format for new differences and revisit recommendations when source improvements, measurements or game direction change the tradeoff.
