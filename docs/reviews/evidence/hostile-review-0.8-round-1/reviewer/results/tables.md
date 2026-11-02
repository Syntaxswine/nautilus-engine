### Scene workloads in the built editor

| Workload | Draw calls / frame (shadow + main + composite) | Triangles / frame | Frame ms, RTX 3080 D3D11, shadows on | Frame ms, shadows off | Frame ms, SwiftShader | Cold open ms, D3D11 rig | Level-0 cutaway calls | Unique geometries / materials / programs |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| w0-blank | 1,121 (554 + 566 + 1) | 2,541,974 | 6.25 (4.5–11.8) | 3.25 (2.6–4) | 959 (953.1–965.6) | 1222 (1074.2–1271.3) | 1,121 | 90 / 32 / 19 |
| w1-32x-largest | 4,155 (2,026 + 2,128 + 1) | 5,307,446 | 14.9 (11.8–18.1) | 9.85 (8.3–11.7) | 1376.1 (1354.2–1426.6) | 1401.5 (1342.8–1642.5) | 1,948 | 136 / 41 / 23 |
| w2-32-distinct-most-meshes | 4,480 (2,209 + 2,270 + 1) | 3,766,342 | 25.55 (21.2–30) | 16.3 (13.6–19.4) | 1146 (1140.2–1161.2) | 2789 (2747.2–2972.2) | 2,596 | 1,745 / 332 / 23 |
| w3-32-distinct-most-triangles | 4,425 (2,176 + 2,248 + 1) | 3,788,864 | 24.65 (18.2–29.5) | 14.95 (13–16.2) | 1172.9 (1130.9–1180.9) | 2910.2 (2672.2–3030) | 2,546 | 1,712 / 324 / 23 |
| w4-32-gross | 8,657 (4,353 + 4,303 + 1) | 3,370,761 | 30.65 (28.1–35.9) | 19.35 (16.4–22.4) | 1139.2 (1137–1154.8) | 1635.5 (1470.7–1754.3) | 4,486 | 1,768 / 266 / 21 |
| w5a-walls-axis | 1,127 (557 + 569 + 1) | 3,463,574 | 7.1 (5–12.4) | 3.45 (2.9–4.8) | 1485.9 (1480.4–1594.2) | 1299.3 (1167.6–1390.8) | 1,127 | 91 / 35 / 19 |
| w5b-walls-free-angle | 5,916 (2,956 + 2,959 + 1) | 3,165,242 | 28.55 (24.8–34.9) | 16.8 (15.5–19.4) | 1383.5 (1378.2–1451.3) | 1437.8 (1377.3–1477.9) | 1,920 | 2,490 / 35 / 19 |
| w6-roofs-144 | 1,985 (986 + 998 + 1) | 2,546,966 | 11.85 (9.6–13.7) | 8.3 (7.1–12.2) | 1040.2 (1016.8–1050.1) | 1198.7 (1158.6–1484.6) | 1,121 | 234 / 464 / 25 |
| w7-mixed-13-gross-19-largest | 6,542 (3,246 + 3,295 + 1) | 3,758,312 | 29.4 (25.1–33) | 19.25 (15.8–23.4) | 1143.2 (1132–1182.3) | 2709.8 (2605.8–2930.1) | 3,366 | 2,907 / 450 / 24 |

### Where the meshes come from (overview view, all visible)

| Workload | Inherited AFT scene meshes | Prefab meshes (instances x template) | Template meshes (distinct) | Wall InstancedMeshes (instances) | Roof meshes (draw groups) |
| --- | --- | --- | --- | --- | --- |
| w0-blank | 567 | — | 0 | — | — |
| w1-32x-largest | 567 | 1,472 | 46 | — | — |
| w2-32-distinct-most-meshes | 567 | 1,655 | 1,655 | — | — |
| w3-32-distinct-most-triangles | 567 | 1,622 | 1,622 | — | — |
| w4-32-gross | 567 | 3,799 | 1,678 | — | — |
| w5a-walls-axis | 567 | — | 0 | 3 (38,400) | — |
| w5b-walls-free-angle | 567 | — | 0 | 2,402 (25,977) | — |
| w6-roofs-144 | 567 | — | 0 | — | 144 (432) |
| w7-mixed-13-gross-19-largest | 567 | 2,692 | 2,817 | — | — |

### The 48 original designs (createBuildingModel, headless)

| LOD | Meshes | of which door-leaf meshes | Door pivots | Triangles | Vertices | Attribute MiB | Materials created | JS calls to build all 48 (exact) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| game | 1,981 | 1,128 (57%) | 573 | 763,402 | 2,290,206 | 69.889 | 960 | 66,261,040 |
| authoring | 1,981 | 1,128 (57%) | 573 | 1,358,208 | 4,074,624 | 124.348 | 960 | 126,110,701 |

### Build time, headless Node (no inspector attached)

Sum of per-design medians: compileBuilding 52 ms, game geometry 2,273 ms, authoring geometry 4,006 ms.
32 instances of dockside-warehouse: public facade create() x32 6082.998 (3925.816–9032.517) ms, 1,472 geometries; editor-style template + 32 clones 134.194 (116.373–178.271) ms, 46 geometries.

### Tinderbox landmarks (Tinderbox renderer; Nautilus share)

