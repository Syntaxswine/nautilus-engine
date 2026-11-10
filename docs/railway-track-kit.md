# Raised railway track kit

Find **Railway** in Map Workshop’s Build tools or select either track piece in **Asset library → Railway**. The straight and quarter-curve previews use the same original profiles and materials that a game loads from `@nautilus-engine/renderer/assets/three`. Look up the version-1 asset cards through `listSharedAssets({category: 'Railway'})`.

| Piece | Native footprint | Start to end on the ground plane |
| --- | --- | --- |
| `railway:track-straight` | 2 × 2 m | 0, 0 to 0, 2 |
| `railway:track-quarter-curve` | 5 × 5 m | 0, 0 to 4, 4 |

The compact branch-line profile has 0.90 m between rail centres. Its gravel crown rises 0.265 m, one eighth of a 2.12 m story, before rolling down to the surrounding ground. Timber ties and steel rails sit on that crown, with the rail head at 0.43 m. The curve has a 4 m centreline radius. Both ends use the same cross-section, rail spacing, normals and repeating gravel phase. Tie spacing is 0.50 m on the straight and is distributed evenly along the curve.

The pivot is the centre of the start connector at ground height. Asset cards give port positions in engine coordinates `[x, y, height]` and outward headings in `[x, y]`. The mesh uses Three coordinates `[x, height, z]`, with the start running toward +Z. Align port positions, face their outward headings opposite one another, and keep both at the same elevation. Use a yaw rotation to orient the piece at either end.

## Lay a route in Map Workshop

1. Open a full map on ground level 1 and select **Railway**.
2. Click or tap the first waypoint, then add points along the route. Hover to preview the next fit. Waypoints snap to the metre grid and eight compass headings. The tangent points of the bends can fall between grid lines.
3. Select **Place route**, or press Enter with the map canvas focused. **Undo point** backs up one waypoint. **Cancel route** or Escape on the canvas clears the draft. Workshop Undo and Redo act on the whole placed route. To remove an existing route, select it with **Select** and use **Delete selected**.
4. Save in the Design panel or export ordinary map JSON. Reopening rebuilds the same rail, ballast and sleeper geometry from the waypoints.

A 45° turn uses about 1.66 m of each approach and a 90° turn uses 4 m. An approach shared by two turns needs room for both. The tool keeps the 4 m radius and identifies the approach to lengthen if it cannot fit. The clearance check reserves the 2 m ballast and a conservative margin around its ends. Keep it on clear, flat ground away from objects, walls, wet ground and land relief.

To make a diamond crossing, use **Lay route** and put waypoints on opposite sides of the existing track. The crossing snaps to the fitted centreline intersection at 45° or 90°, including half-metre intersections between diagonal tracks. Both routes continue independently through the diamond. Each through track needs 2 m of straight approach on both sides for a right-angle crossing and about 2.83 m for a 45° crossing. Leave space between diamonds and keep them off curves and turnout branches. Removing either route removes the crossing and restores the other route’s regular rails.

To branch off a placed route, choose **Railway action → Add split**. Click a straight section and then a branch endpoint 45° from the main line. **Place split** keeps the through track and adds a branch with longer switch ties and a rail gap where the inside branch rail meets the through rail. The split needs 2.16 m of straight track behind the chosen point, 4 m ahead and a branch endpoint at least 4 m away. Use Undo or select the route in **Add split** and choose **Remove split**.

Each route saves an ID and its ordered waypoint pairs in the optional `railwayRoutes` map extension. Plain routes use version 1. A map with a split uses version 2 and adds `turnout: {at, end}` to the parent route. A map with a crossing uses version 3 and derives each diamond from the same route records. A full map can hold up to 64 routes with up to 48 waypoints and 480 m per route including its branch, and up to 1,200 m of fitted track in total. A consumer advertises `nautilus-railway-routes-v1` for routes, `nautilus-railway-turnouts-v1` for splits and `nautilus-railway-crossings-v1` for crossings. Block capture, connected generation, and sector publishing require their own railway support. The portable map and named Design save preserve the full track.

