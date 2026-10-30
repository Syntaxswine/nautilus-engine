// Fills the answer section's placeholders with the formal results.
const fs = require('fs'), f = process.argv[2];
let s = fs.readFileSync(f, 'utf8');
const fill = (key, text) => {if (s.split('{{' + key + '}}').length !== 2) throw Error('placeholder: ' + key); s = s.replace('{{' + key + '}}', () => text);};
fill('DOCS', '`2039b21`');
fill('RECORD', 'this record');
fill('FORMAL_RIG', `The formal runs (\`answer/formal-r3/\`, \`formal3.sh\`) measured \`d7b38bf\` in a clean worktree (status recorded empty in \`load.txt\`) against main 0.10.0 \`fb35277\`. GPU: 11:47–12:19, CPU load 2–3 % before and after, 4 runs, 20 frames × 4 blocks per view, all 18 maps, \`--assets-only --expect\`. SwiftShader: 12:19–13:02, 3–15 %, 2 runs, 8 maps. The first formal run, on \`f98d4cc\` (10:27–11:00, 6–7 %), is kept in \`answer/formal-r3-f98d4cc/\`.`);
fill('FORMAL_MFB', `**Formal, on \`d7b38bf\`** (RTX 3080, assets alone on this rig, median and range over 4 runs; \`answer/formal-r3/tables-gpu.md\`):

| Six fires | Overview | Close | Far | Cutaway |
| --- | --- | --- | --- | --- |
| 32 copies of one design (l1) | ×3.07 (2.96–3.14) | ×2.07 (1.97–2.13) | ×2.21 (2.12–2.40) | ×2.14 (1.98–2.20) |
| 32 Gross houses, 13 designs (l4) | ×2.62 (2.22–2.89) | ×2.09 (1.65–2.66) | ×1.95 (1.72–2.10) | ×1.34 (1.26–1.47) |
| 2,400 free-angle walls (l5b) | ×6.84 | ×3.27 | ×6.01 | ×3.06 |
| 144 roofs (l6) | ×7.24 | ×1.86 | ×2.05 | nothing drawn |
| No repeated design (l7) | ×2.87 | ×3.53 | ×3.84 | ×1.91 |
| Blank maps with the same fires (null) | ×0.99–1.01 | ×0.96–1.00 | ×1.00 | ×0.98–1.01 |

- **Triangles under lamps.** With six fires, 32 copies draw 8.33 M asset triangles per frame at the overview, against main's 8.15 M and round 3's 52.62 M. Whole frames show the same: 14.95 M against main's 14.77 M (round 3: 59.25 M).
- **The GPU's own time falls too**, in every changed view but one: 32 copies lit ×4.4–9.2, unlit ×3.4–9.7. The exception is the lit roofs' close view (0.21 → 0.29 ms; see SF-C).
- **The lit Gross houses are still slowest.** Their close-to-cutaway views are below round 3's instancing (×1.83 cutaway), and the per-instance runs did not change them (\`f98d4cc\` and \`d7b38bf\` are equal there within noise). A count of setups names the cause (\`answer/exp-wasted.js\`): per frame, 2,739 of the batches' shadow setups find no copy in their camera, against 1,526 that draw. Each design's 2–3 copies are spread across the district, so the batch's union sphere passes the renderer's test for most lamp faces. Main pays only a sphere test per mesh there. For the 32 dense copies (l1) it is 87 empty against 206.
- **The next step:** batch only copies that neighbour each other (single linkage on their footprints), so sparse repeats draw as per-copy batches and dense ones stay batched.

**The triangle-bound proxy** (SwiftShader, whole frames, paired, 2 runs, reduced motion; \`answer/formal-r3/tables-swiftshader.md\`):
- Lit by six fires, 32 copies are at parity with main: ×0.96 / ×0.97 / ×0.97 / ×1.00 (overview / close / far / cutaway). Round 3 measured round 2's instancing at ×0.65 / ×0.57 / — / ×0.87.
- Unlit, 32 copies: ×0.97 / ×0.95 / ×0.97 / ×0.98 (round 3: ×1.00 / ×0.88 / — / ×1.02). The remaining few per cent are the batching shader's reads per vertex (the copy table and four matrix texels), which a CPU rasteriser pays per vertex.
- The Gross houses and the mixed district: ×1.01–1.04. The blank maps: ×0.98–1.00.`);
fill('CI_FALSIFIERS', `- **The gate can fail.** Four mutants built into the editor are refused by the CI check (15, 11, 20 and 5 map-views), and the unmutated build passes (see Mutation). The culled counts measured from real frames equal the counts pinned with stubbed draws in all 72 map-views of the formal GPU run (\`--expect\`), so stubbing changes no count.`);
fill('SFC', `The docs now state batching's costs, measured (\`docs/building-prefabs.md\`, \`docs/sloped-roofs.md\`).

- **Pixels against separate meshes** (SwiftShader, \`d7b38bf\` against main, at the 1056 × 916 canvas, 967,296 pixels):

  | Map | Overview | Close | Far | Cutaway |
  | --- | --- | --- | --- | --- |
  | 32 copies of one design | 20 | 128 | 682 | 11 |
  | 32 Gross houses | 30 | 215 | 1,402 | 54 |

  - The far view, a close view of the last copy, is new; float32 has fewer bits to spare far from the origin.
  - In the close and far views 62–99 % of these pixels differ by one or two colour levels.
  - The rest are strong depth ties and single pixels, or small blobs: at most 81 pixels outside the far views, and up to 385 pixels of one- or two-level shading in them.
  - Lit by six fires, the copies differ just as much in the benchmark's views (20 / 128 / 682 / 12). Round 3 counted 3,593 and 5,022 at its own cameras beside a lamp, where shadow edges move. \`CopyBatch\` is byte-identical to the build round 3 measured, so those counts stand.
  - Maps without repeats are byte-identical, apart from 1–3 cutaway pixels at baked door leaves; the blank maps, lit or not, are 0 in all 12 views. Every repeat of one arm was byte-identical.
- **Triangles.** Copies are culled one by one again, so a close view draws per-copy triangles: 32 copies 1.37 M → 1.38 M, and lit 3.29 M → 3.37 M, against round 3's 2.72 M and 26.96 M. Every map's culled draws and triangles are pinned.
- **Merged roofs** are culled as one mesh, so each lamp face that sees any roof draws all 144: 0.10 M roof triangles per frame against main's 0.01 M. That is cheap at roof triangle counts, but the lit close view gains only ×1.86.
- **The frame size**: 215 pixels is 0.022 % of the canvas; the record's "1.76 M" was the viewport, not the canvas.`);
fill('SFD', `GPU elapsed time, assets alone, main → this, median of runs (\`answer/formal-r3/tables-gpu.md\`):
- 32 copies: 6.45 → 0.70 ms at the overview unlit (×9.7), 19.97 → 4.53 ms lit (×4.4).
- The changed views elsewhere: ×2.3–32.
- One view loses: the lit roofs' close view, 0.21 → 0.29 ms (×0.82).

So the isolated ratios are not CPU savings bought with GPU time. Where both are known, the GPU gains more than the isolated frame does.`);
fs.writeFileSync(f, s); console.log('ok; placeholders left:', (s.match(/\{\{[A-Z_]+\}\}/g) || []).join(' ') || 'none');
