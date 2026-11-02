# Shared original artwork

The shared palette supplies30 exact canonical Artwork records and original Graphic defaults:29 finite stamps and one repeating detail. Humans and authorized agents use the same metadata. Opening the palette changes no document, content revision, selection or history.

| Field | Contract |
| --- | --- |
| Entry | Existing `./assets` metadata export; the assets-only package uses `./catalogue` |
| Identity | Exact Core `{id,revision,contentDigest}` Pins, distinct from historical Artist `{id,version,digest}` |
| Content | Core432 records and Artist57 defaults; complete frames, masks, pivots, scale and notices preserved |
| Images | Two original whole PNG pages,2,560,200 bytes; six-file original bundle,2,608,334 bytes |
| Ownership | Returned metadata is detached. The caller owns fetching, verification, decoding, leases and rendering |
| Readiness | Metadata and encoded delivery only; no geometry, compositor, Host or gameplay readiness |

## Read the palette

This example works with the ordinary installed Core package. It performs no network, renderer, storage or document operation.

```js
import assert from 'node:assert/strict';
import {listSharedAssets,sharedArtwork,sharedArtworkDefaults,sharedArtworkImage} from '@nautilus-engine/core/assets';

const rows=listSharedAssets({category:'Artwork'});
assert.equal(rows.length,30);
const pin=rows[0].artworkPin;
const artwork=sharedArtwork(pin);
const graphic=sharedArtworkDefaults(pin);
const image=sharedArtworkImage(pin);
assert.equal(artwork.contentDigest,pin.contentDigest);
assert.deepEqual(graphic.artwork,pin);
assert.deepEqual(image.artwork,pin);
assert.equal(image.readiness,'not-assessed');
```

`listSharedArtwork()` returns all30 detached complete canonical records. `sharedArtwork(pin)` resolves only a complete exact Pin; unknown identities, changed digests, omitted revisions and latest/version aliases refuse. `sharedArtworkDefaults(pin)` returns the complete original Graphic. `sharedArtworkImage(pin)` returns the exact ResourceRef, full blob/ImageView, original Artist identity and explicit package locators. These functions neither fetch nor decode an image.

`listSharedAssets()` now includes437 rows: the previous407 unchanged rows and30 Artwork rows. Existing building filters still return61 Buildings; the original-building file API still returns48. Filter by category before calling a model-only provider. Artwork dimensions are decorative brush footprints, not collision or mesh bounds.

## Select an installed image delivery

| Package profile | Metadata import | Original image bundle |
| --- | --- | --- |
| Core | `@nautilus-engine/core/assets` | Absent |
| Renderer | `@nautilus-engine/renderer/assets` | Present |
| Assets only | `@nautilus-engine/building-assets/catalogue` | Present |
| Compatibility/source | `@nautilus-engine/map-core/assets` | Present |

A discovery row's `package:'@nautilus-engine/core'` identifies the canonical metadata origin. Renderer-only and assets-only consumers use their own listed namespace and need no Core runtime dependency. All profiles include the declaration closure; the renderer/assets profiles borrow only the canonical flat type declaration, not its authoring executor.

Each image locator names a binary-carrying package, exported metadata anchor, anchor file, package-relative PNG path and path relative to that anchor. Select a package actually installed by the consumer. In Node, `new URL(location.relativeToAnchor,import.meta.resolve(location.anchorSpecifier))` resolves that package's real image. Browser import maps and resource mounts remain explicit host bindings. Core delivers no image bundle and no Core-relative PNG locator. An uninstalled package must fail resolution; there is no checkout or private-candidate substitute.

The bundle at `assets/artwork/local-graphics-v1/` retains the two original PNGs, original `PROVENANCE.md`, historical `resources.json`, organic prompt and road SVG. Resolve the historical manifest's relative paths from that bundle. The prompt/SVG preserve authoring provenance; they do not add an implicitly supported decoder. No image is cropped, regenerated or re-encoded. The historical notice text remains unchanged; this guide describes the separate metadata/encoded delivery integration and grants no new licence.

## Consumer checklist

1. Select an exact reviewed engine version and use the palette's exact Pin. Preserve canonical and historical Artist identity separately.
2. Keep complete selected records, notices and dependency descriptors. Reading discovery does not insert all30 records into a save.
3. Choose an installed binary package, resolve its explicit anchor, and verify the actual full PNG hash, length and supported image profile.
4. Bind decoder/resource ownership, current context/epoch, source surface/frame/grid and the consumer's command authority before preview or Apply. Current C1 authoring remains rectangle-only and refuses unsupported artwork execution.
5. Preserve saved local controls and use the separately reviewed C2 contracts for compositing, retirement and recovery. Metadata or a file locator is no resource lease or authority capability.

Top-left image/pivot coordinates, full ImageView frame bounds, organic alpha floor2/road0, finite stamps, frame-local repeat detail and the original sampler/alpha defaults remain unchanged. D4, floor conversion, clipping, grouped opacity and native material/resource budgets belong to the actual bound provider. No decoder, compositor, GPU release,480-mark, phone, game or performance claim follows from the package checks.

For accuracy and narrative, this delivery preserves original canonical records and artwork rather than reconstructing them. For processor/storage efficiency, Core carries metadata only and binary packages carry each original page once; default views share page descriptors. The measured byte counts above describe encoded files, not decoded/GPU memory or timing. `packages/assets/artwork-source.json` records exact immutable sources and the single public-status header adaptation.
