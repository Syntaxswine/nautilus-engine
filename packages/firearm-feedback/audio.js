const maxVoices = 12;

// Small nonspatial binding. The host supplies decoded clips and owns the audio
// context, destination, volume, and the decision to resume the context.
export function createFirearmAudio({context, destination = context?.destination, getClip} = {}) {
  if (typeof context?.createBufferSource !== 'function' || typeof context?.createGain !== 'function' ||
      !destination || typeof getClip !== 'function') {
    throw TypeError('Supply a borrowed AudioContext, destination, and getClip(cueId).');
  }
  const voices = new Set();
  let disposed = false;

  function retire(voice, stop) {
    voices.delete(voice);
    voice.source.onended = null;
    try {
      if (stop) voice.source.stop();
    } finally {
      try {
        voice.source.disconnect();
      } finally {
        voice.gain.disconnect();
      }
    }
  }

  return Object.freeze({
    playCue({cueId, delaySeconds, priority}) {
      if (disposed || context.state === 'closed') return false;
      const clip = getClip(cueId);
      if (!clip) return false;
      const source = context.createBufferSource(), gain = context.createGain();
      const voice = {source, gain, priority};
      try {
        source.buffer = clip;
        gain.gain.value = priority < 1 ? .45 : 1;
        source.connect(gain);
        gain.connect(destination);
        if (voices.size >= maxVoices) {
          let oldest;
          for (const candidate of voices) {
            if (!oldest || candidate.priority < oldest.priority) oldest = candidate;
          }
          if (oldest.priority > priority) {
            retire(voice, false);
            return false;
          }
          retire(oldest, true);
        }
        source.onended = () => retire(voice, false);
        source.start(context.currentTime + delaySeconds);
        voices.add(voice);
        return true;
      } catch (error) {
        retire(voice, false);
        throw error;
      }
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      const errors = [];
      for (const voice of voices) {
        try { retire(voice, true); } catch (error) { errors.push(error); }
      }
      if (errors.length) throw new AggregateError(errors, 'Failed to retire one or more firearm audio voices.');
    }
  });
}
