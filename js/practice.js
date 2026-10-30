'use strict';

// Practice screen: rounds, the word card, and the "I know it!" / "Next" buttons.

let round = null;            // the round being played: { mode: 'all' | 'missing', timed, total, learned, startedAt }
let deck = [];               // words still to come this round
let current = null;          // the word on the card
let heardCurrent = false;    // has the current word been heard since it was shown?
let busy = false;            // true while the "I know it!" animation plays
let timerId = null;
let soundingOut = false;     // true while the word is being sounded out
let soundRun = 0;            // counts sound-outs, so a stopped one knows to stop

// ---------- Rounds ----------

// A round goes through each word once (or each word without a star yet), then returns home.
function startRound(mode, timed = false) {
  const list = mode === 'missing' ? missingWords() : state.words;
  if (list.length === 0) return;
  deck = shuffle(list);
  round = { mode, timed, total: deck.length, learned: [], startedAt: performance.now() };
  state.lastRound = null;
  els.timer.hidden = !timed;
  els.roundBar.setAttribute('aria-valuemax', String(round.total));
  showScreen('practice');
  showWord();
  if (timed) {
    updateTimer();
    timerId = setInterval(updateTimer, 250);
  }
  if (!canSpeak && !audioCtx) showToast('This browser can’t read words aloud 😕');
}

function finishRound() {
  const done = round;
  stopRound();
  const last = { mode: done.mode, total: done.total, learned: done.learned };
  if (done.timed) {
    const ms = Math.round(performance.now() - done.startedAt);
    const best = bestTime();
    Object.assign(last, { ms, best, newBest: best === null || ms < best });
    if (last.newBest) saveBestTime(ms);
  }
  state.lastRound = last;
  showScreen('home');
  confetti();
}

// Leaving mid-round (the 🏠 button) just drops the round: no summary, no time recorded.
function stopRound() {
  clearInterval(timerId);
  timerId = null;
  stopSoundOut();
  round = null;
  current = null;
  deck = [];
  stopAudio();
}

function updateTimer() {
  if (round) els.timer.textContent = `⏱ ${formatTime(performance.now() - round.startedAt)}`;
}

// ---------- Word card ----------

function showWord() {
  if (!round) return;
  if (deck.length === 0) {
    finishRound();
    return;
  }
  stopSoundOut();
  current = deck.shift();
  preloadClips(deck.length ? [current, deck[0]] : [current]); // this word and the next, not the whole round
  const position = round.total - deck.length;
  els.roundFill.style.width = `${(position / round.total) * 100}%`;
  els.roundBar.setAttribute('aria-valuenow', String(position));
  heardCurrent = false;

  els.word.textContent = current;
  els.word.style.setProperty('--len', current.length);
  fitWord();
  els.card.setAttribute('aria-label', `${current}. Tap to hear it.`);

  markSeen(current);
  els.star.hidden = !stats(current).known;
  els.hint.classList.remove('off');
  els.soundOut.classList.toggle('unavailable', !wordParts(current)); // only words with their sounds listed in js/phonics.js
  setButtonsDisabled(false);
  setNextLocked(true);
  playAnim(els.card, 'slide-in');
}

// Start from the big CSS size and shrink only if the word is wider than the card.
function fitWord() {
  if (!current) return;
  els.word.style.fontSize = '';
  const room = els.card.clientWidth - 48;
  const width = els.word.getBoundingClientRect().width;
  if (width > room) {
    const size = parseFloat(getComputedStyle(els.word).fontSize);
    els.word.style.fontSize = `${Math.floor(size * room / width)}px`;
  }
}

function hearWord() {
  stopSoundOut();
  sayWord(current);
  playAnim(els.card, 'bounce');
  noteHeard();
}

function noteHeard() {
  markHeard(current);
  els.hint.classList.add('off');
  heardCurrent = true;
  setNextLocked(false);
}

// ---------- Sounding out ----------

// Plays each sound in turn, lighting up its letters on the card, then the whole word.
// Tapping again starts over; tapping the word, "I know it!" or "Next" stops it.
function soundOut() {
  if (busy) return;
  stopSoundOut();
  const run = soundRun;
  const parts = wordParts(current);
  const spans = parts.map(([letters, id]) => {
    const span = document.createElement('span');
    span.className = id ? 'part' : 'part silent';
    span.textContent = letters;
    return span;
  });
  els.word.replaceChildren(...spans);
  els.word.classList.add('split');
  fitWord();
  soundingOut = true;
  noteHeard(); // the whole word is said at the end, so this counts as hearing it

  const sounds = parts.map(([, id], i) => [spans[i], id]).filter(([, id]) => id);
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
      sayWord(current);
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
  els.word.textContent = current;
  fitWord();
}

// ---------- Buttons ----------

function knowIt() {
  if (busy) return;
  stopSoundOut();
  if (!heardCurrent) hearWord(); // knowing it still counts as hearing it

  if (!stats(current).known) {
    setKnown(current, true);
    state.newStickers.push(current);
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

function goNext() {
  if (busy) return;
  if (!heardCurrent) {
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
