# Original building catalogue

The first architecture collection contains **48 original buildings**: 24 homes, eight civic buildings, eight commercial buildings and eight farm/utility buildings. It includes 77 floors and 409 described rooms. Modern developer plans and historic measured drawings informed the arrangements; the dimensions, room grids, silhouettes, combinations and names are authored for Nautilus.

Run `npm run build`, then `npm run serve:buildings`. Open the URL printed by the server. The gallery offers painted, grey and wireframe finishes; detailed and simplified geometry; roof removal, floor plans, interior cutaways, hinged doors and individual downloads. Drag to orbit, scroll to zoom, or use **Fit model**. The server uses a free loopback port and stops after 30 minutes or when its private STOP file is created.

![The 48 building designs](reviews/building-catalog/catalogue-sheet.png)

## Sources and authoring

The [reference register](../art/buildings/reference-register.json) records 24 searches, 22 opened public sources and 159 successfully saved reference media files. These include plans, elevations, title/site sheets and exterior images; they are not 159 distinct floor plans. Eleven records have explicit plan/exterior pairs. Twenty source contact cards were visually reviewed. Two unavailable records remain recorded and are not model dependencies. Some open sources supplied contextual typology rather than an extracted plan.

Public examples include [Lennar's Dover](https://www.lennar.com/new-homes/georgia/middle-georgia/warner-robins/emerald-oaks/emerald-oaks-ranches/dover), [Columbia](https://www.lennar.com/new-homes/minnesota/minneapolis-st-paul/lakeville/antlers-ridge/columbia) and [Liberty Next Gen](https://www.lennar.com/new-homes/nevada/las-vegas/las-vegas/the-henry/the-henry-two-stories/liberty-next-gen), plus Library of Congress records for a [school](https://www.loc.gov/item/in0138/), [depot](https://www.loc.gov/item/fl0310/), [general store](https://www.loc.gov/item/nj0302/), [barn](https://www.loc.gov/item/tx1081/) and [warehouse](https://www.loc.gov/item/il0699/). Source images remain in ignored local review artifacts. Runtime files and the downloadable pack contain our models and textures.

`packages/building-catalog/designs.js` preserves the architectural recipes. `index.js` compiles the half-metre footprint grid into floor cells, room outlines, partitions, real window/door apertures and descriptive circulation. `three.js` generates the preserved detailed source and its game derivative from the same settled design. The detailed source adds bevels, roof relief, denser railings and curved fittings. This is procedural architectural authoring, not a hand-sculpted character or a reconstruction of a purchased construction set.

The selected 1254 × 1254 atlas contains 16 newly painted materials. The prompt, refinement prompt, first output and selected output are preserved with [generation provenance](../art/buildings/generation.json). UVs clip metre-sized patches into atlas cells, including triangular roof faces. The texture is broad painted material color under dynamic lighting; no source photograph is projected onto the buildings.

## Use the source package

```js
import {compileBuilding, roomAccess} from './packages/building-catalog/index.js';
import {createBuildingModel} from './packages/building-catalog/three.js';

const blueprint = compileBuilding('violet-bay-house');
const model = createBuildingModel(THREE, blueprint, {atlas, lod: 'game'});
scene.add(model.root);
model.setDoorsOpen(true);
model.setView({roof: false, maxLevel: 0, cutaway: true});
console.log(roomAccess(blueprint));
// On scene disposal:
model.dispose(); // Releases owned geometry/materials; keeps the borrowed atlas.
```

Pass the consumer's own Three.js instance and loaded atlas. The headless compiler does not require Three.js, the DOM, storage or a network connection. Use `{lod: 'authoring'}` for the detailed source. Package exports are `@nautilus-engine/map-core/buildings` and `@nautilus-engine/map-core/buildings/three`.

Every exported building in `assets/buildings/models/` has a standard glTF 2.0 file, its `.bin` geometry buffer and a `.blueprint.json` file. Keep the shared `painted-materials-v2.png` one directory above the models; the glTF uses that relative URI. Door nodes retain hinge pivots and metadata. glTF does not contain an animation clip or our JavaScript interaction methods. The catalogue records SHA-256 hashes, bounds, source IDs and geometry counts; `npm run check:buildings` verifies the files against the recipes.

## Scale and adoption boundary

| Property | Contract |
| --- | --- |
| Unit / render axes | One metre / `(x, height, z)` |
| Footprint origin | Front-left ground corner of the main mass |
| Wall height / thickness | 2 m / 0.16 m |
| Slab / floor spacing | 0.12 m / 2.12 m |
| Typical door | 1 m wide, 1.65 m high |
| Footprint authoring grid | 0.5 m |

These dimensions preserve Nautilus/AFT compatibility. They compress normal domestic ceiling and door heights. Roofs, porches and ornament can extend outside the main footprint; exported bounds include those extensions. Ground slabs extend 0.12 m below zero.

This collection is integrated into Nautilus's asset package and review gallery. Consumer movement, collision, fire, navigation, destruction and persistence still require explicit game adapters. The room graph checks adjacency through described openings; it does not certify a navigable human route, clearance, egress or structural behavior. Stair geometry and upper slab holes are included; circulation needs consumer validation. Towers, turrets, dormers and cupolas are architectural detail; only the explicitly listed floors/rooms describe interior space. The models are unfurnished. Windows on those decorative volumes are surface details.

## Cost and validation

The 48 game meshes contain 763,402 triangles in total, versus 1,358,208 in the detailed source: a measured **43.8% geometry reduction**. Individual game models range from 6,226 to 42,822 triangles. Raw exported geometry totals 69.89 MiB. These figures describe files and geometry, not frame rate or city-scale performance. Materials/meshes are grouped by kind, floor and material; doors remain separate articulated nodes. Large settlements will need consumer instancing, culling and additional distance LODs.

Use `npm run build:buildings` to regenerate exports and `npm run check:buildings` to verify source/export agreement. `npm run review:buildings` uses a task-owned headless Edge session with local Playwright and stops its browser/server in `finally`. `NAUTILUS_ART_NODE_MODULES` can point at a different installed Node module directory. The [visual review](reviews/2026-10-28-building-catalog.md) records the actual comparison and limits. The normal repository check includes catalogue validation.

`python tools/package-building-catalog.py` produces a ZIP under ignored `outputs/`. It includes game exports, room data, the selected atlas, detailed-source recipes, prompts, reference metadata and review images. Full construction drawings and reference photos are excluded.
