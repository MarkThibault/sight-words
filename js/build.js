'use strict';

// Build the word: hear a starred word, then put its sound parts ("th" + "e") in order, by tapping or dragging.
// It's practice only, so it never changes stars or stickers ("I know it!" does that).

let buildRound = null;       // the game being played: { deck, total, firstTry, target, parts, next, slots, missed, busy }
let buildTimer = null;       // the pause before the next word

// Starred words with at least two parts: one-part words like "a" have nothing to put in order.
const buildableWords = () => knownWords().filter((word) => (wordParts(word) || []).length > 1);

function startBuild() {
  const words = buildableWords();
  if (words.length < BUILD_UNLOCK_WORDS) return;
  const deck = shuffle(words);
  buildRound = { deck, total: deck.length, firstTry: 0 };
  state.lastRound = null;
  els.buildBar.setAttribute('aria-valuemax', String(deck.length));
  showScreen('build');
  showBuildWord();
}

// Leaving mid-game (the 🏠 button) just drops it, with no summary.
function stopBuild() {
  clearTimeout(buildTimer);
  buildRound = null;
  stopAudio();
}

function finishBuild() {
  const { total, firstTry } = buildRound;
  stopBuild();
  state.lastRound = { mode: 'build', total, firstTry, learned: [] };
  showScreen('home');
  confetti();
}

function showBuildWord() {
  const game = buildRound;
  if (game.deck.length === 0) {
    finishBuild();
    return;
  }
  game.target = game.deck.shift();
  game.parts = wordParts(game.target);
  game.next = 0;
  game.missed = false;
  game.busy = false;
  preloadClips(game.deck.length ? [game.target, game.deck[0]] : [game.target]);

  const position = game.total - game.deck.length;
  els.buildCount.textContent = `${position} / ${game.total}`;
  els.buildFill.style.width = `${(position / game.total) * 100}%`;
  els.buildBar.setAttribute('aria-valuenow', String(position));

  game.slots = game.parts.map(([letters]) => {
    const slot = document.createElement('span');
    slot.className = 'build-slot';
    slot.textContent = letters; // shown faintly until it's filled in
    return slot;
  });
  els.buildSlots.classList.remove('right');
  els.buildSlots.replaceChildren(...game.slots);

  // Shuffled, but never already in the right order.
  const order = game.parts.map(([letters]) => letters);
  let tiles = shuffle(order);
  while (tiles.join() === order.join()) tiles = shuffle(order);
  els.buildTiles.replaceChildren(...tiles.map(makeBuildTile));
  sayWord(game.target);
}

function makeBuildTile(letters) {
  const tile = document.createElement('button');
  tile.className = 'build-tile';
  tile.textContent = letters;
  tile.addEventListener('pointerdown', (e) => dragBuildTile(e, tile));
  // A keyboard press has no pointer to follow, so it counts like a tap.
  tile.addEventListener('click', (e) => { if (e.detail === 0) placeBuildTile(tile); });
  return tile;
}

// A tap, or a drag dropped on the word, tries the tile in the next empty spot. Dropped anywhere else, it goes back.
function dragBuildTile(e, tile) {
  if (e.button > 0 || !buildRound || buildRound.busy) return;
  e.preventDefault();
  const start = { x: e.clientX, y: e.clientY };
  let moved = false;
  tile.setPointerCapture(e.pointerId);
  tile.classList.add('dragging');

  const move = (ev) => {
    const x = ev.clientX - start.x;
    const y = ev.clientY - start.y;
    moved ||= Math.hypot(x, y) > 6;
    tile.style.translate = `${x}px ${y}px`;
  };
  const drop = (ev) => {
    tile.removeEventListener('pointermove', move);
    tile.removeEventListener('pointerup', drop);
    tile.removeEventListener('pointercancel', drop);
    tile.classList.remove('dragging');
    tile.style.translate = '';
    if (ev.type === 'pointercancel') return;
    const word = els.buildSlots.getBoundingClientRect();
    const overWord = ev.clientX >= word.left && ev.clientX <= word.right && ev.clientY >= word.top && ev.clientY <= word.bottom;
    if (!moved || overWord) placeBuildTile(tile);
  };
  tile.addEventListener('pointermove', move);
  tile.addEventListener('pointerup', drop);
  tile.addEventListener('pointercancel', drop);
}

function placeBuildTile(tile) {
  const game = buildRound;
  if (!game || game.busy) return;
  const [letters, id] = game.parts[game.next];
  if (tile.textContent !== letters) {
    // Gentle retry: the tile stays in the tray, the word is said again, and they keep trying.
    game.missed = true;
    playAnim(tile, 'wiggle');
    sayWord(game.target);
    return;
  }

  tile.classList.add('used');
  game.slots[game.next].classList.add(id ? 'filled' : 'silent');
  game.next += 1;
  if (game.next < game.parts.length) {
    if (id) saySound(id);
    return;
  }

  game.busy = true;
  if (!game.missed) game.firstTry += 1;
  els.buildSlots.classList.add('right');
  playAnim(els.buildSlots, 'bounce');
  showToast(randomCheer());
  sayWord(game.target);
  buildTimer = setTimeout(showBuildWord, BUILD_NEXT_MS);
}

function hearBuildWord() {
  if (!buildRound || buildRound.busy) return;
  sayWord(buildRound.target);
  playAnim(els.buildAgain, 'bounce');
}
