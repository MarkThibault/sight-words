'use strict';

// Grown-up corner (press and hold the ⚙️ button): a full-screen page with four pages of its own. Progress (how it's
// going and the next words), Words (per-word stickers and switches), Settings (voice and reset) and Guide.
// Tablets switch pages with the tabs; phones with the ☰ menu, which shows the page's name in place of the tabs.

const PHONE_CORNER_QUERY = '(max-width: 600px)'; // matches the phone layout in style.css
const PANEL_PAGES = { progress: '📊 Progress', words: '📝 Words', settings: '⚙️ Settings', guide: '📖 Guide' };
const WORD_FILTERS = {
  all: { label: 'All', test: () => true },
  starred: { label: '⭐ Has a star', test: (word) => stats(word).known },
  learning: { label: 'Learning', test: (word) => !stats(word).known && !state.offWords.has(word) },
  practice: { label: '🧡 Needs practice', test: (word) => !state.offWords.has(word) && practiceNeed(word) !== null },
  off: { label: 'Turned off', test: (word) => state.offWords.has(word) },
};
let wordFilter = 'all';

function openPanel() {
  hideGrownupTip();
  wordFilter = 'all';
  fillPanelNumbers();
  renderPanel();
  showPanelPage('progress');
  if (canSpeak) renderVoiceOptions();
  els.panel.showModal();
}

function showPanelPage(page) {
  els.panel.querySelectorAll('.gc-page').forEach((section) => { section.hidden = section.dataset.page !== page; });
  els.panel.querySelectorAll('.gc-tab').forEach((tab) => tab.setAttribute('aria-selected', String(tab.dataset.page === page)));
  els.panel.querySelectorAll('.gc-menu-item').forEach((item) => item.classList.toggle('on', item.dataset.page === page));
  els.panelPageTitle.textContent = PANEL_PAGES[page];
  els.panelBody.scrollTop = 0;
  els.panelMenu.close();
}

function togglePanelMenu() {
  if (els.panelMenu.open) els.panelMenu.close();
  else {
    els.panelMenu.show();
    els.panelMenuBtn.setAttribute('aria-expanded', 'true');
  }
}

function renderPanel() {
  renderProgressPage();
  renderWordsPage();
}

// How it's going: a few numbers, and the words every round and game includes until they have a star.
function renderProgressPage() {
  const total = state.words.length;
  const off = state.offWords.size;
  const best = bestTime();
  const tile = (big, small) => {
    const el = make('div', 'gc-tile');
    el.append(make('b', '', big), make('span', '', small));
    return el;
  };
  els.progressTiles.replaceChildren(
    tile(`⭐ ${knownWords().length} of ${total}`, 'words have a star' + (off ? ` · ${off} turned off` : '')),
    tile(`👂 ${state.words.filter((w) => stats(w).heard > 0).length} of ${total}`, 'words heard so far'),
    tile(`🏆 ${trophyCount()}`, `${trophyCount() === 1 ? 'trophy' : 'trophies'} · 🏅 ${plural(medalCount(), 'medal')}`),
    tile(`🖼️ ${unlockedScenes().length} of ${STICKER_SETS.length}`, 'scenes unlocked'),
    tile(`⏱️ ${best === null ? '–' : formatTime(best)}`, best === null ? 'no Timed run yet' : 'best Timed run'),
  );
  renderPracticeList();
  const next = nextWordsToLearn(state.words);
  els.nextWords.replaceChildren(...(next.length
    ? next.map((word) => make('span', 'gc-word', word))
    : [make('p', '', 'Every word has a star! 🎉')]));
}

// Needs practice: each word with why, and 🔊 to hear it. The Words page marks the rest, past PRACTICE_SHOW.
function renderPracticeList() {
  const needs = wordsToPractice();
  els.practiceEmpty.hidden = needs.length > 0;
  const more = needs.length - PRACTICE_SHOW;
  els.practiceMore.hidden = more <= 0;
  els.practiceMore.textContent = `And ${more} more, marked 🧡 on the Words page.`;
  els.practiceList.replaceChildren(...needs.slice(0, PRACTICE_SHOW).map((need) => {
    const row = document.createElement('li');
    const why = make('span', 'practice-why');
    const reasons = [];
    if (need.misses) {
      reasons.push([`Missed ${need.misses} of the last ${need.tries} tries in games`]);
      if (need.mixedUp) reasons.push(['mixed up with ', make('b', '', need.mixedUp[0]), ` ${need.mixedUp[1]}×`]);
    }
    if (need.skipped) reasons.push([`Skipped in ${need.skipped} reading rounds, no star yet`]);
    if (need.known) reasons.push(['has a star']);
    reasons.forEach((parts, i) => why.append(...(i ? [' · '] : []), ...parts));
    const hear = make('button', 'chip', '🔊');
    hear.setAttribute('aria-label', `Hear ${need.word}`);
    hear.addEventListener('click', () => sayWord(need.word));
    row.append(make('span', 'practice-word', need.word), why, hear);
    return row;
  }));
}

function renderWordsPage() {
  els.wordFilters.replaceChildren(...Object.entries(WORD_FILTERS).map(([id, filter]) => {
    const chip = make('button', `chip${id === wordFilter ? ' on' : ''}`,
      `${filter.label} ${state.allWords.filter(filter.test).length}`);
    chip.setAttribute('aria-pressed', String(id === wordFilter));
    chip.addEventListener('click', () => {
      wordFilter = id;
      renderWordsPage();
    });
    return chip;
  }));
  const words = state.allWords.filter(WORD_FILTERS[wordFilter].test);
  els.panelListEmpty.hidden = words.length > 0;
  els.panelList.replaceChildren(...words.map((word) => {
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
    if (isOn && practiceNeed(word)) name.append(make('span', 'practice-mark', '🧡'));
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

// Asks "are you sure?" in a pop-up over the corner. (confirm() is blocked in some browsers, such as embedded previews.)
function showResetConfirm(show) {
  if (show) els.resetConfirm.showModal();
  else els.resetConfirm.close();
}

// The corner's numbers, in the guide and on Progress, come from config.js, so they stay right when they change.
function fillPanelNumbers() {
  const numbers = {
    roundMax: ROUND_MAX_WORDS,
    nextWords: NEXT_WORDS,
    listenChoices: LISTEN_CHOICES,
    silver: Math.round(GAME_MEDALS.find((m) => m.name === 'silver').share * 100),
    medalsPerTrophy: MEDALS_PER_TROPHY,
    setSize: SET_SIZE,
    practiceTries: PRACTICE_TRIES,
    practiceMisses: PRACTICE_MISSES,
    practiceClear: PRACTICE_CLEAR,
    practiceStuck: PRACTICE_STUCK_ROUNDS,
    practiceShow: PRACTICE_SHOW,
  };
  els.panel.querySelectorAll('[data-number]').forEach((el) => {
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
