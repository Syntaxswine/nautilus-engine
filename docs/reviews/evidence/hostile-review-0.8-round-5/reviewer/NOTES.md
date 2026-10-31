# Round 5 working notes (not the review)

- 19:37 load 3 %, 45 GB free. Sandbox 059e71a clean, dist built 19:35; baseline fb35277 clean, dist 04:47.
- Maps regenerated from 059e71a's workloads.mjs: identical to artifacts/bench/maps (27).
- Per-copy tree (instancing:false) built from 059e71a: dist differs from the sandbox's in app/prefab-scene.js only.
- clusters.mjs: w1 one cluster of 32 (8 CopyBatches, union radius 115-126 m); w8 three of 8 + octagon 6+2 (24 of 32 batched, 53 CopyBatches, radius 43-58 m); w2/w3/w4/w7 none batched; g1 (mine) one cluster of 32 (17 CopyBatches, radius 63-71 m).
- Formal JSON (answer) re-derived: 66 views, x2 by median 63, every run 61; own only on walls; SF-I triangle ranges reproduce.
- MAX_BUILDINGS = 32 per map (packages/prefab-core/index.js:10): 32 copies is the largest possible cluster.
- generateBuildingLayout pitch = maxSpan + 2*clearance + 4 (27 m for Gross, clearance 2): never links (2r about 20-24 m), so generated districts draw per copy.
- Digest recorded with atlas null (buildingDigests -> createBuildingModel(T,id,{lod})): materialsFor's map is null in every pinned digest.
- three r180: shaderName = material.name in real parameters (three.module.js:6960); digest stub uses m.type, renderer null.
- material.onBeforeRender called per draw (three.module.js:16854); digest refuses only OWN function keys.
- ee7c18e still reachable only from codex/nautilus-art (MF2).
