# Private stale-display Load correction

Use `mountSharedTileAuthoringUI` from this directory's `mount.mjs` instead of the
returned63f mount. Its options and collector selector are unchanged:
`button[data-action="load-selected-artwork"]` calls the optional borrowed
`resourceActions.loadSelected(actualIssuedRead)`. An unbound port stays disabled.

This sibling preserves every63f runtime file, receipt and failing-proof reference.
The original independently failed number0 → hidden blood-dried case is copied
byte-exact into `evidence/returned-63f/`, with origin/hash records. Root writes,
public exports, schemas, consumer pins and the normal editor are unchanged.

The same Root648 coordinator gets one private API member,
`captureResourceDisplay(displayed)`. It latches the actual displayed identity and
epoch and reuses Root's existing `read`, `sameView`, binding/action keys and full
additional-data comparison. It compares the whole snapshot and presentation too,
including resource references and selected-capture state. The guard refuses and
refreshes on unpublished drift.
Its final actual read follows pending, render, additional-source and currentness
callbacks. Existing Root parsing and command execution remain byte-identical;
`proposal/root-resource-display-guard.patch` is the reviewable API-only change.
Apply it alongside63f's separate three-edit opt-in mount patch for Root adoption.

The resource action latches its displayed read before callbacks. It obtains a
guard before pending UI begins, then checks it again after pending/render/current
callbacks and immediately before calling the borrowed loader. No callback runs
between the final data comparison and invocation. It passes the genuine final
binding-issued read; the parsed display is never cloned or retagged as permission.

Stable loads still call the resource owner once, with zero IDs, staged commands,
prepare calls or WAL writes from the UI. Resolved callback flags remain ignored.
Actual loading may legitimately publish new resource readiness; the existing
finally path refreshes that real state without replaying the resource action.
Root still owns d8 verification, native residency, RESOURCE work/debt and all
editing authority. Those actual bindings remain unbound in these protocol tests.

Both real panels use one controller/subscription and the same draft/history.
Pending resource UI cannot erase underlying debt. Default C1, independent detach,
same-session cancellation boundaries and borrowed ownership are unchanged.

For this authoring workflow, the display guard is the preferred behavior. Accuracy
means the activated artwork/source matches what was shown. Code inspection shows
a bounded extra read/compare per load, with no extra controller/subscription;
runtime or frame-rate savings are not claimed. Predictable explicit artwork
selection is the narrative/UI preference, a subjective judgment. No donor profile
or physical simulation policy changes.

Run `tools/pin.mjs` only to reproduce the recorded immutable derivations. Run
`tools/verify.mjs` for original63f protection, exact Root derivation, isolated patch
application and dependency closure (`--index` checks staged bytes). Focused Node
controls are `tests/resource-guard.test.mjs`; unchanged baseline22 are continued in
`tests/baseline.test.mjs`. `tools/browser-review.mjs` runs the original returned case
and drift/callback controls in actual Edge. `tools/baseline-browser-review.mjs`
reruns the original16 DOM controls and three viewport layouts on the fixed mount.
Each isolated browser/server has an actual three-minute expiry and finally cleanup;
no preview is retained. Root receives a fixed focused pin before broad gates.

This is a local review candidate. The four required repository gates are pending:
`npm run check`, `npm test`, `npm run test:upstream`, and `npm run build`. Root's
current retry owns broad execution; full gates remain required before approval,
adoption or final delivery. `tools/repository-checks.mjs` is prepared for a later
deliberate run and is not started for this focused handoff.
