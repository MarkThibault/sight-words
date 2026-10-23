'use strict';

// ---------- Settings ----------
const STORAGE_KEY = 'sightWords.progress.v1';
const REVIEW_CHANCE = 0.25;  // chance each sticker word comes back for review in a round
const CELEBRATE_EVERY = 5;   // confetti after this many words heard
const SPEECH_RATE = 0.8;     // a little slower than normal speech
const CHEERS = ['Great job!', 'Awesome!', 'You did it!', 'Super reader!', 'Way to go!', 'Fantastic!'];
const STICKER_COLORS = ['#e03131', '#e8590c', '#e67700', '#2f9e44', '#0c8599', '#1971c2', '#7048e8', '#c2255c'];
const CONFETTI_COLORS = ['#ff6b6b', '#ffa94d', '#ffd43b', '#69db7c', '#4dabf7', '#9775fa', '#f783ac'];
// Only used if words.json can't be loaded (for example, when index.html is opened straight from disk).
const FALLBACK_WORDS = ['was', 'you', 'me', 'like', 'my', 'yes', 'for', 'see', 'as', 'the', 'can', 'he',
  'go', 'at', 'up', 'with', 'and', 'a', 'we', 'I', 'be', 'are', 'to', 'on'];

const $ = (id) => document.getElementById(id);
const els = {
  home: $('home'), practice: $('practice'), board: $('sticker-board'), homeCenter: $('home-center'),
  start: $('start-btn'), stickerHint: $('sticker-hint'), progress: $('progress'),
  homeBtn: $('home-btn'), mini: $('progress-mini'), card: $('card'), word: $('word'), star: $('card-star'),
  hint: $('hint'), know: $('know-btn'), next: $('next-btn'), toast: $('toast'),
  panel: $('parent-panel'), panelSummary: $('panel-summary'), panelList: $('panel-list'),
  panelClose: $('panel-close'), reset: $('reset-btn'),
};
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const canSpeak = 'speechSynthesis' in window;

let words = [];
let progress = loadProgress();
let deck = [];
let current = null;
let heardCurrent = false;    // has the current word been heard since it was shown?
let heardThisSession = 0;
let newStickers = [];        // stickers earned since the home screen was last shown
let busy = false;            // true while the "I know it!" animation plays

// ---------- Saved progress ----------
// Shape: { words: { the: { heard: 3, known: true, knownAt: 1729700000000, lastSeen: "2026-10-23" } } }

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

const practicedCount = () => words.filter((w) => stats(w).heard > 0).length;
const knownWords = () => words.filter((w) => stats(w).known).sort((a, b) => stats(a).knownAt - stats(b).knownAt);
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

