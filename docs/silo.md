# Coldwell Silo artist collection

Coldwell supplies one assembled underground complex and 14 assemblies or repeat pieces for Nautilus. It uses the existing native metre kit and actual procedural solids. There is a detailed authoring mesh for each asset, a reduced game mesh, an editable artist blueprint, and a standard glTF 2.0 export. See the [catalogue](../assets/silo/catalogue.json), [visual review](reviews/silo/README.md), [original floor drawings](../art/silo/plans/) and [provenance](../art/silo/references.json).

The complex follows the broad arrangement documented in the [NPS Titan II museum nomination](https://npgallery.nps.gov/NRHP/GetAsset/NHLS/92001234_text): a separate control capsule, access portal and blast lock connect by cableways to the silo. This is an original rounded game adaptation. Deck positions, stairs, partitions, furniture and surface details are authored choices, not measured reconstructions.

| Feature | Artist dimensions |
| --- | --- |
| Vertical spacing | Exactly 2.12 m, 22 intervals / 23 height datums |
| Native surface / deepest occupied floor | Y = 0 / −46.64 m |
| Silo | 17 m outside diameter, 15 m clear interior, 8 m central void |
| Equipment decks | Eight, with six small movable service bridges |
| Control capsule | 12 m outside / 10 m clear diameter, three principal decks at double intervals |
| Cableways | 3 m clear diameter, 2 m flat walking deck, nominal lengths 14 m and 62 m |
| Blast lock / access portal | 9 × 9 m / 5 × 6 m |
| Repeat stair | 4 × 3 m, two flights, 12 risers over 2.12 m |

Room diameters and principal horizontal room dimensions are whole metres. Wall thicknesses, props, structural details and stair treads retain appropriate sub-metre sizes. Full floor cells remain 1 × 1 × 0.12 m. Cells intersecting round walls or the central void become explicit clipped polygons. Circular walls have actual openings; no opaque square tile substitutes for an aperture. The surface floor also retains the opening for the final stair flight. Service-bridge entrances have corresponding railing gaps.

The game mesh uses 96 facets around the main shaft rather than the source's 256; rod sides and small chamfers are also reduced. This preserves the authored dimensions and layout rather than globally shrinking or rescaling the model. Both meshes remain available in `assets/silo/models/*.game-mesh.json.gz` and `art/silo/sculpts/*.source-mesh.json.gz`. Gunzip and parse JSON to inspect positions, normals, UVs, floor-cell polygons, landings and moving-part descriptors.

## Use with a host renderer

These are optional relative artist modules, not public root package exports. The host supplies its existing Three instance, renderer and texture, enables local clipping, and owns input and time.

```js
import {createSiloModel} from './packages/silo/three.js';
const model = createSiloModel(THREE, 'coldwell-complex', {atlas});
scene.add(model.root);
renderer.localClippingEnabled = true;

// Render a nearby height window without submitting the entire model.
model.setView({floorIndex: 17, band: 1, cutaway: true, roof: false});
model.setRigPose('blast-door-west', 45); // independent degrees, 0…90
model.setPlatformsRetracted(true);
model.setCoverOpen(0.5);                // normalized 0…1

// Native signed geometry is preserved; the separate world-height binding
// translates the deepest occupied floor to h=0.
model.root.position.y = 46.64;
model.setView({floorIndex: 17});        // refresh transformed clip planes

model.dispose(); // idempotent; frees owned geometry/materials, preserves atlas
```

`setView` supports an overview (`floorIndex:null`) or indices 0–22 with bands 0–3. Its three switches are `cutaway`, `roof` and `display`. The last controls the inert central display silhouette. `diagnostics()` reports candidate visible geometry; renderer statistics additionally account for camera culling. The shader path requires the reviewed r180 map fragment; unsupported shader hosts fail explicitly. `uvMode:'atlas'` uses pre-baked atlas UVs and the standard material path at a higher triangle count. The host must not independently rescale visual or collision geometry. Refresh the view after changing root placement or orientation.

`authoredAnchor` in each blueprint identifies its authored placement point. Large assemblies retain the complex's original coordinates; place an anchor at a chosen location by setting the root translation to `desiredAnchor - authoredAnchor`, with any native-to-world offset included exactly once. Repeat pieces have local construction coordinates. The standalone stair's indices 22 and 23 mean native local Y = 0 and 2.12; these are template endpoints requiring explicit host floor-ID assignment, not an extra occupied floor in the full complex. The complete complex has only indices 0–22.

The standard glTF exports use external `.bin` files and the sibling atlas. Keep the directory structure intact. Each door, bridge and cover has an independent one-second presentation clip. The host chooses time and any game event/collision policy. Source and game variants use the same metre envelope. Export UV seams are split and V is reflected for glTF's image convention; the native renderer needs no external loader.

## Engine intake boundary

The architect directed this collection to preserve signed native heights and supply a reversible +46.64 m offset for the reviewed `nautilus-extended-world` v1 / `native-metres-v1` contract at `fbb57293805ecae34569ab3dd9f689ffea53beb0`. `height-reference.json` contains only the 23 strictly increasing nonnegative floor datums. Its empty surface, entity and link arrays are intentional: it validates the height mapping, not a playable silo. Original surface depth labels and the offset live separately in `artist-binding.json`.

The current provider handles axis-aligned solids and landing links. It does not provide curved-wall queries, polygon support, swept stair clearance or dynamic door/cover collision. Those capabilities require architect-owned intake before this can be placed and played as a complete map-editor building. Mesh AABBs and motion bounds are broad-phase envelopes, never exact curved collision. `exportSiloToLegacy()` rejects with `UNSUPPORTED_SILO_GEOMETRY`; it cannot silently flatten the structure into six legacy layers. No core, editor, vendor, version, game pin or private deployment audience changes are included here.

## Reproduce

```powershell
node tools/build-silo.mjs
node tools/build-silo-plans.mjs
node --test tests/silo.test.mjs

# Optional independent audit dependencies stay under ignored artifacts/.
npm install --prefix artifacts/silo/audit-runtime --ignore-scripts --no-audit --no-fund --save-exact gltf-validator@2.0.0-dev.3.10 three@0.180.0
node tools/audit-silo.mjs
node docs/reviews/silo/review.mjs
```

The world audit reads the exact reviewed Git objects and preserves an audit-only closure in `artifacts/`; that commit must exist locally. The browser review starts its own bounded isolated browser/server and closes both in `finally`. It never uses the user's browser. `viewer.html` is the native interactive review source, and `export-viewer.html` independently reloads the standard exports with the official pinned GLTFLoader. Saved captures can be reviewed without retaining a server.
