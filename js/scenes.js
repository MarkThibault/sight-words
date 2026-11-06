'use strict';

// Scenes: the backgrounds behind the sticker board. Finishing a sticker set (see progress.js) unlocks its scene,
// and its icon flies into the 🐵/🙈 switch (see stickers.js). The 🖼️ button picks between the scenes unlocked so far,
// and the dots are free.
// Also the star pill at the bottom of the home screen, which shows the set being collected.

// The scene showing, or null for the dots.
function currentScene() {
  const id = state.progress.scene;
  return id && unlockedScenes().includes(id) && findSet(id) ? id : null;
}

// A scene's faded emoji.
function sceneDecor(set) {
  return set.decor.map(([emoji, size, left, top]) => {
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
  // New scenes not looked at yet: a red bubble on 🖼️ says how many
  const toTry = scenesToTry().length;
  els.scenesBadge.hidden = toTry === 0;
  els.scenesBadge.textContent = toTry;
  els.scenesBtn.setAttribute('aria-label', toTry ? `Choose a scene, ${plural(toTry, 'new scene')}` : 'Choose a scene');
  renderPlayBadge();
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

let lockedHintTimer = null;
let sceneHintTimer = null;

function openSceneTray() {
  els.sceneHint.classList.remove('show');
  const fresh = scenesToTry(); // tagged "New!" this time the tray opens
  delete state.progress.scenesToTry; // the new scenes have been seen
  saveProgress();
  renderScene();
  renderSceneTray(fresh);
  els.sceneTray.showModal();
}

function renderSceneTray(fresh = []) {
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
    if (fresh.includes(set.id)) {
      const tag = document.createElement('span');
      tag.className = 'thumb-new';
      tag.textContent = 'New!';
      thumb.append(tag);
      thumb.setAttribute('aria-label', `${set.name}, new`);
    }
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
      // Then the 🐵/🙈 switch wiggles behind the tray, as a hint to go back and read, and a message says so.
      playAnim(art, 'wiggle');
      playAnim(lock, 'wiggle');
      clearTimeout(lockedHintTimer);
      lockedHintTimer = setTimeout(() => playAnim(els.playToggle, 'wiggle'), LOCKED_HINT_MS);
      els.sceneHint.textContent = 'Learn more words to unlock more scenes!';
      els.sceneHint.classList.add('show');
      clearTimeout(sceneHintTimer);
      sceneHintTimer = setTimeout(() => els.sceneHint.classList.remove('show'), SCENE_HINT_MS);
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
  markSceneTried(id);
  saveProgress();
  renderScene();
}
