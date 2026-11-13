# Fresh walking pace

Use Farmyard's **7.2 m/s normal standing walk** for fresh shared interaction actors,
the stock player yard and Night Ledger. `DEFAULT_WALK_SPEED_MPS` is exported by
the public interactions entry and supplies all three defaults. Explicit speeds
win. Actor and complete-world loads validate stored speed, pose, traversal and
resources without converting, refilling or replaying them.

The [donor record](donor.json) binds full reviewed Farmyard commit
`7cd3d56e62a8087133a9fdf2f521cf92d310d6fd`, exact Git blobs, SHA-256 and byte sizes.
`movementSpeed` at `sites/tactical-animal/dist/solo-game.js:46` selects 7.2 for
ordinary standing walk. Its separate realtime branch is 14.4; running, sneaking
and posture multipliers are outside this adoption. `movement-runtime.md` confirms
that the global doubling happened once and walking uses the native gait unchanged.
The existing byte-preserved original module and notices remain untouched; no donor
runtime is imported or executed for this numeric default.

| Criterion | Existing 2 m/s shared / 3 m/s stock | Farmyard 7.2 m/s recommendation |
| --- | --- | --- |
| Accuracy | Slower traversal, but neither value has physical calibration here. | This is an arcade pace, not a true-to-life walking claim. Continuous body/support checks still govern accepted travel. |
| Efficiency | Same input and query pipeline. | Code-based estimate: changing a scalar adds no clock or per-frame service. Longer sweeps can encounter more nearby geometry; no CPU improvement or benchmark claim. |
| Narrative | Deliberate pace can suit slower tactical profiles. | Subjective preference for responsive travel across Night Ledger's 64 m ground and fresh shared-player examples, consistent with Farmyard's requested feel. |

Implemented recommendation: prefer 7.2 for fresh shared/stock players. Keep explicit
2, 3 and other supported speeds for slower games and saved characters. This does
not adopt sprint/stance/AP/stamina policy, alter cars/trains, or change native rigs.
Native animation still follows accepted physical travel, including contact slides.

Example clicks remain capped at half a metre and a quarter second, so slower
explicit speeds stay within the one-second API limit. Deterministic starter, parts
and golden paths use distance / actor speed where their old durations encoded a
particular destination; collision, confirmed-state and partial-save assertions
remain in place. New tests exercise faster sweeps and exact legacy loads.
The byte-exact published parts ABI wire fixture explicitly retains its original
2 m/s actor; its generator reproduces that compatibility record rather than
rewriting historical checkpoint and acceptance bytes.

The new bounded registration is based on merged door commit
`a06e80b0312fa259a9c983fa81aa7ca6e669bfeb`. It supplies authenticated preimages to
the accepted audit chain while sending actual new bytes to the index port. Previous
source/package/build proof and donor pins remain historical and byte-identical.
