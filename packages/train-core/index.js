import {createRailwayTraffic} from '../map-core/railway-traffic.js';
import {railwayEntrancesForTrain} from '../railway-visuals/entrances.js';
import {TRAIN_SESSION_CONTRACT} from './contract.js';
import {createRailwayCircuitTraffic} from './circuit-traffic.js';
import {plainData, fields, identifier, finite, revision, point, canonical, samePoint} from './data.js';
export {TRAIN_SESSION_CONTRACT};
export {planRailwayCircuit} from './circuit-traffic.js';
export {railwayCarEntrances, railwayEntrancesForTrain} from '../railway-visuals/entrances.js';

const EPS = 1e-7, JOURNAL_LIMIT = 4096, LEASE_LIMIT = 8192;
const safeControls = () => ({direction: 'neutral', power: 0, brake: 1, leaseId: null});
const refusal = (code, reason) => ({ok: false, code, reason});
const reasonForHold = kind => ({crossing: 'Waiting for the diamond crossing and its exit to clear.',
  turnout: 'Waiting for the protected turnout and its exit to clear.', track: 'Waiting for occupied track to clear.',
  end: 'End of the selected itinerary. Stop and select the other direction.'})[kind];
const modelLimits = profile => profile === 'world' ? {max: 10, acceleration: .8, brake: 1.6, coast: .08}
  : {max: 3, acceleration: .5, brake: 1.2, coast: .06};

function actorRecord(host, id) {
  const actor = plainData(host.readActor(id));
  if (actor.id !== id) throw Error('The retained host returned a different actor.');
  revision(actor.revision); point(actor.position); identifier(actor.floorId);
  finite(actor.radiusM, .02, 5); finite(actor.heightM, .05, 10);
  if (!['on-foot', 'driver', 'rider'].includes(actor.mode)) throw Error('Bind the retained actor locomotion mode.');
  return actor;
}

function verifyQuery(result, service) {
  const data = plainData(result);
  if (data.ok !== true && (data.ok !== false || typeof data.code !== 'string' || typeof data.reason !== 'string')) {
    throw Error('Host ' + service + ' must return an explicit ok/refusal result.');
  }
  return data;
}

