'use strict';

// The sound recorder page (recorder.html): lists every word and sound, shows which still need recording,
// and records, tidies up and saves each one as a .wav file in audio/.

const CLIP_RATE = 22050;     // samples per second: plenty for a voice, and keeps the files small
const canPickFolder = 'showDirectoryPicker' in window; // Chrome and Edge
let serverSaves = false;     // true when the page comes from serve.py, which saves into audio/ itself
let audioDir = null;         // the project's audio folder, once chosen and allowed
let savedAudioDir = null;    // the audio folder chosen on an earlier visit, until it's allowed again
let micStream = null;        // kept open between takes, so recording starts instantly
let recording = null;        // { item, recorder } while the mic is on
let items = [];              // every word and sound: { kind, name, path, ... }
const recorded = new Set();  // clip paths that already have a file
const takes = new Map();     // clip path → new recording (a .wav Blob) not saved yet

const rec = {
  folderBtn: $('folder-btn'), folderName: $('folder-name'), folderStep: $('folder-step'),
  missingOnly: $('missing-only'), status: $('status'), noParts: $('no-parts'),
  wordList: $('word-list'), soundList: $('sound-list'), wordCount: $('word-count'), soundCount: $('sound-count'),
  extraCount: $('extra-count'), tabs: [$('words-tab'), $('sounds-tab')],
};

async function initRecorder() {
  const words = await loadWords();
  const usedBy = {};
  words.forEach((word) => wordSounds(word).forEach((id) => (usedBy[id] ||= []).push(word)));
  const ids = Object.keys(SOUNDS);
  const used = ids.filter((id) => usedBy[id]);

  items = [
    ...words.map((word) => ({ kind: 'word', name: word, path: wordClip(word), parts: wordParts(word) })),
    ...[...used, ...ids.filter((id) => !usedBy[id])]
      .map((id) => ({ kind: 'sound', name: id, path: soundClip(id), sound: SOUNDS[id], usedBy: usedBy[id] || [] })),
  ];

  const noParts = words.filter((word) => !wordParts(word));
  const unknown = [...new Set(words.flatMap(wordSounds).filter((id) => !SOUNDS[id]))];
  rec.noParts.hidden = !noParts.length && !unknown.length;
  rec.noParts.innerHTML = [
    noParts.length && `No sounds listed yet for <b>${noParts.join(', ')}</b>, so “Sound it out” is hidden for
      ${noParts.length === 1 ? 'it' : 'them'}. Add ${noParts.length === 1 ? 'it' : 'them'} to <code>WORD_PARTS</code> in <code>js/phonics.js</code>.`,
    unknown.length && `<code>WORD_PARTS</code> uses sounds that aren't in <code>SOUNDS</code>: <b>${unknown.join(', ')}</b>.`,
  ].filter(Boolean).join('<br>');

  serverSaves = await checkServerSaves();
  if (serverSaves) {
    rec.folderBtn.hidden = true;
    rec.folderStep.hidden = true;
    rec.folderName.textContent = '💾 saves words to audio/words/ and sounds to audio/sounds/.';
  } else if (!canPickFolder) {
    rec.folderBtn.hidden = true;
    rec.folderStep.innerHTML = 'This browser can’t save into folders, so 💾 downloads each file. Move it into <code>audio/words/</code> or <code>audio/sounds/</code> in the project folder (Chrome or Edge can save there for you).';
  }
  rec.folderBtn.addEventListener('click', chooseFolder);
  rec.missingOnly.addEventListener('change', render);
  rec.tabs.forEach((tab) => {
    tab.addEventListener('click', () => showTab(tab));
    tab.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      const other = rec.tabs.find((t) => t !== tab);
      showTab(other);
      other.focus();
    });
  });
  if (canPickFolder && !serverSaves) loadSavedFolder();

  await Promise.all(items.map(async (item) => {
    try {
      const res = await fetch(item.path, { method: 'HEAD', cache: 'no-store' });
      if (res.ok) recorded.add(item.path);
    } catch (e) { /* opened from disk: nothing can be checked */ }
  }));
  render();
}

