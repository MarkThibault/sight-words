'use strict';

// Grown-up corner (press and hold the stars counter): per-word progress, voice choice and reset.

function openPanel() {
  renderPanel();
  if (canSpeak) renderVoiceOptions();
  els.panel.showModal();
}

function renderPanel() {
  els.panelSummary.textContent =
    `${knownWords().length} of ${state.words.length} words have a star · ` +
    `${state.words.filter((w) => stats(w).heard > 0).length} heard so far`;
  els.panelList.replaceChildren(...state.words.map((word) => {
    const s = stats(word);
    const row = document.createElement('li');
    const name = document.createElement('span');
    name.className = 'panel-word';
    name.textContent = word;
    const heard = document.createElement('span');
    heard.className = 'panel-heard';
    heard.textContent = s.heard ? `heard ${s.heard}×` : 'not yet';
    const chip = document.createElement('button');
    chip.className = `chip${s.known ? ' on' : ''}`;
    chip.textContent = s.known ? `${stickerFor(word)} Sticker` : 'No sticker';
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

function confirmReset() {
  if (!confirm('Erase all progress, stickers and best times on this device?')) return;
  resetProgress();
  state.lastRound = null;
  renderPanel();
}
