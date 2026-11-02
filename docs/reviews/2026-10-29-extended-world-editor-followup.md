# Extended-world history and load atomicity follow-up

Fix checkpoint: **`cc4eba5365f9df36f262a0b675a32425a89eb6b3`**. It follows the preserved implementation/evidence checkpoints `df1333616a20a881b56f1cad3d10f5881baa9dd8` and `dd7e15feaec1526649c99a4e4da43c6238273927`. Five files change: the editor document, browser host, history regressions, browser runner and authoring contract. World-core, navigation packages, root/package/build/export/version configuration and consumer pins are unchanged.

## Corrections

**Combined history budgets.** Commit, undo and redo enforce both the total undo-plus-redo entry cap and their combined serialized-byte cap. Eviction removes oldest undo snapshots first, then farthest redo snapshots, preserving a contiguous remaining sequence in each direction. An oversized former live world can lose its redo snapshot after a successful undo. Each eviction removes an actual record; empty stacks terminate. Eviction does not change the restored live world or increment its revision.

Two new asymmetric regressions failed on the previous implementation: 445 retained bytes exceeded a 286-byte budget, and 1,550 bytes exceeded a 1,328-byte budget. Both pass with this fix. The first proves successful undo into a smaller world, removal of an oversized redo and unchanged revision on subsequent unavailable operations. The second forces oldest-undo and farthest-redo eviction separately, then checks the exact world, compiled surface count, revision, byte and entry caps through further undo/redo.

**Host-compatible import before replacement.** World-core accepts a whitespace-only floor label, while this host's selector requires a nonempty trimmed label. The host now prepares a compatible navigation controller before replacing the document or disposing the old controller. Browser file-import coverage supplies an independently world-validated candidate with a whitespace label. Rejection preserves exact export, undo/redo history, document revision, working floor, preview state, complete navigation state and controller identity. The original controller still steps up/down and redo remains usable.

**Explicit saved selection.** Restore requires a string ID present in the saved world's declared floor records. Null and invalid types cannot fall back to floor zero. Actual browser restore checks cover null, number, boolean, object, array, empty string, whitespace, unavailable ID and missing field. Every rejection preserves live state and the same usable navigation controller. A saved world with an incompatible whitespace label is also refused before replacement. Ordinary native import may still choose the first floor when no selection was requested.

## Verification and evidence

All required gates passed: tracked provenance/module check, **299 repository tests**, **32 upstream tests**, and build (**378 checked module paths**). The focused fixture/editor suite passed **12 tests**. Commands and log hashes are in [delivery-gates.json](evidence/extended-world-followup/delivery-gates.json).

The complete browser runner passed **12 workflow groups** on the clean fix checkpoint, including the existing desktop/320 px edits, pointer cancellation, native save/export/import, high contacts and legacy refusal. [Acceptance JSON](evidence/extended-world-followup/acceptance.json) records exact source/build hashes, rejected-load assertions, nine malformed selection cases and nine capture hashes. All browser/resource error lists are empty. Runtime-source hashes were checked again after the run. No layout or normal control behavior changes; the [original visual review](2026-10-29-extended-world-editor.md) remains a baseline.

Two new rejection captures are preserved: [world-valid but navigation-incompatible import](evidence/extended-world-followup/native-rejected-floor-label-import.png) and [null saved selection](evidence/extended-world-followup/native-rejected-saved-selection.png). All nine current captures and the exported world remain in `artifacts/extended-world-followup/`; rerun after building with `NAUTILUS_WORLD_REVIEW_OUTPUT=extended-world-followup node tools/review-extended-world.mjs` (set the environment variable using the host shell).

The world remains a static AABB/segment/support authoring contract with semantic traversal links. These fixes add no movement, door runtime, combat, fire or consumer adoption.

## Helper status

The isolated review closed through the supported browser/HTTP finally path at `2026-10-29T16:52:33.994Z`; [receipt](evidence/extended-world-followup/cleanup-receipt.json). [Fresh PID-plus-creation verification](evidence/extended-world-followup/helper-verification.json) confirms runner lifetime 19276 and browser lifetime 51032 exited and port 53051 was released. No task-owned review service is retained. The committed stateless runner and source hashes preserve its restart inputs.
