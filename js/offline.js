'use strict';

// Turning on offline play (see sw.js), and picking up new versions without interrupting a game.

let swRegistration = null;
let updateWaiting = false;   // a new version is ready and takes over at the next safe moment
let lastUpdateCheck = 0;

function startOffline() {
  // Not on localhost, so edits show right away while working on the app. To test it, use http://127.0.0.1:8000.
  if (!('serviceWorker' in navigator) || location.protocol === 'file:' || location.hostname === 'localhost') return;

  let installed = Boolean(navigator.serviceWorker.controller);
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    updateWaiting = installed; // the very first install has nothing to replace
    installed = true;
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
  if (updateWaiting && !busy && (reopened || !state.lastRound)) fadeIntoUpdate();
}

// "Updating…" where the version shows, then a fade to the plain background before reloading, so there's no flash.
// Taps wait until it's done, so nothing is started on the way out.
function fadeIntoUpdate() {
  updateWaiting = false;
  const page = document.documentElement;
  page.classList.add('update-wait');
  els.appVersion.textContent = 'Updating…';
  els.appVersion.classList.add('updating');
  setTimeout(() => {
    page.classList.add('update-cover');
    setTimeout(() => {
      try { sessionStorage.setItem('sightWords.updating', '1'); } catch (e) { /* reloads without the fade in */ }
      location.reload();
    }, UPDATE_FADE_MS);
  }, UPDATE_MESSAGE_MS);
}

// After an update, once the home screen is drawn: fades the page back in.
function fadeOutOfUpdate() {
  requestAnimationFrame(() => requestAnimationFrame(() => document.documentElement.classList.remove('update-cover')));
}
