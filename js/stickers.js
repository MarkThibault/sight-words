'use strict';

// Stickers: drawing them, scattering them on the home screen, dragging them around, and flying a new one home.

// A word's sticker, as the board draws it.
const wordSticker = (word) => ({ key: word, emoji: stickerFor(word), label: word, at: stats(word).knownAt });

// Everything on the board, oldest first: word stickers (from stars) and prize stickers (from trophies, with a 🏆 tag).
// Oldest first, so stickers stay put as new ones are added.
function boardStickers() {
  const prizes = prizeStickers().map((p, i) => ({ key: `prize-${i}`, emoji: p.emoji, label: '🏆', at: p.at }));
  return [...knownWords().map(wordSticker), ...prizes].sort((a, b) => a.at - b.at);
}

function makeSticker({ key, emoji, label: text }) {
  const h = hash(key);
  const el = make('div', 'sticker');
  el.append(make('span', 'sticker-art', emoji), make('span', 'sticker-word', text));
  el.style.setProperty('--c', STICKER_COLORS[h % STICKER_COLORS.length]);
  el.style.setProperty('--r', `${(h % 31) - 15}deg`);
  return el;
}

function renderStickers() {
  const stickers = boardStickers();
  // New stickers wait inside the 🐵/🙈 switch until sticker play opens. They keep their spots, so nothing moves when they appear.
  const waiting = state.playing ? [] : waitingStickers();

  els.board.replaceChildren();
  els.shuffleBtn.hidden = stickers.length === 0;
  if (stickers.length === 0) return;

  const slots = stickerSlots(stickers.length);
  els.board.style.setProperty('--s', `${slots.size}px`);
  const spots = loadStickerSpots();
  const W = els.board.clientWidth;
  const H = els.board.clientHeight;
  // Stickers that were dragged go on top, the most recently moved last.
  const order = stickers.map((sticker, i) => ({ sticker, i, spot: spots[sticker.key] }))
    .sort((a, b) => (a.spot ? a.spot[2] : 0) - (b.spot ? b.spot[2] : 0));
  order.forEach(({ sticker, i, spot }) => {
    if (waiting.includes(sticker.key)) return;
    const el = makeSticker(sticker);
    el.dataset.key = sticker.key;
    el.style.left = `${spot ? spot[0] * W : slots[i].x}px`;
    el.style.top = `${spot ? spot[1] * H : slots[i].y}px`;
    makeDraggable(el, sticker.key);
    const popIndex = state.stickersToPop.indexOf(sticker.key);
    if (popIndex >= 0) {
      el.classList.add('pop');
      el.style.animationDelay = `${0.25 + popIndex * 0.15}s`;
    }
    els.board.append(el);
  });
  state.stickersToPop = [];
}

// ---------- Waiting inside the 🐵/🙈 switch ----------
// Stickers earned outside sticker play fly into the switch and wait there, saved, until it's next opened. A scene just
// unlocked gets its "set complete!" celebration, which shrinks into the switch, and is counted on 🖼️ until the scene
// tray is opened.

// The waiting stickers still on the board (a grown-up may have taken one away since).
function waitingStickers() {
  const keys = new Set(boardStickers().map((s) => s.key));
  return stickersToSee().filter((key) => keys.has(key));
}

// Sticker play just opened: the waiting stickers pop onto the board, and anything still to fly in is already there.
function openStickersToSee() {
  clearTimeout(flyInTimer);
  state.stickersToFly = [];
  state.scenesToFly = [];
  const waiting = waitingStickers();
  delete state.progress.stickersToSee;
  saveProgress();
  if (!waiting.length) return;
  state.stickersToPop = waiting;
  renderStickers();
}

let flyInTimer = null;
let inTheAir = 0;

// Stickers and scenes on their way in, which the switch's red bubble doesn't count until they land.
const stillToLand = () => state.stickersToFly.length + state.scenesToFly.length + inTheAir;

// Runs each time the home screen is drawn: what was earned since flies in once the screen has settled.
function flyInSoon() {
  clearTimeout(flyInTimer);
  if (state.stickersToFly.length || state.scenesToFly.length) flyInTimer = setTimeout(flyNextIn, FLY_IN_DELAY_MS);
}

