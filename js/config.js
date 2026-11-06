'use strict';

// Settings and content lists. Edit these to change how the app looks and sounds.

const APP_VERSION = '1.22.0'; // shown at the bottom of the home screen; bumped automatically when a PR merges into main
const STORAGE_KEY = 'sightWords.progress.v1';
const VOICE_KEY = 'sightWords.voice.v1';
const STICKER_SPOTS_KEY = 'sightWords.stickerSpots.v1'; // where stickers were dragged to on the home screen
const STICKER_SEED_KEY = 'sightWords.stickerSeed.v1';   // which random grid the stickers are laid out on (🎲 picks a new one)
const OFF_WORDS_KEY = 'sightWords.offWords.v1'; // kept apart from progress, so a reset doesn't turn words back on
const GROWNUP_TIP_KEY = 'sightWords.grownupTipSeen.v1'; // the "press and hold ⚙️" tip has been shown, so it doesn't show again
const SPEECH_RATE = 0.9;     // a little slower than normal speech (much slower sounds robotic)
const SOUND_RATE = 0.75;     // sounds not recorded yet, said by the device's voice when sounding a word out
const SOUND_GAP_MS = 300;    // the pause between sounds when sounding a word out
const SOUND_EFFECTS_VOLUME = 1; // how loud the sound effects in js/sound-effects.js are (0.5 is half as loud)
const ROUND_MAX_WORDS = 10;    // the most words in a round of Let's Read or Missing words (a Timed run uses them all)
const GAME_MAX_WORDS = 8;      // the most words in a game of Listen & tap or Build the word
const GAME_REPEAT_LIMIT = 2;   // games of one kind in a row before that game's button waits for the other game or a reading round
// The medals in a game, and the share of its possible points that earns each one. Bronze has to stay at or below
// the lowest possible score (1 point a word in both games), so finishing always earns it. Gold is every word right the first time.
const GAME_MEDALS = [
  { emoji: '🥉', name: 'bronze', share: 0.2 },
  { emoji: '🥈', name: 'silver', share: 0.6 },
  { emoji: '🥇', name: 'gold', share: 1 }];
