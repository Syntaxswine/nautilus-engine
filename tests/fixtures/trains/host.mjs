import {createTrainSession, railwayEntrancesForTrain} from '../../../packages/train-core/index.js';
import {createRailwayTraffic} from '../../../packages/map-core/railway-traffic.js';
import {createRailwayCircuitTraffic} from '../../../packages/train-core/circuit-traffic.js';

export const straight = [{id: 'east', radiusM: 16, waypoints: [[20, 50], [220, 50]]}];
export const placement = (stock = 'steam', routeId = 'east', profile = 'world', departure = 'start', switchPosition = 'main') =>
  ({stock, routeId, profile, departure, switchPosition});
export function retainedTrainFixture({routes = straight, placements = [placement()], actors, checkpoint} = {}) {
  const initial = (routes.some(route => route.circuit) ? createRailwayCircuitTraffic : createRailwayTraffic)(routes, placements).read();
  const cab = railwayEntrancesForTrain(initial.trains[0].state).find(entrance => entrance.mode === 'driver');
  let records = actors ? structuredClone(actors) : ['player', 'other'].map((id, i) => ({id, revision: 0,
    position: {x: cab.position.x + cab.outward.x * .7, y: cab.position.y + cab.outward.y * .7, h: 0},
    floorId: 'ground', mode: 'on-foot', attachment: null, radiusM: .22, heightM: 1.6,
    health: 37 - i, inventory: ['key', 'rock'], ap: 3, stamina: 11}));
  let blocked = false, rejected = false, access = true, commits = 0, session;
  const host = {
    readActor: id => structuredClone(records.find(actor => actor.id === id)),
    canEnter: () => access ? {ok: true} : {ok: false, code: 'ACCESS_DENIED', reason: 'Entrance access is denied.'},
    landing: ({entrance}) => blocked ? {ok: false, code: 'LANDING_BLOCKED', reason: 'Clear the supported landing.'} : {
      ok: true, landing: {position: {x: entrance.position.x + entrance.outward.x, y: entrance.position.y + entrance.outward.y, h: 0}, floorId: 'ground', surfaceId: 'yard'}},
    commit({changes}) {
      if (rejected) return {ok: false, code: 'HOST_REJECTED', reason: 'Host refused the transaction.'};
      if (changes.some(change => records.find(actor => actor.id === change.actorId)?.revision !== change.expectedRevision)) return {ok: false, code: 'STALE_ACTOR', reason: 'Actor moved.'};
      const staged = structuredClone(records);
      for (const change of changes) Object.assign(staged.find(actor => actor.id === change.actorId), change.patch,
        {revision: change.expectedRevision + 1});
      records = staged; commits++;
      return {ok: true};
    }
  };
  session = createTrainSession({routes, placements, actorIds: records.map(actor => actor.id), host, ...(checkpoint ? {checkpoint} : {})});
  let serial = 0;
  return {session, host, get actors() { return structuredClone(records); }, get commits() { return commits; },
    block(value = true) { blocked = value; }, reject(value = true) { rejected = value; }, access(value) { access = value; },
    place(actorId, entrance) { const actor = records.find(actor => actor.id === actorId); Object.assign(actor, {revision: actor.revision + 1,
      position: {x: entrance.position.x + entrance.outward.x * .7, y: entrance.position.y + entrance.outward.y * .7, h: 0}}); },
    send(type, extra = {}, actorId = 'player') { const snapshot = session.readForActor(actorId);
      return session.dispatch({type, actorId, commandId: 'test/' + ++serial, trainId: snapshot.trainId, expected: snapshot.expected, ...extra}); },
    enter(actorId = 'player', predicate = action => action.enabled) { const action = session.readForActor(actorId).actions.find(predicate);
      if (!action) throw Error('No selected fixture entrance.');
      return session.dispatch({...action.command, commandId: 'test/' + ++serial}); }
  };
}
