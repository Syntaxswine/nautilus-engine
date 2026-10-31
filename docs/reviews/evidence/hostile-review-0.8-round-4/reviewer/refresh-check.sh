#!/bin/bash
# Round 4: Q7, Q8 and Q10 fail tools/check.mjs only as stale exports. Here each is applied to a
# built copy, the documented refresh is run (npm run build:buildings, then the registry,
# as round 3 ran it for G11), and then the check, the digest/catalogue tests and the suite.
set -u
S="$(cd "$(dirname "$0")/../.." && pwd)"; R="$S/artifacts/r08-4"; SC="${R4_SCRATCH:?set R4_SCRATCH}"; O="$R/mutation/refreshed"; mkdir -p "$O"
for m in q7 q8 q10; do
  T="$SC/tree-$m-refreshed"; L="$O/$m.log"; : > "$L"
  node "$R/make-tree.mjs" cb720d8 "$T" "$R/edits/$m.json" >> "$L" 2>&1 || { echo "MAKE_FAILED" >> "$L"; continue; }
  ( cd "$T" && node tools/build-building-assets.mjs ) >> "$L" 2>&1; echo "EXPORTS_EXIT $?" >> "$L"
  ( cd "$T" && node tools/prefab-original-catalog.mjs --write ) >> "$L" 2>&1; echo "REGISTRY_EXIT $?" >> "$L"
  ( cd "$T" && node tools/check.mjs ) >> "$L" 2>&1; echo "CHECK_EXIT $?" >> "$L"
  ( cd "$T" && node --test --test-timeout=300000 tests/building-geometry.test.mjs tests/building-catalog.test.mjs tests/shared-assets.test.mjs tests/prefab-display-batches.test.mjs ) > "$O/$m-digest-tests.log" 2>&1; echo "DIGEST_TESTS_EXIT $?" >> "$L"
  ( cd "$T" && node --test --test-timeout=300000 tests/*.test.mjs ) > "$O/$m-suite.log" 2>&1; echo "SUITE_EXIT $?" >> "$L"
  grep -E "^. (tests|pass|fail|cancelled) " "$O/$m-suite.log" | tr '\n' ' ' >> "$L"; echo >> "$L"
done
echo "$(date +%H:%M:%S) refresh-check done" >> "$O/done.txt"
