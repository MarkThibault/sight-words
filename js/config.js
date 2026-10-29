'use strict';

// Settings and content lists. Edit these to change how the app looks and sounds.

const APP_VERSION = '1.0.0'; // shown at the bottom of the home screen; bump it when publishing changes
const STORAGE_KEY = 'sightWords.progress.v1';
const VOICE_KEY = 'sightWords.voice.v1';
const SPEECH_RATE = 0.9;     // a little slower than normal speech (much slower sounds robotic)
const CHEERS = ['Great job!', 'Awesome!', 'You did it!', 'Super reader!', 'Way to go!', 'Fantastic!'];
const STICKER_COLORS = ['#e03131', '#e8590c', '#e67700', '#2f9e44', '#0c8599', '#1971c2', '#7048e8', '#c2255c'];
// Surprise stickers: one is picked at random when a word is learned, then saved with that word.
const STICKER_EMOJI = [
  '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🐔',
  '🐧', '🐤', '🦉', '🐴', '🦄', '🐝', '🐞', '🦋', '🐢', '🐙', '🦀', '🐠', '🐬', '🐳', '🦕', '🦖',
  '🦒', '🦓', '🐘', '🦔', '🍎', '🍌', '🍉', '🍓', '🍒', '🍍', '🥕', '🌽', '🍕', '🍩', '🍪', '🧁',
  '🍦', '🍭', '🎂', '🌈', '🌞', '🌙', '🌻', '🌸', '⛄', '🚀', '🚗', '🚒', '🚌', '🚂', '🚁', '⛵',
  '🚜', '⚽', '🏀', '🎈', '🎁', '🎨', '🧸', '🥁', '👑'];
const CONFETTI_COLORS = ['#ff6b6b', '#ffa94d', '#ffd43b', '#69db7c', '#4dabf7', '#9775fa', '#f783ac'];
// Only used if words.json can't be loaded (for example, when index.html is opened straight from disk).
const FALLBACK_WORDS = ['was', 'you', 'me', 'like', 'my', 'yes', 'for', 'see', 'as', 'the', 'can', 'he',
  'go', 'at', 'up', 'with', 'and', 'a', 'we', 'I', 'be', 'are', 'to', 'on'];
