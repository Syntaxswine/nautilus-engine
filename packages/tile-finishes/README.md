# Optional painterly tile finishes

The headless `@nautilus-engine/core/tiles/finishes` entry exposes the immutable
catalogue, family cards, exact saved-choice validation and catalogue binding.
The optional `@nautilus-engine/renderer/tiles/finishes/three` entry applies owned
cosmetic materials to geometry from the actual public tile provider.

Four version-1 families reuse the reviewed building-paint atlas: brick pavers,
stone flags, timber boards and poured concrete. This public library has its own
`nautilus-tile-finish-library@1` identity and content digest; it does not replace
the separately pinned private Gate A catalogue. Save the exact library binding.

```js
import {tileFinishBinding} from '@nautilus-engine/core/tiles/finishes';
import {createTileFinishPool, bindTileFinishView}
  from '@nautilus-engine/renderer/tiles/finishes/three';

const catalogueBinding = tileFinishBinding();
const pool = createTileFinishPool({THREE, atlas});
const appearance = bindTileFinishView({view, projection, choices, pool, current});
// Retire appearance before its public geometry view.
appearance.dispose();
pool.dispose();
```

`choices` supplies every owner as `{skinId,version,variantSeed}`. The host binds
one shared Three namespace, the reviewed loaded sRGB atlas and exact ordinary
opaque `MeshStandardMaterial` bases. Physical materials, subclasses, special
maps, vertex colours, alpha and custom shader profiles require another explicit
adapter and refuse before allocation. The texture is borrowed unchanged.

The profile supports level rectangles and isolated constant-width level
line/arc/cubic paths accepted by the public provider. Fields, clipped/holed or
nonrectangular regions and grades remain explicit refusals for these four
finishes. The separately reviewed generated-angle correction repairs the two
old line-pose failures; original controls and strict authored numeric validation
remain unchanged.

Canonical positions, normals, tangents, border material intervals, ports and UV
phase stay intact. Use the same family/seed for continuous cosmetic seams.
Appearance creates no geometry or textures, and grants no physical floor,
structural support, traversal, collision or fire capability.

Builder checklist:

- Validate exact source/pose eligibility with the actual public provider;
  a family label does not grant geometry support.
- Pin the complete library ID/version/digest and retain stable skin IDs/seeds.
- Supply atlas metadata and ordinary borrowed base materials explicitly.
- Acquire appearance off scene under the current view ticket; charge all
  accepted/candidate/acquiring/unverified retiring allocations together.
- Retire owned material leases, preserve borrowed atlas/base/geometry and
  subsequent host-owned overrides, and verify zero owned allocations at exit.
- Let the host's one authority own edits, history, persistence and recovery.

See [the stacked workspace guide](../../docs/stacked-tiles.md) and adjacent
`source.json` for exact provenance, limits and the preserved historical witness.
