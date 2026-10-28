'use strict';

// ---------- Settings ----------
const STORAGE_KEY = 'sightWords.progress.v1';
const SPEECH_RATE = 0.9;     // a little slower than normal speech (much slower sounds robotic)
const VOICE_KEY = 'sightWords.voice.v1';
const CHEERS = ['Great job!', 'Awesome!', 'You did it!', 'Super reader!', 'Way to go!', 'Fantastic!'];
const STICKER_COLORS = ['#e03131', '#e8590c', '#e67700', '#2f9e44', '#0c8599', '#1971c2', '#7048e8', '#c2255c'];
// Surprise stickers: one is picked at random when a word is learned, then saved with that word.
const STICKER_EMOJI = [
  '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🐔',
  '🐧', '🐤', '🦉', '🐴', '🦄', '🐝', '🐞', '🦋', '🐢', '🐙', '🦀', '🐠', '🐬', '🐳', '🦕', '🦖',
  '🦒', '🦓', '🐘', '🦔', '🍎', '🍌', '🍉', '🍓', '🍒', '🍍', '🥕', '🌽', '🍕', '🍩', '🍪', '🧁',
  '🍦', '🍭', '🎂', '🌈', '🌞', '🌙', '🌻', '🌸', '⛄', '🚀', '🚗', '🚒', '🚌', '🚂', '🚁', '⛵',
  '🚜', '⚽', '🏀', '🎈', '🎁', '🎨', '🧸', '🥁', '👑'];
const CONFETTI_COLORS = ['#ff6b6b', '#ffa94d', '#ffd43b', '#69db7c', '#4dabf7', '#9775fa', '#f783ac'];
// Only used if words.json can't be loaded (for example, when index.html is opened straight from disk).
const FALLBACK_WORDS = ['was', 'you', 'me', 'like', 'my', 'yes', 'for', 'see', 'as', 'the', 'can', 'he',
  'go', 'at', 'up', 'with', 'and', 'a', 'we', 'I', 'be', 'are', 'to', 'on'];

const $ = (id) => document.getElementById(id);
const els = {
  home: $('home'), practice: $('practice'), board: $('sticker-board'), homeCenter: $('home-center'),
  start: $('start-btn'), missingBtn: $('missing-btn'), timedBtn: $('timed-btn'), bestTime: $('best-time'),
  stickerHint: $('sticker-hint'), progress: $('progress'),
  homeBtn: $('home-btn'), timer: $('timer'), mini: $('progress-mini'),
  roundBar: $('round-bar'), roundFill: $('round-fill'), card: $('card'), word: $('word'), star: $('card-star'),
  hint: $('hint'), know: $('know-btn'), next: $('next-btn'), toast: $('toast'),
  panel: $('parent-panel'), panelSummary: $('panel-summary'), panelList: $('panel-list'),
  panelClose: $('panel-close'), reset: $('reset-btn'),
  voiceSection: $('voice-section'), voiceSelect: $('voice-select'), voiceTest: $('voice-test'),
};
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const canSpeak = 'speechSynthesis' in window;

let words = [];
let progress = loadProgress();
let deck = [];
let current = null;
let heardCurrent = false;    // has the current word been heard since it was shown?
let newStickers = [];        // stickers earned since the home screen was last shown
let busy = false;            // true while the "I know it!" animation plays
let round = null;            // the round being played: { mode: 'all' | 'missing', timed, total, learned, startedAt }
let lastRound = null;        // the round just finished, summarized on the home screen
let timerId = null;

// ---------- Saved progress ----------
// Shape: { words: { the: { heard: 3, known: true, knownAt: 1729700000000, lastSeen: "2026-10-23" } },
//          bestTime: { ms: 95000, count: 24 } }

function loadProgress() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (data && data.words && typeof data.words === 'object') return data;
  } catch (e) { /* storage blocked or corrupt: start fresh */ }
  return { words: {} };
}

function saveProgress() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(progress)); } catch (e) { /* ignore */ }
}

