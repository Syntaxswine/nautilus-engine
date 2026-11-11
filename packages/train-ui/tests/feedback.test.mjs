import test from 'node:test';
import assert from 'node:assert/strict';
import {createTrainFeedback} from '../feedback.js';
import {trainConnectorFixture} from '../../train-core/connector-fixture.js';

// Presentation-only audio device double. No physics or occupancy authority.
function device(state = 'running') {
  const contexts = [], oscillators = [];
  const parameter = () => ({value: 0, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {}});
  const node = () => ({connect() {}, disconnect() {this.disconnected = true;}});
  class AudioContext {
    constructor() { this.state = state;this.currentTime = 0;this.destination = {};contexts.push(this); }
    createGain() { return {...node(), gain: parameter()}; }
    createOscillator() { const source = {...node(), frequency: parameter(), start() {this.started = true;}, stop() {this.stopped = true;this.onended?.();}};oscillators.push(source);return source; }
    resume() { return Promise.resolve(); }
    close() { this.closed = true;this.state = 'closed';return Promise.resolve(); }
  }
  return {win: {AudioContext}, contexts, oscillators};
}
const read = (stock = 'steam', mode = 'driver') => { const s = trainConnectorFixture(mode).readForActor('player');if (s.train) s.train.stock = stock;return s; };
const result = {committed: true, repeated: false};
const drive = {type: 'drive', actorId: 'player', trainId: 'train/steam', leaseId: 'own', direction: 'forward', power: .35, brake: 0};
function armed(feedback) {
  const s = read();s.train.controls = {direction: 'forward', power: .35, brake: 0, leaseId: 'own'};
  feedback.observe(s);feedback.committed(drive, result, s, s);return s;
}
function moving(s) { const next = structuredClone(s);next.train.speedMps = .1;next.train.signedSpeedMps = .1;next.train.stopped = false;return next; }

