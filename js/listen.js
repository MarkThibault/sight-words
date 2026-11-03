'use strict';

// Listen & tap: hear a starred word, then find it among a few choices.
// It's practice only, so it never changes stars or stickers ("I know it!" does that).

let listenRound = null;      // the game being played: { words, deck, total, firstTry, target, missed, busy }
let listenTimer = null;      // the pause before the next word

function startListen() {
  const words = knownWords();
  if (words.length < LISTEN_UNLOCK_STARS) return;
  const deck = shuffle(words);
  listenRound = { words, deck, total: deck.length, firstTry: 0, target: null, missed: false, busy: false };
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
  const { total, firstTry } = listenRound;
  stopListen();
  state.lastRound = { mode: 'listen', total, firstTry, learned: [] };
  showScreen('home');
  confetti();
}

function showListenWord() {
  const game = listenRound;
  if (game.deck.length === 0) {
    finishListen();
    return;
  }
  game.target = game.deck.shift();
  game.missed = false;
  game.busy = false;
  if (game.deck.length) loadClip(wordClip(game.deck[0])); // so the next word is ready to play

  const position = game.total - game.deck.length;
  els.listenCount.textContent = `${position} / ${game.total}`;
  els.listenFill.style.width = `${(position / game.total) * 100}%`;
  els.listenBar.setAttribute('aria-valuenow', String(position));

  const others = shuffle(game.words.filter((word) => word !== game.target)).slice(0, LISTEN_CHOICES - 1);
  els.listenChoices.replaceChildren(...shuffle([game.target, ...others]).map(makeListenChoice));
  sayWord(game.target);
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
    // Gentle retry: this one is out, the word is said again, and they keep looking.
    game.missed = true;
    choice.disabled = true;
    choice.classList.add('wrong');
    playAnim(choice, 'wiggle');
    sayWord(game.target);
    return;
  }

  game.busy = true;
  if (!game.missed) game.firstTry += 1;
  choice.classList.add('right');
  playAnim(choice, 'bounce');
  showToast(randomCheer());
  sayWord(game.target);
  listenTimer = setTimeout(showListenWord, LISTEN_NEXT_MS);
}

function hearListenWord() {
  if (!listenRound || listenRound.busy) return;
  sayWord(listenRound.target);
  playAnim(els.listenAgain, 'bounce');
}