const MEDALS_PER_TROPHY = 10;  // the most games a trophy takes, with bronze every time. All gold takes 4.
const LISTEN_CHOICES = 4;      // words to choose from (fewer if fewer words are turned on)
const LISTEN_WORD_POINTS = 4;  // points for finding a word, minus 1 for each wrong tap first
const LISTEN_NEXT_MS = 1700;   // the pause after a right answer, so the right-answer sound and the word can be heard
const BUILD_MIN_TILES = 5;     // every word shows at least this many tiles, counting its own parts
const BUILD_EXTRA_MIN = 2;     // tiles that don't belong, added to make it harder: at least this many...
const BUILD_EXTRA_MAX = 3;     // ...and at most this many
const BUILD_WORD_POINTS = 5;   // points for finishing a word, minus 1 for each wrong tile...
const BUILD_MIN_WORD_POINTS = 1; // ...but never below this
const BUILD_NEXT_MS = 800;     // the pause after the finished word has been said
const CHEERS = ['Great job!', 'Awesome!', 'You did it!', 'Super reader!', 'Way to go!', 'Fantastic!'];
const STICKER_MIN_SIZE = 36;    // stickers shrink down to this to stay off the buttons, then start to overlap them
const UPDATE_CHECK_MS = 60 * 1000; // how often the home screen looks for a new version (a check is one small file)
const UPDATE_MESSAGE_MS = 900;  // how long "Updating…" shows before the page fades
const UPDATE_FADE_MS = 400;     // the fade before reloading; matches html::after in style.css
const UPDATE_RELOAD_WAIT_MS = 3000; // reloads anyway if the new version hasn't taken over by then
const STICKER_COLORS = ['#e03131', '#e8590c', '#e67700', '#2f9e44', '#0c8599', '#1971c2', '#7048e8', '#c2255c'];
// Stickers come in sets, each with a scene for the home screen. Every "I know it!" earns the next sticker of the
// first set with one still missing, in the order listed here (and shown in the star pill), and finishing a set unlocks its scene. Each set needs SET_SIZE stickers.
// A scene is a soft background (.scene-<id> in style.css) plus a few faded emoji: [emoji, size in px on a tablet,
// left %, top %]. Scene emoji and icons never repeat a set's sticker, so they're never mistaken for stickers.
const SET_SIZE = 5;            // stickers in a set, which is also the stars it takes to unlock a scene
const STICKER_SETS = [
  { id: 'beach', name: 'The Beach', icon: '🏖️', stickers: ['🦀', '🐚', '⛵', '🌴', '🍦'],
    decor: [['☀️', 64, 70, 3], ['☁️', 46, 33, 8], ['☁️', 36, 12, 18], ['🏖️', 110, 4, 84], ['☁️', 40, 88, 30]] },
  { id: 'space', name: 'Outer Space', icon: '🌌', stickers: ['🚀', '🌙', '🪐', '👽', '🛸'],
    decor: [['🌑', 80, 74, 6], ['☄️', 50, 3, 30], ['🌍', 76, 5, 74], ['✨', 40, 90, 52], ['✨', 34, 30, 6]] },
  { id: 'sea', name: 'Under the Sea', icon: '🌊', stickers: ['🐙', '🐠', '🐳', '🦈', '🐡'],
    decor: [['🫧', 50, 30, 14], ['🐟', 46, 86, 30], ['🪸', 100, 4, 86], ['🌿', 90, 90, 86], ['🫧', 40, 70, 92]] },
  { id: 'farm', name: 'The Farm', icon: '🌾', stickers: ['🐮', '🐷', '🐔', '🐴', '🚜'],
    decor: [['☀️', 60, 88, 6], ['☁️', 44, 28, 9], ['☁️', 34, 62, 15], ['🌾', 70, 5, 88], ['🏡', 84, 93, 80]] },
  { id: 'jungle', name: 'The Jungle', icon: '🍃', stickers: ['🦁', '🐵', '🦜', '🐯', '🐘'],
    decor: [['🌿', 90, 4, 12], ['🍃', 50, 92, 18], ['🌺', 46, 8, 72], ['🌿', 80, 95, 84], ['🍃', 40, 50, 95]] },
  { id: 'garden', name: 'The Garden', icon: '🌷', stickers: ['🌻', '🌸', '🐝', '🐞', '🦋'],
    decor: [['☀️', 60, 90, 7], ['☁️', 40, 22, 10], ['🌷', 70, 6, 90], ['🌼', 50, 94, 86], ['🌱', 46, 50, 95]] },
  { id: 'party', name: 'Party Time', icon: '🎉', stickers: ['🎂', '🧁', '🍩', '🍭', '🎈'],
    decor: [['🎉', 70, 8, 10], ['🎊', 60, 92, 14], ['🪅', 64, 7, 88], ['✨', 40, 90, 60], ['🎀', 50, 94, 90]] },
];
// Stickers once every set is full (or for words beyond the sets), picked at random as before.
// Stickers earned before sets came in keep their emoji from this older, bigger list.
const STICKER_EMOJI = [
  '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐸', '🐧', '🐤', '🦉', '🦄', '🐢', '🐬',
  '🦕', '🦖', '🦒', '🦓', '🦔', '🍎', '🍌', '🍉', '🍓', '🍒', '🍍', '🥕', '🌽', '🍕', '🍪', '🌈',
  '🌞', '⛄', '🚗', '🚒', '🚌', '🚂', '🚁', '⚽', '🏀', '🎁', '🎨', '🧸', '🥁', '👑'];
const FLY_IN_DELAY_MS = 700;   // after a round, how long the home screen shows before new stickers and scenes fly into the 🐵/🙈 switch
const FLY_IN_GAP_MS = 350;     // the time between each one taking off
const SCENE_CELEBRATION_MS = 2000; // how long "set complete!" shows before it shrinks into the switch (a tap skips ahead)
const PRIZE_CARD_DELAY_MS = 1800; // after a game that earns a trophy, how long the 🏆 gets to fly in before "Pick your prize!" shows
const LOCKED_HINT_MS = 400;    // after a locked scene's 🔒 wiggles, the pause before the 🐵/🙈 switch wiggles, back toward reading
const SCENE_HINT_MS = 2500;    // how long "Learn more words to unlock more scenes!" shows in the 🖼️ tray
const CONFETTI_COLORS = ['#ff6b6b', '#ffa94d', '#ffd43b', '#69db7c', '#4dabf7', '#9775fa', '#f783ac'];
// Only used if words.json can't be loaded (for example, when index.html is opened straight from disk).
const FALLBACK_WORDS = ['was', 'you', 'me', 'like', 'my', 'yes', 'for', 'see', 'as', 'the', 'can', 'he',
  'go', 'at', 'up', 'with', 'and', 'a', 'we', 'I', 'be', 'are', 'to', 'on'];
