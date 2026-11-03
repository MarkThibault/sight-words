'use strict';

// Developer tools, only on localhost: the 🛠️ button on the home screen previews the update statuses.
// Offline play is off on localhost, so nothing here touches a real update, and saved progress isn't changed.

function startDevTools() {
  if (location.hostname !== 'localhost') return;
  els.devBtn.hidden = false;
  els.devBtn.addEventListener('click', () => { els.devPanel.hidden = !els.devPanel.hidden; });

  const previews = {
    none: () => showUpdateStatus('none'),
    downloading: () => showUpdateStatus('downloading'),
    ready: () => showUpdateStatus('ready'),
    updating: previewUpdate,
  };
  for (const button of els.devPanel.querySelectorAll('button')) {
    button.addEventListener('click', () => {
      for (const other of els.devPanel.querySelectorAll('button')) other.setAttribute('aria-pressed', String(other === button));
      previews[button.dataset.status]();
    });
  }
  els.updateBtn.addEventListener('click', previewUpdate); // the real one has nothing to install here
}

// The real message and fades, with a plain reload standing in for the new version.
function previewUpdate() {
  fadeIntoUpdate(() => location.reload());
}
