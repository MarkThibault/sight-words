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
    showSceneCardsSoon();
  }
}

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

  // The games are open from the start, with every word that's turned on
  els.listenBtn.disabled = !canListen();
  els.listenNote.textContent = canListen() ? 'Find the word' : 'Needs 2 words';
  els.buildBtn.disabled = buildableWords().length === 0;
  els.buildNote.textContent = 'Order the sounds';

  renderSummary();
  renderStickers();
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

// Sticker play: the 🐵/🙈 switch hides the title, its buttons and the bottom row, leaving the stickers, the scene
// and the top buttons. Pop-ups like "set complete!" wait until it's switched back.
function setPlaying(on) {
  state.playing = on;
  els.home.classList.toggle('playing', on);
  els.playToggle.setAttribute('aria-checked', String(on));
  els.playKnob.textContent = on ? '🙈' : '🐵';
  if (!on) showSceneCardsSoon();
}

function updateCounters() {
  const stars = knownWords().length;
  renderStarPill();
  els.mini.textContent = `⭐ ${stars} / ${state.words.length}`;
}
