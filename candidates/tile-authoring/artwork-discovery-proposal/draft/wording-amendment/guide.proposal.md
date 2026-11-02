# Public shared artwork delivery proposal

DRAFT ONLY. Wording amendment to the preserved parent guide; prepared under ignored artifacts; no public module, asset copy,
registration, runtime import or readiness is currently supplied by this document.

Use the existing ./assets metadata entry to discover the engine's30 original
albedo/alpha artwork records. These are the exact canonical Core432 records,
with full notices, and the exact accepted Artist57 full Graphic defaults.
The default set is 29 stamps + 1 repeating detail. The detail repeats within
its authored ImageView frame.
fixture.borrowed-atlas and the explicit per-mark override example are excluded.
Core pins{id,revision,contentDigest} and original Artist{id,version,digest} remain
separate identities. No record/default/frame/prompt/PNG/notices are regenerated.

## Proposed named API

listSharedArtwork() returns detached complete canonical Artwork records.
sharedArtwork(pin) resolves ONLY an exact Core pin to its detached record.
sharedArtworkDefaults(pin) returns the exact detached57 full Graphic default.
sharedArtworkImage(pin) returns the unchanged ResourceRef,blob,ImageView and
explicit package-delivery LOCATORS. It does not decode/fetch a PNG or issue a
resource/geometry/material lease. No implicit latest/version alias is accepted.

listSharedAssets({category:'Artwork'}) supplies30 plain discovery rows. Select
row.artworkPin, then use the same APIs for the human palette and an authorized
agent. A discovery read changes no workspace/content revision/history. Import
only the explicitly selected canonical content/dependency closure through C1;
do not embed all30 full notices/records into every document merely because the
palette was opened. Creation/editing still uses the sole C1 Host authority,
locks,current frame/bindings and transactional resource protocol.

Default dimensions in discovery rows are decorative brush footprints, not mesh,
collision/support bounds or a gameplay promise. The row's canonical metadata
entry is @nautilus-engine/core/assets. The assets package exposes the same index
through its existing @nautilus-engine/building-assets/catalogue entry. The renderer
profile needs an explicit ./assets alias to that same index (proposed, not present).
The source/compatibility package uses @nautilus-engine/map-core/assets.

row.package = '@nautilus-engine/core' identifies the canonical metadata origin.
It does not require renderer-only or assets-only consumers to depend on Core.
Under the proposed package plan, they use their own metadata entries listed
above; actual type, path, package and notice proofs remain required at integration.

## Metadata and actual image bytes are different deliveries

Core package:metadata/types/guide only. It delivers NO artwork PNGs and no function
constructs a PNG URL relative to a Core module. sharedArtworkImage returns locators
for packages that actually carry bytes:renderer,assets,compatibility. There is no
Core locator and no readiness implied by a locator being listed.

Each locator names its package,exported anchor,anchor file,package-relative image
path and relative path from that anchor. A Host/build resolver selects an INSTALLED
binary-carrying package, resolves its actual anchor, fetches bytes,checks exact
length/hash/profile and acquires the real decoder/resource lease. It must not
substitute the Core ./assets anchor. Imported metadata does not prove file delivery.
Package export maps need no raw-PNG subpath exports:the explicit exported metadata
anchor locates the known packaged path. Browser import-map/resource mounting is a
Host binding, not a hidden network action in the pure metadata module.

Proposed binary root:assets/artwork/local-graphics-v1/. Preserve original relative
bundle layout:resources/organic-marks-v1.png,resources/road-marks-v1.png,
PROVENANCE.md,resources.json,prompts/organic-marks-v1.txt andresources/road-marks-v1.svg.
The historical Artist manifest is provenance/import metadata, not the canonical
Core saved grammar; its original relative PNG URIs remain valid in that bundle.
SVG/prompt are retained authoring companions, not new implicitly supported image
formats. The two PNGs total2560200 bytes; exact notice/metadata/authoring companions
add48134 bytes. The proposed complete binary-carrying bundle is2608334 bytes.

The notice's historical statement that these began as unregistered samples stays
byte-exact. This guide explains the separate proposed public metadata promotion;
never edit immutable noticeText to update status, restamp a Core digest, crop a
frame into another image, remove low-alpha gutters or replace the artwork.

## Required renderer/resource bindings

The full frame rectangle,top-left image/pivot policy,organic alphaFloor2/road0,
linear-premultiplied bilinear sampling,finite stamp/detail frame repeat,full
source-local transform/mask and grouped layer opacity remain the frozen contract.
The Node decoder spike is prototype evidence only. Actual byte delivery,PNG
profile/current epoch,physical allocation identity,resource leases,geometry clips
and native compositor readiness remain separately verified requirements.

Root's four-page interpretation is unchanged:distinct ACTUAL sampled atlas
allocation bindings across the live host/context epoch,including base/artwork/data
atlases. Sharing needs identical native allocation+context+epoch attested by the
real provider;matching hashes/Three source do not suffice. Keep leases separate.
Both single-page480 DISTINCT-mark cases and the additional mixed480 case remain
required;accepted+candidate retain960 records. Additional decoded32MiB,64 TOTAL
materials and every acquiring/unverified-retiring charge remain unchanged.
No discovery row or file locator grants GPU/renderer/gameplay/performance support.

## Adoption and review

Root owns export/index/generator/distribution/build/registration integration.
Artist supplies exact original data/defaults/blob/notices and,only after C2 runtime
authorization,an immutable committed source checkpoint for deliberate Git-object
import. This ignored proposal and decoder spike are never private runtime imports.
C2 waits for accepted C1 Editor/Host/capture ABI and Root's explicit handoff.
