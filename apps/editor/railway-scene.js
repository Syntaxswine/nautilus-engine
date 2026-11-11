import * as T from '../../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/vendor/three.module.js';
import {InspectionScene as Legacy} from './roof-scene.js';
import {railwayRoutesOf, railwayCrossingsOf} from '../../packages/map-core/railway-routes.js';
import {RAIL_TRACK_PROFILE} from '../../packages/railway-visuals/catalogue.js';
import {createRailwayKit} from '../../packages/railway-visuals/three.js';
import {planRailwayRoute, planRailwayTurnout, railwayCrossingsByRoute} from '../../packages/railway-visuals/route.js';
import {createWorkshopTrainPreview} from './railway-train-preview.js';

const signatureOf = (route, crossings) => JSON.stringify([route.waypoints, route.turnout, crossings]);
const markerHeight = RAIL_TRACK_PROFILE.railTopM + .045;

export class InspectionScene extends Legacy {
  constructor(...args) {
    super(...args);
    this.railwayModels = new Map();
    this.railwayPeerGhosts = new Map();
    this.railwayHidden = new Set();
    this.railwayGhost = null;
    this.railwayTrain = createWorkshopTrainPreview(T, this.scene, () => this.changed());
    this.railwayMarks = new T.LineSegments(new T.BufferGeometry(),
      new T.LineBasicMaterial({color: 0x78f1de, depthTest: false}));
    this.railwayMarks.name = 'Railway draft waypoints';
    this.railwayMarks.renderOrder = 30;
    this.railwayMarks.visible = false;
    this.scene.add(this.railwayMarks);
  }

  makeRailway(route, crossings, name) {
    this.railwayKit ??= createRailwayKit(T);
    const model = this.railwayKit.createRoute(route.waypoints, route.turnout, crossings);
    if (name) model.root.name = name;
    model.root.userData.routeId = route.id;
    this.scene.add(model.root);
    return {model, signature: signatureOf(route, crossings)};
  }

  syncRailwayModels(models, routes, crossings, name) {
    const wanted = new Set(routes.map(route => route.id));
    for (const [id, entry] of models) {
      if (!wanted.has(id)) { entry.model.dispose(); models.delete(id); }
    }
    for (const route of routes) {
      const along = crossings.get(route.id) ?? [];
      const entry = models.get(route.id);
      if (entry?.signature !== signatureOf(route, along)) {
        entry?.model.dispose();
        models.set(route.id, this.makeRailway(route, along, name));
      }
    }
  }

  updateRailway(document = this.document) {
    if (!this.railwayModels || this.railwayDisposed) return;
    const crossings = railwayCrossingsByRoute(railwayCrossingsOf(document?.map));
    this.syncRailwayModels(this.railwayModels, railwayRoutesOf(document?.map), crossings);
    this.railwayTrain.sync(document?.map);
    this.syncRailwayVisibility();
  }

  syncRailwayVisibility() {
    const visible = this.options.showAllLevels !== false || !this.options.level;
    for (const [id, entry] of this.railwayModels) entry.model.root.visible = visible && !this.railwayHidden.has(id);
    for (const entry of this.railwayPeerGhosts.values()) entry.model.root.visible = visible;
    if (this.railwayGhost) this.railwayGhost.model.root.visible = visible;
    this.railwayTrain.setVisible(visible);
  }

  rebuild() { super.rebuild(); this.updateRailway(); }
  async open(document) {
    this.railwayTrain.pauseAll();
    await super.open(document);
    if (this.document !== document || this.railwayDisposed) return;
    this.updateRailway(document);
    this.railwayTrain.reset();
  }
  async update(document) {
    this.railwayTrain.sync(document?.map);
    await super.update(document);
    if (this.document === document) this.updateRailway(document);
  }

  preview(result) {
    super.preview(result);
    if (!this.railwayMarks || this.railwayDisposed) return;
    const draft = result?.ok ? result.railwayPreview : null;
    const route = draft?.route;
    const crossings = railwayCrossingsByRoute(draft?.crossings ?? []);
    const along = crossings.get(route?.id) ?? [];
    if (!route || signatureOf(route, along) !== this.railwayGhost?.signature) {
      this.railwayGhost?.model.dispose();
      this.railwayGhost = route ? this.makeRailway(route, along, 'Railway route preview') : null;
    }
    this.railwayHidden = new Set(along.map(crossing => crossing.other.id));
    const peers = railwayRoutesOf(this.document?.map).filter(item => this.railwayHidden.has(item.id));
    this.syncRailwayModels(this.railwayPeerGhosts, peers, crossings, 'Railway crossing preview track');
    if (draft?.replaces) this.railwayHidden.add(draft.replaces);
    this.syncRailwayVisibility();
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
    const plan = planRailwayRoute(selection.data.waypoints);
    const turnout = selection.data.turnout && planRailwayTurnout(plan, selection.data.turnout);
    const vertices = [...plan.segments, ...(turnout?.plan.segments ?? [])]
      .flatMap(({a, b}) => [a[0], markerHeight, a[1], b[0], markerHeight, b[1]]);
    this.highlight.geometry.dispose();
    this.highlight.geometry = new T.BufferGeometry().setAttribute('position', new T.Float32BufferAttribute(vertices, 3));
    this.highlight.material.color.setHex(0xffe5a5);
    this.changed();
  }

  dispose() {
    if (this.railwayDisposed) return;
    this.railwayDisposed = true;
    this.railwayTrain.dispose();
    this.railwayKit?.dispose();
    this.railwayModels.clear();
    this.railwayPeerGhosts.clear();
    this.railwayMarks.removeFromParent();
    this.railwayMarks.geometry.dispose();
    this.railwayMarks.material.dispose();
    super.dispose();
  }
}
