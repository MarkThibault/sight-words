'use strict';

// Scenes: the backgrounds behind the sticker board. Finishing a sticker set (see progress.js) unlocks its scene,
// shown with a "set complete!" card. The 🖼️ button picks between the scenes unlocked so far, and the dots are free.
// Also the star pill at the bottom of the home screen, which shows the set being collected.

// The scene showing, or null for the dots.
function currentScene() {
  const id = state.progress.scene;
  return id && unlockedScenes().includes(id) && findSet(id) ? id : null;
}

// A scene's faded emoji. `topOnly` keeps the ones in the top half, for the small preview on the card.
function sceneDecor(set, topOnly = false) {
  return set.decor.filter(([, , , top]) => !topOnly || top < 50).map(([emoji, size, left, top]) => {
    const el = document.createElement('span');
    el.textContent = emoji;
    el.style.setProperty('--size', size);
    el.style.left = `${left}%`;
    el.style.top = `${top}%`;
    return el;
  });
}

// A set's stickers in order, with the ones not earned yet as dark shapes.
function setShapes(set, className) {
  const earned = setStickersEarned(set);
  return setStickers(set).map((emoji) => {
    const el = document.createElement('span');
    el.className = `${className}${earned.includes(emoji) ? ' earned' : ''}`;
    const art = document.createElement('span');
    art.textContent = emoji;
    el.append(art);
    return el;
  });
}

// The scene's background, from [data-bg] in style.css.
function setSceneBackground(el, id) {
  el.dataset.bg = id || 'dots';
}

function renderScene() {
  const id = currentScene();
  setSceneBackground(els.home, id);
  els.sceneDecor.replaceChildren(...(id ? sceneDecor(findSet(id)) : []));
  els.scenesBtn.hidden = unlockedScenes().length === 0;
  els.scenesBtn.classList.toggle('glow', Boolean(state.progress.sceneToTry));
}

// The star pill: ⭐, the set being collected, and the scene it unlocks, filling as the set fills.
// Once every set is full, it shows the last one, full.
function renderStarPill() {
  const set = collectingSet() || STICKER_SETS[STICKER_SETS.length - 1];
  const earned = setStickersEarned(set).length;
  els.starCount.style.setProperty('--fill', `${(earned / SET_SIZE) * 100}%`);
  els.starSet.replaceChildren(...setShapes(set, 'set-sticker'));
  els.starScene.textContent = set.icon;
  els.starCount.setAttribute('aria-label', earned < SET_SIZE
    ? `${set.name} sticker set: ${earned} of ${SET_SIZE}. ${plural(SET_SIZE - earned, 'more star')} to unlock it.`
    : `${set.name} sticker set: complete`);
}

// "2 more to finish the set!" after a round, unless the set isn't started or a scene was just unlocked.
function setsLeftLine() {
  const set = collectingSet();
  if (!set) return null;
  const earned = setStickersEarned(set).length;
  return earned > 0 ? `${set.icon} ${SET_SIZE - earned} more to finish the set!` : null;
}

// ---------- The 🖼️ tray ----------

function openSceneTray() {
  delete state.progress.sceneToTry; // the new scene has been seen
  saveProgress();
  renderScene();
  renderSceneTray();
  els.sceneTray.showModal();
}

function renderSceneTray() {
  const current = currentScene();
  const dots = sceneThumb(null, '⭐', 'Dots', false, current === null);
  const free = document.createElement('span');
  free.className = 'thumb-set';
  free.textContent = 'Free';
  dots.append(free);
  els.sceneList.replaceChildren(dots, ...STICKER_SETS.map((set) => {
    const locked = !unlockedScenes().includes(set.id);
    const thumb = sceneThumb(set.id, set.icon, set.name, locked, current === set.id);
    const row = document.createElement('span');
    row.className = 'thumb-set';
    row.append(...setShapes(set, 'thumb-sticker'));
    thumb.append(row);
    return thumb;
  }));
}

function sceneThumb(id, icon, name, locked, isCurrent) {
  const thumb = document.createElement('button');
  thumb.className = 'scene-thumb';
  setSceneBackground(thumb, id);
  thumb.classList.toggle('locked', locked);
  thumb.classList.toggle('current', isCurrent);
  thumb.setAttribute('aria-label', locked ? `${name}, locked` : name);
  thumb.setAttribute('aria-pressed', String(isCurrent));
  const lock = document.createElement('span');
  if (locked) {
    lock.className = 'thumb-lock';
    lock.textContent = '🔒';
    thumb.append(lock);
  }
  const art = document.createElement('span');
  art.className = 'thumb-icon';
  art.textContent = icon;
  thumb.append(art);
  thumb.addEventListener('click', () => {
    if (locked) {
      // The icon and 🔒 wiggle, not the whole picture: its corners would poke out of the tray and show scroll bars.
      playAnim(art, 'wiggle');
      playAnim(lock, 'wiggle');
      return;
    }
    chooseScene(id);
    els.sceneTray.close();
  });
  return thumb;
}

// Switches the background. The stickers stay where they are.
function chooseScene(id) {
  if (id) state.progress.scene = id;
  else delete state.progress.scene;
  if (state.progress.sceneToTry === id) delete state.progress.sceneToTry;
  saveProgress();
  renderScene();
}

// ---------- "Set complete!" ----------

let sceneCardTimer = null;

// Runs each time the home screen appears: any scene just unlocked gets its card once the new stickers have landed.
function showSceneCardsSoon() {
  clearTimeout(sceneCardTimer);
  if (state.newScenes.length) sceneCardTimer = setTimeout(showNextSceneCard, SCENE_CARD_DELAY_MS);
}

// Waits for the next visit to the home screen if something else is open.
function showNextSceneCard() {
  const busy = els.home.hidden || document.querySelector('dialog[open]');
  if (busy || !state.newScenes.length) return;
  const set = findSet(state.newScenes.shift());
  if (!set) return;
  els.sceneCard.dataset.scene = set.id;
  els.sceneCardTitle.textContent = `🎉 ${set.name.replace(/^The /, '')} set complete!`;
  setSceneBackground(els.sceneCardPreview, set.id);
  els.sceneCardDecor.replaceChildren(...sceneDecor(set, true));
  els.sceneCardName.textContent = `New scene: ${set.name}`;
  els.sceneCardSet.replaceChildren(...setStickers(set).map((emoji) => {
    const el = document.createElement('span');
    el.textContent = emoji;
    return el;
  }));
  els.sceneGo.textContent = `Let's go! ${set.icon}`;
  els.sceneCard.returnValue = '';
  els.sceneCard.showModal();
  playEffect('sceneUnlocked');
}

// "Let's go!" switches to the new scene. "Not now" (or closing the card) keeps the current one, and 🖼️ glows.
function closeSceneCard() {
  const id = els.sceneCard.dataset.scene;
  if (els.sceneCard.returnValue === 'go') chooseScene(id);
  else {
    state.progress.sceneToTry = id;
    saveProgress();
    renderScene();
  }
  if (state.newScenes.length) sceneCardTimer = setTimeout(showNextSceneCard, 400);
}
