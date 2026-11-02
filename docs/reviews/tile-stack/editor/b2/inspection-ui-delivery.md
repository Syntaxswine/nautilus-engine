# Focused inspection UI correction — completed evidence

Approved immutable runtime correction: **`f754afcc9f46b196f258bf09e8091c962c9b31f8`**, relative to **`607c602490cf9f16df27595aded58d86812cfd37`**. The final evidence commit changes documentation only. No runtime changed after this approved checkpoint.

The runtime delta is exactly:

| Status | File | Bounded change |
| --- | --- | --- |
| Modified | `apps/editor/tile-stack/ui/panel.js` | Separate Drawing floor / View captions; captured cutoff resolves its own declared floor; explicit Overview/Selected readouts |
| Modified | `apps/editor/tile-stack/ui/styles.css` | Visible gold/dark/bold active inspection mode and scoped view status styling |

The early checkpoint also adds only the Editor-prefixed focused probe and two separate correction notes: `tools/editor-review-tile-stack-inspection-ui.mjs`, `inspection-ui-correction.md` and `inspection-ui-correction.json`. The historical `ui-source.json` remains byte-identical. The modified panel/styles are attributed as a bounded reviewed delta after the original `8622c77` import. Existing `tools/review-tile-stack-editor.mjs`, Root source/verifier tools, authority, geometry, cutoff semantics and custom-tile runtime are unchanged. No Root uncommitted source was imported.

| Current-source validation | Result |
| --- | --- |
| Focused source actual browser | **15/15**, five captures, pass |
| Focused built actual browser | **15/15**, five captures, pass |
| Full Node suite | **991/992 pass**; sole failure remains the expected historical isolated-worker input source fence |
| `npm run check` | Same expected isolated-worker source-fence failure; no fence changed |
| Upstream | **32/32 pass** |
| Build | Pass, **544 module paths** checked |

The browser cases cover both uniform and nonuniform native floors. They capture Cutaway on floor 8, move the drawing floor to 13 and verify both separate visible captions, eight actual visible floor IDs, the gold active Cutaway button in normal colors, all 480 cells still allocated, unchanged checkpoint/writes, explicit recapture to floor 13, Overview/Selected transitions and retirement of an acquired Finish review. They verify actual computed foreground/background/bold styles, not just `aria-pressed`, and include a 320 px responsive layout check. The real public host/providers and native UI controls are used; no fixture adapter is substituted.

`inspection-ui-evidence/index.json` inventories exact input/tool hashes, both reports, ten screenshots, four gate logs, helper records and cleanup receipts. Both finite browsers and HTTP servers closed normally, and both ports returned `ECONNREFUSED`. No preview helper remains. Images use isolated headless Edge/software WebGL; the narrow layout is a responsive viewport check, not a physical-device or performance claim.

Reproduce only the requested focused proof:

```text
npm run build
node tools/editor-review-tile-stack-inspection-ui.mjs
node tools/editor-review-tile-stack-inspection-ui.mjs --built
```

The preserved 57 B2 / 81 legacy records remain historical. They were not rerun or restamped during this correction. Root owns the full current-source matrix, combined authentication and main integration. This worker branch remains local because its old isolated source fence still fails as expected.