| Landmark @ commit | Mesh nodes (draw calls per pass) | InstancedMesh batches | Drawn instances | Triangles | Geometries | Materials | Build ms (Node) | Calls inside Nautilus wall-runs.js | Sampled time in wall-runs.js |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| createAdministrationBuilding @ 43337a3 | 412 | 229 | 36,397 | 614,274 | 411 | 9 | 3840.381 (3628.161–4600.133) | 1,542 of 14,363,986 | 0.03% |
| createHorticulturalBuilding @ 988b4ac | 504 | 173 | 46,285 | 971,732 | 503 | 13 | 4340.073 (4156.246–5140.023) | 959 of 23,563,542 | 0.04% |
| createFisheriesBuilding @ f75499a | 1,166 | 689 | 35,242 | 1,078,034 | 1,144 | 14 | 4459.67 (4059.62–8350.125) | 2,185 of 91,986,583 | 0.01% |
| createHorticulturalBuilding @ a019fcf | 504 | 173 | 46,285 | 971,732 | 503 | 13 | 6387.495 (4154.191–7798.359) | 959 of 23,563,558 | 0.03% |
| createAdministrationBuilding @ 988b4ac | 412 | 229 | 36,397 | 614,274 | 411 | 9 | 5108.194 (2866.797–6394.035) | 1,542 of 14,363,987 | 0.01% |

### In-page prototypes (estimates, RTX 3080 D3D11)

| Prototype | Draw calls before → after | Frame ms before → after | Pixels differing / total (max channel delta) | Detail |
| --- | --- | --- | --- | --- |
| inst-w1 | 4,155 → 1,216 (−70.7%) | 16.2 → 5.55 (−65.7%) | 365 / 967,296 (60) | {"instancedMeshes":46} |
| share-w2 | 4,480 → 4,480 (−0%) | 21.55 → 22.55 (−-4.6%) | 0 / 967,296 (0) | {"prefabMaterialsBefore":300,"prefabMaterialsAfter":4} |
| walls-w5b | 5,916 → 1,127 (−80.9%) | 28.7 → 6.7 (−76.7%) | 96,706 / 967,296 (91) | {"mergedInstancedMeshes":3,"note":"Unit geometry scaled per instance: UVs stretch, so pixels are NOT identical; draw-call/frame-time upper bound only."} |
| noshadow-w3 | 4,425 → 2,803 (−36.7%) | 22.1 → 16.65 (−24.7%) | 42,115 / 967,296 (87) | {"meshesExcludedFromShadow":1622,"note":"Removes building shadows: NOT identical. Upper bound of the shadow-pass share."} |
| admin-in-editor | 1,121 → 1,951 (−-74%) | 10.6 → 12.75 (−-20.3%) | 92,721 / 967,296 (190) | {"buildMs":2071,"meshNodes":415,"instancedBatches":233} |
| control-no-change-w1 | 4,155 → 4,155 (−0%) | 15.65 → 13.75 (−12.1%) | 0 / 967,296 (0) | {"changed":0} |
| inst-opaque-w1 | 4,155 → 1,495 (−64%) | 16.6 → 8.4 (−49.4%) | 363 / 967,296 (60) | {"instancedOpaqueMeshes":43,"glassMeshesLeftAsClones":3} |
| doors-w2 | 4,480 → 2,683 (−40.1%) | 24 → 17.6 (−26.7%) | 0 / 967,296 (0) | {"doorLeafMeshes":982,"instancedMeshes":72,"mismatched":0} |

| Workload | scene.rebuild() ms | rebuildWalls() ms |
| --- | --- | --- |
| w0-blank | 113.45 (105–147.9) | 0 (0–0.1) |
| w2-32-distinct-most-meshes | 121.75 (109.2–154.8) | 0 (0–0.1) |
| w4-32-gross | 123.55 (95.3–144.5) | 0 (0–0.1) |
| w5a-walls-axis | 136.65 (108.1–184) | 17.55 (17.3–26.4) |
| w5b-walls-free-angle | 146.5 (129.5–185.8) | 25.95 (24.4–38.9) |
| w6-roofs-144 | 135.4 (125.1–186.7) | 0 (0–0) |

Public facade Gross houses (unbatched): raw meshes per house 691–1489, total 13,390 for 13 designs.

### Extended-world SVG view

| World | Surfaces | render() ms | Axon / plan SVG elements | Disclosure text |
| --- | --- | --- | --- | --- |
| native-fifteen-story.world.json | 352 | 17.4 (12.8–31.8) | 1,851 / 59 | 352 / 352 bodies in overview · 27 / 27 on working floor |
| synthetic-1600 | 1,600 | 63.2 (47.8–85.9) | 8,091 / 201 | 1600 / 1600 bodies in overview · 100 / 100 on working floor |
| synthetic-1600 with preview | 1,600 | 43.8 (42.4–65.2) | 8,091 / 201 | 1600 / 1600 bodies in overview · 100 / 100 on working floor |
| synthetic-6400 | 6,400 | 39.9 (38.4–43.5) | 8,091 / 801 | 1600 / 6400 bodies in overview · 400 / 400 on working floor |
| synthetic-6400 with preview | 6,400 | 44.5 (41.6–45.2) | 8,091 / 801 | 1600 / 6400 bodies in overview · 400 / 400 on working floor |
| synthetic-25600 | 25,600 | 52 (48.2–59.7) | 8,091 / 3,201 | 1600 / 25600 bodies in overview · 1600 / 1600 on working floor |
| synthetic-25600 with preview | 25,600 | 69.7 (58.5–88.6) | 8,091 / 3,201 | 1600 / 25600 bodies in overview · 1600 / 1600 on working floor |
