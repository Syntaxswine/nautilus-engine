#!/usr/bin/env bash
# Round 3: can --assets-only's isolation check and --expect fail? Two mutants of the
# bench's own page probe, run from a scratch copy of the candidate (tree-E1: its only
# change is in apps/editor/prefab-scene.js, which neither w2 nor w6 exercises, since
# neither repeats a design). The copy's tools/bench/editor-probe.js is edited, the
# bench is run, and the probe restored.
#   isolation-mutants.sh <scratch tree> <baseline> <sandbox maps dir> <out dir>
set -u
TREE="$1"; BASE="$2"; MAPS="$3"; OUT="$4"; mkdir -p "$OUT"; S="$OUT/summary.txt"; P="$TREE/tools/bench/editor-probe.js"
cp "$P" "$OUT/editor-probe.orig.js"
echo "started $(date -Iseconds)" > "$S"
edit() { node -e "const fs=require('fs');const [f,a,b]=process.argv.slice(1);const s=fs.readFileSync(f,'utf8');if(s.split(a).length!==2)throw Error('needle '+a);fs.writeFileSync(f,s.replace(a,()=>b));" "$P" "$1" "$2"; }
run() { local name="$1"; shift; (cd "$TREE" && node tools/bench-asset-rendering.mjs --editor --a "$BASE" --runs 2 --backend gpu --frames 5 --blocks 2 --opens 1 --assets-only --expect --maps "$MAPS" "$@" --out "$OUT/$name.json" > "$OUT/$name.log" 2>&1); echo "$name exit $? $(date -Iseconds)" >> "$S"; cp "$OUT/editor-probe.orig.js" "$P"; }
# X1: the asset set forgets the merged roofs.
edit "if (s.slopedRoofs?.merged) roots.add(s.slopedRoofs.merged.mesh);" ""
run X1-isolation-forgets-merged-roofs --scenes w0-blank,w6-roofs-144
# X2: --expect stops turning culling off.
edit "if (node.isMesh && node.frustumCulled) {node.frustumCulled = false; saved.push(node);}" ""
run X2-expect-keeps-culling --scenes w0-blank,w2-32-distinct-most-meshes
cmp -s "$P" "$OUT/editor-probe.orig.js" && echo "probe restored" >> "$S"
echo "finished $(date -Iseconds)" >> "$S"
