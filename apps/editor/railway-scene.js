import * as T from '../../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/vendor/three.module.js';
import {InspectionScene as Legacy} from './roof-scene.js';
import {railwayRoutesOf} from '../../packages/map-core/railway-routes.js';
import {RAIL_TRACK_PROFILE} from '../../packages/railway-visuals/catalogue.js';
import {createRailwayKit} from '../../packages/railway-visuals/three.js';
import {planRailwayRoute} from '../../packages/railway-visuals/route.js';

const signatureOf = route => JSON.stringify(route.waypoints);
const markerHeight = RAIL_TRACK_PROFILE.railTopM + .045;

export class InspectionScene extends Legacy {
  constructor(...args) {
    super(...args);
    this.railwayModels = new Map();
    this.railwayMarks = new T.LineSegments(new T.BufferGeometry(),
      new T.LineBasicMaterial({color: 0x78f1de, depthTest: false}));
    this.railwayMarks.name = 'Railway draft waypoints';
    this.railwayMarks.renderOrder = 30;
    this.railwayMarks.visible = false;
    this.scene.add(this.railwayMarks);
  }

  makeRailway(route) {
    this.railwayKit ??= createRailwayKit(T);
    const model = this.railwayKit.createRoute(route.waypoints);
    model.root.userData.routeId = route.id;
    this.scene.add(model.root);
    return {model, signature: signatureOf(route)};
  }

  updateRailway(document = this.document) {
    if (!this.railwayModels || this.railwayDisposed) return;
    const routes = railwayRoutesOf(document?.map);
    const wanted = new Set(routes.map(route => route.id));
    for (const [id, entry] of this.railwayModels) {
      if (!wanted.has(id)) { entry.model.dispose(); this.railwayModels.delete(id); }
    }
    for (const route of routes) {
      let entry = this.railwayModels.get(route.id);
      if (entry?.signature !== signatureOf(route)) {
        entry?.model.dispose();
        entry = this.makeRailway(route);
        this.railwayModels.set(route.id, entry);
      }
      entry.model.root.visible = this.options.showAllLevels !== false || !this.options.level;
    }
  }

  rebuild() { super.rebuild(); this.updateRailway(); }
  async open(document) { await super.open(document); this.updateRailway(document); }
  async update(document) { await super.update(document); this.updateRailway(document); }

  preview(result) {
    super.preview(result);
    if (!this.railwayMarks || this.railwayDisposed) return;
    const route = result?.ok ? result.railwayPreview?.route : null;
    if (!route || signatureOf(route) !== this.railwayGhost?.signature) {
      this.railwayGhost?.model.dispose();
      this.railwayGhost = route ? this.makeRailway(route) : null;
      if (this.railwayGhost) this.railwayGhost.model.root.name = 'Railway route preview';
    }
    const points = result?.railwayWaypoints ?? [], signature = JSON.stringify(points);
    if (signature !== this.railwayMarksSignature) {
      this.railwayMarksSignature = signature;
      const vertices = [];
      for (const [x, z] of points) {
        vertices.push(x - .25, markerHeight, z, x + .25, markerHeight, z,
          x, markerHeight, z - .25, x, markerHeight, z + .25);
      }
      this.railwayMarks.geometry.dispose();
      this.railwayMarks.geometry = new T.BufferGeometry().setAttribute('position', new T.Float32BufferAttribute(vertices, 3));
      this.railwayMarks.visible = !!vertices.length;
    }
  }

  select(selection) {
    super.select(selection);
    if (selection?.type !== 'railway-route') return;
    const {segments} = planRailwayRoute(selection.data.waypoints);
    const vertices = segments.flatMap(({a, b}) => [a[0], markerHeight, a[1], b[0], markerHeight, b[1]]);
    this.highlight.geometry.dispose();
    this.highlight.geometry = new T.BufferGeometry().setAttribute('position', new T.Float32BufferAttribute(vertices, 3));
    this.highlight.material.color.setHex(0xffe5a5);
    this.changed();
  }

  dispose() {
    if (this.railwayDisposed) return;
    this.railwayDisposed = true;
    this.railwayKit?.dispose();
    this.railwayModels.clear();
    this.railwayMarks.removeFromParent();
    this.railwayMarks.geometry.dispose();
    this.railwayMarks.material.dispose();
    super.dispose();
  }
}
