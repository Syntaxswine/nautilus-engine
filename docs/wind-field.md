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
- A wind grid is a box of cubic cells starting at the ground. Cell `(i, j, k)` has index `i + nx·(j + ny·k)`. A baked field stores `[u, v, w]` per cell and is zero in solids.

## The model

| Part | What it does | Source |
| --- | --- | --- |
| Inflow | Neutral log law, U(z) = (u*/κ) ln((z + z0)/z0), κ = 0.41, scaled so U(10 m) is the given speed. Terrain classes set z0 from 0.03 m (open) to 1 m (closed). | Davenport classes as updated by Wieringa (1992) |
| Sides | Sides facing into the wind take the inflow. Sides the wind leaves through are open at pressure 0. Sides parallel to it, the ground and the lid are slip planes. | — |
| Advection | MacCormack on a staggered (MAC) grid, reverting to semi-Lagrangian where the correction leaves the local range. `advection: 'semi-lagrangian'` is the cheaper, more diffusive first-order option. | Selle et al. (2008) |
| Pressure | Projection onto divergence-free fields: MIC(0)-preconditioned conjugate gradients, warm-started from the last step. The tolerance is a fraction of the reference speed (default 1e-4). | Bridson, *Fluid Simulation for Computer Graphics* |
| Turbulence model | None. The limiter's numerical dissipation stands in for subgrid mixing (implicit LES). Optional constant viscosity serves the cavity benchmark. | — |
| Gusts | Random Fourier modes, each divergence-free, weighted by the von Kármán spectrum and convected with the wind (frozen turbulence). Standard deviations are 2.5, 1.9 and 1.25 u* along-wind, lateral and vertical. They enter only through the inflow. | Kraichnan (1970); Smirnov, Shi and Celik (2001); Panofsky and Dutton (1984) |
| Solids | Conservative triangle–box overlap marks every cell a model surface touches. Air not reachable from the sides or top of the domain is sealed and becomes solid. So does air that reaches no outlet. | Akenine-Möller (2001) |
| Tracers | Midpoint steps through any `sample(x, y, z, out)`. A per-tracer upward drift stands in for warm smoke's rise, with an optional seeded random walk. Tracers do not push the air. | — |

## Verification

Measured on 2026-11-03 and 04. The gates in `tests/wind-core.test.mjs` run in `npm test`.

