'use strict';

// Practice screen: rounds, the word card, and the "I know it!" / "Next" buttons.

let readingRound = null;     // the round being played: { mode: 'all' | 'missing', timed, total, capped, learned, startedAt,
                             // deck, word, heard, busy } (deck: words still to come; word: the one on the card; heard: since it
                             // was shown; busy: while the "I know it!" animation plays)
let readingTimer = null;     // the Timed run's clock
let soundingOut = false;     // true while the word is being sounded out
let soundRun = 0;            // counts sound-outs, so a stopped one knows to stop

// ---------- Rounds ----------

// A round shows up to ROUND_MAX_WORDS, once each, then returns home. A Timed run shows every word, so its times compare.
function startRound(mode, timed = false) {
  const list = mode === 'missing' ? missingWords() : state.words;
  if (list.length === 0) return;
  const deck = timed ? shuffle(list) : pickWords(list, ROUND_MAX_WORDS, 'seenAt');
  readingRound = {
    mode, timed, total: deck.length, capped: deck.length < list.length, learned: [], startedAt: performance.now(),
    deck, word: null, heard: false, busy: false,
  };
  state.lastRound = null;
  els.timer.hidden = !timed;
  els.roundBar.setAttribute('aria-valuemax', String(deck.length));
  showScreen('practice');
  showWord();
  if (timed) {
    updateTimer();
    readingTimer = setInterval(updateTimer, 250);
  }
  if (!canSpeak && !audioCtx) showToast('This browser can’t read words aloud 😕');
}

function finishRound() {
  const done = readingRound;
  stopRound();
  noteRoundFinished(); // reading opens any game that was waiting
  const last = { mode: done.mode, total: done.total, capped: done.capped, learned: done.learned };
  if (done.timed) {
    const ms = Math.round(performance.now() - done.startedAt);
    const best = bestTime();
    Object.assign(last, { ms, best, newBest: best === null || ms < best });
    if (last.newBest) saveBestTime(ms);
  }
  state.lastRound = last;
  showScreen('home');
  confetti();
  if (last.newBest) flyMedal();
}

// Leaving mid-round (the 🏠 button) just drops the round: no summary, no time recorded.
function stopRound() {
  clearInterval(readingTimer);
  readingTimer = null;
  stopSoundOut();
  readingRound = null;
  stopAudio();
}

function updateTimer() {
  if (readingRound) els.timer.textContent = `⏱️ ${formatTime(performance.now() - readingRound.startedAt)}`;
}

// ---------- Word card ----------

function showWord() {
  const game = readingRound;
  if (!game) return;
  if (game.deck.length === 0) {
    finishRound();
    return;
  }
  stopSoundOut();
  const word = game.word = game.deck.shift();
  preloadClips(game.deck.length ? [word, game.deck[0]] : [word]); // this word and the next, not the whole round
  const position = game.total - game.deck.length;
  els.roundFill.style.width = `${(position / game.total) * 100}%`;
  els.roundBar.setAttribute('aria-valuenow', String(position));
  game.heard = false;

  els.word.textContent = word;
  els.word.style.setProperty('--len', word.length);
  fitWord();
  els.card.setAttribute('aria-label', `${word}. Tap to hear it.`);

  markSeen(word);
  els.star.hidden = !stats(word).known;
  els.hint.classList.remove('off');
  els.soundOut.classList.toggle('unavailable', !wordParts(word)); // only words with their sounds listed in js/phonics.js
  setButtonsDisabled(false);
  setNextLocked(true);
  playAnim(els.card, 'slide-in');
}

function fitWord() {
  if (readingRound) fitText(els.word, els.card, 48, 16);
}

function hearWord() {
  stopSoundOut();
  sayWord(readingRound.word);
  playAnim(els.card, 'bounce');
  noteHeard();
}

function noteHeard() {
  markHeard(readingRound.word);
  els.hint.classList.add('off');
  readingRound.heard = true;
  setNextLocked(false);
}

// ---------- Sounding out ----------

// Plays each sound in turn, lighting up its letters on the card, then the whole word.
// Tapping again starts over; tapping the word, "I know it!" or "Next" stops it.
function soundOut() {
  const game = readingRound;
  if (game.busy) return;
  stopSoundOut();
  const run = soundRun;
  const parts = wordParts(game.word);
  const spans = parts.map(([letters, id]) => make('span', isSilentSound(id) ? 'part silent' : 'part', letters));
  els.word.replaceChildren(...spans);
  els.word.classList.add('split');
  fitWord();
  soundingOut = true;
  noteHeard(); // the whole word is said at the end, so this counts as hearing it

  const sounds = parts.map(([, id], i) => [spans[i], id]).filter(([, id]) => !isSilentSound(id));
  let next = 0;
  const step = () => {
    if (run !== soundRun) return;
    spans.forEach((span) => span.classList.remove('on'));
    if (next < sounds.length) {
      const [span, id] = sounds[next++];
      span.classList.add('on');
      saySound(id, () => setTimeout(step, SOUND_GAP_MS));
    } else {
      soundingOut = false;
      showWholeWord();
      sayWord(game.word);
      playAnim(els.card, 'bounce');
    }
  };
  step();
}

function stopSoundOut() {
  soundRun += 1;
  if (!soundingOut) return;
  soundingOut = false;
  stopAudio();
  showWholeWord();
}

function showWholeWord() {
  els.word.classList.remove('split');
  els.word.textContent = readingRound.word;
  fitWord();
}

// ---------- Buttons ----------

function knowIt() {
  const game = readingRound;
  if (game.busy) return;
  stopSoundOut();
  if (!game.heard) hearWord(); // knowing it still counts as hearing it

  const word = game.word;
  if (!stats(word).known) {
    setKnown(word, true);
    state.stickersToFly.push(word); // flies into the 🐵/🙈 switch on the home screen
    markStickerToSee(word); // and waits there until sticker play opens
    game.learned.push(word);
    flySticker(word);
    els.star.hidden = false;
    playAnim(els.star, 'pop');
    updateCounters();
    showToast(`New sticker! ${stickerFor(word)}`);
    playEffect('starEarned');
  } else {
    showToast(randomCheer());
  }
  confetti();

  game.busy = true;
  setButtonsDisabled(true);
  setTimeout(() => {
    game.busy = false;
    if (readingRound === game) showWord(); // not if the child left, maybe already into a new round
  }, 1200);
}

function goNext() {
  if (readingRound.busy) return;
  if (!readingRound.heard) {
    playAnim(els.card, 'wiggle');
    return;
  }
  stopAudio();
  showWord();
}

function setButtonsDisabled(disabled) {
  els.know.disabled = disabled;
  els.next.disabled = disabled;
  els.soundOut.disabled = disabled;
}

// Next stays tappable while locked so a tap can nudge toward the word instead of doing nothing.
function setNextLocked(locked) {
  els.next.classList.toggle('locked', locked);
  els.next.setAttribute('aria-disabled', String(locked));
}
