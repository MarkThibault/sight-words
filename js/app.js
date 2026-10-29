'use strict';

// Start up: load the word list and saved data, and wire up the buttons. Loaded last, after every other file in js/.

async function loadWords() {
  try {
    const res = await fetch('words.json', { cache: 'no-cache' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return cleanList(await res.json());
  } catch (e) {
    console.warn('Could not load words.json, using the built-in list.', e);
    return cleanList(FALLBACK_WORDS);
  }
}

// Trim each word and drop blanks and repeats.
function cleanList(list) {
  const seen = new Set();
  return list.map((w) => String(w).trim()).filter((w) => w && !seen.has(w) && seen.add(w));
}

async function init() {
  state.progress = loadProgress();

  if (canSpeak) {
    pickVoice();
    speechSynthesis.onvoiceschanged = () => {
      pickVoice();
      if (els.panel.open) renderVoiceOptions();
    };
  }

  els.start.addEventListener('click', () => startRound('all'));
  els.missingBtn.addEventListener('click', () => startRound('missing'));
  els.timedBtn.addEventListener('click', () => startRound('all', true));
  els.homeBtn.addEventListener('click', () => {
    stopRound();
    showScreen('home');
  });
  els.card.addEventListener('click', hearWord);
  els.know.addEventListener('click', knowIt);
  els.next.addEventListener('click', goNext);

  onLongPress(els.progress, 800, openPanel);
  els.voiceSection.hidden = !canSpeak;
  els.voiceSelect.addEventListener('change', () => chooseVoice(els.voiceSelect.value));
  els.voiceTest.addEventListener('click', () => speak('Let’s read! the, and, you'));
  els.panelClose.addEventListener('click', () => els.panel.close());
  els.panel.addEventListener('close', () => showScreen('home'));
  els.reset.addEventListener('click', confirmReset);

  let resizeTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => (els.home.hidden ? fitWord() : renderStickers()), 150);
  });
  // The kid-friendly font may arrive after the first word is shown
  document.fonts.ready.then(() => fitWord());

  state.words = await loadWords();
  els.start.disabled = false;
  els.timedBtn.disabled = false;
  showScreen('home');
}

init();
