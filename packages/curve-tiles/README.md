# Reusable tile art studies

Artist candidate on `codex/modular-curve-tiles`, based on Nautilus `5f3627cd9fc4d95f15b7f1eefafdfb1d6034475f`. These files are an isolated geometry workshop, not a released `./tiles` engine entry. The Architect owns registration; Coder owns the shared tile catalogue, matcher, transforms, repair and save bundle.

The kit generates shapes from compact parameters instead of storing thousands of near-identical meshes. The [inventory](../../art/curve-tiles/catalogue.json) contains 294 named studies: corner masks and saddle alternatives, all 48 original AFT shoreline variants, angle cuts, shallow diagonals, convex/concave arcs, bands, caps, junctions, cubic S bends and width tapers. Continuous parameters supply additional variations within the declared bounds.

Separate family modules demonstrate paving/path regions, water and banks, retaining walls, native ramps/stairs, curved fence panels and cornice sections. The [interactive example](../../examples/curve-tile-art.html) uses the existing engine painterly atlas. It is a review workbench, not the Smart Tile editor tool.

| Usage card | Value |
| --- | --- |
| Identity | `nautilus-artist-tile-catalogue`, content version 1; unregistered candidate |
| Example package | Private `@nautilus-engine/curve-tile-art-candidate`, produced only by the offline package proof |
| Connections | Host Three r180, borrowed surface/base/side materials, optional grid material; no renderer, clock, storage or game RNG inside providers |
| Space | 1 m cells; 2.12 m floor datum. Field study `[x,z]` maps to Three `[X,height,Z]`; canonical engine `[x,y,h]` maps to Three `[X,h,Y]` |
| Ownership | Caller owns core, renderer, materials, textures and scene. Providers own and dispose their geometry/root only. Chunk deletion leaves neighboring geometry intact |
| Persistence | Providers own none. Internal `nautilus-artist-tile-study` JSON is lab input, not an engine save. Actual authoring uses the Coder's future registered `nautilus-tile-bundle` |
| Gameplay | Appearance only. No collision, support, water, climb, navigation, fire, floor binding or adopted game behavior |
| Source | [Source hashes and adaptation record](../../art/curve-tiles/source.json); existing immutable AFT field and existing painted atlas; original bytes and notices unchanged |

## Smallest installed art example

Run `node tools/build-curve-tile-art.mjs`, then `node tools/test-curve-tile-art-package.mjs`. This constructs actual declared core and renderer packages plus a **private** artist candidate, installs them offline outside the repository, checks shared Three ownership and disposes the disposable consumer. It does not register new engine exports or prove final core tile binding.

```js
import * as THREE from '@nautilus-engine/renderer/render-effects/three';
import {createCurveTileDocument, compileCurveTiles}
  from '@nautilus-engine/curve-tile-art-candidate';
import {createCurveTilePreview}
  from '@nautilus-engine/curve-tile-art-candidate/three';

const study = createCurveTileDocument({
  kind: 'ring', center: [2.17, 2.31], radius: 1.43, width: 0.63
}, {sampling: 8});
const {tiles} = compileCurveTiles(study, [[0, 0], [1, 0]]);
const material = new THREE.MeshStandardMaterial({color: 0xb6ae94});
const view = createCurveTilePreview(THREE, tiles, {
  materials: {surface: material, base: material, side: material}, seed: 17
});
// Caller adds view.root to its scene and renders with its own renderer.
view.dispose(); // idempotent; the borrowed material survives
material.dispose();
```

For the final engine provider, Coder's actual installed core must generate and validate the detached projection. Replace the lab compiler with that projection adapter after a fixed reviewed dependency is available. Do not copy kernel objects across installations or transform world-frame samples twice.

## Geometry policies and limits

All agreed border vertices and intersections are retained while interior density changes between 8, 16 and 32 steps/m. The art schedule uses 32 intervals/m on cell borders; this is a sampling policy, not a claim of 1/32 m shape accuracy. Derived positions quantize to 1e-6 m; raw authored controls remain intact. Cubic paths use a separate 0.001 m chord-flattening bound before field triangulation; that bound does not establish the final triangulated contour's error. Curve direction inspection uses a separate 1e-12 policy. Authoritative analytic descriptor identity, sampling error, face IDs, ports and matching belong to core.

Top/base UVs use world ground metres. Field skirts use `(x + y, h)` in engine coordinates; vertical stair risers use `(x,h)`. These are explicit art mappings; direct joins require the same approved mapping, phase, paint and border profile. A material mismatch needs a transition recipe. Decorative seed tint fades to zero on every cell border and never changes geometry or consumes game randomness.

Bounds are deliberate: field radii 0.25–64 m, widths 0.25–32 m, at most 4,096 distinct cells per batch in the laboratory's coordinate window, 128 Boolean shape nodes and 12 nesting levels. Annular holes smaller than 0.25 m across are refused. Native height studies allow dimensions from 0.01 to 16 m; stair tread/riser increments must be at least 0.001 m. Nonzero field heights cannot collapse under position quantization. Profile studies accept 2–2,048 path stations and at most 65,536 quads; collapsed input is refused. None of these are proposed global engine limits.

The field studies use zero-positive classification with explicit saddle-centre choices. Point contact is not declared traversable. The lab edge comparator is a diagnostic for these studies only: it is **not** the shared semantic matcher and does not establish analytic identity, reservations, layered join legality or readiness. A contour lying exactly on an entire cell edge still needs canonical step/side ownership from core before adoption. Generated surfaces/sweeps have no bottom caps; they do not claim closed-solid manifold geometry.

The stair's first tread sits at `rise/steps`, with a riser down to zero. Its start tread sample reports that actual height; it is not mislabeled as a flat lower landing. A separate landing/transition must bind through the shared height contract.

## Builder acceptance checklist

- Use the registered core catalogue/compile/transform/layout/matcher from the actual borrowed core instance. Await its exact fixed dependency before adopting this candidate.
- Bind the detached canonical projection to surface/profile geometry, preserving every border sample, raw controls, floor elevations, channels/layers, masks and readiness records. Group cells under semantic regions/paths/chunks.
- Keep borders independent of interior LOD and seed. Preserve positions, normals, canonical parameter tangents, material/UV phase and full source IDs through all allowed D4 transforms.
- Test diagonals, holes, tapers, curved widths, junctions, explicit transitions and layered crossings. Keep skirts only on actual exposed interfaces; preserve every neighbor when chunks unload.
- Use core bundle save/restore, atomic neighbor repair and manual locks. The Smart Tile Paint/Rectangle/Path interaction belongs to Editor/UI; this workbench does not implement it.
- Supply actual collision/support/navigation/fire providers as required by the adopting game. Visual readiness alone cannot enable gameplay.
- Run the four repository gates, focused mesh tests, source/built browser review and installed package proof. Dispose temporary helpers and verify their exact process identities and released ports.

See the [Architect handoff](../../docs/reviews/curve-tiles/README.md) for evidence, tradeoffs and remaining integration work.
