// Every sound is synthesised with WebAudio: no audio files, nothing fetched.
// The context starts on the first user gesture (browsers block audio before
// one), and every call is guarded so a game without audio still plays.

export function createAudio() {
  let context = null;
  let master = null;
  let beamOscillator = null;
  let beamGain = null;
  let muted = false;

  function ensure() {
    if (context) {
      if (context.state === 'suspended') context.resume().catch(() => {});
      return context;
    }
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return null;
      context = new AudioContext();
      master = context.createGain();
      master.gain.value = muted ? 0 : 0.5;
      master.connect(context.destination);
    } catch {
      context = null;
    }
    return context;
  }

  /** A short tone that slides from `fromHz` to `toHz` over `seconds`. */
  function blip(fromHz, toHz, seconds, volume, type = 'sine') {
    const ctx = ensure();
    if (!ctx || !master) return;
    try {
      const now = ctx.currentTime;
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(fromHz, now);
      oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, toHz), now + seconds);
      gain.gain.setValueAtTime(volume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + seconds);
      oscillator.connect(gain).connect(master);
      oscillator.start(now);
      oscillator.stop(now + seconds + 0.02);
    } catch {
      // Sound is garnish: never let it break the game.
    }
  }

  /** A burst of filtered noise, for hits and the shockwave. */
  function noise(seconds, volume, filterHz) {
    const ctx = ensure();
    if (!ctx || !master) return;
    try {
      const now = ctx.currentTime;
      const length = Math.max(1, Math.floor(ctx.sampleRate * seconds));
      const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = filterHz;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(volume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + seconds);
      source.connect(filter).connect(gain).connect(master);
      source.start(now);
    } catch {
      // Ignore.
    }
  }

  function setBeamHum(on) {
    const ctx = ensure();
    if (!ctx || !master) return;
    try {
      if (on && !beamOscillator) {
        beamOscillator = ctx.createOscillator();
        beamGain = ctx.createGain();
        beamOscillator.type = 'sawtooth';
        beamOscillator.frequency.value = 58;
        beamGain.gain.value = 0;
        beamGain.gain.linearRampToValueAtTime(0.05, ctx.currentTime + 0.08);
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 320;
        beamOscillator.connect(filter).connect(beamGain).connect(master);
        beamOscillator.start();
      } else if (!on && beamOscillator) {
        const oscillator = beamOscillator;
        const gain = beamGain;
        beamOscillator = null;
        beamGain = null;
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.06);
        oscillator.stop(ctx.currentTime + 0.08);
      }
    } catch {
      // Ignore.
    }
  }

  return {
    /** Call from a click or key press so the browser allows sound. */
    unlock() {
      ensure();
    },
    toggleMute() {
      muted = !muted;
      if (master && context) master.gain.value = muted ? 0 : 0.5;
      return muted;
    },
    isMuted() {
      return muted;
    },
    setBeamHum,
    kill(combo) {
      blip(340 + combo * 60, 140, 0.12, 0.22, 'triangle');
    },
    ember() {
      blip(880, 1320, 0.1, 0.14, 'sine');
    },
    hurt() {
      noise(0.18, 0.3, 400);
      blip(120, 55, 0.22, 0.25, 'square');
    },
    waveHorn() {
      blip(196, 196, 0.32, 0.18, 'triangle');
      setTimeout(() => blip(262, 262, 0.4, 0.18, 'triangle'), 140);
    },
    upgrade() {
      blip(523, 784, 0.16, 0.16, 'sine');
      setTimeout(() => blip(784, 1046, 0.2, 0.16, 'sine'), 90);
    },
    pulse() {
      noise(0.35, 0.32, 900);
      blip(220, 60, 0.3, 0.2, 'sine');
    },
    /** The boss arriving: a low grinding roar, nothing like the wave horn. */
    roar() {
      noise(0.5, 0.3, 220);
      blip(90, 42, 0.55, 0.26, 'sawtooth');
    },
    /** A wave cleared: two bright notes before the upgrade choice opens. */
    waveClear() {
      blip(659, 659, 0.12, 0.15, 'sine');
      setTimeout(() => blip(880, 880, 0.2, 0.15, 'sine'), 110);
    },
    click() {
      blip(660, 520, 0.06, 0.12, 'sine');
    },
    victory() {
      [523, 659, 784, 1046].forEach((hz, i) => setTimeout(() => blip(hz, hz, 0.28, 0.18, 'triangle'), i * 130));
    },
    defeat() {
      [330, 262, 196, 131].forEach((hz, i) => setTimeout(() => blip(hz, hz * 0.94, 0.34, 0.16, 'triangle'), i * 170));
    },
  };
}
