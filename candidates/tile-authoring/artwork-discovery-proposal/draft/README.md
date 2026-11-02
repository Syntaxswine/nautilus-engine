# Public artwork discovery draft

DRAFT ONLY,for Root review. Nothing is registered,published,imported or executed
from this folder. No PNGs/new images were copied here;only exact record/default
metadata,locators,notices,source references and non-executed proposal text. No
repository gates,package build/install,browser or helper ran. C2 still waits for
accepted C1 Editor/Host/capture ABI and Root's explicit handoff.

Baseline main:8184f06aa587542b026352a739f3766d1794c4fe (Root's exactf345 tree).
Canonical Artwork source:43227894c50ec62b71806978195fff2c650eb388.
Accepted Artist/default source:57c651fb0a7ed0b01c1435ba18e87efde290443a.
Original art provenance:f5bfda9ec0f639018ccfee2415b1f70502e77cae.

## Concrete draft contents

- canonical-artwork-30.json:exact30 complete canonical Core records selected by
  the immutable30-row mapping. Kind/version/revision/contentDigest,complete blob/
  ImageView,requires and noticeText remain unchanged. The unrelated31st
  fixture.borrowed-atlas is excluded.
- defaults-and-pins-30.json:full exact57 default Graphics and ResourceRefs plus
  canonical pins and separately identified original Artist bindings. The explicit
  per-mark override example is not promoted as a default.
- shared-assets-rows-30.json:30 plain Artwork discovery rows,appended to the407
  existing reviewed rows for437. Stable IDs are artwork:<canonicalArtworkId>.
  Default footprint dimensions are not mesh/collision/support claims.
- png-locations.json:two whole-page byte descriptors and binary-package anchors;
  no Core package PNG locator. No crop/re-encoding/private source fallback.
- payload-manifest.json:six proposed byte-exact public files,including two PNGs,
  original PROVENANCE,original historical resources.json and retained prompt/SVG
  authoring companions. All source paths are pinned57/f5 provenance,not imports.
- notices.json:the one complete distinct canonical notice;all30 records also retain
  it in place to preserve their actual content digests. Historical source paths/
  status text stay unchanged;new public status belongs in the usage guide.
- artwork-module.proposal.js.txt:ONE future pure module at packages/assets/artwork.js,
  containing the exact records/defaults,PNG locations and registry-row/payload-path
  helpers. It has no runtime imports from Core/private candidates/renderer/DOM/
  storage. It has NOT been imported,parsed as a test or installed in the engine.
- The two .d.ts.txt proposals reuse actual canonical C1 types rather than a second
  artwork/source grammar. The category:'Artwork' discovery overload yields typed
  artworkPin values. No conditional package-export rewrite is required.
- integration.diff.txt identifies precise index/generator/profile/whitelist/build/
  asset/documentation changes. guide.proposal.md is the proposed public usage card.

## Proposed public functions under the existing ./assets metadata namespace

| Named function | Return/use |
| --- | --- |
| listSharedArtwork() | Detached30 complete canonical Artwork records |
| sharedArtwork(exactCorePin) | Detached exact selected record;no implicit latest or Artist alias |
| sharedArtworkDefaults(exactCorePin) | Detached exact57 full Graphic defaults;not an executed operation |
| sharedArtworkImage(exactCorePin) | ResourceRef/blob/ImageView and explicit delivered-package locators;readiness not assessed |

Two tools-only exports,sharedArtworkDiscoveryRows and sharedArtworkPayloadPaths,
serve the generator/distribution tool. They are not re-exported by public ./assets.
Keep SHARED_ASSET_CONTRACT,listSharedAssets and sharedAsset behavior intact. The
public index adds the four named functions;the generator appends its30 plain rows
and owns regeneration of catalogue.js. Do not hand-edit the generated catalogue or
import a private candidate/artifact at runtime.

Human palette and authorized agents consume the same canonical pins/defaults via
the public metadata entry. They then use the SAME C1 Host/resource/command path.
Discovery is outside the saved authoring state;opening a palette must not inject
all30 full records/notices into every document or change history. Selected content
is adopted explicitly with exact closure,locks,current bindings and resource proof.
This keeps the source catalogue separate from C1 Undo/Redo work being optimized.

## Metadata versus actual bytes and exact package locations

Existing Core/compatibility ./assets points to packages/assets/index.js. Assets
profile already exposes that index as ./catalogue;its historical package name and
48 original-building default API remain unchanged. Renderer currently filters the
metadata entry out;Root must explicitly add ./assets -> the SAME index. Do not
expose files.js there:its building URL helper would require model files not in the
renderer profile. No new raw-PNG export or Core-local URL factory is proposed.

| Profile | Public metadata import | Actual PNG delivery |
| --- | --- | --- |
| core | @nautilus-engine/core/assets | NONE;metadata only |
| renderer | @nautilus-engine/renderer/assets (explicit proposed alias) | assets/artwork/local-graphics-v1/resources/{organic-marks-v1,road-marks-v1}.png |
| assets | @nautilus-engine/building-assets/catalogue | Same two package-relative PNG paths |
| compatibility | @nautilus-engine/map-core/assets | Same two package-relative PNG paths |

Locators name the real binary-carrying package,its exported anchor and the relative
file path from that anchor. A Host/build resolver uses the actual installed/mounted
package,checks real byte length/hash and acquires its decoder/resource lease. A Core
module never derives a missing file URL from its own import.meta.url. Locator
metadata is not a fetched file,verified decoder,native allocation or readiness.

Organic:2481966 encoded bytes,1536x1024 RGBA8,
9042b2b0e9ae9a04dd0429dd3645eea85073e210c5a3500ac9a7e30265965aa6.
Road:78234 encoded bytes,1024x1536 RGBA8,
aad9c89ee7be91579cbde662012b76c611eeb8ed75249969d34b0fbff4880633.
Both are full original pages;metadata frames do not become extra PNG files/textures.

The PNGs total2560200 bytes. Recommended original notice/manifest/prompt/SVG
companions add48134 bytes;the complete proposed bundle is2608334. The original
relative resources/ layout preserves historical manifest references. Source notice
links to original Git provenance are not private runtime code imports. SVG remains
an authoring companion,not an implicitly supported runtime image profile.

## All four profile footprint changes

These are proposed UNPACKED FILE-BYTE deltas for this exact draft,not actual packed,
gzip,heap or GPU measurements. No pack/build/install helper was run. Small Root
NOTICE/handoff/build integration edits and generated package-provenance/manifest
bytes are additional/TBD. Proposal headers may change final implementation bytes.

| Profile | Known metadata/type/guide delta | PNG+notice/companion bundle delta | Known file-byte delta |
| --- | ---: | ---: | ---: |
| core | 253315 | 0 | 253315 |
| renderer | 450013 | 2608334 | 3058347 |
| assets | 269202 | 2608334 | 2877536 |
| compatibility | 253315 | 2608334 | 2861649 |

The pure-module proposal is213319 bytes,including complete canonical notices;the
regenerated437-row catalogue projection is211872 bytes versus180321 currently.
Core/compatibility/assets already carry index/catalogue;renderer metadata alias
adds the whole existing catalogue graph plus30 rows,not merely the31551-row-byte
delta. All profiles gain the two asset declaration sidecars and5747-byte guide.
Renderer/assets additionally carry the existing15887-byte FLAT canonical C1
index.d.ts as a type-only dependency. That does not import/ship the Core authoring
executor or schema into their runtime graph. Core/compatibility already carry it.
profile-footprints.json records the exact assumptions and path lists.

Efficiency recommendation:keep binaries out of Core and use one pure metadata
module/one generated row path. Exact immutable notices cost some repeated metadata;
stripping them or restamping records would break identity. Accuracy means records,
frames,defaults,bytes and notices stay exact;availability is reported separately.
Narrative preference is to let games/palettes/agents reuse the same painterly engine
assets rather than create divergent private copies. These are design judgments,
not performance or game-integration proof.

## File ownership and implementation order

| Proposed path/change | Owner after explicit C2 scope |
| --- | --- |
| NEW packages/assets/artwork.js and artwork.d.ts,exact30 data/defaults/blob/notices | Artist supplies reviewed immutable checkpoint;Root accepts/promotes |
| assets/artwork/local-graphics-v1/ six original files | Artist supplies exact Git-byte manifest;Root owns deliberate public delivery |
| Existing packages/assets/index.js and NEW index.d.ts | Root public-index/type review |
| tools/shared-assets.mjs and generated packages/assets/catalogue.js | Root generator/registry integration |
| tools/distribution.mjs,package.json,tools/build.mjs | Root profile/export/whitelist/build/provenance ownership |
| docs/shared-artwork.md,asset-handoffs index,root NOTICE reference | Artist guide draft;Root acceptance/index/publication |
| C1 UI/Editor/Host palette and agent adoption | Root coordinates existing owners AFTER fixed C1;no changes here |

Before Root imports final C2 code,it needs a deliberate immutable COMMITTED source
checkpoint with exact dependencies and checks. This ignored draft and the decoder
spike remain preserved analysis/prototype artifacts;they are not runtime sources.
No main,consumer pin,finish catalogue,Core grammar,Host authority or Sites audience
is changed by the draft. Future package proof must use all four ACTUAL installed
profiles,pure graph/type resolution,exact rows/pins/defaults,source-preserving PNG
bytes/notices and real binary-package anchors;no checkout URLs or fallback.

## Gates that remain unchanged

Root's atlas interpretation and480 DISTINCT-mark mixed proof gate are unchanged.
The same actually attested base+organic+road allocations may count3 across two
views;lease references/copies/acquiring/unverified retirement are tracked separately
under cap4. Additional decoded32MiB,64 TOTAL owned appearance materials,2 roots/
50000 triangles/1024 cells and960 accepted+candidate resident marks retain their
existing semantics. Metadata discovery allocates no decoded texture/material and
cannot attest any such capability. Node spike69/69 is still prototype-only;
no GPU/retirement/phone acceptance is claimed and no spike file was modified.
