'use strict';

// Developer tools, only on localhost: the 🛠️ button on the home screen previews the update statuses, and jumps to the
// moment just before a reward. Offline play is off on localhost, so nothing here touches a real update.
// The jumps change this browser's saved progress, so the first one keeps a backup that "Restore my progress" puts back.

const DEV_BACKUP_KEY = 'devTools.progressBackup'; // not sightWords.*, so a backup never backs itself up

function startDevTools() {
  if (location.hostname !== 'localhost') return;
  els.devBtn.hidden = false;
  els.devBtn.addEventListener('click', () => { els.devPanel.hidden = !els.devPanel.hidden; });
  // A tap anywhere else closes it, and still does what it tapped (so after a jump, one tap can start the game)
  document.addEventListener('pointerdown', (e) => {
    if (!els.devPanel.contains(e.target) && !els.devBtn.contains(e.target)) els.devPanel.hidden = true;
  });

  const previews = {
    none: () => showUpdateStatus('none'),
    downloading: () => showUpdateStatus('downloading'),
    ready: () => showUpdateStatus('ready'),
    updating: previewUpdate,
  };
  const statusButtons = els.devPanel.querySelectorAll('button[data-status]');
  for (const button of statusButtons) {
    button.addEventListener('click', () => {
      for (const other of statusButtons) other.setAttribute('aria-pressed', String(other === button));
      previews[button.dataset.status]();
    });
  }
  els.updateBtn.addEventListener('click', previewUpdate); // the real one has nothing to install here

  $('dev-trophy-next').addEventListener('click', () => jumpTo(nextGameEarnsTrophy));
  $('dev-set-next').addEventListener('click', () => jumpTo(oneStarFromSet));
  $('dev-restore').addEventListener('click', restoreProgress);
  $('dev-restore').hidden = !readStorage(DEV_BACKUP_KEY);
}

// The real message and fades, with a plain reload standing in for the new version.
function previewUpdate() {
  fadeIntoUpdate(() => location.reload());
}

// ---------- Jump to ----------
// Each jump stops just short of a reward, through the same code real play uses, so the real moment plays next.

function jumpTo(setUp) {
  if (!readStorage(DEV_BACKUP_KEY)) {
    const saved = Object.fromEntries(savedKeys().map((key) => [key, readStorage(key)]));
    writeStorage(DEV_BACKUP_KEY, JSON.stringify(saved));
  }
  const note = $('dev-note');
  note.textContent = setUp();
  note.hidden = false;
  $('dev-restore').hidden = false;
  renderHome();
}

const savedKeys = () => {
  try { return Object.keys(localStorage).filter((key) => key.startsWith('sightWords.')); } catch (e) { return []; }
};

// Medals one short of the next trophy, so any medal from the next game completes it: the medal flight, the trophy
// fanfare and "Pick your prize!".
function nextGameEarnsTrophy() {
  state.progress.medals = (trophyCount() + 1) * MEDALS_PER_TROPHY - 1;
  saveProgress();
  return 'Finish a game of Listen & tap or Build the word to earn a trophy.';
}

// Stars, with their stickers, on words without one until the set being collected needs one more. The next
// "I know it!" on a word without a star finishes it, with its "set complete!" celebration.
function oneStarFromSet() {
  let set = collectingSet();
  while (set && setStickersEarned(set).length < SET_SIZE - 1 && missingWords().length > 1) {
    setKnown(missingWords()[0], true);
    set = collectingSet();
  }
  if (!set) return 'Every sticker set is full already.';
  if (setStickersEarned(set).length < SET_SIZE - 1) return 'Not enough words without a star. Turn some on, or restore.';
  return `One more star finishes ${set.name}. 🎯 Missing words shows only the words without one.`;
}

// Puts back the saved progress from before the first jump, exactly, and starts the app again with it.
function restoreProgress() {
  let saved = {};
  try { saved = JSON.parse(readStorage(DEV_BACKUP_KEY)) || {}; } catch (e) { /* no backup: everything is cleared */ }
  savedKeys().forEach((key) => writeStorage(key, null));
  Object.entries(saved).forEach(([key, value]) => writeStorage(key, value));
  writeStorage(DEV_BACKUP_KEY, null);
  location.reload();
}
