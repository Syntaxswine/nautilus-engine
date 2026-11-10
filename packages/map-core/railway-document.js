import {EditingDocument as Legacy} from './roof-document.js';
import {parseMap, extractBlock, placeBlock, validateBlock} from './railway-map.js';
import {assertRailwayRoutes, railwayRouteAt, railwayRoutesOf, refuseRailwayRoutes, setRailwayRoutes} from './railway-routes.js';

export class EditingDocument extends Legacy {
  open(text) {
    if (typeof text === 'string' && text.length <= 4000000) {
      const raw = JSON.parse(text);
      if (raw?.kind === 'red-shift-block') refuseRailwayRoutes(raw, 'The reusable block format');
      if (raw?.railwayRoutes !== undefined) parseMap(text, {allowDisconnected: true});
    }
    return super.open(text);
  }

  preview(command) {
    try {
      if (!['railway-route', 'erase-railway-route', 'railway-turnout', 'erase-railway-turnout'].includes(command?.tool)) {
        const result = super.preview(command);
        if (result.ok) assertRailwayRoutes(result.map);
        return result;
      }
      if (this.block) throw new Error('Railway routes are available in a full map. Open the full map workspace.');
      if (command.start?.z !== 0) throw new Error('Railway routes need the ground layer. Select level 1.');
      const map = structuredClone(this.editor.map), routes = railwayRoutesOf(map), {id, waypoints} = command.options ?? {};
      if (command.tool === 'railway-turnout' || command.tool === 'erase-railway-turnout') {
        const route = routes.find(item => item.id === id);
        if (!route) throw new Error('Choose a straight section of a placed railway route.');
        if (command.tool === 'erase-railway-turnout') {
          if (!route.turnout) throw new Error('The selected route has no split.');
          delete route.turnout;
          setRailwayRoutes(map, routes);
          return {ok: true, map, cells: [], edges: []};
        }
        route.turnout = structuredClone(command.options.turnout);
        setRailwayRoutes(map, routes);
        const {turnout} = assertRailwayRoutes(map).find(item => item.id === id);
        return {ok: true, map, cells: [], edges: [], railwayPreview: {route, plan: turnout.plan, replaces: id}};
      }
      if (command.tool === 'erase-railway-route') {
        if (!routes.some(route => route.id === id)) throw new Error('Select an existing railway route.');
        setRailwayRoutes(map, routes.filter(route => route.id !== id));
        return {ok: true, map, cells: [], edges: []};
      }
      let next = 1;
      while (routes.some(route => route.id === 'rail-' + next)) next++;
      const route = {id: 'rail-' + next, waypoints: structuredClone(waypoints)};
      setRailwayRoutes(map, [...routes, route]);
      const {plan} = assertRailwayRoutes(map).at(-1);
      return {ok: true, map, cells: [], edges: [], railwayPreview: {route, plan}};
    } catch (error) {
      return {ok: false, error: error.message, cells: [], edges: []};
    }
  }

  replace(map) {
    if (map?.railwayRoutes === undefined) refuseRailwayRoutes(this.map, 'Replacing a map that contains track');
    assertRailwayRoutes(map);
    return super.replace(map);
  }

  inspect(x, y, z = 0, options = {}) {
    if (z === 0 && [undefined, 'auto', 'prop'].includes(options.mode)) {
      const route = railwayRouteAt(this.map, x, y);
      if (route) return {x, y, z, type: 'railway-route', label: (route.turnout ? 'Railway with split · ' : 'Railway · ') + route.id,
        data: structuredClone(route), cells: []};
    }
    return super.inspect(x, y, z, options);
  }

  capture(sx = 0, sy = 0) {
    if (this.block && (sx !== 0 || sy !== 0)) throw new Error('A reusable block has only one sector.');
    return validateBlock(extractBlock(this.editor.map, sx, sy));
  }

  place(block, sx, sy) {
    if (this.block) throw new Error('Place blocks in a full map.');
    this.replace(placeBlock(this.editor.map, block, sx, sy));
  }

  validate() {
    const errors = super.validate();
    if (errors.length || this.block) return errors;
    try { assertRailwayRoutes(this.map); return []; }
    catch (error) { return [error.message]; }
  }
}
