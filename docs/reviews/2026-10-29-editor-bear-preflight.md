# Bear editor preparation checkpoint

Preparation commit: **`d42fc2de10b6ae33174cb2c9e11412936c79a57c`**, branch `codex/editor-bear`, based on released v0.8.0 `8c4670450cb2b38c1e1abd811d633c22de9e2b7c`. This is an editor preparation checkpoint. **Bear discovery/rendering/placement is not integrated yet.** It awaits the architect's reviewed Coder provider and appearance-extension commit. No bear assets, shared APIs, consumer pins or donor worktrees were changed.

The [seam report](../intake/2026-10-29-editor-bear-seams.md) records exact document/renderer dependencies and contract questions. [Fixtures](../../tests/fixtures/editor-bear/README.md) provide two authored comparison characters and an intentionally unsupported legacy bear block. They preserve character IDs, categories, names, script IDs, internal relationship, facing, both outfits and equipment; the current rejection leaves the open document and redo stack unchanged. The thirteen existing equipment IDs produce 26 intended bear appearance cases without inventing a future save schema.

## UI preparation

The Asset library can open before native workshop controls exist. Headless appearance metadata supplies outfit/equipment choices before attempting rendering. Placement waits for the workshop to be ready. Graphics failure keeps metadata visible; explicit retry/close/reopen remain supported. The current twelve animal rigs, three existing preview-only restrictions and 344-entry catalogue remain unchanged; no bear entry is enabled prematurely.

The controller tests cover readiness, renderer constructor/draw failure, retry, close/reopen and stale async completion. Separate metadata tests cover both intended bear outfits and all thirteen IDs, hen's unarmed restriction and the donkey's Hawaiian option. These are metadata/lifecycle checks, not acceptance of the absent bear provider.

## Verification

All four repository gates passed: tracked source/module check, **364 tests**, **32 upstream tests**, and build (**383 module paths**). [Commands and log hashes](evidence/editor-bear-preflight/delivery-gates.json) preserve those results.

The isolated Edge preflight passed three browser workflow groups:

- Existing **Cow** comparison across all 26 outfit/equipment combinations. Assertions inspect actual private preview models, their species, outfit, weapon/equipment identity, cap presence and `[1,1,1]` root scale. Every preview leaves the main document's exported bytes, revision and undo/redo counts unchanged. Close/reopen succeeds.
- Metadata with the native editor module deliberately withheld and WebGL deliberately unavailable. Name, both outfits and thirteen equipment choices remain available; placement stays disabled. Four expected Three graphics-construction messages are recorded explicitly. There are **zero unexpected browser errors and zero failed resource requests**.
- The same metadata view at **390 × 844**, with no page horizontal overflow.

[Acceptance JSON](evidence/editor-bear-preflight/acceptance.json) includes browser version, source/build hashes, actual comparison records and capture hashes. `sourceCommit` identifies the starting baseline before preparation; `verifiedSourceCommit` names the preparation commit. After testing, every reviewed source-file SHA-256 was checked against that commit's Git blob, proving the rendered files match the immutable checkpoint without rerunning unchanged code solely for a commit label. The four captures were visually inspected.

[Regular Cow](evidence/editor-bear-preflight/comparison-cow-regular.png) · [Red Hat / HMG Cow](evidence/editor-bear-preflight/comparison-cow-red-hat-hmg.png) · [Metadata without tools/WebGL](evidence/editor-bear-preflight/metadata-without-workshop-or-webgl.png) · [Phone metadata](evidence/editor-bear-preflight/metadata-phone-390.png)

## Remaining integration dependency

Coder's reviewed checkpoint must supply the preserved bear representation/capability and document operations, headless discovery metadata, native Three/resource provider, pose/family capabilities and exact ownership contract. The editor then needs actual bear discovery, preview, Guard/NPC placement, selection/facing/editing, complete history/save/import/export/block workflows, explicit atomic consumer refusal and native body/equipment clearance review. The existing old nine-species validator stays strict. A preview-only result will not complete that assignment.

Prefer lazy native bear presentation for accuracy and AFT/Farmyard narrative identity. Current captures are comparison evidence, not a bear redesign or performance benchmark. No biological, physical-clearance or GPU-cost claim follows from the reserved tile or metadata preview.

## Helper cleanup

The four-minute bounded review closed through supported browser/HTTP teardown at `2026-10-29T18:57:33.198Z`; [receipt](evidence/editor-bear-preflight/cleanup-receipt.json). [Fresh verification](evidence/editor-bear-preflight/helper-verification.json) matched PID and creation time for runner 17400 and browser 37764, confirmed both original lifetimes exited and port 59425 was released. No review server is retained. The committed runner, exact source hashes, fixture inputs and stateless restart metadata remain available.
