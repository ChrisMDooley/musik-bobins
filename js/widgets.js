/*
 * widgets.js — answer inputs. Each returns an element with:
 *   .value()  the input in the shape the task's check() expects · .focus() · .lock() · .fill(key) (show the solution)
 *   .clearInput() · optional .markWrong(), .markRight(), .feedback(result) (e.g. mark wrong beats)
 * Typing is kept small: name pads, tapping on the staff and the keyboard wherever possible.
 * Some widgets draw the task's picture themselves (names, pickNote, pianoSeq): OWNS_VISUAL.
 */
(function (root) {
  'use strict';
  var MB = root.MB, U = MB.ui, h = U.h, T = MB.theory, RH = MB.rhythm, A = MB.audio, G = MB.gens;
  var OWNS_VISUAL = { names: 1, pickNote: 1, pianoSeq: 1 };

  function choice(a) {
    var sel = null, btns = [];
    var wrap = h('div', { class: 'ans-choice' + (a.row ? ' row-opts' : '') + (a.long ? ' long' : '') + (a.mono ? ' mono' : ''), role: 'radiogroup' });
    a.options.forEach(function (o) {
      var b = h('button', { class: 'opt', type: 'button', 'data-id': o.id, role: 'radio', 'aria-checked': 'false' }, [o.label ? h('span', { class: 'opt-label', rich: o.label }) : null]);
      b.addEventListener('click', function () {
        if (b.disabled) return;
        sel = o.id; btns.forEach(function (x) { var on = x === b; x.classList.toggle('chosen', on); x.setAttribute('aria-checked', on ? 'true' : 'false'); });
        if (wrap.onPick) wrap.onPick();
      });
      btns.push(b); wrap.appendChild(b);
    });
    wrap.value = function () { return { id: sel }; };
    wrap.focus = function () { if (btns[0]) btns[0].focus(); };
    wrap.lock = function () { btns.forEach(function (b) { b.disabled = true; }); };
    wrap.clearInput = function () { sel = null; btns.forEach(function (b) { b.classList.remove('chosen', 'wrong'); b.setAttribute('aria-checked', 'false'); }); };
    wrap.markWrong = function () { btns.forEach(function (b) { if (b.classList.contains('chosen')) b.classList.add('wrong'); }); };
    wrap.markRight = function (id) { btns.forEach(function (b) { if (b.getAttribute('data-id') === id) b.classList.add('right'); }); };
    wrap.fill = function (k) { sel = k.id; btns.forEach(function (b) { var on = b.getAttribute('data-id') === k.id; b.classList.toggle('chosen', on); if (on) b.classList.add('right'); }); };
    return wrap;
  }

  // A pad for note names: c d e f g a h · is · es · s · b · ' · ⌫ (works on the focused box)
  function namePad(getInput, marks) {
    var keys = ['c', 'd', 'e', 'f', 'g', 'a', 'h', '+is', '+es', '+s', 'b'].concat(marks ? ["'"] : []).concat(['⌫']);
    return h('div', { class: 'name-pad', 'aria-label': 'Tonnamen-Tasten' }, keys.map(function (k) {
      var lab = k.charAt(0) === '+' ? '-' + k.slice(1) : k;
      return h('button', { class: 'pad-key' + (k.charAt(0) === '+' ? ' suf' : ''), type: 'button', tabindex: '-1', text: lab, onmousedown: function (e) { e.preventDefault(); }, onclick: function () {
        var i = getInput(); if (!i || i.disabled) return;
        if (k === '⌫') i.value = i.value.slice(0, -1); else i.value += k.charAt(0) === '+' ? k.slice(1) : k;
        i.dispatchEvent(new Event('input')); i.focus();
      } });
    }));
  }
  function nameBox(onEnter, label) {
    var i = h('input', { class: 'nbox name', type: 'text', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false', 'aria-label': label || 'Tonname', maxlength: 8 });
    i.addEventListener('input', function () { var v = i.value.toLowerCase().replace(/[’´`′]/g, "'").replace(/[^a-z']/g, ''); if (v !== i.value) i.value = v; });
    i.addEventListener('keydown', function (e) { if (e.key === 'Enter' && onEnter) { e.preventDefault(); onEnter(); } });
    return i;
  }
  function name(a, onEnter) {
    var i = nameBox(onEnter);
    if (a.placeholder) i.setAttribute('placeholder', a.placeholder);
    var wrap = h('div', { class: 'ans-name' }, [i, namePad(function () { return i; }, a.marks)]);
    wrap.value = function () { return { text: i.value }; };
    wrap.focus = function () { i.focus(); };
    wrap.lock = function () { i.disabled = true; i.classList.remove('wrong'); wrap.classList.add('locked'); };
    wrap.clearInput = function () { i.value = ''; };
    wrap.fill = function (k) { i.value = k.text; };
    wrap.markWrong = function () { i.classList.add('wrong'); setTimeout(function () { i.classList.remove('wrong'); }, 900); };
    return wrap;
  }

  function place(a) {
    var cur = null, st = MB.staff.render({ events: [], place: { from: a.from, to: a.to, onPick: function (p) { cur = p; } }, zoom: 2.6, minWidth: 150 });
    var wrap = h('div', { class: 'ans-place' }, [st, h('p', { class: 'note', text: 'Tippe auf eine Linie oder einen Zwischenraum (oder ↑ ↓).' })]);
    wrap.staff = st;
    wrap.value = function () { return { p: cur }; };
    wrap.focus = function () { st.svg.focus(); };
    wrap.lock = function () { st.locked = true; wrap.classList.add('locked'); };
    wrap.clearInput = function () { cur = null; st.setValue(null); };
    wrap.fill = function (k) { cur = k.p; st.setValue(k.p); };
    return wrap;
  }

  function piano(a, onEnter) {
    var sel = null, p = MB.piano.render({ from: a.from, to: a.to, labels: a.labels || 'none', marks: a.marks, onPress: function (m) { if (sel != null) p.unmark(sel, 'sel'); sel = m; p.mark(m, 'sel'); } });
    var wrap = h('div', { class: 'ans-piano' }, [p]);
    wrap.piano = p;
    setTimeout(function () { p.center(a.value); }, 30);
    wrap.value = function () { return { m: sel }; };
    wrap.focus = function () { };
    wrap.lock = function () { p.locked = true; wrap.classList.add('locked'); };
    wrap.clearInput = function () { if (sel != null) p.unmark(sel, 'sel'); sel = null; };
    wrap.markWrong = function () { if (sel != null) { var s = sel; p.mark(s, 'wrong'); setTimeout(function () { p.unmark(s, 'wrong'); }, 900); } };
    wrap.markRight = function () { if (sel != null) p.mark(sel, 'right'); };
    wrap.fill = function (k) { wrap.clearInput(); p.mark(k.m, 'right'); sel = k.m; };
    return wrap;
  }

  function two(a) {
    var v = { a: null, b: null }, rows = {};
    function row(key, spec) {
      var btns = spec.options.map(function (o) {
        return h('button', { class: 'chip', type: 'button', 'data-v': o, text: o, onclick: function () { if (wrap.locked) return; v[key] = o; btns.forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-v') === o); }); } });
      });
      rows[key] = btns;
      return h('div', { class: 'two-row' }, [h('span', { class: 'two-lab', text: spec.label }), h('div', { class: 'chips' }, btns)]);
    }
    var wrap = h('div', { class: 'ans-two' }, [row('a', a.a), row('b', a.b)]);
    wrap.value = function () { return { a: v.a, b: v.b }; };
    wrap.focus = function () { };
    wrap.lock = function () { wrap.locked = true; wrap.classList.add('locked'); };
    wrap.clearInput = function () { v = { a: null, b: null }; ['a', 'b'].forEach(function (k) { rows[k].forEach(function (b) { b.classList.remove('on'); }); }); };
    wrap.fill = function (k) { v = { a: k.a, b: k.b }; ['a', 'b'].forEach(function (key) { rows[key].forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-v') === k[key]); }); }); };
    return wrap;
  }

  // Ganz-/Halbtonschritte between the notes of a scale: tap a gap to switch ⌴ / ∨
  var GAPLAB = { ganz: '⌴ Ganz', halb: '∨ Halb' };
  function gaps(a) {
    var list = a.names.slice(1).map(function () { return null; }), btns = [];
    var wrap = h('div', { class: 'ans-gaps' });
    a.names.forEach(function (n, i) {
      wrap.appendChild(h('span', { class: 'gap-note', text: n }));
      if (i < a.names.length - 1) {
        var b = h('button', { class: 'gap', type: 'button', 'aria-label': 'Schritt ' + n + ' – ' + a.names[i + 1], text: '?', onclick: function () {
          if (wrap.locked) return;
          list[i] = list[i] === 'ganz' ? 'halb' : 'ganz'; b.textContent = GAPLAB[list[i]]; b.className = 'gap ' + list[i];
        } });
        btns.push(b); wrap.appendChild(b);
      }
    });
    wrap.value = function () { return { list: list.slice() }; };
    wrap.focus = function () { btns[0].focus(); };
    wrap.lock = function () { wrap.locked = true; wrap.classList.add('locked'); };
    wrap.clearInput = function () { };
    wrap.fill = function (k) { list = k.list.slice(); btns.forEach(function (b, i) { b.textContent = GAPLAB[list[i]]; b.className = 'gap ' + list[i] + ' right'; }); };
    return wrap;
  }

  // Tonleiter bauen: 8 notes on the staff, tap a note to cycle ♮ → ♯ → ♭; names and steps update; listen to it
  function build(a) {
    var tonic = a.tonic, accs = [tonic.a, 0, 0, 0, 0, 0, 0, tonic.a], notes;
    var box = h('div', { class: 'build-staff' }), steps = h('div', { class: 'build-steps' });
    function letters() { var out = [], s = tonic.s, o = tonic.o; for (var i = 0; i < 8; i++) { out.push({ s: s, o: o }); if (s === 6) o++; s = (s + 1) % 7; } return out; }
    var L = letters();
    function draw() {
      notes = L.map(function (x, i) { return T.note(x.s, accs[i], x.o); });
      box.innerHTML = '';
      var st = MB.staff.render({ events: notes.map(function (n, i) { return { p: T.pos(n), dur: 4, acc: n.a ? (n.a > 0 ? '#' : 'b') : null, label: T.name(n), cls: i > 0 && i < 7 ? 'tappable' : 'fixed' }; }), labels: true, spacing: 4.4, zoom: 2.4, hit: true });
      box.appendChild(st);
      for (var i = 1; i < 7; i++) (function (k) {
        var g = st.nodeOf(k); if (!g) return;
        g.setAttribute('tabindex', '0'); g.setAttribute('role', 'button'); g.setAttribute('aria-label', 'Note ' + (k + 1) + ': ' + T.name(notes[k]) + ' – antippen für ♯ oder ♭');
        function cyc(e) { e.preventDefault(); if (wrap.locked) return; accs[k] = accs[k] === 0 ? 1 : accs[k] === 1 ? -1 : 0; draw(); A.note(T.midi(T.note(L[k].s, accs[k], L[k].o)), 0.6); var g2 = box.querySelector('.ev[data-i="' + k + '"]'); if (g2) g2.focus(); }
        g.addEventListener('click', cyc); g.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') cyc(e); });
      })(i);
      steps.innerHTML = '';
      for (var j = 0; j < 7; j++) {
        var d = T.semis(notes[j], notes[j + 1]);
        steps.appendChild(h('span', { class: 'bstep ' + (d === 1 ? 'halb' : d === 2 ? 'ganz' : 'odd'), text: d === 1 ? '∨' : d === 2 ? '⌴' : d > 2 ? '⟷' : '!' }));
      }
    }
    var wrap = h('div', { class: 'ans-build' }, [box, h('div', { class: 'build-legend' }, [steps, h('span', { class: 'note', text: '⌴ Ganzton · ∨ Halbton' })]),
      h('div', { class: 'row' }, [h('button', { class: 'btn soft small', type: 'button', text: '🔊 So klingt deine Tonleiter', onclick: function () { MB.vis.play({ notes: notes.map(T.midi) }); } })])]);
    draw();
    wrap.value = function () { return { accs: accs.slice() }; };
    wrap.focus = function () { };
    wrap.lock = function () { wrap.locked = true; wrap.classList.add('locked'); };
    wrap.clearInput = function () { };
    wrap.fill = function (k) { accs = k.accs.slice(); draw(); };
    return wrap;
  }

  function staffs(a) {
    var sel = null, btns = [];
    var wrap = h('div', { class: 'ans-staffs' + (a.rhythm ? ' rhythm' : '') });
    a.options.forEach(function (o, i) {
      var st = MB.staff.render({ events: o.events, time: o.time, clef: o.clef !== false && !a.rhythm, zoom: a.rhythm ? 2.3 : 2 });
      var b = h('button', { class: 'opt staff-opt', type: 'button', 'data-id': o.id, 'aria-label': 'Notenzeile ' + (i + 1) }, [h('span', { class: 'opt-no', text: String(i + 1) }), st]);
      b.addEventListener('click', function () { if (b.disabled) return; sel = o.id; btns.forEach(function (x) { x.classList.toggle('chosen', x === b); }); });
      btns.push(b); wrap.appendChild(b);
    });
    wrap.value = function () { return { id: sel }; };
    wrap.focus = function () { btns[0].focus(); };
    wrap.lock = function () { btns.forEach(function (b) { b.disabled = true; }); };
    wrap.clearInput = function () { sel = null; btns.forEach(function (b) { b.classList.remove('chosen', 'wrong'); }); };
    wrap.markWrong = function () { btns.forEach(function (b) { if (b.classList.contains('chosen')) b.classList.add('wrong'); }); };
    wrap.markRight = function (id) { btns.forEach(function (b) { if (b.getAttribute('data-id') === id) b.classList.add('right'); }); };
    wrap.fill = function (k) { sel = k.id; btns.forEach(function (b) { var on = b.getAttribute('data-id') === k.id; b.classList.toggle('chosen', on); if (on) b.classList.add('right'); }); };
    return wrap;
  }

  // Rhythmus-Baukasten: tap du / du-de / du-a; the bars fill from left to right
  var RH_BTN = { V: 'Viertel · du', A: '2 Achtel · du-de', H: 'Halbe · du-a', G: 'Ganze · du-a-a-a' };
  function rhythm(a) {
    var pat = [], total = a.per * a.bars, bad = null;
    var box = h('div', { class: 'rh-staff' }), syl = h('p', { class: 'syl' }), info = h('p', { class: 'note' });
    function draw() {
      box.innerHTML = '';
      var used = RH.beats(pat), ev = G.rhEvents(pat, a.per, { cls: bad ? pat.map(function (c, i) { return badAt(i) ? 'bad' : null; }) : null });
      var st = MB.staff.render({ events: ev, time: a.per + '/4', clef: false, zoom: 2.2, minWidth: 90 + 60 * a.bars, endBar: used === total });
      box.appendChild(st);
      syl.textContent = pat.length ? RH.syllables(pat) : ' ';
      info.textContent = used < total ? 'Noch ' + (total - used) + (total - used === 1 ? ' Schlag' : ' Schläge') + (a.bars > 1 ? ' (Takt ' + (Math.floor(used / a.per) + 1) + ')' : '') : '✓ Alle Takte voll.';
      palette.forEach(function (b) { var c = b.getAttribute('data-c'); b.disabled = wrap.locked || !fits(c); });
    }
    function badAt(i) { var t = RH.beats(pat.slice(0, i)), b2 = t + RH.VALUES[pat[i]].beats; return bad.some(function (x) { return x >= t && x < b2; }); }
    function fits(c) { var used = RH.beats(pat), b = RH.VALUES[c].beats, inBar = used % a.per; return used + b <= total && inBar + b <= a.per; }
    var palette = a.codes.map(function (c) { return h('button', { class: 'btn rh-key', type: 'button', 'data-c': c, text: RH_BTN[c], onclick: function () { if (wrap.locked || !fits(c)) return; pat.push(c); bad = null; A.rhythm([c], a.bpm || 80); draw(); } }); });
    var undo = h('button', { class: 'btn soft rh-key', type: 'button', text: '⌫', 'aria-label': 'Letzten Notenwert löschen', onclick: function () { if (wrap.locked) return; pat.pop(); bad = null; draw(); } });
    var mine = h('button', { class: 'btn soft small', type: 'button', text: '▶ Meine Lösung anhören', onclick: function () { if (pat.length) MB.vis.play({ rhythm: pat, bpm: a.bpm }); } });
    var wrap = h('div', { class: 'ans-rhythm' }, [box, syl, info, h('div', { class: 'rh-palette' }, palette.concat([undo])), h('div', { class: 'row' }, [mine])]);
    draw();
    wrap.value = function () { return { pattern: pat.slice() }; };
    wrap.focus = function () { };
    wrap.lock = function () { wrap.locked = true; wrap.classList.add('locked'); draw(); };
    wrap.clearInput = function () { };
    wrap.feedback = function (r) { bad = r.badBeats || null; draw(); };
    wrap.fill = function (k) { pat = k.pattern.slice(); bad = null; draw(); };
    return wrap;
  }

  // Klopfen: tap the drum for every note (times relative to the first tap)
  function tap(a) {
    var taps = [], dots = h('div', { class: 'tap-dots' });
    var drum = h('button', { class: 'drum', type: 'button', 'aria-label': 'Trommel – hier klopfen', text: '🥁' });
    function hit(e) { if (e) e.preventDefault(); if (wrap.locked) return; taps.push(performance.now() / 1000); A.click(0, taps.length === 1); dots.appendChild(h('span', { class: 'tdot' })); drum.classList.remove('hit'); void drum.offsetWidth; drum.classList.add('hit'); }
    drum.addEventListener('pointerdown', hit);
    drum.addEventListener('keydown', function (e) { if (e.key === ' ' || e.key === 'Enter') hit(e); });
    var count = h('button', { class: 'btn soft small', type: 'button', text: '▶ Vorzähler: 1 – 2 – 3 – 4', onclick: function () { reset(); var b = 60 / (a.bpm || 80); for (var i = 0; i < 4; i++) A.click(i * b, i === 0); } });
    function reset() { taps = []; dots.innerHTML = ''; }
    var wrap = h('div', { class: 'ans-tap' }, [h('div', { class: 'row' }, [count, h('button', { class: 'btn soft small', type: 'button', text: '↺ Nochmal', onclick: reset })]), drum, dots,
      h('p', { class: 'note', text: 'Tippe auf die Trommel (oder Leertaste) – einmal für jede Note.' })]);
    wrap.value = function () { var t0 = taps[0] || 0; return { taps: taps.map(function (t) { return t - t0; }) }; };
    wrap.focus = function () { drum.focus(); };
    wrap.lock = function () { wrap.locked = true; wrap.classList.add('locked'); };
    wrap.clearInput = reset;
    wrap.fill = function () { reset(); };
    return wrap;
  }

  // Tonnamen unter mehrere Noten schreiben (the staff with numbers, one box per note)
  function names(a, onEnter, t) {
    var st = MB.staff.render(Object.assign({}, t.visual, { labels: true, zoom: 2.4 }));
    a.evIdx.forEach(function (k, i) { st.label(k, String(i + 1)); });
    var focused = null, boxes = a.value.map(function (_, i) {
      var b = nameBox(null, 'Note ' + (i + 1));
      b.addEventListener('focus', function () { focused = b; });
      b.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); if (boxes[i + 1]) boxes[i + 1].focus(); else if (onEnter) onEnter(); } });
      return b;
    });
    var grid = h('div', { class: 'names-grid' }, boxes.map(function (b, i) { return h('label', { class: 'nm-cell' }, [h('span', { class: 'nm-no', text: String(i + 1) }), b]); }));
    var wrap = h('div', { class: 'ans-names' }, [h('div', { class: 'vis vis-staff' }, [st]), grid, namePad(function () { return focused || boxes[0]; })]);
    wrap.value = function () { return { list: boxes.map(function (b) { return b.value; }) }; };
    wrap.focus = function () { boxes[0].focus(); };
    wrap.lock = function () { boxes.forEach(function (b) { b.disabled = true; }); wrap.classList.add('locked'); };
    wrap.clearInput = function () { };
    wrap.feedback = function (r) { boxes.forEach(function (b, i) { b.classList.toggle('wrong', (r.bad || []).indexOf(i) >= 0); }); };
    wrap.fill = function (k) { boxes.forEach(function (b, i) { b.value = k.list[i]; b.classList.remove('wrong'); }); };
    return wrap;
  }

  // Tap a note on the staff (Welcher Ton klingt falsch?)
  function pickNote(a, onEnter, t) {
    var sel = null, st = MB.staff.render(Object.assign({}, t.visual, { zoom: 2.4, hit: true }));
    var map = {}; a.evIdx.forEach(function (k, i) { map[k] = i; });
    a.evIdx.forEach(function (k, i) {
      var g = st.nodeOf(k); if (!g) return;
      g.classList.add('tappable'); g.setAttribute('tabindex', '0'); g.setAttribute('role', 'button'); g.setAttribute('aria-label', 'Note ' + (i + 1));
      function pickIt(e) { e.preventDefault(); if (wrap.locked) return; if (sel != null) st.unmark(a.evIdx[sel], 'chosen'); sel = i; st.mark(k, 'chosen'); }
      g.addEventListener('click', pickIt); g.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') pickIt(e); });
    });
    var wrap = h('div', { class: 'ans-pick' }, [h('div', { class: 'vis vis-staff' }, [st]), h('p', { class: 'note', text: 'Tippe auf die Note, die falsch klingt.' })]);
    wrap.value = function () { return { i: sel }; };
    wrap.focus = function () { };
    wrap.lock = function () { wrap.locked = true; wrap.classList.add('locked'); };
    wrap.clearInput = function () { if (sel != null) st.unmark(a.evIdx[sel], 'chosen'); sel = null; };
    wrap.markWrong = function () { if (sel != null) { var k = a.evIdx[sel]; st.mark(k, 'wrong'); setTimeout(function () { st.unmark(k, 'wrong'); }, 900); } };
    wrap.fill = function (k) { wrap.clearInput(); sel = k.i; st.mark(a.evIdx[k.i], 'right'); };
    return wrap;
  }

  // Play a melody on the keyboard, note by note; the staff shows where you are
  function pianoSeq(a, onEnter, t) {
    var seq = [], st = MB.staff.render(Object.assign({}, t.visual, { zoom: 2.3 }));
    var chips = h('div', { class: 'seq-chips' });
    var p = MB.piano.render({ from: a.from, to: a.to, labels: a.labels || 'none', onPress: function (m) {
      if (seq.length >= a.value.length) return;
      seq.push(m); chips.appendChild(h('span', { class: 'chip small', text: T.keyNames(m).map(T.name).join('/') })); mark();
      if (seq.length === a.value.length && onEnter) setTimeout(onEnter, 350);
    } });
    function mark() { a.evIdx.forEach(function (k, i) { st.unmark(k, 'now'); st.unmark(k, 'done'); if (i < seq.length) st.mark(k, 'done'); else if (i === seq.length) st.mark(k, 'now'); }); }
    var wrap = h('div', { class: 'ans-seq' }, [h('div', { class: 'vis vis-staff' }, [st]), p, chips,
      h('div', { class: 'row' }, [h('button', { class: 'btn soft small', type: 'button', text: '⌫ Ton zurück', onclick: function () { if (wrap.locked) return; seq.pop(); if (chips.lastChild) chips.lastChild.remove(); mark(); } }),
        h('button', { class: 'btn soft small', type: 'button', text: '↺ Von vorn', onclick: function () { if (!wrap.locked) wrap.clearInput(); } })])]);
    mark();
    setTimeout(function () { p.center(a.value[0]); }, 30);
    wrap.piano = p;
    wrap.value = function () { return { seq: seq.slice() }; };
    wrap.focus = function () { };
    wrap.lock = function () { p.locked = true; wrap.locked = true; wrap.classList.add('locked'); };
    wrap.clearInput = function () { seq = []; chips.innerHTML = ''; mark(); };
    wrap.feedback = function (r) { if (r.at != null) { var keep = seq.slice(0, r.at); wrap.clearInput(); keep.forEach(function (m) { seq.push(m); chips.appendChild(h('span', { class: 'chip small', text: T.keyNames(m).map(T.name).join('/') })); }); mark(); } };
    wrap.fill = function (k) { wrap.clearInput(); k.seq.forEach(function (m) { seq.push(m); chips.appendChild(h('span', { class: 'chip small', text: T.keyNames(m).map(T.name).join('/') })); }); mark(); };
    return wrap;
  }

  function keyOf(a) {
    switch (a.type) {
      case 'choice': case 'staffs': return { id: a.correct };
      case 'name': return { text: a.value };
      case 'place': return { p: a.value };
      case 'piano': return { m: a.value };
      case 'two': return { a: a.a.value, b: a.b.value };
      case 'gaps': return { list: a.value.slice() };
      case 'build': return { accs: a.value.slice() };
      case 'rhythm': return { pattern: a.value.slice() };
      case 'names': return { list: a.value.slice() };
      case 'pickNote': return { i: a.value };
      case 'pianoSeq': return { seq: a.value.slice() };
      case 'tap': return null;
    }
    return null;
  }
  var MAKERS = { choice: choice, name: name, place: place, piano: piano, two: two, gaps: gaps, build: build, staffs: staffs, rhythm: rhythm, tap: tap, names: names, pickNote: pickNote, pianoSeq: pianoSeq };
  function make(a, onEnter, task) {
    var f = MAKERS[a.type]; if (!f) throw new Error('no widget for ' + a.type);
    var w = f(a, onEnter, task || {});
    w.setAttribute('data-type', a.type);
    return w;
  }

  root.MB.widgets = { make: make, keyOf: keyOf, OWNS_VISUAL: OWNS_VISUAL, namePad: namePad };
})(typeof window !== 'undefined' ? window : globalThis);
