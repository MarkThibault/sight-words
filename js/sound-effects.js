'use strict';

// Sound effects, made here from tones and noise so they need no recordings (like the wrong-answer boop in audio.js).
// Hear them all, and try new ones, on the developer sound page: sounds.html, from the 🛠️ button on localhost.

// Every effect goes through one volume control, set by SOUND_EFFECTS_VOLUME in config.js.
let effectsOut = null;
function effectsOutput() {
  if (!effectsOut) {
    effectsOut = audioCtx.createGain();
    effectsOut.gain.value = SOUND_EFFECTS_VOLUME;
    effectsOut.connect(audioCtx.destination);
  }
  return effectsOut;
}

// ---------- Building blocks ----------
// Each one starts at `t`, in seconds on audioCtx's clock.

// One note with a quick start and a bell-like fade. `slideTo` bends it to another pitch on the way.
function effectNote(t, freq, length, { type = 'sine', volume = 0.2, slideTo } = {}) {
  const tone = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  tone.type = type;
  tone.frequency.setValueAtTime(freq, t);
  if (slideTo) tone.frequency.exponentialRampToValueAtTime(slideTo, t + length);
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(volume, t + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + length);
  tone.connect(gain).connect(effectsOutput());
  tone.start(t);
  tone.stop(t + length + 0.02);
}

// A short burst of noise around one pitch: a click, a clack or a pat.
let noiseBuffer = null;
function effectNoise(t, length, { freq = 2500, q = 1.5, volume = 0.5 } = {}) {
  if (!noiseBuffer) {
    noiseBuffer = audioCtx.createBuffer(1, audioCtx.sampleRate * 0.5, audioCtx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }
  const source = audioCtx.createBufferSource();
  source.buffer = noiseBuffer;
  const filter = audioCtx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = freq;
  filter.Q.value = q;
  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(volume, t);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + length);
  source.connect(filter).connect(gain).connect(effectsOutput());
  source.start(t, Math.random() * 0.3); // a different stretch of noise each time
  source.stop(t + length + 0.02);
}

// Many tiny clicks close together, like Velcro letting go. It's random, so it sounds a little different each time.
// `shape` sets how busy it is along the way (0 to 1 in, 0 to 1 out), the pitch sweeps from `from` to `to`,
// and `hiss` adds a steady rustle under the clicks.
function effectCrackle(t, length, { perSecond = 600, shape = () => 1, from = 3000, to = 3000, volume = 0.5, hiss = 0 } = {}) {
  const rate = audioCtx.sampleRate;
  const buffer = audioCtx.createBuffer(1, Math.ceil(rate * length), rate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    const busy = shape(i / data.length);
    if (Math.random() < (perSecond * busy) / rate) {
      const size = 0.4 + Math.random() * 0.6;
      const clickLength = Math.floor(rate * (0.0006 + Math.random() * 0.0012));
      for (let j = 0; j < clickLength && i + j < data.length; j++) data[i + j] += size * (Math.random() * 2 - 1) * (1 - j / clickLength);
    }
    data[i] += hiss * (Math.random() * 2 - 1) * busy;
  }
  const source = audioCtx.createBufferSource();
  source.buffer = buffer;
  const filter = audioCtx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.Q.value = 0.8;
  filter.frequency.setValueAtTime(from, t);
  filter.frequency.exponentialRampToValueAtTime(to, t + length);
  const gain = audioCtx.createGain();
  gain.gain.value = volume;
  source.connect(filter).connect(gain).connect(effectsOutput());
  source.start(t);
}

// A soft, low, muffled pat, like setting something down on a table.
function effectThump(t, { freq = 140, volume = 0.3, length = 0.07 } = {}) {
  effectNote(t, freq, length, { slideTo: freq * 0.6, volume });
  effectNoise(t, length * 0.8, { freq: 500, q: 0.7, volume: volume * 0.8 });
}

