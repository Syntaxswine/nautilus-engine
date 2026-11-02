# Reusable tile finishes — Gate A

Fixed brief/base `5d69c2130eb64b6f4e31bc672e884bdc33bf47d2`; runtime unchanged
from reviewed `2502646482218524fd5129641da769bb82462e4d`. This directory is a
private candidate, outside public exports and the ordinary build/package.

## Catalogue and choice API

`tileFinishCatalogue()` returns the immutable typed version-1 catalogue.
`tileFinishFamily(id)` returns its card or null. `tileFinishChoice(input)` checks
exact own data fields and returns `{skinId,version,variantSeed}`; unsupported
IDs/versions/seeds/accessors refuse before any renderer allocation.

`tileFinishBinding()` returns the exact immutable `{id,version,digest}` binding:
`nautilus-tile-finish-catalogue`, version 1, digest
`4da6c7e85b9819aa6c6d847b0447d5baa80db77a824a04e24579209ccc0c381b`.
There is one active version per stable finish ID. Duplicate same-ID rows refuse
even across different versions. Bind the whole mapping for the workspace; do
not resolve a saved ID against a moving catalogue. UI displays the family
version and emits `draft.finishId`; Editor resolves that ID to the fixed family
before writing canonical `interior.skinId`. The initial metadata-only proposal
was fixed at `84bcb886a25826ba710b9c285316bee5582fa7ef`; this complete candidate
adds the content binding and explicit availability/refusal metadata.

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

## Implemented private presentation seam for Editor

The public provider's boundary material lookup is keyed by physical profile,
not by owner. Different cosmetic skins on owners sharing that physical profile
therefore need an explicit candidate appearance binding after actual provider
construction. It creates leased finish materials from a borrowed atlas and
base materials, then bind them to the explicit owner meshes. Canonical geometry,
source/profile/material intervals, UV phase and source controls stay untouched.
This avoids changing any of the accepted six surface modules.

Private API (not a registered public export):

```js
const pool = createTileFinishPool({THREE, atlas}); // borrowed, sRGB atlas
const appearance = bindTileFinishView({view, projection, choices, pool, current});
// view is from the actual public createTileArtProvider; choices is keyed by
// complete owner IDs and holds validated {skinId,version,variantSeed} records.
appearance.dispose(); // restore only owned bindings, release leases
pool.dispose();       // retire owned materials after borrowers release
```

Use an opaque ordinary `THREE.MeshStandardMaterial` as each explicit borrowed
base. The old host's MeshBasic compatibility materials stay with that host;
this candidate does not silently convert them. Base custom shaders, alpha,
vertex-colour fields and additional texture maps refuse. Supply the reviewed
loaded sRGB atlas, channel zero, flipY true and identity offset/repeat/rotation/
matrix. The adapter borrows the texture without changing it. It creates only
MeshStandardMaterials, with double-sided paint and one bounded atlas shader.
Brick/timber/concrete retain their reviewed brushwork. Stone flags soften the
existing stone paint into staggered 1.2×0.8 UV flag joints and bounded pigment
variation; all marks are albedo. It creates no textures, bitmap copies or
geometry. Default pool ceiling is 64 materials; a lower explicit ceiling may
be supplied. A complete view has at most 32 owners.

`bindTileFinishView` takes exactly the complete owner-choice map for a live
actual public view/projection and a `current()` ticket function. Source and
choice data are descriptor-checked before native allocation. It applies paint
to every canonical surface bucket of each owner, preserving physical profiles,
material intervals and separate interface buffers. It refuses a second active
appearance on the same meshes. Failed/cancelled acquisition restores bindings,
releases leases and retires new transaction materials. Disposal restores a
mesh only if its material is still this binding's material; later host-owned
overrides survive. Retire the appearance before the public geometry view.

