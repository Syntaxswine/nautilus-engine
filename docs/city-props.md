# Bell & Alder, 1880s city prop kit

This set is styled for a North American city around 1885. The 36 placeable variants cover nine Eastlake furniture pieces, nine shop fixtures, eight storefront and trim pieces, and five kerosene light designs in lit and unlit versions.

## Map Workshop

Build with `npm run build`. Open **Asset library** in the built Map Workshop, choose **1880s City**, and select a piece. **Use this asset** arms the ordinary object tool. Click a supported tile to place it. Press **R** or use the scenery orientation control to make quarter turns. The same object tools handle inspection, erasing, and undo and redo.

- **Eastlake furniture** includes a side chair, armchair, rocker, settee, dining table, pedestal table, marble washstand with basin and pitcher, mirror dresser, and double bedstead.
- **Shop fixtures** include straight and right angle counters, a glazed display counter, empty and stocked shelf bays, an apothecary drawer wall, sloped bins, a draper’s bolt rack, and a counter with a balance scale. Join the shop bays on adjacent metre tiles.
- **Storefront and trim** includes a display bay, a recessed entrance, an outside return, and straight and inside-corner room cornices, and three perpendicular hanging signs. The storefront uses tall glass, transoms, painted bulkheads, and a continuous header. The room cornice sits at the 2.12 m story ceiling. Each sign uses the same bracket and pivot. The two faces show a cloth spool, a mortar and pestle, or a blank panel for custom paint.
- **Oil lighting** includes a lamp and pedestal, reflector sconce, hanging shop lamp, hand lantern, and exterior entry lantern. Turn the rear plates toward a wall. The pendant’s canopy is at the 2.12 m story ceiling. Select the lit or unlit asset when dressing a map.

Import [the Bell & Alder workshop map](../assets/city-props/workshop-sample.json) from Settings to explore the glazed dry goods frontage, a second shop with a mitered room cornice, a bedroom, and a parlor. [The 3D prop gallery](../examples/city-props.html) shows each model and has individual downloads. The lit gallery lamps use local preview lights. The workshop stores a lit or unlit model ID with an emissive flame on lit fixtures. A consumer can use the provided flame anchor for its own light or fuel system.

## Reuse

`packages/city-props/index.js` in the checkout and built Workshop exports the version 1 catalogue, metre grid reservations, and `cityPropURLs(id)`. Keep the `models/` directory beside both paint atlases when copying glTF assets. Each glTF has a same-name mesh buffer. The [model catalogue](../assets/city-props/catalogue.json) has exact bounds, material provenance, and file hashes.

`packages/city-props/three.js` exposes `createCityPropLibrary(THREE, atlas)`. Load the atlas from `CITY_PAINT_URL` as sRGB, then pass the renderer’s own Three namespace and texture. Each placement borrows a cached mesh and shared materials. The library creates and owns the trim texture on first use, from the same paint recipe as the exported PNG. Dispose its instance when removing it, then dispose the library and caller-owned texture when closing the scene.

The dry goods, apothecary, and blank signs use the first three 192 × 192 swatches in the bottom row of the trim atlas. Paint the corresponding swatch for a custom glTF sign, keeping the sheet dimensions and swatch position. For a Workshop skin, the same artwork lives in the trim paint recipe.

The model pivot is the floor at the centre of the reserved cells, with local +Z facing the customer or viewer. Mounted lights retain their offset from that pivot. Furniture and shop pieces use conservative solid tile reservations in Workshop maps. The recessed shop entrance, room cornices, hanging signs, sconce, pendant, lantern, and exterior bracket reserve a placement tile while leaving it passable. Surface mounts are authored by alignment to the nearest wall or ceiling. The Workshop import map selects its own scenery catalogue and renderer binding. Standalone tile previews load the pinned scenery inputs. The stock editor’s object records keep `kind`, coordinates, and quarter turn. Workshop maps with these IDs require the city scenery binding. The editor reports an unsupported binding at game handoff.

## References and art decisions

Angular silhouettes, incised fan marks, turned details, ebonized cherry, and upholstered backs reference American Eastlake furniture. The room pieces are original interpretations sized for editing on metre cells. [Smithsonian side chair, ca. 1885](https://www.si.edu/object/chair-side%3Aahhpcc_SI.1988.040) · [Illinois State Museum table, ca. 1880](https://www.museum.state.il.us/muslink/art/htmls/ms_eastlake_lg.html)

Counters, shelving, labeled drawers, and display glass reference period retail fittings. The assembled bays are designed to repeat across small city shops and to keep the customer aisle clear. [National Park Service dry goods store](https://www.nps.gov/places/000/dry-goods-store.htm) · [Aberdeen Archives, Gallery & Museums chemist shop cabinet](https://emuseum.aberdeencity.gov.uk/objects/145404/victorian-chemist-shop-glass-display-cabinet)

The lamp designs use a visible fuel reservoir, wick, burner, chimney or protective glazing, and a mounting bracket as appropriate. Kerosene is the chosen fuel for this pack. [Museum of Fine Arts Houston kerosene lamp, 1860–1880](https://emuseum.mfah.org/objects/156023/visit) · [Smithsonian hanging oil lamp patent model](https://americanhistory.si.edu/collections/object/nmah_305122)

The frontage uses large display panes, smaller transom lights, a low bulkhead and a recessed opening within the 2.12 m model bay. Dark paint and rubbed trim give the shop a different silhouette and palette from its earlier oak fittings. [National Park Service, Rehabilitating Historic Storefronts](https://www.nps.gov/orgs/1739/upload/preservation-brief-11-storefronts.pdf)

The panel relief, drawer labels, dentils, and trade emblems are painted on the surface. The cornice has a triangular section. Its miter carries the same cross section through an inside room corner and an outside storefront return. Pictorial faces are inspired by period trade signs. [Smithsonian apothecary trade sign, ca. 1880](https://americanart.si.edu/artwork/apothecary-shop-trade-sign-24440)

The nine revised shop fixtures total 7,244 mesh triangles, down from 9,698 in the previous version. These are mesh counts. The second paint texture also adds a material group on props that use it.

For the city workshop, the higher density sculpt recipes retain bevels and radial profiles. The reduced meshes sample those profiles at game scale, while a shared atlas supplies grain, fabric, patina, and paper. Triangle counts in the catalogue are measured from those outputs. The warmer parlor cloth and the darker shop wood and green are art choices for reading the room’s use at an isometric distance. The gallery displays the rendered art; collision remains the Workshop’s tile model.

Regenerate with `node tools/export-city-props.mjs` and `node tools/city-props-sample.mjs`. The [art record](../assets/city-props/NOTICE.md) identifies the atlas and original prompt.

[Storefront](reviews/city-props/storefront.png) · [Hanging sign detail](reviews/city-props/hanging-sign.png) · [Dentil corner detail](reviews/city-props/dentil-corner.png) · [Rendered shop and parlor](reviews/city-props/bell-and-alder.png) · [Furniture](reviews/city-props/eastlake.png) · [Shop fixtures](reviews/city-props/shop-fixtures.png) · [Oil lighting](reviews/city-props/oil-lighting.png) · [Browser review](reviews/city-props/browser.json)
