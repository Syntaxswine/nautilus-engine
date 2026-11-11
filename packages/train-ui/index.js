import {TRAIN_SESSION_CONTRACT} from '../train-core/contract.js';
import {VIEW_HTML} from './view.js';
import {createTrainFeedback} from './feedback.js';

const failure = message => new TypeError(message);
const sameContract = value => value?.id === TRAIN_SESSION_CONTRACT.id && value?.version === 1 && value?.profile === TRAIN_SESSION_CONTRACT.profile;
const keyOf = s => JSON.stringify([s.actorId, s.mode, s.trainId, s.carId, s.entranceId, s.cabFacing, s.expected.occupancyRevision]);
const clone = value => structuredClone(value);
const clamp = value => Math.max(0, Math.min(1, value));

/** Candidate DOM client for frozen connector32cce61. It owns no train clock,
 * occupancy, permission, walking implementation, renderer or persistence. */
export function mountTrainControls(container, {
  session, actorId, walkingElement, setWalkingEnabled, focusWalking = () => walkingElement.focus(),
  newId = kind => `train-ui/${kind}/${globalThis.crypto.randomUUID()}`,
  initialPower = .35, muted = false, onError = () => {}
} = {}) {
  const doc = container?.ownerDocument, win = doc?.defaultView;
  if (!doc || !sameContract(session?.contract) || typeof session?.readForActor !== 'function' || typeof session?.dispatch !== 'function' || typeof session?.subscribe !== 'function') throw failure('Bind the version1 train connector and an owned HUD slot.');
  if (typeof actorId !== 'string' || !actorId || !walkingElement || walkingElement.parentNode !== container || typeof setWalkingEnabled !== 'function' || typeof focusWalking !== 'function' || typeof newId !== 'function' || typeof muted !== 'boolean' || !Number.isFinite(initialPower) || initialPower < 0 || initialPower > 1) throw failure('Supply one actor, the borrowed walking element/input callback, and valid UI options.');
  const element = doc.createElement('div');
  element.className = 'nautilus-train-controls';
  element.innerHTML = VIEW_HTML;
  const part = name => element.querySelector(`[data-part="${name}"]`);
  const panel = part('driver'), rider = part('rider'), entry = part('entry'), actions = part('entry-actions'), power = part('power'), status = part('request-status'), lever = part('direction-lever');
  const feedback = createTrainFeedback(win, {muted});
  const prefix = newId('mount');power.id = prefix + '/power';element.querySelector('[data-power-label]').htmlFor = power.id;
  container.append(element);
  const events = new win.AbortController(), actionEntries = new WeakMap(), listen = (target, type, fn, options = {}) => target.addEventListener(type, fn, {...options, signal: events.signal});
  let currentActor = actorId, snapshot = null, context = null, selectedDirection = 'neutral', presetPower = initialPower;
  let disposed = false, blocked = false, fault = false, refreshing = false, refreshAgain = false, dispatching = false;
  let lease = null, activePointer = null, activeKey = null, leverDrag = null, walkingSent = null, unsubscribe = () => {}, message = '', messageKind = 'ready', lastResult = null;

  function report(error, phase) { try { onError(error, {phase}); } catch {} }
  function inputBlocked() { return disposed || blocked || fault || doc.visibilityState === 'hidden' || [...doc.querySelectorAll('dialog[open], [aria-modal="true"]')].some(node => !node.hidden && node.getClientRects().length > 0); }
  function tell(text, kind = 'ready') { message = text;messageKind = kind;status.textContent = text;status.dataset.state = kind; }
  function resultMessage(result) {
    if (result?.committed === true) return result.observerErrors ? 'Accepted; view needs refresh.' : '';
    if (result?.code === 'FIXTURE_ONLY') return 'Preview only — train actions are not connected yet.';
    return result?.reason || result?.code || 'The train refused this request.';
  }
  function send(command, quiet = false) {
    if (disposed && command.type !== 'release') return null;
    if (dispatching) { tell('Wait for the current request to finish.', 'refused');return null; }
    dispatching = true;const before = snapshot;let result, acknowledged = false;
    try {
      result = session.dispatch(command);
      if (!result || typeof result.committed !== 'boolean' || result.commandId !== command.commandId) throw failure('The connector must return its synchronous command result.');
      acknowledged = true;
      if (!quiet) { lastResult = clone(result);tell(resultMessage(result), result.committed ? 'ready' : 'refused'); }
      return result;
    } catch (error) { fault = true;tell('Train connection unavailable. Input released.', 'refused');report(error, 'dispatch');return null; }
    finally { dispatching = false;if (!disposed) { refresh();if (!quiet && acknowledged && !fault) feedback.committed(command, result, before, snapshot); } }
  }
  function cancelLever(restore = true) {
    const prior = leverDrag;leverDrag = null;
    if (!prior) return false;
    if (restore && prior.context === context) selectedDirection = prior.initial;
    try { lever.releasePointerCapture(prior.id); } catch {}
    return true;
  }
  function releaseInput(reason = 'released') {
    const leverCancelled = cancelLever();feedback.cancelInput();
    const prior = lease, pointer = activePointer;
    lease = null;activePointer = null;activeKey = null;
    if (pointer) try { pointer.node.releasePointerCapture(pointer.id); } catch {}
    if (!prior) { if (leverCancelled) render();return false; }
    // The original actor and exclusive lease are retained. Never refresh these
    // identities to a new actor/cab or attach current expected revisions.
    const command = {type: 'release', actorId: prior.actorId, commandId: newId('release'), leaseId: prior.id};
    if (dispatching) {
      // Post-commit invalidation can change occupancy inside dispatch. Flush its
      // release when the outer synchronous command returns, before another input.
      deferredRelease.push(command);
    } else send(command, true);
    element.dataset.releaseReason = reason;
    render();return true;
  }
  const deferredRelease = [];
  function flushReleases() { while (!dispatching && deferredRelease.length) send(deferredRelease.shift(), true); }
  function setWalking(enabled) {
    walkingElement.hidden = !enabled;walkingElement.inert = !enabled;
    if (walkingSent === enabled) return;
    walkingSent = enabled;
    try { setWalkingEnabled(enabled); } catch (error) { fault = true;walkingElement.hidden = true;walkingElement.inert = true;report(error, 'walking-input'); }
  }
  function renderActions(target, list, unavailable) {
    const key = JSON.stringify([unavailable, list, context]);
    if (target.dataset.renderKey === key) return;
    target.dataset.renderKey = key;target.replaceChildren();
    for (const action of list) {
      const button = doc.createElement('button');button.type = 'button';button.textContent = action.label;button.disabled = unavailable || !action.enabled;
      button.dataset.actionId = action.id;button.dataset.trainAction = action.command.type;button.title = action.reason || '';
      const displayed = clone(action.command), stamp = context;
      actionEntries.set(button, {displayed, stamp});target.append(button);
      if (!action.enabled && action.reason) { const reason = doc.createElement('p');reason.className = 'action-reason';reason.textContent = action.reason;target.append(reason); }
    }
  }
  function render() {
    if (!snapshot || disposed) return;
    const driver = snapshot.mode === 'driver', riding = snapshot.mode === 'rider', unavailable = inputBlocked();
    const stock = snapshot.train?.stock || 'none';element.dataset.stock = stock;
    panel.hidden = !driver;rider.hidden = !riding;panel.setAttribute('aria-disabled', String(unavailable));
    lever.hidden = !driver || stock !== 'steam';lever.tabIndex = unavailable ? -1 : 0;
    lever.setAttribute('aria-disabled', String(unavailable));lever.setAttribute('aria-valuenow', String({reverse: -1, neutral: 0, forward: 1}[selectedDirection]));lever.setAttribute('aria-valuetext', selectedDirection);
    element.style.setProperty('--lever-step', String({forward: 0, neutral: 1, reverse: 2}[selectedDirection]));
    element.style.setProperty('--chain-pull', `${lease?.kind === 'brake' ? Math.max(12, activePointer?.pull || 0) : 0}px`);
    part('direction-label').textContent = stock === 'steam' ? 'Reverser' : 'Direction';
    part('brake').setAttribute('aria-label', stock === 'steam' ? 'Pull brake chain (B)' : 'Apply brake (B)');
    part('brake').setAttribute('aria-pressed', String(lease?.kind === 'brake'));
    part('brake-caption').textContent = stock === 'steam' ? 'Pull to brake' : 'Brake';
    part('power-caption').textContent = stock === 'steam' ? 'Hold regulator' : 'Hold power';
    for (const button of element.querySelectorAll('[data-audio-toggle]')) { button.setAttribute('aria-pressed', String(feedback.state.muted));button.setAttribute('aria-label', feedback.state.muted ? 'Unmute train sounds' : 'Mute train sounds');button.dataset.muted = String(feedback.state.muted); }
    // The callback must clear held walking keys when disabled. Hidden controls
    // alone do not retire the game's movement input.
    setWalking(snapshot.mode === 'on-foot' && snapshot.walkingAllowed && !unavailable);
    entry.hidden = snapshot.mode !== 'on-foot' || !snapshot.actions.some(a => a.command.type === 'enter');
    renderActions(actions, snapshot.actions.filter(a => a.command.type === 'enter'), unavailable);
    const exits = snapshot.actions.filter(a => a.command.type === 'exit');
    renderActions(part('exit-actions'), exits, unavailable);renderActions(part('rider-exit-actions'), exits, unavailable);
    part('rider-reason').textContent = 'Leave through an eligible coach entrance.';
    if (snapshot.train) {
      const train = snapshot.train, speedKph = Math.abs(train.speedMps) * 3.6;
      part('cab-title').textContent = train.stock === 'electric' ? 'Commuter cab' : 'Steam locomotive';
      part('cab-facing').textContent = snapshot.cabFacing === -1 ? 'Rear-facing cab' : 'Forward-facing cab';
      part('speed').textContent = speedKph.toFixed(1);
      part('speed-needle').setAttribute('transform', `rotate(${Math.min(1, speedKph / 40) * 270} 65 64)`);
      const relativeSpeed = train.signedSpeedMps * (snapshot.cabFacing || 1);
      part('confirmed-direction').textContent = train.stopped ? 'Stopped' : relativeSpeed < 0 ? 'Moving reverse' : 'Moving forward';
      part('confirmed-power').textContent = `${Math.round(train.controls.power * 100)}% applied · ${train.controls.direction}`;
      part('brake-state').textContent = train.controls.brake > 0 ? `${Math.round(train.controls.brake * 100)}% applied` : 'Released';
      part('signal-line').hidden = !train.hold;part('signal-reason').textContent = train.hold?.reason || '';
      part('rider-train').textContent = `${train.stock === 'steam' ? 'Steam' : 'Electric'} train · ${speedKph.toFixed(1)} km/h`;
      const lamps = {traction: train.controls.power > 0 && train.controls.brake === 0 && !train.hold, aboard: snapshot.mode !== 'on-foot', brake: train.controls.brake > 0};
      for (const lamp of element.querySelectorAll('[data-lamp]')) { const on = lamps[lamp.dataset.lamp];lamp.dataset.on = String(on);lamp.setAttribute('aria-label', `${lamp.dataset.lamp === 'aboard' ? 'Occupancy confirmed' : lamp.dataset.lamp === 'traction' ? 'Confirmed traction' : 'Confirmed brake'}: ${on ? 'on' : 'off'}`); }
    }
    power.value = String(Math.round(presetPower * 100));part('power-request').textContent = `${Math.round(presetPower * 100)}%`;
    for (const button of element.querySelectorAll('[data-direction]')) { button.setAttribute('aria-pressed', String(button.dataset.direction === selectedDirection));button.disabled = unavailable; }
    for (const name of ['power', 'less-power', 'more-power', 'power-hold', 'brake']) part(name).disabled = unavailable;
    part('power-hold').setAttribute('aria-pressed', String(!!lease && lease.kind === 'power'));
    status.textContent = message;status.dataset.state = messageKind;
    part('rider-status').textContent = message;
  }
  function refresh() {
    if (disposed) return;
    if (refreshing) { refreshAgain = true;return; }
    refreshing = true;
    try {
      let rounds = 0;
      do {
        refreshAgain = false;if (++rounds > 8) throw failure('Too many reentrant train updates.');
        const next = session.readForActor(currentActor);
        if (next?.actorId !== currentActor || !['on-foot', 'driver', 'rider'].includes(next.mode) || !next.expected || !Array.isArray(next.actions)) throw failure('A complete current actor snapshot is required.');
        const nextKey = keyOf(next), changed = context !== null && nextKey !== context, wasOccupied = snapshot && snapshot.mode !== 'on-foot';
        if (changed) { releaseInput('actor-or-cab-change');selectedDirection = next.train?.controls.direction || 'neutral';message = ''; }
        else if (lease?.accepted && next.train?.controls.leaseId !== lease.id) releaseInput('lease-revoked');
        if (leverDrag && next.train?.stock !== 'steam') cancelLever();
        snapshot = next;context = nextKey;feedback.observe(next);
        if (context === nextKey && !changed && !message && next.mode === 'driver') selectedDirection = next.train?.controls.direction || 'neutral';
        render();
        if (changed && wasOccupied && next.mode === 'on-foot' && next.walkingAllowed && !inputBlocked()) focusWalking();
      } while (refreshAgain);
    } catch (error) { fault = true;releaseInput('connection-error');setWalking(false);for (const node of element.querySelectorAll('button,input')) node.disabled = true;lever.setAttribute('aria-disabled', 'true');lever.tabIndex = -1;panel.setAttribute('aria-disabled', 'true');tell('Train connection unavailable. Reconnect before using controls.', 'refused');report(error, 'read'); }
    finally { refreshing = false;flushReleases(); }
  }
  function performAction(command, stamp = context) {
    if (inputBlocked() || stamp !== context || dispatching) return false;
    const id = newId(command.type);if (stamp !== context || disposed) return false;
    const result = send({...clone(command), commandId: id});flushReleases();return result?.committed === true;
  }
  function drive() {
    const held = lease;if (!held || inputBlocked()) return;
    refresh();
    if (lease !== held || snapshot?.mode !== 'driver' || keyOf(snapshot) !== held.context) { releaseInput('stale-input');return; }
    const id = newId('drive');if (lease !== held || disposed || keyOf(snapshot) !== held.context) return;
    const brake = held.kind === 'brake' ? 1 : 0;
    const result = send({type: 'drive', actorId: held.actorId, commandId: id, trainId: held.trainId,
      expected: clone(snapshot.expected), leaseId: held.id, direction: brake ? 'neutral' : selectedDirection,
      power: brake || selectedDirection === 'neutral' ? 0 : presetPower, brake});
    flushReleases();
    if (result?.committed && lease === held) held.accepted = true;
    if (!result?.committed && lease === held) {
      const refused = message;releaseInput('drive-refused');tell(refused, 'refused');
    }
  }
  function begin(kind) {
    if (inputBlocked() || snapshot?.mode !== 'driver' || dispatching) return false;
    if (lease && kind === 'brake') releaseInput('brake-priority');
    if (lease) return false;
    const stamp = context, id = newId('lease');if (stamp !== context || disposed) return false;
    lease = {id, actorId: snapshot.actorId, trainId: snapshot.trainId, context: stamp, kind, accepted: false};drive();render();return lease !== null;
  }
  function chooseDirection(direction) { if (inputBlocked() || snapshot?.mode !== 'driver' || direction === selectedDirection) return;selectedDirection = direction;tell(`${direction[0].toUpperCase() + direction.slice(1)} selected.`);if (lease) drive();render(); }
  function choosePower(value) { if (inputBlocked() || snapshot?.mode !== 'driver') return;const next = clamp(value);if (next === presetPower) return;presetPower = next;if (lease?.kind === 'power') drive();render(); }
  function gesture(node, kind) {
    listen(node, 'pointerdown', event => {
      if (event.button !== 0) return;
      feedback.unlock(event);
      if (activePointer && (kind === 'brake' || activePointer.id === event.pointerId && event.pointerType !== 'touch')) releaseInput('fresh-pointer');
      if (activePointer || !begin(kind)) return;
      activePointer = {id: event.pointerId, node, startY: event.clientY, pull: kind === 'brake' ? 12 : 0};try { node.setPointerCapture(event.pointerId); } catch {}
      if (node.tagName === 'BUTTON') event.preventDefault();
    });
    listen(node, 'lostpointercapture', event => { if (activePointer?.id === event.pointerId) releaseInput('lost-pointer-capture'); });
    // Keyboard/assistive click is one safe pulse. Holding Space/Enter on this
    // focused button uses the explicit keydown/up owner below.
    listen(node, 'click', event => { if (event.detail === 0 && !activeKey && !activePointer) { feedback.unlock(event);if (begin(kind)) releaseInput('activation-ended'); } });
  }
  function moveLever(event) {
    if (!leverDrag || leverDrag.id !== event.pointerId || leverDrag.context !== context) return;
    const position = (event.clientY - leverDrag.rect.top) / leverDrag.rect.height;
    chooseDirection(position < 1 / 3 ? 'forward' : position > 2 / 3 ? 'reverse' : 'neutral');
  }
  listen(lever, 'pointerdown', event => {
    if (event.button !== 0 || inputBlocked() || snapshot?.mode !== 'driver' || snapshot.train?.stock !== 'steam') return;
    feedback.unlock(event);if (activePointer?.id === event.pointerId) releaseInput('direction-gesture');cancelLever();
    leverDrag = {id: event.pointerId, context, initial: selectedDirection, rect: lever.getBoundingClientRect()};
    try { lever.setPointerCapture(event.pointerId); } catch {}event.preventDefault();lever.focus();moveLever(event);render();
  });
  listen(lever, 'lostpointercapture', event => { if (leverDrag?.id === event.pointerId) releaseInput('lever-capture-lost'); });
  listen(lever, 'keydown', event => {
    if (inputBlocked() || lever.hidden || !['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return;
    event.preventDefault();feedback.unlock(event);
    const current = {reverse: -1, neutral: 0, forward: 1}[selectedDirection], next = event.key === 'Home' ? -1 : event.key === 'End' ? 1 : Math.max(-1, Math.min(1, current + (['ArrowUp','ArrowRight'].includes(event.key) ? 1 : -1)));
    chooseDirection({'-1': 'reverse', 0: 'neutral', 1: 'forward'}[next]);
  });
  for (const button of element.querySelectorAll('[data-direction]')) listen(button, 'click', event => { feedback.unlock(event);chooseDirection(button.dataset.direction); });
  listen(element, 'click', event => { const node = event.target.closest('[data-train-action]'), entry = node && actionEntries.get(node);if (entry && !node.disabled) { feedback.unlock(event);performAction(entry.displayed, entry.stamp); } });
  for (const button of element.querySelectorAll('[data-audio-toggle]')) listen(button, 'click', event => { feedback.setMuted(!feedback.state.muted);feedback.unlock(event);render(); });
  listen(part('less-power'), 'click', () => choosePower(presetPower - .1));listen(part('more-power'), 'click', () => choosePower(presetPower + .1));
  listen(power, 'input', () => choosePower(Number(power.value) / 100));
  gesture(part('power-hold'), 'power');gesture(part('brake'), 'brake');gesture(power, 'power');
  listen(win, 'pointerup', event => { if (leverDrag?.id === event.pointerId) { moveLever(event);cancelLever(false);render(); }if (activePointer?.id === event.pointerId) releaseInput('pointer-up'); }, {capture: true});
  listen(win, 'pointercancel', event => { if (activePointer?.id === event.pointerId || leverDrag?.id === event.pointerId) releaseInput('pointer-cancel'); }, {capture: true});
  listen(win, 'pointermove', event => {
    if ((activePointer?.id === event.pointerId || leverDrag?.id === event.pointerId) && event.pointerType !== 'touch' && event.buttons === 0) { releaseInput('buttons-released');return; }
    moveLever(event);
    if (activePointer?.id === event.pointerId && activePointer.node === part('brake')) { activePointer.pull = Math.max(8, Math.min(28, 12 + (event.clientY - activePointer.startY) * .6));element.style.setProperty('--chain-pull', `${activePointer.pull}px`); }
  }, {capture: true});
  listen(container, 'keydown', event => {
    if (inputBlocked() || event.defaultPrevented || event.isComposing || event.altKey || event.ctrlKey || event.metaKey || !container.contains(doc.activeElement)) return;
    const editable = event.target.closest('input, select, textarea, [contenteditable="true"]');if (editable && editable !== power) return;
    const key = event.key.toLowerCase();
    feedback.unlock(event);
    if (key === 'e' && !event.repeat) { const eligible = snapshot?.actions.filter(a => a.enabled && a.command.type === (snapshot.mode === 'on-foot' ? 'enter' : 'exit')) || [];if (eligible.length === 1) { event.preventDefault();performAction(eligible[0].command); }else if (eligible.length > 1) tell('Choose an entrance button.');return; }
    if (snapshot?.mode !== 'driver') return;
    if (['f', 'n', 'r'].includes(key) && !event.repeat) { event.preventDefault();chooseDirection({f: 'forward', n: 'neutral', r: 'reverse'}[key]); }
    else if ((key === 'arrowup' || key === 'arrowdown') && event.target !== power) { event.preventDefault();choosePower(presetPower + (key === 'arrowup' ? .1 : -.1)); }
    else if (!event.repeat && (key === 'b' || (key === ' ' || key === 'enter') && (event.target === part('power-hold') || event.target === part('brake') || event.target === panel))) {
      event.preventDefault();if (begin(key === 'b' || event.target === part('brake') ? 'brake' : 'power')) activeKey = event.code || key;
    }
  });
  listen(win, 'keyup', event => { if (activeKey === (event.code || event.key.toLowerCase())) { event.preventDefault();releaseInput('key-up'); } });
  listen(container, 'focusout', event => { if (!container.contains(event.relatedTarget)) releaseInput('focus-left'); });
  listen(container, 'focusin', event => { const editable = event.target.closest('input, select, textarea, [contenteditable="true"]');if (editable && editable !== power) releaseInput('text-input-focused'); });
  listen(win, 'blur', () => releaseInput('blur'));listen(win, 'pagehide', () => releaseInput('page-hidden'));
  listen(doc, 'visibilitychange', () => { if (doc.visibilityState === 'hidden') releaseInput('hidden');render(); });
  try { unsubscribe = session.subscribe(refresh);if (typeof unsubscribe !== 'function') throw failure('The connector subscription must return its disposer.'); }
  catch (error) { events.abort();feedback.dispose();element.remove();throw error; }
  refresh();
  return Object.freeze({element, refresh, releaseInput,
    setBlocked(value) { if (disposed) return;blocked = !!value;if (blocked) releaseInput('modal-or-paused');render(); },
    setMuted(value) { if (disposed) return;feedback.setMuted(value);render(); },
    setActor(value) { if (disposed) return;if (typeof value !== 'string' || !value) throw failure('Supply the current actor ID.');if (value === currentActor) return;releaseInput('actor-change');currentActor = value;context = null;selectedDirection = 'neutral';message = '';refresh(); },
    get state() { return Object.freeze({actorId: currentActor, mode: snapshot?.mode || null, requestedDirection: selectedDirection, requestedPower: presetPower, leaseId: lease?.id || null, blocked, fault, disposed, feedback: feedback.state, result: lastResult && clone(lastResult)}); },
    dispose() { if (disposed) return;disposed = true;events.abort();feedback.dispose();try { unsubscribe(); } catch (error) { report(error, 'unsubscribe'); }try { releaseInput('disposed'); } finally { element.remove();setWalking(snapshot?.mode === 'on-foot' && snapshot.walkingAllowed && !blocked); } }
  });
}
