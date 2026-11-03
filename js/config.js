'use strict';

// Settings and content lists. Edit these to change how the app looks and sounds.

const APP_VERSION = '1.10.1'; // shown at the bottom of the home screen; bumped automatically when a PR merges into main
const STORAGE_KEY = 'sightWords.progress.v1';
const VOICE_KEY = 'sightWords.voice.v1';
const STICKER_SPOTS_KEY = 'sightWords.stickerSpots.v1'; // where stickers were dragged to on the home screen
const STICKER_SEED_KEY = 'sightWords.stickerSeed.v1';   // which random grid the stickers are laid out on (🎲 picks a new one)
const OFF_WORDS_KEY = 'sightWords.offWords.v1'; // kept apart from progress, so a reset doesn't turn words back on
const SPEECH_RATE = 0.9;     // a little slower than normal speech (much slower sounds robotic)
const SOUND_RATE = 0.75;     // sounds not recorded yet, said by the device's voice when sounding a word out
const SOUND_GAP_MS = 300;    // the pause between sounds when sounding a word out
const LISTEN_UNLOCK_STARS = 4; // stars needed before Listen & tap opens (it uses only starred words)
const LISTEN_CHOICES = 4;      // words to choose from, at most LISTEN_UNLOCK_STARS
const LISTEN_WORD_POINTS = 4;  // points for finding a word, minus 1 for each wrong tap first
const LISTEN_NEXT_MS = 1300;   // the pause after a right answer, so the word can be heard again
const BUILD_UNLOCK_STARS = 4;  // stars needed before Build the word opens (it uses only starred words)
const BUILD_MIN_TILES = 5;     // every word shows at least this many tiles, counting its own parts
const BUILD_EXTRA_MIN = 2;     // tiles that don't belong, added to make it harder: at least this many...
const BUILD_EXTRA_MAX = 3;     // ...and at most this many
const BUILD_WORD_POINTS = 5;   // points for finishing a word, minus 1 for each wrong tile...
const BUILD_MIN_WORD_POINTS = 1; // ...but never below this
const BUILD_NEXT_MS = 800;     // the pause after the finished word has been said
const CHEERS = ['Great job!', 'Awesome!', 'You did it!', 'Super reader!', 'Way to go!', 'Fantastic!'];
const STICKER_MIN_SIZE = 36;    // stickers shrink down to this to stay off the buttons, then start to overlap them
const UPDATE_CHECK_MS = 5 * 60 * 1000; // how often the home screen looks for a new version
const UPDATE_MESSAGE_MS = 900;  // how long "Updating…" shows before the page fades
const UPDATE_FADE_MS = 400;     // the fade before reloading; matches html::after in style.css
const UPDATE_RELOAD_WAIT_MS = 3000; // reloads anyway if the new version hasn't taken over by then
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
