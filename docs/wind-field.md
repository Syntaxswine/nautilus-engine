# Wind field (candidate)

`packages/wind-core` simulates the wind around Nautilus models, and `examples/wind-field.html` is a reference page for it. The engine's own building models (`createBuildingModel` from `./buildings/three`) become solid cells. Incompressible air flows around them, and the result is a velocity field that any tracer can follow. The first planned consumer is smoke direction: where smoke from a chimney or a burning building drifts, pools and climbs.

The core is headless. It loads in Node without a DOM, storage or a renderer, and it imports no Three.js. Hosts supply triangles, clocks and drawing. It is **source-only**: no `./wind` export is registered and no installed-package proof exists yet (see [next steps](#next-steps)).

## Use it

```js
import * as T from '../packages/render-effects/three.js';
import {createBuildingModel} from '../packages/building-catalog/three.js';
import {objectTriangles, triangleBounds, windDomain, voxelizeTriangles, fillEnclosed,
  createWindSolver, bakeWindField, sampleWindField, advectTracers} from '../packages/wind-core/index.js';

const house = createBuildingModel(T, 'rowan-family');
const triangles = objectTriangles(house.root);            // world-space, metres
const grid = windDomain(triangleBounds(triangles), {cell: 1, fromDeg: 225});
const {solid} = voxelizeTriangles(grid, triangles);
fillEnclosed(grid, solid);                                 // sealed interiors become solid
const solver = createWindSolver({grid, solid,
  wind: {speed: 6, fromDeg: 225, z0: 0.25},                // 6 m/s at 10 m, from the south-west
  turbulence: {gain: 1}});                                 // surface-layer gusts
solver.run(200); solver.startAveraging(); solver.run(400);
const field = bakeWindField(solver);                       // mean, cell-centred, plain data
const puffs = Float32Array.of(0, 8.4, -1);                 // one puff at a chimney top
advectTracers((x, y, z, out) => sampleWindField(field, x, y, z, out), puffs, 0.1, {rise: 1});
```

Open `/examples/wind-field.html` in the built preview. Pick a layout (a single building, a street canyon or a farmyard) and swap or turn any of the 48 original buildings. Then set the bearing, the speed at 10 m, the upwind terrain and the gusts. Streaks follow the air. Clicking a roof or the ground releases smoke. Slices show the speed on a horizontal or along-wind plane. **Export mean field** downloads the baked field as JSON. The solver runs in a worker.

## Conventions

- Metres. The axes are x (east), y (height) and z (south), with north at −z, as in the tile edges. The ground is y = 0.
- A bearing is meteorological: the direction the wind blows **from**, clockwise from north. `windDirection(fromDeg)` returns the `[x, z]` direction the air moves.
- A wind grid is a box of cubic cells starting at the ground. Cell `(i, j, k)` has index `i + nx·(j + ny·k)`. A baked field stores `[u, v, w]` per cell and is zero in solids. Both samplers return zero at any point inside a solid cell, not only at its centre; outside the grid, the solver prescribes the inflow beyond an inflow side, and a baked field uses its nearest edge.

## The model

| Part | What it does | Source |
| --- | --- | --- |
| Inflow | Neutral log law, U(z) = (u*/κ) ln((z + z0)/z0), κ = 0.41, scaled so U(10 m) is the given speed. Terrain classes set z0 from 0.03 m (open) to 1 m (closed). | Davenport classes as updated by Wieringa (1992) |
| Sides | Sides facing into the wind take the inflow. Sides the wind leaves through are open at pressure 0. Sides parallel to it, the ground and the lid are slip planes. | — |
| Advection | MacCormack on a staggered (MAC) grid, reverting to semi-Lagrangian where the correction leaves the local range. `advection: 'semi-lagrangian'` is the cheaper, more diffusive first-order option. | Selle et al. (2008) |
| Pressure | Projection onto divergence-free fields: MIC(0)-preconditioned conjugate gradients, warm-started from the last step. The tolerance is a fraction of the reference speed (default 1e-4). | Bridson, *Fluid Simulation for Computer Graphics* |
| Step | Advect, then project (`step: 'projection'`, the default). `step: 'reflection'` takes two half steps joined by a reflection; see [advection–reflection](#advectionreflection). | Zehnder, Narain and Thomaszewski (2018) |
| Turbulence model | None. The limiter's numerical dissipation stands in for subgrid mixing (implicit LES). Optional constant viscosity serves the cavity benchmark. | — |
| Gusts | Random Fourier modes, each divergence-free, weighted by the von Kármán spectrum and convected with the wind (frozen turbulence). Standard deviations are 2.5, 1.9 and 1.25 u* along-wind, lateral and vertical. They enter only through the inflow. | Kraichnan (1970); Smirnov, Shi and Celik (2001); Panofsky and Dutton (1984) |
| Solids | Conservative triangle–box overlap marks every cell a model surface touches. Air not reachable from the sides or top of the domain is sealed and becomes solid. So does air that reaches no outlet. | Akenine-Möller (2001) |
| Tracers | Midpoint steps through any `sample(x, y, z, out)`. A per-tracer upward drift stands in for warm smoke's rise, with an optional seeded random walk. Tracers do not push the air. | — |

## Verification

Measured on 2026-11-03 and 04. The gates in `tests/wind-core.test.mjs` run in `npm test`.

| Check | Measured | Gate |
| --- | --- | --- |
| Empty site, 4 bearings including 230° and 317.5°, both steps | Every face keeps its inflow value exactly at Float32; v = 0; no CG iterations needed | Exact |
| Lid-driven cavity, Re = 100, against Ghia, Ghia and Shin (1982) | 32²: max \|Δu\| 0.0070, \|Δv\| 0.0036. 64²: 0.0038 and 0.0060 (u min −0.2110 against −0.21090) | 0.02 of the lid speed, set before the first run. The test runs 32². |
| Inviscid Taylor–Green vortex, slip box [0, π]², 32 cells, CFL 1, one turnover | Kinetic energy kept: MacCormack 0.769, semi-Lagrangian 0.644. With ν = 0.01 the run loses an extra factor 0.798, against the exact exp(−4νt) = 0.778. | MacCormack above 0.74 and at least 0.08 above semi-Lagrangian (pins on these measurements); viscous share within 5 % |
| The same vortex with `step: 'reflection'` | MacCormack keeps 0.9974. With ν = 0.01 the run sits 0.26 % below exp(−4νt), the absolute check the plain split fails by 21 %. | Above 0.99 (two half steps without the reflection keep 0.868); within 2 % of exp(−4νt) |
| Airtight buildings | All 48 catalogue buildings, at 1 m and 0.5 m: no room probe on any level is reachable from outside air. With the window glass removed, at least three buildings open up, so the probe can fail. | No leaks |
| Projection, both steps | Every step converges; the largest face divergence stays within the tolerance; the side fluxes balance | 1e-4 of U |
| Cube, 6 cells per height, no gusts | The windward face divides near 0.65H, flowing down below and up above. Reverse flow at the foot starts about 0.55H upstream (the horseshoe vortex). The air 1.25–2H over the roof is 4–7 % faster than the inflow. Reverse flow behind the cube ends 2.95H downstream. | Signs only (see below) |
| Same cube with surface-layer gusts | Turbulence intensity 0.200 at height H inside the domain (Eurocode's 1/ln(z/z0) gives 0.244). The recirculation behind the cube shortens to **1.43H**. | Reported |
| Gusts | Component standard deviations within 15 % of 2.5, 1.9 and 1.25 u* on 20,000 fresh points. The pattern rides the wind: a point moving with it sees 0.063 of the change a fixed point sees. Inside the domain, two cells from the inflow, the lateral gusts keep 0.67 of their 0.84 m/s. | 15 %; 0.5; half of σv |
| Voxel marking | Exact against an independent oracle for a tilted plane, and against 200,000 sample points on a sliver triangle (89 cells, no extras) | Exact |
| Determinism, both steps | Two runs with gusts are bit-identical, and so is a run after `reset()`, which clears every warm start | Exact |

Cube wakes in the literature are usually quoted near 1.6H in channel flow (Martinuzzi and Tropea 1993), and shorter in turbulent boundary layers. I could not check either figure against the primary sources here, so neither is a gate. The gust-free 2.95H is too long, which is typical of a wake without inflow turbulence. With physically scaled gusts it falls inside the quoted range.

**Correction (2026-11-04).** The two cube rows first said 3.08H, 1.35H and an intensity of 0.196. Those figures came from a tree earlier than the committed one. The record's own probe, run unchanged against f3a52cd, gives 2.95H, 1.43H and 0.200, and so does an independent copy of its method. The windward divide, the horseshoe point and the roof speed-up re-measured within the ranges stated in the table.

The block test's signs were set from the physics before it first ran, and one of them was wrong. The first stagnation check (u < 0.5 U at 0.25H upstream) failed: 0.69 at 4 cells per height and 0.56 at 6. The slowed zone is shorter than assumed, so the check now requires u to fall toward the face, below 0.25 U at 0.05H; it measured 0.14. At 4 cells per building height the lee did not reverse at 1.5H (u = +0.20); 6 cells resolve it, and the test uses 6.

**Mutation sweep.** Twenty-six deliberate physics and plumbing faults went into a private copy, four of them in the reflection step. The final suite kills 24; the [record](#mutation-sweep) names the two it misses and why.

## Advection–reflection

`step: 'reflection'` replaces each step with two half steps joined by a reflection (Zehnder, Narain and Thomaszewski 2018). The default stays `step: 'projection'`, which is byte-identical to the solver before this option existed.

1. Advect the velocity half a step with itself, diffuse half a step, and project.
2. Reflect: u_r = 2·P(u) − u, where u is the field that went into that projection.
3. Advect u_r half a step with the projected velocity, diffuse half a step, and project again.

Each projection warm-starts from its own solution in the last step. The inflow, gusts included, is read at the time of the field being carried: the half step for the first projection and for samples beyond the inflow side in the second half.

### Pre-registered expectations

Written on 2026-11-04 with the code in place and before any measurement of the quantities below. The code had been run only on checks this list does not name: the empty site stays exact at four bearings, and 60 steps around a block converge, with and without gusts. The numbers come from the derivation, not from runs.

**Derivation.** The projection P is orthogonal in the sum of squared face velocities, so projecting a field q removes exactly ‖(I − P)q‖² of kinetic energy. The plain step projects q = u − Δt (u·∇)u + O(Δt²), so it loses Δt² ‖(I − P)(u·∇)u‖² per step, which is first order in Δt per unit time. On the Taylor–Green vortex (u·∇)u = ½(sin 2x, sin 2y) is a pure gradient, so the projection removes all of it. That loss scales with the square of the energy, which gives E/E0 = 1/(1 + Δt·t/2): 0.764 after one turnover at CFL 1, where the record measured 0.769. The split therefore accounts for essentially all of MacCormack's loss. In the reflection step the reflection keeps the norm, and the reflected field carries the first half's divergent part with the opposite sign, so the second half's advection cancels it. The field reaching the last projection has a divergent part of order Δt², here −(Δt/2)² (I − P)[(u·∇)(u·∇)u]. Its loss per step is therefore of order Δt⁴, 8×10⁻⁵ per turnover on this vortex. What remains is the advection's own dissipation, which the plain split's larger loss hid.

| Quantity | Plain split | Expected with reflection | Counts against it |
| --- | --- | --- | --- |
| Taylor–Green energy kept per turnover, MacCormack, CFL 1 | 0.769 (recorded) | 0.98–1.00 | below 0.95 |
| Same, semi-Lagrangian | 0.644 (recorded) | 0.70–0.80. Linear interpolation's truncation term makes its own loss about 1.5 times larger over two half steps, so it gains much less. | outside 0.70–0.80 |
| MacCormack at CFL 0.5 | 0.866 by the law above | at least the CFL 1 value | below it |
| With ν = 0.01, absolute, against exp(−4νt) | 21 % short (recorded) | within 5 % | 5 % or more short |
| Cost per step, in paired runs | 1 | 1.5–2.0 times. There are two advections at half the stride and two projections; the second removes only an O(Δt²) divergence from its own warm start, so it should need fewer iterations than the first. | outside 1.5–2.0 |
| Cube wake, H = 6, without gusts: X_R | 3.08H (recorded) | Shorter. The split's loss sits where the pressure gradient is steep: the stagnation zone, the leading edges and the roof. Removing it should let the shear layers mix more. Direction only. | 3.08H or longer |
| Same with gusts: intensity at H, 2H upstream; X_R | 0.196; 1.35H (recorded) | Higher intensity, because the gusts lose less energy on their way in. X_R within 1.0–1.6H. | intensity 0.196 or lower; X_R outside 1.0–1.6H |

The Taylor–Green rows follow from the derivation. The wake rows are a physical argument: their direction is predicted, their size is not. A failed wake row would not contradict the energy rows. The Euler backtrace keeps a steady state first-order in Δt under either split, so a mean wake depends on more than the projection's loss.

**Method, fixed in advance.** The Taylor–Green setup is the test's own: a slip box [0, π]² with 32 cells, tolerance 1e-8 and one turnover, 2π. Both splits run at CFL 1 and 0.5, with MacCormack and semi-Lagrangian. The wake runs repeat the record's: the `blockSolver` site at H = 6 cells (60 × 24 × 42), 400 steps of spin-up and then 800 averaged steps. X_R is where reverse mean flow ends on the centreline in the first face row (y = 0.5 m), and the intensity is σu/ū at (−2H, H, 0). Each splitting runs with and without gusts. Cost is measured on the same site, with both splits in one process in alternating ABBA blocks after a warm-up, and the CPU taken by foreign processes is recorded during each block.

### Measured

Measured on 2026-11-04 on deae2cd, the commit that carries the expectations above; it was pushed before any of these runs.

| Quantity | Plain split | Reflection | Expected | Verdict |
| --- | --- | --- | --- | --- |
| Taylor–Green energy kept per turnover, MacCormack, CFL 1 | 0.7687 | **0.9974** | 0.98–1.00 | Holds |
| Same, semi-Lagrangian | 0.6440 | 0.7041 | 0.70–0.80 | Holds, at the low edge |
| MacCormack at CFL 0.5 | 0.8684 (the law: 0.8664) | 0.9953 | at least 0.9974 | **Fails.** The loss grows as the step shrinks: 0.9936 at CFL 0.25. |
| With ν = 0.01, against exp(−4νt) | 21.1 % short | **0.26 % short** | within 5 % | Holds |
| Cost per step, paired | 1 | 1.9–2.1 times where this process had a whole thread; 1.35–1.8 with gusts on a saturated machine | 1.5–2.0 | At the top edge and past it. The reason given, a cheaper second projection, **fails**. |
| Cube wake without gusts, X_R, by the registered method | 2.95H (the control on this tree) | 3.38H | shorter | **Fails** as registered. A four-times-longer average gives 2.93H and 2.86H: no resolved change. |
| Cube with gusts: intensity; X_R | 0.1996; 1.43H | 0.1899; 1.60H | higher; 1.0–1.6H | The intensity **fails**: it is lower, and resolved. X_R is not resolved: a second gust seed gives 1.76H and 1.22H. |

**Where the energy goes.** Instrumented private copies of the solver record what each projection removes; the source tree is only read. The reflection gives back what the half-step projection takes, to within about 1×10⁻⁸ of the energy. The net loss is then the last projection's plus the advection's.

| Taylor–Green, one turnover | Plain split: projection | Reflection: last projection | Reflection: half-step projection, given back | Reflection: advection | Same, limiter off |
| --- | --- | --- | --- | --- | --- |
| 32 cells, CFL 1 | 0.232 | 8.1×10⁻⁵ (derived: 8.4×10⁻⁵) | 0.077 | 2.5×10⁻³ | 3.3×10⁻⁴ |
| 32 cells, CFL 0.5 | 0.132 | 1.0×10⁻⁵ | 0.038 | 4.7×10⁻³ | 2.7×10⁻⁴ |
| 32 cells, CFL 0.25 | 0.071 | 1.4×10⁻⁶ | 0.019 | 6.4×10⁻³ | 1.6×10⁻⁴ |
| 64 cells, CFL 1 | 0.132 | 1.0×10⁻⁵ | 0.038 | 4.7×10⁻⁴ | 4.2×10⁻⁵ |

The derivation holds where it reaches. The last projection's loss falls about eight-fold per halving of Δt (8.0 and 7.1 times). At a fixed Δt it is the same on both grids (32 cells at CFL 0.5 against 64 at CFL 1), as a splitting error should be. The plain split keeps 1/(1 + Δt·t/2) of the energy at every step size, within 0.005.

**Why the CFL 0.5 row failed.** The claim assumed that the advection's own loss falls with the step, as MacCormack's truncation error does. Most of what remains is the limiter instead. Where a corrected value leaves its stencil's range, the step reverts to semi-Lagrangian, and those reverts cost more per turnover as the steps shrink and multiply: 2.2×10⁻³, 4.4×10⁻³ and 6.2×10⁻³ at CFL 1, 0.5 and 0.25. With the limiter off, the loss does fall with the step. The code is right and the claim was wrong. The limiter stays, because it keeps sharp fronts within their neighbours' range (the job no test pins yet, M03).

Without the reflection (M22 below), the two half steps keep 0.8684, exactly the plain split at CFL 0.5. If the second half advects a full step (M24), they keep 0.9286, where the derivation gives 1/(1 + Δt·t/8) = 0.928.

**Cost.** Measured on the `blockSolver` site at H = 6 (60,480 cells) on an AMD Ryzen 7 5800X (8 cores, 16 threads) with Node 24.15. Other sessions' jobs loaded the machine throughout, so every time below is an upper bound. The load is recorded per block: the machine's busy threads from `os.cpus()`, minus this process's own CPU time.

| Pairing | Other processes' load | Plain step | Reflection step | Ratio | One shared pressure array |
| --- | --- | --- | --- | --- | --- |
| No gusts, all arms in one process, three A B C C B A cycles of 20 steps | 2.8–4.5 threads; this process had a full thread | 40.6 ms | 81.8 ms | 1.88, 2.03, 2.13 | 79.4 ms |
| No gusts, one process per arm, A B C C B A | 15.1–15.2 threads; this process had 0.80–0.90 of one | 63.6, 68.4 ms | 115.9, 137.4 ms | 1.82, 2.01 | 132.5, 134.9 ms |
| Gusts, all arms in one process | 15.1–15.3 threads (saturated) | 168 ms | 298 ms | 1.71, 1.75, 1.79 | 342 ms |
| Gusts, one process per arm | 15.1–15.3 threads (saturated); this process had 0.70–0.90 of one | 168, 153 ms | 228, 245 ms | 1.35, 1.60 | 206, 194 ms |

Both projections take the same number of CG iterations: 10.3 and 10.1 per step without gusts, and 25.8 and 23.2 with them. These counts are deterministic. The pre-registered reason, a cheaper second projection, was wrong: the reflection step does everything twice. Timed under the same contention, the plain step spent about 58 % of its time advecting and 41 % projecting without gusts, so twice the work is about twice the time. Where this process had a whole thread, the ratio was 1.9–2.1, at and beyond the top of the expected 1.5–2.0. With gusts on a saturated machine the ratios scatter from 1.35 to 1.8, so that case is unresolved.

Sharing one pressure array between the two projections costs 14.5 more iterations per step without gusts (33.4 against 18.9), and 7.5 more with gusts (55.8 against 48.3). Those counts do not depend on the machine. Their cost in time is not resolved under this load: the shared arm took 0.97, 1.06, 1.15 and 0.85 times the separate arm's time in the four pairings. The separate warm start stays: it saves iterations everywhere, and it costs one more pressure array (half a megabyte here).

**The wake rows.** The control first: on this tree the record's method gives 2.95H, 1.43H and an intensity of 0.1996, not the earlier figures (see the correction under [Verification](#verification)). The reflection at the same step gave 3.38H and 1.60H, and an intensity of 0.1899. Both wake rows fail as registered.

The runs below were not pre-registered. They came after the failure, for two reasons: to separate the two things a reflection step changes, and to measure how well the method resolves X_R. The reflection removes the projection's loss, but it also advects twice per step. The plain split at CFL 0.5 advects as often as the reflection at CFL 1. The reflection at CFL 2 advects as often as the plain split at CFL 1. In one batch of unpaired runs it cost 1.02–1.08 times as much per simulated second, with 12.4 CG iterations per Δt against 10.4 (28 against 27 with gusts). Each run spins up and averages over the same simulated time as the record's runs.

| Split, CFL | Advections per Δt of CFL 1 | Taylor–Green energy kept | X_R without gusts, 800 steps | Same, 3200 steps (range of eight windows) | X_R with gusts, seeds 1 and 2 | Intensity at H, seed 1 |
| --- | --- | --- | --- | --- | --- | --- |
| Plain, 1 | 1 | 0.7687 | 2.95H | 2.93H (2.52–3.50H) | 1.43H, 1.76H | 0.1996 |
| Plain, 0.5 | 2 | 0.8684 | 2.48H | 3.09H (2.33–3.58H) | 1.49H | 0.1903 |
| Reflection, 1 | 2 | 0.9974 | 3.38H | 2.86H (2.22–3.58H) | 1.60H, 1.22H | 0.1899 |
| Reflection, 2 | 1 | 0.9992 | 1.79H | 2.18H (1.68–2.82H) | 1.54H | 0.1993 |

**The intensity follows the advection count and nothing else.** Runs with the same count match quarter window by quarter window within 0.002, whichever split they use. Two advections per Δt instead of one lower the intensity in 7 of 8 quarter windows across two seeds. Over the first H of fetch the inflow gusts lose energy to every interpolation they pass through, just as the Taylor–Green vortex loses energy to the limiter.

**An 800-step mean does not resolve X_R.** Without gusts, the quarter-window means of one run spread over 0.3–1.0H. A four-times-longer average puts the plain split, the reflection and the plain split at CFL 0.5 within about one standard error of each other (0.12–0.16H), so the 3.38H and 2.48H above were sampling. The reflection at CFL 2 is shorter, at 2.18H. But its windows drift upward through the run (1.68H early, 2.3–2.8H late), and at that step the Euler backtrace's steady-state error, first order in Δt under either split, doubles. So the shortening is not credited to the reflection. With gusts, a second seed moves X_R by 0.33–0.38H, more than any difference between the splits. No gust X_R in this record resolves anything finer than that, the control's 1.43H included.

**Choosing a step.** The alternatives are the plain split (the default), the reflection at the same step, and the reflection at twice the step, which was measured only after the fact.
- *Accuracy (measured).* Where a flow's own energy matters over time, the reflection is far better. The Taylor–Green vortex keeps 0.997 of its energy per turnover instead of 0.769, and a viscous run decays at the exact rate within 0.3 % instead of 21 %. At this resolution the cube's mean wake shows no resolved difference at the same step: 2.86H against 2.93H. Also at the same step, the reflection's extra advections cost the inflow gusts 5 % of their intensity.
- *Efficiency (measured).* About twice the plain step at the same step, because the advection and the projection both run twice. At twice the step it cost 1.02–1.08 times the plain split per simulated second, in unpaired runs.
- *Narrative (subjective).* In a live view, a scheme that keeps a vortex's energy keeps shed eddies turning, and smoke shows them. A baked mean field, which is what the games read, did not show the difference here.
- *Recommendation (provisional).* Keep `step: 'projection'` as the default for baked mean fields: at the same step the reflection doubles the cost and did not change the mean wake. Choose `step: 'reflection'` where transient energy matters: a live view, a decaying flow, or a benchmark such as Taylor–Green. The reflection at CFL 2 is the lead for a new default. It costs a little more per simulated second, keeps 0.999 of the Taylor–Green energy and keeps the plain split's gusts. It needs its own pre-registration, with a wake average long enough to resolve X_R. Its half steps move as far as the plain split's full steps, so it adds no new risk of backtraces crossing thin walls.

## Limits

- **Numerical dissipation.** The default step advects and then projects, a first-order split. On the Taylor–Green vortex at CFL 1 that costs 23 % of the kinetic energy per turnover. The loss halves with the time step and does not change with the grid at a fixed step; a midpoint backtrace or turning the limiter off barely changes it. In a site, the inflow keeps resupplying energy and the loss acts like extra eddy viscosity, which softens shed vortices. `step: 'reflection'` keeps 0.997 of the vortex's energy at about twice the step cost. At the same step, though, its extra advections take more of the inflow gusts, and a long average shows no resolved change in the cube's mean wake ([advection–reflection](#advectionreflection)).
- **Neutral and isothermal.** The model has no buoyancy coupling and no stratification. Smoke rise is a tracer drift that does not lift the air, so a fire's own plume and updraft are absent.
- **Resolution.** Wakes need about 6 cells per building height. With 1 m cells a single storey (about 2–3 m of wall) is barely resolved, so use 0.5 m for low buildings. Porch posts and other parts thinner than a cell become whole cells, and conservative marking can thicken a wall by one cell.
- **Domain size.** Guidelines ask for about 5H of margin upstream, at the sides and above, and 15H downstream (Franke et al., COST 732). The page uses 2–3H so that it stays interactive. The solver reports blockage: about 6 % for the single house and 14 % for the street canyon. Blockage speeds up the flow it squeezes.
- **Slip ground.** The ground has no friction model. The inflow profile is imposed and carried, not maintained by wall shear, so flow behind buildings does not slow against the ground.
- **Closed buildings.** Doors and windows are solid, and interiors are sealed. Through-flow ventilation and smoke leaving a window need open-opening support.
- **Speed.** This is plain JavaScript on one worker. Times below were measured while a foreign process held this machine's 16 threads at 100 %, so they are upper bounds: 46–60 ms per step for 49–60k cells, about 180–285 ms per step for the page's 100k-cell sites. That is 0.5–0.7× real time. Gusts roughly double the conjugate-gradient iterations (about 27 against 13 per step). The reflection step costs about twice the plain one.

## Design evaluation

**Alternatives.** (a) One uniform wind vector for the whole map, which is what a game without wind physics effectively uses. (b) This solved field, baked per bearing. (c) Offline RANS or LES at fine resolution in an external CFD tool.

**Accuracy.** A uniform vector carries the right mean direction and nothing else. It has no shelter behind buildings, no channelling along streets, no updraft on windward faces and no downwash into a lee. The solved field reproduces those causes, matches the cavity benchmark within 1 % of the lid speed, and gives a cube wake in the observed range once gusts are on. It omits buoyancy, ground friction and fine geometry. Offline CFD would be more accurate still, at a cost no game pays at runtime.

**Efficiency.** A uniform vector costs nothing. Sampling a baked field is one trilinear lookup per tracer: three components from eight cells. Baking costs seconds to minutes per bearing at authoring time and grows with cell count. The live solver here is an authoring and review tool, not a per-frame game system.

**Narrative.** (Subjective.) In Tinderbox the fire is the game, and smoke that pools in a courtyard, rolls off a roof ridge or streams down a street makes the wind legible and makes position matter. The tactical games could use the same field for smoke grenades and screening. A uniform drift reads as weather. A solved drift reads as a place.

**Recommendation (provisional).** Bake mean fields at authoring time for 8 or 16 bearings per map, and interpolate between neighbouring bearings at runtime. Add the gust model, or a cheap noise on top, for motion. Keep the uniform vector as the fallback for maps without a bake. The observation that would settle it is a Tinderbox scene with fire and buildings, compared side by side under both. **Adoption status:** candidate, source-only; no game, consumer pin or editor flow changes.

## Mutation sweep

`node tools/wind-core-mutants.mjs` copies the suite and its sources into a private temporary folder. It applies one fault at a time, runs `tests/wind-core.test.mjs`, and exits non-zero on any unexpected verdict. The source tree is never written.

| Round | Suite | Killed | Survivors |
| --- | --- | --- | --- |
| 1 | First 15 tests | 10 of 20 | M02 MacCormack off; M03 limiter revert off; M04 and M06 the two gust paths, each covering for the other; M09 plain IC(0); M10 and M11 voxel plane and edge axes; M12 top seeding; M16 frozen convection; M17 Euler tracers |
| 2 | Plus Taylor–Green, gust entry, CG pin, voxel oracles, convection and rotation tests | 18 of 20 | M03; M12 |
| 3 | Plus the walled courtyard open to the sky (2026-11-04) | 19 of 20 | M03 |
| 4 | Plus the solid-sampling test, after the architect's review. M26 and M27 each remove one sampler's solid check; M18 follows the rewritten field sampler (2026-11-04) | 21 of 22 | M03 |
| 5 | Plus the advection–reflection test, both steps in the empty-site, projection and determinism tests, and the reset check; four mutants of the reflection step, M22–M25 (the committed tool, 2026-11-04) | **24 of 26** | M03; M25 |

The neutral control (a comment-only edit) survived every round. **M03 is the honest gap.** The revert limiter acts only where the corrected value leaves the local range, at sharp gradients, and none of the tests' flows has one: on the Taylor–Green vortex the limiter changes the energy by 0.0003 under the plain split and by 0.0022 under the reflection. A test that advects a sharp front and checks the maximum principle would pin it. **M25 is the second gap.** In the reflection's second half, samples beyond the inflow side read the gusts at the start of the step instead of half a step on. That shifts the inflow pattern by half a step within one cell of the side, and no test resolves it. The new test kills M22 (the reflection dropped) and M24 (the second half advecting a full step), and the reset check kills M23 (the half-step pressure kept across a reset).

## Next steps

- Register `./wind` with an installed-package proof, as the other optional entries have.
- Voxelize an editor map (walls, roofs, prefabs and tiles) instead of catalogue placements.
- Bake sets of bearings, and add a smoke component with Boussinesq buoyancy if Tinderbox needs real plume rise.
- Pre-register and test advection–reflection at CFL 2 as the default. On the runs so far it costs 1.02–1.08 times the plain split per simulated second (unpaired), keeps 0.999 of the Taylor–Green energy and keeps the inflow gusts. It needs a wake averaging that resolves X_R first.
- Try a limiter that clamps to the stencil's range instead of reverting. With the reflection, a private copy kept 0.998–0.999 of the vortex's energy at CFL 1, 0.5 and 0.25, where the reverting limiter's loss grows as the step shrinks. It changes the default step, so it was not adopted here.
- Average cube wakes long enough to resolve X_R; give it error bars from windows and from gust seeds.
- Run faster: a multigrid preconditioner, or a WebGL2 path verified against this one.
