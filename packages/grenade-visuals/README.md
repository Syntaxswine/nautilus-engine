# Native grenade visuals

Candidate optional entry: **`./grenades/three`**, implemented by [three.js](three.js). Root owns public export/distribution registration; this artist branch does not edit shared metadata. Follow the [builder guide](../../docs/reviews/grenade-presentation/provider.md) for both async constructors, source-only examples, resource URLs, coordinate/ownership contracts and acceptance checklist.

- `createGrenadeModel(options)`: prop only; no horse, projection or motion dependency is loaded.
- `createNativeGrenadePresentation(options)`: native painted horse and original throw choreography, driven by committed host presentation frames.
- `grenadeVisualResourceURLs()`, `GRENADE_VISUAL_RESOURCE_PATHS`, `GRENADE_PRESENTATION_MARKERS`: exact resources and measured markers.

No gameplay, inventory, AP, damage, clock, scheduler, sound or event authority is owned here. See [source.json](source.json) and the separate immutable source snapshot for generated-adapter provenance. Browser/player and installed-package acceptance follows the architect's fixed integration.
