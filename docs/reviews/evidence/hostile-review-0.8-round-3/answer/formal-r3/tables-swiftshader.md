Backend swiftshader; runs 2; frames 60 x 4 blocks; trees a fb35277 b d7b38bf; swiftshader 156.0.4314.56 ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero) (0x0000C0DE)), SwiftShader driver) {"canvas":[1056,916],"multiDraw":true,"gpuTimer":true,"maxTextures":32,"maxCombinedTextures":64,"maxVertexTextures":32}

### Assets only (direct)

| map | overview | close | far | cutaway |
|---|---|---|---|---|
| l1-32x-largest-lamps | — | — | — | — |
| l1-blank | — | — | — | — |
| l7-blank | — | — | — | — |
| l7-mixed-13-gross-19-largest-lamps | — | — | — | — |
| w0-blank | — | — | — | — |
| w1-32x-largest | — | — | — | — |
| w4-32-gross | — | — | — | — |
| w7-mixed-13-gross-19-largest | — | — | — | — |

### Whole frame

| map | overview | close | far | cutaway |
|---|---|---|---|---|
| l1-32x-largest-lamps | ×0.96 (0.96–0.97) | ×0.97 (0.97–0.97) | ×0.97 (0.96–0.98) | ×1.00 (1.00–1.01) |
| l1-blank | ×1.00 (1.00–1.00) | ×1.00 (0.99–1.01) | ×1.00 (1.00–1.01) | ×0.99 (0.99–1.00) |
| l7-blank | ×1.00 (1.00–1.00) | ×0.98 (0.98–0.99) | ×1.00 (1.00–1.00) | ×1.00 (1.00–1.00) |
| l7-mixed-13-gross-19-largest-lamps | ×1.02 (1.02–1.02) | ×1.00 (1.00–1.01) | ×1.03 (1.01–1.05) | ×1.01 (1.01–1.01) |
| w0-blank | ×1.00 (1.00–1.00) | ×1.00 (1.00–1.01) | ×1.00 (1.00–1.00) | ×1.00 (0.99–1.00) |
| w1-32x-largest | ×0.97 (0.97–0.98) | ×0.95 (0.93–0.97) | ×0.97 (0.97–0.98) | ×0.98 (0.98–0.98) |
| w4-32-gross | ×1.03 (1.02–1.04) | ×1.01 (1.01–1.02) | ×1.02 (1.01–1.02) | ×1.01 (1.01–1.01) |
| w7-mixed-13-gross-19-largest | ×1.04 (1.04–1.04) | ×1.04 (1.03–1.04) | ×1.03 (1.02–1.04) | ×1.02 (1.01–1.02) |

### GPU time, assets only (A ms → B ms, speedup)

| map | overview | close | far | cutaway |
|---|---|---|---|---|
| l1-32x-largest-lamps | — | — | — | — |
| l1-blank | — | — | — | — |
| l7-blank | — | — | — | — |
| l7-mixed-13-gross-19-largest-lamps | — | — | — | — |
| w0-blank | — | — | — | — |
| w1-32x-largest | — | — | — | — |
| w4-32-gross | — | — | — | — |
| w7-mixed-13-gross-19-largest | — | — | — | — |

### Culled asset draws and triangles (A → B, first run)

| map | overview | close | far | cutaway |
|---|---|---|---|---|

--expect: 0 headless checks, 0 culled checks; refused: 0

### Pixels (A → B, run 0; repeat = run 1 of A identical)

| map | view | differ | max | ≤2 levels | strong ties | unexplained blobs (count, largest) | repeat |
|---|---|---|---|---|---|---|---|
| l1-32x-largest-lamps | overview | 20 | 34 | 7 | 2 | 17, 2/1/1/1/1 | true |
| l1-32x-largest-lamps | close | 128 | 76 | 80 | 44 | 52, 7/6/4/4/4 | true |
| l1-32x-largest-lamps | far | 682 | 81 | 654 | 26 | 91, 170/107/90/70/50 | true |
| l1-32x-largest-lamps | cutaway | 12 | 7 | 6 | 0 | 11, 2/1/1/1/1 | true |
| l1-blank | overview | 0 | 0 | 0 | 0 | 0, — | true |
| l1-blank | close | 0 | 0 | 0 | 0 | 0, — | true |
| l1-blank | far | 0 | 0 | 0 | 0 | 0, — | true |
| l1-blank | cutaway | 0 | 0 | 0 | 0 | 0, — | true |
| l7-blank | overview | 0 | 0 | 0 | 0 | 0, — | true |
| l7-blank | close | 0 | 0 | 0 | 0 | 0, — | true |
| l7-blank | far | 0 | 0 | 0 | 0 | 0, — | true |
| l7-blank | cutaway | 0 | 0 | 0 | 0 | 0, — | true |
| l7-mixed-13-gross-19-largest-lamps | overview | 0 | 0 | 0 | 0 | 0, — | true |
| l7-mixed-13-gross-19-largest-lamps | close | 0 | 0 | 0 | 0 | 0, — | true |
| l7-mixed-13-gross-19-largest-lamps | far | 0 | 0 | 0 | 0 | 0, — | true |
| l7-mixed-13-gross-19-largest-lamps | cutaway | 1 | 1 | 1 | 0 | 1, 1 | true |
| w0-blank | overview | 0 | 0 | 0 | 0 | 0, — | true |
| w0-blank | close | 0 | 0 | 0 | 0 | 0, — | true |
| w0-blank | far | 0 | 0 | 0 | 0 | 0, — | true |
| w0-blank | cutaway | 0 | 0 | 0 | 0 | 0, — | true |
| w1-32x-largest | overview | 20 | 34 | 7 | 2 | 17, 2/1/1/1/1 | true |
| w1-32x-largest | close | 128 | 76 | 80 | 44 | 52, 7/6/4/4/4 | true |
| w1-32x-largest | far | 682 | 81 | 654 | 26 | 91, 170/107/90/70/50 | true |
| w1-32x-largest | cutaway | 11 | 7 | 5 | 0 | 10, 2/1/1/1/1 | true |
| w4-32-gross | overview | 30 | 110 | 6 | 14 | 16, 1/1/1/1/1 | true |
| w4-32-gross | close | 215 | 119 | 191 | 21 | 54, 81/47/7/4/3 | true |
| w4-32-gross | far | 1402 | 74 | 1392 | 5 | 210, 385/245/135/67/26 | true |
| w4-32-gross | cutaway | 54 | 131 | 1 | 45 | 6, 4/1/1/1/1 | true |
| w7-mixed-13-gross-19-largest | overview | 0 | 0 | 0 | 0 | 0, — | true |
| w7-mixed-13-gross-19-largest | close | 0 | 0 | 0 | 0 | 0, — | true |
| w7-mixed-13-gross-19-largest | far | 0 | 0 | 0 | 0 | 0, — | true |
| w7-mixed-13-gross-19-largest | cutaway | 3 | 1 | 3 | 0 | 1, 3 | true |
