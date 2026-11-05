'use strict';

// Saved progress: stars, stickers, heard counts, the best time and the medals earned in games.
// Shape: { words: { the: { heard: 3, known: true, knownAt: 1729700000000, lastSeen: "2026-10-23", seenAt: 1729700000000, listenAt: 1729700000000, buildAt: 1729700000000, sticker: "🐶" } },
//          bestTime: { ms: 95000, count: 24 },
//          medals: 13 }

function loadProgress() {
  try {
    const data = JSON.parse(readStorage(STORAGE_KEY));
    if (data && data.words && typeof data.words === 'object') return data;
  } catch (e) { /* corrupt: start fresh */ }
  return { words: {} };
}

function saveProgress() {
  writeStorage(STORAGE_KEY, JSON.stringify(state.progress));
}

function resetProgress() {
  state.progress = { words: {} };
  saveProgress();
  writeStorage(STICKER_SPOTS_KEY, null);
  writeStorage(STICKER_SEED_KEY, null);
}

function stats(word) {
  const all = state.progress.words;
  if (!all[word]) all[word] = { heard: 0, known: false, knownAt: 0, lastSeen: null };
  return all[word];
}

const knownWords = () => state.words.filter((w) => stats(w).known).sort((a, b) => stats(a).knownAt - stats(b).knownAt);
const missingWords = () => state.words.filter((w) => !stats(w).known);

function markSeen(word) {
  const s = stats(word);
  s.lastSeen = today();
  s.seenAt = Date.now();
  saveProgress();
}

function markHeard(word) {
  stats(word).heard += 1;
  saveProgress();
}

function setKnown(word, known) {
  const s = stats(word);
  s.known = known;
  s.knownAt = known ? Date.now() : 0;
  if (!known) delete s.sticker; // earning it again gives a new surprise
  saveProgress();
}

// The word's saved sticker, picking a surprise one first if it doesn't have one yet.
// Prefers emoji not already on the board, so stickers repeat only once every one is used.
function stickerFor(word) {
  const s = stats(word);
  if (!s.sticker) {
    const used = new Set(state.allWords.map((w) => stats(w).sticker));
    const unused = STICKER_EMOJI.filter((e) => !used.has(e));
    s.sticker = randomItem(unused.length ? unused : STICKER_EMOJI);
    saveProgress();
  }
  return s.sticker;
}

// A best time only counts for a word list of the same size, so adding words starts a fresh record.
function bestTime() {
  const best = state.progress.bestTime;
  return best && best.count === state.words.length ? best.ms : null;
}

function saveBestTime(ms) {
  state.progress.bestTime = { ms, count: state.words.length };
  saveProgress();
}

// Medals add up, and never go down. Each best score saved by an older version counts as a head start of one medal.
function medalCount() {
  const { medals, bestScores = {} } = state.progress;
  return medals ?? Object.keys(bestScores).length;
}

const medalsTowardTrophy = () => medalCount() % MEDALS_PER_TROPHY;
const trophyCount = () => Math.floor(medalCount() / MEDALS_PER_TROPHY);

// Saves medals from a finished game. Returns whether they completed a trophy.
function earnMedals(count) {
  const trophies = trophyCount();
  state.progress.medals = medalCount() + count;
  delete state.progress.bestScores;
  saveProgress();
  return trophyCount() > trophies;
}

// Up to `limit` words in a random order, taking the ones not shown for the longest first, so every word gets
// its turn over a few rounds. `shownAt` is the stats field that says when a word was last shown.
function pickWords(list, limit, shownAt) {
  const longestWaiting = shuffle(list).sort((a, b) => (stats(a)[shownAt] || 0) - (stats(b)[shownAt] || 0));
  return shuffle(longestWaiting.slice(0, limit));
}

function markShown(word, shownAt) {
  stats(word)[shownAt] = Date.now();
  saveProgress();
}
