# Rock distraction reference consumer

This is a small playable Nautilus reference consumer, based on reviewed engine commit
`8e962a233189129b8063001b2ee96a28403d2290`. It does not migrate AFT, Farmyard Commando
or Tinderbox, extend a map/save schema, or add a general inventory or stealth system.

## Ownership and fixed dependencies

- UI: `examples/rock-distraction.html`, `.css`, `.js`, and `-host.js`.
- Browser acceptance: `tools/review-rock-distraction.mjs`, using the existing bounded
  `withArtReview` lifecycle with output `artifacts/rock-distraction/`.
- Shared original rock model: exact Git object
  `9029dc11f4611ca46ea886ec9c03cbb6c0cfe3c5:packages/item-visuals/rock.js`.
  The source is imported unchanged; its author owns the model and public wiring.
- Headless item API: fixed checkpoint `aff83ed8acb97daa7f512fb5529754377f0d48b1`.
  No moving worker files are used as dependencies.

The consumer owns canonical player/world positions, inventory membership, command
receipts, collision geometry, hearing permission, guard priorities, pathfinding and
time. Inputs and snapshots are copied. The view reads presentation data rather than
using DOM text as authoritative game state.

## Interaction and presentation

The player starts beside a loose hand-sized rock. Pick up, choose a ground target,
and throw. Keyboard walking, pickup and throwing accompany touch buttons and a
ground aim interaction. A dotted preview communicates the lob. The hand-sized model
retains native scale, with a close view to make its shape legible on a phone. Large
terrain stones remain distinct from collectible loose rocks.

The same confirmed impact receipt drives the thud, visible sound ring and hearing
evaluation. Aiming, release and repeated settled updates do not make impact sounds.
Audio starts only through a user gesture and has a visible mute control.

One idle guard follows a route to the sound, searches, then returns. A distant guard
remains unaware; a guard already in combat keeps its existing priority and target.
Routes go around the yard wall. The sound target is the impact, never the player's
location. These are explicit demonstration policies, not a full hearing, combat or
stealth AI.

## Design evaluation

**Accuracy.** Prefer native metre positions, swept first-contact collision, and
separate body/action/presentation data over placing a noise marker at the cursor.
Geometry checks establish internal spatial consistency rather than surveyed
physics. Hearing distance is game tuning, not calibrated acoustics. No detailed
material transmission, aerodynamic drag, bounce or damage is claimed.

**Efficiency.** Prefer a bounded fixed-step host, one lightweight rock model and a
small route search at investigation/return transitions. The shared model records
54 triangles, one mesh/material and zero textures. Those are source/model counts,
not CPU/GPU benchmarks. Static, paused, hidden and offscreen views must not retain
a perpetual rendering loop. Browser/server helpers have a real bounded lifetime
and close through the owning APIs in finally.

**Narrative.** Subjective preference favors a quiet workshop yard and a brief,
readable landing cue. A visible change of guard direction followed by actual
walking makes the distraction useful to inspect. The engaged guard's stable
priority communicates the limit without an implementation-oriented player label.

## Acceptance

Run the four required project gates after fixed API integration, then:

```sh
node tools/review-rock-distraction.mjs
```

The runner uses isolated Edge on Windows and Chromium on Linux. It verifies the
actual model, pickup/count, pure preview and moving flight, first intercepted wall
impact, one thud/ring, eligible movement/search/return, far/engaged rejection,
re-pickup, invalid actions, midflight/late snapshot equivalence, reset, keyboard and
touch controls, narrow layout, reduced motion and lifecycle disposal.

The report, screenshots, helper identity and cleanup receipt are written under
`artifacts/rock-distraction/`. Selected final evidence will be copied into this
review's evidence directory after acceptance. This is an early reviewable UI checkpoint. Source checks pass, all 205 engine tests
and 32 upstream tests pass, and a direct consumer replay proves midflight restore
and subsequent pickup equivalence. Browser acceptance and build results are pending.
The current wall preset stops at 1.762 m; it is recoverable using the host's standing
hand position, but looks suspended. The architect approved a forthcoming core-owned
quiet settling step; this checkpoint adds no separate visual fall or second noise.



