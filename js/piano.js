/*
 * piano.js — a clickable keyboard like on the worksheets (kleines g … c''').
 *
 *   MB.piano.render({ from: 60, to: 72, labels: 'white'|'all'|'none', marks: true(octave marks), onPress(midi), sound: true })
 *   → element with .press(m), .mark(m, cls), .clear(), .dot(m) (worksheet-style dot on a key), .step(m1, m2, kind) (Ganz/Halbton bracket)
 * White keys: the Stammtöne. Black keys: two names (Kreuz/b), shown as "cis/des" when labels = 'all'.
 */
(function (root) {
  'use strict';
  var NS = 'http://www.w3.org/2000/svg', T = root.MB.theory, A = root.MB.audio;
  var WW = 40, WH = 170, BW = 24, BH = 106;

  function el(tag, a, parent) { var e = document.createElementNS(NS, tag); for (var k in a) e.setAttribute(k, a[k]); if (parent) parent.appendChild(e); return e; }
  function whiteName(m, marks) { var n = T.keyNames(m)[0]; return marks ? T.fullName(n) : T.name(n); }

  function render(opts) {
    opts = opts || {};
    var from = opts.from == null ? 60 : opts.from, to = opts.to == null ? 72 : opts.to;
    if (T.isBlack(from)) from--; if (T.isBlack(to)) to++;
    var whites = []; for (var m = from; m <= to; m++) if (!T.isBlack(m)) whites.push(m);
    var top = opts.steps ? 34 : 4, W = whites.length * WW + 2, H = top + WH + 4;
    var svg = el('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'piano-svg', role: 'group', 'aria-label': 'Klaviertastatur' });
    var stepsG = el('g', { class: 'steps' }, svg), keys = {}, xs = {};
    whites.forEach(function (m, i) {
      var g = el('g', { class: 'key white', 'data-m': m, tabindex: '0', role: 'button', 'aria-label': whiteName(m, true) }, svg);
      el('rect', { x: 1 + i * WW, y: top, width: WW, height: WH, rx: 5 }, g);
      xs[m] = 1 + i * WW + WW / 2;
      if (opts.labels !== 'none') { var t = el('text', { x: xs[m], y: top + WH - 12, 'text-anchor': 'middle', class: 'klabel' }, g); t.textContent = whiteName(m, opts.marks); }
      keys[m] = g;
    });
    whites.forEach(function (m, i) {
      var b = m + 1;
      if (b > to || !T.isBlack(b)) return;
      var g = el('g', { class: 'key black', 'data-m': b, tabindex: '0', role: 'button', 'aria-label': T.keyNames(b).map(T.name).join(' oder ') }, svg);
      var x = 1 + (i + 1) * WW - BW / 2;
      el('rect', { x: x, y: top, width: BW, height: BH, rx: 3 }, g);
      xs[b] = x + BW / 2;
      if (opts.labels === 'all') { var nm = T.keyNames(b).map(T.name); var t1 = el('text', { x: xs[b], y: top + BH - 26, 'text-anchor': 'middle', class: 'klabel bl' }, g); t1.textContent = nm[0]; var t2 = el('text', { x: xs[b], y: top + BH - 12, 'text-anchor': 'middle', class: 'klabel bl' }, g); t2.textContent = nm[1]; }
      keys[b] = g;
    });
    function press(m, silent) {
      var g = keys[m]; if (!g) return;
      g.classList.add('down'); setTimeout(function () { g.classList.remove('down'); }, 220);
      if (opts.sound !== false && !silent) A.note(m, 0.9);
    }
    Object.keys(keys).forEach(function (k) {
      var m = +k, g = keys[m];
      function hit(e) { e.preventDefault(); if (wrap.locked) return; press(m); if (opts.onPress) opts.onPress(m); }
      g.addEventListener('pointerdown', hit);
      g.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') hit(e); });
    });
    var wrap = document.createElement('div');
    wrap.className = 'piano' + (whites.length > 10 ? ' wide' : '');
    wrap.appendChild(svg);
    wrap.press = press;
    wrap.keys = keys;
    wrap.mark = function (m, cls) { if (keys[m]) keys[m].classList.add(cls || 'hl'); };
    wrap.unmark = function (m, cls) { if (keys[m]) keys[m].classList.remove(cls || 'hl'); };
    wrap.clear = function () { Object.keys(keys).forEach(function (k) { keys[k].setAttribute('class', 'key ' + (T.isBlack(+k) ? 'black' : 'white')); }); stepsG.innerHTML = ''; [].slice.call(svg.querySelectorAll('.kdot')).forEach(function (d) { d.remove(); }); };
    // the worksheet's dot on a key
    wrap.dot = function (m) { var bl = T.isBlack(m); el('circle', { cx: xs[m], cy: top + (bl ? BH - 44 : WH - 46), r: 6, class: 'kdot' }, keys[m]); };
    // ⌴ Ganzton / ∨ Halbton bracket above two keys (worksheet symbols)
    wrap.step = function (m1, m2, kind) {
      if (xs[m1] == null || xs[m2] == null) return;
      var x1 = xs[m1], x2 = xs[m2], yb = 26;
      if (kind === 'halb') el('path', { d: 'M' + x1 + ' 8 L' + (x1 + x2) / 2 + ' ' + yb + ' L' + x2 + ' 8', class: 'stp halb' }, stepsG);
      else el('path', { d: 'M' + x1 + ' 8 L' + x1 + ' ' + yb + ' L' + x2 + ' ' + yb + ' L' + x2 + ' 8', class: 'stp ganz' }, stepsG);
    };
    wrap.center = function (m) { var sc = wrap; if (sc.scrollWidth > sc.clientWidth && xs[m] != null) sc.scrollLeft = xs[m] / W * sc.scrollWidth - sc.clientWidth / 2; };
    wrap.keyPoint = function (m) { var r = keys[m].querySelector('rect').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height * (T.isBlack(m) ? 0.5 : 0.8) }; };
    return wrap;
  }

  root.MB.piano = { render: render };
})(typeof window !== 'undefined' ? window : globalThis);
