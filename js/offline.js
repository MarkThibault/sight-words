'use strict';

// Turning on offline play (see sw.js), and picking up new versions when the app is reopened.

function startOffline() {
  // Not on localhost, so edits show right away while working on the app. To test it, use http://127.0.0.1:8000.
  if (!('serviceWorker' in navigator) || location.protocol === 'file:' || location.hostname === 'localhost') return;

  const hadVersion = Boolean(navigator.serviceWorker.controller);
  let updateWaiting = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    updateWaiting = hadVersion; // the very first install has nothing to replace
  });

  navigator.serviceWorker.register('sw.js').then((registration) => {
    // Waits until the app is reopened, so an update never interrupts a game.
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState !== 'visible') return;
      if (updateWaiting) location.reload();
      else registration.update().catch(() => {});
    });
  }).catch((e) => console.warn('Offline play is not available.', e));
}
