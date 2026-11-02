# Building prefab intake · 28 October 2026

## Evidence and adoption

Source: Tinderbox `6693bfa3fea2edec77649d830de5ac68ba4c1a50`, principally `src/art/gross-housing.js`, `assets/art/gross-housing-v1/`, `art/source/gross-housing-v1/` and `docs/art/gross-housing-v1/`. Existing AFT structures: `781246a668c723d5a4c5463e70534cc04b6a5641`, `dist/tactics/editor-structure-presets.js` and the existing controller. All original imported bytes have SHA-256 inventories. No donor or worker checkout was edited.

Implemented in Nautilus: source-preserving library, native previews/cutaways, original plates, conservative physical lots, fixed assembly references in full maps, transactional placement, deterministic seeded lots, history/save/export preservation and explicit consumer capability checks. Game collision, house traversal, fire, large-distance render detail and consumer adoption remain deferred. Existing AFT stamping remains available with its original portable behavior.

## Whole assemblies versus tile room stamps

**Accuracy.** Gross compositions retain polygonal rooms, bays, native wall spans/cut ends, separate opening inserts and floors, source-specific plinths, roofs and exterior ornament. AFT stamps represent compact rectangular rooms plus objects. For the historical house collection, replacing assemblies with rectangular stamps would discard authored evidence and visual structure. Neither approach is a measured historical survey: the Gross artist records its interpretation of scale, rear elevations, colours and furniture. Original source plans are preserved for comparison.

**Efficiency.** Code inspection: AFT stamps reuse the existing instanced environment path and need no extra prefab renderer or catalogue texture load. Gross houses contain more meshes and material changes. Nautilus lazily loads six shared textures, batches native triangles by material and floor/visibility group, creates one shared template per used design, and clones transforms/visibility for copies. Batching retains vertex transforms, native face materials, normals and physical UVs. Tests measure an object-submission reduction of at least fourfold for each source house while preserving triangle counts and bounds; that count is not a frame-time benchmark. House-only previews avoid duplicating the editor's character/biome/machinery atlases. Thirty-two instances remain an explicit provisional authoring profile; a six-house scene does not prove acceptable performance at that maximum.

**Narrative.** Subjective visual judgment: preserve the full Gross architecture for Tinderbox's period neighbourhoods, where recognisable houses and interiors contribute directly to place and fire scenarios. AFT's simple shed, workshop and checkpoint remain preferable for inexpensive tactical utility rooms or a quick map draft. Original textures and metre scale keep Gross details consistent with the shared assets; no model is stretched to fit a tile allocation.

**Recommendation.** Use native whole-house references for this collection; retain AFT stamps as an explicitly separate lightweight profile. Implemented for visual authoring. A Tinderbox consumer must still implement gameplay collision, floors, apertures, stairs and fire deliberately. Do not infer integration from rendered appearance.

## Reserved lots versus implicit geometry conversion

**Accuracy.** Reserving all visible bounds plus explicit clearance protects porches, entrance stairs and overhangs that nominal building width/depth omit. It conservatively excludes some genuinely empty ground under roof projections. This is a placement bound, not the house's collision shape or proof that a character can enter it. Quarter-turn placement preserves native geometry and source coordinates.

**Efficiency.** Code inspection: integer lot checks use a reusable occupancy index within each generation pass and bounded catalogue/slot searches. Existing authored geometry is protected without repeatedly building a Three.js scene during headless generation. Collision compilation from native room polygons would add a separate cost and contract; it is not implemented in this intake.

**Narrative.** Regular spaced lots suit a first neighbourhood layout and make house placement readable. They do not yet express an irregular street network, terrain grading, period parcel regulations or carefully oriented entrances. Grassy lanes are reserved, not claimed to be generated streets.

**Recommendation.** Prefer explicit conservative lots for this first shared settlement-placement interface. Preserve native entries, room plans and floor elevations for a later street/frontage and gameplay adapter. The next useful evidence is a representative mixed district with connected entrances and measured camera-distance/frame-time behavior. This is a provisional recommendation for settlement authoring, not a recommendation to use bounding boxes as interior collision.

## Compatibility and checks

The optional `nautilus-building-prefabs-v1` map feature has a fixed catalogue/commit identity. Unknown revisions fail instead of redirecting saved houses. Unsupported game adapters fail before handoff. Legacy blocks reject unsupported building metadata, and capture/replacement refuses intersecting lots. Existing maps and AFT stamps retain their inherited formats.

Automated validation covers all thirteen native assemblies in all four rotations, their unscaled bounds and 29 levels; accepted and rejected edits/history; source catalogue rejection; obstacle/foliage/upper-floor clearance; legacy block loss prevention; seed repeatability, insufficient space and whole-layout undo; and consumer capability rejection. Artist source reviews and their original validation results are retained as source evidence, separately from Nautilus's own checks.

Nautilus browser review at 1280 × 720 displayed a native exterior, a furnished cutaway and the actual six-house candidate layout. Applying, undoing, redoing and saving retained all six building references. During repeated preview/reload review, the in-app browser stopped allocating WebGL contexts. A separate minimal page with no Three.js, models, textures or editor modules also failed to allocate a non-antialiased WebGL2 context. Final live map and narrow-viewport retesting therefore requires a recovered browser session. Resource disposal, a lightweight house preview and native geometry batching were tightened after that observation; their geometry/visibility and module checks pass, but their final GPU rendering is not yet claimed as reviewed. No FPS or phone-hardware performance result is claimed.