test('mount and restored/subscribed movement allocate no audio device and emit no cue', () => {
  const d = device(), f = createTrainFeedback(d.win);f.observe(read());f.observe(moving(read()));f.observe(read('electric','rider'));
  assert.equal(d.contexts.length, 0);assert.equal(f.state.played, 0);f.dispose();
});
test('only a trusted gesture unlocks audio; unlock itself is silent', () => {
  const d = device(), f = createTrainFeedback(d.win);f.unlock({isTrusted: false});const s = armed(f);f.observe(moving(s));
  assert.equal(d.contexts.length, 0);f.unlock({isTrusted: true});assert.equal(d.contexts.length, 1);assert.equal(f.state.played, 0);
  f.observe(moving(armed(f)));assert.equal(f.state.played, 1);f.dispose();
});
test('steam cue follows accepted own lease and first confirmed departure, once per boarding', () => {
  const d = device(), f = createTrainFeedback(d.win);f.unlock({isTrusted: true});const s = armed(f);
  assert.equal(f.state.played, 0);f.observe(moving(s));assert.equal(f.state.lastCue, 'steam-departure');assert.equal(f.state.played, 1);
  f.observe(moving(s));armed(f);f.observe(moving(s));assert.equal(f.state.played, 1);f.dispose();
});
test('refused, repeated and unconfirmed drive requests never arm a departure', () => {
  for (const r of [{committed: false}, {committed: true,repeated: true}, result]) {
    const d = device(), f = createTrainFeedback(d.win);f.unlock({isTrusted: true});const s = read();
    if (r !== result) s.train.controls = {...drive};
    f.observe(s);f.committed(drive, r, s, s);f.observe(moving(s));assert.equal(f.state.played, 0);f.dispose();
  }
});
test('actor, cab, occupancy and lease replacement invalidate a pending whistle', () => {
  for (const change of [s => {s.actorId = 'other';}, s => {s.carId = 'other';}, s => {s.cabFacing = -1;}, s => {s.expected.occupancyRevision++;}, s => {s.train.controls.leaseId = 'new';}]) {
    const d = device(), f = createTrainFeedback(d.win);f.unlock({isTrusted: true});const next = moving(armed(f));change(next);f.observe(next);assert.equal(f.state.played, 0);f.dispose();
  }
});
test('cancelled input cannot sound a later motion update', () => {
  const d = device(), f = createTrainFeedback(d.win);f.unlock({isTrusted: true});const s = armed(f);f.cancelInput();f.observe(moving(s));assert.equal(f.state.played, 0);f.dispose();
});
test('electric boarding and exit chime require matching committed occupancy transitions', () => {
  const d = device(), f = createTrainFeedback(d.win);f.unlock({isTrusted: true});const foot = read('electric','on-foot'), rider = read('electric','rider');
  const enter = {type: 'enter', actorId: 'player', trainId: rider.trainId, carId: rider.carId};
  f.observe(rider);assert.equal(f.state.played, 0);f.committed(enter, {...result,repeated: true}, foot, rider);assert.equal(f.state.played, 0);
  f.committed(enter, result, foot, {...rider,carId: 'different'});assert.equal(f.state.played, 0);
  f.committed(enter, result, foot, rider);assert.equal(f.state.lastCue, 'electric-boarded');
  f.committed({...enter,type: 'exit'}, result, rider, foot);assert.equal(f.state.lastCue, 'electric-exited');assert.equal(f.state.played, 2);f.dispose();
});
test('mute stops sound, cancels pending cue and never replays it on unmute', () => {
  const d = device(), f = createTrainFeedback(d.win,{muted: true});f.unlock({isTrusted: true});assert.equal(d.contexts.length, 0);
  f.setMuted(false);f.unlock({isTrusted: true});const s = armed(f);f.setMuted(true);f.observe(moving(s));f.setMuted(false);assert.equal(f.state.played, 0);
  s.expected.occupancyRevision++;f.observe(s);f.committed(drive, result, s, s);f.observe(moving(s));assert.equal(f.state.played, 1);f.setMuted(true);assert.equal(f.state.activeSounds, 0);assert.ok(d.oscillators.every(n => n.stopped && n.disconnected));f.dispose();
});
test('a suspended context does not queue a stale confirmation for later resume', () => {
  const d = device('suspended'), f = createTrainFeedback(d.win);f.unlock({isTrusted: true});const s = armed(f);f.observe(moving(s));d.contexts[0].state = 'running';f.observe(moving(s));assert.equal(f.state.played, 0);f.dispose();
});
test('disposal closes the owned device and makes further callbacks inert', async () => {
  const d = device(), f = createTrainFeedback(d.win);f.unlock({isTrusted: true});f.observe(moving(armed(f)));f.dispose();f.dispose();await Promise.resolve();
  assert.equal(f.state.activeSounds, 0);assert.equal(f.state.contextState, 'closed');assert.ok(d.contexts.every(c => c.closed));assert.ok(d.oscillators.every(s => s.stopped && s.disconnected));
  f.unlock({isTrusted: true});armed(f);assert.equal(d.contexts.length, 1);assert.equal(f.state.played, 1);
});
test('missing optional WebAudio support leaves controls silent and usable', () => {
  const f = createTrainFeedback({});f.unlock({isTrusted: true});f.observe(moving(armed(f)));assert.equal(f.state.played, 0);f.dispose();
});
test('notch clicks require a trusted accepted own change and exact confirmed controls', () => {
  const d=device(),f=createTrainFeedback(d.win);f.unlock({isTrusted:true});const before=read(),after=read();
  after.train.controls={direction:'forward',power:.5,brake:0,leaseId:'own'};
  const command={...drive,power:.5};
  f.shift(command,result,before,after,{isTrusted:false});f.shift(command,{committed:false},before,after,{isTrusted:true});f.shift(command,{...result,repeated:true},before,after,{isTrusted:true});
  f.shift(command,result,before,{...after,train:{...after.train,controls:{...after.train.controls,power:1}}},{isTrusted:true});assert.equal(f.state.played,0);
  f.shift(command,result,before,after,{isTrusted:true});assert.equal(f.state.lastCue,'steam-shift');assert.equal(f.state.played,1);
  f.shift(command,result,after,after,{isTrusted:true});assert.equal(f.state.played,1);f.dispose();
});
test('notch click shares mute, device ownership and bounded voice cleanup', async () => {
  const d=device(),f=createTrainFeedback(d.win);f.unlock({isTrusted:true});const before=read(),after=read();after.train.controls={direction:'reverse',power:.5,brake:0,leaseId:'own'};
  f.setMuted(true);f.shift({...drive,direction:'reverse',power:.5},result,before,after,{isTrusted:true});assert.equal(f.state.played,0);
  f.setMuted(false);f.shift({...drive,direction:'reverse',power:.5},result,before,after,{isTrusted:true});assert.equal(f.state.played,1);assert.equal(d.oscillators.length,1);assert.equal(d.contexts.length,1);
  f.dispose();await Promise.resolve();assert.equal(f.state.activeSounds,0);assert.equal(f.state.contextState,'closed');
});
