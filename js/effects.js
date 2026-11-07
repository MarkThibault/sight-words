'use strict';

// Cheerful feedback: toasts, confetti, and things flying into place.

let toastTimer = null;

function showToast(text) {
  els.toast.textContent = text;
  els.toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => els.toast.classList.remove('show'), 1500);
}

const randomCheer = () => randomItem(CHEERS);

function confetti() {
  if (reduceMotion) return;
  for (let i = 0; i < 60; i++) {
    const bit = document.createElement('span');
    bit.className = 'confetti';
    bit.style.left = `${Math.random() * 100}vw`;
    bit.style.background = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
    bit.style.setProperty('--dur', `${1.4 + Math.random() * 1.2}s`);
    bit.style.setProperty('--delay', `${Math.random() * 0.4}s`);
    bit.style.setProperty('--dx', `${(Math.random() - 0.5) * 30}vw`);
    bit.style.setProperty('--spin', `${Math.random() * 1080 - 540}deg`);
    bit.addEventListener('animationend', () => bit.remove());
    document.body.append(bit);
  }
}

// Pops `el` up in the middle of `from`, holds it there a moment, then flies it into the middle of `to`, shrinking
// as it goes, and removes it. `landed` runs once it's there. Without motion (the device's "reduce motion" setting)
// nothing flies, and `landed` runs straight away.
// `spin` is the turn it pops up from, `endSpin` the turn it lands with, and `pop` how big it gets at `popAt`.
function flyInto(el, from, to, { duration, endScale, spin = '-180deg', endSpin = '0deg', pop = 1.15, popAt = 0.3 }, landed) {
  if (reduceMotion) {
    landed();
    return;
  }
  const a = from.getBoundingClientRect();
  const b = to.getBoundingClientRect();
  const x0 = `${a.left + a.width / 2}px`;
  const y0 = `${a.top + a.height / 2}px`;
  const x1 = `${b.left + b.width / 2}px`;
  const y1 = `${b.top + b.height / 2}px`;
  el.style.left = x1;
  el.style.top = y1;
  document.body.append(el);
  el.animate([
    { left: x0, top: y0, scale: 0, rotate: spin },
    { left: x0, top: y0, scale: pop, rotate: '0deg', offset: popAt },
    { left: x0, top: y0, scale: 1, rotate: '0deg', offset: 0.5 },
    { left: x1, top: y1, scale: endScale, rotate: endSpin },
  ], { duration, easing: 'ease-in-out' }).onfinish = () => {
    el.remove();
    landed();
  };
}
