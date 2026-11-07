'use strict';

// Trophies (the meter on the home screen): what's been accomplished so far, and the medal meters that lead to them.

const NOT_YET = 'Not yet';

function openTrophies() {
  renderTrophies();
  els.trophyPanel.showModal();
}

// ---------- Prize stickers ----------

let prizeCardTimer = null;
let prizeCardWaiting = false; // a new trophy's "Pick your prize!", waiting for sticker play to be switched off
let prizeChoice = null; // the sticker tapped, waiting for "Yes!"

// "Pick your prize!": every sticker not on the board yet. Picking puts it on the board, and "Later" saves the pick,
// with the trophy pill glowing and a button in My Trophies until it's picked.
function openPrizeCard() {
  clearTimeout(prizeCardTimer);
  if (!prizesToPick() || homeIsBusy()) return;
  renderPrizeCard();
  els.prizeCard.showModal();
  els.prizeList.scrollTop = 0;
}

// After a game earns a trophy, "Pick your prize!" opens by itself, unless sticker play is on: like other pop-ups, it
// waits until sticker play is switched off. Meanwhile 🏆 in sticker play shows the prize waiting, to pick there.
function offerPrizeCard() {
  if (state.playing) prizeCardWaiting = true;
  else openPrizeCard();
}

// Sticker play was switched off.
function openWaitingPrizeCard() {
  if (!prizeCardWaiting) return;
  prizeCardWaiting = false;
  openPrizeCard();
}

function renderPrizeCard() {
  showPrizeConfirm(null);
  const left = prizesToPick();
  els.prizeTitle.textContent = left > 1 ? `🎁 Pick your prizes! (${left})` : '🎁 Pick your prize!';
  els.prizeList.replaceChildren(...stickersNotOnBoard().map((emoji) => {
    const choice = document.createElement('button');
    choice.className = 'prize-choice';
    choice.textContent = emoji;
    choice.addEventListener('click', () => showPrizeConfirm(emoji));
    return choice;
  }));
}

// "Put this sticker on your board?" in place of the grid, with the sticker shown big. null goes back to the grid.
function showPrizeConfirm(emoji) {
  prizeChoice = emoji;
  const confirming = emoji !== null;
  els.prizeConfirm.hidden = !confirming;
  els.prizeNote.hidden = confirming;
  els.prizeList.hidden = confirming;
  els.prizeActions.hidden = confirming;
  if (confirming) {
    els.prizeChosen.textContent = emoji;
    playAnim(els.prizeChosen, 'pop');
    els.prizeYes.focus();
  }
}

function pickPrize(emoji) {
  const key = addPrize(emoji);
  if (state.playing) state.stickersToPop.push(key); // in sticker play it pops straight onto the board
  else {
    markStickerToSee(key); // otherwise it flies into the 🐵/🙈 switch and waits there
    state.stickersToFly.push(key);
  }
  playEffect('stickerDown');
  if (prizesToPick()) renderPrizeCard();
  else els.prizeCard.close();
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

// On the home screen: a pill that fills up toward the next trophy, from 🏅 to how many trophies so far.
function renderTrophyMeter() {
  const toward = medalsTowardTrophy();
  els.homeMedal.classList.toggle('waiting', toward === 0);
  // Prizes waiting to be picked: the trophy pill glows, and a red bubble on 🏆 says how many
  const prizes = prizesToPick();
  els.trophyMeter.classList.toggle('glow', prizes > 0);
  els.trophyBadge.hidden = prizes === 0;
  els.trophyBadge.textContent = prizes;
  els.trophyBtn.setAttribute('aria-label', prizes ? `My trophies, ${plural(prizes, 'prize')} to pick` : 'My trophies');
  renderPlayBadge();
  els.trophyMeter.style.setProperty('--fill', `${(toward / MEDALS_PER_TROPHY) * 100}%`);
  els.trophyCount.textContent = `🏆 ${trophyCount()}`;
  els.trophyMeter.setAttribute('aria-label', `My trophies: ${trophyCount()}, and ${toward} of ${MEDALS_PER_TROPHY} medals toward the next`);
}

// After a game: the best medal flies into the meter, or a new trophy into the count.
function flyGameMedal(result) {
  playEffect(result.newTrophy ? 'trophy' : 'medal');
  if (result.newTrophy) {
    flyMedal('🏆', els.trophyCount);
    prizeCardTimer = setTimeout(offerPrizeCard, PRIZE_CARD_DELAY_MS);
  } else flyMedal(result.emoji, els.homeMedal);
}

// A new record or medal: it pops up over the home screen and flies into the trophy pill.
function flyMedal(emoji = '🏅', target = els.trophyCount) {
  const medal = document.createElement('span');
  medal.className = 'flying-medal';
  medal.textContent = emoji;
  flyInto(medal, els.stickerHint, target, { duration: 1600, endScale: 0.35, endSpin: '360deg', pop: 1.2, popAt: 0.25 },
    () => playAnim(els.trophyMeter, 'wiggle'));
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
  const left = prizesToPick();
  els.prizeBtn.hidden = left === 0;
  els.prizeBtnText.textContent = left > 1 ? '🎁 Prizes to pick!' : '🎁 A prize to pick!';
  els.prizeBtnBadge.textContent = left;
  els.prizeBtn.setAttribute('aria-label', `Pick your ${plural(left, 'prize')}`);
}
