# Nautilus Engine

Nautilus is the shared foundation for Animal Factory Tactics 3D, Farmyard Commando and Tinderbox. The first milestone is map authoring. Farmyard supplies the UI direction; AFT supplies the map editor, portable map/block formats and procedural generation architecture.

For every material difference between donor designs, follow `docs/design-evaluation.md`: assess accuracy (true to life), efficiency (processor cost), and narrative (game-specific story, appearance and experience). State which option is better for the named use case and why; give a provisional recommendation when evidence is incomplete. Distinguish measurements, code-based estimates and subjective judgments. Preserve profiles for compatibility while making the preference explicit. A richer model is appropriate where the game's nature calls for it, such as Tinderbox's fire; simpler policies can be preferable elsewhere. Apply this standard in weekly intake and revisit recommendations as evidence changes.

Weekly integrations follow `docs/weekly-scouting.md`. The weekly role is to investigate, flag useful additions, compare them under the three design criteria and hand a concrete report to **Architect, Nautilus Engine**. The architect prioritizes accepted work, subdivides it among the appropriate existing coder, artist and UI helpers, and owns review/integration. Weekly scouting changes only its own reports/documentation; it does not implement imports, change runtime/pins, edit other worktrees, merge main or publish. Avoid duplicate handoffs and keep unchanged weeks quiet.

## Builder ownership and finished-work review

- Give each assignment one accountable builder, a bounded outcome, clear interfaces/file ownership and acceptance criteria. Share the relevant starting commit and concise context.
- Trust builders to choose implementation details, debug and run focused checks independently. Invite them to ask the architect for clarification or feedback whenever needed. Raise shared-interface conflicts and blockers early; continue unrelated work while awaiting an answer. Routine choices within the agreed scope need no additional approval.
- The architect resolves shared decisions and unblocks builders. Review a finished commit or concrete deliverable with a concise change summary, validation evidence and remaining limitations. Assess behavior and integration; accept sound approaches even when another implementation would also work.
- Return specific defects with reproducible evidence and the expected result, leaving the correction to the builder. Further review rounds should address concrete failures or material unresolved risks. Keep optional improvements as follow-up work.
- Keep assignments and reports compact, parallelize clearly independent work, and avoid duplicate investigation or verification of unchanged work. Prove a narrow complete workflow early. Required delivery checks and source/provenance rules below still apply.

### One-month trial and revision option

Trial starts **2026-11-03**; review is due **2026-12-03**. At the next active project session on or after that date, assess completed outcomes, integration defects, rework, clarification delays and available usage evidence. Record a brief decision here to retain, revise or roll back this agreement. Do not invent per-agent usage figures when only account totals are available.

Keep this policy change in its own commit so it can be reverted independently. A rollback removes this trial section and its agreement while preserving other instructions and subsequent unrelated edits. The agreement remains in effect until the review decision; the review occurs during project work rather than requiring a background agent.

## Integration and delivery

Treat all three donor repositories and worker checkouts as read-only. Read `docs/architecture.md` and `upstream.json`. Never import uncommitted files or a moving worker branch. Use full reviewed commits, preserve source hashes and notices, and keep original upstream bytes in `vendor/` distinct from Nautilus adapters. The importer reads Git objects; it must not change donor worktrees. New imports need a deliberate pin, dependency closure, meaningful checks and visual review.

`packages/map-core` and `packages/rules-core` must load in Node without DOM, storage or a renderer. Read `docs/rules.md` and its source review before changing character, skill or combat rules. Preserve explicit roll profiles, saved random streams, transactional costs and the distinction between a roll and a confirmed impact. Portable character loads must not normalize damage or refill resources. Keep cast, content, turns, clocks, inventory and world geometry behind consumer adapters.

Preserve the inherited portable map/block formats. Editor storage is Nautilus-specific. A game adapter must reject unsupported map features explicitly rather than silently dropping geometry, actors or properties. Do not claim that a game is integrated just because its profile appears in the editor.

Run `npm run check`, `npm test`, `npm run test:upstream`, and `npm run build` before delivery. Review browser edits, undo/redo, saves, import/export and generation when affected. Commit only this task's files, push the configured GitHub remote after checks pass, and verify any deployment. Do not update consumer pins or other games as a side effect. Preserve the private Sites audience. Follow the user's helper lifecycle policy and stop disposable preview servers after review.
