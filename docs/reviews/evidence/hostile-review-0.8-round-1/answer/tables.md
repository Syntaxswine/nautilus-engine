
### Editor, ANGLE (NVIDIA, NVIDIA GeForce RTX 3080 (0x0000220A) Direct3D11 vs_5_0 ps_5_0, D3D11) (Edge 156.0.4314.50), 6 runs × 4 A/B blocks × 30 frames


**overview**

| Workload | Draw calls (main → this) | Frame ms (main → this) | Speedup (range over runs) | Assets' share ms (main → this) | Assets' speedup |
| --- | --- | --- | --- | --- | --- |
| w0-blank | 1121 → 1121 | 5.91 → 5.82 | ×1.00 (0.93–1.05) | — | — |
| w1-32x-largest | 4155 → 1919 | 16.8 → 10.0 | ×1.65 (1.55–1.92) | 10.9 → 4.18 | ×2.61 |
| w2-32-distinct-most-meshes | 4480 → 1877 | 27.9 → 12.8 | ×2.10 (1.90–2.48) | 22.0 → 6.97 | ×3.15 |
| w3-32-distinct-most-triangles | 4425 → 1863 | 27.5 → 12.7 | ×2.26 (1.98–2.35) | 21.6 → 6.84 | ×3.16 |
| w4-32-gross | 8657 → 1941 | 35.4 → 9.61 | ×3.76 (3.42–4.08) | 29.5 → 3.79 | ×7.80 |
| w5a-walls-axis | 1127 → 1127 | 6.96 → 6.66 | ×1.04 (0.54–1.12) | 1.05 → 0.84 | ×1.25 |
| w5b-walls-free-angle | 5916 → 1127 | 37.5 → 6.70 | ×5.19 (4.76–5.60) | 31.5 → 0.88 | ×36.06 |
| w6-roofs-144 | 1985 → 1985 | 11.5 → 11.5 | ×1.03 (0.86–1.08) | 5.54 → 5.64 | ×0.98 |
| w7-mixed-13-gross-19-largest | 6542 → 1940 | 37.5 → 13.4 | ×2.79 (2.40–2.93) | 31.6 → 7.61 | ×4.15 |

**close**

| Workload | Draw calls (main → this) | Frame ms (main → this) | Speedup (range over runs) | Assets' share ms (main → this) | Assets' speedup |
| --- | --- | --- | --- | --- | --- |
| w0-blank | 419 → 419 | 2.96 → 3.24 | ×0.97 (0.84–1.02) | — | — |
| w1-32x-largest | 1678 → 732 | 8.06 → 5.15 | ×1.51 (1.40–1.87) | 5.10 → 1.91 | ×2.67 |
| w2-32-distinct-most-meshes | 1934 → 720 | 14.0 → 5.59 | ×2.32 (2.20–3.06) | 11.0 → 2.35 | ×4.68 |
| w3-32-distinct-most-triangles | 1900 → 711 | 14.2 → 5.92 | ×2.38 (2.15–2.63) | 11.2 → 2.69 | ×4.18 |
| w4-32-gross | 3894 → 785 | 20.0 → 5.39 | ×3.77 (3.38–4.34) | 17.1 → 2.15 | ×7.94 |
| w5a-walls-axis | 425 → 425 | 3.98 → 3.99 | ×1.03 (0.94–1.13) | 1.01 → 0.75 | ×1.35 |
| w5b-walls-free-angle | 1618 → 425 | 11.9 → 4.06 | ×2.97 (2.80–3.28) | 8.90 → 0.83 | ×10.79 |
| w6-roofs-144 | 701 → 701 | 4.90 → 5.06 | ×0.99 (0.91–1.04) | 1.94 → 1.83 | ×1.06 |
| w7-mixed-13-gross-19-largest | 2333 → 736 | 17.2 → 6.18 | ×2.83 (1.97–2.99) | 14.2 → 2.94 | ×4.84 |

