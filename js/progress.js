'use strict';

// Saved progress: stars, stickers, heard counts, the best time and each game's best score.
// Shape: { words: { the: { heard: 3, known: true, knownAt: 1729700000000, lastSeen: "2026-10-23", sticker: "🐶" } },
//          bestTime: { ms: 95000, count: 24 },
//          bestScores: { listen: { points: 16, maxPoints: 20 }, build: { points: 18, maxPoints: 25 } } }

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
  stats(word).lastSeen = today();
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

const bestScore = (game) => (state.progress.bestScores || {})[game] || null;

// Keeps the highest points for a game. On a tie, the one with the lower possible total is the better score.
// Returns whether this is a new record.
function saveBestScore(game, points, maxPoints) {
  const best = bestScore(game);
  if (best && (points < best.points || (points === best.points && maxPoints >= best.maxPoints))) return false;
  state.progress.bestScores = { ...state.progress.bestScores, [game]: { points, maxPoints } };
  saveProgress();
  return true;
}