// ---------- The lists ----------

function render() {
  const missingOnly = rec.missingOnly.checked;
  const words = items.filter((item) => item.kind === 'word');
  const sounds = items.filter((item) => item.kind === 'sound');
  const neededSounds = sounds.filter((item) => item.usedBy.length);
  const done = (list) => list.filter((item) => recorded.has(item.path)).length;

  rec.wordCount.textContent = `${done(words)} of ${words.length}`;
  rec.soundCount.textContent = `${done(neededSounds)} of ${neededSounds.length}`;
  rec.extraCount.textContent = `${done(sounds) - done(neededSounds)} of ${sounds.length - neededSounds.length} recorded`;

  const show = (item) => !missingOnly || !recorded.has(item.path) && (item.kind === 'word' || item.usedBy.length) ||
    item.kind === 'word' && !item.parts || takes.has(item.path);
  rec.wordList.replaceChildren(...words.filter(show).map(row));
  rec.soundList.replaceChildren(...sounds.filter(show).map(row));
}

function row(item) {
  const li = document.createElement('li');
  li.className = item.kind === 'sound' && !item.usedBy.length ? 'extra' : '';
  const isRecording = recording && recording.item === item;
  const take = takes.get(item.path);

  const name = document.createElement('span');
  name.className = 'clip-name';
  name.textContent = item.name;

  const detail = document.createElement('span');
  detail.className = 'clip-detail';
  if (item.kind === 'word') {
    detail.textContent = item.parts
      ? item.parts.map(([letters, id]) => (id ? `${letters} (${id})` : `${letters} (silent)`)).join(' · ')
      : '⚠ No sounds listed, so no “Sound it out”';
  } else {
    detail.textContent = item.sound.as + (item.usedBy.length ? ` · used in ${item.usedBy.join(', ')}` : '');
  }

  const badge = document.createElement('span');
  badge.className = `badge ${recorded.has(item.path) ? 'done' : 'missing'}`;
  badge.textContent = recorded.has(item.path) ? '✅ Recorded' : 'Missing';

  const buttons = document.createElement('span');
  buttons.className = 'clip-buttons';
  buttons.append(
    button(isRecording ? '⏹ Stop' : '🎙 Record', () => (isRecording ? stopRecording() : startRecording(item)), isRecording ? 'rec on' : 'rec'),
    button('▶ Saved', () => playSaved(item), '', !recorded.has(item.path)),
  );
  if (take) buttons.append(button('▶ New', () => playBlob(take)), button('💾 Save', () => saveTake(item), 'save'));

  li.append(name, badge, detail, buttons);
  return li;
}

function showTab(tab) {
  rec.tabs.forEach((t) => {
    const on = t === tab;
    t.setAttribute('aria-selected', String(on));
    t.tabIndex = on ? 0 : -1;
    $(t.getAttribute('aria-controls')).hidden = !on;
  });
}

function button(label, onClick, cls = '', disabled = false) {
  const b = document.createElement('button');
  b.textContent = label;
  b.className = cls;
  b.disabled = disabled;
  b.addEventListener('click', onClick);
  return b;
}

const say = (text) => { rec.status.textContent = text; };

// ---------- Recording ----------

async function startRecording(item) {
  if (recording) stopRecording();
  unlockAudio();
  try {
    micStream ||= await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: false, autoGainControl: false, noiseSuppression: true },
    });
  } catch (e) {
    say('The microphone isn’t available. Allow it for this page and try again.');
    return;
  }
  const recorder = new MediaRecorder(micStream);
  const chunks = [];
  recorder.ondataavailable = (e) => chunks.push(e.data);
  recorder.onstop = async () => {
    try {
      const take = await tidyClip(new Blob(chunks, { type: recorder.mimeType }));
      takes.set(item.path, take);
      say(`Listen back to “${item.name}”, then 💾 Save it or 🎙 Record again.`);
      playBlob(take);
    } catch (e) {
      say(`Didn’t hear anything for “${item.name}”. Try again a little closer to the microphone.`);
    }
    render();
  };
  recorder.start();
  recording = { item, recorder };
  say(`Recording “${item.name}”… tap ⏹ Stop when you’re done.`);
  render();
}

