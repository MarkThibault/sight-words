'use strict';

// Playing the recordings in audio/, so words and sounds are the same voice on every device.
// Anything not recorded yet (or a browser that can't play the files) falls back to the device's voice.

const AudioCtx = window.AudioContext || window.webkitAudioContext;
const audioCtx = AudioCtx ? new AudioCtx() : null;
const clips = new Map();     // clip path → Promise of its AudioBuffer, or null if there's no recording
let clipSource = null;       // the recording playing now
let audioRun = 0;            // counts stops, so a clip that finishes loading late knows not to play

const wordClip = (word) => `audio/words/${encodeURIComponent(word)}.wav`;
const soundClip = (id) => `audio/sounds/${id}.wav`;

function loadClip(path) {
  if (!audioCtx) return Promise.resolve(null);
  if (!clips.has(path)) {
    clips.set(path, fetch(`${path}?v=${APP_VERSION}`)
      .then((res) => (res.ok ? res.arrayBuffer() : null))
      // The callback form of decodeAudioData also works on older iPads.
      .then((data) => data && new Promise((resolve, reject) => audioCtx.decodeAudioData(data, resolve, reject)))
      .catch(() => null));
  }
  return clips.get(path);
}

// Loads the clips for these words and their sounds ahead of time, so taps play right away.
// Each clip loads only once; asking again reuses it.
function preloadClips(words) {
  words.forEach((word) => {
    loadClip(wordClip(word));
    wordSounds(word).forEach((id) => loadClip(soundClip(id)));
  });
}

// iPads only allow sound to start from a tap, so this runs at the start of every tap that plays something.
function unlockAudio() {
  if (audioCtx && audioCtx.state !== 'running') audioCtx.resume();
}

// Plays a recording, or says `fallback` with the device's voice. `then` runs once it has finished.
async function playClip(path, fallback, { rate, then } = {}) {
  unlockAudio();
  stopAudio();
  const run = audioRun;
  const buffer = await loadClip(path);
  if (run !== audioRun) return;
  if (buffer) {
    clipSource = audioCtx.createBufferSource();
    clipSource.buffer = buffer;
    clipSource.connect(audioCtx.destination);
    clipSource.onended = () => {
      clipSource = null;
      if (run === audioRun && then) then();
    };
    clipSource.start();
  } else {
    sayThen(fallback, rate, () => run === audioRun && then && then());
  }
}

// The timeout keeps things going on browsers that never report the end of speech.
function sayThen(text, rate, then) {
  let done = false;
  const go = () => {
    if (done) return;
    done = true;
    then();
  };
  speak(text, { rate, onEnd: go });
  setTimeout(go, 4000);
}

// A soft falling "boop" for a wrong answer, made here so it needs no recording. `then` runs once it has finished.
function playIncorrectSound(then) {
  unlockAudio();
  stopAudio();
  if (!audioCtx) {
    then();
    return;
  }
  const run = audioRun;
  const start = audioCtx.currentTime;
  const tone = audioCtx.createOscillator();
  const volume = audioCtx.createGain();
  tone.type = 'sine';
  tone.frequency.setValueAtTime(330, start);
  tone.frequency.exponentialRampToValueAtTime(220, start + 0.28);
  volume.gain.setValueAtTime(0.0001, start);
  volume.gain.exponentialRampToValueAtTime(0.2, start + 0.03);
  volume.gain.exponentialRampToValueAtTime(0.0001, start + 0.3);
  tone.connect(volume);
  volume.connect(audioCtx.destination);
  clipSource = tone;
  tone.onended = () => {
    clipSource = null;
    if (run === audioRun) then();
  };
  tone.start(start);
  tone.stop(start + 0.32);
}

const sayWord = (word, then) => playClip(wordClip(word), word, { then });
const saySound = (id, then) => playClip(soundClip(id), SOUNDS[id] ? SOUNDS[id].say : '', { rate: SOUND_RATE, then });

function stopAudio() {
  audioRun += 1;
  if (clipSource) {
    clipSource.onended = null;
    clipSource.stop();
    clipSource = null;
  }
  stopSpeaking();
}
