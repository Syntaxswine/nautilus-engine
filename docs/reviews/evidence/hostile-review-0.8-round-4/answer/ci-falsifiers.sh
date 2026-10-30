#!/bin/bash
# Can the CI gate (npm run review:asset-counts: --counts-only --backend swiftshader --expect)
# fail? Round 4's Q5 (the editor's rebuild never cuts prefabs, which passed the gate at
# cb720d8), K3 (no per-copy culling) as the control that must be refused, and the unmutated
# build, which must pass. Each is a built copy of the commit (make-tree.mjs); the bench is
# the copy's own.
set -u
R4="<scratch>"; W="<author>"
COMMIT="${1:?commit}"; O="$R4/ci-gate"; mkdir -p "$O"
for m in none q5-rebuild k3; do
  T="$R4/trees/gate-$m"; rm -rf "$T"
  if [ "$m" = none ]; then ( cd "$R4" && node make-tree.mjs "$W" "$COMMIT" "trees/gate-$m" ) > "$O/$m.log" 2>&1
  else ( cd "$R4" && node make-tree.mjs "$W" "$COMMIT" "trees/gate-$m" --edits "edits/$m.json" ) > "$O/$m.log" 2>&1; fi
  cp -r "$W/artifacts/bench/maps" "$T/maps"
  ( cd "$T" && node tools/bench-asset-rendering.mjs --editor --counts-only --backend swiftshader --expect --b "$T" --maps "$T/maps" --out "$O/$m.json" ) >> "$O/$m.log" 2>&1; echo "GATE_EXIT $?" >> "$O/$m.log"
  rm -rf "$T"
done
echo "$(date +%H:%M:%S) ci-falsifiers done" >> "$O/done.txt"