**cutaway**

| Workload | Draw calls (main → this) | Frame ms (main → this) | Speedup (range over runs) | Assets' share ms (main → this) | Assets' speedup |
| --- | --- | --- | --- | --- | --- |
| w0-blank | 1121 → 1121 | 5.46 → 5.69 | ×0.98 (0.89–1.03) | — | — |
| w1-32x-largest | 1948 → 1567 | 8.35 → 7.22 | ×1.26 (1.03–1.37) | 2.89 → 1.54 | ×1.88 |
| w2-32-distinct-most-meshes | 2596 → 1512 | 15.6 → 8.29 | ×1.89 (1.79–2.02) | 10.2 → 2.60 | ×3.91 |
| w3-32-distinct-most-triangles | 2546 → 1501 | 16.3 → 8.75 | ×1.92 (1.51–2.07) | 10.8 → 3.06 | ×3.52 |
| w4-32-gross | 4486 → 1874 | 21.5 → 10.8 | ×2.05 (1.92–2.14) | 16.1 → 5.11 | ×3.14 |
| w5a-walls-axis | 1127 → 1127 | 6.21 → 6.40 | ×0.98 (0.93–1.05) | 0.75 → 0.71 | ×1.05 |
| w5b-walls-free-angle | 1920 → 1123 | 10.8 → 6.01 | ×1.80 (1.65–1.98) | 5.37 → 0.33 | ×16.54 |
| w6-roofs-144 | 1121 → 1121 | 6.40 → 6.30 | ×0.96 (0.89–1.08) | 0.94 → 0.61 | ×1.53 |
| w7-mixed-13-gross-19-largest | 3366 → 1663 | 22.1 → 11.0 | ×2.12 (1.89–2.42) | 16.7 → 5.31 | ×3.14 |

**Open time** (blank first, then the workload)

| Workload | ms (main → this) | Speedup (range) | Assets' share ms (main → this) |
| --- | --- | --- | --- |
| w0-blank | 1339 → 1342 | ×0.94 (0.85–1.18) | — |
| w1-32x-largest | 1569 → 1439 | ×1.06 (0.91–1.23) | 230 → 98 |
| w2-32-distinct-most-meshes | 3202 → 2274 | ×1.42 (1.26–1.54) | 1863 → 932 |
| w3-32-distinct-most-triangles | 3177 → 2130 | ×1.49 (1.35–1.72) | 1838 → 789 |
| w4-32-gross | 1903 → 1774 | ×1.10 (0.90–1.17) | 564 → 432 |
| w5a-walls-axis | 1436 → 1517 | ×0.91 (0.77–1.16) | 97 → 175 |
| w5b-walls-free-angle | 1557 → 1512 | ×0.98 (0.93–1.19) | 218 → 170 |
| w6-roofs-144 | 1426 → 1506 | ×0.92 (0.86–1.06) | 86 → 164 |
| w7-mixed-13-gross-19-largest | 3406 → 2356 | ×1.47 (1.37–1.59) | 2067 → 1014 |

served a {"files":337,"digest":"44fa643659a925bd56284fc0e9f68e6408f7000b83c2329b727c4c2bf5cbe223"} served b {"files":337,"digest":"dcfb07b7998536d5a2ff2eb2994b7811da352ff531598ecd206ab0e43a7ff35d"} trees {"a":{"dir":"<a>","head":"f6caeef309e56423fea5e32eb717533f33b59cbb","status":""},"b":{"dir":"<b>","head":"0ba89e0746c5779a2dea824dbea119102c885023","status":""}}

### Pixels, SwiftShader (Edge 156.0.4314.56), editor captures

