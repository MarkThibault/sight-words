'use strict';

// The developer sound page (sounds.html): plays every sound effect the app uses, straight from js/sound-effects.js,
// and keeps the ideas tried along the way, so new sounds can be compared before one goes in.
// To try a new idea, add it to SOUND_IDEAS using the building blocks in js/sound-effects.js.

const SOUND_IDEAS = {
  dingDing: {
    label: 'Ding-ding',
    where: 'Right answer. Two rising bell notes: too much like collecting a coin',
    play(t) {
      effectNote(t, 1047, 0.35, { type: 'triangle', volume: 0.22 });
      effectNote(t + 0.11, 1319, 0.5, { type: 'triangle', volume: 0.22 });
      return 0.6;
    },
  },
  sparkle: {
    label: 'Sparkle',
    where: 'Right answer. Three quick rising notes',
    play(t) {
      [1047, 1319, 1568].forEach((freq, i) => effectNote(t + i * 0.07, freq, 0.35, { type: 'triangle', volume: 0.18 }));
      return 0.5;
    },
  },
  happyBoop: {
    label: 'Happy boop',
    where: 'Right answer. The wrong-answer boop turned upside down',
    play(t) {
      effectNote(t, 330, 0.3, { slideTo: 660 });
      return 0.3;
    },
  },
  quickHappyBoop: {
    label: 'Quick happy boop',
    where: 'Right answer. Shorter and bouncier',
    play(t) {
      effectNote(t, 350, 0.16, { slideTo: 700, volume: 0.22 });
      return 0.2;
    },
  },
  marimba: {
    label: 'Marimba',
    where: 'Right answer. Two warm wooden notes',
    play(t) {
      [[523, 0], [784, 0.11]].forEach(([freq, at]) => {
        effectNote(t + at, freq, 0.25, { volume: 0.22 });
        effectNote(t + at, freq * 4, 0.05, { volume: 0.04 }); // the wooden knock at the start
      });
      return 0.4;
    },
  },
  bubble: {
    label: 'Bubble',
    where: 'Right answer. A bubbly blip upward, then a tiny second one',
    play(t) {
      effectNote(t, 300, 0.12, { slideTo: 900 });
      effectNote(t + 0.13, 600, 0.08, { slideTo: 1200, volume: 0.1 });
      return 0.25;
    },
  },
  diceClacks: {
    label: 'Wooden clacks',
    where: 'Dice. Just the bounces',
    play(t) {
      DICE_LANDINGS.forEach((at, i) => effectNote(t + at, 900 - i * 60, 0.07, { type: 'triangle', volume: 0.3 - i * 0.08 }));
      return 0.9;
    },
  },
  diceShake: {
    label: 'Cup shake',
    where: 'Dice. A longer shake before it lands',
    play(t) {
      for (let at = 0; at < 0.4; at += 0.035 + Math.random() * 0.02) effectNoise(t + at, 0.025, { freq: 3500, volume: 0.2 });
      DICE_LANDINGS.slice(1).forEach((at, i) => effectNoise(t + at, 0.07, { freq: 1600, q: 2, volume: 0.55 - i * 0.2 }));
      return 0.9;
    },
  },
  popUp: {
    label: 'Pop up',
    where: 'Sticker picked up. A soft pop that rises',
    play(t) {
      effectNote(t, 500, 0.08, { slideTo: 900 });
      return 0.1;
    },
  },
  popDown: {
    label: 'Pop down',
    where: 'Sticker put down. The same pop, falling',
    play(t) {
      effectNote(t, 800, 0.1, { slideTo: 420, volume: 0.15 });
      return 0.1;
    },
  },
  tickUp: {
    label: 'Tick up',
    where: 'Sticker picked up. A light wooden tick, then a higher one',
    play(t) {
      effectNote(t, 700, 0.05, { type: 'triangle' });
      effectNote(t + 0.05, 1050, 0.05, { type: 'triangle', volume: 0.15 });
      return 0.1;
    },
  },
  tockDown: {
    label: 'Tock down',
    where: 'Sticker put down. A lower wooden tock with a tiny bounce',
    play(t) {
      effectNote(t, 450, 0.08, { type: 'triangle', volume: 0.25 });
      effectNote(t + 0.09, 450, 0.05, { type: 'triangle', volume: 0.08 });
      return 0.15;
    },
  },
  velcroPress: {
    label: 'Velcro press',
    where: 'Sticker put down. A soft pat with a few crackles as it grips',
    play(t) {
      effectThump(t, { freq: 150, volume: 0.25 });
      effectCrackle(t + 0.01, 0.12, { perSecond: 350, shape: (p) => 1 - p, from: 2200, to: 1800 });
      return 0.13;
    },
  },
  stickerPeel: {
    label: 'Sticker peel',
    where: 'Sticker picked up. A smoother peel that rises at the end',
    play(t) {
      effectCrackle(t, 0.22, { perSecond: 400, shape: (p) => 0.3 + p, from: 1500, to: 5000, volume: 0.6, hiss: 0.15 });
      return 0.22;
    },
  },
  tapePull: {
    label: 'Tape pull',
    where: 'Sticker picked up. A quick zip',
    play(t) {
      effectCrackle(t, 0.16, { perSecond: 1500, shape: (p) => Math.sin(Math.PI * p), from: 3000, to: 6000, volume: 0.45, hiss: 0.25 });
      return 0.16;
    },
  },
  velcroRip: {
    label: 'Velcro rip',
    where: 'Sticker picked up. A short crackly rip, busiest partway through',
    play(t) {
      effectCrackle(t, 0.28, { perSecond: 900, shape: (p) => Math.sin(Math.PI * Math.min(1, p * 1.3)) ** 0.7, from: 2500, to: 4200 });
      return 0.28;
    },
  },
};

function soundButton(effect, onPlay) {
  const button = document.createElement('button');
  button.className = 'sound';
  const label = document.createElement('b');
  label.textContent = effect.label;
  const where = document.createElement('small');
  where.textContent = effect.where;
  button.append(label, where);
  button.addEventListener('click', onPlay);
  return button;
}

function playIdea(effect) {
  unlockAudio();
  effect.play(audioCtx.currentTime + 0.02);
}

// The 🎲 tumbles with the dice sounds, as it does on the home screen.
function rollDie() {
  playAnim($('die'), 'roll');
}

function startSoundLab() {
  const used = $('used-sounds');
  for (const [name, effect] of Object.entries(SOUND_EFFECTS)) {
    used.append(soundButton(effect, () => {
      playEffect(name);
      if (name === 'diceRoll') rollDie();
    }));
  }
  used.append(soundButton({ label: '😕 Wrong answer', where: 'The soft boop in the games, from playIncorrectSound in js/audio.js' },
    () => playIncorrectSound(() => {})));

  const ideas = $('sound-ideas');
  for (const effect of Object.values(SOUND_IDEAS)) {
    ideas.append(soundButton(effect, () => {
      playIdea(effect);
      if (effect.where.startsWith('Dice')) rollDie();
    }));
  }
}

startSoundLab();
