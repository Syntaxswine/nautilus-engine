# Raised railway track kit

Find **Railway** in Map Workshop’s Build tools or select either track piece in **Asset library → Railway**. The straight and quarter-curve previews use the same original profiles and materials that a game loads from `@nautilus-engine/renderer/assets/three`. Look up the version-1 asset cards through `listSharedAssets({category: 'Railway'})`.

| Piece | Native footprint | Start to end on the ground plane |
| --- | --- | --- |
| `railway:track-straight` | 2 × 2 m | 0, 0 to 0, 2 |
| `railway:track-quarter-curve` | 5 × 5 m | 0, 0 to 4, 4 |

The compact branch-line profile has 0.90 m between rail centres. Its gravel crown rises 0.265 m, one eighth of a 2.12 m story, before rolling down to the surrounding ground. Timber ties and steel rails sit on that crown, with the rail head at 0.43 m. The curve has a 4 m centreline radius. Both ends use the same cross-section, rail spacing, normals and repeating gravel phase. Tie spacing is 0.50 m on the straight and is distributed evenly along the curve.

The pivot is the centre of the start connector at ground height. Asset cards give port positions in engine coordinates `[x, y, height]` and outward headings in `[x, y]`. The mesh uses Three coordinates `[x, height, z]`, with the start running toward +Z. Align port positions, face their outward headings opposite one another, and keep both at the same elevation. Use a yaw rotation to orient the piece at either end.

## Lay a route in Map Workshop

1. Open a full map on ground level 1 and select **Railway**. New routes default to **World size**, with 16 m bends and a 4 m reserved corridor for larger train bodies. **Miniature** retains the original 4 m bends and 2 m corridor. Both use the existing narrow-gauge rails and bed.
2. Click or tap the first waypoint, then add points along the route. Hover to preview the next fit. Waypoints snap to the metre grid and eight compass headings. The tangent points of the bends can fall between grid lines.
3. Select **Place route**, or press Enter with the map canvas focused. **Undo point** backs up one waypoint. **Cancel route** or Escape on the canvas clears the draft. Workshop Undo and Redo act on the whole placed route. To remove an existing route, select it with **Select** and use **Delete selected**.
4. Save in the Design panel or export ordinary map JSON. Reopening rebuilds the same rail, ballast and sleeper geometry from the waypoints.

A World size 45° turn uses about 6.63 m of each approach and a 90° turn uses 16 m. Miniature uses 1.66 m and 4 m respectively. An approach shared by two turns needs room for both. The tool keeps the chosen radius and identifies the approach to lengthen if it cannot fit. Clearance reserves the train corridor and a conservative margin around its ends. Keep it on clear, flat ground away from objects, walls, wet ground and land relief.

To make a diamond crossing, use **Lay route** and put waypoints on opposite sides of the existing track. The crossing snaps to the fitted centreline intersection at 45° or 90°, including half-metre intersections between diagonal tracks. Both routes continue independently through the diamond. World size reserves 4 m of straight approach on both sides at 90°, or about 5.66 m at 45°. Miniature tracks need 2 m of straight approach on both sides for a right-angle crossing and about 2.83 m for a 45° crossing. Leave space between diamonds and keep them off curves and turnout branches. Removing either route removes the crossing and restores the other route’s regular rails.

To branch off a placed route, choose **Railway action → Add split**. Click a straight section and then a branch endpoint 45° from the main line. **Place split** keeps the through track and adds a branch with longer switch ties and a rail gap where the inside branch rail meets the through rail. A miniature split needs 2.16 m of straight track behind the chosen point, 4 m ahead and a branch endpoint at least 4 m away. A World size split inherits the 16 m bend, needs 7.13 m behind the chosen point and 16 m ahead, and enough branch length to contain its curved approach. Use Undo or select the route in **Add split** and choose **Remove split**.

Each route saves an ID and its ordered waypoint pairs in the optional `railwayRoutes` map extension. Plain routes use version 1. A map with a split uses version 2 and adds `turnout: {at, end}` to the parent route. A map with a crossing uses version 3 and derives each diamond from the same route records. A full map can hold up to 64 routes with up to 48 waypoints and 480 m per route including its branch, and up to 1,200 m of fitted track in total. A consumer advertises `nautilus-railway-routes-v1` for routes, `nautilus-railway-turnouts-v1` for splits and `nautilus-railway-crossings-v1` for crossings. Block capture, connected generation, and sector publishing require their own railway support. The portable map and named Design save preserve the full track.

## Run a train in Map Workshop

Choose **Railway → Train** and pick the steam or electric set. **World size** is the default for new placements. Choose **Miniature** for the original small models and existing miniature routes. Click the track near the end you want to depart from. Choose **Main line** or **Branch** at a facing turnout, then select **Run train**. The locomotive commits to the turnout setting as it reaches the split. Every car follows it. The train carries straight on along its own track through a diamond and stops at its destination end. A train departing from the branch merges onto the main line.

