// Small WebAudio presentation. Whistle/chime are original approximations.
// Compact click envelope adapts Tinderbox fb0628605c274550ff8abad50b151843f08747d1.
import {compactNotchOf} from './compact-model.js';
const identity = s => s && JSON.stringify([s.actorId, s.mode, s.trainId, s.carId, s.cabFacing, s.train?.stock, s.expected?.occupancyRevision]);
export function createTrainFeedback(win, {muted = false} = {}) {
  let context = null, master = null, disposed = false, unlocked = false, contextState = 'not-created';
  let previous = null, armed = null, lastCue = null, played = 0, soundedDeparture = null;
  const sources = new Set();
  function unlock(event) {
    if (disposed || muted || !event?.isTrusted) return;
    unlocked = true;
    try {
      if (!context) {
        const Audio = win.AudioContext || win.webkitAudioContext;if (!Audio) return;
        context = new Audio();master = context.createGain();master.gain.value = .055;master.connect(context.destination);contextState = context.state;
      }
      if (context.state === 'suspended') context.resume().then(() => { if (!disposed) contextState = context.state; }).catch(() => {});
    } catch { contextState = 'unavailable'; }
  }
  function stopSources() { for (const source of [...sources]) { try { source.stop(); } catch {}try { source.disconnect(); } catch {}sources.delete(source); } }
  function tone(frequency, start, duration, kind, gain, drop = null) {
    const oscillator = context.createOscillator(), envelope = context.createGain();
    oscillator.type = kind;oscillator.frequency.setValueAtTime(frequency, start);
    if (drop) oscillator.frequency.exponentialRampToValueAtTime(drop,start+.035);
    else if (kind === 'triangle') oscillator.frequency.linearRampToValueAtTime(frequency * 1.035, start + .15);
    envelope.gain.setValueAtTime(0, start);envelope.gain.linearRampToValueAtTime(gain, start + (drop ? .004 : .035));
    envelope.gain.setValueAtTime(gain * .8, start + duration * .55);envelope.gain.linearRampToValueAtTime(0, start + duration);
    oscillator.connect(envelope);envelope.connect(master);sources.add(oscillator);
    oscillator.onended = () => { oscillator.disconnect();envelope.disconnect();sources.delete(oscillator); };
    oscillator.start(start);oscillator.stop(start + duration + .01);
  }
  function play(cue) {
    if (disposed || muted || !unlocked || !context || context.state !== 'running') return;
    const now = context.currentTime;
    try {
      if (cue === 'steam-departure') { tone(392, now, .58, 'triangle', .45);tone(493.88, now, .57, 'triangle', .28);tone(587.33, now, .54, 'sine', .2); }
      else if (cue === 'steam-shift') tone(850,now,.045,'triangle',.6,120);
      else { tone(cue === 'electric-boarded' ? 880 : 1174.66, now, .13, 'sine', .6);tone(cue === 'electric-boarded' ? 1174.66 : 880, now + .135, .16, 'sine', .45); }
      lastCue = cue;played++;return true;
    } catch { stopSources();return false; }
  }
  function cancelInput() { armed = null; }
  function observe(snapshot) {
    if (disposed) return;
    const same = armed && identity(snapshot) === armed.context && snapshot.train?.controls.leaseId === armed.leaseId;
    if (armed && !same) armed = null;
    if (same && previous?.train?.stopped && !snapshot.train.stopped && snapshot.train.speedMps > 0 && snapshot.train.stock === 'steam') {
      const departure = JSON.stringify([snapshot.actorId, snapshot.trainId, snapshot.expected.occupancyRevision]);
      if (soundedDeparture !== departure && play('steam-departure')) soundedDeparture = departure;
      armed = null;
    }
    previous = snapshot;
  }
  function committed(command, result, before, after) {
    if (disposed || !result?.committed || result.repeated || !before || !after || command.actorId !== before.actorId || command.actorId !== after.actorId) return;
    if (command.type === 'enter' && before.mode === 'on-foot' && after.mode !== 'on-foot' && after.trainId === command.trainId && after.carId === command.carId && after.train?.stock === 'electric') play('electric-boarded');
    if (command.type === 'exit' && before.mode !== 'on-foot' && after.mode === 'on-foot' && before.train?.stock === 'electric') play('electric-exited');
    if (command.type === 'drive' && after.mode === 'driver' && after.train?.stock === 'steam' && after.train.stopped && after.train.controls.leaseId === command.leaseId && after.train.controls.power > 0 && after.train.controls.brake === 0 && after.train.controls.direction !== 'neutral' && command.power > 0 && command.brake === 0 && command.direction !== 'neutral') {
      armed = {context: identity(after), leaseId: command.leaseId};
    }
  }
  function shift(command,result,before,after,event) {
    if (!event?.isTrusted || !result?.committed || result.repeated || command.type !== 'drive' || !before || !after || identity(before) !== identity(after) || command.actorId !== after.actorId || after.mode !== 'driver' || after.train?.stock !== 'steam') return;
    const controls = after.train.controls;
    if (controls.leaseId !== command.leaseId || controls.direction !== command.direction || controls.power !== command.power || controls.brake !== command.brake || compactNotchOf(before.train?.controls) === compactNotchOf(controls)) return;
    play('steam-shift');
  }
  return Object.freeze({unlock, observe, committed, shift, cancelInput,
    setMuted(value) { muted = !!value;if (muted) { armed = null;stopSources(); }if (master && context) master.gain.setValueAtTime(muted ? 0 : .055, context.currentTime); },
    get state() { return Object.freeze({muted, unlocked, played, lastCue, activeSounds: sources.size, contextState: disposed ? contextState : context?.state || contextState}); },
    dispose() { if (disposed) return;disposed = true;armed = null;stopSources();try { master?.disconnect(); } catch {}if (context) { contextState = 'closing';context.close().then(() => { contextState = 'closed'; }).catch(() => { contextState = 'unavailable'; }); } }
  });
}
