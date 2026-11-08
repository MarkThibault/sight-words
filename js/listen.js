'use strict';

// Listen & tap: hear a word, then find it among a few choices. It uses every word that's turned on, starred or not.
// It's practice only, so it never changes stars or stickers ("I know it!" does that).

let listenRound = null;      // the game being played: { words, deck, total, maxPoints, lit, result, points, wordPoints, target, busy }
let listenTimer = null;      // the pause before the next word

// It needs at least two words to choose between.
const canListen = () => state.words.length >= 2;

function startListen() {
  const words = state.words;
  if (!canListen()) return;
  if (gameWaiting('listen')) { hintOtherActivities('listen'); return; }
  const deck = pickWords(words, GAME_MAX_WORDS, 'listenAt');
  const maxPoints = deck.length * LISTEN_WORD_POINTS;
  listenRound = { words, deck, total: deck.length, maxPoints, lit: 0, result: null, points: 0, wordPoints: 0, target: null, busy: false };
  state.lastRound = null;
  els.listenBar.setAttribute('aria-valuemax', String(maxPoints));
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
  const { total, points, result } = listenRound;
  stopListen();
  noteGameFinished('listen');
  state.lastRound = { mode: 'listen', total, points, result, learned: [] };
  showScreen('home');
  confetti();
  flyGameMedal(result);
}

function showListenWord() {
  const game = listenRound;
  if (game.deck.length === 0) {
    finishListen();
    return;
  }
  game.target = game.deck.shift();
  markShown(game.target, 'listenAt');
  game.wordPoints = LISTEN_WORD_POINTS;
  game.busy = false;
  if (game.deck.length) loadClip(wordClip(game.deck[0])); // so the next word is ready to play

  const position = game.total - game.deck.length;
  els.listenCount.textContent = `${position} / ${game.total}`;
  updateGameMeter(game, els.listenBar);

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
    playEffect('wrong', () => sayWord(game.target));
    return;
  }

  game.busy = true;
  game.points += game.wordPoints;
  choice.classList.add('right');
  playAnim(choice, 'bounce');
  const result = updateGameMeter(game, els.listenBar, true);
  showToast(result ? medalToast(result) : `${randomCheer()} +${plural(game.wordPoints, 'point')}`);
  playEffect('correct', () => sayWord(game.target));
  listenTimer = setTimeout(showListenWord, LISTEN_NEXT_MS);
}

function hearListenWord() {
  if (!listenRound || listenRound.busy) return;
  sayWord(listenRound.target);
  playAnim(els.listenAgain, 'bounce');
}
