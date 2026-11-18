'use strict';

// Saved progress: stars, stickers, heard counts, the best time, the medals earned in games, and the scenes unlocked.
// Shape: { words: { the: { heard: 3, known: true, knownAt: 1729700000000, lastSeen: "2026-10-23", seenAt: 1729700000000, listenAt: 1729700000000, buildAt: 1729700000000, sticker: "🦀", set: "beach",
//                         tries: [1, 0, "saw", 1], skipped: 2 } },
//          bestTime: { ms: 95000, count: 24 },
//          medals: 13,
//          scenes: ["beach"], scene: "beach", scenesToTry: ["space"], stickersToSee: ["the", "prize-0"],
//          prizes: [{ emoji: "🐶", at: 1729700000000 }],
//          lastGame: { game: "listen", inARow: 2 },
//          daysPlayed: ["2026-11-16", "2026-11-17"] }
// A sticker without `set` was earned before sticker sets, and doesn't count toward one.
// `scene` is the scene showing (none means the dots), and `scenesToTry` are the new scenes not looked at yet, counted on 🖼️.
// `stickersToSee` are stickers earned outside sticker play, waiting inside the 🐵/🙈 switch until it's next opened.
// `prizes` are the prize stickers picked with trophies, one per trophy, in the order they were picked.
// `lastGame` is the game finished most recently and how many times in a row; a finished reading round clears it.
// `tries` and `skipped` are for "Needs practice" in the Grown-up corner (see below).
// `daysPlayed` are the days with a finished round or game, this week and last, for the Grown-up corner's "This week".

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

