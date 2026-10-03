/*
 * vis.js — task pictures (staff, keyboard, both) and the 🔊 play buttons.
 *
 *   MB.vis.render(visual)  visual: {type:'staff', events, time, clef, zoom, labels, markIdx, syl} |
 *                                  {type:'piano', from, to, labels, dots, hl} → element (.staff / .piano inside)
 *   MB.vis.play(spec)      spec: {notes:[midi]} | {melody:[{m,beats}], bpm} | {rhythm:[codes], bpm, countIn} → seconds
 *   MB.vis.playButtons(list, opts) → a row of buttons; {max} limits how often (Rhythmusdiktat)
 */
(function (root) {
  'use strict';
  var MB = root.MB, A = MB.audio, h = MB.ui.h, T = MB.theory;

  function staff(v) {
    var spec = {}; for (var k in v) spec[k] = v[k];
    var st = MB.staff.render(spec);
    if (v.markIdx != null) st.mark(v.markIdx, 'ask');
    var wrap = h('div', { class: 'vis vis-staff' + (v.rhythm ? ' rhythm' : '') }, [st]);
    if (v.syl) wrap.appendChild(h('p', { class: 'syl', text: v.syl }));
    wrap.staff = st;
    return wrap;
  }
  function piano(v) {
    var p = MB.piano.render({ from: v.from, to: v.to, labels: v.labels || 'none', marks: v.marks, sound: v.sound !== false, steps: v.steps, onPress: v.onPress });
    (v.dots || []).forEach(function (m) { p.dot(m); });
    (v.hl || []).forEach(function (m) { p.mark(m, 'hl'); });
    var wrap = h('div', { class: 'vis vis-piano' }, [p]);
    wrap.piano = p;
    setTimeout(function () { var c = (v.dots || v.hl || [])[0]; if (c != null) p.center(c); }, 30);
    return wrap;
  }
  function render(v) {
    if (!v) return null;
    if (v.type === 'staff') return staff(v);
    if (v.type === 'piano') return piano(v);
    if (v.type === 'both') { var w = h('div', { class: 'vis vis-both' }), s = staff(v.staff), p = piano(v.piano); w.appendChild(s); w.appendChild(p); w.staff = s.staff; w.piano = p.piano; return w; }
    return null;
  }

  // ---------------------------------------------------------------- sound
  var busyUntil = 0;
  function play(spec) {
    A.stop();
    var secs = 0;
    if (spec.notes) secs = A.seq(spec.notes.map(function (m, i) { return { m: m, t: i * 0.8, d: 0.75 }; }));
    else if (spec.melody) secs = A.melody(spec.melody, spec.bpm || 96);
    else if (spec.rhythm) secs = A.rhythm(spec.rhythm, spec.bpm || 80, { countIn: spec.countIn, per: spec.per || 4 });
    busyUntil = Date.now() + secs * 1000;
    return secs;
  }
  function playButtons(list, opts) {
    opts = opts || {};
    if (!list || !list.length) return null;
    var row = h('div', { class: 'play-row' });
    list.forEach(function (spec) {
      var left = spec.max || 0, lab = spec.label;
      var b = h('button', { class: 'btn play' + (spec.small ? ' small soft' : ''), type: 'button' });
      function setLabel() { b.textContent = lab + (spec.max ? ' (' + left + '×)' : ''); }
      setLabel();
      b.addEventListener('click', function () {
        if (spec.max && left <= 0) return;
        if (spec.max) { left--; setLabel(); if (!left) b.disabled = true; }
        var secs = play(spec);
        b.classList.add('playing'); setTimeout(function () { b.classList.remove('playing'); }, secs * 1000);
        if (opts.onPlay) opts.onPlay(spec, secs);
      });
      row.appendChild(b);
    });
    if (!A.available()) row.appendChild(h('p', { class: 'note', text: 'Dieser Browser kann keine Töne abspielen.' }));
    return row;
  }

  root.MB.vis = { render: render, play: play, playButtons: playButtons, staff: staff, piano: piano };
})(typeof window !== 'undefined' ? window : globalThis);
