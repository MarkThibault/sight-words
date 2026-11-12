'use strict';

// Grown-up corner (press and hold the ⚙️ button): per-word progress, voice choice and reset.

function openPanel() {
  hideGrownupTip();
  showGuide(false);
  showResetConfirm(false);
  renderPanel();
  if (canSpeak) renderVoiceOptions();
  els.panel.showModal();
}

function renderPanel() {
  const off = state.offWords.size;
  els.panelSummary.textContent =
    `${knownWords().length} of ${state.words.length} words have a star · ` +
    `${state.words.filter((w) => stats(w).heard > 0).length} heard so far` +
    (off ? ` · ${off} turned off` : '');
  els.panelList.replaceChildren(...state.allWords.map((word) => {
    const s = stats(word);
    const isOn = !state.offWords.has(word);
    const row = document.createElement('li');
    row.classList.toggle('off', !isOn);
    // The switch turns a word on or off for practice; at least one word always stays on.
    const name = make('label', 'panel-word');
    const toggle = document.createElement('input');
    toggle.type = 'checkbox';
    toggle.className = 'word-switch';
    toggle.setAttribute('role', 'switch');
    toggle.checked = isOn;
    toggle.disabled = isOn && state.words.length === 1;
    toggle.addEventListener('change', () => {
      setWordOn(word, toggle.checked);
      renderPanel();
    });
    name.append(toggle, word);
    const heard = make('span', 'panel-heard', s.heard ? `heard ${s.heard}×` : 'not yet');
    const chip = make('button', `chip${s.known ? ' on' : ''}`, s.known ? `${stickerFor(word)} Sticker` : 'No sticker');
    chip.disabled = !isOn;
    chip.addEventListener('click', () => {
      setKnown(word, !s.known);
      renderPanel();
    });
    row.append(name, heard, chip);
    return row;
  }));
}

function renderVoiceOptions() {
  const voices = englishVoices();
  const best = voices[0] ? ` (${voices[0].name})` : '';
  els.voiceSelect.replaceChildren(
    new Option(`Automatic${best}`, ''),
    ...voices.map((v) => new Option(v.name, v.voiceURI)),
  );
  const saved = savedVoiceURI();
  els.voiceSelect.value = voices.some((v) => v.voiceURI === saved) ? saved : '';
}

function chooseVoice(uri) {
  saveVoiceURI(uri);
  speak('Let’s read!');
}

// Asks "are you sure?" over the whole panel, so it's clear the question has changed.
// (confirm() is blocked in some browsers, such as embedded previews.)
function showResetConfirm(show) {
  els.panelMain.inert = show;
  els.resetConfirm.hidden = !show;
  (show ? els.resetCancel : els.reset).focus({ preventScroll: true });
  els.panel.scrollTop = 0; // the cover sits over the top of the panel, so keep it in view
}

// "What's in this app": swaps the word list for a guide to the games, rewards, switches and installing.
function showGuide(show) {
  els.panelMain.hidden = show;
  els.panelGuide.hidden = !show;
  if (show) {
    fillGuideNumbers();
    els.guideBody.scrollTop = 0;
  }
  (show ? els.guideBack : els.guideBtn).focus();
}

// The guide's numbers come from config.js, so it stays right when they change.
function fillGuideNumbers() {
  const numbers = {
    roundMax: ROUND_MAX_WORDS,
    nextWords: NEXT_WORDS,
    listenChoices: LISTEN_CHOICES,
    silver: Math.round(GAME_MEDALS.find((m) => m.name === 'silver').share * 100),
    medalsPerTrophy: MEDALS_PER_TROPHY,
    setSize: SET_SIZE,
  };
  els.panelGuide.querySelectorAll('[data-number]').forEach((el) => {
    el.textContent = numbers[el.dataset.number];
  });
}

// The first time the app opens, a tip shows grown-ups where their corner is. It's only ever shown once,
// and stays on the home screen until it's dismissed or the corner is opened.
function showGrownupTipOnce() {
  if (readStorage(GROWNUP_TIP_KEY)) return;
  writeStorage(GROWNUP_TIP_KEY, '1');
  els.grownupTip.hidden = false;
}

function hideGrownupTip() {
  els.grownupTip.hidden = true;
}

function confirmReset() {
  resetProgress();
  state.lastRound = null;
  state.stickersToFly = [];
  state.scenesToFly = [];
  renderPanel();
  showResetConfirm(false);
}
