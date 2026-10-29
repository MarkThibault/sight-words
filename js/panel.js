'use strict';

// Grown-up corner (press and hold the ⚙️ button): per-word progress, voice choice and reset.

function openPanel() {
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
    const name = document.createElement('label');
    name.className = 'panel-word';
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
    const heard = document.createElement('span');
    heard.className = 'panel-heard';
    heard.textContent = s.heard ? `heard ${s.heard}×` : 'not yet';
    const chip = document.createElement('button');
    chip.className = `chip${s.known ? ' on' : ''}`;
    chip.textContent = s.known ? `${stickerFor(word)} Sticker` : 'No sticker';
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

// Asks "are you sure?" inside the panel, in place of the Reset/Done buttons.
// (confirm() is blocked in some browsers, such as embedded previews.)
function showResetConfirm(show) {
  els.panelActions.hidden = show;
  els.resetConfirm.hidden = !show;
  (show ? els.resetCancel : els.reset).focus();
}

function confirmReset() {
  resetProgress();
  state.lastRound = null;
  renderPanel();
  showResetConfirm(false);
}