A design can hold one steam train and one electric train. Choose each type in turn and click its departure track, then select **Run both**. The Workshop adds red and green signals at the crossing and turnout approaches. A red signal holds the waiting train until the last car clears and there is room on the exit track. The waiting train resumes on its own. With both trains placed, the turnout locks its route when a train enters the protected track. Opposing trains on a single track need separate paths to pass each other.

World-size passenger cars are 8.1–8.55 m long. Steam coaches stand 3.89 m tall and the commuter roof is 3.79 m, with its collector reaching 4.19 m. These are deliberately compact game proportions. The original narrow rail gauge is retained. Keep at least 32.1 m of track for the large steam set and 27.8 m for the electric set, with room along each selected itinerary. Miniature sets retain their original 11.2 m and 9.6 m lengths. Moving a departure or editing the track returns both trains to their starting positions. **Reset both** returns them there during a test run. Version 4 saves a single miniature train and version 5 saves two miniature departures and turnout settings. Version 6 records explicit `radiusM` on routes and `profile` on train placements, with zero to two trains. Missing size fields keep miniature behavior. Existing designs retain their original track and vehicle sizes. World-size trains require 16 m routes, wider junction protection and offset signals. Games must advertise `nautilus-railway-world-stock-v1` before accepting version 6 data. Reopening starts each train at its departure end. Consumers advertise `nautilus-railway-trains-v1` for a train and `nautilus-railway-signals-v1` for shared traffic.

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

For a saved route, call `track.createRoute(route.waypoints, route.turnout, crossings, route.radiusM)` and add its root to the scene. Route roots use the authored map coordinates directly, with ground at Three Y = 0. Use `planRailwayRoute(waypoints, route.radiusM)` and, for a split, `planRailwayTurnout(mainPlan, turnout)` from map-core for the fitted geometry. Each route uses continuous sweeps, so the rails, gravel texture and tie spacing follow the tangent joins.

For a map with crossings, get the render inputs from map-core with `const byRoute = railwayCrossingsByRoute(railwayCrossingsOf(map))`. Pass `byRoute.get(route.id)` as the third argument to `track.createRoute` for each route. Both rails receive relief gaps at the four shared fittings while the planner keeps the two through paths independent.

For an authored train, get the placement with `railwayTrainOf(map)` and find its route by `placement.routeId` in `railwayRoutesOf(map)`. Call `createRailwayTrain(route, placement)` from map-core. Use `train.read()` for the current car poses and `train.advance(distanceM, switchPosition)` to advance using the host clock. In Three, create the model with `createRailwayTrainView(THREE, train.read())` from the renderer asset entry, then pass each new pose to `view.update(state)`. Call `view.dispose()` when unloading the train. `createRollingStockKit(THREE)` exposes the world-size individual cars for hosts that already render trains. Pass `{profile: 'miniature'}` for the original artwork. Host-created world models accept `setWheelContacts({front:{x,z,yaw},rear:{x,z,yaw}})` in car-local metres/radians. The train view supplies these contacts, including reverse cars, so the round wheels and articulated steam rods follow the fitted track. `RAILWAY_STOCK_PROFILES` provides matching pure-data dimensions, curve limits, coupling gaps and coupler heights.

For two trains, call `createRailwayTraffic(railwayRoutesOf(map), railwayTrainsOf(map))` from map-core. Advance the shared traffic with `traffic.advance(distanceM, activeStocks)` and set a train's requested path with `traffic.setSwitch(stock, switchPosition)`. Each snapshot includes both train poses and the signal aspects. Use one `createRailwayTrainView` per train and `createRailwaySignalView(THREE, snapshot.signals)` for the masts and lamps. Feed subsequent signal snapshots to the view's `update` method and dispose the view when unloading the layout.

The kit creates two procedural texture maps and shares geometries and materials across segment instances. Ties and tie plates are instanced. The kit owns those resources and removes its live roots on disposal. The host owns its renderer, scene, transforms and serialized placements. An unknown asset ID throws before a segment is created.

## Builder checklist

- Pin the installed renderer and catalogue. Choose an exact asset ID and preserve it with the host’s transform.
- Match the two metre bed and its ground datum to the host’s tiles. Verify both rails, the bed and tie spacing across a straight-to-curve seam at the intended camera scale.
- Supply any train routing, collision, support and navigation through the game. Advertise the route capability only when the receiving game can preserve the route.
- Reopen the host’s placement data and check the same joins. Dispose individual segments or the full kit when unloading and keep the host renderer alive.

Original procedural geometry and gravel, wood and steel finishes are authored in `packages/railway-visuals/`. The focused test checks both joins, the shared resource lifetime and the editor discovery entries.

The separate [drivable-train candidate](drivable-trains.md) adds retained actors, named car entrances, cab authority, coach riding, signed motion and runtime checkpoints. Its two-circuit reference is `/examples/train-yard.html`. Circuit authoring is an optional runtime contract; existing portable map and Workshop playback behavior stay on the formats described above. The architect owns public package/UI integration of that candidate.
