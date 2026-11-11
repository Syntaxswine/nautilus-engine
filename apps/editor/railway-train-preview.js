import {railwayRoutesOf, railwayTrainsOf} from '../../packages/map-core/railway-routes.js';
import {createRailwayTraffic} from '../../packages/map-core/railway-traffic.js';
import {createRailwayTrainView} from '../../packages/railway-visuals/train-view.js';
import {createRailwaySignalView} from '../../packages/railway-visuals/signal-view.js';

const SPEED_M_PER_SECOND = 3.5;
const EMPTY = {trains: [], signals: []};
const statusKey = snapshot => JSON.stringify(snapshot.trains.map(({state, waiting}) =>
  [state.stock, state.track, state.turnoutTaken, state.stopped, waiting?.kind]));

export function createWorkshopTrainPreview(T, scene, changed) {
  const listeners = new Set(), playing = new Set(), models = new Map();
  let traffic = null, signature = '', snapshot = EMPTY, switches = new Map(), signalView = null;
  let selectedStock = 'steam', visible = true, frame = 0, lastTime = null;

  function read(stock = selectedStock) {
    const trains = snapshot.trains.map(train => ({...train, playing: playing.has(train.stock)}));
    const selected = trains.find(train => train.stock === stock);
    return {state: null, waiting: null, canTakeBranch: false, playing: false, ...selected, trains, signals: snapshot.signals};
  }
  const notify = () => { for (const listener of listeners) listener(); };

  function stopClock() {
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    lastTime = null;
  }

  function pause(stock = selectedStock) {
    if (!playing.delete(stock)) return;
    if (!playing.size) stopClock();
    notify();
  }

  function pauseAll() {
    stopClock();
    if (!playing.size) return;
    playing.clear();
    notify();
  }

  function render(next) {
    let redraw = false;
    for (const [index, {stock, state}] of next.trains.entries()) {
      const prior = snapshot.trains[index]?.state;
      if (state.distanceM !== prior?.distanceM || state.turnoutTaken !== prior?.turnoutTaken) {
        models.get(stock).update(state);
        redraw = true;
      }
    }
    redraw ||= next.signals.some((signal, index) => signal.aspect !== snapshot.signals[index]?.aspect);
    signalView?.update(next.signals);
    snapshot = next;
    if (redraw) changed();
  }

  function tick(time) {
    frame = 0;
    if (!playing.size) return;
    if (lastTime !== null) {
      const previous = statusKey(snapshot);
      const seconds = Math.min(.25, (time - lastTime) / 1000);
      render(traffic.advance(seconds * SPEED_M_PER_SECOND, playing));
      for (const {stock, state} of snapshot.trains) if (state.stopped) playing.delete(stock);
      if (previous !== statusKey(snapshot)) notify();
    }
    if (playing.size) {
      lastTime = time;
      frame = requestAnimationFrame(tick);
    } else lastTime = null;
  }

  function start(stocks) {
    for (const {stock, state} of snapshot.trains) if (stocks.includes(stock) && !state.stopped) playing.add(stock);
    if (playing.size && !frame) frame = requestAnimationFrame(tick);
    notify();
  }

  function reset() {
    pauseAll();
    if (!traffic) return;
    render(traffic.reset());
    notify();
  }

  function releaseModels() {
    for (const model of models.values()) model.dispose();
    models.clear();
    signalView?.dispose();
    signalView = null;
  }

  function sync(map) {
    const routes = railwayRoutesOf(map), placements = railwayTrainsOf(map);
    const departures = placements.map(({stock, routeId, departure}) => [stock, routeId, departure]);
    const nextSignature = routes.length ? JSON.stringify([routes, departures]) : '';
    if (signature === nextSignature) {
      let edited = false;
      for (const {stock, switchPosition} of placements) if (switches.get(stock) !== switchPosition) {
        traffic.setSwitch(stock, switchPosition);
        switches.set(stock, switchPosition);
        edited = true;
      }
      if (edited) { render(traffic.read()); notify(); }
      return;
    }

    pauseAll();
    releaseModels();
    signature = nextSignature;
    switches = new Map(placements.map(train => [train.stock, train.switchPosition]));
    traffic = routes.length ? createRailwayTraffic(routes, placements) : null;
    snapshot = traffic?.read() ?? EMPTY;
    for (const {stock, state} of snapshot.trains) {
      const model = createRailwayTrainView(T, state);
      models.set(stock, model);
      scene.add(model.root);
    }
    if (snapshot.signals.length) {
      signalView = createRailwaySignalView(T, snapshot.signals);
      scene.add(signalView.root);
    }
    setVisible(visible);
    changed();
    notify();
  }

  function setVisible(value) {
    visible = value;
    for (const model of models.values()) model.root.visible = visible;
    if (signalView) signalView.root.visible = visible;
  }

  function dispose() {
    listeners.clear();
    pauseAll();
    releaseModels();
    traffic = null;
    snapshot = EMPTY;
  }

  return {
    read, select: stock => { selectedStock = stock; },
    play: (stock = selectedStock) => start([stock]), playAll: () => start(snapshot.trains.map(train => train.stock)),
    pause, pauseAll, reset, sync, setVisible, dispose, subscribe: listener => listeners.add(listener)
  };
}
