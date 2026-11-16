import {createTrainSession, railwayEntrancesForTrain} from '../packages/train-core/index.js';
import {createRailwayCircuitTraffic} from '../packages/train-core/circuit-traffic.js';
import {plainData, fields, samePoint} from '../packages/train-core/data.js';
import {createWorld} from '../packages/world-core/index.js';
import {createInteractionState, createInteractionActor, createInteractionQueries, walkActor} from '../packages/interactions/index.js';

export const TRAIN_YARD_ROUTES = [
  {id: 'steam-loop', circuit: true, radiusM: 16, waypoints: [[20, 40], [108, 40], [108, 130], [20, 130]]},
  {id: 'electric-loop', circuit: true, radiusM: 16, waypoints: [[132, 40], [220, 40], [220, 130], [132, 130]]}
];
export const TRAIN_YARD_PLACEMENTS = ['steam', 'electric'].map(stock => ({stock, profile: 'world', routeId: stock + '-loop', departure: 'start', switchPosition: 'main'}));

// A small retained game host. It owns actor resources, ordinary walking,
// support/clearance queries, the clock and station service drivers. The UI is
// given only the connector facade, never authority over these services.
export function createTrainYardHost(saved) {
  const world = createWorld({id: 'two-circuit-yard', name: 'Two circuit railway', widthM: 240, depthM: 180,
    floorCount: 1, storyHeightM: 2.12, groundHeightM: 0, heightM: 8});
  world.surfaces = [{id: 'yard', floorId: 'floor-0', role: 'floor', supports: true, supportFloorId: 'floor-0',
    bounds: {min: {x: 0, y: 0, h: 0}, max: {x: 240, y: 180, h: 0}}}];
  const interaction = createInteractionState({worldId: world.id}), baseQueries = createInteractionQueries(world);
  const initialTraffic = createRailwayCircuitTraffic(TRAIN_YARD_ROUTES, TRAIN_YARD_PLACEMENTS).read();
  const initialEntrances = initialTraffic.trains.flatMap(({state}) => railwayEntrancesForTrain(state));
  const beside = (entrance, offset = .9) => ({x: entrance.position.x + entrance.outward.x * offset,
    y: entrance.position.y + entrance.outward.y * offset, h: 0});
  const actor = (id, entrance) => ({...createInteractionActor({id, floorId: 'floor-0', position: beside(entrance),
    radiusM: .22, heightM: 1.6, speedMps: 5}), mode: 'on-foot', attachment: null, health: 37, ap: 3,
    stamina: 11, inventory: [{id: 'key', count: 1}, {id: 'rock', count: 2}]});
  let actors = [actor('player', initialEntrances.find(e => e.trainId === 'train/steam' && e.id === 'cab-rear-right')),
    actor('operator/steam', initialEntrances.find(e => e.trainId === 'train/steam' && e.id === 'cab-rear-left')),
    actor('operator/electric', initialEntrances.find(e => e.trainId === 'train/electric' && e.carIndex === 0 && e.id === 'door-1-left'))];
  let serial = 0, entryEffects = 0, services = {}, session, retired = false;
  const listeners = new Set();
  const emit = () => { for (const listener of [...listeners]) try { listener(); } catch { /* presentation only */ } };
  if (saved !== undefined) {
    saved = plainData(typeof saved === 'string' ? JSON.parse(saved) : saved);
    fields(saved, ['kind', 'version', 'actors', 'trains', 'serial', 'entryEffects', 'services']);
    if (saved.kind !== 'nautilus-train-yard-save' || saved.version !== 1 || !Number.isSafeInteger(saved.serial) || saved.serial < 0 ||
        !Number.isSafeInteger(saved.entryEffects) || saved.entryEffects < 0 || !Array.isArray(saved.actors) || saved.actors.length !== 3 ||
        saved.actors.some((record, i) => record.id !== actors[i].id || !Array.isArray(record.inventory))) throw Error('Unsupported retained yard checkpoint.');
    actors = saved.actors; serial = saved.serial; entryEffects = saved.entryEffects; services = saved.services;
    for (const [stock, service] of Object.entries(services)) {
      fields(service, ['status', 'start', 'target', 'leaseId']);
      if (!['steam', 'electric'].includes(stock) || !['running', 'braking', 'paused', 'docked'].includes(service.status) ||
          !Number.isFinite(service.start) || !Number.isFinite(service.target) || service.target <= service.start) throw Error('Invalid saved station service.');
      if (service.status !== 'docked') service.status = 'paused';
    }
  }
  const getActor = id => actors.find(actor => actor.id === id);
  const trainState = stock => session.read().trains.find(train => train.stock === stock).state;
  const nearStation = stock => {
    const state = trainState(stock), length = state.circuitLengthM;
    const phase = ((state.distanceM % length) + length) % length;
    return Math.min(phase, length - phase) < .75;
  };
  function clear(position, mover) {
    if (position.h !== 0 || position.x < mover.radiusM || position.y < mover.radiusM || position.x > 240 - mover.radiusM || position.y > 180 - mover.radiusM) return false;
    for (const {state} of session.read().trains) for (const car of state.cars) {
      const c = Math.cos(car.yaw), s = Math.sin(car.yaw), dx = position.x - car.x, dy = position.y - car.z;
      if (Math.abs(dx * c - dy * s) < 1.25 + mover.radiusM && Math.abs(dx * s + dy * c) < car.lengthM / 2 + mover.radiusM) return false;
    }
    return !actors.some(other => other.id !== mover.id && other.mode === 'on-foot' &&
      Math.hypot(position.x - other.position.x, position.y - other.position.y) < mover.radiusM + other.radiusM);
  }
  const geometry = {
    ...baseQueries,
    walk(query) {
      const support = baseQueries.walk(query); if (!support.ok) return support;
      const count = Math.max(1, Math.ceil(Math.hypot(query.to.x - query.from.x, query.to.y - query.from.y) / .1));
      for (let i = 1; i <= count; i++) {
        const p = {x: query.from.x + (query.to.x - query.from.x) * i / count,
          y: query.from.y + (query.to.y - query.from.y) * i / count, h: 0};
        if (!clear(p, query.actor)) return {ok: false, code: 'WALK_BLOCKED', reason: 'Walk around the train or waiting operator.'};
      }
      return {ok: true};
    }
  };
  const retained = {
    readActor: id => structuredClone(getActor(id)),
    canEnter({actor, entrance, train}) {
      if (actor.floorId !== 'floor-0' || actor.traversal || !clear(actor.position, actor)) return {ok: false, code: 'ACCESS_BLOCKED', reason: 'Approach from clear supported ground beside this entrance.'};
      if (actor.id === 'player' && entrance.mode === 'rider' && !train.driverId && !nearStation(train.stock)) {
        return {ok: false, code: 'SERVICE_AT_PLATFORM', reason: 'Return this train to its marked boarding platform for the one-lap passenger service.'};
      }
      return {ok: true};
    },
    landing({actor, entrance}) {
      const offset = Math.max(.55, 1.25 + actor.radiusM + .15 - Math.abs(entrance.local.x));
      const position = beside(entrance, offset), landing = {position, floorId: 'floor-0', surfaceId: 'yard'};
      const supported = baseQueries.landing({state: interaction, actor, landing});
      if (!supported.ok || !clear(position, actor)) return {ok: false, code: 'LANDING_BLOCKED', reason: 'Clear the supported ground beside this car entrance.'};
      return {ok: true, landing};
    },
    commit({reason, changes}) {
      if (changes.some(change => getActor(change.actorId)?.revision !== change.expectedRevision)) return {ok: false, code: 'STALE_ACTOR', reason: 'The retained actor moved. Refresh and retry.'};
      const next = structuredClone(actors);
      for (const {actorId, expectedRevision, patch} of changes) {
        fields(patch, ['position', 'floorId', 'mode', 'attachment']);
        Object.assign(next.find(actor => actor.id === actorId), patch, {revision: expectedRevision + 1});
      }
      actors = next;
      if (reason === 'enter') entryEffects += changes.length;
      return {ok: true};
    }
  };
  session = createTrainSession({routes: TRAIN_YARD_ROUTES, placements: TRAIN_YARD_PLACEMENTS,
    actorIds: actors.map(actor => actor.id), host: retained, ...(saved ? {checkpoint: saved.trains} : {})});
  session.subscribe(emit);
  if (actors.some(actor => actor.traversal !== null || actor.mode === 'on-foot' && (actor.floorId !== 'floor-0' || !clear(actor.position, actor)))) throw Error('Saved yard actor lacks clear supported ground or uses unsupported traversal.');
  const commandId = () => 'yard/' + ++serial;
  function control(stock, direction, power, brake, leaseId) {
    const actorId = 'operator/' + stock, snapshot = session.readForActor(actorId);
    return session.dispatch({type: 'drive', actorId, commandId: commandId(), trainId: snapshot.trainId,
      expected: snapshot.expected, leaseId, direction, power, brake});
  }
  function startService(stock) {
    if (!nearStation(stock)) return;
    const actorId = 'operator/' + stock, operator = session.readForActor(actorId);
    const entry = operator.actions.find(action => action.enabled && action.command.type === 'enter' && action.command.carId.endsWith('/0'));
    if (!entry || !session.dispatch({...entry.command, commandId: commandId()}).ok) return;
    const state = trainState(stock), leaseId = 'service/' + commandId();
    services[stock] = {status: 'running', start: state.distanceM, target: state.distanceM + state.circuitLengthM, leaseId};
    control(stock, 'forward', 1, 0, leaseId);
  }
  const connector = Object.freeze({contract: session.contract, readForActor: id => session.readForActor(id),
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    dispatch(command) {
      const result = session.dispatch(command);
      if (result.ok && !result.repeated && command.type === 'enter') {
        const player = session.readForActor('player');
        if (player.mode === 'rider' && !player.train.driverId) startService(player.train.stock);
      }
      if (result.ok && !result.repeated && command.type === 'exit' && command.actorId === 'player') {
        const stock = command.trainId.slice('train/'.length), service = services[stock];
        if (service?.status === 'paused') {
          const operator = session.readForActor('operator/' + stock), exit = operator.actions.find(action => action.enabled);
          if (exit && session.dispatch({...exit.command, commandId: commandId()}).ok) delete services[stock];
        }
      }
      return result;
    }
  });
  return Object.freeze({connector, routes: structuredClone(TRAIN_YARD_ROUTES),
    get actors() { return structuredClone(actors); },
    read() { return {...session.read(), actors: structuredClone(actors), services: structuredClone(services), entryEffects}; },
    walk(x, y, seconds = .05) {
      if (retired) throw Error('Yard host is retired.');
      const snapshot = session.readForActor('player');
      if (!snapshot.walkingAllowed) return {ok: false, code: 'ABOARD', reason: 'Exit the stopped train before walking.'};
      const current = getActor('player'), mover = createInteractionActor({id: current.id, floorId: current.floorId,
        position: current.position, radiusM: current.radiusM, heightM: current.heightM, speedMps: current.speedMps});
      mover.revision = current.revision;
      if (![x, y].every(Number.isFinite)) return {ok: false, code: 'INVALID_WALK', reason: 'Supply finite walking input.'};
      const scale = Math.max(1, Math.hypot(x, y));
      const result = walkActor(interaction, mover, {direction: {x: x / scale, y: y / scale}, seconds}, geometry);
      if (result.ok) { Object.assign(current, result.actor); emit(); }
      return result;
    },
    advance(seconds) {
      if (retired) throw Error('Yard host is retired.');
      for (const [stock, service] of Object.entries(services)) {
        const state = trainState(stock), driver = session.readForActor('operator/' + stock);
        if (driver.mode !== 'driver' || service.status === 'docked' || service.status === 'paused') continue;
        const speed = driver.train.speedMps, remaining = service.target - state.distanceM;
        if (service.status === 'running' && remaining <= speed * speed / (2 * 1.68) + speed * seconds + .02) {
          control(stock, 'neutral', 0, 1, service.leaseId); service.status = 'braking';
        } else if (service.status === 'running' && speed >= 6 && driver.train.controls.power === 1) {
          control(stock, 'forward', .1, 0, service.leaseId);
        } else if (service.status === 'braking' && driver.train.stopped) {
          const exit = driver.actions.find(action => action.enabled);
          if (exit && session.dispatch({...exit.command, commandId: commandId()}).ok) service.status = 'docked';
        }
      }
      return session.advance(seconds);
    },
    resumeRide() {
      const player = session.readForActor('player');
      if (player.mode !== 'rider' || !player.train.stopped) return {ok: false, code: 'STOP_FIRST', reason: 'Wait for the restored train to stop.'};
      const service = services[player.train.stock];
      if (!service || service.status !== 'paused') return {ok: false, code: 'NO_PAUSED_SERVICE', reason: 'No paused passenger service.'};
      const leaseId = 'service/' + commandId(), result = control(player.train.stock, 'forward', 1, 0, leaseId);
      if (result.ok) { service.leaseId = leaseId; service.status = 'running'; }
      return result;
    },
    save() { return JSON.stringify({kind: 'nautilus-train-yard-save', version: 1, actors,
      trains: session.checkpoint(), serial, entryEffects, services}); },
    dispose() { if (retired) return; retired = true; session.dispose(); listeners.clear(); }
  });
}
