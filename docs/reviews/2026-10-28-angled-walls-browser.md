# Angled wall workshop verification

Reviewed on Windows in the Codex in-app browser, using the built Nautilus 0.3.0 editor. Desktop viewport: 1280 × 720; responsive controls also checked at 390 × 844. This is a functional/visual review, not a frame-rate benchmark.

| Action | Observed result |
| --- | --- |
| Walls → Angled wall run | Existing palette exposes the mode, snap controls, 1–5 stories, material and exact coordinates |
| Pointer drag in plan view | A 45° run is added; preview reports 4.24 m, four full panels and a 0.24 m cut |
| Native bay example | Six straight wall runs form an angled bay in plan and 3D; two stories retain the inherited spacing |
| Browser save, reload, load selected | The bay and the added diagonal return as seven runs |
| Export JSON, new empty block, import the exported file | The imported block returns with all seven runs and their measurements |
| Rotate scenery block 90°, Undo, Redo | Visible exact fields for bay-2 change from (15.5, 7.5) to (15.5, 15.5), restore, then rotate again |
| Update an exact run to five stories | Preview and saved run report five stories; Undo restores two and refreshes the fields/measurement |
| Try an endpoint outside a 24 m block | Clear footprint error; run count stays unchanged |
| Assign connections, save, generate from the library | The resulting full map contains 700 wall runs from 100 copies of the seven-run block |
| Undo/Redo the generated map after its scene update finishes | Zero wall runs in the original yard, then all 700 restored as one edit |
| Phone-width Tool options drawer | Wall controls are accessible; the 290 px drawer fits the viewport without horizontal overflow |
| Browser console | No application errors during the reviewed flows |

Automated validation: 34 Nautilus tests and 32 inherited regression tests passed; `npm run check` verified 534 immutable source files, and the static build succeeded. The new wall tests include oriented collision, height gaps, boundary rejection and explicit adapter capability checks. Consumer games were not migrated.
