'use strict';

// Home screen: mode buttons, the last round's summary, star counters and switching screens.

function showScreen(name) {
  els.home.hidden = name !== 'home';
  els.practice.hidden = name !== 'practice';
  els.listen.hidden = name !== 'listen';
  els.build.hidden = name !== 'build';
  if (name === 'home') {
    renderHome();
    homeShown();
  }
}

const WAIT_NOTE = '🔄 Play something else first';

// Something on the home screen is in the way of a pop-up, a fly-in or an update: another screen is showing, a pop-up
// is already open, or a "set complete!" celebration is playing. Sticker play is checked separately where it matters,
// since 🏆 can open "Pick your prize!" during it.
const homeIsBusy = () => els.home.hidden || state.celebrating || Boolean(document.querySelector('dialog[open]'));

function renderHome() {
  renderScene();
  updateCounters();
  renderTrophyMeter();

  const missing = missingWords().length;
  // Missing words only differs from a full round once some, but not all, words have stars
  const canPlayMissing = missing > 0 && missing < state.words.length;
  els.missingBtn.disabled = !canPlayMissing;
  els.missingBtn.textContent = canPlayMissing ? `🎯 Missing words (${missing})` : '🎯 Missing words';
  const best = bestTime();
  els.bestTime.textContent = best === null ? 'No best time yet' : `Best: ${formatTime(best)}`;

  // The games are open from the start, with every word that's turned on. After GAME_REPEAT_LIMIT of one game in a row,
  // its button waits until something else is played. A waiting button looks greyed out but stays tappable, so a tap
  // can wiggle the other activities instead of doing nothing.
  const listenWaits = gameWaiting('listen');
  els.listenBtn.disabled = !canListen();
  setGameWaiting(els.listenBtn, listenWaits);
  els.listenNote.textContent = listenWaits ? WAIT_NOTE : (canListen() ? 'Find the word' : 'Needs 2 words');
  const buildWaits = gameWaiting('build');
  els.buildBtn.disabled = buildableWords().length === 0;
  setGameWaiting(els.buildBtn, buildWaits);
  els.buildNote.textContent = buildWaits ? WAIT_NOTE : 'Order the sounds';

  renderSummary();
  renderStickers();
  flyInSoon();
}

function setGameWaiting(btn, waiting) {
  btn.classList.toggle('waiting', waiting);
  btn.setAttribute('aria-disabled', String(waiting));
}

// A tap on a waiting game wiggles everything that can be played instead, as a hint to pick one of those.
function hintOtherActivities(game) {
  const others = [els.start, els.missingBtn, els.timedBtn, game === 'listen' ? els.buildBtn : els.listenBtn];
  others.filter((btn) => !btn.disabled && !btn.classList.contains('waiting')).forEach((btn) => playAnim(btn, 'wiggle'));
}

function renderSummary() {
  const last = state.lastRound;
  els.stickerHint.classList.toggle('summary', Boolean(last));
  if (!last) {
    const stickers = boardStickers().length; // prize stickers count too
    els.stickerHint.textContent = stickers === 0
      ? 'Tap “I know it!” to earn stickers'
      : `You have ${plural(stickers, 'sticker')}!`;
    return;
  }

  if (last.mode === 'listen' || last.mode === 'build') {
    const main = document.createElement('span');
    main.className = 'summary-main';
    main.textContent = `🎉 You earned a ${last.result.name} medal!`;
    const more = document.createElement('span');
    more.className = 'summary-time';
    more.textContent = last.result.newTrophy
      ? `🏆 New trophy! You have ${trophyCount()}!`
      : `🏅 +${last.result.count} toward your next trophy`;
    els.stickerHint.replaceChildren(main, more);
    return;
  }

  const n = last.learned.length;
  const main = document.createElement('span');
  main.className = 'summary-main';
  if (n > 0) main.textContent = `🎉 You learned ${plural(n, 'new word')}!`;
  else if (last.capped) main.textContent = `🎉 You read ${plural(last.total, 'word')}!`;
  else if (last.mode === 'missing') main.textContent = '🎉 You practiced all your missing words!';
  else main.textContent = `🎉 You read all ${last.total} words!`;
  const lines = [main];

  if ('ms' in last) {
    const time = document.createElement('span');
    time.className = 'summary-time';
    time.textContent = last.newBest
      ? `🏆 New best time: ${formatTime(last.ms)}!`
      : `⏱️ ${formatTime(last.ms)} (best is ${formatTime(last.best)})`;
    lines.push(time);
  }
  const setLine = n > 0 && setsLeftLine();
  if (setLine) {
    const more = document.createElement('span');
    more.className = 'summary-time';
    more.textContent = setLine;
    lines.push(more);
  }
  els.stickerHint.replaceChildren(...lines);
}

// Sticker play: the 🐵/🙈 switch hides the title, its buttons, the bottom row and ⚙️, and shows 🏆, 🎲 and 🖼️
// beside it. Only then can the stickers be moved. New stickers waiting inside the switch pop onto the board as it opens.
// Stickers and scenes flying into the switch, and a new trophy's "Pick your prize!", wait until it's switched back.
function setPlaying(on) {
  state.playing = on;
  els.home.classList.toggle('playing', on);
  els.playToggle.setAttribute('aria-checked', String(on));
  els.playKnob.textContent = on ? '🙈' : '🐵';
  if (on) openStickersToSee();
  else {
    openWaitingPrizeCard();
    flyInSoon();
  }
  renderPlayBadge();
}

// A red bubble on the switch adds up what's waiting inside: new stickers, prize stickers to pick and new scenes not
// looked at yet. It counts up as each new one lands. In sticker play it moves onto 🏆 and 🖼️, which count their own.
function renderPlayBadge() {
  const waiting = Math.max(0, waitingStickers().length + prizesToPick() + scenesToTry().length - stillToLand());
  els.playBadge.hidden = waiting === 0 || state.playing;
  els.playBadge.textContent = waiting;
  els.playToggle.setAttribute('aria-label', waiting ? `Play with the stickers, ${waiting} new` : 'Play with the stickers');
}

function updateCounters() {
  const stars = knownWords().length;
  renderStarPill();
  els.mini.textContent = `⭐ ${stars} / ${state.words.length}`;
}
