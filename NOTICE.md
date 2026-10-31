# Sources and notices

Nautilus Engine includes selected, unchanged source and assets from the user's Animal Factory Tactics 3D and Farmyard Commando projects. `upstream.json` records exact commits; each `vendor/<donor>/<commit>/provenance.json` records original paths, SHA-256 values and byte counts. Original notices, including Three.js's embedded MIT notice, remain with their files.

The imported projects contain artwork and code with differing or unspecified per-file licensing. This record preserves provenance; it does not assert a new blanket license or grant redistribution rights. No new blanket license is applied to imported material. The source repository is public at the user's request; the review deployment uses owner sign-in.

The golden contour contribution additionally preserves the reviewed Farmyard renderer, tests and porting guide under its own `upstream.json` pin. These files are reference evidence; the separately maintained `packages/render-effects` extraction reuses the existing AFT-pinned Three.js instance and MIT notice. Source and dependency hashes, including comparison-only CRLF/LF evidence, are recorded in its provenance manifest.

Nautilus-authored files, original upstream files and generated deployment adaptations have separate paths or recorded build hashes. The donor games, their saves and their deployment/account settings are not imported as Nautilus defaults.

The `aft-assets` snapshot supplements the existing reviewed AFT commit with its original lathe v1, mill v1 and press v2 paint atlases. Its separate provenance manifest records all three source paths, byte counts and SHA-256 hashes; the original AFT snapshot is unchanged.

# Gross catalogue building collection

The separate `vendor/tinderbox-prefabs/6693bfa3fea2edec77649d830de5ac68ba4c1a50/` snapshot preserves selected original Tinderbox house assemblies, plans, painted materials, source plates and artist evidence. `upstream.json` identifies the repository and reviewed commit; its `provenance.json` records every original file hash. Embedded source notices and attribution remain unchanged, including the nested Farmyard native geometry dependency. The artist's source records identify the S. E. Gross catalogue plates and their public-domain source status. That historical source status does not itself license all newly authored code or paintings. This provenance notice adds no license grant.

Nautilus's building registry, source-aware editor library, placement contract and seeded lot generator are separate adapters; they do not modify the imported bytes or incorporate a Tinderbox game runtime.

## Tinderbox consumer conformance evidence

The test-only tests/fixtures/consumers/tinderbox/8a8405681614662a92f9b98fb9b9600bd06d3ad1 snapshot preserves the original compiler/simulation dependency closure and contract evidence from the user's Tinderbox project. Its provenance.json records exact Git blobs, byte counts and SHA-256 hashes. Embedded source notices remain unchanged; no new license grant is asserted. These source fixtures are excluded from distributable packages and are never a game runtime dependency. The engine-owned bounded adapter is separate from this evidence.

## Farmyard stat-v2 conformance evidence

The test-only Farmyard rules fixtures at commit `279d2d34786b3e6e5c5baeeac6898e60030afdbe` retain three original module byte streams, including their original mixed line endings and comments. `upstream.json` and `docs/reviews/2026-10-29-farmyard-rules.sources.json` identify the full source commit, Git blobs, byte counts and hashes. The pinned root has no blanket license; this provenance adds no license grant. Fixtures are excluded from all distributions. The engine-owned pure calculation adapter uses only the existing public rules boundary, without a Farmyard runtime or production pin change.

## Farmyard grenade workproduct

The immutable `vendor/farmyard-grenades/251bf8094b5f9ebe44208443084c1a6d6658512a/` snapshot preserves original gameplay/control sources, original conformance tests and source/reference notices from Farmyard Commando. Its provenance and source review record exact Git blobs, byte counts, SHA-256 values, dependency roles and dynamic-resource limits. Original bytes and embedded notices remain unchanged; the source has no blanket license and this intake adds no license grant. The donor game/reference snapshot stays outside runtime distributions. The separately maintained engine-owned grenade and aim entries preserve the declared static planar profile, with explicit refusal of unsupported reactive or multilevel behavior. Native art/rig reuse keeps its existing source attribution and reviewed snapshot.

The separate `vendor/farmyard-grenade-visuals/251bf8094b5f9ebe44208443084c1a6d6658512a/` preserves the two original designer choreography/preparation inputs (626,567 bytes). The optional renderer adapts only the Three import and selects the unchanged horse balance data. It reuses the existing AFT grenade, horse, paints and Three/MIT closure; original bytes and notices remain distinct. Its source ledger records the exact transformations. The raw visual reference snapshot is excluded from distributions.

## Farmyard door interactions

The optional Farmyard door adapter reuses the same immutable `251bf8094b5f9ebe44208443084c1a6d6658512a` source snapshot recorded above. `docs/reviews/farmyard-doors.sources.json` identifies its 22 original test-only modules, exact Git blobs, byte counts and SHA-256 values. No second donor runtime or source license is introduced. The separate engine-owned adapter preserves the named endpoint/control/AP/visibility profile; native door/stair policies remain distinct.

The separate `vendor/farmyard-door-visuals/251bf8094b5f9ebe44208443084c1a6d6658512a/` preserves the original mixed interaction view and wood paint (2,762,865 bytes). Its manifest inventories the 17-module static reference closure, two deferred chest paintings and shared Three/MIT resolutions without importing their game runtime. The optional leaf provider preserves original dimensions, material, visibility and endpoint policy using the existing shared Three; only the original wood PNG is a runtime resource. Original bytes/notices and Nautilus adapters remain separate; this adds no licence grant.

## White House original asset collection

The White House landmark, compact plans and furniture are original Nautilus work informed by the archived public White House tours listed in `art/white-house/references.json`. Research images, historical text and museum art are not runtime textures. The new painterly atlas was generated with the built-in image-generation tool; its exact prompt is preserved in `art/white-house/generation.json`. The landscape tile is original generated art. Adapted dimensions, mixed reference periods and representative family/service layouts are explicit; no surveyed/current-condition reconstruction or gameplay adoption is claimed. The provider borrows the existing shared Three/MIT dependency without a duplicate engine or a new donor import.
