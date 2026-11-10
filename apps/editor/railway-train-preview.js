import {railwayRoutesOf, railwayTrainOf} from '../../packages/map-core/railway-routes.js';
import {createRailwayTrain} from '../../packages/map-core/railway-train.js';
import {createRailwayTrainView} from '../../packages/railway-visuals/train-view.js';

const SPEED_M_PER_SECOND = 3.5;

export function createWorkshopTrainPreview(T, scene, changed) {
  const listeners = new Set();
  let saved = null, signature = '', motion = null, state = null, model = null;
  let playing = false, visible = true, frame = 0, lastTime = null;

  const read = () => ({playing, state, canTakeBranch: motion?.canTakeBranch ?? false});
  const notify = () => { for (const listener of listeners) listener(); };

  function pause() {
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    lastTime = null;
    if (!playing) return;
    playing = false;
    notify();
  }

  function render(next) {
    state = next;
    model.update(state);
    changed();
  }

  function tick(time) {
    frame = 0;
    if (!playing) return;
    if (lastTime !== null) {
      const previous = state;
      const seconds = Math.min(.1, (time - lastTime) / 1000);
      render(motion.advance(seconds * SPEED_M_PER_SECOND, saved.switchPosition));
      if (state.stopped) { pause(); return; }
      if (state.track !== previous.track || state.turnoutTaken !== previous.turnoutTaken) notify();
    }
    lastTime = time;
    frame = requestAnimationFrame(tick);
  }

  function play() {
    if (!motion || playing || state.stopped) return;
    playing = true;
    frame = requestAnimationFrame(tick);
    notify();
  }

  function reset() {
    pause();
    if (!motion) return;
    render(motion.reset(saved.switchPosition));
    notify();
  }

  function sync(map) {
    const next = railwayTrainOf(map);
    const route = next && railwayRoutesOf(map).find(item => item.id === next.routeId);
    const nextSignature = route ? JSON.stringify([route, next.stock, next.departure]) : '';
    const switchChanged = saved?.switchPosition !== next?.switchPosition;
    saved = next;
    if (signature === nextSignature) {
      if (switchChanged && motion) {
        if (!state.distanceM) render(motion.reset(saved.switchPosition));
        notify();
      }
      return;
    }
    pause();
    model?.dispose();
    model = state = motion = null;
    signature = nextSignature;
    if (route) {
      motion = createRailwayTrain(route, next);
      state = motion.read();
      model = createRailwayTrainView(T, state);
      model.root.visible = visible;
      scene.add(model.root);
    }
    changed();
    notify();
  }

  function setVisible(value) {
    visible = value;
    if (model) model.root.visible = visible;
  }

  function dispose() {
    pause();
    listeners.clear();
    model?.dispose();
    model = state = motion = null;
  }

  return {read, play, pause, reset, sync, setVisible, dispose, subscribe: listener => listeners.add(listener)};
}
