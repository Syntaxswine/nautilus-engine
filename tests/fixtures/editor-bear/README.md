# Bear editor intake fixtures

These reproduce the released v0.8.0 seam while the reviewed shared provider and appearance contract are pending. They do not define that future contract or enable runtime placement.

- `comparison-cow.block.json` is an ordinary valid block with two authored comparison characters: a regular Guard and a Red Hat NPC. Stable character IDs, roles, headings, equipment, names, script IDs and an internal relationship are explicit.
- `unsupported-v0.8-bear.block.json` changes those species to `bear`. This is **intentionally invalid legacy input**, not an engine-supported bear save. The pinned nine-species validator must reject it without changing or substituting its records.
- `acceptance-intent.json` records both outfits across the thirteen existing equipment IDs and native clearance references. It is test intent, not a portable appearance schema.

Reproduce with `node tools/generate-editor-bear-fixture.mjs` and `node --test tests/editor-bear-intake.test.mjs`. Replace the temporary public-v0.8 refusal assertion with positive appearance-extension authoring acceptance once the architect distributes Coder's full reviewed checkpoint. Preserve the original legacy validator and these negative inputs.
