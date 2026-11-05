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

A game should not run the solver. It bakes a set of bearings once and blends at play time, as described under [baked bearings and smoke](#baked-bearings-and-smoke):

```js
import {bakeWindBearings, encodeWindBearings, decodeWindBearings, createWindBearingSampler,
  createSmoke, windFieldBounds, windFieldSolid} from '../packages/wind-core/index.js';

// Authoring: one grid with equal margins on every side serves every bearing.
const site = windDomain(triangleBounds(triangles), {cell: 1, upstream: 3, lateral: 3, downstream: 3});
const walls = voxelizeTriangles(site, triangles).solid; fillEnclosed(site, walls);
const set = bakeWindBearings({grid: site, solid: walls, bearings: 8, wind: {speed: 6, z0: 0.25}});
const json = JSON.stringify(encodeWindBearings(set));      // ships with the map

// Play: no solver. Any bearing, any speed at 10 m.
const wind = createWindBearingSampler(decodeWindBearings(json), {fromDeg: 200, speed: 4.5});
const smoke = createSmoke({seed: 7, bounds: windFieldBounds(wind.field), blocked: windFieldSolid(wind.field)});
smoke.addEmitter({x: 0, y: 8.5, z: -1});                    // a chimney top
wind.setWind({fromDeg: 205});                               // blends again only when the wind changes
smoke.step(wind.sample, 1 / 30);                            // draw smoke.positions[0 .. 3 * smoke.count)
```

Open `/examples/wind-field.html` in the built preview. Pick a layout (a single building, a street canyon or a farmyard) and swap or turn any of the 48 original buildings. Then set the bearing, the speed at 10 m, the upwind terrain and the gusts. Streaks follow the air. Clicking a roof or the ground releases smoke. Slices show the speed on a horizontal or along-wind plane. **Export mean field** downloads the baked field as JSON. The solver runs in a worker. **Bake bearings** bakes 8 or 16 bearings in further workers while the live wind runs; the page then draws the baked smoke (blue) beside the live smoke (white) from the same sources. Turn the dial: the baked plume swings at once, and the live one follows after about a flow-through. **Export set** downloads the bearing set.

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
| Turbulence model | None. The limiter's numerical dissipation stands in for subgrid mixing (implicit LES). Optional constant viscosity serves the cavity benchmark. | — |
| Gusts | Random Fourier modes, each divergence-free, weighted by the von Kármán spectrum and convected with the wind (frozen turbulence). Standard deviations are 2.5, 1.9 and 1.25 u* along-wind, lateral and vertical. They enter only through the inflow. | Kraichnan (1970); Smirnov, Shi and Celik (2001); Panofsky and Dutton (1984) |
| Solids | Conservative triangle–box overlap marks every cell a model surface touches. Air not reachable from the sides or top of the domain is sealed and becomes solid. So does air that reaches no outlet. | Akenine-Möller (2001) |
| Tracers | Midpoint steps through any `sample(x, y, z, out)`. A per-tracer upward drift stands in for warm smoke's rise, with an optional seeded random walk. Tracers do not push the air. | — |

## Baked bearings and smoke

The headless path for games (`packages/wind-core/bearings.js` and `smoke.js`). The measurement behind the numbers here was registered before it ran: [the record](reviews/2026-11-04-wind-bearings-smoke.md).

**Bake.** `bakeWindBearings({grid, solid, bearings, wind: {speed, z0}, turbulence, warmup, average})` solves each bearing on one grid. The grid should have equal margins on every side, so one grid serves every bearing. Each bearing starts from the bare inflow profile, so no bearing depends on the order of the bake. It warms up for `warmup` flow-throughs and averages over `average` more; a flow-through is the longer horizontal side divided by the reference speed. The defaults are 8 bearings, gusts at gain 1, `warmup` 1 and `average` 3. Steps whose pressure solve did not converge are counted per bearing in `unconverged`. `bearings` is a count (evenly spaced from north) or a list.

**Seeds.** `seeds` bakes each bearing once per gust seed and keeps the mean. A count n is `turbulence.seed` (default 1) and the n − 1 seeds after it; a list is used as given.

- Each seed is an ordinary bake: it starts from the bare profile, warms up and averages. The cost is `seeds` × (`warmup` + `average`) flow-throughs.
- The set and its fields record their seeds.
- Without `seeds`, a bake is unchanged: same values, no new keys.
- `averageWindFields(fields)` is the mean it uses. It accepts any baked fields that share a grid, a wind and their solid cells.
- What seeds buy is measured under [baked bearings and smoke](#baked-bearings-and-smoke).

**Speed is exact.** The solver has no speed scale of its own. dt = cfl·h/U, the gusts' u*, convection and frequencies, and the pressure tolerance all scale with U. A field baked at U0 is the field at U once multiplied by U/U0, so one bake serves every speed. Doubling is exact in binary: on the single-house site, the 3 m/s bake is exactly half the 6 m/s bake in all 297,600 values at every averaging length. At 9 m/s against 1.5 × the 6 m/s bake, rounding grows in the turbulent flow to a largest difference of 2.4 m/s. The chimney plumes still end only 1.5 m apart, below the 2.8 m that two gust seeds give. Any viscosity or a fixed dt would break the scaling, so `bakeWindBearings` offers neither. Terrain is not scaled: the bake holds one z0.

**Blend.** `blendWindBearings(set, {fromDeg, speed, blend}, into)` takes the two bake bearings either side of `fromDeg` and returns an ordinary wind field on the set's grid, so `sampleWindField`, `advectTracers` and smoke take it unchanged. At a bake bearing it is that bake times U/U0, value for value. A cell solid in either weighted neighbour is solid and still.

| Blend | Weights at t of the way across a gap Δ | Free stream between bake bearings | Where both neighbours agree |
| --- | --- | --- | --- |
| `linear` (default) | 1 − t and t | Slowed to the chord, cos(Δ/2) at the midpoint; turned slightly off the bearing elsewhere | Unchanged |
| `slerp` | sin((1 − t)Δ)/sin Δ and sin(tΔ)/sin Δ | Exact in speed and direction | Sped up by up to 1/cos(Δ/2): 8 % at 8 bearings, 2 % at 16 |
| `keep-speed` | Linear, then each cell's horizontal speed restored toward the weighted mean of its neighbours' speeds, at most 1/cos(Δ/2) | Exact speed, linear's direction | Unchanged; no longer exactly divergence-free |

`createWindBearingSampler(set, {fromDeg, speed, blend})` holds one blended field. `setWind()` blends again only when the bearing or the speed changes, and `sample()` is one trilinear lookup. `encodeWindBearings` and `decodeWindBearings` write each bearing in the wind-field encoding: 1.7 MB of JSON per bearing for the page's 99,200-cell house site, and 10.3 MB in memory for 8 bearings.

Linear is the default because the registered rule chose it: it carried smoke closest to the exact bearings, by a cancellation described below. Slerp is the principled choice where the free stream matters more than wakes, such as sources upwind of buildings or on open ground; that case was not measured. Keep-speed measured no better than slerp and costs 8–12 times as much per blend.

**Smoke.** `createSmoke({capacity, lifetime, rate, rise, riseTime, spread, jitter, seed, bounds, blocked, sweep})` rides any `sample()`, live or baked.

- **Emitters.** `addEmitter({x, y, z, rate, rise, riseTime})` places a source; `moveEmitter` and `removeEmitter` change them. Each puff starts within `jitter` of its source.
- **Rise.** A puff climbs at rise·e^(−age/riseTime) m/s, taken at the middle of each step, so a step adds the midpoint rule's share of the exact integral. The climb is a drift that does not lift the air.
- **Spread.** A seeded random walk of `spread` m²/s spreads each axis by 2·spread·t.
- **Lifetime and bounds.** A puff expires at `lifetime` seconds or on leaving `bounds`.
- **Solids.** With `blocked(x, y, z)`, a puff in air never moves into or through a solid. The whole move is checked, walk included, and a move that would cross a solid is refused while the puff waits. How the move is checked depends on the test:
  - **A field's test.** `windFieldSolid(field)` carries `segment()`, which walks every cell the straight move passes through (Amanatides and Woo 1987), so no step is too long.
  - **A plain host test** is checked at points no more than `sweep` metres apart. With `sweep` 0, the default, it checks the end of the move alone. That is the stated limit: a move longer than a wall is thick can then skip the wall (20 m/s for 0.1 s crosses 1 m). Keep each step shorter than the thinnest wall, or give `sweep` half a cell.
  - **Jitter.** It never places a new puff in or across a wall from its source.
  - **Buried sources.** A puff that starts inside a coarse voxel moves freely until it is out. The wind is zero inside solids, so only its rise and its walk move it; with neither it stays.
- **Seed.** One seeded stream drives the jitter and the walk. `reset()` rewinds it, so the same seed and the same calls give the same smoke, bit for bit.
- **Helpers.** `windFieldBounds` gives a field's box. `windFieldSolid` gives its solid test, with the cell walk.

**How far baked smoke strays.** Measured on the page's house and street sites at bearings halfway between 8 bake bearings, against the field solved at that exact bearing ([record](reviews/2026-11-04-wind-bearings-smoke.md)):

- **Chimney plumes.** A linear blend of 12-flow-through bakes leaves them 3.4 m (house) and 4.1 m (street roof) from the exact-bearing plume after 30–32 m of travel: 10–12 %. The heading is off by 1.7–2.8°. A default 3-flow-through bake leaves them 4.2 and 5.5 m off. For comparison, snapping to the nearest bake is 12 m and 22° off.
- **Error along the path.** The error lies along the path: how far the smoke has gone, not which way it went.
- **A fire in the street.** 6.3 m off (18 %, 6.4°).
- **The uniform fallback.** 8.1 m and 4.5 m off for the roofs, which is about as good as a bake for smoke above the roofs. For the street fire it is 49 m off, because it carries smoke straight through the buildings.
- **Against live smoke.** About 110–130 live plumes in the running solver wander 9–13 m RMS around their mean path. A practical 3-flow-through bake ends 4.5–4.7 m (roofs) and 9.8 m (street) from that mean.
- **Seed noise.** A bake also carries the seed of its gusts. The measurement is [registered and recorded](reviews/2026-11-04-wind-seeds.md): 8 seeds at 8 bearings on both sites.
  - At 12 flow-throughs the along-wind speed aloft varies by 0.21 m/s from seed to seed, about 3 %. Of that, about 0.15 m/s per seed is a part no window removes.
  - Two 12-flow-through bakes with different seeds end a plume 3.0 m apart (median). A longer average helps: 12 flow-throughs against 3 bring the median separation to 0.62.
  - At the same cost (13 flow-throughs), averaging three or four seeds narrows the typical separation by only 7–14 %, against a registered bar of 30 %.
  - Seeds do cut the large misses, mostly street smoke leaving by another way. That result is not registered and rests on 24 pairs: the 90th percentile falls from 10.7 m to 5.6–6.4 m, and pairs more than 10 m apart from 12 of 96 to none.
  - The record's earlier reading, 6–15 % that longer averaging barely helped, came from two bearings.
  - These numbers predate #39's sampler fix and the swept collision. Re-run on the same bakes with both, 339 of 672 pair separations moved, the largest by 0.46 m, and no pooled median by more than 0.08 m. Three or four seeds then narrow the typical separation by 10–16 %, and the audit finds no step crossing a solid. Every verdict and rule held. R5 now holds on its field bar alone: the plume ratio fell to 0.84, inside its bar of 0.85, while the field ratio stayed 0.94 against 0.90 ([record](reviews/2026-11-04-wind-seeds.md#later-re-run-on-the-fixed-sampler-and-swept-smoke-2026-11-05)).
- **Street forks.** In the street canyon, some bearings send smoke one way or the other on small differences, by up to 19 m.
- **After review.** These numbers were measured before #39's sampler fix (zero anywhere inside a solid cell) and before the swept collision above. With the old endpoint test, 0.035 % of puff steps cut across a solid corner, none through 1 m of solid ([#42](https://github.com/Syntaxswine/nautilus-engine/pull/42)'s audit). Re-run on the same bakes with both, 371 of 720 plume ends moved, the largest by 0.73 m. No median moved more than 0.24 m, and every verdict and rule held. The [record's addendum](reviews/2026-11-04-wind-bearings-smoke.md#addendum-after-review-2026-11-05) has the split.

**Cost.** Measured with Node 24.15 on a Ryzen 7 5800X at 15–44 % background load:

| Operation | Cost |
| --- | --- |
| One baked sample (`sampleWindField`, one trilinear lookup) | 64 ns |
| Two bakes sampled and blended on every call | 149 ns. Sampling one pre-blended field is cheaper, and the gap grows under load: 85 against 743 ns at 100 %. |
| The uniform log law | 14 ns |
| A live `solver.sample` | 211 ns |
| One `createSmoke.step` per puff | 360 ns, so 1,000 puffs take 0.36 ms a frame. The swept solid test adds about 40–50 ns (a one-off check at 40 % load). |
| A re-blend of 99,200 cells (when the wind changes) | 0.7–1.5 ms for linear or slerp; 9–13 ms for keep-speed |
| A default bake (1 + 3 flow-throughs) | About 30–50 s per bearing on one quiet thread for these 100k-cell sites; the page's 8 workers took 297 s with the machine fully loaded |

**Verification.** `tests/wind-smoke.test.mjs` (13 tests, about 4 s, in `npm test`):

- A bake at 8 m/s is twice the bake at 4 m/s in all 147,456 values, gusts included.
- On an empty site each blend meets its free-stream row above to 1e-5 at five bearings, including a wrap past north.
- keep-speed never exceeds its cap, and solid flags follow their weighted neighbours.
- A set survives a JSON round trip, and eight inconsistent sets are refused with their reasons.
- The sampler blends again only on a change.
- Smoke matches its midpoint-rule rise to 1e-5 and the 2Kt spread to 6 %.
- Smoke replays from its seed and keeps each puff's warmth across removals.
- Puffs never cross a wall that unchecked smoke crosses, and a buried source still lets its puffs out.
- In the review's case (20 m/s for 0.1 s at a 1 m wall), a field's test and a host test with `sweep` hold the puff, and a plain endpoint test lets it through, which is the stated limit.
- The segment walk agrees with an exact slab-test oracle on 4,000 random moves.
- Jitter never places a puff in or beyond a 0.2 m wall.
- In a field (the wind is zero inside solids), a buried source with no rise stays put, and with rise it climbs out and is carried.
- A bake over two seeds is their mean value by value (and twice the speed is still exactly twice the field). A seed given alone is the plain bake. Unconverged steps add up. Seeds without gusts are refused.
- `averageWindFields` refuses fields that differ in grid, wind or solid cells.

`node tools/wind-smoke-mutants.mjs` kills 48 of its 49 faults in a private copy, the linear default, the swept test and 13 seed faults among them. The survivor, S19, only changes which cell the walk visits first when a move runs exactly through a cell edge; that move touches all four cells at one point, so it is equivalent. The comment-only control survives.

`node tools/wind-bearings-measure.mjs --out <dir>` repeats the registered bearing measurement; it takes about 45 minutes in 6 workers, and `--dry` checks the plumbing in two.

`node tools/wind-seeds-measure.mjs --out <dir>` repeats the seed measurement: 128 runs, about 80 minutes in 8 workers on a busy machine. It is built for a shared machine:

- it runs at below-normal priority with 4 jobs by default;
- it waits while other processes hold more than `--yield` of the machine;
- it stops cleanly on a `STOP` file;
- it reports `progress.json`.

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

**Mutation sweep.** Twenty-two deliberate physics and plumbing faults went into a private copy. The final suite kills 21; the [record](#mutation-sweep) names the one it misses and why.

## Limits

- **Numerical dissipation.** The step advects and then projects, a first-order split. On the Taylor–Green vortex at CFL 1 that costs 23 % of the kinetic energy per turnover. The loss halves with the time step and does not change with the grid at a fixed step; a midpoint backtrace or turning the limiter off barely changes it. In a site, the inflow keeps resupplying energy and the loss acts like extra eddy viscosity, which softens shed vortices. Advection–reflection (Zehnder, Narain and Thomaszewski 2018) is the known remedy, at about 1.5 times the step cost.
- **Neutral and isothermal.** The model has no buoyancy coupling and no stratification. Smoke rise is a tracer drift that does not lift the air, so a fire's own plume and updraft are absent.
- **Resolution.** Wakes need about 6 cells per building height. With 1 m cells a single storey (about 2–3 m of wall) is barely resolved, so use 0.5 m for low buildings. Porch posts and other parts thinner than a cell become whole cells, and conservative marking can thicken a wall by one cell.
- **Domain size.** Guidelines ask for about 5H of margin upstream, at the sides and above, and 15H downstream (Franke et al., COST 732). The page uses 2–3H so that it stays interactive. The solver reports blockage: about 6 % for the single house and 14 % for the street canyon. Blockage speeds up the flow it squeezes.
- **Slip ground.** The ground has no friction model. The inflow profile is imposed and carried, not maintained by wall shear, so flow behind buildings does not slow against the ground.
- **Closed buildings.** Doors and windows are solid, and interiors are sealed. Through-flow ventilation and smoke leaving a window need open-opening support.
- **Speed.** This is plain JavaScript on one worker. Times below were measured while a foreign process held this machine's 16 threads at 100 %, so they are upper bounds: 46–60 ms per step for 49–60k cells, about 180–285 ms per step for the page's 100k-cell sites. That is 0.5–0.7× real time. Gusts roughly double the conjugate-gradient iterations (about 27 against 13 per step).

## Design evaluation

**Alternatives and context.** The subsystem is smoke direction in a built site: where smoke from a chimney, a burning building or a grenade goes under any wind. It matters to Tinderbox, where fire is the game, and to Farmyard Commando and AFT-3D, where smoke screens. The behaviour that matters is the plume's path at play-time cost. The options:

- (a) One uniform log-law wind for the map, turned to the bearing. This is what a game without wind physics uses, and the fallback.
- (b) This solver baked at a set of bearings and blended at play time (`bakeWindBearings`, `createWindBearingSampler`, `createSmoke`, this branch).
- (c) The live solver every frame.
- (d) Offline RANS or LES in an external CFD tool, as a reference only.

**Accuracy.** The [registered measurement](reviews/2026-11-04-wind-bearings-smoke.md) compares smoke halfway between bake bearings with the field solved at that exact bearing.

- **The uniform wind** points roof smoke the right way: its heading is within 1.3–3.8° of the exact plume's. It lacks shelter, channelling, updraft and downwash. Its roof plumes end 8.1 m (house) and 4.5 m (street roof) off; its street fire ends 49 m off, with the smoke passing through the buildings.
- **An 8-bearing linear blend** holds roof plumes to 3.4–4.1 m (10–12 % of travel, 1.7–2.8° of heading) and the street fire to 6.3 m. Snapping to the nearest bake is 12–22 m off.
- **Sixteen bearings** cut slerp's error at the same targets by 16–34 %, but not linear's everywhere: its street-roof error grew by 17 %.
- **What a single bake carries:**
  - its gust seed: two 12-flow-through bakes with different seeds end a plume 3.0 m apart (median), and occasionally more than 10 m apart on the street site (12 of 96 pairs) ([seed record](reviews/2026-11-04-wind-seeds.md));
  - in a canyon, the forks of the smoke's own path (up to 19 m between two seeds).
- **What it omits:**
  - all the solver's limits (neutral air, slip ground, 1 m cells, small domains);
  - meander, since live plumes wander 9–13 m RMS around their mean;
  - buoyancy, since the rise is a drift that does not lift the air.
- **Offline CFD** would be more accurate still, at a cost no game pays.

**Efficiency.** Measured; see [cost](#baked-bearings-and-smoke).

- A uniform sample costs 14 ns. A baked sample is one trilinear lookup, 64 ns, and a smoke puff costs 360 ns a step, so a thousand puffs take a third of a millisecond a frame.
- Re-blending the 99,200-cell site when the wind changes costs 0.7–1.5 ms. Blending two bakes on every sample instead costs 2.3 times one lookup, and much more under memory contention.
- Baking is authoring time: about 30–50 s per bearing on one thread for these sites, and it scales with cells.
- An 8-bearing set takes 10.3 MB in memory and 13.8 MB as JSON.
- The live solver takes 90–230 ms a step on these sites. It stays an authoring and review tool.

**Narrative.** These judgments are subjective. In Tinderbox, smoke that holds in a courtyard, streams down a street or lifts out of a lee makes the wind legible and position matter. Baked smoke keeps the site's shape of the wind, and it swings at once when the bearing turns, which keeps cause and effect readable. A live plume lags about a flow-through behind a turn. Baked smoke is also steadier than live smoke: without meander it reads as a calm, laminar day. For chimney smoke above the roofs, a uniform drift reads almost the same as a bake. The difference shows where the smoke is low among the buildings, which is where Tinderbox's fires and the tactical games' grenades are. There, smoke can also fork. On the page's street at 248°, the baked plume of a street fire left the canyon over the north row while the live one ran out of its east end; a bake picks one way ([pictures](reviews/2026-11-04-wind-bearings-smoke.md#visual-review)).

**Recommendation (provisional).**

- Bake 8 bearings per map with the defaults (linear blend, `average` 3), and blend them at play time.
- Bake 16 bearings where smoke sits low among buildings and the extra 10 MB is affordable.
- Keep one gust seed by default. Spend a larger budget on a longer average rather than on more seeds: that is the registered rule's choice for the typical plume.
- Where smoke sits low among buildings and a plume leaving by the wrong street would matter, `seeds: 3` or `4` at the same cost cut the large misses. That result is not registered and rests on 24 pairs.
- Add a cheap meander, such as the gust model sampled at the puffs, if steady plumes look too calm.
- Keep the uniform wind as the fallback for maps without a bake. It is already adequate for plumes released above the roofs.
- The observation that would settle it is a Tinderbox scene with fire among buildings, compared side by side under the uniform wind and a bake.

**Adoption status.** This is a candidate, source-only. There is no `./wind` export, and no game, consumer pin or editor flow changes. Whether Tinderbox adopts it is the architect's and the owner's call.

## Mutation sweep

`node tools/wind-core-mutants.mjs` copies the suite and its sources into a private temporary folder. It applies one fault at a time, runs `tests/wind-core.test.mjs`, and exits non-zero on any unexpected verdict. The source tree is never written.

| Round | Suite | Killed | Survivors |
| --- | --- | --- | --- |
| 1 | First 15 tests | 10 of 20 | M02 MacCormack off; M03 limiter revert off; M04 and M06 the two gust paths, each covering for the other; M09 plain IC(0); M10 and M11 voxel plane and edge axes; M12 top seeding; M16 frozen convection; M17 Euler tracers |
| 2 | Plus Taylor–Green, gust entry, CG pin, voxel oracles, convection and rotation tests | 18 of 20 | M03; M12 |
| 3 | Plus the walled courtyard open to the sky (2026-11-04) | 19 of 20 | M03 |
| 4 | Plus the solid-sampling test, after the architect's review. M26 and M27 each remove one sampler's solid check; M18 follows the rewritten field sampler (the committed tool, 2026-11-04) | **21 of 22** | M03 |

The neutral control (a comment-only edit) survived every round. **M03 is the honest gap.** The revert limiter acts only where the corrected value leaves the local range, at sharp gradients, and none of the tests' flows has one: on the Taylor–Green vortex the limiter changes the energy by 0.0003. A test that advects a sharp front and checks the maximum principle would pin it.

## Next steps

- Register `./wind` with an installed-package proof, as the other optional entries have.
- Voxelize an editor map (walls, roofs, prefabs and tiles) instead of catalogue placements.
- Bearing sets, smoke and seed averaging are in place (above). Still open:
  - Register a tail metric for seed averaging, such as the share of plume pairs more than 10 m apart, with at least 96 pairs per arm. It would settle whether seeds should become the default for street sites.
  - Find what makes the part of the seed noise that no window removes (0.15 m/s per seed). The inflow's own time mean does not leave one.
  - Give baked smoke a cheap meander.
  - Measure slerp against linear for sources upwind of buildings.
  - Quantize the stored fields.
  - Let `bakeWindBearings` pass the solver's `step` option on once advection–reflection lands.
  - Add Boussinesq buoyancy if Tinderbox needs real plume rise.
- Cut the dissipation with advection–reflection, checked against the Taylor–Green record above.
- Run faster: a multigrid preconditioner, or a WebGL2 path verified against this one.
