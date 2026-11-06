'use strict';

// Page elements and the app-wide state that more than one file reads or changes.
// State that only one file uses lives in that file instead.

const els = {
  home: $('home'), practice: $('practice'), board: $('sticker-board'), homeCenter: $('home-center'),
  start: $('start-btn'), missingBtn: $('missing-btn'), timedBtn: $('timed-btn'), bestTime: $('best-time'),
  stickerHint: $('sticker-hint'), starCount: $('star-count'), trophyMeter: $('trophy-meter'), homeMedal: $('home-medal'), trophyCount: $('trophy-count'), starSet: $('star-set'), starScene: $('star-scene'), settingsBtn: $('settings-btn'), recorderBtn: $('recorder-btn'), shuffleBtn: $('shuffle-btn'), shuffleDie: $('shuffle-die'), shuffleShadow: $('shuffle-shadow'), scenesBtn: $('scenes-btn'), sceneDecor: $('scene-decor'), appVersion: $('app-version'), updateBtn: $('update-btn'), devBtn: $('dev-btn'), devPanel: $('dev-panel'),
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
  panel: $('parent-panel'), panelSummary: $('panel-summary'), panelList: $('panel-list'),
  panelClose: $('panel-close'), reset: $('reset-btn'), panelMain: $('panel-main'),
  resetConfirm: $('reset-confirm'), resetYes: $('reset-yes'), resetCancel: $('reset-cancel'),
  guideBtn: $('guide-btn'), panelGuide: $('panel-guide'), guideBody: $('guide-body'), guideBack: $('guide-back'),
  grownupTip: $('grownup-tip'), grownupTipOk: $('grownup-tip-ok'),
  sceneTray: $('scene-tray'), sceneList: $('scene-list'), sceneCard: $('scene-card'), sceneCardTitle: $('scene-card-title'),
  sceneCardPreview: $('scene-card-preview'), sceneCardDecor: $('scene-card-decor'), sceneCardName: $('scene-card-name'),
  sceneCardSet: $('scene-card-set'), sceneGo: $('scene-go'), sceneLater: $('scene-later'),
  voiceSection: $('voice-section'), voiceSelect: $('voice-select'), voiceTest: $('voice-test'),
};

const state = {
  allWords: [],            // the full word list, from words.json
  offWords: new Set(),     // words a grown-up turned off in the Grown-up corner
  words: [],               // the words being practiced: allWords without the turned-off ones
  progress: { words: {} }, // saved progress (see progress.js), loaded at start up
  newStickers: [],         // stickers earned since the home screen was last shown
  newScenes: [],           // scenes unlocked since "set complete!" last showed
  lastRound: null,         // the round just finished, summarized on the home screen
};
