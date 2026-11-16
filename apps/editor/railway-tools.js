import {planRailwayRoute, snapRailwayTurnoutAnchor, snapRailwayWaypoint} from '../../packages/railway-visuals/route.js';
import {installRailwayTrainTools} from './railway-train-tools.js';

export function installRailwayTools({panel, canvas, getDocument, apply, scene, status, isBusy}) {
  const tool = panel.querySelector('#edit-tool');
  tool.add(new Option('Lay railway route', 'railway-route'));
  const controls = document.createElement('section');
  controls.id = 'railway-options';
  controls.hidden = true;
  controls.innerHTML = `<label for="railway-mode">Railway action</label>
    <select id="railway-mode"><option value="route">Lay route</option><option value="turnout">Add split</option><option value="train">Train</option></select>
    <div id="railway-radius-options"><label for="railway-radius">Route size</label>
    <select id="railway-radius"><option value="16">World size · 16 m bends</option><option value="4">Miniature · 4 m bends</option></select></div>
    <label for="railway-geometry">Geometry</label><select id="railway-geometry"><option value="grid-v1">Metre compass grid</option><option value="surveyed-v1">Measured bearings</option></select>
    <section id="railway-train-options" hidden></section>
    <p id="railway-help" class="muted"></p>
    <p id="railway-draft" role="status"></p>
    <div class="row"><button type="button" id="railway-undo-point">Undo point</button><button type="button" id="railway-cancel">Cancel route</button></div>
    <button type="button" id="railway-place">Place route</button>
    <button type="button" id="railway-remove-split" hidden>Remove split</button>`;
  panel.append(controls);
  const place = controls.querySelector('#railway-place'), undo = controls.querySelector('#railway-undo-point');
  const cancelButton = controls.querySelector('#railway-cancel'), note = controls.querySelector('#railway-draft');
  const mode = controls.querySelector('#railway-mode'), help = controls.querySelector('#railway-help');
  const removeSplit = controls.querySelector('#railway-remove-split');
  const trainSection = controls.querySelector('#railway-train-options');
  const radius = controls.querySelector('#railway-radius'), radiusOptions = controls.querySelector('#railway-radius-options');
  const geometry=controls.querySelector('#railway-geometry');
  const active = () => tool.value === 'railway-route';
  const splitting = () => mode.value === 'turnout';
  const trainMode = () => mode.value === 'train';
  const train = installRailwayTrainTools({section: trainSection, getDocument, apply, preview: scene.railwayTrain,
    status, isBusy, availability});
  let accepted = [], preview = null, hover = null, gesture = null, frame = 0, pending = null, targetRoute = null;

  function availability() {
    if (!getDocument()) return 'Wait for the scene to finish loading.';
    if (getDocument().block) return 'Switch to the full map workspace to lay railway.';
    if (+document.getElementById('floor').value !== 0) return 'Select ground level 1 to lay railway.';
    return '';
  }
  function crossingNote(draft) {
    const count = draft?.crossings?.filter(crossing => crossing.tracks.some(track => track.id === draft.route.id)).length;
    return count ? ` · ${count} crossing${count === 1 ? '' : 's'} fitted` : '';
  }
  function sync(message) {
    controls.hidden = !active();
    const blocked = active() ? availability() : '';
    trainSection.hidden = !trainMode();
    radiusOptions.hidden = trainMode() || splitting();
    help.hidden = note.hidden = undo.parentElement.hidden = place.hidden = trainMode();
    removeSplit.hidden = !splitting() || !targetRoute?.turnout;
    if (trainMode()) { train.sync(message); return; }
    place.disabled = !!blocked || accepted.length < 2;
    undo.disabled = cancelButton.disabled = !accepted.length;
    place.textContent = splitting() ? 'Place split' : 'Place route';
    cancelButton.textContent = splitting() ? 'Cancel split' : 'Cancel route';
    removeSplit.disabled = !!blocked;
    help.textContent = splitting()&&targetRoute?.geometryProfile==='surveyed-v1'?'Select a measured shared node or tangent, then its branch endpoint (1–60°).':splitting() ? 'Choose a straight section of a placed route, then choose where the 45° branch ends.'
      : 'Click or tap to add waypoints. Track snaps to the metre grid. Draw through a straight track to fit a 45° or 90° crossing.';
    const length = preview?.railwayPreview?.plan.lengthM;
    const progress = accepted.length
      ? `${accepted.length} waypoints accepted${length ? ' · ' + length.toFixed(1) + ' m fitted' : ''}${crossingNote(preview?.railwayPreview)}`
      : 'Choose the first waypoint.';
    const splitProgress = targetRoute
      ? length ? length.toFixed(1) + ' m fitted' : 'Choose the branch endpoint.'
      : 'Choose a straight section of an existing route.';
    note.textContent = message || blocked || (splitting() ? splitProgress : progress);
  }
  function command(waypoints) {
    if (splitting()) return {tool: 'railway-turnout', start: {z: 0},
      options: {id: targetRoute.id, turnout: {at: waypoints[0], end: waypoints[1]}}};
    return {tool: 'railway-route', start: {z: 0}, options: {waypoints, ...(+radius.value === 16 ? {radiusM: 16} : {}),...(geometry.value==='surveyed-v1'?{geometryProfile:'surveyed-v1'}:{})}};
  }
  function check(waypoints) {
    if (waypoints.length < 2) return {ok: true, cells: [], edges: [], railwayWaypoints: waypoints};
    const {ok, error, railwayPreview} = getDocument().preview(command(waypoints));
    return {ok, error, railwayPreview, cells: [], edges: [], railwayWaypoints: waypoints};
  }
  function proposed(point) {
    if (!point || point.z !== 0 || (splitting() && !targetRoute)) return null;
    const anchor = splitting() ? accepted[0] : accepted.at(-1);
    const profile=splitting()?targetRoute.geometryProfile:geometry.value,anchors=getDocument().map.railwayRoutes?.routes.flatMap(r=>r.waypoints)||[];
    const next = snapRailwayWaypoint(anchor, [point.x, point.y],{geometryProfile:profile,anchors});
    if (next.join() === anchor?.join()) return null;
    const key = next.join();
    if (hover?.key === key) return hover;
    const waypoints = splitting() ? [anchor, next] : [...accepted, next];
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
    const fit = draft?.result.railwayPreview;
    sync(draft && !draft.result.ok ? draft.result.error : fit ?
      `Preview · ${fit.plan.lengthM.toFixed(1)} m${crossingNote(fit)} · Click or tap to add this waypoint.` : '');
  }
  function cancel() {
    stopHover();
    accepted = [];
    targetRoute = null;
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
    if (trainMode() || isBusy() || availability()) return;
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
    const clicked = point(event);
    if (trainMode()) return train.place(clicked);
    if (splitting() && !targetRoute && clicked) {
      const selected = getDocument().inspect(clicked.x, clicked.y, 0);
      const at = selected?.type === 'railway-route' &&
        snapRailwayTurnoutAnchor(planRailwayRoute(selected.data.waypoints, selected.data.radiusM,selected.data.geometryProfile), [clicked.x, clicked.y]);
      if (!at) { sync('Choose a point on a straight section of the main track.'); return; }
      targetRoute = selected.data;
      accepted = [at];
      preview = check(accepted);
      scene.preview(preview);
      sync();
      return;
    }
    const draft = proposed(clicked);
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
    if (!active() || isBusy() || availability()) return;
    if (trainMode()) return train.toggle();
    if (place.disabled) return;
    return apply(command(accepted));
  }
  place.onclick = commit;
  mode.onchange = () => { cancel(); scene.preview(null); };
  radius.onchange = () => { cancel(); scene.preview(null); };
  geometry.onchange=()=>{cancel();scene.preview(null);};
  removeSplit.onclick = () => {
    if (!active() || !splitting() || !targetRoute?.turnout || isBusy() || availability()) return;
    return apply({tool: 'erase-railway-turnout', start: {z: 0}, options: {id: targetRoute.id}});
  };
  undo.onclick = () => {
    stopHover();
    accepted = accepted.slice(0, -1);
    if (!accepted.length) targetRoute = null;
    preview = accepted.length ? check(accepted) : null;
    scene.preview(preview);
    sync();
  };
  cancelButton.onclick = () => { cancel(); scene.preview(null); status('Railway draft cleared.'); };
  return {active, sync, cancel, leave, press, move, release, commit};
}
