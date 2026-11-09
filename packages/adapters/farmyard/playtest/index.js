import {FarmyardPlaytestError, preflightFarmyardPlaytest} from './profile.js';

export {FARMYARD_PLAYTEST_PROFILE, FarmyardPlaytestError, preflightFarmyardPlaytest} from './profile.js';

const refusal = (code, message, options) => new FarmyardPlaytestError(code, '/open', message, options);

// The factory stages a ready host. The connection owns that host's lifetime
// after it returns, and the host owns gameplay and save state.
export function createFarmyardPlaytestConnector({prepareHost} = {}) {
  if (typeof prepareHost !== 'function') throw new TypeError('Bind a Farmyard prepareHost function.');
  const claimedHosts = new WeakSet();
  const openings = new Set();
  let active = null;
  let pending = null;
  let shutdown = null;

  function stop(request, error) {
    if (!request) return;
    request.error = error;
    request.controller.abort(error.code);
  }

  async function retire(candidate) {
    if (!candidate) return null;
    try {
      await candidate.close();
      return null;
    } catch (cause) {
      return refusal('HOST_DISPOSAL_FAILED', 'The Farmyard host could not be retired.', {cause});
    }
  }

  function claim(host) {
    if (!host || typeof host !== 'object') throw refusal('INVALID_HOST', 'The factory must return a disposable Farmyard host.');
    if (claimedHosts.has(host)) throw refusal('HOST_REUSED', 'Prepare a fresh Farmyard host for each open.');
    const close = host.dispose;
    if (typeof close !== 'function') throw refusal('INVALID_HOST', 'The prepared Farmyard host needs a dispose method.');
    claimedHosts.add(host);
    return {host, close: () => Reflect.apply(close, host, [])};
  }

  function requirePending(request) {
    if (request.error) throw request.error;
    if (pending !== request) throw refusal('STALE_OPEN', 'A newer Farmyard open superseded this request.');
  }

  async function stage(request, source) {
    let candidate;
    let previous;
    let session;
    try {
      requirePending(request);
      const host = await prepareHost({authoredMap: source.authoredMap, signal: request.controller.signal});
      candidate = claim(host);
      requirePending(request);
      session = Object.freeze({host, sourceJSON: source.sourceJSON, markers: source.markers});
      previous = active;
      active = {session, close: candidate.close};
      pending = null;
    } catch (cause) {
      if (pending === request) pending = null;
      const error = request.error ?? (cause instanceof FarmyardPlaytestError ? cause :
        refusal('HOST_PREPARE_FAILED', 'The Farmyard host could not be prepared.', {cause}));
      const cleanupError = await retire(candidate);
      if (cleanupError) throw new FarmyardPlaytestError(error.code, error.path, error.message, {cause: error, cleanupError});
      throw error;
    }
    return Object.freeze({session, cleanupError: await retire(previous)});
  }

  return Object.freeze({
    features: Object.freeze([]),
    get activeSession() { return active?.session ?? null; },
    async openMap(handoff) {
      if (shutdown) throw refusal('DISPOSED', 'The Farmyard connection is closed.');
      const source = preflightFarmyardPlaytest(handoff);
      if (shutdown) throw refusal('DISPOSED', 'The Farmyard connection is closed.');
      const previous = pending;
      const request = {controller: new AbortController(), error: null};
      pending = request;
      const opening = Promise.resolve().then(() => stage(request, source));
      openings.add(opening);
      opening.then(() => openings.delete(opening), () => openings.delete(opening));
      stop(previous, refusal('STALE_OPEN', 'A newer Farmyard open superseded this request.'));
      return opening;
    },
    cancelOpen() {
      if (!pending) return false;
      const request = pending;
      pending = null;
      stop(request, refusal('CANCELLED', 'The Farmyard open was cancelled.'));
      return true;
    },
    dispose() {
      if (shutdown) return shutdown;
      const request = pending;
      const previous = active;
      pending = null;
      active = null;
      const outstanding = [...openings];
      shutdown = Promise.resolve().then(async () => {
        const [cleanupError] = await Promise.all([retire(previous), Promise.allSettled(outstanding)]);
        return cleanupError;
      });
      stop(request, refusal('DISPOSED', 'The Farmyard connection is closed.'));
      return shutdown;
    }
  });
}
