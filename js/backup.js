'use strict';

// Save or move progress, on the Grown-up corner's Settings page. "Save a copy" downloads a small file with this
// device's progress, turned-off words, sticker spots and switches. "Load a copy" reads one back after asking, then
// reloads, so everything is drawn from it. The voice isn't in it, since each device has its own voices.
// The file only goes where the grown-up saves it: the app never sends it anywhere.

const BACKUP_APP = 'sight-words';
const BACKUP_KEYS = [STORAGE_KEY, OFF_WORDS_KEY, STICKER_SPOTS_KEY, STICKER_SEED_KEY, SETTINGS_KEY];
let backupToLoad = null; // the copy waiting for "Yes, load it"

function saveBackup() {
  const data = Object.fromEntries(BACKUP_KEYS.map((key) => [key, readStorage(key)]).filter(([, value]) => value !== null));
  const file = new Blob([JSON.stringify({ app: BACKUP_APP, version: 1, savedAt: new Date().toISOString(), data })],
    { type: 'application/json' });
  const name = `sight-words-progress-${today()}.json`;
  const link = make('a');
  link.href = URL.createObjectURL(file);
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 10_000);
  showBackupNote(`Saved “${name}”, usually in Downloads.`);
}

// The chosen file is checked before anything is asked: it has to be a copy saved by this app.
async function chooseBackup(file) {
  els.backupFile.value = ''; // so choosing the same file again still works
  if (!file) return;
  let copy = null;
  try {
    copy = JSON.parse(await file.text());
    const progress = JSON.parse(copy.data[STORAGE_KEY]);
    if (copy.app !== BACKUP_APP || !progress || typeof progress.words !== 'object') copy = null;
    else copy.stars = Object.values(progress.words).filter((word) => word.known).length;
  } catch (e) {
    copy = null;
  }
  if (!copy) {
    showBackupNote('That file isn’t a copy saved by Sight Words.');
    return;
  }
  backupToLoad = copy;
  const saved = new Date(copy.savedAt);
  els.loadDetail.textContent = `It replaces the stars, stickers, medals, trophies and settings on this device with the copy saved on ${
    isNaN(saved) ? 'another day' : saved.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })
  }, which has ${plural(copy.stars, 'word')} with a star. This can't be undone.`;
  els.loadConfirm.showModal();
}

function loadBackup() {
  const { data } = backupToLoad;
  BACKUP_KEYS.forEach((key) => writeStorage(key, typeof data[key] === 'string' ? data[key] : null));
  location.reload();
}

function showBackupNote(text) {
  els.backupNote.textContent = text;
  els.backupNote.hidden = false;
}
