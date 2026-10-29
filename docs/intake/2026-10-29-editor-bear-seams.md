# Editor bear intake: v0.8 seam and prepared acceptance

Task branch: `codex/editor-bear`, from runtime `8c4670450cb2b38c1e1abd811d633c22de9e2b7c` / v0.8.0. Intake proposal read from committed `1115871def96e8a9e5ddc239bf4ad5a5a7ff9829`. Bear source reviewed read-only through Git objects at AFT `4f5f53917990ec03b2f14c65f067e4b99ec8fcaa`. No new provider, resource import or appearance representation has been adopted here. Coder owns those shared boundaries; the architect must distribute a fixed reviewed checkpoint before integration.

## Concrete failure and authored intent

Generate with `node tools/generate-editor-bear-fixture.mjs`, then run `node --test tests/editor-bear-intake.test.mjs`. [The fixtures](../../tests/fixtures/editor-bear/README.md) contain a valid comparison block with a regular Cow Guard and Red Hat Cow NPC, plus an **intentionally unsupported legacy bear block** with the same authored character IDs, names, script IDs, relationship, categories, headings, outfits and weapons. That bear input is not a proposed save schema or a supported current document.

The current standard command `{tool:'guard',start:{x:5,y:5,z:0},options:{species:'bear',weapon:'rifle',outfit:'normal',heading:90}}` rejects with `Use at most 46 guards (50 characters including the squad).` The NPC equivalent also rejects. The reason is the species allowlist, not population. Failed preview/apply/import preserve the current document, changed/revision flags and redo stack in the focused reproduction.

The immutable source accepts nine species; the renderer registers twelve and the library disables bull/rabbit/dog placement. Adding bear to the catalogue cannot resolve that mismatch. `acceptance-intent.json` defines 26 outfit/equipment combinations and eight headings using existing identities. Clearance references remain native: 2 m walls, 0.12 m slabs, 2.12 m floors, 1 × 1.65 m door aperture. Reserved tiles are not body/equipment clearance evidence.

## Contract questions for the fixed Coder checkpoint

1. Which exact engine-owned representation and capability preserve `bear`, `normal` / `red-hats`, equipment, heading, Guard/NPC category and the complete authored character record? The immutable nine-species validator must remain unchanged. Please provide the positive/golden saved form and the unsupported-consumer error shape.
2. Does the standard public document facade accept the guard/NPC commands above and route `open`, preview/apply, character editing, rotation, undo/redo, export, block capture/rotation/placement and connected generation through that representation? If a different facade or command is required, provide its exact frozen entry. The editor must not substitute another saved species or discard appearance data.
3. What is the supported renderer projection for `InspectionDocument.units` and character selection? Its current loader resolves only `unit.species` in the old registry; character properties also populate species/model choices from the old list. Stable character IDs must survive projection and editing.
4. What are the exact lazy provider/resource, per-instance create/pose/time, bounds, optional-family capability and disposal entry points? The preview and map scene will supply the existing Three namespace and renderer. They need independently owned instances, reliable retries, cancellation/late completion cleanup and native-scale bounds.
5. Which unsupported consumer paths negotiate the new required appearance capability, including bounded Tinderbox and legacy map/block adapters? UI handoff must reject before invoking an incompatible game, while preserving the open map and history.

These questions identify needed seams, not proposed names for shared APIs. The earlier furniture/window and native-height branches are preserved separately.

The [proposed builder handoff](../components/bear-authoring.md), discoverable in the [separate guide index](../components/index.md), applies documentation standard `1c2b94c0cf0c86947c4e5f3da78c7d2d8404ea66`. It records current public baseline/refusal code and the exact pending placement/save/block checklist. Once the reviewed `people:bear` descriptor exists, its metadata must link that maintained guide and replace the pending entries with actual public API/schema/capability identities. The guide index does not add fields to executable manifests or enable bear content.

## Editor work prepared independently

`apps/editor/asset-appearance.js` exposes editor metadata without native controls or a renderer. It derives the thirteen equipment IDs from the existing pinned registry, preserves the two ordinary outfits, hen's unarmed restriction and the donkey's Hawaiian option. Unsupported choices reject. It does not register bear, claim placement support or start resource loads.

The Asset library now opens while the native workshop is loading or unavailable, with appearance choices prepared before renderer construction. Preview/metadata remain separate from the open document. Placement waits for a ready workshop. A renderer failure keeps name/outfit/equipment metadata visible, and close/reopen can recover. Existing native control labels are preferred when available. Readiness uses a bounded-to-readiness DOM observer, with observer teardown on page hide; no polling process is installed.

The real-controller lifecycle tests cover pending workshop readiness, renderer construction failure, close/reopen, explicit retry, draw failure and stale async selection. The shared bear adapter itself remains deferred until its immutable provider arrives.

## Planned integration after the pin

Use the supported appearance contract for discovery, Guard/NPC placement and complete map/block round trips. Add a lazy bear preview/map-scene binding with isolated ownership; retain current animals. The old inspection renderer explicitly disposes skeletons before worker disposal, while the reviewed donor bear also disposes its skeleton: the new bear path must delegate exactly once to its provider instead of inheriting both calls. Native Red Hat paint/fit and HMG/RPG carries must pass through unchanged.

Review the full 26 appearance combinations, representative supported poses, concurrent bears, load/retry/cancel/close/reopen, native body/equipped bounds and an existing Cow comparison. Then exercise placement, facing, selection/editing, undo/redo, browser save/reload, export/import, supported block capture/placement and explicit atomic consumer refusal on desktop/phone. A metadata or preview checkpoint alone is not completion.

**Accuracy:** preserve the original bear's shape, fitted cap, paint and anchors; test actual pose/equipment bounds. **Efficiency:** prefer a lazy separately pinned provider; no byte, CPU or GPU improvement is claimed before measurements. **Narrative:** retain regular worker and Red Hat appearances without importing faction/statistics policy. This follows the accepted intake recommendation; game adoption stays separate.
