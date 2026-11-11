import {planRailwayCircuit, assertRailwaySeparation} from '../railway-visuals/route.js';
import {createRailwayCircuitTrainOnPlan} from '../map-core/railway-train.js';
import {fields, finite} from './data.js';

export {planRailwayCircuit};
export function createRailwayCircuitTraffic(routes, placements) {
  if (!Array.isArray(routes) || !routes.length || routes.length > 64 || new Set(routes.map(route => route.id)).size !== routes.length ||
      routes.some(route => route.circuit !== true || route.turnout)) throw Error('Use distinct independent closed circuits without turnouts in this profile.');
  const plans = routes.map(route => ({id: route.id, plan: planRailwayCircuit(route.waypoints, route.radiusM)}));
  assertRailwaySeparation(plans);
  if (!Array.isArray(placements) || placements.length > 2 || new Set(placements.map(train => train.stock)).size !== placements.length ||
      new Set(placements.map(train => train.routeId)).size !== placements.length) throw Error('Use one placed consist per independent circuit.');
  const entries = placements.map(placement => {
    const plan = plans.find(plan => plan.id === placement.routeId);
    if (!plan) throw Error('Missing circuit for the train.');
    return {stock: placement.stock, motion: createRailwayCircuitTrainOnPlan(plan, placement)};
  });
  const read = () => ({trains: entries.map(entry => ({stock: entry.stock, state: entry.motion.read(), waiting: null, canTakeBranch: false})), signals: []});
  return Object.freeze({read, advanceSigned(requests) {
    if (!Array.isArray(requests) || requests.length > entries.length || new Set(requests.map(request => request.stock)).size !== requests.length) throw Error('Supply one signed distance per circuit train.');
    for (const request of requests) {
      fields(request, ['stock', 'distanceM']); finite(request.distanceM, -1000, 1000);
      if (!entries.some(entry => entry.stock === request.stock)) throw Error('Unknown circuit train.');
    }
    const moved = Object.fromEntries(entries.map(entry => [entry.stock, 0]));
    for (const request of requests) {
      entries.find(entry => entry.stock === request.stock).motion.moveSigned(request.distanceM);
      moved[request.stock] = request.distanceM;
    }
    return {snapshot: read(), moved};
  }, checkpoint() { return {version: 1, circuit: true, trains: entries.map(entry => ({stock: entry.stock, motion: entry.motion.checkpoint()}))}; },
    restore(saved) {
      fields(saved, ['version', 'circuit', 'trains']);
      if (saved.version !== 1 || saved.circuit !== true || !Array.isArray(saved.trains) || saved.trains.length !== entries.length) throw Error('Incompatible circuit checkpoint.');
      // Validate the complete set before mutating either consist.
      for (const [i, record] of saved.trains.entries()) {
        fields(record, ['stock', 'motion']); fields(record.motion, ['headM']); finite(record.motion.headM, -1e9, 1e9);
        if (record.stock !== entries[i].stock) throw Error('Saved circuit stock mismatch.');
      }
      saved.trains.forEach((record, i) => entries[i].motion.restore(record.motion));
      return read();
    }, setTurnout() { return {ok: false, code: 'NO_TURNOUT', reason: 'These independent circuits have no switches.'}; }
  });
}
