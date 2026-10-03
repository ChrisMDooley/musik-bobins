/*
 * audio.js — all sound, made in the browser (Web Audio): exact pitches, no sound files.
 *
 *   MB.audio.note(midi, seconds)                 one piano-like tone
 *   MB.audio.seq([{m, t, d}], opts)              tones at times t (s) for d (s); returns total seconds
 *   MB.audio.melody(notes, bpm)                  [{m, beats}] one after another
 *   MB.audio.rhythm(pattern, bpm, {countIn})     rhythm codes (rhythm.js) as clicks on one pitch
 *   MB.audio.stop()
 * Pitch: a' (MIDI 69) = 440 Hz, equal temperament. Nothing plays by itself: only after a tap/click.
 * Every scheduled sound is also written to window.__mbPlayed (for the browser tests).
 */
(function (root) {
  'use strict';
  var ctx = null, master = null, live = [];
  root.__mbPlayed = root.__mbPlayed || [];

  function freq(m) { return 440 * Math.pow(2, (m - 69) / 12); }
  function ensure() {
    if (!ctx) {
      var AC = root.AudioContext || root.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain(); master.gain.value = 0.55;
      var comp = ctx.createDynamicsCompressor(); master.connect(comp); comp.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  // A soft piano-ish tone: a few harmonics, quick attack, natural decay.
  function tone(m, when, dur, vol) {
    var c = ensure(); if (!c) return;
    var f = freq(m), g = c.createGain(), t = c.currentTime + 0.03 + (when || 0), d = Math.max(0.15, dur || 0.8);
    var v = (vol || 1) * (m > 76 ? 0.75 : 1);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.5 * v, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.18 * v, t + 0.25);
    g.gain.setValueAtTime(0.18 * v, t + Math.max(0.26, d - 0.12));
    g.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.35);
    g.connect(master);
    [[1, 1, 'triangle'], [2, 0.35, 'sine'], [3, 0.12, 'sine'], [4, 0.05, 'sine']].forEach(function (h) {
      var o = c.createOscillator(), og = c.createGain();
      o.type = h[2]; o.frequency.value = f * h[0]; og.gain.value = h[1];
      o.connect(og); og.connect(g); o.start(t); o.stop(t + d + 0.4); live.push(o);
    });
    root.__mbPlayed.push({ type: 'note', m: m, at: Date.now() + (when || 0) * 1000 });
  }
  // A short wood-block click for rhythms (accent = louder, higher).
  function click(when, accent) {
    var c = ensure(); if (!c) return;
    var t = c.currentTime + 0.03 + when, o = c.createOscillator(), g = c.createGain();
    o.type = 'square'; o.frequency.setValueAtTime(accent ? 1500 : 1100, t); o.frequency.exponentialRampToValueAtTime(accent ? 700 : 500, t + 0.05);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(accent ? 0.35 : 0.22, t + 0.003); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + 0.1); live.push(o);
    root.__mbPlayed.push({ type: 'click', at: Date.now() + when * 1000 });
  }

  function note(m, dur) { tone(m, 0, dur || 0.9); return dur || 0.9; }
  function seq(list) { var end = 0; list.forEach(function (x) { tone(x.m, x.t, x.d); end = Math.max(end, x.t + x.d); }); return end + 0.3; }
  // [{m, beats}] at bpm
  function melody(notes, bpm) {
    var b = 60 / (bpm || 90), t = 0, list = [];
    notes.forEach(function (x) { if (x.m != null) list.push({ m: x.m, t: t, d: Math.max(0.2, x.beats * b * 0.92) }); t += x.beats * b; });
    return seq(list);
  }
  // Rhythm on one pitch (a tone, so note values are heard as long/short), optional count-in clicks.
  function rhythm(pattern, bpm, opts) {
    opts = opts || {};
    var R = root.MB.rhythm, b = 60 / (bpm || 90), t0 = 0;
    if (opts.countIn) { for (var i = 0; i < (opts.per || 4); i++) click(i * b, i === 0); t0 = (opts.per || 4) * b; }
    var t = 0;
    pattern.forEach(function (code) {
      var V = R.VALUES[code];
      if (code === 'A') { tone(72, t0 + t, b * 0.45, 0.9); tone(72, t0 + t + b / 2, b * 0.45, 0.9); }
      else tone(72, t0 + t, V.beats * b * 0.9, 0.9);
      t += V.beats * b;
    });
    return t0 + t + 0.3;
  }
  function stop() {
    live.forEach(function (o) { try { o.stop(); } catch (e) { /* already stopped */ } });
    live = [];
    if (master && ctx) { var g = master.gain.value; master.gain.setValueAtTime(0, ctx.currentTime); master.gain.setValueAtTime(g, ctx.currentTime + 0.05); }
  }
  function available() { return !!(root.AudioContext || root.webkitAudioContext); }

  root.MB = root.MB || {};
  root.MB.audio = { freq: freq, note: note, seq: seq, melody: melody, rhythm: rhythm, click: click, stop: stop, unlock: ensure, available: available };
})(typeof window !== 'undefined' ? window : globalThis);
