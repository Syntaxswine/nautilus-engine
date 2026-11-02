#63f shared-controller/load review

Return fixed `63f3506daced32e2ac135e008e00ac939ca90f87` for one focused correction. The sealed938e promotion plan is unchanged.

**[P2] Load dispatch does not fence the displayed source/selection.** In `candidates/tile-authoring/ui/shared-controller/resource-control.mjs:23–36`, `load()` begins the UI gate, reads a fresh actual binding snapshot and checks the connection plus non-null chosenArtwork. It does not compare that read to the complete source/selection displayed when Load was activated.

Reproduced in actual isolated Edge156 DOM with the exact63f runtime:

1. Both real panels are mounted; the palette visibly shows `number0 ·r1 ·unavailable` and the actual chosen Pin is `artist.graphic.road-number-0`.
2. The protocol source changes its complete read's chosenArtwork to canonical `artist.graphic.blood-dried`, without publishing. The existing readC2UI accepts the changed complete read; the visible palette still shows number0.
3. The actual Load selected artwork button is clicked.
4. The borrowed loader is invoked once with the actual issued read for blood-dried while number0 is still visible. IDs, commands and prepare remain zero.

This requests the wrong RESOURCE work for a stale visible action. It does not establish an edit/Host authority bypass or native readiness. `browser-evidence/independent-stale-load.json` records original/displayed Pins, actual callback Pin and counters. The failed assertion/output remain in `run-browser/`; the complete browser review is intentionally reported failed.

Fence the displayed complete source/selection through the pending callbacks and actual fresh read, then refuse/refresh before resource dispatch if it changed. Continue passing the genuine issued read after the guard. A cloned DTO is not permission, and the action should not silently switch to a different current Pin. Add stable-positive and source/selection drift regressions, preserving the existing pending/resource-debt rules.

Before that failure, all22 Node groups and the original16 actual DOM groups passed. Covered behavior includes one Root controller/subscription across both panels, shared draft/history, default C1 without the opt-in, cross-panel pending gates, independent detach/last-close cleanup, observed rebind retirement, callback flags granting no readiness, and pending load disposal preserving actual debt. Fresh desktop/tablet/390px captures were collected; desktop and phone images were inspected. These are actual panels/DOM with explicitly protocol workbench/session/readiness/history/resource callbacks, not native or Host/authoring-meter/WAL evidence. Worker type/full-repository reports were not repeated.

All376 authenticated source bytes remained exact, including the three-edit C1 mount continuation. Only proof imports/output locations and a protocol-only callback-argument trace were adapted; runtime edits are zero. No Root/index/worker file was changed. The actual browser/server closed in finally; HTTP58051 was released, and all five recorded Node/browser lifetimes are absent. Supported browser closure was used; individual browser descendants were not separately censused. No helper remains running. No additional probes were run after the reproduced finding.
