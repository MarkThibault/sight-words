'use strict';

// Build the word: hear a word, then pick out its sound parts ("th" + "e") in order, by tapping or dragging.
// A few extra tiles from other sight words don't belong.
// It's practice only, so it never changes stars or stickers ("I know it!" does that).

let buildRound = null;       // the game being played: { deck, total, maxPoints, lit, result, points, wordPoints, target, parts, next, slots, busy }
let buildTimer = null;       // the pause before the next word

// Every word that's turned on, starred or not, with its parts listed in js/phonics.js.
// A one-part word like "a" is just picking the right tile.
const buildableWords = () => state.words.filter(wordParts);

function startBuild() {
  const words = buildableWords();
  if (words.length === 0) return;
  if (gameWaiting('build')) { hintOtherActivities('build'); return; }
  const deck = pickWords(words, GAME_MAX_WORDS, 'buildAt');
  const maxPoints = deck.length * BUILD_WORD_POINTS;
  buildRound = { deck, total: deck.length, maxPoints, lit: 0, result: null, points: 0 };
  state.lastRound = null;
  els.buildBar.setAttribute('aria-valuemax', String(maxPoints));
  showScreen('build');
  showBuildWord();
}

// Leaving mid-game (the 🏠 button) just drops it, with no summary.
function stopBuild() {
  clearTimeout(buildTimer);
  buildRound = null;
  stopAudio();
}

function showBuildWord() {
  const game = buildRound;
  if (game.deck.length === 0) {
    stopBuild();
    finishGame('build', game);
    return;
  }
  game.target = game.deck.shift();
  markShown(game.target, 'buildAt');
  game.parts = wordParts(game.target);
  game.next = 0;
  game.wordPoints = BUILD_WORD_POINTS;
  game.busy = false;
  preloadClips(game.deck.length ? [game.target, game.deck[0]] : [game.target]);

  const position = game.total - game.deck.length;
  els.buildCount.textContent = `${position} / ${game.total}`;
  updateGameMeter(game, els.buildBar);

  game.slots = game.parts.map(([letters]) => make('span', 'build-slot', letters)); // shown faintly until filled in
  els.buildSlots.classList.remove('right');
  els.buildSlots.replaceChildren(...game.slots);

  // Shuffled, but never already in the right order.
  const order = game.parts.map(([letters]) => letters);
  const all = [...order, ...buildExtras(order)];
  let tiles = shuffle(all);
  while (all.length > 1 && tiles.join() === order.join()) tiles = shuffle(all);
  els.buildTiles.replaceChildren(...tiles.map(makeBuildTile));
  fitBuildWord();
  sayWord(game.target);
}

function fitBuildWord() {
  if (buildRound) fitText(els.buildSlots, els.buildSlots, 32, 8);
}

// A few extra tiles that don't belong, taken from the parts of the other sight words.
function buildExtras(used) {
  const others = new Map(state.words.flatMap((word) => (wordParts(word) || []).map(([letters]) => [letters.toLowerCase(), letters])));
  const random = BUILD_EXTRA_MIN + Math.floor(Math.random() * (BUILD_EXTRA_MAX - BUILD_EXTRA_MIN + 1));
  const count = Math.max(random, BUILD_MIN_TILES - used.length); // short words get more, so there are always enough tiles
  // Ignoring case, so "i" is never a wrong answer next to the word "I".
  const lower = used.map((letters) => letters.toLowerCase());
  return shuffle([...others].filter(([key]) => !lower.includes(key)).map(([, letters]) => letters)).slice(0, count);
}

function makeBuildTile(letters) {
  const tile = make('button', 'build-tile', letters);
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
    // Gentle retry: it costs a point, the tile stays in the tray, the sound they're looking for is played,
    // and they keep trying.
    game.wordPoints = Math.max(BUILD_MIN_WORD_POINTS, game.wordPoints - 1);
    playAnim(tile, 'wiggle');
    playEffect('wrong', () => saySound(id));
    return;
  }

  tile.classList.add('used');
  game.slots[game.next].classList.add(isSilentSound(id) ? 'silent' : 'filled');
  game.next += 1;
  if (game.next < game.parts.length) {
    saySound(id);
    return;
  }

  game.busy = true;
  // The last part still gets its sound, then the whole word.
  saySound(id, () => { buildTimer = setTimeout(finishBuildWord, SOUND_GAP_MS); });
}

function finishBuildWord() {
  const game = buildRound;
  els.buildSlots.classList.add('right');
  playAnim(els.buildSlots, 'bounce');
  scoreWord(game, els.buildBar);
  playEffect('correct', () => sayWord(game.target, () => { buildTimer = setTimeout(showBuildWord, BUILD_NEXT_MS); }));
}

function hearBuildWord() {
  if (!buildRound || buildRound.busy) return;
  sayWord(buildRound.target);
  playAnim(els.buildAgain, 'bounce');
}
