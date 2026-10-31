#!/bin/bash
# The answer's mutation run on the measured tree (1d2edb1, built, clean): an unmutated
# baseline of every test file the mutants use (it must pass), phase 1 (each mutant against its
# module's tests), then the survivors against the whole suite and tools/check.mjs.
set -u
R4="<scratch>"; M="<measured>"
O="$R4/mutation"; mkdir -p "$O"
echo "$(date +%H:%M:%S) start $(git -C "$M" --no-optional-locks rev-parse --short HEAD) [$(git -C "$M" --no-optional-locks status --porcelain)]" >> "$O/done.txt"
( cd "$M" && node --test --test-timeout=240000 tests/editor-copy-batch.test.mjs tests/prefab-display-batches.test.mjs tests/building-prefabs.test.mjs tests/prefab-providers.test.mjs tests/building-library-lifecycle.test.mjs tests/asset-draw-counts.test.mjs tests/building-geometry.test.mjs tests/building-catalog.test.mjs ) > "$O/baseline.log" 2>&1
echo "BASELINE_EXIT $?" >> "$O/baseline.log"
node "$R4/mutate-a4.mjs" "$M" "$O/phase1.json" > "$O/phase1.log" 2>&1; echo "P1_EXIT $?" >> "$O/phase1.log"
S=$(node -e "const r=JSON.parse(require('fs').readFileSync(process.argv[1],'utf8'));console.log(r.summary.survived.join(','))" "$O/phase1.json")
echo "survivors [$S]" >> "$O/done.txt"
if [ -n "$S" ]; then node "$R4/mutate-a4.mjs" "$M" "$O/confirm.json" --only "$S" --confirm > "$O/confirm.log" 2>&1; echo "CONFIRM_EXIT $?" >> "$O/confirm.log"; fi
echo "$(date +%H:%M:%S) mutation done [$(git -C "$M" --no-optional-locks status --porcelain)]" >> "$O/done.txt"
