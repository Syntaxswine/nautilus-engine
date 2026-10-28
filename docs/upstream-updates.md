# Reviewed upstream intake

Weekly maintenance belongs to this Nautilus chat. Use `upstream.json` and the current import manifests as the comparison baseline. Farmyard remains the UI reference; AFT remains the map/editor/generation reference; compatible new content can come from all three projects.

Character, skill and combat intake also follows `docs/rules.md` and the reviewed rules-source inventory linked by `upstream.json`. Compare formulas and behavior, including roll boundaries, saved streams, attempt receipts, timing and resource costs. Preserve consumer policies rather than assuming common terminology means identical mechanics. For assets, distinguish 2D/skins, animated movement and 3D models; preserve their compatibility bindings separately from gameplay stats.

1. Inspect published integration changes since each recorded full commit. An active worker branch or uncommitted asset is a candidate, not an automatically approved source.
2. Select the concrete asset/system changes and examine their dependencies, dimensions, collision/anchor data, portable-format impact and notices. Record useful deferred work.
3. Re-run the importer against a full reviewed commit into a new snapshot, never by editing imported source files. The importer reads Git objects and leaves donor checkouts untouched. Its dry run is the default; `--write` creates the selected closure.
4. Update `upstream.json`, the public API's pinned imports and any required build adapters together. The build uses exact-match patches so upstream drift fails visibly.
5. Run integrity/closure checks, Nautilus behavior tests, the selected original regression suite and the static build. Browser-review changed editor flows and rendering. A dependency or behavior failure blocks delivery.
6. Record the source commits, imported/deferred changes, adaptations, check results and limitations in an intake record. Commit only Nautilus changes and push the configured GitHub branch. Publish the verified private review build, retaining its existing audience.

Example import command, using a real source checkout and a deliberately selected full commit:

```sh
node tools/snapshot-source.mjs --donor aft --repo <read-only-checkout> --commit <full-reviewed-SHA>
# Review the dry-run closure before repeating with --write.
```

The current importer covers AFT editor dependencies and the selected Farmyard material set. New source categories need an explicit importer extension and provenance evidence. New snapshots do not remove older snapshots while the public API or consumers still depend on them.

The Sites source Git service currently limits each push to 64 MiB. Large initial imports need bounded cumulative import commits before the final complete source is synchronized. Preserve the GitHub history with a content-identical merge when reconciling that upload chain; never force-push. Partial upload commits are preparation, not reviewed releases or deployments.

Do not change donor games, consumer version pins, unrelated worker branches or source hosting settings during intake. Keep unchanged/nonactionable weekly runs quiet. Report meaningful imports, useful new candidates, failed checks, compatibility decisions or required user action. Stop task-owned disposable helpers after review and preserve their restart records.
