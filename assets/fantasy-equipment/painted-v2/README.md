# Painted skin source index

These are original bitmap skins made with **built-in imagegen** against the artist's registered UV shapes. The runtime uses18 dedicated512-square pages, one per canonical model/finish, with one owned texture per instance. All small surface detail is painted. Retained source sheets are deliberately laid-out diffuse artwork, not interchangeable material swatches.

| Source | Original master | Exact prompt | UV registration |
| --- | --- | --- | --- |
| Blade and tool faces | [heads](source/heads-master.png) | [prompt](source/heads-prompt.json) | [SVG](source/heads-uv.svg) / [PNG](source/heads-uv.png) |
| Grips, hafts, limbs, fittings | [supports](source/supports-master.png) | [prompt](source/supports-prompt.json) | [SVG](source/supports-uv.svg) / [PNG](source/supports-uv.png) |
| Shield faces and backs | [shields](source/shields-master.png) | [prompt](source/shields-prompt.json) | [SVG](source/shields-uv.svg) / [PNG](source/shields-uv.png) |
| Clear riot alpha/fasteners | [clear panel](source/riot-clear-master.png) | [prompt](source/riot-clear-prompt.json) | [SVG](source/riot-clear-uv.svg) / [PNG](source/riot-clear-uv.png) |
| Round-back correction | [corrected master](source/shields-back-master.png) | [edit prompt](source/shields-back-prompt.json) | Only cell1 selected; removes a painted duplicate of the retained physical handle |

[UV legend](source/uv-legend.json) names each source cell. [UV layout](uv-layout.json) records the selected crops, dedicated islands, used regions and per-model packing. [Provenance](provenance.json) hashes source, current runtime closure and final PNG pages. [Fixed baseline reference](baseline-reference.json) supplies independently reproducible socket/grip comparisons from reviewed commit 5d19e619. [Notice](NOTICE.md) records original authorship and the build boundary.

Rebuild guides with `node tools/fantasy-equipment-art/painted-v2/guides.mjs`; rebuild all 18 pages and the embedded palette/LZ module with `node tools/fantasy-equipment-art/painted-v2/bake.mjs`. It crops the retained original paintings, resizes with Sharp, fills 4-pixel gutters, quantizes to 256 RGBA colours per page and losslessly encodes those palette pixels. Transparent painted glass is composited over a restrained 12% tint; opaque hardware/skin alpha is preserved. No shader or pooling layer is introduced.

The renderer and images are reviewed in [the art report](../../../docs/reviews/fantasy-equipment/art/painted-v2/README.md). Source PNGs/pages are authoring/review resources; runtime pixels are embedded in `paint-data.js` and never fetched from this directory.
