'use strict';

// Saved progress: stars, stickers, heard counts, the best time, the medals earned in games, and the scenes unlocked.
// Shape: { words: { the: { heard: 3, known: true, knownAt: 1729700000000, lastSeen: "2026-10-23", seenAt: 1729700000000, listenAt: 1729700000000, buildAt: 1729700000000, sticker: "🦀", set: "beach" } },
//          bestTime: { ms: 95000, count: 24 },
//          medals: 13,
//          scenes: ["beach"], scene: "beach", scenesToTry: ["space"], stickersToSee: ["the", "prize-0"],
//          prizes: [{ emoji: "🐶", at: 1729700000000 }],
//          lastGame: { game: "listen", inARow: 2 } }
// A sticker without `set` was earned before sticker sets, and doesn't count toward one.
// `scene` is the scene showing (none means the dots), and `scenesToTry` are the new scenes not looked at yet, counted on 🖼️.
// `stickersToSee` are stickers earned outside sticker play, waiting inside the 🐵/🙈 switch until it's next opened.
// `prizes` are the prize stickers picked with trophies, one per trophy, in the order they were picked.
// `lastGame` is the game finished most recently and how many times in a row; a finished reading round clears it.

function loadProgress() {
  try {
    const data = JSON.parse(readStorage(STORAGE_KEY));
    if (data && data.words && typeof data.words === 'object') {
      // Before the count on 🖼️, one new scene at a time made it glow
      if (data.sceneToTry) data.scenesToTry = [data.sceneToTry];
      delete data.sceneToTry;
      return data;
    }
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
      const used = new Set([...state.allWords.map((w) => stats(w).sticker), ...prizeStickers().map((p) => p.emoji)]);
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

// New scenes not looked at yet. Opening the 🖼️ tray, or picking the scene, counts as looking.
const scenesToTry = () => state.progress.scenesToTry || [];

function markSceneToTry(id) {
  if (!scenesToTry().includes(id)) state.progress.scenesToTry = [...scenesToTry(), id];
}

function markSceneTried(id) {
  state.progress.scenesToTry = scenesToTry().filter((s) => s !== id);
  if (!state.progress.scenesToTry.length) delete state.progress.scenesToTry;
}

function unlockScene(id) {
  if (unlockedScenes().includes(id)) return;
  state.progress.scenes = [...unlockedScenes(), id];
  markSceneToTry(id); // counted on 🖼️ until it's seen
  state.scenesToFly.push(id); // its icon flies into the 🐵/🙈 switch on the home screen
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

// ---------- Prize stickers ----------
// Each trophy lets the child pick a prize sticker for the board. It has a 🏆 tag instead of a word, and isn't part
// of a set, so stars, word stickers and scenes stay as they are. Trophies from medals earned earlier count too.

const prizeStickers = () => state.progress.prizes || [];

const stickersToSee = () => state.progress.stickersToSee || [];

function markStickerToSee(key) {
  if (!stickersToSee().includes(key)) state.progress.stickersToSee = [...stickersToSee(), key];
  saveProgress();
}
const prizesToPick = () => Math.max(0, trophyCount() - prizeStickers().length);

// Every sticker outside the sets that isn't on the board yet. Once they're all used, any of them again.
function prizeChoices() {
  const used = new Set([...state.allWords.map((w) => stats(w).known && stats(w).sticker), ...prizeStickers().map((p) => p.emoji)]);
  const left = STICKER_EMOJI.filter((e) => !used.has(e));
  return left.length ? left : STICKER_EMOJI;
}

// Returns the new sticker's key on the board.
function addPrize(emoji) {
  state.progress.prizes = [...prizeStickers(), { emoji, at: Date.now() }];
  saveProgress();
  return `prize-${prizeStickers().length - 1}`;
}

// ---------- Taking turns ----------
// A game can be finished GAME_REPEAT_LIMIT times in a row. Then its button waits until the other game or a reading
// round is finished, so medals (and the prize stickers they lead to) come from a mix of play, not one game on repeat.

function gameWaiting(game) {
  const last = state.progress.lastGame;
  return Boolean(last && last.game === game && last.inARow >= GAME_REPEAT_LIMIT);
}

function noteGameFinished(game) {
  const last = state.progress.lastGame;
  state.progress.lastGame = { game, inARow: last && last.game === game ? last.inARow + 1 : 1 };
  saveProgress();
}

function noteRoundFinished() {
  delete state.progress.lastGame;
  saveProgress();
}

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
