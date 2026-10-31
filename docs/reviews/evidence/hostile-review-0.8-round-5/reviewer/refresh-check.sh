#!/bin/bash
# Round 5 (SF-G): settings and hooks the digest's key does not see, each applied to a built copy
# of the answer (git archive of the commit + one edit, make-tree.mjs, outside any work tree) and
# taken through the documented refresh, as rounds 3 and 4 ran it (the exports, then the registry,
# which re-verifies every digest), then tools/check.mjs, the digest/catalogue tests and the whole
# suite; then rebuilt, so the copy's editor can be photographed (pixels-mutants). Round 3's G11 is
# the control the refresh must refuse.
#   bash refresh-check.sh <commit> <scratch> <edit> [<edit> ...]
set -u
S="$(cd "$(dirname "$0")/../.." && pwd)"; R="$S/artifacts/r08-5"; COMMIT="${1:?commit}"; SC="${2:?scratch}"; shift 2
O="$R/refreshed"; mkdir -p "$O" "$SC/trees"
for m in "$@"; do
  T="$SC/trees/refresh-$m"; L="$O/$m.log"; : > "$L"; rm -rf "$T"
  ( cd "$R" && node make-tree.mjs "$S" "$COMMIT" "$T" --edits "edits/$m.json" ) >> "$L" 2>&1 || { echo "MAKE_FAILED" >> "$L"; continue; }
  ( cd "$T" && node tools/build-building-assets.mjs ) >> "$L" 2>&1; echo "EXPORTS_EXIT $?" >> "$L"
  ( cd "$T" && node tools/prefab-original-catalog.mjs --write ) >> "$L" 2>&1; echo "REGISTRY_EXIT $?" >> "$L"
  ( cd "$T" && node tools/check.mjs ) >> "$L" 2>&1; echo "CHECK_EXIT $?" >> "$L"
  ( cd "$T" && node --test --test-timeout=300000 tests/building-geometry.test.mjs tests/building-catalog.test.mjs tests/shared-assets.test.mjs tests/prefab-display-batches.test.mjs ) > "$O/$m-digest-tests.log" 2>&1; echo "DIGEST_TESTS_EXIT $?" >> "$L"
  ( cd "$T" && node --test --test-timeout=300000 tests/*.test.mjs ) > "$O/$m-suite.log" 2>&1; echo "SUITE_EXIT $?" >> "$L"
  grep -E "^. (tests|pass|fail|cancelled) " "$O/$m-suite.log" | tr '\n' ' ' >> "$L"; echo >> "$L"
  ( cd "$T" && node tools/build.mjs ) > "$O/$m-build.log" 2>&1; echo "REBUILD_EXIT $?" >> "$L"
  echo "$(date +%H:%M:%S) $m done" >> "$O/done.txt"
done
