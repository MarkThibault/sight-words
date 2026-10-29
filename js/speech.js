'use strict';

// Reading words aloud with the device's built-in voices.

const canSpeak = 'speechSynthesis' in window;
let voice = null;

// Apple's joke voices, and older voices that sound robotic. Matched by name since names vary by device.
const NOVELTY_VOICES = /\b(albert|bad news|bahh|bells|boing|bubbles|cellos|good news|jester|organ|superstar|trinoids|whisper|wobble|zarvox)\b/i;
const ROBOTIC_VOICES = /\b(fred|junior|ralph|kathy|eddy|flo|grandma|grandpa|reed|rocko|sandy|shelley|desktop)\b/i;

// Higher score = more natural sounding.
function voiceScore(v) {
  let score = 0;
  if (/^en[-_]US/i.test(v.lang)) score += 3;
  if (/natural|neural|enhanced|premium/i.test(v.name)) score += 6; // Edge "Natural", iPad "Enhanced"
  if (/^google/i.test(v.name)) score += 4;                          // Chrome / Android
  if (/\b(ava|samantha|allison|susan|zoe|jenny|aria|michelle|emma)\b/i.test(v.name)) score += 2;
  if (ROBOTIC_VOICES.test(v.name)) score -= 4;
  if (NOVELTY_VOICES.test(v.name)) score -= 20;
  return score;
}

// Best-sounding first.
function englishVoices() {
  return speechSynthesis.getVoices()
    .filter((v) => /^en([-_]|$)/i.test(v.lang))
    .sort((a, b) => voiceScore(b) - voiceScore(a) || a.name.localeCompare(b.name));
}

const savedVoiceURI = () => readStorage(VOICE_KEY);

// An empty URI goes back to choosing automatically.
function saveVoiceURI(uri) {
  writeStorage(VOICE_KEY, uri || null);
  pickVoice();
}

// Use the voice chosen in the grown-up corner, otherwise the best-sounding one on this device.
function pickVoice() {
  const voices = englishVoices();
  const saved = savedVoiceURI();
  voice = voices.find((v) => v.voiceURI === saved) || voices[0] || null;
}

function speak(text) {
  if (!canSpeak) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  if (voice) u.voice = voice;
  u.lang = voice ? voice.lang : 'en-US';
  u.rate = SPEECH_RATE;
  speechSynthesis.speak(u);
}

function stopSpeaking() {
  if (canSpeak) speechSynthesis.cancel();
}