function stopRecording() {
  if (!recording) return;
  recording.recorder.stop();
  recording = null;
  render();
}

// Mono, trimmed of silence at both ends, short fades so there's no click, and evened out in volume.
async function tidyClip(blob) {
  const raw = await decodeClip(await blob.arrayBuffer());
  const mono = new Float32Array(raw.length);
  for (let c = 0; c < raw.numberOfChannels; c++) {
    raw.getChannelData(c).forEach((v, i) => { mono[i] += v / raw.numberOfChannels; });
  }
  const samples = trimSilence(await resample(mono, raw.sampleRate));
  if (!samples) throw new Error('silent');
  const fade = Math.round(CLIP_RATE * 0.01);
  for (let i = 0; i < fade; i++) {
    samples[i] *= i / fade;
    samples[samples.length - 1 - i] *= i / fade;
  }
  const peak = samples.reduce((max, v) => Math.max(max, Math.abs(v)), 0);
  samples.forEach((v, i) => { samples[i] = v * (0.89 / peak); });
  return encodeWav(samples);
}

async function resample(samples, fromRate) {
  const ctx = new OfflineAudioContext(1, Math.ceil(samples.length * CLIP_RATE / fromRate), CLIP_RATE);
  const buffer = ctx.createBuffer(1, samples.length, fromRate);
  buffer.getChannelData(0).set(samples);
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.connect(ctx.destination);
  source.start();
  return (await ctx.startRendering()).getChannelData(0);
}

// Keeps from just before the first loud moment to just after the last, measured in 10 ms steps.
function trimSilence(samples) {
  const step = Math.round(CLIP_RATE * 0.01);
  const levels = [];
  for (let i = 0; i < samples.length; i += step) {
    const chunk = samples.subarray(i, i + step);
    levels.push(Math.sqrt(chunk.reduce((sum, v) => sum + v * v, 0) / chunk.length));
  }
  const loudest = Math.max(...levels);
  if (loudest < 0.005) return null;
  const loud = (level) => level > loudest * 0.08;
  const first = levels.findIndex(loud);
  const last = levels.length - 1 - [...levels].reverse().findIndex(loud);
  const start = Math.max(0, first * step - Math.round(CLIP_RATE * 0.04));
  const end = Math.min(samples.length, (last + 1) * step + Math.round(CLIP_RATE * 0.08));
  return samples.slice(start, end);
}

