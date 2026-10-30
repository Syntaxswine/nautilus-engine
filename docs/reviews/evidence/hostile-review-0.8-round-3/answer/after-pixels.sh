#!/bin/bash
# Once the runs-vs-per-copy pixel check is done: the mutants the runs change touches (and
# those added since phase 1) at d7b38bf, round 3's I6/I7 against the whole suite, then the
# formal runs. One after another.
set -u
W="<measured>"; S="<scratch>"
until grep -q "PIX_EXIT" "$S/pix-v1-vs-v2.log" 2>/dev/null; do sleep 15; done
git -C "$W" checkout -q --detach d7b38bf
node "$S/mutate-a3.mjs" "$W" "$S/mutation/a3-runs.json" --only K3-no-per-copy-culling,K4-runs-draw-nothing,K5-table-rewritten-per-camera,K6-empty-sub-draws-trail,K13-runs-never-used,K14-run-spans-a-culled-copy,K15-shader-reads-draw-id-only,K16-runs-without-the-extension,P7-no-early-release,P8-release-leaves-copies-hidden,C5b-daylight-rule-refusal-off > "$S/mutation/a3-runs.log" 2>&1; echo "RUNS_EXIT $?" >> "$S/mutation/a3-runs.log"
node "$S/mutation/mutate-r3.mjs" "$W" "$S/mutation/r3-confirm-i6i7.json" --confirm --only I6-no-early-release,I7-release-leaves-copies-hidden > "$S/mutation/r3-confirm-i6i7.log" 2>&1; echo "R3CONFIRM_EXIT $?" >> "$S/mutation/r3-confirm-i6i7.log"
bash "$S/formal3.sh"
