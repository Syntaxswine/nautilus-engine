# Reviewed upstream intake

Weekly maintenance in this chat is scouting and recommendation. Follow [the scout/architect handoff](weekly-scouting.md): flag useful additions, explain the design choice, and send a concrete brief to **Architect, Nautilus Engine**. The architect decides what to adopt and subdivides accepted work among the appropriate existing coder, artist and UI helpers.

Use `upstream.json` and the current import manifests as the comparison baseline. Farmyard remains the UI reference; AFT remains the map/editor/generation reference; compatible new content can come from all three projects. The scout changes only its own reports/documentation on `codex/weekly-integrations`; runtime imports, manifest/pin changes, final integration and publication belong to accepted architect/worker assignments.

Character, skill and combat intake also follows `docs/rules.md` and the reviewed rules-source inventory linked by `upstream.json`. Compare formulas and behavior, including roll boundaries, saved streams, attempt receipts, timing and resource costs. Preserve consumer policies rather than assuming common terminology means identical mechanics. For assets, distinguish 2D/skins, animated movement and 3D models; preserve their compatibility bindings separately from gameplay stats.

Every material design difference also requires the [accuracy, efficiency and narrative assessment](design-evaluation.md). Name the preferred implementation for each relevant game/use case, explain the tradeoff, label evidence and uncertainty, and record adoption status. Keeping both profiles does not replace a recommendation. Use the [initial assessments](reviews/2026-10-28-design-tradeoffs.md) as a starting point and revisit them when a donor improves or measurements change the result. Tinderbox is the leading candidate for richer fire simulation; tactical games can prefer a simpler policy when fire serves a different role.

## Weekly report and handoff

Inspect reviewed donor changes, record useful candidates and compare the alternatives. Save a brief under `docs/intake/` with exact source commits/paths, compatibility and rights/dependency evidence, accuracy/efficiency/narrative recommendations, suggested worker responsibilities and acceptance checks. Commit/push the report branch and send one concise digest to the architect, explicitly asking the architect to subdivide accepted work among the appropriate existing helpers. Reconcile with earlier reports and architect decisions; do not repeat unchanged candidates.

## Implementation after architect selection

The following import procedure belongs to accepted architect/worker assignments, not the weekly scouting automation:

1. Inspect published integration changes since each recorded full commit. An active worker branch or uncommitted asset is a candidate, not an automatically approved source.
2. Select the concrete asset/system changes and examine their dependencies, dimensions, collision/anchor data, portable-format impact and notices. Record useful deferred work.
3. Re-run the importer against a full reviewed commit into a new snapshot, never by editing imported source files. The importer reads Git objects and leaves donor checkouts untouched. Its dry run is the default; `--write` creates the selected closure.
4. Update `upstream.json`, the public API's pinned imports and any required build adapters together. The build uses exact-match patches so upstream drift fails visibly.
5. Run integrity/closure checks, Nautilus behavior tests, the selected original regression suite and the static build. Browser-review changed editor flows and rendering. A dependency or behavior failure blocks delivery.
6. Record the source commits, imported/deferred changes, adaptations, check results and limitations in an intake record. Workers commit/push only their assigned changes. The architect reviews the combined candidate and owns final promotion/publication under the user's delivery authorization, preserving the private review audience.

Example import command, using a real source checkout and a deliberately selected full commit:

```sh
node tools/snapshot-source.mjs --donor aft --repo <read-only-checkout> --commit <full-reviewed-SHA>
# Review the dry-run closure before repeating with --write.
```

The main importer covers AFT editor dependencies and the selected Farmyard material set. `tools/snapshot-search-halo.mjs --repo <read-only-checkout> --commit <full-reviewed-SHA>` separately archives the reviewed halo renderer/tests/guide and verifies its explicit dependency resolutions; `--write` creates its immutable snapshot. Halo source/test files are reference evidence; only the engine-owned extraction is executable. New source categories need an explicit importer extension and provenance evidence. New snapshots do not remove older snapshots while the public API or consumers still depend on them. The supplemental `--donor aft-assets` importer archives the three dynamically named machine paint atlases for the current AFT pin; full new AFT imports include those paints. The [editor asset contract](editor-assets.md) covers catalog, preview and placement checks.

The Sites source Git service currently limits each push to 64 MiB. Large initial imports need bounded cumulative import commits before the final complete source is synchronized. Preserve the GitHub history with a content-identical merge when reconciling that upload chain; never force-push. Partial upload commits are preparation, not reviewed releases or deployments.

Do not change donor games, consumer version pins, unrelated worker branches or source hosting settings during intake. Keep unchanged/nonactionable weekly runs quiet. Report meaningful imports, useful new candidates, failed checks, compatibility decisions or required user action. Stop task-owned disposable helpers after review and preserve their restart records.
