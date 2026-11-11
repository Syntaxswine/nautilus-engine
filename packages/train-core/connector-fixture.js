import {TRAIN_SESSION_CONTRACT} from './contract.js';

// A fixed UI contract fixture, deliberately not a second train simulation.
// Runtime behavior and retained-host geometry are supplied by index.js.
export function trainConnectorFixture(mode = 'on-foot') {
  if (!['on-foot', 'driver', 'rider'].includes(mode)) throw Error('Choose a supported fixture mode.');
  const expected = {actorRevision: 0, occupancyRevision: 0, controlRevision: 0};
  const trainId = 'train/steam', carId = trainId + (mode === 'rider' ? '/car/2' : '/car/0');
  const entranceId = 'cab-left';
  const snapshot = {
    actorId: 'player', mode, expected, position: {x: 20, y: 20, h: 0}, floorId: 'yard',
    walkingAllowed: mode === 'on-foot', trainId: mode === 'on-foot' ? null : trainId,
    carId: mode === 'on-foot' ? null : carId, entranceId: mode === 'on-foot' ? null : entranceId,
    cabFacing: mode === 'driver' ? 1 : null,
    train: mode === 'on-foot' ? null : {trainId, stock: 'steam', profile: 'world', speedMps: 0,
      signedSpeedMps: 0, stopped: true, driverId: mode === 'driver' ? 'player' : null,
      controlRevision: 0, controls: {direction: 'neutral', power: 0, brake: 1, leaseId: null}, hold: null},
    actions: [{id: mode === 'on-foot' ? 'enter/' + carId + '/' + entranceId : 'exit',
      label: mode === 'on-foot' ? 'Enter steam cab' : 'Exit train', enabled: true, code: null, reason: null,
      command: {type: mode === 'on-foot' ? 'enter' : 'exit', actorId: 'player', trainId, carId, entranceId, expected}}]
  };
  return Object.freeze({contract: TRAIN_SESSION_CONTRACT,
    readForActor(actorId) { if (actorId !== 'player') throw Error('Unknown fixture actor.'); return structuredClone(snapshot); },
    subscribe(listener) { if (typeof listener !== 'function') throw Error('Supply a listener.'); return () => {}; },
    dispatch(command) { return {ok: false, committed: false, code: 'FIXTURE_ONLY',
      reason: 'Bind the live retained-host session to commit this action.', commandId: command.commandId,
      repeated: false, observerErrors: 0}; }
  });
}