// The 🎲 animation (roll in style.css) lands at about 52%, 78% and 100% of its 0.9 seconds.
const DICE_LANDINGS = [0.47, 0.70, 0.86];

// ---------- The effects ----------
// `play` starts the effect at `t` and returns how long it lasts, in seconds.

const SOUND_EFFECTS = {
  correct: {
    label: '✅ Right answer',
    where: 'Listen & tap, and finishing a word in Build the word, just before the word is said',
    play(t) {
      // two soft round notes going up: the wrong-answer boop's happy twin
      effectNote(t, 392, 0.16, { volume: 0.22 });
      effectNote(t + 0.12, 587, 0.28, { volume: 0.22 });
      return 0.4;
    },
  },
  starEarned: {
    label: '⭐ New star',
    where: 'I know it! on a word without a star yet',
    play(t) {
      [1047, 1319, 1568, 2093].forEach((freq, i) => effectNote(t + i * 0.06, freq, 0.6, { volume: 0.14 }));
      [2637, 3136].forEach((freq, i) => effectNote(t + 0.26 + i * 0.08, freq, 0.4, { volume: 0.06 }));
      return 0.75;
    },
  },
  medal: {
    label: '🥇 Medal',
    where: 'The home screen after a game of Listen & tap or Build the word',
    play(t) {
      [[523, 0, 0.14], [659, 0.13, 0.14], [784, 0.26, 0.14], [1047, 0.39, 0.6]]
        .forEach(([freq, at, length]) => effectNote(t + at, freq, length, { type: 'triangle' }));
      return 1;
    },
  },
  trophy: {
    label: '🏆 New trophy',
    where: 'The home screen after a game that earns a trophy, in place of the medal sound',
    play(t) {
      [[523, 0, 0.12], [523, 0.12, 0.12], [523, 0.24, 0.12], [659, 0.36, 0.3], [784, 0.62, 0.14], [1047, 0.76, 0.8]]
        .forEach(([freq, at, length]) => effectNote(t + at, freq, length, { type: 'triangle' }));
      effectNote(t + 0.76, 523, 0.8, { type: 'triangle', volume: 0.1 }); // the last note is a chord
      effectNote(t + 0.76, 659, 0.8, { type: 'triangle', volume: 0.1 });
      return 1.6;
    },
  },
  diceRoll: {
    label: '🎲 Dice',
    where: 'The 🎲 button, which shuffles the stickers',
    play(t) {
      [0.02, 0.07, 0.11, 0.16, 0.22, 0.27].forEach((at) => effectNoise(t + at, 0.03, { freq: 3200, volume: 0.25 }));
      DICE_LANDINGS.forEach((at, i) => effectNoise(t + at, 0.06, { freq: 1800, q: 2, volume: 0.6 - i * 0.18 }));
      return 0.9;
    },
  },
  stickerUp: {
    label: '🐶 Sticker picked up',
    where: 'Dragging a sticker on the home screen',
    play(t) {
      // a short brush, like smoothing tape: it starts busy and fades
      effectCrackle(t, 0.14, { perSecond: 200, shape: (p) => 1 - p, from: 1200, to: 900, volume: 0.4, hiss: 0.4 });
      return 0.14;
    },
  },
  stickerDown: {
    label: '🐶 Sticker put down',
    where: 'Letting go of a dragged sticker',
    play(t) {
      effectThump(t, { freq: 120, length: 0.09 });
      return 0.1;
    },
  },
};

// Plays an effect over whatever else is playing. With `then`, other sounds stop first and `then` runs
// once it has finished, the way a word's recording does.
function playEffect(name, then) {
  unlockAudio();
  if (then) stopAudio();
  if (!audioCtx) {
    if (then) then();
    return;
  }
  const run = audioRun;
  const length = SOUND_EFFECTS[name].play(audioCtx.currentTime + 0.02);
  // A timer, not the sound ending, so a game never waits on audio the browser hasn't started.
  if (then) setTimeout(() => { if (run === audioRun) then(); }, length * 1000);
}
