#!/bin/bash
# Round 4 GPU jobs, part 2 (quiet box): the beyond-the-record lamp maps, then CPU profiles of
# the isolated asset frames, InstancedMesh (1518afe) against CopyBatch (cb720d8).
set -u
S="$(cd "$(dirname "$0")/../.." && pwd)"; R="$S/artifacts/r08-4"; SC="${R4_SCRATCH:?set R4_SCRATCH}"
bash "$R/ab-percopy-w1.sh"
bash "$R/beyond.sh"
mkdir -p "$R/profiles"
for map in w4-32-gross l4-32-gross-lamps; do
  for arm in inst cand; do
    tree=$([ $arm = inst ] && echo "$SC/tree-1518afe" || echo "$S")
    echo "$(date +%H:%M:%S) profile $arm $map" >> "$R/timing/load.txt"
    node "$R/profile-frames.mjs" "$tree" "$S/artifacts/bench/maps/$map.json" overview --assets --frames 60 --out "$R/profiles/$arm-$map.json" > "$R/profiles/$arm-$map.log" 2>&1; echo "EXIT $?" >> "$R/profiles/$arm-$map.log"
  done
done
for arm in inst cand; do
  tree=$([ $arm = inst ] && echo "$SC/tree-1518afe" || echo "$S")
  echo "$(date +%H:%M:%S) profile $arm l1 whole frame" >> "$R/timing/load.txt"
  node "$R/profile-frames.mjs" "$tree" "$S/artifacts/bench/maps/l1-32x-largest-lamps.json" overview --frames 60 --out "$R/profiles/$arm-l1-whole.json" > "$R/profiles/$arm-l1-whole.log" 2>&1; echo "EXIT $?" >> "$R/profiles/$arm-l1-whole.log"
done
echo "$(date +%H:%M:%S) chain2 done load $(powershell -NoProfile -Command '(Get-CimInstance Win32_Processor).LoadPercentage')%" >> "$R/timing/load.txt"
