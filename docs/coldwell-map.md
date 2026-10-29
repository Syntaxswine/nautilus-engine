# Coldwell Silo woodland compound

The [surface map](../maps/coldwell-site/surface.map.json) is a native 240 × 240 tile Nautilus map with a dirt approach, open chain-link entrance, gatehouse, maintenance workshop, utilities shed and 78 standard tree placements. The existing silo access kiosk forms the fourth surface structure. There are no authored enemies or mission objectives. The four inherited squad anchors and single travel marker preserve the existing portable map format; a Farmyard mission owner can deliberately select the first spawn and define its own cast and objectives.

Open the [complete bundle manifest](../maps/coldwell-site/map.bundle.json) when transferring the site. The surface JSON is only one component. It deliberately reserves the silo and access-kiosk footprints as void tiles; the required companion supplies the actual floor support, stair openings, round walls and underground structure. The square corners around the round shaft are filled by newly authored clipped polygons. No ground plane caps the shaft when the cover opens. [Site plan](../maps/coldwell-site/site-plan.svg), [layout inventory](../maps/coldwell-site/site-layout.json) and [native visual review](reviews/coldwell-map/README.md).

The support buildings have 2 m walls and flat roofs at the standard 2.12 m datum. The underground collection retains all 23 declared height positions and its 2.12 m interval. Full floor tiles remain 1 × 1 × 0.12 m; the surface infill and curved boundary cells remain explicit polygons. Standard existing tree presets and their larger variants are used at their authored scale, with clear approaches and an eight-metre planting buffer outside the fence.

## Exact source and coordinate binding

Target released source: [Nautilus v0.8.0](https://github.com/Syntaxswine/nautilus-engine/tree/v0.8.0), full commit `8c4670450cb2b38c1e1abd811d633c22de9e2b7c`. The original silo remains pinned at `3b9d4004a7e51e5d345cded068fc46eab2f320a2`. The source collection's earlier world-reference pin is preserved as provenance; the map's current validation target uses the released implementation with the same reviewed world/runtime bytes.

| Frame | Mapping |
| --- | --- |
| Legacy map / native Three preview | Silo `(X,Y,Z)` → `(X + 38, Y, Z + 85)`; surface stays at Three Y = 0 |
| Legacy map → nonnegative world | `(x,y,height)` → `(x + 0.5, y + 0.5, height + 46.64)` |
| Silo local → world | `(X,Y,Z)` → `{x:X + 38.5, y:Z + 85.5, h:Y + 46.64}` |
| Deepest occupied silo floor / ground | World h = 0 / 46.64 m |

Integer-centred legacy tiles cover `[−0.5,239.5]`. The common half-metre horizontal translation puts their edges in `[0,240]` without shrinking geometry or separately moving collision. Apply the same rigid transform to terrain, models, openings, landings and markers exactly once. Native scale stays `[1,1,1]`; no loading-time height rounding or stair rescaling occurs. `height-reference.world.json` validates 23 floor datums only; its empty surfaces/entities/links do not claim complete gameplay support.

## Farmyard handoff

This is a preserving adoption candidate, not an installed Farmyard operation. The current inspected importer at `3a557bf743e5c5bb9728a3bee835ce85765c721a` accepts a narrower ground profile. Its real immutable source rejects this authored surface and isolated dirt, void, fence, tree and roof probes. [Exact compatibility report](reviews/coldwell-map/compatibility.json). It has no adopted curved/deep companion import contract. Farmyard's owner must confirm its current seam and bind these features before enabling play; no donor checkout or game pin was changed.

`assertColdwellImport(bundle, consumer)` is an explicit intake gate, not a geometry converter. It refuses missing required capabilities, removed companions and changed source pins. The `artist-coldwell-*` identifiers declare work the receiving provider must actually implement; they are not registered engine/game capabilities. The host must additionally load every manifest file, verify its hash, bind collision/navigation/dynamic states and validate the result against the real game. A receiver must not advertise the capabilities simply to bypass refusal. Keep surface-only loading clearly labelled as a component preview.

The handoff ZIP includes the original complete silo archive unchanged, this map's JSON/RLE/SVG files, infill geometry, original composition source, review evidence, provenance and a top-level Farmyard handoff guide. Keep the nested archive beside `map.bundle.json` under `maps/coldwell-site/`. The RLE file is a lossless packed equivalent for intake tooling; it changes no unsupported feature into something else.

## Reproduce

```powershell
node tools/build-coldwell-map.mjs
node tools/audit-coldwell-map.mjs --farmyard-repo 'PATH_TO_READ_ONLY_FARMYARD_REPOSITORY'
node --test tests/coldwell-map.test.mjs
npm run build
node docs/reviews/coldwell-map/review.mjs
```

The optional donor audit reads only the exact named Git objects and stores its byte-preserved three-module closure in ignored `artifacts/`; it never reads uncommitted donor source or adds a runtime dependency. The validator closure is checked against the released engine objects. The native viewer uses the built editor inspection renderer and its real asset base path, the original optional silo provider and the borrowed atlas. Above-ground viewing submits the surface plus the nearest two underground intervals visible through openings; floor/whole cutaway modes hide the surface presentation without changing saved geometry. Host rendering and gameplay truth remain separate.

The browser review has a bounded five-minute lifetime and closes its owned server and isolated browser in `finally`. It reviews surface/interior/cover/underground views, real document edits, undo/redo and saved reload. Save the exact helper cleanup receipts; no preview service is retained.
