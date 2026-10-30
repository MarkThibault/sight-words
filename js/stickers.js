'use strict';

// Stickers: drawing them, scattering them on the home screen, dragging them around, and flying a new one home.

function makeSticker(word) {
  const h = hash(word);
  const el = document.createElement('div');
  el.className = 'sticker';
  const art = document.createElement('span');
  art.className = 'sticker-art';
  art.textContent = stickerFor(word);
  const label = document.createElement('span');
  label.className = 'sticker-word';
  label.textContent = word;
  el.append(art, label);
  el.style.setProperty('--c', STICKER_COLORS[h % STICKER_COLORS.length]);
  el.style.setProperty('--r', `${(h % 31) - 15}deg`);
  return el;
}

function renderStickers() {
  const known = knownWords();
  const learnedLastRound = state.lastRound ? state.lastRound.learned : [];

  els.board.replaceChildren();
  if (known.length === 0) return;

  const slots = stickerSlots(known.length);
  els.board.style.setProperty('--s', `${slots.size}px`);
  const spots = loadStickerSpots();
  const W = els.board.clientWidth;
  const H = els.board.clientHeight;
  // Stickers that were dragged go on top, the most recently moved last.
  const order = known.map((word, i) => ({ word, i, spot: spots[word] }))
    .sort((a, b) => (a.spot ? a.spot[2] : 0) - (b.spot ? b.spot[2] : 0));
  order.forEach(({ word, i, spot }) => {
    const el = makeSticker(word);
    el.style.left = `${spot ? spot[0] * W : slots[i].x}px`;
    el.style.top = `${spot ? spot[1] * H : slots[i].y}px`;
    makeDraggable(el, word);
    el.classList.toggle('fresh', learnedLastRound.includes(word));
    const newIndex = state.newStickers.indexOf(word);
    if (newIndex >= 0) {
      el.classList.add('pop');
      el.style.animationDelay = `${0.25 + newIndex * 0.15}s`;
    }
    els.board.append(el);
  });
  state.newStickers = [];
}

// Lay the screen out as a grid of sticker-sized cells, skipping cells behind the title and buttons.
// Cells are taken in a fixed random order, so stickers stay put as more are added.
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
    if (free.length >= count || size <= 50) {
      const rand = mulberry32(7);
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
const blockerRects = () => [els.homeCenter, els.progress, els.settingsBtn, els.recorderBtn, els.appVersion]
  .filter((el) => !el.hidden).map((el) => el.getBoundingClientRect());

// ---------- Dragging ----------
// Saved as { word: [x, y, when] }, with x and y as fractions of the screen so they fit any screen size.

function loadStickerSpots() {
  try {
    const spots = JSON.parse(readStorage(STICKER_SPOTS_KEY));
    if (spots && typeof spots === 'object') return spots;
  } catch (e) { /* corrupt: back to the usual layout */ }
  return {};
}

function makeDraggable(el, word) {
  el.addEventListener('pointerdown', (e) => {
    if (e.button > 0) return;
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
      moved ||= Math.hypot(x - start.x, y - start.y) > 4;
      el.style.left = `${x}px`;
      el.style.top = `${y}px`;
    };
    const drop = () => {
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', drop);
      el.removeEventListener('pointercancel', drop);
      el.classList.remove('dragging');
      if (!moved) return;
      // Dropped behind the title or a button? Slide back, so it can't get lost there.
      const x = parseFloat(el.style.left);
      const y = parseFloat(el.style.top);
      const hidden = blockerRects().some((b) =>
        x + board.left > b.left && x + board.left < b.right && y + board.top > b.top && y + board.top < b.bottom);
      if (hidden) {
        el.classList.add('returning');
        el.style.left = `${start.x}px`;
        el.style.top = `${start.y}px`;
        setTimeout(() => el.classList.remove('returning'), 300);
        return;
      }
      const spots = loadStickerSpots();
      spots[word] = [+(x / board.width).toFixed(4), +(y / board.height).toFixed(4), Date.now()];
      writeStorage(STICKER_SPOTS_KEY, JSON.stringify(spots));
    };
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', drop);
    el.addEventListener('pointercancel', drop);
  });
}

// A new sticker pops out of the word card and flies into the 🏠 button.
function flySticker(word) {
  const el = makeSticker(word);
  el.classList.add('flying');
  el.style.setProperty('--s', '160px');
  const from = els.card.getBoundingClientRect();
  const to = els.homeBtn.getBoundingClientRect();
  const x0 = `${from.left + from.width / 2}px`;
  const y0 = `${from.top + from.height / 2}px`;
  const x1 = `${to.left + to.width / 2}px`;
  const y1 = `${to.top + to.height / 2}px`;
  el.style.left = x1;
  el.style.top = y1;
  document.body.append(el);

  if (reduceMotion) {
    setTimeout(() => el.remove(), 600);
    return;
  }
  const anim = el.animate([
    { left: x0, top: y0, scale: 0, rotate: '-360deg' },
    { left: x0, top: y0, scale: 1.15, rotate: '0deg', offset: 0.3 },
    { left: x0, top: y0, scale: 1, rotate: '0deg', offset: 0.5 },
    { left: x1, top: y1, scale: 0.3, rotate: '0deg' },
  ], { duration: 1100, easing: 'ease-in-out' });
  anim.onfinish = () => {
    el.remove();
    playAnim(els.homeBtn, 'wiggle');
  };
}
