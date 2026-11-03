'use strict';

// Listen & tap: hear a starred word, then find it among a few choices.
// It's practice only, so it never changes stars or stickers ("I know it!" does that).

let listenRound = null;      // the game being played: { words, deck, total, points, wordPoints, target, busy }
let listenTimer = null;      // the pause before the next word

function startListen() {
  const words = knownWords();
  if (words.length < LISTEN_UNLOCK_STARS) return;
  const deck = shuffle(words);
  listenRound = { words, deck, total: deck.length, points: 0, wordPoints: 0, target: null, busy: false };
  state.lastRound = null;
  els.listenBar.setAttribute('aria-valuemax', String(deck.length));
  showScreen('listen');
  showListenWord();
}

// Leaving mid-game (the 🏠 button) just drops it, with no summary.
function stopListen() {
  clearTimeout(listenTimer);
  listenRound = null;
  stopAudio();
}

function finishListen() {
  const { total, points } = listenRound;
  stopListen();
  const maxPoints = total * LISTEN_WORD_POINTS;
  const newBest = saveBestScore('listen', points, maxPoints);
  state.lastRound = { mode: 'listen', total, points, maxPoints, newBest, learned: [] };
  showScreen('home');
  confetti();
  if (newBest) flyMedal();
}

function showListenWord() {
  const game = listenRound;
  if (game.deck.length === 0) {
    finishListen();
    return;
  }
  game.target = game.deck.shift();
  game.wordPoints = LISTEN_WORD_POINTS;
  game.busy = false;
  if (game.deck.length) loadClip(wordClip(game.deck[0])); // so the next word is ready to play

  const position = game.total - game.deck.length;
  els.listenCount.textContent = `${position} / ${game.total}`;
  els.listenPoints.textContent = `🏅 ${game.points}`;
  els.listenFill.style.width = `${(position / game.total) * 100}%`;
  els.listenBar.setAttribute('aria-valuenow', String(position));

  const others = shuffle(game.words.filter((word) => word !== game.target)).slice(0, LISTEN_CHOICES - 1);
  els.listenChoices.replaceChildren(...shuffle([game.target, ...others]).map(makeListenChoice));
  fitListenChoices();
  sayWord(game.target);
}

function fitListenChoices() {
  for (const choice of els.listenChoices.children) fitText(choice, choice, 28, 16);
}

function makeListenChoice(word) {
  const choice = document.createElement('button');
  choice.className = 'listen-choice';
  choice.textContent = word;
  choice.addEventListener('click', () => tapListenChoice(choice, word));
  return choice;
}

function tapListenChoice(choice, word) {
  const game = listenRound;
  if (!game || game.busy) return;
  if (word !== game.target) {
    // Gentle retry: this one is out and costs a point, the word is said again, and they keep looking.
    game.wordPoints = Math.max(0, game.wordPoints - 1);
    choice.disabled = true;
    choice.classList.add('wrong');
    playAnim(choice, 'wiggle');
    playIncorrectSound(() => sayWord(game.target));
    return;
  }

  game.busy = true;
  game.points += game.wordPoints;
  els.listenPoints.textContent = `🏅 ${game.points}`;
  playAnim(els.listenPoints, 'bounce');
  choice.classList.add('right');
  playAnim(choice, 'bounce');
  showToast(`${randomCheer()} +${plural(game.wordPoints, 'point')}`);
  sayWord(game.target);
  listenTimer = setTimeout(showListenWord, LISTEN_NEXT_MS);
}

function hearListenWord() {
  if (!listenRound || listenRound.busy) return;
  sayWord(listenRound.target);
  playAnim(els.listenAgain, 'bounce');
}
