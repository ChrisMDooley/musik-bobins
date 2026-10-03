/*
 * rhythm.js — note values as the class uses them (worksheet "Rhythmusdiktat"). No DOM.
 *
 *   code  Notenwert           Rhythmussilbe  Zeichen (Morsecode)  Grundschläge
 *   V     Viertelnote         du             —                    1
 *   A     Doppelachtel        du-de          | |                  1  (two eighths)
 *   H     Halbe Note          du-a           —|—                  2
 *   G     Ganze Note          du-a-a-a       —|—|—|—              4  (not on the worksheets yet; agreed default)
 */
(function (root) {
  'use strict';
  var VALUES = {
    V: { code: 'V', name: 'Viertelnote',  syl: 'du',    morse: '—',   beats: 1, onsets: [0] },
    A: { code: 'A', name: 'Doppelachtel', syl: 'du-de', morse: '| |', beats: 1, onsets: [0, 0.5] },
    H: { code: 'H', name: 'Halbe Note',   syl: 'du-a',  morse: '—|—', beats: 2, onsets: [0] },
    G: { code: 'G', name: 'Ganze Note',   syl: 'du-a-a-a', morse: '—|—|—|—', beats: 4, onsets: [0] }
  };
  var TEACH = ['V', 'A', 'H'];                         // what the rhythm module uses

  function beats(pattern) { return pattern.reduce(function (s, c) { return s + VALUES[c].beats; }, 0); }
  // onsets in beats: ['V','A','H'] → [0, 1, 1.5, 2]
  function onsets(pattern) {
    var t = 0, out = [];
    pattern.forEach(function (c) { VALUES[c].onsets.forEach(function (o) { out.push(t + o); }); t += VALUES[c].beats; });
    return out;
  }
  // split into bars of n beats: [[codes], …]; null if a value crosses a bar line
  function bars(pattern, per) {
    var out = [[]], t = 0;
    for (var i = 0; i < pattern.length; i++) {
      var b = VALUES[pattern[i]].beats;
      if (t + b > per) return null;
      out[out.length - 1].push(pattern[i]); t += b;
      if (t === per && i < pattern.length - 1) { out.push([]); t = 0; }
    }
    return out;
  }
  function syllables(pattern) { return pattern.map(function (c) { return VALUES[c].syl; }).join(' '); }
  function morse(pattern) { return pattern.map(function (c) { return VALUES[c].morse; }).join('  '); }

  // Compare two patterns beat by beat (the dictation feedback): list of beat numbers (0-based) that differ.
  function beatDiff(want, got) {
    var w = onsets(want), g = onsets(got), total = Math.max(beats(want), beats(got)), bad = [];
    for (var b = 0; b < total; b++) {
      var ws = w.filter(function (x) { return x >= b && x < b + 1; }).join(','), gs = g.filter(function (x) { return x >= b && x < b + 1; }).join(',');
      if (ws !== gs) bad.push(b);
    }
    return bad;
  }
  function same(a, b) { return a.join('') === b.join(''); }

  // Random pattern of `nbars` bars of `per` beats, from `codes`. R = { int, pick }.
  function randomPattern(R, nbars, per, codes, maxHalves) {
    for (var tries = 0; tries < 200; tries++) {
      var out = [], halves = 0;
      for (var b = 0; b < nbars; b++) {
        var t = 0;
        while (t < per) {
          var opts = codes.filter(function (c) { return VALUES[c].beats <= per - t && (c !== 'H' || halves < (maxHalves == null ? 9 : maxHalves)); });
          var c = R.pick(opts); out.push(c); t += VALUES[c].beats; if (c === 'H') halves++;
        }
      }
      if (codes.length === 1 || new Set(out).size > 1) return out;
    }
    return out;
  }

  // Tapping: compare tapped times (seconds, relative to the first tap) with the pattern at `bpm`.
  function tapCheck(pattern, taps, bpm) {
    var want = onsets(pattern).map(function (b) { return b * 60 / bpm; });
    if (!taps.length) return { ok: false, n: 0, want: want.length };
    var t0 = taps[0], got = taps.map(function (t) { return t - t0; }), beat = 60 / bpm;
    if (got.length !== want.length) return { ok: false, n: got.length, want: want.length, countWrong: true };
    var bad = [];
    for (var i = 0; i < want.length; i++) if (Math.abs(got[i] - want[i]) > beat * 0.28) bad.push(i);
    return { ok: bad.length === 0, bad: bad, n: got.length, want: want.length };
  }

  root.MB = root.MB || {};
  root.MB.rhythm = { VALUES: VALUES, TEACH: TEACH, beats: beats, onsets: onsets, bars: bars, syllables: syllables, morse: morse, beatDiff: beatDiff, same: same, randomPattern: randomPattern, tapCheck: tapCheck };
})(typeof window !== 'undefined' ? window : globalThis);
