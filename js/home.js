'use strict';

// Home screen: mode buttons, the last round's summary, star counters and switching screens.

function showScreen(name) {
  els.home.hidden = name !== 'home';
  els.practice.hidden = name !== 'practice';
  if (name === 'home') renderHome();
}

function renderHome() {
  updateCounters();

  const missing = missingWords().length;
  // Only offer "missing words" when it differs from a full round
  els.missingBtn.hidden = missing === 0 || missing === state.words.length;
  els.missingBtn.textContent = `🎯 Missing words (${missing})`;
  const best = bestTime();
  els.bestTime.textContent = best === null ? 'No best time yet' : `Best: ${formatTime(best)}`;

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
