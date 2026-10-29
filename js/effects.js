'use strict';

// Cheerful feedback: toasts and confetti.

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
