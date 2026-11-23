# Sources and notices

Native goat/donkey geometry, rigs and paint remain byte-preserved in the existing AFT `781246a668c723d5a4c5463e70534cc04b6a5641` snapshot. This adapter uses the existing shared Three namespace and retains its MIT notice. Model/resource hashes and bounds come from the reviewed actor intake; no model is resized.

The exact Farmyard `279d2d34786b3e6e5c5baeeac6898e60030afdbe` `sites/tactical-animal/dist/aft/tactics/worker-locomotion.js` bytes are preserved in `source/worker-locomotion.js.original`. `locomotion.js` is the separate mammal-only adapter described in `source.json`; it retains the source's distance-driven gait/IK and refuses unsupported bird/equipment roles. Original bytes are never loaded as a second Three/runtime graph.

The user's donor projects include mixed or unspecified per-file rights. This provenance preserves original ownership and notices and adds no blanket redistribution grant. The repository's root `NOTICE.md` and vendored Three license remain applicable. This candidate changes no donor checkout, vendor byte or consumer pin.

`model-paint.js` is a separate private ownership adaptation of the preserved AFT `dist/tactics/horse-model-paint.js` above (SHA-256 `3e4db27f7267fa1d370b96688f6c695c3e98e5bbc022c655b9e776c20734f407`). It preserves projection/shader math, program keys and full-resolution paint. The exact source/adapter hashes and bounded changes are recorded in `docs/reviews/native-paint-lifecycle/paint-source.json`. `tools/intake-native-paint.mjs` reproduces the adaptation from the authenticated Git object. No original vendor file was edited.