function stats(word) {
  if (!progress.words[word]) progress.words[word] = { heard: 0, known: false, knownAt: 0, lastSeen: null };
  return progress.words[word];
}

const knownWords = () => words.filter((w) => stats(w).known).sort((a, b) => stats(a).knownAt - stats(b).knownAt);
// The word's saved sticker, picking a surprise one first if it doesn't have one yet.
// Prefers emoji not already on the board, so stickers repeat only once every one is used.
function stickerFor(word) {
  const s = stats(word);
  if (!s.sticker) {
    const used = new Set(words.map((w) => stats(w).sticker));
    const unused = STICKER_EMOJI.filter((e) => !used.has(e));
    const pool = unused.length ? unused : STICKER_EMOJI;
    s.sticker = pool[Math.floor(Math.random() * pool.length)];
    saveProgress();
  }
  return s.sticker;
}

const missingWords = () => words.filter((w) => !stats(w).known);

// A best time only counts for a word list of the same size, so adding words starts a fresh record.
function bestTime() {
  const best = progress.bestTime;
  return best && best.count === words.length ? best.ms : null;
}
const today = () => new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD in local time

// ---------- Word list ----------

async function loadWords() {
  try {
    const res = await fetch('words.json', { cache: 'no-cache' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return cleanList(await res.json());
  } catch (e) {
    console.warn('Could not load words.json, using the built-in list.', e);
    return cleanList(FALLBACK_WORDS);
  }
}

function cleanList(list) {
  const seen = new Set();
  return list.map((w) => String(w).trim()).filter((w) => w && !seen.has(w) && seen.add(w));
}

function shuffle(arr, rand = Math.random) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ---------- Speech ----------

let voice = null;

// Apple's joke voices, and older voices that sound robotic. Matched by name since names vary by device.
const NOVELTY_VOICES = /\b(albert|bad news|bahh|bells|boing|bubbles|cellos|good news|jester|organ|superstar|trinoids|whisper|wobble|zarvox)\b/i;
const ROBOTIC_VOICES = /\b(fred|junior|ralph|kathy|eddy|flo|grandma|grandpa|reed|rocko|sandy|shelley|desktop)\b/i;

// Higher score = more natural sounding.
function voiceScore(v) {
  let score = 0;
  if (/^en[-_]US/i.test(v.lang)) score += 3;
  if (/natural|neural|enhanced|premium/i.test(v.name)) score += 6; // Edge "Natural", iPad "Enhanced"
  if (/^google/i.test(v.name)) score += 4;                          // Chrome / Android
  if (/\b(ava|samantha|allison|susan|zoe|jenny|aria|michelle|emma)\b/i.test(v.name)) score += 2;
  if (ROBOTIC_VOICES.test(v.name)) score -= 4;
  if (NOVELTY_VOICES.test(v.name)) score -= 20;
  return score;
}

function englishVoices() {
  return speechSynthesis.getVoices()
    .filter((v) => /^en([-_]|$)/i.test(v.lang))
    .sort((a, b) => voiceScore(b) - voiceScore(a) || a.name.localeCompare(b.name));
}

function savedVoiceURI() {
  try { return localStorage.getItem(VOICE_KEY); } catch (e) { return null; }
}

// Use the voice chosen in the grown-up corner, otherwise the best-sounding one on this device.
function pickVoice() {
  const voices = englishVoices();
  const saved = savedVoiceURI();
  voice = voices.find((v) => v.voiceURI === saved) || voices[0] || null;
  if (els.panel.open) renderVoiceOptions();
}

function speak(text) {
  if (!canSpeak) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  if (voice) u.voice = voice;
  u.lang = voice ? voice.lang : 'en-US';
  u.rate = SPEECH_RATE;
  speechSynthesis.speak(u);
}

// ---------- Rounds ----------

// A round goes through each word once (or each word without a star yet), then returns home.
function startRound(mode, timed = false) {
  const list = mode === 'missing' ? missingWords() : words;
  if (list.length === 0) return;
  deck = shuffle(list);
  round = { mode, timed, total: deck.length, learned: [], startedAt: performance.now() };
  lastRound = null;
  els.timer.hidden = !timed;
  els.roundBar.setAttribute('aria-valuemax', String(round.total));
  showScreen('practice');
  showWord();
  if (timed) {
    updateTimer();
    timerId = setInterval(updateTimer, 250);
  }
  if (!canSpeak) showToast('This browser can’t read words aloud 😕');
}

function finishRound() {
  const done = round;
  stopRound();
  lastRound = { mode: done.mode, total: done.total, learned: done.learned };
  if (done.timed) {
    const ms = Math.round(performance.now() - done.startedAt);
    const best = bestTime();
    Object.assign(lastRound, { ms, best, newBest: best === null || ms < best });
    if (lastRound.newBest) {
      progress.bestTime = { ms, count: words.length };
      saveProgress();
    }
  }
  showScreen('home');
  confetti();
}

// Leaving mid-round (the 🏠 button) just drops the round: no summary, no time recorded.
function stopRound() {
  clearInterval(timerId);
  timerId = null;
  round = null;
  current = null;
  deck = [];
  if (canSpeak) speechSynthesis.cancel();
}

function updateTimer() {
  if (round) els.timer.textContent = `⏱ ${formatTime(performance.now() - round.startedAt)}`;
}

function formatTime(ms) {
  const secs = Math.floor(ms / 1000);
  return `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;
}

// ---------- Practice screen ----------

function showWord() {
  if (!round) return;
  if (deck.length === 0) {
    finishRound();
    return;
  }
  current = deck.shift();
  const position = round.total - deck.length;
  els.roundFill.style.width = `${(position / round.total) * 100}%`;
  els.roundBar.setAttribute('aria-valuenow', String(position));
  heardCurrent = false;

  els.word.textContent = current;
  els.word.style.setProperty('--len', current.length);
  fitWord();
  els.card.setAttribute('aria-label', `${current}. Tap to hear it.`);

  const s = stats(current);
  s.lastSeen = today();
  saveProgress();
  els.star.hidden = !s.known;
  els.hint.classList.remove('off');
  setButtonsDisabled(false);
  setNextLocked(true);
  playAnim(els.card, 'slide-in');
}

// Start from the big CSS size and shrink only if the word is wider than the card.
function fitWord() {
  els.word.style.fontSize = '';
  const room = els.card.clientWidth - 48;
  const width = els.word.getBoundingClientRect().width;
  if (width > room) {
    const size = parseFloat(getComputedStyle(els.word).fontSize);
    els.word.style.fontSize = `${Math.floor(size * room / width)}px`;
  }
}

function hearWord() {
  speak(current);
  playAnim(els.card, 'bounce');

  const s = stats(current);
  s.heard += 1;
  saveProgress();
  els.hint.classList.add('off');
  heardCurrent = true;
  setNextLocked(false);
}

function knowIt() {
  if (busy) return;
  if (!heardCurrent) hearWord(); // knowing it still counts as hearing it

  const s = stats(current);
  if (!s.known) {
    s.known = true;
    s.knownAt = Date.now();
    saveProgress();
    newStickers.push(current);
    round.learned.push(current);
    flySticker(current);
    els.star.hidden = false;
    playAnim(els.star, 'pop');
    updateCounters();
    showToast(`New sticker! ${stickerFor(current)}`);
  } else {
    showToast(randomCheer());
  }
  confetti();

  busy = true;
  setButtonsDisabled(true);
  setTimeout(() => { busy = false; showWord(); }, 1200);
}

function setButtonsDisabled(disabled) {
  els.know.disabled = disabled;
  els.next.disabled = disabled;
}

// Next stays tappable while locked so a tap can nudge toward the word instead of doing nothing.
function setNextLocked(locked) {
  els.next.classList.toggle('locked', locked);
  els.next.setAttribute('aria-disabled', String(locked));
}

function goNext() {
  if (busy) return;
  if (!heardCurrent) {
    playAnim(els.card, 'wiggle');
    return;
  }
  if (canSpeak) speechSynthesis.cancel();
  showWord();
}

// ---------- Home screen and stickers ----------

function renderHome() {
  updateCounters();

  const missing = missingWords().length;
  // Only offer "missing words" when it differs from a full round
  els.missingBtn.hidden = missing === 0 || missing === words.length;
  els.missingBtn.textContent = `🎯 Missing words (${missing})`;
  const best = bestTime();
  els.bestTime.textContent = best === null ? 'No best time yet' : `Best: ${formatTime(best)}`;

  renderSummary();
  renderStickers();
}

function renderSummary() {
  els.stickerHint.classList.toggle('summary', Boolean(lastRound));
  if (!lastRound) {
    const known = knownWords().length;
    els.stickerHint.textContent = known === 0
      ? 'Tap “I know it!” to earn stickers'
      : `You have ${known} sticker${known === 1 ? '' : 's'}!`;
    return;
  }

  const n = lastRound.learned.length;
  const main = document.createElement('span');
  main.className = 'summary-main';
  if (n > 0) main.textContent = `🎉 You learned ${n} new word${n === 1 ? '' : 's'}!`;
  else if (lastRound.mode === 'missing') main.textContent = '🎉 You practiced all your missing words!';
  else main.textContent = `🎉 You read all ${lastRound.total} words!`;
  const lines = [main];

  if ('ms' in lastRound) {
    const time = document.createElement('span');
    time.className = 'summary-time';
    time.textContent = lastRound.newBest
      ? `🏆 New best time: ${formatTime(lastRound.ms)}!`
      : `⏱ ${formatTime(lastRound.ms)} (best is ${formatTime(lastRound.best)})`;
    lines.push(time);
  }
  els.stickerHint.replaceChildren(...lines);
}

function makeSticker(word) {
  const h = hash(word);
  const el = document.createElement('div');
  el.className = 'sticker';
  const art = document.createElement('span');
  art.className = 'sticker-art';
  art.textContent = stickerFor(word);
  const label = document.createElement('span');
  label.className = 'sticker-word';
  label.textContent = word;
  el.append(art, label);
  el.style.setProperty('--c', STICKER_COLORS[h % STICKER_COLORS.length]);
  el.style.setProperty('--r', `${(h % 31) - 15}deg`);
  return el;
}

function renderStickers() {
  const known = knownWords();
  const learnedLastRound = lastRound ? lastRound.learned : [];

  els.board.replaceChildren();
  if (known.length === 0) return;

  const slots = stickerSlots(known.length);
  els.board.style.setProperty('--s', `${slots.size}px`);
  known.forEach((word, i) => {
    const el = makeSticker(word);
    el.style.left = `${slots[i].x}px`;
    el.style.top = `${slots[i].y}px`;
    el.classList.toggle('fresh', learnedLastRound.includes(word));
    const newIndex = newStickers.indexOf(word);
    if (newIndex >= 0) {
      el.classList.add('pop');
      el.style.animationDelay = `${0.25 + newIndex * 0.15}s`;
    }
    els.board.append(el);
  });
  newStickers = [];
}

// Lay the screen out as a grid of sticker-sized cells, skipping cells behind the title and buttons.
// Cells are taken in a fixed random order, so stickers stay put as more are added.
function stickerSlots(count) {
  const W = els.board.clientWidth;
  const H = els.board.clientHeight;
  const origin = els.board.getBoundingClientRect();
  const blockers = [els.homeCenter, els.progress].map((el) => el.getBoundingClientRect());
  let size = Math.min(150, Math.max(70, Math.min(W, H) / 5));

  for (;;) {
    const cell = size * 1.25;
    const cols = Math.max(1, Math.floor(W / cell));
    const rows = Math.max(1, Math.floor(H / cell));
    const padX = (W - cols * cell) / 2;
    const padY = (H - rows * cell) / 2;
    const free = [];
    const covered = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = padX + (c + 0.5) * cell;
        const y = padY + (r + 0.5) * cell;
        const hit = blockers.some((b) =>
          x + size / 2 > b.left - origin.left && x - size / 2 < b.right - origin.left &&
          y + size / 2 > b.top - origin.top && y - size / 2 < b.bottom - origin.top);
        (hit ? covered : free).push({ x, y });
      }
    }
    if (free.length >= count || size <= 50) {
      const rand = mulberry32(7);
      const order = [...shuffle(free, rand), ...shuffle(covered, rand)];
      const slots = Array.from({ length: count }, (_, i) => {
        const p = order[i % order.length];
        return { x: p.x + (rand() - 0.5) * cell * 0.2, y: p.y + (rand() - 0.5) * cell * 0.2 };
      });
      slots.size = size;
      return slots;
    }
    size *= 0.88;
  }
}

function flySticker(word) {
  const el = makeSticker(word);
  el.classList.add('flying');
  el.style.setProperty('--s', '160px');
  const from = els.card.getBoundingClientRect();
  const to = els.homeBtn.getBoundingClientRect();
  const x0 = `${from.left + from.width / 2}px`;
  const y0 = `${from.top + from.height / 2}px`;
  const x1 = `${to.left + to.width / 2}px`;
  const y1 = `${to.top + to.height / 2}px`;
  el.style.left = x1;
  el.style.top = y1;
  document.body.append(el);

  if (reduceMotion) {
    setTimeout(() => el.remove(), 600);
    return;
  }
  const anim = el.animate([
    { left: x0, top: y0, scale: 0, rotate: '-360deg' },
    { left: x0, top: y0, scale: 1.15, rotate: '0deg', offset: 0.3 },
    { left: x0, top: y0, scale: 1, rotate: '0deg', offset: 0.5 },
    { left: x1, top: y1, scale: 0.3, rotate: '0deg' },
  ], { duration: 1100, easing: 'ease-in-out' });
  anim.onfinish = () => {
    el.remove();
    playAnim(els.homeBtn, 'wiggle');
  };
}

function updateCounters() {
  const stars = knownWords().length;
  els.progress.textContent = `⭐ ${stars} of ${words.length} stars`;
  els.mini.textContent = `⭐ ${stars} / ${words.length}`;
}

function showScreen(name) {
  els.home.hidden = name !== 'home';
  els.practice.hidden = name !== 'practice';
  if (name === 'home') renderHome();
}

// ---------- Cheerful feedback ----------

let toastTimer = null;

function showToast(text) {
  els.toast.textContent = text;
  els.toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => els.toast.classList.remove('show'), 1500);
}

const randomCheer = () => CHEERS[Math.floor(Math.random() * CHEERS.length)];

function confetti() {
  if (reduceMotion) return;
  for (let i = 0; i < 60; i++) {
    const bit = document.createElement('span');
    bit.className = 'confetti';
    bit.style.left = `${Math.random() * 100}vw`;
    bit.style.background = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
    bit.style.setProperty('--dur', `${1.4 + Math.random() * 1.2}s`);
    bit.style.setProperty('--delay', `${Math.random() * 0.4}s`);
    bit.style.setProperty('--dx', `${(Math.random() - 0.5) * 30}vw`);
    bit.style.setProperty('--spin', `${Math.random() * 1080 - 540}deg`);
    bit.addEventListener('animationend', () => bit.remove());
    document.body.append(bit);
  }
}

// Restart a CSS animation class (and stop any other one running on the element).
function playAnim(el, cls) {
  el.classList.remove('slide-in', 'bounce', 'pop', 'wiggle');
  void el.offsetWidth;
  el.classList.add(cls);
}

// ---------- Grown-up panel (press and hold the progress counter) ----------

function renderPanel() {
  els.panelSummary.textContent =
    `${knownWords().length} of ${words.length} words have a star · ` +
    `${words.filter((w) => stats(w).heard > 0).length} heard so far`;
  els.panelList.replaceChildren(...words.map((word) => {
    const s = stats(word);
    const row = document.createElement('li');
    const name = document.createElement('span');
    name.className = 'panel-word';
    name.textContent = word;
    const heard = document.createElement('span');
    heard.className = 'panel-heard';
    heard.textContent = s.heard ? `heard ${s.heard}×` : 'not yet';
    const chip = document.createElement('button');
    chip.className = `chip${s.known ? ' on' : ''}`;
    chip.textContent = s.known ? `${stickerFor(word)} Sticker` : 'No sticker';
    chip.addEventListener('click', () => {
      s.known = !s.known;
      s.knownAt = s.known ? Date.now() : 0;
      if (!s.known) delete s.sticker; // earning it again gives a new surprise
      saveProgress();
      renderPanel();
    });
    row.append(name, heard, chip);
    return row;
  }));
}

function renderVoiceOptions() {
  const voices = englishVoices();
  const best = voices[0] ? ` (${voices[0].name})` : '';
  els.voiceSelect.replaceChildren(
    new Option(`Automatic${best}`, ''),
    ...voices.map((v) => new Option(v.name, v.voiceURI)),
  );
  const saved = savedVoiceURI();
  els.voiceSelect.value = voices.some((v) => v.voiceURI === saved) ? saved : '';
}

function chooseVoice(uri) {
  try {
    if (uri) localStorage.setItem(VOICE_KEY, uri);
    else localStorage.removeItem(VOICE_KEY);
  } catch (e) { /* ignore */ }
  pickVoice();
  speak('Let’s read!');
}

function onLongPress(el, ms, fn) {
  let timer = null;
  const cancel = () => {
    clearTimeout(timer);
    el.classList.remove('pressing');
  };
  el.addEventListener('pointerdown', () => {
    el.classList.add('pressing');
    timer = setTimeout(() => { cancel(); fn(); }, ms);
  });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach((type) => el.addEventListener(type, cancel));
  el.addEventListener('contextmenu', (e) => e.preventDefault());
}

// ---------- Helpers ----------

function hash(str) {
  let h = 2166136261;
  for (const ch of str) {
    h ^= ch.codePointAt(0);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// Small seeded random number generator, so sticker positions are the same every time.
function mulberry32(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------- Start up ----------

async function init() {
  if (canSpeak) {
    pickVoice();
    speechSynthesis.onvoiceschanged = pickVoice;
  }

  els.start.addEventListener('click', () => startRound('all'));
  els.missingBtn.addEventListener('click', () => startRound('missing'));
  els.timedBtn.addEventListener('click', () => startRound('all', true));
  els.homeBtn.addEventListener('click', () => {
    stopRound();
    showScreen('home');
  });
  els.card.addEventListener('click', hearWord);
  els.know.addEventListener('click', knowIt);
  els.next.addEventListener('click', goNext);

  onLongPress(els.progress, 800, () => {
    renderPanel();
    if (canSpeak) renderVoiceOptions();
    els.panel.showModal();
  });
  els.voiceSection.hidden = !canSpeak;
  els.voiceSelect.addEventListener('change', () => chooseVoice(els.voiceSelect.value));
  els.voiceTest.addEventListener('click', () => speak('Let’s read! the, and, you'));
  els.panelClose.addEventListener('click', () => els.panel.close());
  els.panel.addEventListener('close', () => showScreen('home'));
  els.reset.addEventListener('click', () => {
    if (!confirm('Erase all progress, stickers and best times on this device?')) return;
    progress = { words: {} };
    lastRound = null;
    saveProgress();
    renderPanel();
  });

  let resizeTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => (els.home.hidden ? fitWord() : renderStickers()), 150);
  });
  // The kid-friendly font may arrive after the first word is shown
  document.fonts.ready.then(() => { if (current) fitWord(); });

  words = await loadWords();
  els.start.disabled = false;
  els.timedBtn.disabled = false;
  showScreen('home');
}

init();
