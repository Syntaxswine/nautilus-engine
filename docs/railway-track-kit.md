# Raised railway track kit

Find **Railway** in Map Workshop’s Asset library. The straight and quarter-curve previews use the same original meshes and materials that a game loads from `@nautilus-engine/renderer/assets/three`. Look up the version-1 asset cards through `listSharedAssets({category: 'Railway'})`.

| Piece | Native footprint | Start to end on the ground plane |
| --- | --- | --- |
| `railway:track-straight` | 2 × 2 m | 0, 0 to 0, 2 |
| `railway:track-quarter-curve` | 5 × 5 m | 0, 0 to 4, 4 |

The compact branch-line profile has 0.90 m between rail centres. Its gravel crown rises 0.265 m, one eighth of a 2.12 m story, before rolling down to the surrounding ground. Timber ties and steel rails sit on that crown, with the rail head at 0.43 m. The curve has a 4 m centreline radius. Both ends use the same cross-section, rail spacing, normals and repeating gravel phase. Tie spacing is 0.50 m on the straight and is distributed evenly along the curve.

The pivot is the centre of the start connector at ground height. Asset cards give port positions in engine coordinates `[x, y, height]` and outward headings in `[x, y]`. The mesh uses Three coordinates `[x, height, z]`, with the start running toward +Z. Align port positions, face their outward headings opposite one another, and keep both at the same elevation. Use a yaw rotation to orient the piece at either end.

## Use in a game

```js
import {createRailwayKit} from '@nautilus-engine/renderer/assets/three';

// THREE and scene come from the game's existing renderer.
const track = createRailwayKit(THREE);
const incoming = track.create('railway:track-straight');
const curve = track.create('railway:track-quarter-curve');
const outgoing = track.create('railway:track-straight');
curve.root.position.set(0, 0, 2);
outgoing.root.position.set(4, 0, 6);
outgoing.root.rotation.y = Math.PI / 2;
scene.add(incoming.root, curve.root, outgoing.root);

// A single segment can retire without releasing shared materials.
// incoming.dispose();
// Retire the kit when leaving the level.
// track.dispose();
```

The kit creates two procedural texture maps and shares geometries and materials across segment instances. Ties and tie plates are instanced. The kit owns those resources and removes its live roots on disposal. The host owns its renderer, scene, transforms and serialized placements. An unknown asset ID throws before a segment is created.

## Builder checklist

- Pin the installed renderer and catalogue. Choose an exact asset ID and preserve it with the host’s transform.
- Match the two metre bed and its ground datum to the host’s tiles. Verify both rails, the bed and tie spacing across a straight-to-curve seam at the intended camera scale.
- Supply any train routing, collision, support and navigation through the game. The Workshop currently offers preview and rotation. This kit has no Workshop map placement or save binding.
- Reopen the host’s placement data and check the same joins. Dispose individual segments or the full kit when unloading and keep the host renderer alive.

Original procedural geometry and gravel, wood and steel finishes are authored in `packages/railway-visuals/`. The focused test checks both joins, the shared resource lifetime and the editor discovery entries.
