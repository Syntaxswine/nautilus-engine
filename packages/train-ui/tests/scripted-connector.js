import {trainConnectorFixture} from '../../train-core/connector-fixture.js';

// Browser-test protocol double only. Declarative replies/echoes exercise DOM
// ownership. No train physics, reach, boarding/occupancy validation or saves.
// The visible demo never imports this module and always uses FIXTURE_ONLY.
export function scriptedConnector(mode = 'driver') {
  const fixture = trainConnectorFixture(mode), commands = [], replies = [], listeners = new Set();
  let current = fixture.readForActor('player'), reads = 0, subscriptions = 0, defaultEcho = true;const actors = new Map([[current.actorId, current]]);
  function publish(snapshot) { current = structuredClone(snapshot);actors.set(current.actorId, current);for (const listener of [...listeners]) listener(); }
  const session = Object.freeze({contract: fixture.contract,
    readForActor(id) { reads++;if (!actors.has(id)) throw Error('Unknown scripted actor');return structuredClone(actors.get(id)); },
    subscribe(listener) { subscriptions++;listeners.add(listener);return () => listeners.delete(listener); },
    dispatch(command) {
      commands.push(structuredClone(command));const reply = replies.shift() || {};
      const committed = reply.committed ?? true;
      let next = reply.snapshot;
      if (!next && committed && defaultEcho && current.mode === 'driver' && ['drive', 'release'].includes(command.type)) {
        next = structuredClone(current);next.expected.controlRevision++;next.train.controlRevision++;
        next.train.controls = command.type === 'drive' ? {direction: command.direction, power: command.power, brake: command.brake, leaseId: command.leaseId} : {direction: 'neutral', power: 0, brake: 1, leaseId: null};
      }
      if (next) publish(next);
      return {ok: committed, committed, code: committed ? null : reply.code || 'TEST_REFUSAL', reason: reply.reason || null, commandId: command.commandId, repeated: false, observerErrors: reply.observerErrors || 0};
    }
  });
  return {session, commands, publish, replies, addActor(snapshot) { actors.set(snapshot.actorId, structuredClone(snapshot)); },
    fixture(mode) { return trainConnectorFixture(mode).readForActor('player'); },
    setEcho(value) { defaultEcho = value; },
    get snapshot() { return structuredClone(current); },get reads() { return reads; },get subscribers() { return listeners.size; },get subscriptions() { return subscriptions; }
  };
}