// One at a time, stickers first. Waits for the next visit to the home screen if something else is open.
function flyNextIn() {
  if (homeIsBusy() || state.playing) return;
  if (state.stickersToFly.length) {
    const key = state.stickersToFly.shift();
    const sticker = boardStickers().find((s) => s.key === key);
    if (sticker) {
      const el = makeSticker(sticker);
      el.classList.add('flying');
      el.style.setProperty('--s', '130px');
      flyIntoSwitch(el, 'stickerDown');
    }
  } else if (state.scenesToFly.length) {
    // "Set complete!" waits for the stickers to land, and anything after it waits for it to finish
    if (inTheAir) {
      flyInTimer = setTimeout(flyNextIn, FLY_IN_GAP_MS);
      return;
    }
    const set = findSet(state.scenesToFly.shift());
    if (set) {
      inTheAir += 1;
      renderPlayBadge();
      celebrateScene(set, () => {
        inTheAir -= 1;
        playAnim(els.playToggle, 'wiggle');
        renderPlayBadge();
        if (state.stickersToFly.length || state.scenesToFly.length) flyInTimer = setTimeout(flyNextIn, FLY_IN_GAP_MS);
      });
      return;
    }
  }
  renderPlayBadge();
  if (state.stickersToFly.length || state.scenesToFly.length) flyInTimer = setTimeout(flyNextIn, FLY_IN_GAP_MS);
}

// It pops up in the middle of the home screen, flies into the switch, and the switch wiggles as the count goes up.
function flyIntoSwitch(el, landSound) {
  inTheAir += 1;
  flyInto(el, els.stickerHint, els.playToggle, { duration: 1200, endScale: 0.25 }, () => {
    inTheAir -= 1;
    playAnim(els.playToggle, 'wiggle');
    if (landSound) playEffect(landSound);
    renderPlayBadge();
  });
}

// Lay the screen out as a grid of sticker-sized cells, skipping cells behind the title and buttons.
// Cells are taken in a fixed random order, so stickers stay put as more are added (🎲 picks a new order).
function stickerSlots(count) {
  const W = els.board.clientWidth;
  const H = els.board.clientHeight;
  const origin = els.board.getBoundingClientRect();
  const blockers = blockerRects();
  let size = Math.min(150, Math.max(70, Math.min(W, H) / 5));

  for (;;) {
    const cell = size * 1.25;
    const cols = Math.max(1, Math.floor(W / cell));
    const rows = Math.max(1, Math.floor(H / cell));
    const padX = (W - cols * cell) / 2;
    const padY = (H - rows * cell) / 2;
    const free = [];
    const covered = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = padX + (c + 0.5) * cell;
        const y = padY + (r + 0.5) * cell;
        const hit = blockers.some((b) =>
          x + size / 2 > b.left - origin.left && x - size / 2 < b.right - origin.left &&
          y + size / 2 > b.top - origin.top && y - size / 2 < b.bottom - origin.top);
        (hit ? covered : free).push({ x, y });
      }
    }
    if (free.length >= count || size <= STICKER_MIN_SIZE) {
      const rand = mulberry32(Number(readStorage(STICKER_SEED_KEY)) || 7);
      const order = [...shuffle(free, rand), ...shuffle(covered, rand)];
      const slots = Array.from({ length: count }, (_, i) => {
        const p = order[i % order.length];
        return { x: p.x + (rand() - 0.5) * cell * 0.2, y: p.y + (rand() - 0.5) * cell * 0.2 };
      });
      slots.size = size;
      return slots;
    }
    size *= 0.88;
  }
}

// The title, buttons and counters on the home screen, which stickers stay out from behind.
const blockerRects = () => [els.homeCenter, els.starCount, els.trophyMeter, els.settingsBtn, els.playToggle, els.recorderBtn, els.shuffleBtn, els.scenesBtn, els.trophyBtn, els.appVersion, els.updateBtn, els.devBtn]
  .filter((el) => !el.hidden).map(restingRect);

// Where an element sits without its slide (its CSS translate). Outside sticker play, 🏆 🎲 and 🖼️ are slid away
// behind the 🐵/🙈 switch, but stickers have to stay clear of the spot they slide out to.
function restingRect(el) {
  const rect = el.getBoundingClientRect();
  const slide = getComputedStyle(el).translate;
  const [x, y = 0] = slide === 'none' ? [0, 0] : slide.split(' ').map(parseFloat);
  return { left: rect.left - x, right: rect.right - x, top: rect.top - y, bottom: rect.bottom - y };
}

// ---------- Dragging ----------
// Saved as { key: [x, y, when] }, with x and y as fractions of the screen so they fit any screen size.
// The key is the word, or "prize-0", "prize-1"… for prize stickers.

function loadStickerSpots() {
  try {
    const spots = JSON.parse(readStorage(STICKER_SPOTS_KEY));
    if (spots && typeof spots === 'object') return spots;
  } catch (e) { /* corrupt: back to the usual layout */ }
  return {};
}