// 16-bit mono WAV: plays in every browser, with no extra libraries.
function encodeWav(samples) {
  const view = new DataView(new ArrayBuffer(44 + samples.length * 2));
  const text = (at, s) => [...s].forEach((ch, i) => view.setUint8(at + i, ch.charCodeAt(0)));
  text(0, 'RIFF'); view.setUint32(4, 36 + samples.length * 2, true); text(8, 'WAVE');
  text(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
  view.setUint32(24, CLIP_RATE, true); view.setUint32(28, CLIP_RATE * 2, true);
  view.setUint16(32, 2, true); view.setUint16(34, 16, true);
  text(36, 'data'); view.setUint32(40, samples.length * 2, true);
  samples.forEach((v, i) => view.setInt16(44 + i * 2, Math.max(-1, Math.min(1, v)) * 0x7fff, true));
  return new Blob([view], { type: 'audio/wav' });
}

// ---------- Playing and saving ----------

const decodeClip = (data) => new Promise((resolve, reject) => audioCtx.decodeAudioData(data, resolve, reject));

async function playBlob(blob) {
  unlockAudio();
  stopAudio();
  const source = audioCtx.createBufferSource();
  source.buffer = await decodeClip(await blob.arrayBuffer());
  source.connect(audioCtx.destination);
  source.start();
  clipSource = source; // so stopAudio() can stop it
}

async function playSaved(item) {
  const res = await fetch(item.path, { cache: 'no-store' });
  if (res.ok) playBlob(await res.blob());
}

// ---------- The audio folder ----------
// Words save into audio/words/ and sounds into audio/sounds/. Three ways, best first:
// 1. serve.py writes them there itself (any browser).
// 2. Chrome and Edge write into a folder you choose, remembered in IndexedDB so it only needs choosing once.
// 3. Otherwise the file downloads, and you move it.

async function checkServerSaves() {
  try {
    const res = await fetch('words.json', { method: 'HEAD', cache: 'no-store' });
    return res.headers.get('X-Recorder-Save') === '1';
  } catch (e) {
    return false;
  }
}

async function saveToServer(path, take) {
  const res = await fetch(path, { method: 'PUT', body: take, headers: { 'Content-Type': 'audio/wav' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}

function folderStore(mode, use) {
  return new Promise((resolve, reject) => {
    const open = indexedDB.open('sightWords.recorder', 1);
    open.onupgradeneeded = () => open.result.createObjectStore('folders');
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const req = use(open.result.transaction('folders', mode).objectStore('folders'));
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    };
  });
}

async function loadSavedFolder() {
  try {
    const dir = await folderStore('readonly', (store) => store.get('audio'));
    if (!dir) return;
    if (await dir.queryPermission({ mode: 'readwrite' }) === 'granted') useAudioDir(dir);
    else {
      savedAudioDir = dir;
      rec.folderName.textContent = 'Using the folder from last time (💾 asks to allow it again).';
    }
  } catch (e) { /* nothing remembered */ }
}

function useAudioDir(dir) {
  audioDir = dir;
  savedAudioDir = null;
  rec.folderName.textContent = 'Words save to audio/words/, sounds to audio/sounds/.';
}

// The sight-words folder (or its audio folder) both work.
async function chooseFolder() {
  try {
    const dir = await window.showDirectoryPicker({ id: 'sight-words', mode: 'readwrite', startIn: audioDir || savedAudioDir || 'documents' });
    let audio = dir;
    if (dir.name !== 'audio') {
      await dir.getFileHandle('words.json'); // throws if this isn't the project folder
      audio = await dir.getDirectoryHandle('audio', { create: true });
    }
    useAudioDir(audio);
    folderStore('readwrite', (store) => store.put(audio, 'audio')).catch(() => {});
    say('Folder chosen. 💾 now saves straight into it.');
  } catch (e) {
    if (e.name !== 'AbortError') say('That folder has no words.json. Pick the sight-words project folder.');
  }
}

async function saveTake(item) {
  const take = takes.get(item.path);
  const folder = item.kind === 'word' ? 'words' : 'sounds';
  const fileName = `${item.name}.wav`;
  if (serverSaves) {
    try {
      await saveToServer(item.path, take);
      recorded.add(item.path);
      say(`Saved audio/${folder}/${fileName}.`);
      takes.delete(item.path);
      render();
      return;
    } catch (e) {
      say('Couldn’t save. Is serve.py still running?');
      return;
    }
  }
  if (!audioDir && savedAudioDir && await savedAudioDir.requestPermission({ mode: 'readwrite' }) === 'granted') {
    useAudioDir(savedAudioDir);
  }
  if (!audioDir && canPickFolder) await chooseFolder(); // asks once, instead of downloading
  if (audioDir) {
    const dir = await audioDir.getDirectoryHandle(folder, { create: true });
    const writable = await (await dir.getFileHandle(fileName, { create: true })).createWritable();
    await writable.write(take);
    await writable.close();
    recorded.add(item.path);
    say(`Saved audio/${folder}/${fileName}.`);
  } else {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(take);
    link.download = fileName;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
    say(`Downloaded ${fileName}. Move it into audio/${folder}/ in the project folder.`);
  }
  takes.delete(item.path);
  render();
}

initRecorder();
