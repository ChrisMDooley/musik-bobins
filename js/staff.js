/*
 * staff.js — draws a treble staff (Violinschlüssel) as SVG with real music symbols (glyphs.js).
 *
 *   MB.staff.render({ events, time: '4/4', clef: true, labels: true, place: {from, to, onPick} })
 *   events: [{ p: staff position (theory.pos), acc: '#'|'b'|'n'|null, dur: 4|2|1|0.5, beam: true (pairs of 0.5),
 *              label: 'fis', color, stem: 'up'|'down' }]  or  { bar: true }
 *   Returns a <div> with .mark(i, cls), .label(i, text), .band(p), .clearMarks(), .events.
 * Positions: 0 = bottom line (e'), 2 = g' (second line), 8 = top line (f''); below/above → ledger lines.
 */
(function (root) {
  'use strict';
  var NS = 'http://www.w3.org/2000/svg', G = root.MB.glyphs, T = root.MB.theory;
  var S = 12;                         // one staff space in SVG units
  var K = S / 360;                    // glyph path units → SVG (1 space = 360 path units)
  var HEAD = 1.18 * S, WHOLE = 1.69 * S;

  function el(tag, a, parent) { var e = document.createElementNS(NS, tag); for (var k in a) e.setAttribute(k, a[k]); if (parent) parent.appendChild(e); return e; }
  function glyph(name, x, y, parent, cls, scale) {
    return el('path', { d: G[name].d, transform: 'translate(' + x.toFixed(2) + ',' + y.toFixed(2) + ') scale(' + (K * (scale || 1)).toFixed(5) + ')', class: cls || '' }, parent);
  }

  function render(spec) {
    spec = spec || {};
    var evs = spec.events || [], place = spec.place || null;
    var ps = evs.filter(function (e) { return !e.bar; }).map(function (e) { return e.p; });
    if (place) ps = ps.concat([place.from, place.to]);
    var maxP = Math.max.apply(null, [10].concat(ps.map(function (p) { return p + (p < 4 ? 7 : 1); })));
    var minP = Math.min.apply(null, [-3].concat(ps.map(function (p) { return p - (p >= 4 ? 7 : 1); })));
    var labelsOn = spec.labels && evs.some(function (e) { return e.label; });
    var top = 6, Y0 = top + (maxP - 0) * S / 2;        // y of the bottom line
    function y(p) { return Y0 - p * S / 2; }
    var height = y(minP) + (labelsOn ? 2.4 * S : 0.6 * S);

    // ---- horizontal layout
    var x = 6, items = [];
    var clefW = spec.clef === false ? 0 : 3.2 * S, timeW = spec.time ? 2.4 * S : 0;
    x += clefW + timeW + 0.6 * S;
    var firstX = x;
    evs.forEach(function (e, i) {
      if (e.bar) { items.push({ bar: true, x: x + 0.4 * S }); x += 1.4 * S; return; }
      var accW = e.acc ? 1.5 * S : 0, w = e.dur >= 4 ? 4.4 * S : e.dur >= 2 ? 3.6 * S : e.dur >= 1 ? 2.9 * S : 2.3 * S;
      if (spec.spacing) w = Math.max(w, spec.spacing * S);
      items.push({ i: i, e: e, x: x + accW }); x += accW + w;
    });
    if (place && !evs.length) x += 6 * S;
    var width = Math.max(x + (spec.endBar === false ? 0.6 * S : 1.2 * S), spec.minWidth || 0);

    var svg = el('svg', { viewBox: '0 0 ' + width.toFixed(1) + ' ' + height.toFixed(1), class: 'staff-svg', role: 'img', 'aria-label': spec.aria || 'Notenzeile' });
    svg.style.maxWidth = Math.round(width * (spec.zoom || 2.3)) + 'px';      // never giant: about 2.3 px per unit
    var bands = el('g', { class: 'bands' }, svg), lines = el('g', { class: 'lines' }, svg);
    for (var l = 0; l <= 8; l += 2) el('line', { x1: 4, x2: width - 2, y1: y(l), y2: y(l), class: 'sl' }, lines);
    if (spec.clef !== false) glyph('gClef', 8, y(2), svg, 'clef');
    if (spec.time) {
      var tt = spec.time.split('/');
      glyph('timeSig' + tt[0], 6 + clefW, y(6), svg, 'tsig'); glyph('timeSig' + tt[1], 6 + clefW, y(2), svg, 'tsig');
    }
    if (spec.endBar !== false) { el('line', { x1: width - 3, x2: width - 3, y1: y(8), y2: y(0), class: 'bl end' }, svg); }

    var notesG = el('g', { class: 'notes' }, svg), labelG = el('g', { class: 'labels' }, svg);
    var nodes = [];
    // stem direction (pairs share one)
    items.forEach(function (it, k) {
      if (it.bar) return;
      var e = it.e;
      it.up = e.stem ? e.stem === 'up' : e.p < 4;
      if (e.beam && e.dur === 0.5) {
        var mate = items[k + 1] && items[k + 1].e && items[k + 1].e.beam && !it.paired ? items[k + 1] : null;
        if (mate && !it.paired) { var avg = (e.p + mate.e.p) / 2; it.up = mate.up = e.stem ? e.stem === 'up' : avg < 4; it.mate = mate; mate.paired = true; }
      }
    });
    items.forEach(function (it) {
      if (it.bar) { el('line', { x1: it.x, x2: it.x, y1: y(8), y2: y(0), class: 'bl' }, svg); return; }
      var e = it.e, g = el('g', { class: 'ev' + (e.cls ? ' ' + e.cls : ''), 'data-i': it.i }, notesG), hx = it.x, hy = y(e.p);
      if (e.color) g.style.setProperty('--c', e.color);
      // ledger lines
      T.ledgers(e.p).forEach(function (q) { el('line', { x1: hx - 0.45 * S, x2: hx + (e.dur >= 4 ? WHOLE : HEAD) + 0.45 * S, y1: y(q), y2: y(q), class: 'sl ledger' }, g); });
      if (e.acc) glyph({ '#': 'accidentalSharp', b: 'accidentalFlat', n: 'accidentalNatural' }[e.acc], hx - 1.25 * S, hy, g, 'acc');
      glyph(e.dur >= 4 ? 'noteheadWhole' : e.dur >= 2 ? 'noteheadHalf' : 'noteheadBlack', hx, hy, g, 'head');
      if (e.dur < 4) {
        var sx = it.up ? hx + HEAD - 0.55 : hx + 0.55, len = 3.5 * S;
        it.sx = sx; it.tip = it.up ? hy - len : hy + len;
        if (it.paired) {}          // stem drawn with the beam below
        else if (!it.mate) {
          el('line', { x1: sx, x2: sx, y1: hy + (it.up ? -1 : 1), y2: it.tip, class: 'stem' }, g);
          if (e.dur === 0.5) glyph(it.up ? 'flag8thUp' : 'flag8thDown', sx - 0.6, it.tip, g, 'flag');
        }
      }
      if (e.dot) glyph('augmentationDot', hx + HEAD + 0.4 * S, hy - (e.p % 2 === 0 ? S / 2 : 0), g, 'dot');
      if (labelsOn && e.label) { var tx = el('text', { x: hx + HEAD / 2, y: y(minP) + 1.6 * S, 'text-anchor': 'middle', class: 'nlabel', 'data-i': it.i }, labelG); tx.textContent = e.label; }
      nodes[it.i] = g;
    });
    // beams for eighth pairs: one thick beam from stem tip to stem tip (slope limited)
    items.forEach(function (it) {
      if (!it.mate) return;
      var a = it, b = it.mate, ya = y(a.e.p), yb = y(b.e.p), len = 3.5 * S, up = a.up;
      var tipA = up ? Math.min(ya, yb + (ya - yb) * 0.25) - len : Math.max(ya, yb + (ya - yb) * 0.25) + len;
      var tipB = up ? Math.min(yb, ya + (yb - ya) * 0.25) - len : Math.max(yb, ya + (yb - ya) * 0.25) + len;
      var slope = Math.max(-0.5 * S, Math.min(0.5 * S, tipB - tipA)); tipB = tipA + slope;
      var ga = nodes[a.i], gb = nodes[b.i];
      el('line', { x1: a.sx, x2: a.sx, y1: ya, y2: tipA, class: 'stem' }, ga);
      el('line', { x1: b.sx, x2: b.sx, y1: yb, y2: tipB, class: 'stem' }, gb);
      var th = 0.5 * S * (up ? 1 : -1);
      el('polygon', { points: [a.sx - 0.6, tipA, b.sx + 0.6, tipB, b.sx + 0.6, tipB + th, a.sx - 0.6, tipA + th].map(function (v) { return v.toFixed(2); }).join(' '), class: 'beam' }, ga);
    });

    var wrap = document.createElement('div');
    wrap.className = 'staff' + (place ? ' placeable' : '');
    wrap.appendChild(svg);
    wrap.svg = svg; wrap.events = evs; wrap.y = y;
    wrap.mark = function (i, cls) { if (nodes[i]) nodes[i].classList.add(cls || 'hl'); };
    wrap.unmark = function (i, cls) { if (nodes[i]) nodes[i].classList.remove(cls || 'hl'); };
    wrap.clearMarks = function () { nodes.forEach(function (n) { if (n) n.setAttribute('class', 'ev'); }); [].slice.call(bands.childNodes).forEach(function (b) { b.remove(); }); };
    wrap.label = function (i, text) {
      var tx = labelG.querySelector('[data-i="' + i + '"]');
      if (!tx) { var it = items.filter(function (z) { return z.i === i; })[0]; if (!it) return; tx = el('text', { x: it.x + HEAD / 2, y: y(minP) + 1.6 * S, 'text-anchor': 'middle', class: 'nlabel', 'data-i': i }, labelG); }
      tx.textContent = text;
    };
    // a coloured band on a line or in a space (feedback: "Das ist die zweite Linie")
    wrap.band = function (p, cls) {
      if (p % 2 === 0) el('rect', { x: 4, width: width - 6, y: y(p) - 1.6, height: 3.2, class: 'band ' + (cls || '') }, bands);
      else el('rect', { x: 4, width: width - 6, y: y(p + 1), height: S, class: 'band ' + (cls || '') }, bands);
    };
    wrap.nodeOf = function (i) { return nodes[i]; };

    // ---- placing a note: tap a line or a space
    if (place) {
      var ghost = el('g', { class: 'ghost', visibility: 'hidden' }, svg), gx = firstX + (evs.length ? 0 : 2 * S);
      if (evs.length) gx = items[items.length - 1].x + 3.4 * S;
      var placed = el('g', { class: 'placed' }, svg), cur = null;
      function posAt(evt) {
        var r = svg.getBoundingClientRect(), sy = (evt.clientY - r.top) * (height / r.height);
        var p = Math.round((Y0 - sy) / (S / 2));
        return Math.max(place.from, Math.min(place.to, p));
      }
      function drawAt(g, p) {
        g.innerHTML = '';
        T.ledgers(p).forEach(function (q) { el('line', { x1: gx - 0.45 * S, x2: gx + HEAD + 0.45 * S, y1: y(q), y2: y(q), class: 'sl ledger' }, g); });
        glyph('noteheadWhole', gx, y(p), g, 'head', 0.85);
      }
      svg.addEventListener('pointermove', function (evt) { if (evt.pointerType === 'mouse') { drawAt(ghost, posAt(evt)); ghost.setAttribute('visibility', 'visible'); } });
      svg.addEventListener('pointerleave', function () { ghost.setAttribute('visibility', 'hidden'); });
      svg.addEventListener('click', function (evt) { if (wrap.locked) return; cur = posAt(evt); drawAt(placed, cur); if (place.onPick) place.onPick(cur); });
      wrap.value = function () { return cur; };
      wrap.setValue = function (p) { cur = p; if (p == null) placed.innerHTML = ''; else drawAt(placed, p); };
      wrap.clickPos = function (p) {        // for tests and keyboard users
        var r = svg.getBoundingClientRect(); return { x: r.left + (gx + HEAD / 2) * r.width / width, y: r.top + y(p) * r.height / height };
      };
      // keyboard: ↑/↓ moves the note
      svg.setAttribute('tabindex', '0');
      svg.addEventListener('keydown', function (evt) {
        if (evt.key !== 'ArrowUp' && evt.key !== 'ArrowDown') return;
        evt.preventDefault(); cur = Math.max(place.from, Math.min(place.to, (cur == null ? 2 : cur) + (evt.key === 'ArrowUp' ? 1 : -1)));
        drawAt(placed, cur); if (place.onPick) place.onPick(cur);
      });
    }
    return wrap;
  }

  // Events from theory notes: [{n, dur, acc?, label?}] — acc shown only if given (or if the note is altered and showAcc).
  function fromNotes(list, opts) {
    opts = opts || {};
    return list.map(function (x) {
      if (x.bar) return { bar: true };
      var n = x.n, acc = x.acc !== undefined ? x.acc : (opts.showAcc && n.a ? (n.a > 0 ? '#' : 'b') : null);
      return { p: T.pos(n), acc: acc, dur: x.dur || opts.dur || 4, beam: x.beam, label: x.label, stem: x.stem, cls: x.cls };
    });
  }

  root.MB.staff = { render: render, fromNotes: fromNotes, S: S };
})(typeof window !== 'undefined' ? window : globalThis);
