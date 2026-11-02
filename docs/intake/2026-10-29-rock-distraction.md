# Recoverable rock distraction — combined acceptance

Nautilus 0.6.0 adds `item:rock`: pickup, a grenade-style aimed lob, one sound cue at actual first contact, quiet vertical settling after a wall/ceiling hit, and recovery. Eligible guards receive an investigation request for the sound point. Combat, confirmed threats and incapacitation keep priority. The playable yard demonstrates movement around its wall, search and return; the feature does not change a donor game or adoption pin.

## Reviewed inputs

All intake used immutable Git objects from reviewed main `8e962a233189129b8063001b2ee96a28403d2290`, never uncommitted worker files.

| Contribution | Fixed source commits |
| --- | --- |
| Original native-scale model | `9029dc11f4611ca46ea886ec9c03cbb6c0cfe3c5` |
| Headless core and final acceptance | `aff83ed8acb97daa7f512fb5529754377f0d48b1`, `2ba340fffdd723e28c66b5a5f5089f3c420a1053`, `577e9d1cc548863b59c9b43b539993eef56c4f72` |
| Reference consumer | `0c9ac73aad7b662edef7fcd83f9165b24cfa047b`, `a0b96b65fbc73eb8e7a7805120b9d9c6af569946` |
| UI tolerance and final evidence | `8d0724ac0ca9f02d8bb557de831bb6142be7be92`, `2ff8014691c6ec61f44f1ee58cdabfbb38ce2487`, `c5a844a68ca074506937724e220c9b3c59012d56` |

The [source record](../reviews/2026-10-29-rock-distraction.sources.json) identifies the unchanged AFT grenade-lob bytes/function, hashes, notices and excluded world/cast/fuse/damage closures. No donor snapshot or upstream pin changed. The original model's geometry remains unchanged; integration names its counts meshes/materials rather than claiming one draw call across renderer passes.

## Integration and design decision

Prefer the actual swept impact and explicit native heights for a stealth cue. The first candidate froze wall hits in the air; review required core-owned quiet gravity settling while preserving the first receipt. Independent review also found sparse collision arrays, ambiguous investigation IDs and impossible deep landed saves; all have fixes and regressions.

Accuracy: deterministic 90 Hz sphere chords and supporting-face classification provide bounded spatial consistency. Quiet falls preserve time and saved state. This does not calibrate acoustics, throwing skill, friction or bounce. Efficiency: code inspection bounds each call to 90 fixed steps/91 sweeps and hearing to 256 projected listeners; the original model has 54 triangles, one mesh/material and no textures. Those are counts, not CPU/GPU measurements. Narrative: the preferred stealth behavior gives a readable environmental clue while a guard retains a confirmed threat. This is a subjective recommendation for the three games' shared item foundation; they may tune reach, range and radius deliberately.

The public `./items` entry remains headless and imports only its own modules. `./items/three` uses the host Three namespace. Shared discovery, versioned rock/noise schemas and `nautilus-rock-items-v1` negotiation are explicit. Maps and blocks keep their existing formats. Hosts own inventory/cost transactions, command/event ledgers, release origins, collision, audibility and AI. Unsupported versions/features reject. No broad inventory, damage, alarm or AI framework is introduced.

## Acceptance

The combined branch passes `npm run check -- --tracked`, all **238 engine tests**, all **32 upstream regressions**, and `npm run build` with **362 module paths** checked. The offline installed-core proof uses only public exports and covers map/Tinderbox conformance plus rock pickup, silent preview, release, one first impact, protected guard priority, quiet wall settling, recovery and saved replay. Schemas resolve from the installed package; fixtures remain outside the distribution.

Both isolated real Edge workflows pass. Editor acceptance covers new schema URLs, authoring, generation, undo/redo, save/load, import/export, host capability rejection and mobile controls. Rock acceptance covers one actual thud/ring, high-wall interception, quiet support, original guard target, ground/wall recovery, replay, malformed saves, rejected actions, desktop/phone/keyboard controls and resource teardown. Final captures were visually inspected. [Worker visual evidence](../reviews/2026-10-29-rock-distraction-ui.md) and [architect acceptance data](../reviews/evidence/rock-distraction/architect-acceptance.json) preserve the inputs and results. Software WebGL is used for correctness; hardware performance remains unmeasured.

Disposable browsers and HTTP servers close through their owning APIs in finally. Cleanup receipts and live identity/port checks are retained with the evidence; no helper is retained. Main promotion, exact-head CI and the immutable release tag follow [release policy](../releasing.md). No Site is republished and its private audience stays unchanged.
