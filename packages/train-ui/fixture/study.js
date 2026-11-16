import {trainConnectorFixture} from '../../train-core/connector-fixture.js';
import {mountTrainControls} from '../index.js';

// This page always delegates dispatch to Coder's fixed FIXTURE_ONLY connector.
// Appearance variants change detached view data, never train/actor authority.
const $ = id => document.getElementById(id), walking = $('walking');
const commands = [], results = [], errors = [];
let controls, selected = 'steam', walkingEnabled = false, steamProfile = 'classic';
const descriptions = {
  steam: 'Steam locomotive · driving cab', electric: 'Electric train · rear-facing cab',
  walking: 'On foot · steam cab entrance', riding: 'Passenger coach · at platform', service: 'Passenger coach · in motion', commuter: 'Electric passenger coach · at platform',
  signal: 'Steam cab · waiting at the crossing', reverse: 'Steam cab · stop before reversing',
  tender: 'Coal tender · no boarding action'
};

function variant(mode) {
  const core = trainConnectorFixture(mode), story = selected;
  return Object.freeze({contract: core.contract,
    readForActor(actorId) {
      const state = core.readForActor(actorId);
      if (story === 'tender') state.actions = [];
      if (story === 'electric' || story === 'commuter') {
        state.trainId = 'train/electric';state.carId = 'train/electric/car/2';state.cabFacing = -1;
        state.train.trainId = state.trainId;state.train.stock = 'electric';state.train.speedMps = story === 'electric' ? 3.45 : 0;state.train.signedSpeedMps = -state.train.speedMps;state.train.stopped = story === 'commuter';
        for (const action of state.actions) { action.command.trainId = state.trainId;action.command.carId = state.carId; }
      }
      if (story === 'service') { state.train.speedMps = 2.8;state.train.signedSpeedMps = 2.8;state.train.stopped = false; }
      if (story === 'signal') state.train.hold = {kind: 'signal', signalId: 'crossing/01', reason: 'Waiting for the crossing to clear.'};
      if (story === 'reverse') { state.train.speedMps = 2.3;state.train.signedSpeedMps = 2.3;state.train.stopped = false;state.train.controls.direction = 'forward'; }
      if (!state.train?.stopped && state.mode !== 'on-foot') for (const action of state.actions) {
        action.enabled = false;action.code = 'TRAIN_MOVING';action.reason = 'Wait until the train stops to exit.';
      }
      return state;
    },
    subscribe: listener => core.subscribe(listener),
    dispatch(command) {
      commands.push(structuredClone(command));const result = core.dispatch(command);results.push(structuredClone(result));
      $('last-request').textContent = `${command.type} · ${result.code} · ${command.commandId}`;return result;
    }
  });
}

function showStory(value) {
  if (!Object.hasOwn(descriptions, value)) throw Error('Unknown view study.');
  controls?.dispose();selected = value;$('story').value = value;
  $('scene-caption').textContent = descriptions[value];
  $('world-note').textContent = value === 'tender' ? 'No Enter action is offered for the coal tender.' : value === 'electric' ? 'Forward is relative to this rear-facing cab.' : 'Disconnected preview. Every action is refused by the fixed fixture.';
  const mode = ['walking', 'tender'].includes(value) ? 'on-foot' : ['riding', 'service', 'commuter'].includes(value) ? 'rider' : 'driver';
  controls = mountTrainControls($('hud-slot'), {session: variant(mode), actorId: 'player', walkingElement: walking,steamProfile,
    setWalkingEnabled(value) { walkingEnabled = value;walking.dataset.enabled = String(value); },
    focusWalking() { $('walk-focus').focus(); }, onError(error, context) { errors.push({message: error.message, phase: context.phase}); }
  });
}

$('story').addEventListener('change', event => showStory(event.target.value));
$('confirm').addEventListener('click', () => showStory('steam'));
$('refuse').addEventListener('click', () => showStory('walking'));
$('open-map').addEventListener('click', () => { controls.setBlocked(true);$('map-dialog').showModal(); });
$('close-map').addEventListener('click', () => $('map-dialog').close());
$('map-dialog').addEventListener('close', () => { controls.setBlocked(false);controls.element.querySelector('[data-part="driver"]')?.focus(); });
window.addEventListener('pagehide', () => controls?.dispose());
showStory('steam');
window.trainStudy = Object.freeze({showStory, commands, results, errors,
  showProfile(value) { if (!['classic','compact-notched'].includes(value)) throw Error('Unknown steam profile.');steamProfile=value;showStory(selected); },
  get controls() { return controls; }, get walkingEnabled() { return walkingEnabled; },
  dispose() { controls.dispose(); }
});
