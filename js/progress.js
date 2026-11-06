'use strict';

// Saved progress: stars, stickers, heard counts, the best time, the medals earned in games, and the scenes unlocked.
// Shape: { words: { the: { heard: 3, known: true, knownAt: 1729700000000, lastSeen: "2026-10-23", seenAt: 1729700000000, listenAt: 1729700000000, buildAt: 1729700000000, sticker: "🦀", set: "beach" } },
//          bestTime: { ms: 95000, count: 24 },
//          medals: 13,
//          scenes: ["beach"], scene: "beach", sceneToTry: "space" }
// A sticker without `set` was earned before sticker sets, and doesn't count toward one.
// `scene` is the scene showing (none means the dots), and `sceneToTry` makes 🖼️ glow after "Not now".

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
  if (!known) {
    // earning it again gives a new sticker, filling the gap in its set first
    delete s.sticker;
    delete s.set;
  }
  saveProgress();
}

// The word's saved sticker, picking one first if it doesn't have one yet: the first missing sticker of the first set
// that isn't full, in the order the star pill shows them, and finishing that set unlocks its scene. Once every set is full, it picks from
// STICKER_EMOJI, preferring emoji not already on the board.
function stickerFor(word) {
  const s = stats(word);
  if (!s.sticker) {
    const set = collectingSet();
    if (set) {
      const earned = setStickersEarned(set);
      s.sticker = setStickers(set).find((e) => !earned.includes(e));
      s.set = set.id;
      if (earned.length + 1 === SET_SIZE) unlockScene(set.id);
    } else {
      const used = new Set(state.allWords.map((w) => stats(w).sticker));
      const unused = STICKER_EMOJI.filter((e) => !used.has(e));
      s.sticker = randomItem(unused.length ? unused : STICKER_EMOJI);
    }
    saveProgress();
  }
  return s.sticker;
}

// ---------- Sticker sets and scenes ----------

const setStickers = (set) => set.stickers.slice(0, SET_SIZE);
const findSet = (id) => STICKER_SETS.find((set) => set.id === id);

// The set's stickers earned so far. Turned-off words still count, so their sticker is never given out twice.
function setStickersEarned(set) {
  const earned = new Set(state.allWords.filter((w) => stats(w).known && stats(w).set === set.id).map((w) => stats(w).sticker));
  return setStickers(set).filter((e) => earned.has(e));
}

// The set being collected: the first one with a sticker missing, so a sticker taken away is replaced first.
// null once every set is full.
const collectingSet = () => STICKER_SETS.find((set) => setStickersEarned(set).length < SET_SIZE) || null;

// A scene stays unlocked once earned, even if a sticker is taken away later. Only Reset all progress locks it again.
const unlockedScenes = () => state.progress.scenes || [];

function unlockScene(id) {
  if (unlockedScenes().includes(id)) return;
  state.progress.scenes = [...unlockedScenes(), id];
  state.progress.sceneToTry = id; // 🖼️ glows until it's seen, even if the app closes before "set complete!" shows
  state.newScenes.push(id); // "set complete!" shows on the home screen
  saveProgress();
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
