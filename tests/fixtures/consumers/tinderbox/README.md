# Tinderbox consumer-conformance evidence

`8a8405681614662a92f9b98fb9b9600bd06d3ad1/` contains unmodified bytes read from Git objects in the Tinderbox repository. Its `provenance.json` lists the exact commit, original paths, Git blob IDs, SHA-256 values and byte counts. Only the nine-module headless compiler/simulation closure and original contract/package evidence are copied. Embedded notices remain with the source; provenance does not grant a new license. This fixture is test-only and excluded from the engine distributable.

`flat-yard-recipe.json` is Nautilus-authored input for a 20×16 metre candidate scene in the full portable map. `flat-yard-save.json` is its deterministic version-1 adapter save, including the complete map sidecar. The recipe's seed, marker choice, outside-plane policy and exact wall/terrain placements are reviewable without opening the larger golden save. Tests reconstruct the map through the public engine API and compare the save byte-for-byte.

The original game tree is never executed in place or modified. Reproduction must read bytes using Git objects rather than the worktree; for each manifest path, Node's `execFileSync('git', ['-C', donorRepository, 'show', commit + ':' + sourcePath])` returns the exact Buffer to preserve. Verify both its SHA-256 and Git blob ID against the manifest. The pinned closure is evaluated in Node by the conformance tests, without browser or renderer globals.

Passing these tests proves the stated adapter profile against this committed game API. It does not change Tinderbox's production dependency or make the other games consumers.
