# Real-post research prototype — superseded target

The user corrected the Fort Apache brief to the fictional enclosed frontier fort shown at [Paragon Scenics](https://www.paragon-scenics.com/FORT_APACHE.html). This branch preserves the earlier real-Arizona-post research and unfinished plain-data prototype. It is not the requested final fort, an editor-ready asset pack, or a completed measured reconstruction. No full building meshes or exports were made.

The generated material sheet is original, saved byte for byte, and may be reused in the corrected collection. Its built-in image-generation prompt is in `skin-prompts.json`.

## Sources actually inspected

- [NPS 1976 inventory](https://npgallery.nps.gov/GetAsset/b78609a1-b828-4f05-b228-5d4613db0739), 19 PDF pages. SHA-256 `3561b089c100443935e35d8c9548b938b96462197d9cacb7ed78e0e5abace7d0`.
- [NPS 2012 nomination](https://irma.nps.gov/DataStore/Reference/Profile/2307336), 82-page accessible PDF linked from the profile. SHA-256 `e475ca62cd7c5d9f3dd2a55e0ea4ae15bc4fadd87ca6cb83bfead35de65f7694`. Inspected building lists, architectural development, site sketch and barracks/stable photographs; local renders of pages 73–78 are retained.
- [NARA catalogue 205135122](https://catalog.archives.gov/id/205135122), donated plan scan accessed through its Commons/DPLA record. Page 1 was visually inspected: a bath block, 18 × 24 ft with a 12 ft ceiling. It is not a floor plan for the proposed three buildings.
- [NARA fort index](https://www.archives.gov/research/cartographic/fort-lists) and [Senate guide §3.11](https://www.archives.gov/legislative/guide/senate/chapter-03.html) are finding aids, not inspected construction sheets.
- [Fort Apache Heritage Foundation](https://www.fortapachearizona.org/about/) and [Navajo County Library museum photo collection](https://www.navajocountyhistory.org/albumlist/white-mountain-apache-life-and-culture/) supplied contextual captions.

The working reference cache is `artifacts/fort-apache-sources/` (ignored). Reference scans/photos are not distributed with the code or original material sheet. Archive notices remain with their sources; no blanket reuse license is claimed.

## Prototype boundaries

The data describes a barracks interpretation, named frame Quarters No. 6 and a four-bay stable study. Their dimensions, interiors and phase choices are explicitly labelled as adaptations. The native contract is preserved: metres, scale 1, 2 m walls, .16 m ordinary wall thickness, .12 m slabs and 2.12 m level datums. The roofs module is an unfinished bounded artist envelope prototype, not a general editor roof implementation. No appearance, manifold, export, navigation, collision or fire acceptance is asserted.

The completed Ellis/Boott/Quincy collection remains fixed at `8631b0cfc6005f3004956afa50ec0e46e5f69278`. The corrected fictional fort starts from that checkpoint on a separate branch.

Checkpoint verification: all three descriptive prototypes compile with finite roof heights; the two new geometry modules pass syntax checks. Repository gates passed: check, 213 tests, 32 upstream tests and build. These checks preserve the earlier completed collection; they do not establish finished art acceptance for this prototype.
