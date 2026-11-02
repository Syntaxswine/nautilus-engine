# Architecture reference and paint notebook

This is the authoring record for the original Nautilus building collection. The runtime assets are in `assets/buildings`; the editable architectural recipes are in `packages/building-catalog`.

- `reference-seeds.json` lists the public starting points.
- `reference-register.json` records actual access, media roles, hashes and failures. Public viewing does not imply an unrestricted license to redistribute source imagery.
- `material-atlas-prompt.txt` and `material-atlas-refinement-prompt.txt` preserve the two ImageGen instructions.
- `generation.json` identifies the generated outputs, selected atlas, hashes and workflow.

The local collection holds 159 successfully downloaded reference media files across 22 opened sources, including title pages, plans, sections, elevations and photos. Twenty source contact cards were reviewed. Eleven records have explicit plan/exterior pairs. Gamble House and the Bicknell book could not be opened by the collector; no building depends on them. The source collector reports access failures without bypassing access controls. It can be rerun deliberately with `node tools/collect-building-references.mjs`; remote content may change and this rewrites the observation register.

The original models use newly authored dimensions, combinations, roof forms and room grids. Source relationships record architectural influence, not a claim that our plan matches a developer's product. Examples: Dover informs the ranch/shared-living vocabulary, Liberty informs a separate-suite mass, historic dogtrots inform the open breezeway, and measured barn/depot/shop drawings inform their respective building types. Exact room placement and facade construction belong to the Nautilus recipes.

Reference imagery and rendered source cards stay under ignored `artifacts/building-catalog`. They are not runtime textures, not part of the Git delivery, and not in the downloadable model pack. Every model points to at least one successfully opened source record. The selected atlas is generated original paint; version one is preserved as revision history and version two is the runtime material.

This is a bounded first collection, not an exhaustive index of the web's free plans. New intake should add a source record, inspect the plan and exterior/elevation, author a distinct building, preserve its detailed recipe, derive the game mesh, and repeat the geometry/UV/cutaway review at the recorded scale.
