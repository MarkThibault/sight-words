'use strict';

// Turning on offline play (see sw.js), and offering new versions without interrupting a game.
// A new version downloads in the background, then waits. It takes over from the "Update" button on the home
// screen, or by itself the next time the app is reopened.

let swRegistration = null;
let lastUpdateCheck = 0;
let installingUpdate = false;

function startOffline() {
  // Not on localhost, so edits show right away while working on the app. To test it, use http://127.0.0.1:8000.
  if (!('serviceWorker' in navigator) || location.protocol === 'file:' || location.hostname === 'localhost') return;

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (installingUpdate) location.reload();
  });

  lastUpdateCheck = Date.now(); // loading the page has just checked
  navigator.serviceWorker.register('sw.js').then((registration) => {
    swRegistration = registration;
    registration.addEventListener('updatefound', () => watchDownload(registration.installing));
    if (registration.installing) watchDownload(registration.installing);
    if (registration.waiting) updateOnReopen(); // opened with a version already waiting

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState !== 'visible') return;
      // Back from another app partway through updating (phones pause a page in the background): finish it,
      // and if it doesn't reload by itself, reload anyway. A version still waiting then takes over as the page opens.
      if (installingUpdate) setTimeout(() => location.reload(), UPDATE_RELOAD_WAIT_MS);
      else if (swRegistration.waiting) updateOnReopen();
      else checkForUpdate();
    });
  }).catch((e) => console.warn('Offline play is not available.', e));
}

// Runs each time the home screen appears.
function homeShown() {
  checkForUpdate();
}

function checkForUpdate() {
  if (!swRegistration || Date.now() - lastUpdateCheck < UPDATE_CHECK_MS) return;
  lastUpdateCheck = Date.now();
  swRegistration.update().catch(() => {}); // offline: tries again later
}

// The very first install has nothing to replace, so it stays out of sight.
function watchDownload(worker) {
  if (!navigator.serviceWorker.controller) return;
  showUpdateStatus('downloading');
  worker.addEventListener('statechange', () => {
    if (worker.state === 'installed') showUpdateStatus('ready');
    else if (worker.state === 'redundant' && !swRegistration.waiting) showUpdateStatus('none'); // the download failed
  });
}

// Once updating has started, "Updating…" stays until the reload, and the button doesn't come back.
// (Taps are blocked while updating, so a button shown then could never be pressed.)
function showUpdateStatus(status) {
  if (installingUpdate) return;
  els.appVersion.classList.toggle('downloading', status === 'downloading');
  els.appVersion.textContent = status === 'downloading' ? 'Downloading new version' : `v${APP_VERSION}`;
  els.updateBtn.hidden = status !== 'ready';
}

// Reopening takes the update straight away, unless that would interrupt something. Then the button stays on offer.
function updateOnReopen() {
  const busy = els.home.hidden || state.playing || document.querySelector('dialog[open]') || els.board.querySelector('.dragging');
  showUpdateStatus('ready');
  if (!busy) installUpdate();
}

function installUpdate() {
  const waiting = swRegistration && swRegistration.waiting;
  if (!waiting || installingUpdate) return;
  installingUpdate = true;
  fadeIntoUpdate(() => {
    waiting.postMessage('activate'); // the new version takes over, and 'controllerchange' reloads into it
    setTimeout(() => location.reload(), UPDATE_RELOAD_WAIT_MS);
  });
}

// "Updating…" where the version shows, then a fade to the plain background, so the reload doesn't flash.
// Taps wait until it's done, so nothing is started on the way out. `reload` runs once the page is covered.
function fadeIntoUpdate(reload) {
  const page = document.documentElement;
  page.classList.add('update-wait');
  els.updateBtn.hidden = true;
  els.appVersion.textContent = 'Updating…';
  els.appVersion.classList.add('updating');
  setTimeout(() => {
    page.classList.add('update-cover');
    setTimeout(() => {
      try { sessionStorage.setItem('sightWords.updating', '1'); } catch (e) { /* reloads without the fade in */ }
      reload();
    }, UPDATE_FADE_MS);
  }, UPDATE_MESSAGE_MS);
}

// After an update, once the home screen is drawn: fades the page back in.
function fadeOutOfUpdate() {
  requestAnimationFrame(() => requestAnimationFrame(() => document.documentElement.classList.remove('update-cover')));
}
