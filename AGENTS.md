# Nautilus Engine

Nautilus is the shared foundation for Animal Factory Tactics 3D, Farmyard Commando and Tinderbox. The first milestone is map authoring. Farmyard supplies the UI direction; AFT supplies the map editor, portable map/block formats and procedural generation architecture.

Treat all three donor repositories and worker checkouts as read-only. Read `docs/architecture.md` and `upstream.json`. Never import uncommitted files or a moving worker branch. Use full reviewed commits, preserve source hashes and notices, and keep original upstream bytes in `vendor/` distinct from Nautilus adapters. The importer reads Git objects; it must not change donor worktrees. New imports need a deliberate pin, dependency closure, meaningful checks and visual review.

`packages/map-core` must load in Node without DOM, storage or a renderer. Preserve the inherited portable map/block formats. Editor storage is Nautilus-specific. A game adapter must reject unsupported map features explicitly rather than silently dropping geometry, actors or properties. Do not claim that a game is integrated just because its profile appears in the editor.

Run `npm run check`, `npm test`, `npm run test:upstream`, and `npm run build` before delivery. Review browser edits, undo/redo, saves, import/export and generation when affected. Commit only this task's files, push the configured GitHub remote after checks pass, and verify any deployment. Do not update consumer pins or other games as a side effect. Preserve the private Sites audience. Follow the user's helper lifecycle policy and stop disposable preview servers after review.