export function createTrainSession({routes, placements, actorIds, host, checkpoint} = {}) {
  routes = plainData(routes); placements = plainData(placements); actorIds = plainData(actorIds);
  if (!Array.isArray(actorIds) || !actorIds.length || actorIds.length > 64 || new Set(actorIds).size !== actorIds.length) {
    throw Error('Bind 1–64 distinct retained actors.');
  }
  actorIds.forEach(identifier);
  for (const method of ['readActor', 'canEnter', 'landing', 'commit']) {
    if (typeof host?.[method] !== 'function') throw Error('Bind retained host service ' + method + '.');
  }
  const content = canonical({routes, placements, actorIds});
  const traffic = routes.some(route => route.circuit) ? createRailwayCircuitTraffic(routes, placements) : createRailwayTraffic(routes, placements);
  let occupancyRevision = 0, occupied = new Map(), receipts = new Map(), closedLeases = new Set(), busy = false, reading = false, disposed = false;
  const listeners = new Set();
  let trains = new Map(traffic.read().trains.map(({stock, state}) => ['train/' + stock, {
    trainId: 'train/' + stock, stock, profile: state.profile, signedSpeedMps: 0, controlRevision: 0,
    controls: safeControls(), lease: null, driverId: null, hold: null
  }]));

  const assertLive = () => { if (disposed) throw Error('The train session has been disposed.'); };
  const currentEntrances = () => traffic.read().trains.flatMap(({state}) => railwayEntrancesForTrain(state));
  const entranceFor = record => currentEntrances().find(entrance => entrance.trainId === record.trainId &&
    entrance.carId === record.carId && entrance.id === record.entranceId);
  function readActor(id) {
    if (!actorIds.includes(id)) throw Error('Actor is not bound to this train session.');
    const actor = actorRecord(host, id), seat = occupied.get(id);
    if (seat) {
      if (actor.mode !== seat.mode || canonical(actor.attachment) !== canonical({trainId: seat.trainId,
        carId: seat.carId, entranceId: seat.entranceId})) throw Error('Retained actor and train occupancy disagree.');
    } else if (actor.mode !== 'on-foot' || actor.attachment !== null) throw Error('Unbound retained train occupancy.');
    return actor;
  }
  function notify() {
    let errors = 0;
    for (const listener of [...listeners]) try { listener(); } catch { errors++; }
    return errors;
  }
  function transaction(reason, changes) {
    if (!changes.length) return {ok: true};
    return verifyQuery(host.commit(plainData({reason, changes})), 'commit');
  }
  function revoke(train) {
    if (train.lease) closedLeases.add(train.lease.id);
    train.lease = null; train.controls = safeControls(); train.controlRevision = Math.min(1e9, train.controlRevision + 1);
  }
  function expected(actor, train) {
    return {actorRevision: actor.revision, occupancyRevision, controlRevision: train?.controlRevision ?? 0};
  }
  function landing(actor, entrance, train) {
    const result = verifyQuery(host.landing(plainData({actor, entrance, train})), 'landing');
    if (!result.ok) return result;
    fields(result.landing, ['position', 'floorId', 'surfaceId']);
    point(result.landing.position); identifier(result.landing.floorId); identifier(result.landing.surfaceId);
    if (Math.hypot(result.landing.position.x - entrance.position.x, result.landing.position.y - entrance.position.y) > 2.5 ||
        Math.abs(result.landing.position.h - entrance.position.h) > 2.5) throw Error('Host landing must be beside the selected entrance.');
    return result;
  }
  function eligibility(actor, entrance, train) {
    if (actor.mode !== 'on-foot') return refusal('ALREADY_ABOARD', 'Exit the occupied car first.');
    if (Math.abs(train.signedSpeedMps) > EPS) return refusal('TRAIN_MOVING', 'Wait for the train to stop before entering.');
    if (Math.hypot(actor.position.x - entrance.position.x, actor.position.y - entrance.position.y) > entrance.reachM ||
        Math.abs(actor.position.h - entrance.position.h) > 2.5) return refusal('OUT_OF_REACH', 'Walk to this car entrance.');
    if (actor.radiusM * 2 > entrance.widthM + EPS || actor.heightM > entrance.clearanceM + EPS) {
      return refusal('ENTRANCE_TOO_SMALL', 'This actor does not fit the native entrance. Choose compatible stock or actor dimensions.');
    }
    if (entrance.mode === 'driver' && train.driverId) return refusal('CAB_OCCUPIED', 'This consist already has a driver.');
    if ([...occupied.values()].some(seat => seat.carId === entrance.carId && seat.entranceId === entrance.id)) {
      return refusal('ENTRANCE_OCCUPIED', 'This entrance attachment is occupied. Choose another entrance.');
    }
    return verifyQuery(host.canEnter(plainData({actor, entrance, train})), 'canEnter');
  }
  function action(actor, entrance, type, check, train) {
    return {id: type === 'exit' ? 'exit' : 'enter/' + entrance.carId + '/' + entrance.id,
      label: type === 'exit' ? 'Exit train' : 'Enter ' + entrance.label,
      enabled: check.ok, code: check.ok ? null : check.code, reason: check.ok ? null : check.reason,
      command: {type, actorId: actor.id, trainId: entrance.trainId, carId: entrance.carId,
        entranceId: entrance.id, expected: expected(actor, train)}};
  }
  function readForActor(id) {
    assertLive();
    if (reading) throw Error('Host train queries must not re-enter actor reads.');
    reading = true;
    try {
    const actor = readActor(id), seat = occupied.get(id), train = seat ? trains.get(seat.trainId) : null;
    const actions = [];
    if (seat) {
      const entrance = entranceFor(seat);
      const check = Math.abs(train.signedSpeedMps) > EPS ? refusal('TRAIN_MOVING', 'Stop before leaving the train.') : landing(actor, entrance, train);
      actions.push(action(actor, entrance, 'exit', check, train));
    } else for (const entrance of currentEntrances()) {
      if (Math.hypot(actor.position.x - entrance.position.x, actor.position.y - entrance.position.y) <= 2.5) {
        actions.push(action(actor, entrance, 'enter', eligibility(actor, entrance, trains.get(entrance.trainId)), null));
      }
    }
    return plainData({actorId: id, mode: seat?.mode ?? 'on-foot', expected: expected(actor, train), position: actor.position,
      floorId: actor.floorId, walkingAllowed: !seat, trainId: seat?.trainId ?? null, carId: seat?.carId ?? null,
      entranceId: seat?.entranceId ?? null, cabFacing: seat?.mode === 'driver' ? entranceFor(seat).cabFacing : null,
      train: train ? trainSnapshot(train) : null, actions});
    } finally { reading = false; }
  }
  function trainSnapshot(train) {
    return {trainId: train.trainId, stock: train.stock, profile: train.profile, speedMps: Math.abs(train.signedSpeedMps),
      signedSpeedMps: train.signedSpeedMps, stopped: Math.abs(train.signedSpeedMps) <= EPS, driverId: train.driverId,
      controlRevision: train.controlRevision, controls: train.controls, hold: train.hold};
  }
  function applyCommand(command) {
    if (command.type === 'release') {
      fields(command, ['type', 'actorId', 'commandId', 'leaseId']); identifier(command.leaseId);
      const train = [...trains.values()].find(train => train.lease?.id === command.leaseId && train.lease.actorId === command.actorId);
      if (!train) return refusal('LEASE_CLOSED', 'That input lease no longer owns a cab.');
      revoke(train);
      return {ok: true};
    }
    const actor = readActor(command.actorId), seat = occupied.get(actor.id), train = trains.get(command.trainId);
    if (!train) return refusal('UNKNOWN_TRAIN', 'Choose a placed train.');
    fields(command.expected, ['actorRevision', 'occupancyRevision', 'controlRevision']);
    Object.values(command.expected).forEach(revision);
    if (command.expected.actorRevision !== actor.revision || command.expected.occupancyRevision !== occupancyRevision ||
        command.expected.controlRevision !== (seat ? train.controlRevision : 0)) return refusal('STALE_ACTION', 'Refresh this actor and train before acting.');
    if (actor.revision >= 1e9 || occupancyRevision >= 1e9 || train.controlRevision >= 1e9 - 1) return refusal('REVISION_LIMIT', 'Checkpoint and migrate this session deliberately.');
    if (command.type === 'drive') {
      fields(command, ['type', 'actorId', 'commandId', 'trainId', 'expected', 'leaseId', 'direction', 'power', 'brake']);
      identifier(command.leaseId); finite(command.power, 0, 1); finite(command.brake, 0, 1);
      if (!['forward', 'neutral', 'reverse'].includes(command.direction)) throw Error('Choose forward, neutral or reverse.');
      if (seat?.mode !== 'driver' || seat.trainId !== train.trainId || train.driverId !== actor.id) return refusal('NOT_DRIVER', 'Only the occupied cab driver can drive this consist.');
      if (closedLeases.has(command.leaseId)) return refusal('LEASE_CLOSED', 'Use a new input lease after release or restore.');
      if (train.lease && train.lease.id !== command.leaseId || [...trains.values()].some(other => other !== train && other.lease?.id === command.leaseId)) {
        return refusal('INPUT_OWNED', 'Another input source owns this cab. Release it first.');
      }
      const sign = (command.direction === 'forward' ? 1 : command.direction === 'reverse' ? -1 : 0) * entranceFor(seat).cabFacing;
      if (sign && train.signedSpeedMps * sign < -EPS) return refusal('STOP_BEFORE_REVERSE', 'Brake to a complete stop before changing direction.');
      if (!train.lease) train.lease = {id: command.leaseId, actorId: actor.id, trainId: train.trainId, carId: seat.carId};
      train.controls = {direction: command.direction, power: command.power, brake: command.brake, leaseId: command.leaseId};
      train.controlRevision++;
      return {ok: true};
    }
    fields(command, ['type', 'actorId', 'commandId', 'trainId', 'carId', 'entranceId', 'expected']);
    if (!['enter', 'exit'].includes(command.type)) throw Error('Unknown train command.');
    const entrance = entranceFor(command);
    if (!entrance) return refusal('UNKNOWN_ENTRANCE', 'Choose a named entrance on the selected car.');
    if (command.type === 'enter') {
      const check = eligibility(actor, entrance, train);
      if (!check.ok) return check;
      const attachment = {trainId: train.trainId, carId: entrance.carId, entranceId: entrance.id};
      const commit = transaction('enter', [{actorId: actor.id, expectedRevision: actor.revision, patch: {
        position: entrance.attachedPosition, floorId: entrance.carId, mode: entrance.mode, attachment
      }}]);
      if (!commit.ok) return commit;
      occupied.set(actor.id, {...attachment, mode: entrance.mode});
      if (entrance.mode === 'driver') train.driverId = actor.id;
    } else {
      if (!seat || seat.trainId !== command.trainId || seat.carId !== command.carId || seat.entranceId !== command.entranceId) {
        return refusal('NOT_ABOARD', 'This actor is not aboard that entrance.');
      }
      if (Math.abs(train.signedSpeedMps) > EPS) return refusal('TRAIN_MOVING', 'Stop before leaving the train.');
      const check = landing(actor, entrance, train);
      if (!check.ok) return check;
      const commit = transaction('exit', [{actorId: actor.id, expectedRevision: actor.revision, patch: {
        position: check.landing.position, floorId: check.landing.floorId, mode: 'on-foot', attachment: null
      }}]);
      if (!commit.ok) return commit;
      occupied.delete(actor.id);
      if (seat.mode === 'driver') { train.driverId = null; revoke(train); }
    }
    occupancyRevision++;
    return {ok: true};
  }
  function dispatch(input) {
    assertLive();
    let command;
    try { command = plainData(input); identifier(command.commandId); identifier(command.actorId); }
    catch (error) { return {ok: false, committed: false, code: 'INVALID_COMMAND', reason: error.message,
      commandId: '', repeated: false, observerErrors: 0}; }
    const fingerprint = canonical(command), old = receipts.get(command.commandId);
    if (old) return old.fingerprint === fingerprint ? {...old.result, repeated: true} : {
      ok: false, committed: false, code: 'COMMAND_ID_REUSED', reason: 'Use a new command ID for a different intent.',
      commandId: command.commandId, repeated: false, observerErrors: 0};
    if (busy || reading) return {ok: false, committed: false, code: 'SESSION_BUSY', reason: 'Wait for the active host transaction/query.', commandId: command.commandId, repeated: false, observerErrors: 0};
    // Keep the last two journal slots for exact-owner safety releases. Invalid
    // release attempts cannot consume this reserve or strand a held control.
    const safetyRelease = command.type === 'release' && [...trains.values()].some(train =>
      train.lease?.id === command.leaseId && train.lease.actorId === command.actorId);
    if (receipts.size >= JOURNAL_LIMIT || receipts.size >= JOURNAL_LIMIT - 2 && !safetyRelease || closedLeases.size >= LEASE_LIMIT) return {
      ok: false, committed: false, code: 'JOURNAL_LIMIT', reason: 'Checkpoint and migrate command receipts deliberately.',
      commandId: command.commandId, repeated: false, observerErrors: 0};
    busy = true;
    try {
      let outcome;
      try { outcome = applyCommand(command); }
      catch (error) { outcome = refusal('INVALID_COMMAND_OR_BINDING', error.message); }
      const result = {ok: outcome.ok, committed: outcome.ok, code: outcome.ok ? null : outcome.code,
        reason: outcome.ok ? null : outcome.reason, commandId: command.commandId, repeated: false, observerErrors: 0};
      receipts.set(command.commandId, {fingerprint, result});
      if (outcome.ok) result.observerErrors = notify();
      return {...result};
    } finally { busy = false; }
  }
  function advance(seconds) {
    assertLive(); finite(seconds, 0, 1);
    if (busy || reading) return refusal('SESSION_BUSY', 'Wait for the active host transaction/query.');
    busy = true;
    const before = traffic.checkpoint(), staged = plainData([...trains.entries()]);
    try {
      const next = new Map(staged), requests = [];
      for (const train of next.values()) {
        const limits = modelLimits(train.profile), {direction, power, brake} = train.controls;
        const seat = train.driverId ? occupied.get(train.driverId) : null;
        if (seat) readActor(train.driverId);
        const sign = seat ? (direction === 'forward' ? 1 : direction === 'reverse' ? -1 : 0) * entranceFor(seat).cabFacing : 0;
        const oldSpeed = train.signedSpeedMps, magnitude = Math.abs(oldSpeed), effectiveBrake = seat ? brake : 1;
        const traction = sign && train.lease ? power * limits.acceleration : 0;
        const acceleration = traction - effectiveBrake * limits.brake - (magnitude || traction ? limits.coast : 0);
        const speed = Math.max(0, Math.min(limits.max, magnitude + acceleration * seconds));
        train.signedSpeedMps = (Math.sign(oldSpeed) || sign) * speed;
        const travel = acceleration < 0 && magnitude + acceleration * seconds < 0
          ? magnitude * magnitude / (-2 * acceleration) : (magnitude + speed) / 2 * seconds;
        requests.push({stock: train.stock, distanceM: (Math.sign(oldSpeed) || sign) * travel});
        train.hold = null;
      }
      const movement = traffic.advanceSigned(requests);
      for (const train of next.values()) {
        const request = requests.find(request => request.stock === train.stock), state = movement.snapshot.trains.find(item => item.stock === train.stock);
        if (Math.abs(movement.moved[train.stock]) + EPS < Math.abs(request.distanceM)) {
          train.signedSpeedMps = 0;
          const kind = state.waiting?.kind ?? 'end';
          train.hold = {kind, reason: reasonForHold(kind), ...(state.waiting?.signalId ? {signalId: state.waiting.signalId} : {})};
        }
      }
      const entrances = movement.snapshot.trains.flatMap(({state}) => railwayEntrancesForTrain(state));
      const changes = [];
      for (const [id, seat] of occupied) {
        const actor = readActor(id), entrance = entrances.find(entrance => entrance.carId === seat.carId && entrance.id === seat.entranceId);
        if (actor.revision >= 1e9 && !samePoint(actor.position, entrance.attachedPosition)) {
          traffic.restore(before); return refusal('REVISION_LIMIT', 'Checkpoint and migrate the retained actor deliberately.');
        }
        if (!samePoint(actor.position, entrance.attachedPosition)) changes.push({actorId: id, expectedRevision: actor.revision,
          patch: {position: entrance.attachedPosition, floorId: seat.carId, mode: seat.mode,
            attachment: {trainId: seat.trainId, carId: seat.carId, entranceId: seat.entranceId}}});
      }
      const commit = transaction('advance', changes);
      if (!commit.ok) { traffic.restore(before); return commit; }
      trains = next;
      return {ok: true, observerErrors: notify()};
    } catch (error) { traffic.restore(before); return refusal('HOST_ADVANCE_FAILED', error.message); }
    finally { busy = false; }
  }
  function save() {
    assertLive();
    return plainData({kind: 'nautilus-train-checkpoint', version: 1, profile: TRAIN_SESSION_CONTRACT.profile,
      content, occupancyRevision, traffic: traffic.checkpoint(), occupied: [...occupied.entries()], trains: [...trains.entries()],
      receipts: [...receipts.entries()], closedLeases: [...closedLeases]});
  }
  if (checkpoint !== undefined) {
    const saved = plainData(typeof checkpoint === 'string' ? JSON.parse(checkpoint) : checkpoint);
    fields(saved, ['kind', 'version', 'profile', 'content', 'occupancyRevision', 'traffic', 'occupied', 'trains', 'receipts', 'closedLeases']);
    if (saved.kind !== 'nautilus-train-checkpoint' || saved.version !== 1 || saved.profile !== TRAIN_SESSION_CONTRACT.profile || saved.content !== content) {
      throw Error('Incompatible train checkpoint or authored railway content.');
    }
    revision(saved.occupancyRevision);
    if (!Array.isArray(saved.occupied) || saved.occupied.length > actorIds.length || !Array.isArray(saved.trains) || saved.trains.length !== trains.size ||
        !Array.isArray(saved.receipts) || saved.receipts.length > JOURNAL_LIMIT || !Array.isArray(saved.closedLeases) || saved.closedLeases.length > LEASE_LIMIT - trains.size) {
      throw Error('Invalid bounded train checkpoint collections.');
    }
    const pairs = records => {
      if (records.some(record => !Array.isArray(record) || record.length !== 2) || new Set(records.map(record => record[0])).size !== records.length) throw Error('Duplicate train checkpoint keys.');
      return new Map(records);
    };
    const stagedTrains = pairs(saved.trains), stagedOccupied = pairs(saved.occupied), stagedReceipts = pairs(saved.receipts);
    closedLeases = new Set(saved.closedLeases);
    if (closedLeases.size !== saved.closedLeases.length) throw Error('Duplicate closed train leases.');
    closedLeases.forEach(identifier);
    traffic.restore(saved.traffic);
    for (const [id, train] of stagedTrains) {
      const original = trains.get(id);
      fields(train, ['trainId', 'stock', 'profile', 'signedSpeedMps', 'controlRevision', 'controls', 'lease', 'driverId', 'hold']);
      if (!original || train.trainId !== id || train.stock !== original.stock || train.profile !== original.profile) throw Error('Saved train identity mismatch.');
      finite(train.signedSpeedMps, -modelLimits(train.profile).max, modelLimits(train.profile).max); revision(train.controlRevision);
      fields(train.controls, ['direction', 'power', 'brake', 'leaseId']);
      finite(train.controls.power, 0, 1); finite(train.controls.brake, 0, 1);
      if (!['forward', 'neutral', 'reverse'].includes(train.controls.direction)) throw Error('Invalid saved train direction.');
      if (train.lease) {
        fields(train.lease, ['id', 'actorId', 'trainId', 'carId']); identifier(train.lease.id);
        const seat = stagedOccupied.get(train.driverId);
        if (closedLeases.has(train.lease.id) || train.lease.actorId !== train.driverId || train.lease.trainId !== id || train.controls.leaseId !== train.lease.id ||
            seat?.mode !== 'driver' || seat.trainId !== id || seat.carId !== train.lease.carId) throw Error('Invalid saved input lease owner.');
      } else if (train.controls.leaseId !== null) throw Error('Saved input lease is missing.');
      if (train.hold !== null) {
        fields(train.hold, ['kind', 'reason', 'signalId'], ['kind', 'reason']);
        if (!reasonForHold(train.hold.kind) || typeof train.hold.reason !== 'string') throw Error('Invalid saved train hold.');
        if (train.hold.signalId !== undefined) identifier(train.hold.signalId);
      }
      if (train.driverId !== null) identifier(train.driverId);
      revoke(train); train.hold = null;
    }
    const seats = new Set();
    occupied = stagedOccupied; trains = stagedTrains; occupancyRevision = saved.occupancyRevision;
    for (const [id, seat] of occupied) {
      fields(seat, ['trainId', 'carId', 'entranceId', 'mode']);
      const entrance = entranceFor(seat), actor = readActor(id), seatKey = seat.carId + '/' + seat.entranceId;
      if (!entrance || entrance.mode !== seat.mode || seats.has(seatKey) || !samePoint(actor.position, entrance.attachedPosition) || actor.floorId !== seat.carId ||
          seat.mode === 'driver' && trains.get(seat.trainId).driverId !== id) throw Error('Saved actor attachment does not match the actual car.');
      seats.add(seatKey);
    }
    for (const train of trains.values()) if (train.driverId && (occupied.get(train.driverId)?.trainId !== train.trainId || occupied.get(train.driverId)?.mode !== 'driver')) throw Error('Saved driver has no cab occupancy.');
    for (const [id, receipt] of stagedReceipts) {
      identifier(id); fields(receipt, ['fingerprint', 'result']);
      fields(receipt.result, ['ok', 'committed', 'code', 'reason', 'commandId', 'repeated', 'observerErrors']);
      if (typeof receipt.fingerprint !== 'string' || receipt.result.commandId !== id || typeof receipt.result.ok !== 'boolean' || receipt.result.committed !== receipt.result.ok || receipt.result.repeated !== false ||
          !Number.isInteger(receipt.result.observerErrors) || receipt.result.observerErrors < 0 || receipt.result.ok && (receipt.result.code !== null || receipt.result.reason !== null) ||
          !receipt.result.ok && (typeof receipt.result.code !== 'string' || typeof receipt.result.reason !== 'string')) throw Error('Invalid saved command receipt.');
      const command = plainData(JSON.parse(receipt.fingerprint));
      if (command.commandId !== id || canonical(command) !== receipt.fingerprint) throw Error('Invalid saved command fingerprint.');
    }
    receipts = stagedReceipts;
  }
  actorIds.forEach(readActor);
  return Object.freeze({contract: TRAIN_SESSION_CONTRACT, readForActor, dispatch, advance, checkpoint: save,
    read() { assertLive(); return plainData({...traffic.read(), controls: [...trains.values()].map(trainSnapshot)}); },
    subscribe(listener) { assertLive(); if (typeof listener !== 'function') throw Error('Supply a train listener.'); listeners.add(listener); return () => listeners.delete(listener); },
    setTurnout(routeId, setting) {
      assertLive(); if (busy || reading) return refusal('SESSION_BUSY', 'Wait for the active host transaction/query.');
      busy = true;
      try { const result = traffic.setTurnout(routeId, setting); if (result.ok) result.observerErrors = notify(); return result; }
      finally { busy = false; }
    },
    dispose() { if (disposed) return; if (busy || reading) throw Error('Retire the train session after the active transaction/query.');
      for (const train of trains.values()) revoke(train); disposed = true; listeners.clear(); }
  });
}
