'use strict';

// Page elements and the app-wide state that more than one file reads or changes.
// State that only one file uses lives in that file instead.

const els = {
  home: $('home'), practice: $('practice'), board: $('sticker-board'), homeCenter: $('home-center'),
  start: $('start-btn'), missingBtn: $('missing-btn'), timedBtn: $('timed-btn'), bestTime: $('best-time'),
  stickerHint: $('sticker-hint'), progress: $('progress'), settingsBtn: $('settings-btn'), appVersion: $('app-version'),
  homeBtn: $('home-btn'), timer: $('timer'), mini: $('progress-mini'),
  roundBar: $('round-bar'), roundFill: $('round-fill'), card: $('card'), word: $('word'), star: $('card-star'),
  hint: $('hint'), soundOut: $('sound-out-btn'), know: $('know-btn'), next: $('next-btn'), toast: $('toast'),
  panel: $('parent-panel'), panelSummary: $('panel-summary'), panelList: $('panel-list'),
  panelClose: $('panel-close'), reset: $('reset-btn'), panelActions: $('panel-actions'),
  resetConfirm: $('reset-confirm'), resetYes: $('reset-yes'), resetCancel: $('reset-cancel'),
  voiceSection: $('voice-section'), voiceSelect: $('voice-select'), voiceTest: $('voice-test'),
};

const state = {
  allWords: [],            // the full word list, from words.json
  offWords: new Set(),     // words a grown-up turned off in the Grown-up corner
  words: [],               // the words being practiced: allWords without the turned-off ones
  progress: { words: {} }, // saved progress (see progress.js), loaded at start up
  newStickers: [],         // stickers earned since the home screen was last shown
  lastRound: null,         // the round just finished, summarized on the home screen
};
