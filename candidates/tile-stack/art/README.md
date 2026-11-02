# Reusable tile finishes — Gate A

Fixed brief/base `5d69c2130eb64b6f4e31bc672e884bdc33bf47d2`; runtime unchanged
from reviewed `2502646482218524fd5129641da769bb82462e4d`. This directory is a
private candidate, outside public exports and the ordinary build/package.

## First metadata/API checkpoint

`tileFinishCatalogue()` returns the immutable typed version-1 catalogue.
`tileFinishFamily(id)` returns its card or null. `tileFinishChoice(input)` checks
exact own data fields and returns `{skinId,version,variantSeed}`; unsupported
IDs/versions/seeds/accessors refuse before any renderer allocation.

| ID (version 1) | Label | Reviewed atlas material/slot |
| --- | --- | --- |
| `skin.brick-pavers` | Brick pavers | brick / 1 |
| `skin.stone-flags` | Stone flags | stone / 2 |
| `skin.timber-boards` | Timber boards | wood / 5 |
| `skin.poured-concrete` | Poured concrete | concrete / 11 |

The resource is the existing 4×4 building-paint atlas, SHA-256
`bbe33709a63362a13e509131c11f358d286b3d55ffcb86ca0ca1def4934ccdb2`.
No new raster work or bitmap copies are needed. Preserve the existing source
notices/rights. The three existing `skin.painterly`, `skin.slate` and
`skin.sandstone` choices remain host-owned compatibility bindings.

The canonical recipe already accepts `interior.skinId` and uint32
`interior.variantSeed`. A family version belongs in the new checkpoint's bound
catalogue identity/version; do not add unknown fields to strict core source.
The Artist supplies no journal, migration, stack planner or contact authority.

## Proposed presentation seam for Editor

The public provider's boundary material lookup is keyed by physical profile,
not by owner. Different cosmetic skins on owners sharing that physical profile
therefore need an explicit candidate appearance binding after actual provider
construction. It will create leased finish materials from a borrowed atlas and
base materials, then bind them to the explicit owner meshes. Canonical geometry,
source/profile/material intervals, UV phase and source controls stay untouched.
This avoids changing any of the accepted six surface modules.

Planned private API (implementation follows this metadata checkpoint):

```js
const pool = createTileFinishPool({THREE, atlas}); // borrowed, sRGB atlas
const appearance = bindTileFinishView({view, projection, choices, pool, current});
// view is from the actual public createTileArtProvider; choices is keyed by
// complete owner IDs and holds validated {skinId,version,variantSeed} records.
appearance.dispose(); // restore only owned bindings, release leases
pool.dispose();       // retire owned materials after borrowers release
```

Seed modulo eight selects bounded colour-tone variants; no texture-phase or
geometry randomisation. Detail 0/1/2 keeps the same finish. Use equal family/seed
for a continuous cosmetic seam. Cosmetic skin is independent of physical
boundary-material IDs and does not grant geometry/game capabilities.

The later study uses actual public-provider rectangles and isolated level
line/arc/cubic paths, and fifteen aligned 8×4 m planes at explicit authored
heights 0…29.68 m. Selected-floor, overview and cutaway modes preserve those
elevations and charge all hidden allocations. Double-sided paint is still one
thin surface. The .12 m source thickness is reservation metadata.

## Builder checklist

- Bind the actual public v1 core/art/provider and one shared host Three.
- Pin the catalogue ID/version; retain complete owner IDs and saved seed/skin.
- Supply the reviewed, loaded sRGB atlas and explicit borrowed base materials.
- Check supported level rectangle/path/profile source with the public provider.
- Preserve canonical attributes/ports/profiles/material intervals and UV phase.
- Treat appearance acquisition as offscene work under the current view ticket.
- Charge accepted/candidate/acquiring/retiring allocations to the existing
  two-root, 50,000-triangle, 1,024-cell ceilings; fifteen decks cost 480 cells.
- Retire owned materials/leases while preserving host atlas/base pools/neighbours.
- Keep physical support, navigation, fire, gameplay, history/save authority and
  real-host adoption separate; Gate B changes need Architect acceptance.

At this first checkpoint only the pure catalogue/choice API is implemented;
material, visual and installed-package evidence follow on the same branch.