| Workload | View | Differing pixels | Max delta | At depth ties | Tie pixels in frame | Repeat of main identical |
| --- | --- | --- | --- | --- | --- | --- |
| w0-blank | overview | 0 of 967296 | 0 | 0 | 1193 | true |
| w0-blank | close | 0 of 967296 | 0 | 0 | 96 | true |
| w0-blank | cutaway | 0 of 967296 | 0 | 0 | 1193 | true |
| w1-32x-largest | overview | 0 of 967296 | 0 | 0 | 901 | true |
| w1-32x-largest | close | 0 of 967296 | 0 | 0 | 192 | true |
| w1-32x-largest | cutaway | 8 of 967296 | 1 | 0 | 969 | true |
| w2-32-distinct-most-meshes | overview | 0 of 967296 | 0 | 0 | 1046 | true |
| w2-32-distinct-most-meshes | close | 7 of 967296 | 14 | 7 | 141 | true |
| w2-32-distinct-most-meshes | cutaway | 0 of 967296 | 0 | 0 | 1091 | true |
| w3-32-distinct-most-triangles | overview | 0 of 967296 | 0 | 0 | 1048 | true |
| w3-32-distinct-most-triangles | close | 0 of 967296 | 0 | 0 | 167 | true |
| w3-32-distinct-most-triangles | cutaway | 3 of 967296 | 1 | 0 | 1084 | true |
| w4-32-gross | overview | 0 of 967296 | 0 | 0 | 1437 | true |
| w4-32-gross | close | 0 of 967296 | 0 | 0 | 508 | true |
| w4-32-gross | cutaway | 0 of 967296 | 0 | 0 | 1431 | true |
| w5a-walls-axis | overview | 0 of 967296 | 0 | 0 | 3969 | true |
| w5a-walls-axis | close | 0 of 967296 | 0 | 0 | 3608 | true |
| w5a-walls-axis | cutaway | 0 of 967296 | 0 | 0 | 3669 | true |
| w5b-walls-free-angle | overview | 1021 of 967296 | 63 | 1021 | 7943 | true |
| w5b-walls-free-angle | close | 0 of 967296 | 0 | 0 | 3573 | true |
| w5b-walls-free-angle | cutaway | 76 of 967296 | 53 | 76 | 1970 | true |
| w6-roofs-144 | overview | 0 of 967296 | 0 | 0 | 978 | true |
| w6-roofs-144 | close | 0 of 967296 | 0 | 0 | 64 | true |
| w6-roofs-144 | cutaway | 0 of 967296 | 0 | 0 | 1193 | true |
| w7-mixed-13-gross-19-largest | overview | 0 of 967296 | 0 | 0 | 1168 | true |
| w7-mixed-13-gross-19-largest | close | 0 of 967296 | 0 | 0 | 168 | true |
| w7-mixed-13-gross-19-largest | cutaway | 3 of 967296 | 1 | 0 | 1206 | true |

**Draw calls on SwiftShader** (must equal the GPU counts)

w0-blank overview 1121→1121, close 419→419, cutaway 1121→1121
w1-32x-largest overview 4155→1919, close 1678→732, cutaway 1948→1567
w2-32-distinct-most-meshes overview 4480→1877, close 1934→720, cutaway 2596→1512
w3-32-distinct-most-triangles overview 4425→1863, close 1900→711, cutaway 2546→1501
w4-32-gross overview 8657→1941, close 3894→785, cutaway 4486→1874
w5a-walls-axis overview 1127→1127, close 425→425, cutaway 1127→1127
w5b-walls-free-angle overview 5916→1127, close 1618→425, cutaway 1920→1123
w6-roofs-144 overview 1985→1985, close 701→701, cutaway 1121→1121
w7-mixed-13-gross-19-largest overview 6542→1940, close 2333→736, cutaway 3366→1663

### Generator, Node v24.15.0, 8 alternating runs per arm

| LOD | main ms (range) | this ms (range) | Speedup | Identical designs |
| --- | --- | --- | --- | --- |
| game | 2579 (2442–2813) | 746 (676–846) | ×3.46 | 48/48 |
| authoring | 4642 (4552–4747) | 1354 (1287–1426) | ×3.43 | 48/48 |
