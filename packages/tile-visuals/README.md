# Canonical native tile surfaces

Optional Artist candidate, based on reviewed core **708ed1c14e69699e4baa4483cbc5a50901d5be4e**. Root owns public exports, schemas, capabilities, whitelist and release registration. This branch does not register another tile API, matcher or save format.

`prepareTileArt(core,bundle,options)` uses the **actual borrowed registered tile core** to reopen/resolve a self-contained bundle, inspect every instance/port, sample curves and derive field windows. It returns detached plain presentation data. `createTileArtProvider(THREE,projection,bindings)` builds owned geometry using one borrowed host Three and borrowed materials. No kernel handle crosses the seam. The projection is a derived cache; save the canonical core bundle instead.

| Usage card | Value |
| --- | --- |
| Identity | `nautilus.native-tile-surfaces`, candidate version 1; provider exports unregistered |
| Purpose | Native **flat surfaces** for binary fields, line/arc regions with nested holes, and level constant-width line/arc/cubic paths |
| Dependency | Actual registered `./tiles` from fixed 708ed1c; host Three r180 and explicit material/profile bindings |
| Space | Authored engine `[x,y,h]` metres → Three `[X,h,Y]`. Core position integers divide by 1e6; directions by 1e12; UVs retain their original dimensionless values |
| Ownership | Host owns core, renderer, scene, materials, maps and persistence. Provider owns geometry/root only; disposal is idempotent and partial construction cleans up |
| State | Canonical `nautilus-tile-bundle` source controls, anchors, profiles, layers, locks, seeds and template references retained. Provider owns no saved state |
| Readiness | Surface presentation candidate. Collision, support, navigation, fire, water and game adoption remain unbound |
| Example | `examples/canonical-tile-art.html`; private installed example below; full 294-study workshop remains preserved at its original checkpoint |

## Supported geometry and explicit limits

The temporary policy is **`canonical-surface-v1-cuts16-interior8-16-32`**. Native binary fields use the actual core's 16-segment internal cuts and 8/16/32 interior grids. External ports use **their exact canonical schedule**, including samples outside that internal schedule. Their positions, normals, parameter tangents, UVs, profiles, IDs and material records remain intact. Surface triangles reference every external sample; separate boundary buffers retain distinct parameter tangents at shared corners. No independent boundary resampling or ID-based geometry suppression occurs.

Binary fields currently require aligned one-metre windows, ±1 corner values and constant height. Both checkerboard saddle choices survive. Flat scalar/paint presentation does not turn a field into a raised solid. Interior field samples come from actual core evaluations; bounded edge refinement avoids long thin triangles. The palette is decorative vertex colour and needs a borrowed vertex-colour or explicit field shader material.

Regions retain line/arc outlines, native base elevation and explicit clips. Nested holes/disjoint islands use the region's parity semantics. Crossing or touching outlines refuse instead of pretending to implement a Boolean graph. Paths retain original line/arc/cubic controls and constant width; the provider constructs a simple capsule envelope of the core-sampled centreline. Non-simple envelopes, reversals and closed path profiles refuse. Use an explicitly authored region for an annulus; no automatic control conversion is performed.

The surface lies at canonical base/field height. **Thickness remains canonical metadata; this provider does not infer solid extrusion, wall sections, skirts or support from it.** Region/path interior refinement never alters the contour. Where another quantized interior centroid would collapse, the original valid face is retained and `quantizationLimitedRefinements` reports the attempted refinements. This changes neither the flat surface nor external constraints; it is not a silent change to the old art study.

All port surface normals must be upward in this profile. Every complete surface/edge/material/border profile and boundary material needs an explicit borrowed binding. Multiple material intervals within one port, conflicting coincident normals/UVs, overlapping distinct profiles and ports outside the actual source contour refuse. Boundary material transitions between different ports can use separate bound materials. Native profile sections, variable widths, Boolean source graphs, graded ramps/stairs, legacy AFT interiors and full-edge-zero ownership remain staged. The old 294-study library and its 32-border evidence are unchanged; their measurements do not describe this provider.

The caller selects bounded curve sampling/error/work controls. The default is 64 segments per primitive, 0.01 m chord limit and 4 m maximum segment; core refuses an insufficient schedule. External declared limits remain separate and authoritative. The aggregate chunk limit is 200,000 triangles, with bounded topology/refinement work. Unsupported geometry refuses before adoption rather than partially returning a live chunk.

## Smallest installed consumer

`node tools/test-tile-visuals-package.mjs` installs the actual declared core/renderer plus a private provider package outside the repository. The candidate package has no embedded Three/core instance and no export overlay on either actual package.

```js
import * as core from '@nautilus-engine/core/tiles';
import * as THREE from '@nautilus-engine/renderer/render-effects/three';
import {prepareTileArt} from '@nautilus-engine/tile-visuals-candidate';
import {createTileArtProvider} from '@nautilus-engine/tile-visuals-candidate/three';
import {canonicalTileArtExample} from '@nautilus-engine/tile-visuals-candidate/example';

const bundle = canonicalTileArtExample(core);
const projection = prepareTileArt(core, bundle, {detail: 1});
const paint = new THREE.MeshStandardMaterial({vertexColors: true});
const view = createTileArtProvider(THREE, projection, {
  materialForInstance: () => paint,
  profileBindings: projection.entries.flatMap(entry =>
    entry.inspected.ports.map(port => ({
      profiles: port.profiles,
      boundaryMaterial: port.geometry.materialIntervals[0].material,
      material: paint
    })))
});
// Host adds view.root to its scene, and uses its own renderer/clock.
view.setResident(['paving-b']); // culling never retires neighboring geometry
view.removeInstance('paving-a'); // disposes only this chunk's owned geometry
view.dispose();
paint.dispose(); // the host's borrowed material survived provider disposal
```

Use `core.openTileBundle(saved,{requireResolved:true})` for restore. Regenerate the presentation projection with the actual core. Never load a saved compiled fragment or cloned catalogue handle as authority.

## Builder checklist

- Pin the reviewed core and exact provider checkpoint; use the actual registered core instance.
- Resolve the whole core bundle before preparing detached presentation data. Preserve raw controls and source identity; reject unsupported profiles visibly.
- Bind complete profile/material records, one host Three and retained renderer services. Keep canonical samples authoritative through every allowed transform and LOD.
- Treat culling/removal as presentation lifetime changes. Keep each remaining chunk's surface and boundary copy; never let a lexical dedup owner delete a seam.
- Save/reopen through core; Editor owns repair, locks, undo and atomic history. This example's reopen button is a bundle proof, not editor adoption.
- Supply actual game query/support/navigation/fire providers independently. Surface availability cannot grant those capabilities.
- Run focused combined tests, fresh contour measurements, the actual installed proof, source/built desktop/phone review and all four repository gates. Verify temporary helper process identities and released ports.
