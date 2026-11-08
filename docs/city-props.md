# Bell & Alder, 1880s city prop kit

This set is styled for a North American city around 1885. The 28 placeable variants cover nine Eastlake furniture pieces, nine shop fixtures, and five kerosene light designs in lit and unlit versions.

## Map Workshop

Build with `npm run build`. Open **Asset library** in the built Map Workshop, choose **1880s City**, and select a piece. **Use this asset** arms the ordinary object tool. Click a supported tile to place it. Press **R** or use the scenery orientation control to make quarter turns. The same object tools handle inspection, erasing, and undo and redo.

- **Eastlake furniture** includes a side chair, armchair, rocker, settee, dining table, pedestal table, marble washstand with basin and pitcher, mirror dresser, and double bedstead.
- **Shop fixtures** include straight and right angle counters, a glazed display counter, empty and stocked shelf bays, an apothecary drawer wall, sloped bins, a draper’s bolt rack, and a counter with a balance scale. Join the shop bays on adjacent metre tiles.
- **Oil lighting** includes a lamp and pedestal, reflector sconce, hanging shop lamp, hand lantern, and exterior entry lantern. Turn the rear plates toward a wall. The pendant’s canopy is at the 2.12 m story ceiling. Select the lit or unlit asset when dressing a map.

Import [the Bell & Alder workshop map](../assets/city-props/workshop-sample.json) from Settings to explore a dry goods shop, apothecary, bedroom, and parlor. [The 3D prop gallery](../examples/city-props.html) shows each model and has individual downloads. The lit gallery lamps use local preview lights. The workshop stores a lit or unlit model ID with an emissive flame on lit fixtures. A consumer can use the provided flame anchor for its own light or fuel system.

## Reuse

`packages/city-props/index.js` in the checkout and built Workshop exports the version 1 catalogue, metre grid reservations, and `cityPropURLs(id)`. Keep the `models/` directory beside the shared atlas when copying glTF assets. Each glTF has a same-name mesh buffer. The [model catalogue](../assets/city-props/catalogue.json) has exact bounds, material provenance, and file hashes.

`packages/city-props/three.js` exposes `createCityPropLibrary(THREE, atlas)`. Load the atlas from `CITY_PAINT_URL` as sRGB, then pass the renderer’s own Three namespace and texture. Each placement borrows a cached mesh and shared materials. Dispose its instance when removing it, then dispose the library and caller-owned texture when closing the scene.

The model pivot is the floor at the centre of the reserved cells, with local +Z facing the customer or viewer. Mounted lights retain their offset from that pivot. Furniture and shop pieces use conservative solid tile reservations in Workshop maps. The sconce, pendant, lantern, and exterior bracket reserve a placement tile while leaving it passable. Surface mounts are authored by alignment to the nearest wall or ceiling. The stock editor’s object records keep `kind`, coordinates, and quarter turn. Workshop maps with these IDs require the city scenery binding. The editor reports an unsupported binding at game handoff.

## References and art decisions

Angular silhouettes, incised fan marks, turned details, ebonized cherry, and upholstered backs reference American Eastlake furniture. The room pieces are original interpretations sized for editing on metre cells. [Smithsonian side chair, ca. 1885](https://www.si.edu/object/chair-side%3Aahhpcc_SI.1988.040) · [Illinois State Museum table, ca. 1880](https://www.museum.state.il.us/muslink/art/htmls/ms_eastlake_lg.html)

Counters, shelving, labeled drawers, and display glass reference period retail fittings. The assembled bays are designed to repeat across small city shops and to keep the customer aisle clear. [National Park Service dry goods store](https://www.nps.gov/places/000/dry-goods-store.htm) · [Aberdeen Archives, Gallery & Museums chemist shop cabinet](https://emuseum.aberdeencity.gov.uk/objects/145404/victorian-chemist-shop-glass-display-cabinet)

The lamp designs use a visible fuel reservoir, wick, burner, chimney or protective glazing, and a mounting bracket as appropriate. Kerosene is the chosen fuel for this pack. [Museum of Fine Arts Houston kerosene lamp, 1860–1880](https://emuseum.mfah.org/objects/156023/visit) · [Smithsonian hanging oil lamp patent model](https://americanhistory.si.edu/collections/object/nmah_305122)

For the city workshop, the higher density sculpt recipes retain bevels and radial profiles. The reduced meshes sample those profiles at game scale, while a shared atlas supplies grain, fabric, patina, and paper. Triangle counts in the catalogue are measured from those outputs. The warmer parlor cloth and the contrasting shop oak and green are art choices for reading the room’s use at an isometric distance. The gallery displays the rendered art; collision remains the Workshop’s tile model.

Regenerate with `node tools/export-city-props.mjs` and `node tools/city-props-sample.mjs`. The [art record](../assets/city-props/NOTICE.md) identifies the atlas and original prompt.

[Rendered shop and parlor](reviews/city-props/bell-and-alder.png) · [Furniture](reviews/city-props/eastlake.png) · [Shop fixtures](reviews/city-props/shop-fixtures.png) · [Oil lighting](reviews/city-props/oil-lighting.png) · [Browser review](reviews/city-props/browser.json)
