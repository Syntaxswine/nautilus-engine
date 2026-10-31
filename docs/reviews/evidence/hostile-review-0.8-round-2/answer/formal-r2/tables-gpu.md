**Whole frame** (ms, main 0.10 → this; speedup per run, median and range)

| Workload | Overview | Close | Cutaway |
| --- | --- | --- | --- |
| Blank map (null control) | 4.12 → 4.02, ×1.03 (0.97–1.11) | 2.18 → 2.11, ×1.03 (0.97–1.10) | 3.94 → 3.90, ×1.01 (0.91–1.05) |
| 32 copies of the largest design | 12.61 → 5.16, ×2.46 (2.02–2.57) | 5.34 → 3.36, ×1.59 (1.45–1.71) | 5.67 → 4.21, ×1.35 (1.24–1.51) |
| 32 distinct originals, most meshes | 18.64 → 6.94, ×2.72 (2.20–3.08) | 8.11 → 3.49, ×2.31 (2.00–2.40) | 10.21 → 5.35, ×1.91 (1.63–2.28) |
| 32 distinct originals, most triangles | 18.14 → 7.14, ×2.58 (2.26–2.75) | 8.15 → 3.25, ×2.53 (2.31–2.65) | 9.86 → 5.35, ×1.83 (1.65–1.96) |
| 32 Gross houses | 23.87 → 5.55, ×4.20 (3.74–4.79) | 12.34 → 3.85, ×3.18 (2.96–3.50) | 14.30 → 5.88, ×2.36 (2.17–2.53) |
| 200 axis-aligned wall runs | 4.20 → 4.30, ×0.98 (0.87–1.03) | 2.57 → 2.55, ×1.00 (0.97–1.07) | 3.81 → 3.85, ×1.00 (0.94–1.05) |
| 2,400 free-angle wall runs | 25.11 → 4.30, ×5.84 (5.69–6.29) | 7.71 → 2.92, ×2.62 (2.43–2.81) | 6.81 → 4.24, ×1.61 (1.48–2.01) |
| 144 sloped roofs | 7.64 → 4.32, ×1.77 (1.48–1.80) | 3.09 → 2.63, ×1.21 (1.06–1.29) | 4.11 → 4.24, ×0.97 (0.88–1.08) |
| 13 Gross + 19 largest originals | 26.34 → 8.06, ×3.17 (2.83–3.63) | 10.08 → 3.50, ×2.80 (2.60–3.32) | 14.30 → 6.84, ×1.99 (1.91–2.43) |

