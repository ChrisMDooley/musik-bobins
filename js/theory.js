/*
 * theory.js — the music-theory core. No DOM.
 *
 * PITCH (which key on the piano = MIDI number) is kept separate from SPELLING (how the note is
 * written and named). cis and des are the same key, but different notes on paper.
 *
 *   note = { s: step 0–6 (c d e f g a h), a: alteration −1 (b) · 0 · +1 (Kreuz), o: octave }
 *   octave numbers: 3 = kleine Oktave (g … h), 4 = eingestrichen (c' … h'), 5 = zweigestrichen, 6 = dreigestrichen
 *   midi(c') = 60. German names come from a fixed table (no string tricks): es, as, b, ces, his, fes, eis …
 */
(function (root) {
  'use strict';

  var STEPS = ['c', 'd', 'e', 'f', 'g', 'a', 'h'];
  var PC = [0, 2, 4, 5, 7, 9, 11];
  // [mit b, ohne, mit Kreuz] — the German names, as taught (worksheet "Versetzungszeichen"):
  //   Kreuz → -is; b → -es, but after a vowel only -s (es, as); h with b is "b" (not "hes").
  var NAMES = {
    c: ['ces', 'c', 'cis'], d: ['des', 'd', 'dis'], e: ['es', 'e', 'eis'], f: ['fes', 'f', 'fis'],
    g: ['ges', 'g', 'gis'], a: ['as', 'a', 'ais'], h: ['b', 'h', 'his']
  };
  var BY_NAME = {};
  STEPS.forEach(function (st, s) { [-1, 0, 1].forEach(function (a) { BY_NAME[NAMES[st][a + 1]] = { s: s, a: a }; }); });

  function note(s, a, o) { return { s: s, a: a || 0, o: o }; }
  function midi(n) { return 12 * (n.o + 1) + PC[n.s] + n.a; }
  function name(n) { return NAMES[STEPS[n.s]][n.a + 1]; }
  function marks(o) { return o >= 4 ? new Array(o - 2).join("'") : ''; }
  // "g" (kleines g), "g'", "fis''", "c'''"
  function fullName(n) { return name(n) + marks(n.o); }
  var OCT_WORD = { 3: 'kleine Oktave', 4: 'eingestrichene Oktave', 5: 'zweigestrichene Oktave', 6: 'dreigestrichene Oktave' };
  function octaveWord(o) { return OCT_WORD[o] || ''; }
  function sayName(n, withOct) {          // for read-aloud: "fis zwei-gestrichen"
    var b = name(n);
    if (!withOct) return b;
    return b + ({ 3: ' (klein)', 4: ' eingestrichen', 5: ' zweigestrichen', 6: ' dreigestrichen' }[n.o] || '');
  }
  function eqSpelling(x, y) { return x.s === y.s && x.a === y.a && x.o === y.o; }
  function samePitch(x, y) { return midi(x) === midi(y); }

  // "fis''", "b", "es'" → note; with no marks: octave dflt (if given) or null octave. Returns null if not a valid German name.
  function parse(str, dfltOct) {
    var t = String(str || '').trim().toLowerCase().replace(/[’´`′]/g, "'").replace(/\s+/g, '');
    var m = /^([a-z]+)('*)$/.exec(t);
    if (!m || !BY_NAME[m[1]]) return null;
    var b = BY_NAME[m[1]], o = m[2].length ? m[2].length + 3 : (dfltOct == null ? 3 : dfltOct);
    return note(b.s, b.a, o);
  }
  function parseName(str) { var b = BY_NAME[String(str || '').trim().toLowerCase()]; return b ? { s: b.s, a: b.a } : null; }
  function isName(str) { return !!BY_NAME[String(str || '').trim().toLowerCase()]; }

  // ---------------------------------------------------------------- staff
  // Staff position: 0 = bottom line (e'), 2 = second line (g'), … 8 = top line (f''). Odd = space.
  var BOTTOM = 4 * 7 + 2;
  function pos(n) { return n.o * 7 + n.s - BOTTOM; }
  function fromPos(p, a) { var d = p + BOTTOM; return note(((d % 7) + 7) % 7, a || 0, Math.floor(d / 7)); }
  function ledgers(p) { var out = []; for (var q = -2; q >= p; q -= 2) out.push(q); for (var r = 10; r <= p; r += 2) out.push(r); return out; }
  var ORD = ['ersten', 'zweiten', 'dritten', 'vierten', 'fünften'];
  // "auf der zweiten Linie", "im dritten Zwischenraum", "auf der ersten Hilfslinie unter dem System" …
  function where(p) {
    if (p >= 0 && p <= 8 && p % 2 === 0) return 'auf der ' + ORD[p / 2] + ' Linie';
    if (p >= 1 && p <= 7) return 'im ' + ORD[(p - 1) / 2] + ' Zwischenraum';
    if (p === -1) return 'direkt unter der ersten Linie';
    if (p === 9) return 'direkt über der fünften Linie';
    if (p < 0) { var k = Math.floor(-p / 2); return p % 2 === 0 ? 'auf der ' + ORD[k - 1] + ' Hilfslinie unter dem System' : 'unter der ' + ORD[k - 1] + ' Hilfslinie'; }
    var k2 = Math.floor((p - 8) / 2);
    return p % 2 === 0 ? 'auf der ' + ORD[k2 - 1] + ' Hilfslinie über dem System' : 'über der ' + ORD[k2 - 1] + ' Hilfslinie';
  }
  function lineOrSpace(p) { return p % 2 === 0 ? 'Linie' : 'Zwischenraum'; }

  // ---------------------------------------------------------------- keys, steps
  var BLACK = { 1: 1, 3: 1, 6: 1, 8: 1, 10: 1 };
  function isBlack(m) { return !!BLACK[((m % 12) + 12) % 12]; }
  // All spellings of a key with at most one accidental: 61 → [cis', des'];  64 → [e', fes'];  60 → [c', his]
  function spellings(m) {
    var out = [];
    for (var o = Math.floor(m / 12) - 2; o <= Math.floor(m / 12); o++)
      for (var s = 0; s < 7; s++) for (var a = -1; a <= 1; a++) { var n = note(s, a, o); if (midi(n) === m) out.push(n); }
    return out.sort(function (x, y) { return Math.abs(x.a) - Math.abs(y.a) || y.a - x.a; });
  }
  // The usual name(s) of a key: white → the Stammton; black → [Kreuz-Name, b-Name]
  function keyNames(m) {
    var sp = spellings(m);
    if (!isBlack(m)) return [sp.filter(function (n) { return n.a === 0; })[0]];
    return [sp.filter(function (n) { return n.a === 1; })[0], sp.filter(function (n) { return n.a === -1; })[0]];
  }
  function semis(x, y) { return midi(y) - midi(x); }
  function stepKind(x, y) { var d = Math.abs(semis(x, y)); return d === 1 ? 'halb' : d === 2 ? 'ganz' : d === 0 ? 'gleich' : 'gross'; }
  // raise / lower by a semitone, keeping the letter: c → cis, d → des, h → b, e → eis (if asked)
  function alter(n, by) { var a = n.a + by; return a < -1 || a > 1 ? null : note(n.s, a, n.o); }

  // ---------------------------------------------------------------- Dur-Tonleiter
  var MAJOR = [2, 2, 1, 2, 2, 2, 1];                  // Ganz Ganz Halb Ganz Ganz Ganz Halb
  // Build from the pattern: letters go up one by one, accidentals are chosen so every step fits.
  function scale(tonic) {
    var out = [tonic], cur = tonic;
    for (var i = 0; i < 7; i++) {
      var s = (cur.s + 1) % 7, o = cur.o + (cur.s === 6 ? 1 : 0);
      var target = midi(cur) + MAJOR[i], plain = note(s, 0, o), a = target - midi(plain);
      if (a < -1 || a > 1) return null;                 // would need a double accidental — not in this curriculum
      cur = note(s, a, o); out.push(cur);
    }
    return out;
  }
  function keyTitle(tonic) { var n = name(tonic); return n.charAt(0).toUpperCase() + n.slice(1) + '-Dur'; }
  // The scales from the worksheet (core) and extras. Tonic octave as on the worksheet (from f', a', es' …).
  var SCALES = [
    { id: 'C', tonic: note(0, 0, 4), core: true },
    { id: 'F', tonic: note(3, 0, 4), core: true },
    { id: 'A', tonic: note(5, 0, 4), core: true },
    { id: 'Es', tonic: note(2, -1, 4), core: true },
    { id: 'G', tonic: note(4, 0, 4), core: false },
    { id: 'D', tonic: note(1, 0, 4), core: false },
    { id: 'B', tonic: note(6, -1, 3), core: false }
  ];
  SCALES.forEach(function (k) { k.title = keyTitle(k.tonic); k.notes = scale(k.tonic); });
  function scaleById(id) { return SCALES.filter(function (k) { return k.id === id; })[0]; }

  // ---------------------------------------------------------------- written melodies: accidentals last to the bar line
  // notes: [{ s, o, acc: null|'#'|'b'|'n', bar }] → each with its sounding alteration a (and name)
  function resolveAccidentals(notes) {
    var mem = {}, bar = null;
    return notes.map(function (x) {
      if (x.bar !== bar) { mem = {}; bar = x.bar; }
      var key = x.o * 7 + x.s;
      if (x.acc === '#') mem[key] = 1; else if (x.acc === 'b') mem[key] = -1; else if (x.acc === 'n') mem[key] = 0;
      var a = mem[key] || 0;
      return { s: x.s, o: x.o, a: a, acc: x.acc, bar: x.bar, len: x.len, dot: x.dot };
    });
  }

  root.MB = root.MB || {};
  root.MB.theory = { STEPS: STEPS, NAMES: NAMES, note: note, midi: midi, name: name, fullName: fullName, marks: marks, octaveWord: octaveWord, sayName: sayName,
    eqSpelling: eqSpelling, samePitch: samePitch, parse: parse, parseName: parseName, isName: isName,
    pos: pos, fromPos: fromPos, ledgers: ledgers, where: where, lineOrSpace: lineOrSpace,
    isBlack: isBlack, spellings: spellings, keyNames: keyNames, semis: semis, stepKind: stepKind, alter: alter,
    MAJOR: MAJOR, scale: scale, keyTitle: keyTitle, SCALES: SCALES, scaleById: scaleById, resolveAccidentals: resolveAccidentals,
    LOW: 55, HIGH: 84 };       // range of the worksheet keyboard: kleines g … c'''
})(typeof window !== 'undefined' ? window : globalThis);
