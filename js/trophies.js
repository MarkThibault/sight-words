'use strict';

// Trophies (the 🏆 button on the home screen): what's been accomplished so far.

const NOT_YET = 'Not yet';

function openTrophies() {
  renderTrophies();
  els.trophyPanel.showModal();
}

// A new record: a medal pops up over the home screen and flies into the 🏆 button.
function flyMedal() {
  if (reduceMotion) {
    playAnim(els.trophyBtn, 'wiggle');
    return;
  }
  const medal = document.createElement('span');
  medal.className = 'flying-medal';
  medal.textContent = '🏅';
  document.body.append(medal);
  const from = els.stickerHint.getBoundingClientRect();
  const to = els.trophyBtn.getBoundingClientRect();
  const x0 = `${from.left + from.width / 2}px`;
  const y0 = `${from.top + from.height / 2}px`;
  const x1 = `${to.left + to.width / 2}px`;
  const y1 = `${to.top + to.height / 2}px`;
  const anim = medal.animate([
    { left: x0, top: y0, scale: 0, rotate: '-180deg' },
    { left: x0, top: y0, scale: 1.2, rotate: '0deg', offset: 0.25 },
    { left: x0, top: y0, scale: 1, rotate: '0deg', offset: 0.5 },
    { left: x1, top: y1, scale: 0.35, rotate: '360deg' },
  ], { duration: 1600, easing: 'ease-in-out' });
  anim.onfinish = () => {
    medal.remove();
    playAnim(els.trophyBtn, 'wiggle');
  };
}

function renderTrophies() {
  const score = (game) => {
    const best = bestScore(game);
    return best && `${best.points} of ${best.maxPoints} points`;
  };
  const time = bestTime();
  const rows = [
    ['⭐', 'Starred words', `${knownWords().length} of ${state.words.length}`],
    ['⏱', 'Best time', time === null ? null : formatTime(time)],
    ['👂', 'Listen & tap best score', score('listen')],
    ['🧱', 'Build the word best score', score('build')],
  ];
  els.trophyList.replaceChildren(...rows.map(([icon, name, value]) => {
    const row = document.createElement('li');
    const iconEl = document.createElement('span');
    iconEl.className = 'trophy-icon';
    iconEl.textContent = icon;
    const nameEl = document.createElement('span');
    nameEl.textContent = name;
    const valueEl = document.createElement('span');
    valueEl.className = value ? 'trophy-value' : 'trophy-value none';
    valueEl.textContent = value || NOT_YET;
    row.append(iconEl, nameEl, valueEl);
    return row;
  }));
}
