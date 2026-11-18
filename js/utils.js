'use strict';

// Small general-purpose helpers shared by the other files. Nothing here knows about sight words.

const $ = (id) => document.getElementById(id);

// A new page element with a class and text, either of which can be left out: make('span', 'thumb-icon', '🏖️').
function make(tag, className = '', text = '') {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text !== '') el.textContent = text;
  return el;
}
// Calmer motion: things land without flying and there's no confetti. On when the device asks for reduced motion, or
// when Calmer animations is on in the Grown-up corner (setCalmAnimations).
const deviceReducesMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let reduceMotion = deviceReducesMotion;

// ---------- Text and time ----------

const plural = (n, noun) => `${n} ${noun}${n === 1 ? '' : 's'}`;
const today = () => new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD in local time

function formatTime(ms) {
  const secs = Math.floor(ms / 1000);
  return `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;
}

// ---------- Randomness ----------

const randomItem = (list) => list[Math.floor(Math.random() * list.length)];

function shuffle(arr, rand = Math.random) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

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

// ---------- Storage ----------
// localStorage can throw (private browsing, blocked site data), so every access is guarded.

function readStorage(key) {
  try { return localStorage.getItem(key); } catch (e) { return null; }
}

// The Grown-up corner's settings: { soundEffects: false, calm: true }. A setting never changed isn't saved.
function readSettings() {
  try {
    return JSON.parse(readStorage(SETTINGS_KEY)) || {};
  } catch (e) {
    return {};
  }
}

function saveSetting(name, value) {
  writeStorage(SETTINGS_KEY, JSON.stringify({ ...readSettings(), [name]: value }));
}

// Passing null removes the key.
function writeStorage(key, value) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch (e) { /* ignore */ }
}

// ---------- DOM ----------

// Restart a CSS animation class (and stop any other one running on the element).
function playAnim(el, cls) {
  el.classList.remove('slide-in', 'bounce', 'pop', 'wiggle', 'roll', 'roll-shadow');
  void el.offsetWidth;
  el.classList.add(cls);
}

// Starts from the CSS font size and shrinks the text only if it would spill out of its box, in either direction.
// padX and padY are the space to keep clear. Text is measured a little taller, so a lit-up part still fits.
function fitText(el, box, padX, padY) {
  if (!box.clientWidth) return; // not on screen
  el.style.fontSize = '';
  const range = document.createRange();
  range.selectNodeContents(el);
  const text = range.getBoundingClientRect();
  if (!text.width) return;
  const scale = Math.min(1, (box.clientWidth - padX) / text.width, (box.clientHeight - padY) / (text.height * 1.15));
  if (scale < 1) el.style.fontSize = `${Math.floor(parseFloat(getComputedStyle(el).fontSize) * scale)}px`;
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
