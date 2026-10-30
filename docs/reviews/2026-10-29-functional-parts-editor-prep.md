# Functional editor preparation: checkpoint verification

Branch `codex/functional-parts-editor`, based on `78d37b6cd3ba5de5c25d4922b4ba301b13491caa`, runtime v0.8.0. Scope and API requests are recorded in [editor preparation](../intake/2026-10-29-functional-parts-editor.md); [grenade item/save requirements](../intake/2026-10-29-grenade-editor-seams.md) are a dependency report. No reviewed parts ABI, kit, UI binder or grenade extraction is adopted here.

| Check | Result |
| --- | --- |
| `node --test tests/part-authoring-journal.test.mjs tests/part-authoring-issues.test.mjs` | 10 passed; private preparation/journal and source-target projection only. |
| `npm run check -- --tracked` | Passed: 603 pinned source files, 344 editor assets, shared headless/dependency/source checks and 48 original buildings. |
| `npm test` | 367 passed, 0 failed/skipped. |
| `npm run test:upstream` | 32 passed, 0 failed/skipped. |
| `npm run build` | Passed: 384 module paths verified and own/adapted script syntax checked. |
| `git diff --cached --check` | Passed. |

Behavioral regressions exercise a deferred compilation resolving after newer accepted work; failed edits/import/undo retaining accepted text/compiled handle/redo; context changes invalidating pending work despite equal document revision; no-op versus accepted-open history semantics; combined history budgets across asymmetric undo/redo sizes; UTF-8 limits and rejected coercion; duplicate ticket acceptance; absent/stale issue tokens and exact part/property selection.

Test artifacts deliberately use compiler doubles and private opaque serialized values. They establish no public parts format or actual building behavior. The acceptance-intent fixture reads native building dimensions but supplies no hand-entered runtime geometry or door/stair records. Product UI is unchanged; these helpers are unmounted. Browser/visual proof, actual part commands/copy mapping, native authoring save round trips, consumer refusal and live-scene atomic swap remain acceptance work after the architect distributes fixed reviewed dependencies.

Local reproducible logs are in ignored `artifacts/functional-parts-editor-prep/{check,tests,upstream,build}.log`. No preview/browser helper was started for this headless preparation. Previous bear preview receipts already confirmed those owned process lifetimes exited and their port was released; none was restarted.
