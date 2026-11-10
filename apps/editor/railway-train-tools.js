import {railwayTrackAt, railwayTrainOf} from '../../packages/map-core/railway-routes.js';
import {RAILWAY_STOCK} from '../../packages/map-core/railway-train.js';

export function installRailwayTrainTools({section, getDocument, apply, preview, status, isBusy, availability}) {
  section.innerHTML = `<label for="railway-train-stock">Train</label>
    <select id="railway-train-stock"></select>
    <p class="muted">Click a track near the end you want to depart from.</p>
    <label for="railway-train-switch">Turnout</label>
    <select id="railway-train-switch"><option value="main">Main line</option><option value="branch">Branch</option></select>
    <div class="row"><button type="button" id="railway-train-run">Run train</button><button type="button" id="railway-train-reset">Reset</button></div>
    <button type="button" id="railway-train-remove">Remove train</button>
    <p id="railway-train-status" role="status"></p>`;
  const stock = section.querySelector('#railway-train-stock'), turnout = section.querySelector('#railway-train-switch');
  const run = section.querySelector('#railway-train-run'), reset = section.querySelector('#railway-train-reset');
  const remove = section.querySelector('#railway-train-remove'), note = section.querySelector('#railway-train-status');
  for (const [id, {label}] of Object.entries(RAILWAY_STOCK)) stock.add(new Option(label, id));
  let previousStock;

  function sync(message) {
    const blocked = availability();
    const saved = railwayTrainOf(getDocument()?.map);
    const {playing, state, canTakeBranch} = preview.read();
    if (saved?.stock !== previousStock && saved) stock.value = saved.stock;
    previousStock = saved?.stock;
    stock.disabled = !!blocked;
    turnout.value = saved?.switchPosition ?? 'main';
    turnout.disabled = !!blocked || !state || !canTakeBranch;
    run.disabled = !!blocked || !state || state.stopped;
    reset.disabled = !!blocked || !state;
    remove.disabled = !!blocked || !saved;
    run.textContent = playing ? 'Pause train' : 'Run train';
    const nextRun = state?.turnoutTaken && state.turnoutTaken !== saved?.switchPosition
      ? ' The new turnout setting applies on the next run.' : '';
    let progress = '';
    if (state?.stopped) progress = 'Stopped at the end of the track.';
    else if (playing) progress = state.track === 'branch' ? 'Running on the branch.' : 'Running on the main line.';
    else if (state?.distanceM) progress = 'Train paused.';
    else if (state) progress = 'Ready to depart.';
    note.textContent = message || blocked || progress + nextRun;
  }

  function edit(tool, options) {
    if (isBusy() || availability()) return;
    return apply({tool, start: {z: 0}, options});
  }

  function place(point) {
    const picked = point && railwayTrackAt(getDocument()?.map, point.x, point.y);
    if (!picked) {
      const message = 'Click a placed track to choose a departure end.';
      sync(message);
      status(message);
      return;
    }
    return edit('railway-train', {routeId: picked.route.id, departure: picked.departure, stock: stock.value});
  }

  function toggle() {
    if (run.disabled || isBusy()) return;
    if (preview.read().playing) preview.pause();
    else preview.play();
  }

  run.onclick = toggle;
  reset.onclick = () => { if (!isBusy() && !reset.disabled) preview.reset(); };
  remove.onclick = () => edit('erase-railway-train');
  turnout.onchange = async () => {
    const result = await edit('railway-train-switch', {switchPosition: turnout.value});
    if (!result?.ok) sync(result?.error);
  };
  preview.subscribe(() => sync());
  return {sync, place, toggle};
}
