'use strict';

// Page elements and the app-wide state that more than one file reads or changes.
// State that only one file uses lives in that file instead.

const els = {
  home: $('home'), practice: $('practice'), board: $('sticker-board'), homeCenter: $('home-center'),
  start: $('start-btn'), missingBtn: $('missing-btn'), timedBtn: $('timed-btn'), bestTime: $('best-time'),
  stickerHint: $('sticker-hint'), starCount: $('star-count'), trophyMeter: $('trophy-meter'), homeMedal: $('home-medal'), trophyCount: $('trophy-count'), starSet: $('star-set'), starScene: $('star-scene'), settingsBtn: $('settings-btn'), playToggle: $('play-toggle'), playKnob: $('play-knob'), playBadge: $('play-badge'), recorderBtn: $('recorder-btn'), shuffleBtn: $('shuffle-btn'), shuffleDie: $('shuffle-die'), shuffleShadow: $('shuffle-shadow'), scenesBtn: $('scenes-btn'), scenesBadge: $('scenes-badge'), sceneDecor: $('scene-decor'), appVersion: $('app-version'), updateBtn: $('update-btn'), devBtn: $('dev-btn'), devPanel: $('dev-panel'),
  homeBtn: $('home-btn'), timer: $('timer'), mini: $('progress-mini'),
  roundBar: $('round-bar'), roundFill: $('round-fill'), card: $('card'), word: $('word'), star: $('card-star'),
  hint: $('hint'), soundOut: $('sound-out-btn'), know: $('know-btn'), next: $('next-btn'), toast: $('toast'),
  listen: $('listen'), listenBtn: $('listen-btn'), listenNote: $('listen-note'), listenHome: $('listen-home-btn'),
  listenCount: $('listen-count'), listenBar: $('listen-bar'),
  listenAgain: $('listen-again'), listenChoices: $('listen-choices'),
  build: $('build'), buildBtn: $('build-btn'), buildNote: $('build-note'), buildHome: $('build-home-btn'),
  buildCount: $('build-count'), buildBar: $('build-bar'),
  buildAgain: $('build-again'), buildSlots: $('build-slots'), buildTiles: $('build-tiles'),
  trophyBtn: $('trophy-btn'), trophyPanel: $('trophy-panel'), trophyList: $('trophy-list'), trophyClose: $('trophy-close'),
  prizeBtn: $('prize-btn'), prizeBtnText: $('prize-btn-text'), prizeBtnBadge: $('prize-btn-badge'), trophyBadge: $('trophy-badge'), prizeCard: $('prize-card'), prizeTitle: $('prize-title'), prizeList: $('prize-list'), prizeLater: $('prize-later'),
  prizeNote: $('prize-note'), prizeActions: $('prize-actions'), prizeConfirm: $('prize-confirm'), prizeChosen: $('prize-chosen'),
  prizeYes: $('prize-yes'), prizeBack: $('prize-back'),
  panel: $('parent-panel'), panelSummary: $('panel-summary'), panelList: $('panel-list'),
  panelClose: $('panel-close'), reset: $('reset-btn'), panelMain: $('panel-main'),
  resetConfirm: $('reset-confirm'), resetYes: $('reset-yes'), resetCancel: $('reset-cancel'),
  guideBtn: $('guide-btn'), panelGuide: $('panel-guide'), guideBody: $('guide-body'), guideBack: $('guide-back'),
  grownupTip: $('grownup-tip'), grownupTipOk: $('grownup-tip-ok'),
  sceneTray: $('scene-tray'), sceneList: $('scene-list'), sceneHint: $('scene-hint'),
  sceneCelebration: $('scene-celebration'), sceneCelebrationCard: $('scene-celebration-card'), sceneCelebrationTitle: $('scene-celebration-title'),
  sceneCelebrationPreview: $('scene-celebration-preview'), sceneCelebrationDecor: $('scene-celebration-decor'),
  sceneCelebrationName: $('scene-celebration-name'), sceneCelebrationSet: $('scene-celebration-set'), sceneCelebrationBar: $('scene-celebration-bar'),
  voiceSection: $('voice-section'), voiceSelect: $('voice-select'), voiceTest: $('voice-test'),
};

const state = {
  allWords: [],            // the full word list, from words.json
  offWords: new Set(),     // words a grown-up turned off in the Grown-up corner
  words: [],               // the words being practiced: allWords without the turned-off ones
  progress: { words: {} }, // saved progress (see progress.js), loaded at start up
  stickersToFly: [],       // stickers earned since the home screen was last shown, to fly into the 🐵/🙈 switch
  scenesToFly: [],         // scenes unlocked since then, whose icons fly in after them
  stickersToPop: [],       // stickers that pop onto the board the next time it's drawn
  celebrating: false,      // a finished set's "set complete!" celebration is showing
  lastRound: null,         // the round just finished, summarized on the home screen
  playing: false,          // sticker play: the title, bottom row and ⚙️ are hidden (never saved, so the app opens normally)
  devRoundWords: 0,        // 🛠️ on localhost only: how many words the next reading round has (0 = the usual)
};
