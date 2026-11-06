'use strict';

// Start up: load saved data and wire up the buttons. Loaded last, after every other file in js/.

function fitAllWords() {
  fitWord();
  fitListenChoices();
  fitBuildWord();
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
  els.listenBtn.addEventListener('click', startListen);
  els.listenHome.addEventListener('click', () => {
    stopListen();
    showScreen('home');
  });
  els.listenAgain.addEventListener('click', hearListenWord);
  els.buildBtn.addEventListener('click', startBuild);
  els.buildHome.addEventListener('click', () => {
    stopBuild();
    showScreen('home');
  });
  els.buildAgain.addEventListener('click', hearBuildWord);
  els.card.addEventListener('click', hearWord);
  els.soundOut.addEventListener('click', soundOut);
  els.know.addEventListener('click', knowIt);
  els.next.addEventListener('click', goNext);

  els.appVersion.textContent = `v${APP_VERSION}`;
  els.recorderBtn.hidden = !['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);
  onLongPress(els.settingsBtn, 800, openPanel);
  els.shuffleBtn.addEventListener('click', shuffleStickers);
  els.scenesBtn.addEventListener('click', openSceneTray);
  els.playToggle.addEventListener('click', () => setPlaying(!state.playing));
  // a tap outside the tray closes it
  els.sceneTray.addEventListener('click', (e) => { if (e.target === els.sceneTray) els.sceneTray.close(); });
  els.voiceSection.hidden = !canSpeak;
  els.voiceSelect.addEventListener('change', () => chooseVoice(els.voiceSelect.value));
  els.voiceTest.addEventListener('click', () => speak('Let’s read! the, and, you'));
  els.trophyBtn.addEventListener('click', openTrophies);
  els.trophyMeter.addEventListener('click', openTrophies);
  els.trophyClose.addEventListener('click', () => els.trophyPanel.close());
  els.prizeBtn.addEventListener('click', () => {
    els.trophyPanel.close();
    openPrizeCard();
  });
  els.prizeLater.addEventListener('click', () => els.prizeCard.close());
  els.prizeYes.addEventListener('click', () => pickPrize(prizeChoice));
  els.prizeBack.addEventListener('click', () => showPrizeConfirm(null));
  els.prizeCard.addEventListener('close', renderHome); // the new stickers pop onto the board, and the pill glows if one is saved
  els.updateBtn.addEventListener('click', installUpdate);
  els.panelClose.addEventListener('click', () => els.panel.close());
  els.panel.addEventListener('close', () => showScreen('home'));
  els.reset.addEventListener('click', () => showResetConfirm(true));
  els.resetCancel.addEventListener('click', () => showResetConfirm(false));
  els.resetYes.addEventListener('click', confirmReset);
  els.guideBtn.addEventListener('click', () => showGuide(true));
  els.guideBack.addEventListener('click', () => showGuide(false));
  els.grownupTipOk.addEventListener('click', hideGrownupTip);

  let resizeTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => (els.home.hidden ? fitAllWords() : renderStickers()), 150);
  });
  // The kid-friendly font may arrive after the first word is shown
  document.fonts.ready.then(fitAllWords);

  state.allWords = await loadWords();
  state.offWords = loadOffWords();
  applyOffWords();
  els.start.disabled = false;
  els.timedBtn.disabled = false;
  showScreen('home');
  showGrownupTipOnce();
  fadeOutOfUpdate();
}

init();
startOffline();
startDevTools();
