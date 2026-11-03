'use strict';

// Home screen: mode buttons, the last round's summary, star counters and switching screens.

function showScreen(name) {
  els.home.hidden = name !== 'home';
  els.practice.hidden = name !== 'practice';
  els.listen.hidden = name !== 'listen';
  els.build.hidden = name !== 'build';
  if (name === 'home') renderHome();
}

function renderHome() {
  updateCounters();

  const missing = missingWords().length;
  // Missing words only differs from a full round once some, but not all, words have stars
  const canPlayMissing = missing > 0 && missing < state.words.length;
  els.missingBtn.disabled = !canPlayMissing;
  els.missingBtn.textContent = canPlayMissing ? `🎯 Missing words (${missing})` : '🎯 Missing words';
  const best = bestTime();
  els.bestTime.textContent = best === null ? 'No best time yet' : `Best: ${formatTime(best)}`;

  const starsNeeded = LISTEN_UNLOCK_STARS - knownWords().length;
  els.listenBtn.disabled = starsNeeded > 0;
  els.listenNote.textContent = starsNeeded > 0 ? `🔒 ${plural(starsNeeded, 'more star')}` : 'Find the word';
  const wordsNeeded = BUILD_UNLOCK_WORDS - buildableWords().length;
  els.buildBtn.disabled = wordsNeeded > 0;
  els.buildNote.textContent = wordsNeeded > 0 ? `🔒 ${plural(wordsNeeded, 'more star')}` : 'Order the sounds';

  renderSummary();
  renderStickers();
}

function renderSummary() {
  const last = state.lastRound;
  els.stickerHint.classList.toggle('summary', Boolean(last));
  if (!last) {
    const known = knownWords().length;
    els.stickerHint.textContent = known === 0
      ? 'Tap “I know it!” to earn stickers'
      : `You have ${plural(known, 'sticker')}!`;
    return;
  }

  if (last.mode === 'listen' || last.mode === 'build') {
    const listening = last.mode === 'listen';
    const main = document.createElement('span');
    main.className = 'summary-main';
    main.textContent = `🎉 You ${listening ? 'found' : 'built'} all ${plural(last.total, 'word')}!`;
    const score = document.createElement('span');
    score.className = 'summary-time';
    score.textContent = listening
      ? `🏅 ${last.points} of ${last.maxPoints} points`
      : `🧱 ${last.firstTry} on the first try`;
    els.stickerHint.replaceChildren(main, score);
    return;
  }

  const n = last.learned.length;
  const main = document.createElement('span');
  main.className = 'summary-main';
  if (n > 0) main.textContent = `🎉 You learned ${plural(n, 'new word')}!`;
  else if (last.mode === 'missing') main.textContent = '🎉 You practiced all your missing words!';
  else main.textContent = `🎉 You read all ${last.total} words!`;
  const lines = [main];

  if ('ms' in last) {
    const time = document.createElement('span');
    time.className = 'summary-time';
    time.textContent = last.newBest
      ? `🏆 New best time: ${formatTime(last.ms)}!`
      : `⏱ ${formatTime(last.ms)} (best is ${formatTime(last.best)})`;
    lines.push(time);
  }
  els.stickerHint.replaceChildren(...lines);
}

function updateCounters() {
  const stars = knownWords().length;
  els.progress.textContent = `⭐ ${stars} of ${state.words.length} stars`;
  els.mini.textContent = `⭐ ${stars} / ${state.words.length}`;
}
