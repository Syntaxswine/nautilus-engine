# Bear builder handoff candidate

Candidate: **`1f8c9c21b8895f8caf0a6c02c2e7323c727a696a`**, continuing `codex/editor-bear`. It applies documentation standard `1c2b94c0cf0c86947c4e5f3da78c7d2d8404ea66` to the existing preparation checkpoints. The bear provider and appearance contract are still pending; this is a proposed usage card, not runtime adoption.

## Discoverable guide and checklist

The Asset library now links **Usage guides** in its header. The [public README](../../README.md) links the same [component usage-card index](../components/index.md), which identifies `people:bear` / model `bear` as proposed and opens the maintained [bear handoff](../components/bear-authoring.md). Discovery does not require a renderer or editor: the index and guide are included by the common support-file list in core, renderer, assets and compatibility profiles.

The only package-manifest change adds two Markdown paths to the existing `files` whitelist. Exports, runtime manifest fields, schemas, capabilities and source pins are unchanged. The index is separate documentation metadata, not a new guide API. A link from the eventual real `people:bear` descriptor remains part of the reviewed Coder integration; no unavailable asset entry was added to the current catalogue.

The guide follows the requested identity/readiness, connections, units/ownership, saves/game decisions and checklist structure. It names both outfits, thirteen equipment IDs, Guard/NPC positions/headings, stable authored-character expectations, selection/history/save/block fixtures, missing-capability remedies and ownership checks. Actual bear tasks remain unchecked. Required actor/geometry/command providers and missing door/stair semantic compilers remain explicit; no second behavior runtime or moving UI candidate was adopted.

Its executable example uses only installed `@nautilus-engine/core` public imports, a retained save-store stand-in and the real v0.8 comparison/refusal boundary. It creates a regular Cow Guard and Red Hat Cow NPC, stages a refused bear preview without live mutation, saves and reloads the supported document, and preserves categories/outfit. It deliberately does not claim successful bear placement. Exact tarball installation/run steps are included.

## Installed and browser proofs

`node tools/check-bear-handoff.mjs` verified the index/guide in all four profile manifests, packed and offline-installed the real core tarball, checked README → index → guide links and all relative guide links, compared installed guide bytes and executed the Markdown example successfully. [Installed proof](evidence/editor-bear-handoff/installed-guide-proof.json) records tarball integrity, guide SHA-256 and confirmed removal of the validated temporary consumer. The other three profiles' inclusion was verified from their actual distribution file lists, not claimed as three additional installs.

All required gates passed: tracked provenance/module check, **364 tests**, **32 upstream tests**, and build (**383 module paths**). [Gate commands and log hashes](evidence/editor-bear-handoff/delivery-gates.json).

`node tools/review-bear-handoff.mjs` passed desktop guide discovery/status/content, 390 px phone visibility and keyboard focus with a 44 px target/no page overflow, and unchanged document/revision/history after discovery. It fetched both built guide files successfully through the real link. A controller test also verifies the URL retains a deployed subpath rather than following the inherited vendor `<base>`.

[Browser acceptance](evidence/editor-bear-handoff/acceptance.json) records source/build/capture hashes and zero browser/resource errors. The source-file hashes were checked against the candidate's committed Git blobs after testing; `verifiedSourceCommit` records the exact match. The desktop and phone captures were visually inspected: [desktop](evidence/editor-bear-handoff/library-guide-desktop.png), [phone](evidence/editor-bear-handoff/library-guide-phone-390.png).

## Cleanup and remaining blocker

[Supported browser/HTTP cleanup](evidence/editor-bear-handoff/cleanup-receipt.json) completed. [Fresh PID-plus-creation verification](evidence/editor-bear-handoff/helper-verification.json) confirms runner lifetime 11104 and browser lifetime 46116 exited and port 52296 was released. No review service remains; the installed example's temporary consumer was removed after its proof.

The remaining blocker is unchanged: the architect must distribute the reviewed Coder provider/appearance representation before real bear discovery, placement/save/block operations, optional motion, resource ownership and consumer acceptance can be wired. The guide lists those gaps and their owners without inventing executable API names. The preferred design preserves native identity/semantic bindings and game-owned policy; no performance benefit or playable movement is claimed by this documentation.
