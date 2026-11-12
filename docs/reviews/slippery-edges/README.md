# Shared contact and the actual Night Ledger ground

Builder: Coder, Nautilus Engine. Base `98064c34c7bb4fc3c1343f2e450d570ec38615f2`,
tree `aa0588406b7b738822281f88b2ffbea40fd4948f`. Architect owns finished review,
main integration and the retained preview. Prior checkouts, that helper, consumer
pins and Sites publication are outside this change.

## Cause, units and design choice

The old session uses a car's final world AABB and continuous swept AABB as collision
shapes. A wall can occupy an empty rotated corner while missing the oriented body.
The deterministic regression demonstrates the old refusal and new actual travel
with unchanged dimensions. The photograph has no saved pose: this is equivalent
geometry reproduction, not recovery of its exact world coordinates.

Measured indexed native triangles, including wheels/mirrors, were transformed
through actual mesh matrices. Unused shared vertex attributes were excluded.
Edge 157.0.4341.46 measures the compact at 3.70 m long, 1.97000003 m wide and
1.4599973 m high (Float32 tolerances); the existing envelope is 3.70 × 1.97 ×
1.46 m. All eight bodies at wheel yaw 0/±30° remain covered. No model rescale or
envelope shrink is used.

**Accuracy:** prefer oriented continuous road contact and an upright walking disc.
World AABBs remain appropriate broad-phase/flat-support bounds, but fill empty
rotated corners as a final collider. Rounded convex casts retain thin-wall
protection; turning hulls retain analytic arc padding. Contact keeps 72% of the
input tangent and may stop yaw. Safe wheel yaw is constrained before integration
when a wider angle cannot fit a flush position. These are explicit low-speed
abstractions, not calibrated tyre friction, suspension or crash physics.

**Efficiency:** code-based estimate: one broad world query, small convex Minkowski
hulls, four slide contacts, up to 64 turning subintervals (normally a handful per
0.05 s step) and 22 first-contact refinements. Wheel-yaw refinement is bounded and
only used when a requested wider angle cannot fit. This costs more than an AABB
overlap, less structure than a mesh/rigid-body solver. No CPU/FPS advantage is
claimed. Geometry measurements and test durations are not frame-rate benchmarks.

**Narrative:** Night Ledger benefits when brushing an edge reads as slower
progress, head-on/closed corners stop, and visible clearances are usable. This is
a subjective preference supported by native browser review. Games centred on
crashes may need richer optional physics; tactical consumers can keep cheaper
stop policies. Recommendation: opt in this ground to `disc-slide-v1` and
`oriented-slide-v1`, preserve old stop profiles/checkpoint meaning, and refuse
implicit migration. Consumers own costs and charge actual accepted movement.

## Committed donor review

Read-only Git inspection found Farmyard Fighters travel/freePoint/treeSlide at
`7cd3d56e62a8087133a9fdf2f521cf92d310d6fd`, `solo-game.js`. Travel substeps, tries
clear axis movement after refusal and charges accepted distance. Tree sliding
projects a tangent and may choose a shoulder for nearly head-on input.

The complete original mixed module, transitive static script/JSON closure and
original notices are preserved separately: 104 files, 7,745,545 bytes, 192 recorded
static import edges. `.original` files retain exact Git bytes/hashes under
`vendor/farmyard-traversal/`. No moving branch or uncommitted file is read. No
original game script/resource is loaded or shipped as runtime. The independent
engine adapter uses continuous tangent contact, explicit slowdown, rounded walking
corners and no invented head-on shoulder. This is adaptation, not source-exact
donor parity. No game production pin changes.

## Integration and proof

Public `./traversal` is Node-safe math. Interactions/vehicles opt in independently;
actors, cars, door motion, continuous support, seats, leases and the one host clock
remain authoritative. A complete staged vehicle checkpoint lets the host persist
actor/seat candidates before publishing either side. Failed writes change neither.

The actual `apps/test-ground` registry/host/environment extends its reserved south
strip alongside its two original 16 m plots. Nine baselines verify actual motion,
contact, turns/reverse/exit, clear and blocked routes, plus unchanged door/rock
expectations. Broken acknowledgements and absent observations stay failed or
unavailable. Recipes, checkpoints, exact source/delivery identities, deterministic
replay, durable receipts and app-owned pause scopes remain in the same consumer.
The build adds ordinary `apps/test-ground/`; fresh-installed proof uses actual
archive bytes and public exports. No vehicle-yard rename/copy is the user entry.

The new guard authenticates all changed/new source, original closure hashes and
four exact distribution profiles before exposing exact PR59 preimages to the
accepted chase/road/player/art guards. Old ledgers are unchanged. Current bytes
reach index enforcement. Six shallow CI inventories deliberately fetch this base.

Focused proof covers both sides, reverse, flush steering-away recovery, dynamic
actors/cars/doors, thin walls/intermediate corner arcs, support refusal, resources,
transactional seats, saved policies and no held replay. Source/built/installed
browser proof covers actual controls, native dimensions, camera, gap/slide/stop,
saves/pause and emulated touch at multiple headings. Trains and original Night
Ledger regressions remain required. Final fixed-source records, four-gate logs,
captures, prior failure evidence and exact helper cleanup are in `evidence/`.

Full repository tests may use the established scheduling-only command
`node --test --test-concurrency=2 tests/*.test.mjs`; every test file, assertion and
existing timeout remains intact. Phone checks are emulation, not physical-device
performance. Setup timings exclude fresh human onboarding and prerequisites.

A cadence check additionally measures the same three-second glancing drive at
120, 60, 40, 20 and 10 host updates/second (the latter retains internal 0.05 s
substeps). Initial per-step speed damping produced 0.092–0.533 m, a real cadence
defect. Lease-owned bounded pedal demand removes that compounding; measured
travel is 9.4916–9.4922 m with the same slower confirmed 5.6953 m/s terminal speed.
This is deterministic simulation evidence, not a rendering performance measure.
Demand never persists; release/reversal discards it, and leaving the edge resumes
from confirmed speed so no acceleration jump is introduced.
