#!/bin/bash
# Round 4's Q7, Q8 and Q10 (and round 3's G11 as the control that must be refused), each
# applied to a built copy of the answer and taken through the documented refresh (the
# exports, then the registry, which re-verifies the digests), then the check, the
# digest/catalogue tests and the suite: round 4's refresh-check.sh on this answer's commit.
set -u
R4="<scratch>"; W="<author>"
COMMIT="${1:?commit}"; O="$R4/refreshed"; mkdir -p "$O"
for m in q7 q8 q10 g11; do
  T="$R4/trees/refresh-$m"; L="$O/$m.log"; : > "$L"; rm -rf "$T"
  ( cd "$R4" && node make-tree.mjs "$W" "$COMMIT" "trees/refresh-$m" --edits "edits/$m.json" ) >> "$L" 2>&1 || { echo "MAKE_FAILED" >> "$L"; continue; }
  ( cd "$T" && node tools/build-building-assets.mjs ) >> "$L" 2>&1; echo "EXPORTS_EXIT $?" >> "$L"
  ( cd "$T" && node tools/prefab-original-catalog.mjs --write ) >> "$L" 2>&1; echo "REGISTRY_EXIT $?" >> "$L"
  ( cd "$T" && node tools/check.mjs ) >> "$L" 2>&1; echo "CHECK_EXIT $?" >> "$L"
  ( cd "$T" && node --test --test-timeout=300000 tests/building-geometry.test.mjs tests/building-catalog.test.mjs tests/shared-assets.test.mjs tests/prefab-display-batches.test.mjs ) > "$O/$m-digest-tests.log" 2>&1; echo "DIGEST_TESTS_EXIT $?" >> "$L"
  ( cd "$T" && node --test --test-timeout=300000 tests/*.test.mjs ) > "$O/$m-suite.log" 2>&1; echo "SUITE_EXIT $?" >> "$L"
  grep -E "^. (tests|pass|fail|cancelled) " "$O/$m-suite.log" | tr '\n' ' ' >> "$L"; echo >> "$L"
  rm -rf "$T"
done
echo "$(date +%H:%M:%S) refresh-check done" >> "$O/done.txt"