// Installed, the app asks the browser to keep its saved data, so it isn't cleared when the device runs low on space.
// Only when installed (from the home screen, or the Play Store app, which Android opens with an android-app:// referrer):
// in a browser tab, Firefox would show the parent a pop-up for it. Chrome decides by itself, without asking anyone.
async function keepProgress() {
  const installed = ['standalone', 'fullscreen', 'minimal-ui'].some((mode) => matchMedia(`(display-mode: ${mode})`).matches)
    || document.referrer.startsWith('android-app://');
  if (!installed || !navigator.storage || !navigator.storage.persist) return;
  try {
    if (!(await navigator.storage.persisted())) await navigator.storage.persist();
  } catch (e) { /* not kept: progress still saves as before */ }
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

// A star comes with its sticker, given here. Taking the star away takes the sticker too, so earning it again gives
// a new one, filling the gap in its set first.
// `byGrownup` marks a star given on the Words page, so This week only counts the child's own.
function setKnown(word, known, byGrownup = false) {
  const s = stats(word);
  s.known = known;
  s.knownAt = known ? Date.now() : 0;
  if (known && byGrownup) s.byGrownup = true;
  else delete s.byGrownup;
  if (known) {
    giveSticker(word);
    delete s.skipped; // not stuck any more
  } else {
    delete s.sticker;
    delete s.set;
  }
  saveProgress();
}

// A word with a star always has its sticker, so this only reads it.
const stickerFor = (word) => stats(word).sticker;

// The next sticker: the first missing sticker of the first set that isn't full, in the order the star pill shows
// them, and finishing that set unlocks its scene. Once every set is full, it's a random one from STICKER_EMOJI
// that isn't on the board yet. Saved by the caller.
function giveSticker(word) {
  const s = stats(word);
  if (s.sticker) return;
  const set = collectingSet();
  if (set) {
    const earned = setStickersEarned(set);
    s.sticker = setStickers(set).find((e) => !earned.includes(e));
    s.set = set.id;
    if (earned.length + 1 === SET_SIZE) unlockScene(set.id);
  } else {
    s.sticker = randomItem(stickersNotOnBoard());
  }
}

// Saves from before stickers came with the star can have a star without one. They get theirs as the app opens,
// oldest star first, the order they'd have been given in.
function giveMissingStickers() {
  const missing = state.allWords.filter((w) => stats(w).known && !stats(w).sticker);
  if (!missing.length) return;
  missing.sort((a, b) => stats(a).knownAt - stats(b).knownAt).forEach(giveSticker);
  saveProgress();
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

// ---------- Needs practice ----------
// For the Grown-up corner only: the child never sees it, and it never changes stars, stickers or medals.
// A word's `tries` are its last few tries in Listen & tap and Build the word, newest last: 1 for right the first time,
// 0 for a miss in Build the word, or the word tapped by mistake in Listen & tap. `skipped` counts the reading rounds it
// was shown in and passed with Next while it had no star (not Timed runs); a star clears it. `forgot` marks a word with a star that was
// passed with Skip in a Check-up; it keeps its star and sticker, and "I know it!" on it clears the mark.

function noteTry(word, result) {
  const s = stats(word);
  s.tries = [...(s.tries || []), result].slice(-PRACTICE_TRIES);
  // Right enough times in a row: it comes off the list, and older misses no longer count
  const recent = s.tries.slice(-PRACTICE_CLEAR);
  if (recent.length === PRACTICE_CLEAR && recent.every((t) => t === 1)) s.tries = recent;
  saveProgress();
}

function noteSkipped(word) {
  const s = stats(word);
  s.skipped = (s.skipped || 0) + 1;
  saveProgress();
}

function noteForgot(word, forgot) {
  const s = stats(word);
  if (Boolean(s.forgot) === forgot) return;
  if (forgot) s.forgot = true;
  else delete s.forgot;
  saveProgress();
}

// Why a word needs practice, or null if it doesn't. `misses` of its last `tries` in the games, the word it was most
// often `mixedUp` with ([word, times], or null), the reading rounds `skipped` without a star, and whether it was
// skipped in a Check-up (`forgot`).
function practiceNeed(word) {
  const s = stats(word);
  const tries = s.tries || [];
  const misses = tries.filter((t) => t !== 1).length;
  const skipped = s.known ? 0 : s.skipped || 0;
  const missing = misses >= PRACTICE_MISSES;
  const forgot = Boolean(s.known && s.forgot);
  if (!missing && skipped < PRACTICE_STUCK_ROUNDS && !forgot) return null;
  const mixups = {};
  tries.filter((t) => typeof t === 'string').forEach((t) => { mixups[t] = (mixups[t] || 0) + 1; });
  return {
    word,
    known: s.known,
    misses: missing ? misses : 0,
    tries: tries.length,
    mixedUp: missing ? Object.entries(mixups).sort((a, b) => b[1] - a[1])[0] || null : null,
    skipped: skipped >= PRACTICE_STUCK_ROUNDS ? skipped : 0,
    forgot,
  };
}

// The turned-on words that need practice, the most missed first.
const wordsToPractice = () => state.words.map(practiceNeed).filter(Boolean)
  .sort((a, b) => b.misses - a.misses || b.skipped - a.skipped);

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

// Every sticker outside the sets that isn't on the board yet, as a word's sticker or a prize. Once they're all
// there, any of them again. Prizes are picked from these, and so are word stickers once every set is full.
// Only words with a star have a sticker, so turned-off words count too and their sticker is never given out twice.
function stickersNotOnBoard() {
  const used = new Set([...state.allWords.map((w) => stats(w).sticker), ...prizeStickers().map((p) => p.emoji)]);
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
  notePlayedToday();
  saveProgress();
}

function noteRoundFinished() {
  delete state.progress.lastGame;
  notePlayedToday();
  saveProgress();
}

// ---------- Days played ----------
// For the Grown-up corner's "This week": the days (YYYY-MM-DD, local time) a round or game was started, finished or
// not. Only this week and last week are kept. Weeks start on Sunday.

// Midnight on the Sunday `weeksAgo` weeks back (0 is this week).
function weekStart(weeksAgo = 0) {
  const day = new Date();
  day.setHours(0, 0, 0, 0);
  day.setDate(day.getDate() - day.getDay() - 7 * weeksAgo);
  return day;
}

const daysPlayed = () => state.progress.daysPlayed || [];

// Called as each round and game starts, and as it finishes, in case it ran past midnight.
function notePlayedToday() {
  if (daysPlayed().at(-1) === today()) return;
  const keepFrom = weekStart(1).toLocaleDateString('en-CA');
  state.progress.daysPlayed = [...daysPlayed().filter((day) => day >= keepFrom && day !== today()), today()];
  saveProgress();
}

// The words the child got their star for in the week `weeksAgo` weeks back, in the order they got it. Stars a grown-up
// gave on the Words page aren't the child's, so they're left out.
function starsInWeek(weeksAgo) {
  const from = weekStart(weeksAgo).getTime();
  const to = weeksAgo ? weekStart(weeksAgo - 1).getTime() : Infinity;
  return knownWords().filter((word) => !stats(word).byGrownup && stats(word).knownAt >= from && stats(word).knownAt < to);
}

// Saves medals from a finished game. Returns whether they completed a trophy.
function earnMedals(count) {
  const trophies = trophyCount();
  state.progress.medals = medalCount() + count;
  delete state.progress.bestScores;
  saveProgress();
  return trophyCount() > trophies;
}

// The next words to learn: the first words without a star, in the order of words.json (the learning order).
// Every round and game includes them, so they keep coming back until "I know it!" gives them a star.
const nextWordsToLearn = (list) => list.filter((word) => !stats(word).known).slice(0, NEXT_WORDS);

// Up to `limit` words for a round or game: the next words to learn, then the words not shown for the longest
// (`shownAt` is when each was last shown in this activity), which mixes in known words and new ones. Shuffled.
function pickWords(list, limit, shownAt) {
  const next = nextWordsToLearn(list).slice(0, limit);
  const rest = list.filter((word) => !next.includes(word));
  const longestWaiting = shuffle(rest).sort((a, b) => (stats(a)[shownAt] || 0) - (stats(b)[shownAt] || 0));
  return shuffle([...next, ...longestWaiting.slice(0, limit - next.length)]);
}

function markShown(word, shownAt) {
  stats(word)[shownAt] = Date.now();
  saveProgress();
}
