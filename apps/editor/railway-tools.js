import {snapRailwayWaypoint} from '../../packages/railway-visuals/route.js';

export function installRailwayTools({panel, canvas, getDocument, apply, scene, status, isBusy}) {
  const tool = panel.querySelector('#edit-tool');
  tool.add(new Option('Lay railway route', 'railway-route'));
  const controls = document.createElement('section');
  controls.id = 'railway-options';
  controls.hidden = true;
  controls.innerHTML = `<p class="muted">Click or tap to add waypoints. Track snaps to the metre grid and joins 45° and 90° turns. Leave room for the 4 m bends and 2 m ballast.</p>
    <p id="railway-draft" role="status"></p>
    <div class="row"><button type="button" id="railway-undo-point">Undo point</button><button type="button" id="railway-cancel">Cancel route</button></div>
    <button type="button" id="railway-place">Place route</button>`;
  panel.append(controls);
  const place = controls.querySelector('#railway-place'), undo = controls.querySelector('#railway-undo-point');
  const cancelButton = controls.querySelector('#railway-cancel'), note = controls.querySelector('#railway-draft');
  const active = () => tool.value === 'railway-route';
  let accepted = [], preview = null, hover = null, gesture = null, frame = 0, pending = null;

  function availability() {
    if (!getDocument()) return 'Wait for the scene to finish loading.';
    if (getDocument().block) return 'Switch to the full map workspace to lay railway.';
    if (+document.getElementById('floor').value !== 0) return 'Select ground level 1 to lay railway.';
    return '';
  }
  function sync(message) {
    controls.hidden = !active();
    const blocked = active() ? availability() : '';
    place.disabled = !!blocked || accepted.length < 2;
    undo.disabled = cancelButton.disabled = !accepted.length;
    note.textContent = message || blocked || (accepted.length ?
      `${accepted.length} waypoints accepted${preview?.railwayPreview ? ' · ' + preview.railwayPreview.plan.lengthM.toFixed(1) + ' m fitted' : ''}` :
      'Choose the first waypoint.');
  }
  function command(waypoints) {
    return {tool: 'railway-route', start: {z: 0}, options: {waypoints}};
  }
  function check(waypoints) {
    if (waypoints.length < 2) return {ok: true, cells: [], edges: [], railwayWaypoints: waypoints};
    const {ok, error, railwayPreview} = getDocument().preview(command(waypoints));
    return {ok, error, railwayPreview, cells: [], edges: [], railwayWaypoints: waypoints};
  }
  function proposed(point) {
    if (!point || point.z !== 0) return null;
    const next = snapRailwayWaypoint(accepted.at(-1), [point.x, point.y]);
    if (next.join() === accepted.at(-1)?.join()) return null;
    const key = next.join();
    if (hover?.key === key) return hover;
    const waypoints = [...accepted, next];
    const size = getDocument().size;
    const result = next.some(n => n < 0 || n >= size) ?
      {ok: false, error: 'Choose a railway waypoint inside the map.'} : check(waypoints);
    return (hover = {key, waypoints, result});
  }
  function stopHover() {
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    pending = hover = null;
  }
  function show(point) {
    const draft = proposed(point);
    scene.preview(draft?.result.ok ? draft.result : preview);
    sync(draft && !draft.result.ok ? draft.result.error : draft?.result.railwayPreview ?
      `Preview · ${draft.result.railwayPreview.plan.lengthM.toFixed(1)} m · Click or tap to add this waypoint.` : '');
  }
  function cancel() {
    stopHover();
    accepted = [];
    gesture = preview = null;
    sync();
  }
  function leave() {
    stopHover();
    scene.preview(preview);
    sync();
  }
  function press(event) {
    event.stopImmediatePropagation();
    if (isBusy()) return;
    const blocked = availability();
    if (blocked) { sync(blocked); return; }
    if (gesture) return;
    gesture = {id: event.pointerId, x: event.clientX, y: event.clientY};
    canvas.setPointerCapture(event.pointerId);
    canvas.focus();
  }
  function move(event, point) {
    event.stopImmediatePropagation();
    if (isBusy() || availability()) return;
    pending = point(event);
    if (!frame) frame = requestAnimationFrame(() => {
      frame = 0;
      if (active() && !isBusy() && !availability()) show(pending);
    });
  }
  function release(event, point) {
    if (event.button !== 0) return;
    event.stopImmediatePropagation();
    if (gesture?.id !== event.pointerId) return;
    const {x, y} = gesture;
    gesture = null;
    if (isBusy() || availability() || Math.hypot(event.clientX - x, event.clientY - y) > 9) return;
    const draft = proposed(point(event));
    stopHover();
    if (draft?.result.ok) {
      accepted = draft.waypoints;
      preview = draft.result;
    }
    scene.preview(preview);
    sync(draft && !draft.result.ok ? draft.result.error : '');
    if (draft && !draft.result.ok) status(draft.result.error);
  }
  function commit() {
    if (!active() || place.disabled || isBusy() || availability()) return;
    return apply(command(accepted));
  }
  place.onclick = commit;
  undo.onclick = () => {
    stopHover();
    accepted = accepted.slice(0, -1);
    preview = accepted.length ? check(accepted) : null;
    scene.preview(preview);
    sync();
  };
  cancelButton.onclick = () => { cancel(); scene.preview(null); status('Railway draft cleared.'); };
  return {active, sync, cancel, leave, press, move, release, commit};
}
