import {railwayTrackAt, railwayTrainsOf} from '../../packages/map-core/railway-routes.js';
import {RAILWAY_STOCK} from '../../packages/map-core/railway-train.js';

export function installRailwayTrainTools({section, getDocument, apply, preview, status, isBusy, availability}) {
  section.innerHTML = `<label for="railway-train-stock">Train</label>
    <select id="railway-train-stock"></select>
    <p class="muted">Click a track near the end you want to depart from.</p>
    <label for="railway-train-switch">Turnout</label>
    <select id="railway-train-switch"><option value="main">Main line</option><option value="branch">Branch</option></select>
    <div class="row"><button type="button" id="railway-train-run">Run train</button><button type="button" id="railway-train-reset">Reset</button></div>
    <button type="button" id="railway-train-run-both" hidden>Run both</button>
    <button type="button" id="railway-train-remove">Remove train</button>
    <p id="railway-train-status" role="status"></p>
    <p id="railway-peer-status" role="status" hidden></p>`;
  const stock = section.querySelector('#railway-train-stock'), turnout = section.querySelector('#railway-train-switch');
  const run = section.querySelector('#railway-train-run'), reset = section.querySelector('#railway-train-reset');
  const remove = section.querySelector('#railway-train-remove'), note = section.querySelector('#railway-train-status');
  const both = section.querySelector('#railway-train-run-both'), peerNote = section.querySelector('#railway-peer-status');
  for (const [id, {label}] of Object.entries(RAILWAY_STOCK)) stock.add(new Option(label, id));
  let previousStocks = '';

  function describe(entry) {
    const {state, playing, waiting} = entry;
    if (!state) return '';
    if (state.stopped) return 'Stopped at the end of the track.';
    if (playing && waiting?.kind === 'crossing') return 'Waiting at the crossing signal.';
    if (playing && waiting?.kind === 'turnout') return 'Waiting at the turnout signal.';
    if (playing && waiting) return 'Waiting for clear track.';
    if (playing) return state.track === 'branch' ? 'Running on the branch.' : 'Running on the main line.';
    return state.distanceM ? 'Train paused.' : 'Ready to depart.';
  }

  const allStarted = trains => trains.every(train => train.playing || train.state.stopped);

  function sync(message) {
    const blocked = availability();
    const placements = railwayTrainsOf(getDocument()?.map);
    const stocks = placements.map(train => train.stock).join(',');
    if (stocks !== previousStocks && placements.length === 1 && placements[0].stock !== stock.value) {
      stock.value = placements[0].stock;
    }
    previousStocks = stocks;
    preview.select(stock.value);
    const current = preview.read(stock.value);
    const {playing, state, canTakeBranch, trains} = current;
    const saved = placements.find(train => train.stock === stock.value);
    stock.disabled = !!blocked;
    turnout.value = saved?.switchPosition ?? 'main';
    turnout.disabled = !!blocked || !state || !canTakeBranch;
    run.disabled = !!blocked || !state || state.stopped;
    reset.disabled = !!blocked || !trains.length;
    remove.disabled = !!blocked || !saved;
    run.textContent = playing ? 'Pause train' : 'Run train';
    reset.textContent = trains.length > 1 ? 'Reset both' : 'Reset';
    both.hidden = trains.length !== 2;
    both.disabled = !!blocked || !trains.some(train => !train.state.stopped);
    both.textContent = trains.some(train => train.playing) && allStarted(trains) ? 'Pause both' : 'Run both';
    const nextRun = state?.turnoutTaken && state.turnoutTaken !== saved?.switchPosition
      ? ' The new turnout setting applies on the next run.' : '';
    note.textContent = message || blocked || describe(current) + nextRun;
    const peer = trains.length === 2 && trains.find(train => train.stock !== stock.value);
    peerNote.hidden = !peer;
    peerNote.textContent = peer ? RAILWAY_STOCK[peer.stock].label + ' · ' + describe(peer) : '';
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
    if (preview.read(stock.value).playing) preview.pause(stock.value);
    else preview.play(stock.value);
  }

  run.onclick = toggle;
  stock.onchange = () => sync();
  both.onclick = () => {
    if (isBusy() || both.disabled) return;
    if (allStarted(preview.read().trains)) preview.pauseAll();
    else preview.playAll();
  };
  reset.onclick = () => { if (!isBusy() && !reset.disabled) preview.reset(); };
  remove.onclick = () => edit('erase-railway-train', {stock: stock.value});
  turnout.onchange = async () => {
    const result = await edit('railway-train-switch', {stock: stock.value, switchPosition: turnout.value});
    if (!result?.ok) sync(result?.error);
  };
  preview.subscribe(() => sync());
  return {sync, place, toggle};
}
