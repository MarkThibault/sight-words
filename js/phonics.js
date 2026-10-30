'use strict';

// Sounding words out: which sounds make up each word.
// Each sound has a recording in audio/sounds/<ID>.wav (made with recorder.html), so it sounds the same
// on every device. Until a sound is recorded, the device's voice says `say` instead.

// The sounds of English. `as` is shown in the recorder so you know which sound to make.
const SOUNDS = {
  // Short vowels and other vowel sounds
  A: { as: 'a in cat', say: 'aah' },
  E: { as: 'e in bed', say: 'eh' },
  I: { as: 'i in sit', say: 'ih' },
  O: { as: 'o in hot', say: 'ah' },
  U: { as: 'u in cup', say: 'uh' },
  UH: { as: 'the quick "uh" in a, the, of', say: 'uh' },
  AY: { as: 'ay in day', say: 'ay' },
  EE: { as: 'ee in see', say: 'ee' },
  IE: { as: 'i in like', say: 'eye' },
  OH: { as: 'o in go', say: 'oh' },
  OO: { as: 'oo in moon', say: 'oo' },
  OOK: { as: 'oo in book', say: 'uu' },
  OW: { as: 'ow in cow', say: 'ow' },
  OY: { as: 'oy in boy', say: 'oy' },
  AR: { as: 'ar in car', say: 'ar' },
  OR: { as: 'or in for', say: 'or' },
  ER: { as: 'er in her', say: 'er' },
  AW: { as: 'a in all', say: 'aw' },
  AIR: { as: 'air in hair', say: 'air' },
  EAR: { as: 'ear in near', say: 'ear' },
  // Consonants: keep them short ("b", not "buh"), and hold the ones that can be held ("mmm", "sss")
  B: { as: 'b in bat', say: 'buh' },
  D: { as: 'd in dog', say: 'duh' },
  F: { as: 'f in fish', say: 'fuh' },
  G: { as: 'g in go', say: 'guh' },
  H: { as: 'h in hat', say: 'huh' },
  J: { as: 'j in jump', say: 'juh' },
  K: { as: 'c in cat, k in kite', say: 'kuh' },
  L: { as: 'l in leg', say: 'luh' },
  M: { as: 'm in mom', say: 'muh' },
  N: { as: 'n in nap', say: 'nuh' },
  P: { as: 'p in pig', say: 'puh' },
  R: { as: 'r in run', say: 'ruh' },
  S: { as: 's in sun', say: 'suh' },
  T: { as: 't in top', say: 'tuh' },
  V: { as: 'v in van, f in of', say: 'vuh' },
  W: { as: 'w in we', say: 'wuh' },
  Y: { as: 'y in yes', say: 'yuh' },
  Z: { as: 'z in zoo, s in is', say: 'zuh' },
  CH: { as: 'ch in chin', say: 'chuh' },
  SH: { as: 'sh in ship', say: 'shuh' },
  TH: { as: 'th in thin, with', say: 'thuh' },
  DH: { as: 'th in this, the', say: 'thuh' },
  NG: { as: 'ng in sing', say: 'ng' },
  ZH: { as: 's in treasure', say: 'zhuh' },
  KS: { as: 'x in box', say: 'ks' },
  KW: { as: 'qu in queen', say: 'kwuh' },
};

// Each word is a list of [letters, sound ID]. An empty sound ID is a silent letter: shown faded, not spoken.
// A word that isn't listed here has no "Sound it out" button. recorder.html lists the words still missing.
const WORD_PARTS = {
  a: [['a', 'UH']],
  all: [['a', 'AW'], ['ll', 'L']],
  and: [['a', 'A'], ['n', 'N'], ['d', 'D']],
  are: [['ar', 'AR'], ['e', '']],
  as: [['a', 'A'], ['s', 'Z']],
  at: [['a', 'A'], ['t', 'T']],
  be: [['b', 'B'], ['e', 'EE']],
  can: [['c', 'K'], ['a', 'A'], ['n', 'N']],
  do: [['d', 'D'], ['o', 'OO']],
  for: [['f', 'F'], ['or', 'OR']],
  go: [['g', 'G'], ['o', 'OH']],
  he: [['h', 'H'], ['e', 'EE']],
  his: [['h', 'H'], ['i', 'I'], ['s', 'Z']],
  I: [['I', 'IE']],
  is: [['i', 'I'], ['s', 'Z']],
  it: [['i', 'I'], ['t', 'T']],
  like: [['l', 'L'], ['i', 'IE'], ['k', 'K'], ['e', '']],
  me: [['m', 'M'], ['e', 'EE']],
  my: [['m', 'M'], ['y', 'IE']],
  of: [['o', 'UH'], ['f', 'V']],
  on: [['o', 'O'], ['n', 'N']],
  said: [['s', 'S'], ['ai', 'E'], ['d', 'D']],
  see: [['s', 'S'], ['ee', 'EE']],
  the: [['th', 'TH'], ['e', 'UH']],
  to: [['t', 'T'], ['o', 'OO']],
  up: [['u', 'U'], ['p', 'P']],
  was: [['w', 'W'], ['a', 'UH'], ['s', 'Z']],
  we: [['w', 'W'], ['e', 'EE']],
  with: [['w', 'W'], ['i', 'I'], ['th', 'TH']],
  yes: [['y', 'Y'], ['e', 'E'], ['s', 'S']],
  you: [['y', 'Y'], ['ou', 'OO']],
};

const wordParts = (word) => WORD_PARTS[word] || null;

// The sound IDs a word uses, in order, without silent letters.
const wordSounds = (word) => (wordParts(word) || []).map(([, id]) => id).filter(Boolean);
