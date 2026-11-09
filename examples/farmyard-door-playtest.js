import {
  createFarmyardPlaytestConnector, FarmyardPlaytestError
} from '../packages/adapters/farmyard/playtest/index.js';

// Optional binding for an embedding application that supplies its own Farmyard host.
export function bindFarmyardDoorPlaytest(workshop, prepareHost) {
  const connector = createFarmyardPlaytestConnector({prepareHost});
  const events = new EventTarget();
  const disconnect = workshop.connectGame({
    features: connector.features,
    async openMap(handoff) {
      let result;
      try {
        result = await connector.openMap(handoff);
      } catch (error) {
        if (error.code !== 'UNBOUND_FOLIAGE') throw error;
        throw new FarmyardPlaytestError(error.code, error.path,
          error.message + ' Clear the painted foliage in the Workshop and send again.',
          {cause: error, details: error.details, cleanupError: error.cleanupError});
      }
      events.dispatchEvent(new CustomEvent('open', {detail: result}));
      return result;
    }
  });
  return Object.freeze({
    events,
    get activeSession() { return connector.activeSession; },
    dispose() {
      disconnect();
      return connector.dispose();
    }
  });
}