## Run a train in Map Workshop

Choose **Railway → Train** and pick the steam or electric set. Click the track near the end you want to depart from. Choose **Main line** or **Branch** at a facing turnout, then select **Run train**. The locomotive commits to the turnout setting as it reaches the split. Every car follows it. The train carries straight on along its own track through a diamond and stops at its destination end. A train departing from the branch merges onto the main line.

**Reset** returns the train to its departure end. A design holds one train. Choosing another type and clicking the track replaces that train. Keep at least 11.2 m of track for the steam set and 9.6 m for the electric set, with room along the selected itinerary. The version 4 railway record saves the stock, route, departure end and switch setting. Reopening starts the train at its departure end. Consumers handling that placement advertise `nautilus-railway-trains-v1` alongside the capabilities required by the track.

## Use in a game

```js
import {createRailwayKit} from '@nautilus-engine/renderer/assets/three';

// THREE and scene come from the game's existing renderer.
const track = createRailwayKit(THREE);
const incoming = track.create('railway:track-straight');
const curve = track.create('railway:track-quarter-curve');
const outgoing = track.create('railway:track-straight');
curve.root.position.set(0, 0, 2);
outgoing.root.position.set(4, 0, 6);
outgoing.root.rotation.y = Math.PI / 2;
scene.add(incoming.root, curve.root, outgoing.root);

// A single segment can retire without releasing shared materials.
// incoming.dispose();
// Retire the kit when leaving the level.
// track.dispose();
```

For a saved route, call `track.createRoute(route.waypoints, route.turnout)` and add its root to the scene. Route roots use the authored map coordinates directly, with ground at Three Y = 0. Use `planRailwayRoute(waypoints)` and, for a split, `planRailwayTurnout(mainPlan, turnout)` from map-core for the fitted geometry. Each route uses continuous sweeps, so the rails, gravel texture and tie spacing follow the tangent joins.

For a map with crossings, get the render inputs from map-core with `const byRoute = railwayCrossingsByRoute(railwayCrossingsOf(map))`. Pass `byRoute.get(route.id)` as the third argument to `track.createRoute` for each route. Both rails receive relief gaps at the four shared fittings while the planner keeps the two through paths independent.

For an authored train, get the placement with `railwayTrainOf(map)` and find its route by `placement.routeId` in `railwayRoutesOf(map)`. Call `createRailwayTrain(route, placement)` from map-core. Use `train.read()` for the current car poses and `train.advance(distanceM, switchPosition)` to advance using the host clock. In Three, create the model with `createRailwayTrainView(THREE, train.read())` from the renderer asset entry, then pass each new pose to `view.update(state)`. Call `view.dispose()` when unloading the train. `createRollingStockKit(THREE)` exposes the individual cars for hosts that already render trains.

The kit creates two procedural texture maps and shares geometries and materials across segment instances. Ties and tie plates are instanced. The kit owns those resources and removes its live roots on disposal. The host owns its renderer, scene, transforms and serialized placements. An unknown asset ID throws before a segment is created.

## Builder checklist

- Pin the installed renderer and catalogue. Choose an exact asset ID and preserve it with the host’s transform.
- Match the two metre bed and its ground datum to the host’s tiles. Verify both rails, the bed and tie spacing across a straight-to-curve seam at the intended camera scale.
- Supply any train routing, collision, support and navigation through the game. Advertise the route capability only when the receiving game can preserve the route.
- Reopen the host’s placement data and check the same joins. Dispose individual segments or the full kit when unloading and keep the host renderer alive.

Original procedural geometry and gravel, wood and steel finishes are authored in `packages/railway-visuals/`. The focused test checks both joins, the shared resource lifetime and the editor discovery entries.
