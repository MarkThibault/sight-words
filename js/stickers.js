'use strict';

// Stickers: drawing them, scattering them on the home screen, and flying a new one home.

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
  known.forEach((word, i) => {
    const el = makeSticker(word);
    el.style.left = `${slots[i].x}px`;
    el.style.top = `${slots[i].y}px`;
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
  const blockers = [els.homeCenter, els.progress, els.settingsBtn, els.recorderBtn, els.appVersion]
    .filter((el) => !el.hidden).map((el) => el.getBoundingClientRect());
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