// New words first, then words still being learned mixed with a few sticker words for review.
function buildDeck() {
  const fresh = words.filter((w) => !stats(w).known && stats(w).heard === 0);
  const learning = words.filter((w) => !stats(w).known && stats(w).heard > 0);
  const review = words.filter((w) => stats(w).known && Math.random() < REVIEW_CHANCE);
  let next = [...shuffle(fresh), ...shuffle([...learning, ...review])];
  if (next.length === 0) next = shuffle(words);
  if (next.length > 1 && next[0] === current) next.push(next.shift()); // no back-to-back repeats
  return next;
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

function pickVoice() {
  const voices = speechSynthesis.getVoices().filter((v) => /^en([-_]|$)/i.test(v.lang));
  const us = voices.filter((v) => /^en[-_]US/i.test(v.lang));
  voice = us.find((v) => v.localService) || us[0] || voices[0] || null;
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

// ---------- Practice screen ----------

function showWord() {
  if (deck.length === 0) deck = buildDeck();
  current = deck.shift();
  heardCurrent = false;

  els.word.textContent = current;
  els.word.style.setProperty('--len', current.length);
  fitWord();
  els.card.setAttribute('aria-label', `${current}. Tap to hear it.`);

  const s = stats(current);
  s.lastSeen = today();
  saveProgress();
  els.star.hidden = s.heard === 0;
  els.hint.classList.toggle('off', s.heard > 0);
  setButtonsDisabled(false);
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
  if (els.star.hidden) {
    els.star.hidden = false;
    playAnim(els.star, 'pop');
  }
  updateCounters();

  if (!heardCurrent) {
    heardCurrent = true;
    heardThisSession += 1;
    if (heardThisSession % CELEBRATE_EVERY === 0) celebrate();
  }
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
    flySticker(current);
    showToast('New sticker! 🎉');
  } else {
    showToast(randomCheer());
  }

  busy = true;
  setButtonsDisabled(true);
  setTimeout(() => { busy = false; showWord(); }, 1200);
}

function setButtonsDisabled(disabled) {
  els.know.disabled = disabled;
  els.next.disabled = disabled;
}

// ---------- Home screen and stickers ----------

function makeSticker(word) {
  const h = hash(word);
  const el = document.createElement('div');
  el.className = 'sticker';
  el.textContent = word;
  el.style.setProperty('--c', STICKER_COLORS[h % STICKER_COLORS.length]);
  el.style.setProperty('--r', `${(h % 31) - 15}deg`);
  el.style.setProperty('--len', Math.max(word.length, 2));
  return el;
}

function renderStickers() {
  const known = knownWords();
  els.stickerHint.textContent = known.length === 0
    ? 'Tap “I know it!” to earn stickers'
    : `You have ${known.length} sticker${known.length === 1 ? '' : 's'}!`;

  els.board.replaceChildren();
  if (known.length === 0) return;

  const slots = stickerSlots(known.length);
  els.board.style.setProperty('--s', `${slots.size}px`);
  known.forEach((word, i) => {
    const el = makeSticker(word);
    el.style.left = `${slots[i].x}px`;
    el.style.top = `${slots[i].y}px`;
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
    { left: x0, top: y0, scale: 0 },
    { left: x0, top: y0, scale: 1.15, offset: 0.3 },
    { left: x0, top: y0, scale: 1, offset: 0.5 },
    { left: x1, top: y1, scale: 0.3 },
  ], { duration: 1100, easing: 'ease-in-out' });
  anim.onfinish = () => {
    el.remove();
    playAnim(els.homeBtn, 'wiggle');
  };
}

function updateCounters() {
  const done = practicedCount();
  els.progress.textContent = `⭐ ${done} of ${words.length} practiced`;
  els.mini.textContent = `⭐ ${done} / ${words.length}`;
}

function showScreen(name) {
  els.home.hidden = name !== 'home';
  els.practice.hidden = name !== 'practice';
  if (name === 'home') {
    updateCounters();
    renderStickers();
  }
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

function celebrate() {
  showToast(randomCheer());
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
    `${practicedCount()} of ${words.length} words practiced · ${knownWords().length} stickers`;
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
    chip.textContent = s.known ? '⭐ Sticker' : 'No sticker';
    chip.addEventListener('click', () => {
      s.known = !s.known;
      s.knownAt = s.known ? Date.now() : 0;
      saveProgress();
      renderPanel();
    });
    row.append(name, heard, chip);
    return row;
  }));
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

  els.start.addEventListener('click', () => {
    showScreen('practice');
    showWord();
    if (!canSpeak) showToast('This browser can’t read words aloud 😕');
  });
  els.homeBtn.addEventListener('click', () => {
    if (canSpeak) speechSynthesis.cancel();
    showScreen('home');
  });
  els.card.addEventListener('click', hearWord);
  els.know.addEventListener('click', knowIt);
  els.next.addEventListener('click', () => {
    if (busy) return;
    if (canSpeak) speechSynthesis.cancel();
    showWord();
  });

  onLongPress(els.progress, 800, () => {
    renderPanel();
    els.panel.showModal();
  });
  els.panelClose.addEventListener('click', () => els.panel.close());
  els.panel.addEventListener('close', () => {
    deck = [];
    showScreen('home');
  });
  els.reset.addEventListener('click', () => {
    if (!confirm('Erase all progress and stickers on this device?')) return;
    progress = { words: {} };
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
  showScreen('home');
}

init();