function makeDraggable(el, key) {
  el.addEventListener('pointerdown', (e) => {
    if (e.button > 0 || !state.playing) return; // stickers only move in sticker play
    e.preventDefault();
    const board = els.board.getBoundingClientRect();
    const start = { x: parseFloat(el.style.left), y: parseFloat(el.style.top) };
    const grab = { x: e.clientX - board.left - start.x, y: e.clientY - board.top - start.y };
    let moved = false;
    els.board.append(el); // on top of the others (before capturing: moving it would drop the capture)
    el.setPointerCapture(e.pointerId);
    el.classList.remove('pop');
    el.classList.add('dragging');

    const move = (ev) => {
      const x = Math.min(board.width, Math.max(0, ev.clientX - board.left - grab.x));
      const y = Math.min(board.height, Math.max(0, ev.clientY - board.top - grab.y));
      if (!moved && Math.hypot(x - start.x, y - start.y) > 4) {
        moved = true;
        playEffect('stickerUp'); // only once it's really lifted, so a tap stays quiet
      }
      el.style.left = `${x}px`;
      el.style.top = `${y}px`;
    };
    const drop = () => {
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', drop);
      el.removeEventListener('pointercancel', drop);
      el.classList.remove('dragging');
      if (!moved) return;
      playEffect('stickerDown');
      const x = parseFloat(el.style.left);
      const y = parseFloat(el.style.top);
      const spots = loadStickerSpots();
      spots[key] = [+(x / board.width).toFixed(4), +(y / board.height).toFixed(4), Date.now()];
      writeStorage(STICKER_SPOTS_KEY, JSON.stringify(spots));
    };
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', drop);
    el.addEventListener('pointercancel', drop);
  });
}

// Forgets where stickers were dragged and slides them onto a new random grid around the title.
function shuffleStickers() {
  writeStorage(STICKER_SPOTS_KEY, null);
  writeStorage(STICKER_SEED_KEY, String(1 + Math.floor(Math.random() * 1e9)));
  const stickers = boardStickers();
  const slots = stickerSlots(stickers.length);
  els.board.style.setProperty('--s', `${slots.size}px`);
  stickers.forEach(({ key }, i) => {
    const el = [...els.board.children].find((s) => s.dataset.key === key);
    if (!el) return;
    el.classList.remove('pop');
    el.classList.add('gliding');
    el.style.left = `${slots[i].x}px`;
    el.style.top = `${slots[i].y}px`;
    setTimeout(() => el.classList.remove('gliding'), 600);
  });
  playEffect('diceRoll');
  playAnim(els.shuffleDie, 'roll');
  playAnim(els.shuffleShadow, 'roll-shadow');
}

// "I know it!" gave a star: a "New sticker!" card with the sticker and its word pops up over the word card, holds,
// then shrinks into the 🏠 button, which wiggles. Without motion (the device's "reduce motion" setting) it fades in and
// out where it is instead. `landed` runs once it's gone.
function showNewSticker(word, landed) {
  const sticker = makeSticker(wordSticker(word));
  const card = make('div', 'new-sticker-card');
  card.setAttribute('role', 'status');
  card.append(make('h2', '', 'New sticker!'), sticker);

  const pop = NEW_STICKER_POP_MS;
  const hold = NEW_STICKER_HOLD_MS;
  const total = pop + hold + NEW_STICKER_FLY_MS;
  const a = els.card.getBoundingClientRect();
  const b = els.homeBtn.getBoundingClientRect();
  const from = { left: `${a.left + a.width / 2}px`, top: `${a.top + a.height / 2}px` };
  const to = { left: `${b.left + b.width / 2}px`, top: `${b.top + b.height / 2}px` };
  Object.assign(card.style, from);
  document.body.append(card);

  const keyframes = reduceMotion
    ? [{ opacity: 0 }, { opacity: 1, offset: pop / total }, { opacity: 1, offset: (pop + hold) / total }, { opacity: 0 }]
    : [
      { ...from, scale: 0, rotate: '-20deg', easing: 'ease-out' },
      { ...from, scale: 1.08, rotate: '0deg', offset: (pop * 0.7) / total, easing: 'ease-in-out' },
      { ...from, scale: 1, offset: pop / total },
      { ...from, scale: 1, offset: (pop + hold) / total, easing: 'ease-in' },
      { ...to, scale: 0.12 },
    ];
  card.animate(keyframes, { duration: total }).onfinish = () => {
    card.remove();
    if (!reduceMotion) playAnim(els.homeBtn, 'wiggle');
    landed();
  };
}
