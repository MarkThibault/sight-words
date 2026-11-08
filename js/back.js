'use strict';

// The back button (Android's, or the browser's) closes whatever is on top, one thing at a time: a pop-up, then a game
// or reading round (like its 🏠 button), then sticker play. On the home screen with nothing open, it leaves the app.
// The app keeps one history entry for each thing open, so back has something to undo. When something closes another
// way (its own button, or by itself), the extra entries are taken back off, so back never does nothing.

let backEntries = 0;      // history entries the app has added
let backTidying = false;  // taking extra entries off, which finishes with a popstate

// What's open on top of the home screen. A reading round, a game and sticker play never overlap.
const openLayers = () => document.querySelectorAll('dialog[open]').length + (els.home.hidden ? 1 : 0) + (state.playing ? 1 : 0);

// Adds or takes off history entries until there's one for each thing open. Runs after anything opens or closes.
function syncBackButton() {
  if (backTidying) return; // runs again when the tidying finishes
  const layers = openLayers();
  for (; backEntries < layers; backEntries++) history.pushState({ sightWordsLayer: backEntries + 1 }, '');
  if (layers < backEntries) {
    backTidying = true;
    history.go(layers - backEntries);
  }
}

function closeTopLayer() {
  const dialogs = document.querySelectorAll('dialog[open]');
  if (dialogs.length) dialogs[dialogs.length - 1].close();
  else if (!els.practice.hidden) els.homeBtn.click();
  else if (!els.listen.hidden) els.listenHome.click();
  else if (!els.build.hidden) els.buildHome.click();
  else if (state.playing) setPlaying(false);
}

function startBackButton() {
  // A reload keeps the history entries from before, with nothing open now, so they're taken off at the start.
  backEntries = (history.state && history.state.sightWordsLayer) || 0;
  window.addEventListener('popstate', () => {
    const wasTidying = backTidying;
    backTidying = false;
    backEntries = (history.state && history.state.sightWordsLayer) || 0;
    if (!wasTidying && backEntries < openLayers()) closeTopLayer(); // back was pressed
    syncBackButton();
  });
  // Pop-ups open and close in many places, so they're watched rather than each one telling this file.
  new MutationObserver(syncBackButton).observe(document.body, { subtree: true, attributes: true, attributeFilter: ['open'] });
  syncBackButton();
}
