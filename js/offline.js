'use strict';

// Turning on offline play (see sw.js), and picking up new versions without interrupting a game.

let swRegistration = null;
let updateWaiting = false;   // a new version is ready and takes over at the next safe moment
let lastUpdateCheck = 0;

function startOffline() {
  // Not on localhost, so edits show right away while working on the app. To test it, use http://127.0.0.1:8000.
  if (!('serviceWorker' in navigator) || location.protocol === 'file:' || location.hostname === 'localhost') return;

  const hadVersion = Boolean(navigator.serviceWorker.controller);
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    updateWaiting = hadVersion; // the very first install has nothing to replace
    applyUpdate();
  });

  lastUpdateCheck = Date.now(); // loading the page has just checked
  navigator.serviceWorker.register('sw.js').then((registration) => {
    swRegistration = registration;
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState !== 'visible') return;
      if (updateWaiting) applyUpdate(true);
      else checkForUpdate();
    });
  }).catch((e) => console.warn('Offline play is not available.', e));
}

// Runs each time the home screen appears.
function homeShown() {
  applyUpdate();
  checkForUpdate();
}

function checkForUpdate() {
  if (!swRegistration || Date.now() - lastUpdateCheck < UPDATE_CHECK_MS) return;
  lastUpdateCheck = Date.now();
  swRegistration.update().catch(() => {}); // offline: tries again later
}

// Reloads into the new version only on an idle home screen: not during a game, a pop-up or a sticker drag.
// A round's summary is kept too, unless the app has just been reopened (reopened = true).
function applyUpdate(reopened = false) {
  const busy = els.home.hidden || els.panel.open || els.trophyPanel.open || els.board.querySelector('.dragging');
  if (updateWaiting && !busy && (reopened || !state.lastRound)) location.reload();
}