`pool.dispose()` closes acquisition immediately and defers material retirement
until outstanding leases release. Native throwing listeners are exhausted with
bounded error reporting after counters transfer. Nested acquisition refuses;
reentrant pool disposal latches intent. Borrowed base materials, atlas, geometry,
scene neighbours and shared leases survive. Read-only diagnostics report
owned material/lease counts and final retirement.

Seed modulo eight selects bounded colour-tone variants; no texture-phase or
geometry randomisation. Detail 0/1/2 keeps the same finish. Use equal family/seed
for a continuous cosmetic seam. Cosmetic skin is independent of physical
boundary-material IDs and does not grant geometry/game capabilities.

The study uses actual public-provider rectangles and isolated level
line/arc/cubic paths, and fifteen aligned 8×4 m planes at explicit authored
heights 0…29.68 m. Selected-floor, overview and cutaway modes preserve those
elevations and charge all hidden allocations. Double-sided paint is still one
thin surface. The .12 m source thickness is reservation metadata.

`createArtStudyView` is a private convenience fixture around actual public
prepare/derive/provider calls plus appearance binding. It returns the ordinary
view with `projection`, complete `choices`, `cellCount`, `derivedWork` and
exhaustive material+geometry retirement. `finishChoices`, when explicitly
supplied, is an appearance preview only: it does not edit the canonical source.
`setStudyVisibility(view,{floors,selectedId,mode})` accepts `selected`, `overview`
or `cutaway`; it uses explicit floor elevations, changes visibility only and
keeps all allocations charged. Editor can map `selected-floor` to `selected`
and pass `cutawayFloorId` as the cutaway identity. No CAS/history is supplied.

## Supported and refused cases

Level rectangles pass all eight D4 poses and public details 0/1/2. Isolated
level arcs/cubics pass the same matrix. The current public provider refuses
level line poses `{quarterTurns:1,mirrorX:false}` and
`{quarterTurns:3,mirrorX:true}` with `INVALID_NUMBER /startRad`: valid authored
source produces a derived negative-zero cap angle. These are **provider
derived-value failures**, not authored unsupported geometry. The catalogue
retains both unavailable reasons. See the immutable source/angle/hash witness
in `docs/reviews/tile-stack/art/line-d4-refusal.json`. No saved control is
normalised, no silent retry occurs, and no core/provider rule is weakened.
Architect owns any separately reviewed correction.

Other line poses pass. Overall 360 finish × supported pose × detail × shape
applications preserve canonical data; 24 combinations retain the two named
line-pose refusals across three details/four finishes. Fields, clipped/holed/
nonrectangular regions, graded paths, unsupported profiles, malformed choices,
unknown versions, stale tickets, exhausted budgets and retired pools refuse.
A family card never grants geometry/game capability. The host must first ask
the actual public provider about the exact source and pose, then project any
refusal into UI's `{available:false,reason}` row. Use `{available:true,reason:null}`
only for the accepted geometry context.

## Reproduce and inspect

From this worktree:

```sh
node --test tests/art-tile-stack-*.test.mjs
node tools/art-tile-stack-refusal.mjs
node tools/art-tile-stack-review.mjs
node tools/art-tile-stack-review.mjs --installed
powershell.exe -NoProfile -File tools/art-tile-stack-cleanup.ps1 -Mode source
powershell.exe -NoProfile -File tools/art-tile-stack-cleanup.ps1 -Mode installed
```

The review tool serves candidate HTML explicitly from source in a short-lived
isolated browser. Nothing is added to the ordinary build/example closure. Its
installed mode packs and installs real public packages offline, copies this
candidate openly as private code, and copies the accepted private
`createSmartTileViews` dependency closure with recorded hashes. It is not a
fake public export or replacement core. The disposable consumer is removed in
finally. All browser/server helpers close after review; no preview is retained.

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

The source/installed reports and representative PNGs are in
`docs/reviews/tile-stack/art/`. Real Editor authoring, history/save/recovery and
public registration remain Gate B work after Architect acceptance.
