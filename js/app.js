'use strict';

// Start up: load saved data and wire up the buttons. Loaded last, after every other file in js/.

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
  els.soundOut.addEventListener('click', soundOut);
  els.know.addEventListener('click', knowIt);
  els.next.addEventListener('click', goNext);

  els.appVersion.textContent = `v${APP_VERSION}`;
  els.recorderBtn.hidden = !['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);
  onLongPress(els.settingsBtn, 800, openPanel);
  els.voiceSection.hidden = !canSpeak;
  els.voiceSelect.addEventListener('change', () => chooseVoice(els.voiceSelect.value));
  els.voiceTest.addEventListener('click', () => speak('Let’s read! the, and, you'));
  els.panelClose.addEventListener('click', () => els.panel.close());
  els.panel.addEventListener('close', () => showScreen('home'));
  els.reset.addEventListener('click', () => showResetConfirm(true));
  els.resetCancel.addEventListener('click', () => showResetConfirm(false));
  els.resetYes.addEventListener('click', confirmReset);

  let resizeTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => (els.home.hidden ? fitWord() : renderStickers()), 150);
  });
  // The kid-friendly font may arrive after the first word is shown
  document.fonts.ready.then(() => fitWord());

  state.allWords = await loadWords();
  state.offWords = loadOffWords();
  applyOffWords();
  els.start.disabled = false;
  els.timedBtn.disabled = false;
  showScreen('home');
}

init();
