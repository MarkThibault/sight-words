'use strict';

// Scenes: the backgrounds behind the sticker board. Finishing a sticker set (see progress.js) unlocks its scene,
// celebrated with a short "set complete!" card that shrinks into the 🐵/🙈 switch. The 🖼️ button picks between the scenes unlocked so far,
// and the dots are free.
// Also the star pill at the bottom of the home screen, which shows the set being collected.

// The scene showing, or null for the dots.
function currentScene() {
  const id = state.progress.scene;
  return id && unlockedScenes().includes(id) && findSet(id) ? id : null;
}

// A scene's faded emoji. `topOnly` keeps the ones in the top half, for the small preview on "set complete!".
function sceneDecor(set, topOnly = false) {
  return set.decor.filter(([, , , top]) => !topOnly || top < 50).map(([emoji, size, left, top]) => {
    const el = make('span', '', emoji);
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
    const el = make('span', `${className}${earned.includes(emoji) ? ' earned' : ''}`);
    el.append(make('span', '', emoji));
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
  dots.append(make('span', 'thumb-set', 'Free'));
  els.sceneList.replaceChildren(dots, ...STICKER_SETS.map((set) => {
    const locked = !unlockedScenes().includes(set.id);
    const thumb = sceneThumb(set.id, set.icon, set.name, locked, current === set.id);
    const row = make('span', 'thumb-set');
    row.append(...setShapes(set, 'thumb-sticker'));
    thumb.append(row);
    if (fresh.includes(set.id)) {
      thumb.append(make('span', 'thumb-new', 'New!'));
      thumb.setAttribute('aria-label', `${set.name}, new`);
    }
    return thumb;
  }));
}

function sceneThumb(id, icon, name, locked, isCurrent) {
  const thumb = make('button', 'scene-thumb');
  setSceneBackground(thumb, id);
  thumb.classList.toggle('locked', locked);
  thumb.classList.toggle('current', isCurrent);
  thumb.setAttribute('aria-label', locked ? `${name}, locked` : name);
  thumb.setAttribute('aria-pressed', String(isCurrent));
  const lock = make('span', 'thumb-lock', '🔒');
  const art = make('span', 'thumb-icon', icon);
  if (locked) thumb.append(lock);
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

// ---------- "Set complete!" ----------
// After the new stickers have flown into the switch, a finished set gets a short celebration: its scene with the five
// stickers, confetti and the new-scene sound. A bar empties over SCENE_CELEBRATION_MS, or a tap skips ahead, and then
// the card shrinks into the switch. `done` runs once it's there.
function celebrateScene(set, done) {
  state.celebrating = true;
  els.sceneCelebrationTitle.textContent = `🎉 ${set.name.replace(/^The /, '')} set complete!`;
  setSceneBackground(els.sceneCelebrationPreview, set.id);
  els.sceneCelebrationDecor.replaceChildren(...sceneDecor(set, true));
  els.sceneCelebrationName.textContent = `New scene: ${set.name}`;
  els.sceneCelebrationSet.replaceChildren(...setStickers(set).map((emoji) => {
    return make('span', '', emoji);
  }));
  const overlay = els.sceneCelebration;
  const card = els.sceneCelebrationCard;
  overlay.hidden = false;
  playEffect('sceneUnlocked');
  confetti();
  if (!reduceMotion) {
    card.animate([{ scale: 0.4, opacity: 0 }, { scale: 1.06, opacity: 1, offset: 0.7 }, { scale: 1, opacity: 1 }],
      { duration: 450, easing: 'ease-out' });
  }
  const bar = els.sceneCelebrationBar.animate([{ transform: 'scaleX(1)' }, { transform: 'scaleX(0)' }],
    { duration: SCENE_CELEBRATION_MS, fill: 'forwards' });

  let leaving = false;
  const leave = () => {
    if (leaving) return;
    leaving = true;
    clearTimeout(timer);
    overlay.removeEventListener('click', leave);
    overlay.classList.add('leaving'); // the dimming fades as the card goes
    const end = () => {
      bar.cancel();
      card.getAnimations().forEach((anim) => anim.cancel());
      overlay.hidden = true;
      overlay.classList.remove('leaving');
      state.celebrating = false;
      done();
    };
    if (reduceMotion) {
      end();
      return;
    }
    const from = card.getBoundingClientRect();
    const to = els.playToggle.getBoundingClientRect();
    const dx = to.left + to.width / 2 - (from.left + from.width / 2);
    const dy = to.top + to.height / 2 - (from.top + from.height / 2);
    card.animate([{ translate: '0 0', scale: 1, opacity: 1 }, { translate: `${dx}px ${dy}px`, scale: 0.04, opacity: 0.6 }],
      { duration: 900, easing: 'cubic-bezier(0.5, 0, 0.3, 1)', fill: 'forwards' }).onfinish = end;
  };
  const timer = setTimeout(leave, SCENE_CELEBRATION_MS);
  overlay.addEventListener('click', leave);
}