**Assets only, measured directly** (every other mesh hidden while the frame renders; a lower bound on the assets' own speedup)

| Workload | Overview | Close | Cutaway |
| --- | --- | --- | --- |
| Blank map (null control) | 0.50 → 0.50, ×1.00 (1.00–1.06) | 0.50 → 0.50, ×1.00 (1.00–1.11) | 0.45 → 0.40, ×1.06 (0.89–1.19) |
| 32 copies of the largest design | 8.64 → 2.31, ×3.78 (3.29–4.13) | 3.69 → 1.88, ×1.96 (1.62–2.14) | 2.34 → 0.70, ×3.26 (3.07–3.57) |
| 32 distinct originals, most meshes | 13.66 → 3.25, ×4.12 (3.53–4.97) | 5.84 → 1.83, ×3.20 (2.91–3.40) | 5.49 → 1.78, ×3.06 (2.79–3.33) |
| 32 distinct originals, most triangles | 13.44 → 3.26, ×3.88 (3.72–4.75) | 5.80 → 1.85, ×3.07 (2.43–3.67) | 5.36 → 1.74, ×3.02 (2.62–3.37) |
| 32 Gross houses | 18.89 → 2.56, ×7.32 (6.52–8.15) | 10.00 → 2.70, ×3.72 (3.23–4.52) | 9.29 → 2.52, ×3.77 (3.34–3.97) |
| 200 axis-aligned wall runs | 0.90 → 0.87, ×1.00 (0.89–1.25) | 0.90 → 0.90, ×1.00 (1.00–1.11) | 0.60 → 0.57, ×1.05 (1.00–1.20) |
| 2,400 free-angle wall runs | 20.81 → 1.17, ×17.77 (15.83–29.04) | 5.50 → 0.91, ×6.04 (5.50–7.03) | 2.73 → 0.54, ×5.07 (4.65–5.40) |
| 144 sloped roofs | 3.24 → 0.66, ×5.10 (4.50–6.29) | 1.32 → 0.70, ×1.93 (1.86–2.00) | 0.50 → 0.50, ×1.00 (1.00–1.10) |
| 13 Gross + 19 largest originals | 21.09 → 4.14, ×4.97 (4.65–5.44) | 7.70 → 1.98, ×3.89 (3.60–4.49) | 9.21 → 3.17, ×2.85 (2.75–3.00) |

**Subtraction estimate** (frame minus the same run's blank map; overview and cutaway only)

| Workload | Overview | Cutaway |
| --- | --- | --- |
| 32 copies of the largest design | 8.41 → 1.26 ms, ×6.85 (5.49–10.23) | 1.81 → 0.31 ms, ×5.47 (2.73–33554432.00) |
| 32 distinct originals, most meshes | 14.49 → 2.86 ms, ×5.43 (3.51–5.83) | 6.26 → 1.34 ms, ×4.71 (3.07–7.10) |
| 32 distinct originals, most triangles | 14.01 → 3.13 ms, ×4.62 (3.59–5.15) | 5.81 → 1.45 ms, ×4.15 (3.22–4.68) |
| 32 Gross houses | 19.78 → 1.51 ms, ×12.05 (8.82–14.58) | 10.23 → 1.98 ms, ×5.23 (4.23–5.58) |
| 200 axis-aligned wall runs | 0.04 → 0.21 ms, ×-0.34 (-4.00–0.32) | -0.10 → -0.10 ms, ×0.58 (-1.50–5.00) |
| 2,400 free-angle wall runs | 21.06 → 0.19 ms, ×111.14 (39.50–341835777.00) | 2.88 → 0.34 ms, ×6.55 (-128.00–15.33) |
| 144 sloped roofs | 3.43 → 0.31 ms, ×10.58 (3.38–66.50) | 0.16 → 0.34 ms, ×0.36 (-0.25–29.00) |
| 13 Gross + 19 largest originals | 22.21 → 4.03 ms, ×5.40 (4.60–6.28) | 10.23 → 2.89 ms, ×3.39 (3.03–4.92) |

**Draw calls per frame** (main 0.10 → this; shadow pass in brackets)

| Workload | Overview | Close | Cutaway |
| --- | --- | --- | --- |
| Blank map (null control) | 1,121 (554) → 1,121 (554) | 419 (303) → 419 (303) | 1,121 (554) → 1,121 (554) |
| 32 copies of the largest design | 4,155 (2,026) → 1,425 (658) | 1,678 (1,190) → 507 (300) | 1,948 (970) → 1,135 (561) |
| 32 distinct originals, most meshes | 4,480 (2,209) → 1,877 (896) | 1,934 (1,324) → 720 (457) | 2,596 (1,297) → 1,512 (750) |
| 32 distinct originals, most triangles | 4,425 (2,176) → 1,863 (888) | 1,900 (1,309) → 711 (446) | 2,546 (1,271) → 1,501 (744) |
| 32 Gross houses | 8,657 (4,353) → 1,457 (722) | 3,894 (2,787) → 676 (392) | 4,486 (2,251) → 1,419 (703) |
| 200 axis-aligned wall runs | 1,127 (557) → 1,127 (557) | 425 (306) → 425 (306) | 1,127 (557) → 1,127 (557) |
| 2,400 free-angle wall runs | 5,916 (2,956) → 1,127 (557) | 1,618 (1,293) → 425 (306) | 1,920 (954) → 1,123 (555) |
| 144 sloped roofs | 1,985 (986) → 1,131 (559) | 701 (519) → 429 (308) | 1,121 (554) → 1,121 (554) |
| 13 Gross + 19 largest originals | 6,542 (3,246) → 1,940 (938) | 2,333 (1,691) → 736 (468) | 3,366 (1,681) → 1,663 (825) |

**Open time** (blank first, then the workload)

| Workload | ms (main → this) | Speedup |
| --- | --- | --- |
| Blank map (null control) | 1086 → 1073 | ×1.00 (0.89–1.13) |
| 32 copies of the largest design | 1340 → 1203 | ×1.12 (0.89–1.29) |
| 32 distinct originals, most meshes | 2605 → 1743 | ×1.48 (1.44–1.53) |
| 32 distinct originals, most triangles | 2540 → 1713 | ×1.49 (1.41–1.55) |
| 32 Gross houses | 1471 → 1328 | ×1.10 (0.89–1.28) |
| 200 axis-aligned wall runs | 1126 → 1117 | ×1.01 (0.89–1.16) |
| 2,400 free-angle wall runs | 1215 → 1129 | ×1.07 (0.96–1.19) |
| 144 sloped roofs | 1123 → 1073 | ×1.06 (0.93–1.13) |
| 13 Gross + 19 largest originals | 2608 → 1806 | ×1.42 (1.33–1.53) |

--expect: 108 of 108 equal; refused: []

**Unculled asset draws** (main + shadow, culling off; triangles are the same in both trees)

| Workload | Main 0.10 | This | Triangles |
| --- | --- | --- | --- |
| Blank map (null control) | 0 + 0 | 0 + 0 | 0 |
| 32 copies of the largest design | 1,568 + 1,472 | 200 + 104 | 2,766,336 |
| 32 distinct originals, most meshes | 1,729 + 1,655 | 416 + 342 | 1,224,996 |
| 32 distinct originals, most triangles | 1,696 + 1,622 | 408 + 334 | 1,247,106 |
| 32 Gross houses | 3,799 + 3,799 | 168 + 168 | 830,576 |
| 200 axis-aligned wall runs | 3 + 3 | 3 + 3 | 921,600 |
| 2,400 free-angle wall runs | 2,402 + 2,402 | 3 + 3 | 623,448 |
| 144 sloped roofs | 432 + 432 | 5 + 5 | 4,992 |
| 13 Gross + 19 largest originals | 2,743 + 2,692 | 435 + 384 | 1,216,554 |
