// Synthesised sound only: oscillators and a short noise buffer through a compressor. The context
// is created on the first gesture (browsers require one), and M silences the master bus without
// stopping the game. No audio files, no network, no music library.

export function createAudio() {
  let context = null;
  let master = null;
  let noiseBuffer = null;
  let muted = false;

  function ensure() {
    if (context === null) {
      const AudioCtor = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtor) return null;
      context = new AudioCtor();
      const compressor = context.createDynamicsCompressor();
      compressor.threshold.value = -18;
      compressor.knee.value = 18;
      compressor.ratio.value = 6;
      compressor.attack.value = 0.003;
      compressor.release.value = 0.2;
      compressor.connect(context.destination);
      master = context.createGain();
      master.gain.value = muted ? 0 : 0.42;
      master.connect(compressor);
    }
    if (context.state === 'suspended') context.resume().catch(() => {});
    return context;
  }

  function setMuted(next) {
    muted = next;
    if (master && context) {
      master.gain.cancelScheduledValues(context.currentTime);
      master.gain.linearRampToValueAtTime(muted ? 0 : 0.42, context.currentTime + 0.03);
    }
  }

  function tone(frequency, duration, type, volume, slideTo = 0, delay = 0) {
    const ac = ensure();
    if (!ac || muted) return;
    const start = ac.currentTime + delay;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, start);
    if (slideTo > 0) osc.frequency.exponentialRampToValueAtTime(slideTo, start + duration);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(gain);
    gain.connect(master);
    osc.start(start);
    osc.stop(start + duration + 0.02);
  }

  function noise(duration, volume, lowpass, delay = 0) {
    const ac = ensure();
    if (!ac || muted) return;
    if (noiseBuffer === null) {
      noiseBuffer = ac.createBuffer(1, ac.sampleRate * 0.5, ac.sampleRate);
      const data = noiseBuffer.getChannelData(0);
      let last = 0;
      for (let i = 0; i < data.length; i += 1) {
        last = last * 0.82 + (Math.random() * 2 - 1) * 0.18;
        data[i] = last;
      }
    }
    const start = ac.currentTime + delay;
    const source = ac.createBufferSource();
    source.buffer = noiseBuffer;
    const filter = ac.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = lowpass;
    const gain = ac.createGain();
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    source.start(start);
    source.stop(start + duration + 0.02);
  }

  return {
    unlock() {
      ensure();
    },
    get muted() {
      return muted;
    },
    setMuted,
    jump() {
      tone(300, 0.17, 'triangle', 0.18, 690);
      noise(0.08, 0.05, 1400);
    },
    land() {
      tone(105, 0.1, 'sine', 0.16, 70);
      noise(0.08, 0.05, 500);
    },
    coin(combo = 1) {
      const base = 720 + Math.min(5, combo) * 42;
      tone(base, 0.1, 'sine', 0.14);
      tone(base * 1.5, 0.14, 'triangle', 0.1, 0, 0.055);
    },
    hit() {
      noise(0.28, 0.22, 900);
      tone(150, 0.3, 'sawtooth', 0.16, 55);
    },
    duck() {
      noise(0.16, 0.06, 2200);
      tone(420, 0.1, 'sine', 0.04, 240);
    },
    boost() {
      [660, 830, 990, 1320].forEach((f, i) => tone(f, 0.22, 'triangle', 0.11, f * 1.08, i * 0.055));
      noise(0.3, 0.05, 3600);
    },
    pause() {
      tone(500, 0.08, 'sine', 0.08);
      tone(380, 0.12, 'sine', 0.07, 0, 0.07);
    },
    win() {
      const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5];
      notes.forEach((f, i) => tone(f, 0.32, 'triangle', 0.14, 0, i * 0.12));
    },
    lose() {
      const notes = [392, 349.2, 293.7, 220];
      notes.forEach((f, i) => tone(f, 0.34, 'sawtooth', 0.1, f * 0.94, i * 0.13));
      noise(0.4, 0.06, 600, 0.2);
    },
    click() {
      tone(620, 0.06, 'square', 0.05);
    },
  };
}
