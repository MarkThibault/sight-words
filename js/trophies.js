'use strict';

// Trophies (the meter on the home screen): what's been accomplished so far, and the medal meters that lead to them.

const NOT_YET = 'Not yet';

function openTrophies() {
  renderTrophies();
  els.trophyPanel.showModal();
}

// ---------- Medals ----------

const medalsForScore = (points, maxPoints) => GAME_MEDALS.filter(({ share }) => points / maxPoints >= share).length;

// The bar in a game, with each medal at the share of the points that earns it. `lit` medals are earned so far.
function renderGameMeter(meter, fraction, lit) {
  if (!meter.firstChild) {
    meter.innerHTML = '<div class="meter-track"><div class="meter-fill"></div></div>';
    meter.append(...GAME_MEDALS.map(({ emoji, share }) => {
      const slot = document.createElement('span');
      slot.className = 'meter-slot';
      slot.style.left = `${share * 100}%`;
      const medal = document.createElement('span');
      medal.textContent = emoji;
      slot.append(medal);
      return slot;
    }));
  }
  meter.querySelector('.meter-fill').style.width = `${fraction * 100}%`;
  meter.querySelectorAll('.meter-slot').forEach((slot, i) => {
    slot.classList.toggle('earned', i < lit);
    slot.classList.remove('pop'); // or the last game's medal would pop again when this screen next shows
  });
}

// Shows the game's points on its bar, and pops any medal just reached. A medal only counts once the game is finished,
// so when `wordDone` is the last word, this saves them. Returns the result: { emoji, name, count, newTrophy }.
function updateGameMeter(game, meter, wordDone = false) {
  const lit = medalsForScore(game.points, game.maxPoints);
  renderGameMeter(meter, game.points / game.maxPoints, lit);
  meter.setAttribute('aria-valuenow', String(game.points));
  const slots = meter.querySelectorAll('.meter-slot');
  for (let i = game.lit; i < lit; i++) playAnim(slots[i], 'pop');
  game.lit = lit;
  if (wordDone && game.deck.length === 0 && !game.result) {
    const count = Math.max(lit, 1); // finishing always earns bronze
    const { emoji, name } = GAME_MEDALS[count - 1];
    game.result = { emoji, name, count, newTrophy: earnMedals(count) };
  }
  return game.result;
}

const medalToast = (result) => `${result.emoji} A ${result.name} medal!`;

// On the home screen: a medal, a bar filling up to the next trophy, and how many trophies so far.
function renderTrophyMeter() {
  const toward = medalsTowardTrophy();
  els.homeMedal.classList.toggle('waiting', toward === 0);
  els.homeFill.style.width = `${(toward / MEDALS_PER_TROPHY) * 100}%`;
  els.trophyCount.textContent = `🏆 ${trophyCount()}`;
  els.trophyMeter.setAttribute('aria-label', `My trophies: ${trophyCount()}, and ${toward} of ${MEDALS_PER_TROPHY} medals toward the next`);
}

// After a game: the best medal flies into the meter, or a new trophy into the count.
function flyGameMedal(result) {
  if (result.newTrophy) flyMedal('🏆', els.trophyCount);
  else flyMedal(result.emoji, els.homeMedal);
}

// A new record or medal: it pops up over the home screen and flies into the trophy meter.
function flyMedal(emoji = '🏅', target = els.trophyCount) {
  if (reduceMotion) {
    playAnim(els.trophyMeter, 'wiggle');
    return;
  }
  const medal = document.createElement('span');
  medal.className = 'flying-medal';
  medal.textContent = emoji;
  document.body.append(medal);
  const from = els.stickerHint.getBoundingClientRect();
  const to = target.getBoundingClientRect();
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
    playAnim(els.trophyMeter, 'wiggle');
  };
}

function renderTrophies() {
  const time = bestTime();
  const rows = [
    ['⭐', 'Starred words', `${knownWords().length} of ${state.words.length}`],
    ['⏱️', 'Best time', time === null ? null : formatTime(time)],
    ['🏅', 'Medals', medalCount() || null],
    ['🏆', 'Trophies', trophyCount() || null],
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
