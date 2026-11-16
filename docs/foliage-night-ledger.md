# Foliage brush → Night Ledger

This application integrates the public shared-stealth/crawl contracts accepted at `bbf4f8adfebfd80ae7afe3744b5fab52b8a78366`. It adds one optional west plot; the existing door, rock and south road fixtures keep their profiles. No donor runtime, game pins or private Sites audience changes are involved.

## Author and send

1. In the built editor, choose **Open foliage test ground**. The new same-origin window binds the actual Night Ledger adapter.
2. Choose **Load connected foliage blueprint** in the editor. Save/export an existing design before replacing it when prompted.
3. Use the normal **Foliage** tool, preset/density controls and drag brush inside local cells 0–15 on the ground floor. Undo/redo and the ordinary editor save/open/export work on the complete portable blueprint.
4. **Preflight connected game** validates capabilities and stages the entire supported projection. **Send to game** stages again against the current actor before committing. The editor keeps its document and undo history.
5. In the ground, use ordinary WASD/arrows or the shared joystick, and the **Sneak**, **Prone/Stand**, **Turn in place** actions. The overlay labels density tiles and observer markers as diagnostics. They are not completed foliage art or guard AI.
6. **Fixtures & golden checks → Foliage changes confirmed stealth outcomes** compares bare/brush/quiet routes using the current authored foliage dependency. Run selected uses isolated baselines, separate from actual keyboard/touch evidence. Missing observation profiles are unavailable. Clearing the corridor can make the expected brush advantage fail; a request acknowledgement alone cannot pass.
7. **Save sandbox / Reload save**, or export/import the exact report, retain the whole host, full blueprint, query revision, damaged/spent resources, command streams, hearing history, player setup, native cursor, clock and checklist. Failed/cancelled/stale candidates preserve the accepted aggregate. Try/reset explicitly starts a new sandbox.

## Exact supported projection

The complete portable map remains 240 × 240, three layers. Only its name and ground-level foliage cells 0–15 may differ from the supplied flat-yard scaffold. The four fixed portable squad markers are format-required authoring scaffolding; this fixture controls one native goat and a diagnostic observer, not four spawned squad members. Additional/changed actors, markers, terrain, metadata, geometry, edges, props, upper floors, ramps, stairs, buildings, roofs and other extensions refuse explicitly rather than being dropped.

Local integer cell `(0,0)` maps to world metres `(8.5,16.5,0)`, so the 16 × 16 m west plot has bounds `[8,24] × [16,32]`. Cell centres are one metre apart; a cell spans ±0.5 m. Query native heights use the declared 2.12 m story interval. All four `nautilus-foliage-queries-v1` presets (`woodland-v1`, `thicket-v1`, `wetland-v1`, `bog-v1`) preserve their SDK blocking/concealment and separate sight/shot semantics. No density-based weakening is added. Accepted paint/clear/undo/redo/reload sends advance query revision and rebuild a detached snapshot before replacing the live projection.

The native profile is normal goat, hands or original rifle (`?foliage=1&equipment=rifle`), one `floor-0` plane at zero metres. Both standing and prone use the explicit conservative 1.4 m radius / 1.8 m height envelope, checked before stance or map commits. It is deliberately too wide for the existing narrow door fixtures. The full body remains inside the plot. Art does not imply underpass clearance, a narrow capsule, stairs, slopes or other rigs. Real-time movement preserves AP and spends the shared stance/mode stamina costs; no save or pose change heals/refills resources.

Walking uses public `cell(...).blocked` as grid-based solid obstacles with the retained host/body checks. This includes source trunk-bearing woodland cells, dense cover and bog. The source `(10,4)` trunk control blocks the conservative body while a wide neighboring gap walks. Finer native-world wood/leaf ray volumes remain distinct sight/shot geometry, not a new mesh collider. Numerical concealment comes from `depth()`; body-zone sight rays supply exposure. The displayed sight/shot pair is a diagnostic target-height probe at 0.9 m, not a complete firearm host. The diagnostic observer stays fixed in the saved initial route lane; it does not follow the player between lanes.

## Optional public setup profile

Use `createCrawlSetupConfiguration`, `validateCrawlPlayerSetup`, `CRAWL_SETUP_PORTS` and `mountCrawlPlayerSetup` from `@nautilus-engine/map-core/player-setup/browser`. Configuration **v2** carries the explicit `nativeProfile`. Pose schema `urn:nautilus:confirmed-native-crawl-sample:1` and native schema `urn:nautilus:native-crawl-view:1` are distinct from legacy schemas. The checkpoint kind is `nautilus-crawl-player-setup-checkpoint`, with a typed `NativeCrawlCheckpoint`; it is never disguised as `NativePoseCheckpoint`.

The retained app stages the matching full host world and crawl sample first. The existing `setup.actor` lifecycle owns loading, phase restoration, activation and disposal; it authenticates the original goat/paint resources through the public crawler preparer. Setup owns the same clock/camera/UI/input assembly as before. Borrowed native providers, custom actor factories, foot support and unsupported model/motion/surface/profile settings refuse for this optional profile. Changing equipment requires an explicit whole-scene restart. Legacy setup v1, native checkpoints, foot-support behavior and role settings remain distinct and unchanged.

The optional profile uses the fixed setup registry and lifecycle factories and stays on foot. Custom registries/factories and train/vehicle components refuse before activation. Legacy v1 retains its existing extension options.

For accuracy, this bounded native profile is preferable to inferring collision/stance from art: the SDK validates confirmed travel and preserves durable phase, while the stated conservative envelope exposes its limits. For efficiency, it reuses one setup lifecycle and immutable foliage snapshots; no second animation/controller or guard simulation runs. These are code-based estimates, not a new FPS benchmark. For narrative, the AFT stealth policy supplies useful Night Ledger brush/quiet-route consequences; the diagnostic markers make the unfinished observer presentation explicit. Other games retain their existing profiles. The accepted 6,492-frame native pose evidence remains at its original shared-stealth pin and is not repeated here.

## Reproduce

Run source controls with `node --import ./apps/test-ground/tools/source-loader.mjs --test apps/test-ground/stealth.test.mjs` and `node --test tests/player-setup-crawl.test.mjs`. The source loader is tooling only. Offline installed consumers resolve only the public package and authenticate every provenance byte; they never use this loader, a donor checkout or a sibling SDK fallback.

The bounded browser reviewer is `node apps/test-ground/tools/review-foliage.mjs` (also `--built` / `--installed`). It creates a task-owned isolated browser/server and closes both in `finally`. Review receipts record exact process identity and released ports. No preview is retained after delivery.
