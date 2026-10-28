# Nautilus art workflow

The artist owns visual asset design, sculpts, skins, painterly textures and their integration into Nautilus. Work happens on `codex/nautilus-art`; the architect coordinates shared interfaces and integration into the main line. Animal Factory Tactics 3D, Farmyard Commando and Tinderbox share a metre scale and can reuse suitable assets through explicit consumer adapters.

## Sculpt first, then simplify

1. Establish the reference, silhouette, proportions, physical dimensions, ground contact and useful attachment points. Inspect a plain grey model from front, side, rear and three-quarter views before surface detail distracts from the form.
2. Develop the higher-detail sculpt until its anatomy, garment construction, folds and material transitions are convincing. Preserve that source and its authoring recipe. Choose topology density for the sculpt's needs.
3. Derive the game mesh from the settled sculpt. Simplify or retopologize while protecting silhouette, facial landmarks, garment borders, hands, feet and deformation areas. Preserve scale and attachment points; compare both meshes at the same camera and pose.
4. Paint against the actual mesh. Use registered model views or authored UVs, checking fronts, backs, seams, undersides and occluded areas. Preserve markings on the correct anatomical side. A concept turnaround is a modeling reference, not a registered skin.
5. Validate the finished skin on the reduced mesh in representative poses. Check that paint stays attached during movement, that joints deform cleanly and that filled or unseen surfaces are identified honestly.
6. Integrate the asset into a representative Nautilus scene and verify its consumer contract. Keep the source sculpt, game mesh, texture sources and runtime output distinguishable and reproducible.

AFT's horse is a useful precedent: an 856,076-triangle grey study, a 28,886-triangle painted mesh and a 10,300-triangle comparison. These are historical examples, not universal budgets. Start around 10,000 triangles for a comparable character when appropriate, then justify the final budget through silhouette, deformation and representative scene measurements. Authoring can require substantially more geometry.

## Painterly finish

Match the reviewed AFT horse skin and painted environment study. Use clear, broad color and value groups, with brushwork following the underlying form. Preserve enough close detail to make faces, fabric construction and worn materials feel authored while keeping them legible at gameplay size.

- Characters: deliberate eyes, muzzle and cheek planes; directional fur or mane masses; seams, straps, fasteners and selective compression folds. Keep species, costume and individual markings consistent across views.
- Cloth: readable folds and edge wear, with restrained small texture. Let the sculpt and painting describe the same construction.
- Wood: board-aligned grain, selective knots and rubbed edges. Avoid a strong repeated grain pattern across every surface.
- Masonry and stone: warm, quiet midtones, recessed joints, softened or chipped edges and localized dirt or runoff. Vary paint strength; reserve conspicuous marks for a minority of units.
- Metal: readable formed edges, rolled rims and material-specific paint loss, rust or scuffs. Place wear where construction and use explain it.
- Environment: keep floors and large background areas quieter than characters. Inspect repeated materials at their intended world-space density and in a tiled comparison.

Generic procedural noise does not replace painted material decisions. Check the render's lighting contract: AFT's projected horse skin already contains illustrated form values and uses an unlit material. Reusing that treatment under dynamic lighting needs a deliberate adaptation and visual comparison to avoid double shading.

## Review and runtime contract

Judge close views and native gameplay views together. AFT's reference camera is 45-degree azimuth, 30-degree elevation and 58 CSS pixels per world unit; its close environment comparison uses 110 pixels per unit. Those are reference conditions, not a forced camera for every consumer. Use each game's actual camera for its final review.

Record dimensions, axis convention, origin, ground contact, sockets, material behavior and collision expectations. Nautilus map coordinates use ground `(x,y)` with layer `z`; the inherited Three.js renderer uses `(x,height,y)`. Preserve the pinned layer-height conversion. Decorative detail must not silently alter collision, traversability, weapon endpoints or gameplay reach.

Review grey form, silhouette, wireframe, painted material and coverage as useful. Compare reduction and material changes at matched scale, heading, pose and lighting. Check animation and actual multi-object cost before calling an asset production ready. Triangle counts, a static pose or a comparison viewer alone do not establish performance or animation readiness.

When choosing between asset or rendering designs, apply [accuracy, efficiency and narrative](design-evaluation.md): explain material/anatomical plausibility, distinguish measured costs from estimates, and state which appearance serves the named game best. Recommend a preferred option and identify any game-specific exception.

## Sources and delivery

Follow [the architecture](architecture.md) and [upstream intake](upstream-updates.md). Donor repositories stay read-only. Any future import needs a deliberate reviewed full commit, source hashes, notices and dependency closure; keep original bytes in `vendor/` and Nautilus adaptations separate. No donor pin or asset is changed by this workflow document.

For each asset delivery, preserve its nonsecret authoring sources or generator, source references and prompts, selected texture outputs, runtime files and review evidence. Identify remaining coverage, lighting, deformation or performance limits. Run the repository's required checks; review browser and game behavior where affected. Integrating an asset into Nautilus does not automatically migrate any consuming game.

The workflow and visual baseline were checked against these AFT documents at commit `b23334cb77f82e2373b9552b0d8752271a18326e`. This is a reference observation, not a new Nautilus donor pin:

- [Grey form study](https://github.com/Syntaxswine/animal-factory-tactics-3d/blob/b23334cb77f82e2373b9552b0d8752271a18326e/docs/tactics/HYBRID-GREY-FORM-STUDY.md)
- [Painting on the model](https://github.com/Syntaxswine/animal-factory-tactics-3d/blob/b23334cb77f82e2373b9552b0d8752271a18326e/docs/tactics/HYBRID-MODEL-PAINT.md)
- [10,300-triangle horse comparison](https://github.com/Syntaxswine/animal-factory-tactics-3d/blob/b23334cb77f82e2373b9552b0d8752271a18326e/docs/tactics/HYBRID-HORSE-10K.md)
- [Painted environment study](https://github.com/Syntaxswine/animal-factory-tactics-3d/blob/b23334cb77f82e2373b9552b0d8752271a18326e/docs/tactics/PAINTED-ENVIRONMENT-STUDY.md)