| Check | Measured | Gate |
| --- | --- | --- |
| Empty site, 4 bearings including 230° and 317.5° | Every face keeps its inflow value exactly at Float32; v = 0; no CG iterations needed | Exact |
| Lid-driven cavity, Re = 100, against Ghia, Ghia and Shin (1982) | 32²: max \|Δu\| 0.0070, \|Δv\| 0.0036. 64²: 0.0038 and 0.0060 (u min −0.2110 against −0.21090) | 0.02 of the lid speed, set before the first run. The test runs 32². |
| Inviscid Taylor–Green vortex, slip box [0, π]², 32 cells, CFL 1, one turnover | Kinetic energy kept: MacCormack 0.769, semi-Lagrangian 0.644. With ν = 0.01 the run loses an extra factor 0.798, against the exact exp(−4νt) = 0.778. | MacCormack above 0.74 and at least 0.08 above semi-Lagrangian (pins on these measurements); viscous share within 5 % |
| Airtight buildings | All 48 catalogue buildings, at 1 m and 0.5 m: no room probe on any level is reachable from outside air. With the window glass removed, at least three buildings open up, so the probe can fail. | No leaks |
| Projection | Every step converges; the largest face divergence stays within the tolerance; the side fluxes balance | 1e-4 of U |
| Cube, 6 cells per height, no gusts | The windward face divides near 0.65H, flowing down below and up above. Reverse flow at the foot starts about 0.55H upstream (the horseshoe vortex). The air 1.25–2H over the roof is 4–7 % faster than the inflow. Reverse flow behind the cube ends 2.95H downstream. | Signs only (see below) |
| Same cube with surface-layer gusts | Turbulence intensity 0.200 at height H inside the domain (Eurocode's 1/ln(z/z0) gives 0.244). The recirculation behind the cube shortens to **1.43H**. | Reported |
| Gusts | Component standard deviations within 15 % of 2.5, 1.9 and 1.25 u* on 20,000 fresh points. The pattern rides the wind: a point moving with it sees 0.063 of the change a fixed point sees. Inside the domain, two cells from the inflow, the lateral gusts keep 0.67 of their 0.84 m/s. | 15 %; 0.5; half of σv |
| Voxel marking | Exact against an independent oracle for a tilted plane, and against 200,000 sample points on a sliver triangle (89 cells, no extras) | Exact |
| Determinism | Two runs with gusts are bit-identical | Exact |

Cube wakes in the literature are usually quoted near 1.6H in channel flow (Martinuzzi and Tropea 1993), and shorter in turbulent boundary layers. I could not check either figure against the primary sources here, so neither is a gate. The gust-free 2.95H is too long, which is typical of a wake without inflow turbulence. With physically scaled gusts it falls inside the quoted range.

**Correction (2026-11-04).** The two cube rows first said 3.08H, 1.35H and an intensity of 0.196. Those figures came from a tree earlier than the committed one. The record's own probe, run unchanged against f3a52cd, gives 2.95H, 1.43H and 0.200, and so does an independent copy of its method. The windward divide, the horseshoe point and the roof speed-up re-measured within the ranges stated in the table.

The block test's signs were set from the physics before it first ran, and one of them was wrong. The first stagnation check (u < 0.5 U at 0.25H upstream) failed: 0.69 at 4 cells per height and 0.56 at 6. The slowed zone is shorter than assumed, so the check now requires u to fall toward the face, below 0.25 U at 0.05H; it measured 0.14. At 4 cells per building height the lee did not reverse at 1.5H (u = +0.20); 6 cells resolve it, and the test uses 6.

**Mutation sweep.** Twenty deliberate physics and plumbing faults went into a private copy. The final suite kills 19; the [record](#mutation-sweep) names the one it misses and why.

## Limits

- **Numerical dissipation.** The step advects and then projects, a first-order split. On the Taylor–Green vortex at CFL 1 that costs 23 % of the kinetic energy per turnover. The loss halves with the time step and does not change with the grid at a fixed step; a midpoint backtrace or turning the limiter off barely changes it. In a site, the inflow keeps resupplying energy and the loss acts like extra eddy viscosity, which softens shed vortices. Advection–reflection (Zehnder, Narain and Thomaszewski 2018) is the known remedy, at about 1.5 times the step cost.
- **Neutral and isothermal.** The model has no buoyancy coupling and no stratification. Smoke rise is a tracer drift that does not lift the air, so a fire's own plume and updraft are absent.
- **Resolution.** Wakes need about 6 cells per building height. With 1 m cells a single storey (about 2–3 m of wall) is barely resolved, so use 0.5 m for low buildings. Porch posts and other parts thinner than a cell become whole cells, and conservative marking can thicken a wall by one cell.
- **Domain size.** Guidelines ask for about 5H of margin upstream, at the sides and above, and 15H downstream (Franke et al., COST 732). The page uses 2–3H so that it stays interactive. The solver reports blockage: about 6 % for the single house and 14 % for the street canyon. Blockage speeds up the flow it squeezes.
- **Slip ground.** The ground has no friction model. The inflow profile is imposed and carried, not maintained by wall shear, so flow behind buildings does not slow against the ground.
- **Closed buildings.** Doors and windows are solid, and interiors are sealed. Through-flow ventilation and smoke leaving a window need open-opening support.
- **Speed.** This is plain JavaScript on one worker. Times below were measured while a foreign process held this machine's 16 threads at 100 %, so they are upper bounds: 46–60 ms per step for 49–60k cells, about 180–285 ms per step for the page's 100k-cell sites. That is 0.5–0.7× real time. Gusts roughly double the conjugate-gradient iterations (about 27 against 13 per step).

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
| 3 | Plus the walled courtyard open to the sky (the committed tool, 2026-11-04) | **19 of 20** | M03 |

The neutral control (a comment-only edit) survived every round. **M03 is the honest gap.** The revert limiter acts only where the corrected value leaves the local range, at sharp gradients, and none of the tests' flows has one: on the Taylor–Green vortex the limiter changes the energy by 0.0003. A test that advects a sharp front and checks the maximum principle would pin it.

## Next steps

- Register `./wind` with an installed-package proof, as the other optional entries have.
- Voxelize an editor map (walls, roofs, prefabs and tiles) instead of catalogue placements.
- Bake sets of bearings, and add a smoke component with Boussinesq buoyancy if Tinderbox needs real plume rise.
- Cut the dissipation with advection–reflection, checked against the Taylor–Green record above.
- Run faster: a multigrid preconditioner, or a WebGL2 path verified against this one.
