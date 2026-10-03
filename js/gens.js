/*
 * gens.js — exercise generators: registry, helpers, answer checking, and
 * Noten lesen · Tastatur · Ganz-/Halbton · Dur-Tonleiter · Versetzungszeichen.
 * (Hören, Rhythmus, Melodien: gens2.js)
 *
 * A generator = { id, skill, tags, levels, params(level, R, want) → p, build(p) → task }; build() is
 * deterministic, so a task can be rebuilt from its params (Fehlertraining). Every right answer is derived
 * from theory.js (pitch and spelling), never typed in by hand.
 *
 * Task: prompt, sub (short text, *bold*, [highlight]) · visual: {type:'staff'|'piano'|'both', …} ·
 *   play: [{label, fn}] buttons (🔊) · answer: {type, …} · check(input) → {ok, err, msg, note} ·
 *   hints (4) · solution (lines) · reveal: {band: p, label: …, keys: [m]} shown after the answer · sound (played after answering)
 */
(function (root) {
  'use strict';
  var T = root.MB.theory;
  var LIST = [], BY = {};
  function reg(g) { g.levels = g.levels || [1, 2, 3]; LIST.push(g); BY[g.id] = g; }

  // ---------------------------------------------------------------- helpers
  function makeR(rand) {
    rand = rand || Math.random;
    var R = {
      int: function (a, b) { return a + Math.floor(rand() * (b - a + 1)); },
      pick: function (arr) { return arr[Math.floor(rand() * arr.length)]; },
      chance: function (p) { return rand() < p; },
      shuffle: function (arr) { var a = arr.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(rand() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
    };
    return R;
  }
  function rot(arr, k) { k = (k || 0) % arr.length; return arr.slice(k).concat(arr.slice(0, k)); }
  function opt(id, label, extra) { var o = { id: id, label: label }; for (var k in extra || {}) o[k] = extra[k]; return o; }
  function checkChoice(correct, inp, wrongs, dflt) {
    if (!inp || (inp.id == null && !inp.ids)) return { incomplete: true, msg: 'Wähle eine Antwort.' };
    if (inp.id === correct) return { ok: true };
    var w = wrongs && (typeof wrongs === 'function' ? wrongs(inp.id) : wrongs[inp.id]);
    return w ? { ok: false, err: w.err, msg: w.msg } : (dflt || { ok: false, err: 'other', msg: 'Das stimmt noch nicht.' });
  }
  var LETTERS = ['c', 'd', 'e', 'f', 'g', 'a', 'h'];
  function letterOpts() { return LETTERS.map(function (l) { return opt(l, l); }); }
  function N(s, a, o) { return T.note(s, a, o); }
  var nm = T.name, full = T.fullName;
  // Events for one big note on the staff
  function single(n, acc) { return [{ p: T.pos(n), dur: 4, acc: acc === undefined ? (n.a ? (n.a > 0 ? '#' : 'b') : null) : acc }]; }
  // A typed or chosen name → {s, a} (or null). Also recognises typical wrong spellings for feedback.
  function readName(inp) {
    if (!inp) return null;
    if (inp.id != null) return { raw: inp.id, n: T.parseName(inp.id) };
    var raw = String(inp.text || '').trim().toLowerCase().replace(/[’´`′]/g, "'");
    return { raw: raw, n: T.parseName(raw.replace(/'+$/, '')), marks: (raw.match(/'+$/) || [''])[0].length };
  }
  // feedback for a wrong note name, given the right note
  function nameFeedback(want, got, raw) {
    var w = nm(want);
    if (raw === 'hes') return { ok: false, err: 'endung', msg: 'Fast! Das h mit b heißt nicht „hes“, sondern einfach *b*.' };
    if (/^(ees|aes)$/.test(raw)) return { ok: false, err: 'endung', msg: 'Fast! Bei a und e fällt das e weg: *as* und *es*.' };
    if (raw === 'bes') return { ok: false, err: 'endung', msg: 'Der Ton h mit b heißt *b*.' };
    if (raw === 'his' && w === 'c' || raw === 'eis' && w === 'f') return null;
    if (!got) return { ok: false, err: 'endung', msg: '„' + raw + '“ ist kein Tonname. Stammtöne: c d e f g a h. Mit ♯ kommt -is dazu, mit ♭ -es (Ausnahmen: es, as, b).' };
    if (got.s === want.s && got.a === 0 && want.a !== 0) return { ok: false, err: 'vorz_vergessen', msg: 'Achtung, das Versetzungszeichen! Vor der Note steht ein ' + (want.a > 0 ? 'Kreuz ♯ – dann hängt man *-is* an: ' + w : 'b ♭ – dann heißt der Ton *' + w + '*') + '.' };
    if (got.s === want.s && got.a === -want.a && want.a !== 0) return { ok: false, err: 'richtung', msg: (want.a > 0 ? 'Ein Kreuz ♯ erhöht – dann hängt man *-is* an, nicht -es. Richtig: ' : 'Ein b ♭ erniedrigt – dann kommt *-es* (bzw. -s) dazu, nicht -is. Richtig: ') + '*' + w + '*.' };
    if (got.s !== want.s && T.midi(N(got.s, got.a, 4)) % 12 === T.midi(N(want.s, want.a, 4)) % 12) return { ok: false, err: 'enharm', msg: '*' + nm(N(got.s, got.a, 4)) + '* ist dieselbe Taste – aber hier steht ' + (want.a > 0 ? 'ein Kreuz vor dem ' + LETTERS[want.s] : want.a < 0 ? 'ein b vor dem ' + LETTERS[want.s] : 'kein Versetzungszeichen') + '. Deshalb heißt der Ton *' + w + '*.' };
    return null;
  }
  // "Du hast h gewählt. Die Note liegt aber eine Stufe tiefer."
  function readFeedback(want, gotS) {
    var d = gotS - want.s; if (d > 3) d -= 7; if (d < -3) d += 7;
    var p = T.pos(want);
    var tail = ' Das ist ein *' + LETTERS[want.s] + '* – es liegt ' + T.where(p) + '.';
    if (Math.abs(d) === 1) return { ok: false, err: 'nachbar', msg: 'Du hast *' + LETTERS[gotS] + '* gewählt. Die Note liegt aber eine Stufe ' + (d > 0 ? 'tiefer' : 'höher') + '.' + tail };
    if (Math.abs(d) === 2) return { ok: false, err: 'linie', msg: 'Du hast *' + LETTERS[gotS] + '* gewählt – das wäre zwei Stufen ' + (d > 0 ? 'höher' : 'tiefer') + '. Schau genau: ' + T.lineOrSpace(p) + '?' + tail };
    return { ok: false, err: 'lesen', msg: 'Du hast *' + LETTERS[gotS] + '* gewählt.' + tail };
  }
  var LINES = 'Die Linien von unten: e – g – h – d – f. Die Zwischenräume: f – a – c – e.';
  function readHints(p) {
    return ['Liegt die Note auf einer Linie oder in einem Zwischenraum?', 'Die Note liegt ' + T.where(p) + '.',
            p >= 0 && p <= 8 ? LINES : 'Unter dem System: d (unter der 1. Linie), c (1. Hilfslinie), h, a (2. Hilfslinie), g. Darüber: g, a (1. Hilfslinie), h, c (2. Hilfslinie).',
            'Die zweite Linie ist g – um sie windet sich der Violinschlüssel. Zähle von dort Schritt für Schritt.'];
  }
  // Ranges per level (staff positions): L1 c'…e'' · L2 a…a'' · L3 g…c'''
  var RANGE = { 1: [-2, 7], 2: [-4, 10], 3: [-5, 12] };
  function keyDescr(m) {
    var n = T.keyNames(m)[0], l = LETTERS[n.s];
    if (T.isBlack(m)) return 'eine schwarze Taste';
    return { c: 'links neben den zwei schwarzen Tasten', d: 'zwischen den zwei schwarzen Tasten', e: 'rechts neben den zwei schwarzen Tasten',
             f: 'links neben den drei schwarzen Tasten', g: 'zwischen der 1. und 2. der drei schwarzen Tasten', a: 'zwischen der 2. und 3. der drei schwarzen Tasten', h: 'rechts neben den drei schwarzen Tasten' }[l];
  }

  // ================================================================ Noten lesen

  reg({ id: 'lesen', skill: 'lesen', tags: ['lesen', 'short'],
    params: function (level, R) { var r = RANGE[level]; return { p: R.int(r[0], r[1]), typed: level === 3 && R.chance(0.6) }; },
    build: function (p) {
      var n = T.fromPos(p.p), L = LETTERS[n.s];
      return { prompt: 'Wie heißt dieser Ton?', visual: { type: 'staff', events: single(n), zoom: 3 },
        answer: p.typed ? { type: 'name', value: L, placeholder: 'Tonname' } : { type: 'choice', options: letterOpts(), row: true, correct: L },
        check: function (inp) {
          var r = readName(inp); if (!r || !r.raw) return { incomplete: true, msg: p.typed ? 'Schreibe den Tonnamen.' : 'Wähle einen Ton.' };
          if (r.n && r.n.s === n.s && r.n.a === 0) return { ok: true };
          if (!r.n) return nameFeedback(n, null, r.raw);
          return readFeedback(n, r.n.s);
        },
        hints: readHints(p.p), solution: ['Das ist ein *' + L + '*. Es liegt ' + T.where(p.p) + '.'],
        reveal: { band: p.p }, sound: [T.midi(n)] };
    }
  });

  reg({ id: 'setzen', skill: 'setzen', tags: ['lesen', 'short'],
    params: function (level, R) { var r = level === 1 ? [0, 7] : RANGE[level]; return { p: R.int(r[0], r[1]), exact: level === 3 }; },
    build: function (p) {
      var n = T.fromPos(p.p), L = LETTERS[n.s], r = [-6, 13];
      var ok = []; for (var q = (p.exact ? p.p : r[0]); q <= (p.exact ? p.p : r[1]); q++) if (((q % 7) + 7 + 2) % 7 === n.s && (p.exact || (q >= RANGE[2][0] && q <= RANGE[3][1]))) ok.push(q);
      if (!p.exact) { ok = ok.filter(function (q) { return q >= -5 && q <= 12; }); }
      var name = p.exact ? full(n) : L;
      return { prompt: 'Setze ein *' + name + '* ins Notensystem.', sub: ok.length > 1 && !p.exact ? 'Es gibt mehrere richtige Stellen – eine genügt.' : 'Tippe auf die richtige Linie oder den Zwischenraum.',
        answer: { type: 'place', from: -6, to: 13, value: p.p },
        check: function (inp) {
          if (!inp || inp.p == null) return { incomplete: true, msg: 'Tippe ins Notensystem.' };
          if (ok.indexOf(inp.p) >= 0) return { ok: true };
          var got = T.fromPos(inp.p);
          if (got.s === n.s) return { ok: false, err: 'oktave', msg: 'Das ist auch ein ' + L + ' – aber *' + full(got) + '*. Gesucht ist *' + full(n) + '*: ' + T.where(p.p) + '.' };
          var d = inp.p - p.p, near = Math.abs(d) === 1;
          return { ok: false, err: near ? 'nachbar' : 'lesen', msg: 'Dort liegt ein *' + LETTERS[got.s] + '* (' + T.where(inp.p) + ').' + (near ? ' Eine Stufe ' + (d > 0 ? 'tiefer' : 'höher') + ' liegt das ' + L + '.' : ' Das ' + name + ' liegt ' + T.where(p.p) + '.') };
        },
        hints: ['Wo liegt das g? Auf der zweiten Linie – um sie windet sich der Violinschlüssel.', LINES, 'Gehe von g aus Schritt für Schritt: Linie, Zwischenraum, Linie …', 'Das ' + name + ' liegt ' + T.where(p.p) + '.'],
        solution: ['Das *' + name + '* liegt ' + T.where(p.p) + '.'], reveal: { band: p.p }, sound: [T.midi(n)] };
    }
  });

  reg({ id: 'oktave', skill: 'oktave', tags: ['lesen'],
    params: function (level, R) { return { p: R.int(-5, 12), typed: level >= 2, o: R.int(0, 3) }; },
    build: function (p) {
      var n = T.fromPos(p.p), right = full(n);
      var opts = [right, full(N(n.s, 0, n.o + 1)), full(N(n.s, 0, n.o - 1)), full(T.fromPos(p.p + 1))].filter(function (x, i, a) { return a.indexOf(x) === i && !/undefined/.test(x); }).slice(0, 4);
      var choice = rot(opts.map(function (x) { return opt(x, x); }), p.o);
      var expl = 'Ohne Strich: kleine Oktave (g a h). c\' bis h\': eingestrichen. c\'\' bis h\'\': zweigestrichen. c\'\'\': dreigestrichen.';
      return { prompt: 'Wie heißt dieser Ton *genau* (mit Strichen)?', visual: { type: 'staff', events: single(n), zoom: 3 },
        answer: p.typed ? { type: 'name', value: right, marks: true, placeholder: "z. B. g'" } : { type: 'choice', options: choice, row: true, correct: right },
        check: function (inp) {
          var raw = inp && (inp.id || inp.text); if (!raw) return { incomplete: true, msg: 'Schreibe den Tonnamen mit Strichen, z. B. g\'.' };
          var g = T.parse(String(raw).replace(/[’´`′]/g, "'"), 3);
          if (g && T.eqSpelling(g, n)) return { ok: true };
          if (g && g.s === n.s && g.a === n.a) return { ok: false, err: 'oktave', msg: 'Der Ton ist ein ' + nm(n) + ' – aber die Striche stimmen nicht. ' + expl + ' Richtig: *' + right + '*.' };
          return Object.assign(readFeedback(n, g ? g.s : 0), { err: 'lesen' });
        },
        hints: ['Erst den Tonnamen finden, dann die Oktave.', readHints(p.p)[1], 'Das c\' liegt auf der ersten Hilfslinie unter dem System. Ab dort zählt man eingestrichen.', expl],
        solution: ['Das ist *' + right + '* (' + T.octaveWord(n.o) + ').'], reveal: { band: p.p }, sound: [T.midi(n)] };
    }
  });

  // ================================================================ Tastatur

  function pianoRange(level) { return level === 1 ? [60, 72] : level === 2 ? [55, 79] : [55, 84]; }
  reg({ id: 'taste', skill: 'taste', tags: ['taste', 'short'],
    params: function (level, R) {
      var r = pianoRange(level), m;
      do { m = R.int(r[0], r[1]); } while (level === 1 && T.isBlack(m));
      var sp = T.keyNames(m);
      return { m: m, which: sp.length > 1 ? R.int(0, 1) : 0, exact: level === 3 };
    },
    build: function (p) {
      var r = pianoRange(p.exact ? 3 : (T.isBlack(p.m) || p.m < 60 || p.m > 72 ? 2 : 1)), n = T.keyNames(p.m)[p.which], name = p.exact ? full(n) : nm(n);
      var pc = p.m % 12;
      return { prompt: 'Finde das *' + name + '* auf der Tastatur.', sub: p.exact ? 'Achte auf die Striche!' : (r[1] - r[0] > 12 ? 'Jedes ' + nm(n) + ' zählt.' : ''),
        answer: { type: 'piano', from: r[0], to: r[1], labels: 'none', value: p.m },
        check: function (inp) {
          if (!inp || inp.m == null) return { incomplete: true, msg: 'Tippe auf eine Taste.' };
          if (p.exact ? inp.m === p.m : inp.m % 12 === pc) return { ok: true, note: inp.m !== p.m ? 'Richtig – das ist ein ' + nm(n) + ' (' + full(T.keyNames(inp.m)[0]) + ').' : null };
          var g = T.keyNames(inp.m).map(nm).join('/');
          if (inp.m % 12 === pc) return { ok: false, err: 'oktave', msg: 'Das ist ein ' + nm(n) + ', aber in der falschen Oktave. Gesucht: *' + name + '*.' };
          return { ok: false, err: 'taste', msg: 'Das war *' + g + '*. Das ' + nm(n) + ' ist ' + keyDescr(p.m) + (T.isBlack(p.m) ? ' – ' + (n.a > 0 ? 'rechts neben dem ' + LETTERS[n.s] : 'links neben dem ' + LETTERS[n.s]) : '') + '.' };
        },
        hints: ['Orientiere dich an den schwarzen Tasten: Sie kommen in Zweier- und Dreiergruppen.', 'c d e liegen um die Zweiergruppe, f g a h um die Dreiergruppe.',
                T.isBlack(p.m) ? (n.a > 0 ? 'Ein Kreuz erhöht: nimm die Taste direkt rechts neben dem ' + LETTERS[n.s] + '.' : 'Ein b erniedrigt: nimm die Taste direkt links neben dem ' + LETTERS[n.s] + '.') : 'Das ' + nm(n) + ' liegt ' + keyDescr(p.m) + '.',
                p.exact ? 'c\' ist das c in der Mitte. Ohne Strich ist die tiefste Oktave hier (g a h).' : 'Suche die richtige Gruppe und zähle ab.'],
        solution: ['Das *' + name + '* ist ' + keyDescr(p.m) + '.'], reveal: { keys: [p.m] }, sound: [p.m] };
    }
  });

  reg({ id: 'note_taste', skill: 'note_taste', tags: ['taste', 'lesen'],
    params: function (level, R) {
      var r = level === 1 ? [-2, 5] : level === 2 ? [-4, 9] : [-5, 12], pp = R.int(r[0], r[1]), a = level >= 2 && R.chance(0.35) ? R.pick([1, -1]) : 0;
      var n = T.fromPos(pp, a); if (!n || T.midi(n) < 55 || T.midi(n) > 84) a = 0;
      return { p: pp, a: a };
    },
    build: function (p) {
      var n = T.fromPos(p.p, p.a), m = T.midi(n), lo = Math.min(60, Math.floor(m / 12) * 12 - (m < 60 ? 5 : 0)), hi = Math.max(72, m + 3);
      lo = Math.max(55, Math.min(lo, m - 2)); hi = Math.min(84, Math.max(hi, lo + 12));
      return { prompt: 'Spiele diesen Ton auf der Tastatur.', visual: { type: 'staff', events: single(n), zoom: 2.6 },
        answer: { type: 'piano', from: lo, to: hi, labels: 'none', value: m },
        check: function (inp) {
          if (!inp || inp.m == null) return { incomplete: true, msg: 'Tippe auf eine Taste.' };
          if (inp.m === m) return { ok: true };
          var g = T.keyNames(inp.m)[0];
          if (inp.m % 12 === m % 12) return { ok: false, err: 'oktave', msg: 'Richtiger Ton, falsche Oktave. Die Note ist *' + full(n) + '*.' };
          if (n.a && inp.m === T.midi(N(n.s, 0, n.o))) return { ok: false, err: 'vorz_vergessen', msg: 'Fast! Achte auf das ' + (n.a > 0 ? 'Kreuz: einen Halbton höher' : 'b: einen Halbton tiefer') + ' – *' + nm(n) + '*.' };
          return { ok: false, err: 'taste', msg: 'Das war *' + T.keyNames(inp.m).map(nm).join('/') + '*. Die Note ist ein *' + nm(n) + '* (' + T.where(p.p) + ').' };
        },
        hints: ['Wie heißt die Note? ' + readHints(p.p)[1], LINES, n.a ? 'Vor der Note steht ein ' + (n.a > 0 ? 'Kreuz – eine Taste nach rechts.' : 'b – eine Taste nach links.') : 'Es ist eine weiße Taste.', 'Die Note heißt *' + full(n) + '*.'],
        solution: ['Das ist *' + full(n) + '*.'], reveal: { band: p.p, keys: [m] }, sound: [m] };
    }
  });

  reg({ id: 'taste_name', skill: 'taste_name', tags: ['taste', 'short'],
    params: function (level, R) { var r = pianoRange(level), m; do { m = R.int(r[0], r[1]); } while (T.isBlack(m)); return { m: m, lv: level }; },
    build: function (p) {
      var n = T.keyNames(p.m)[0], L = nm(n), r = pianoRange(p.lv);
      return { prompt: 'Wie heißt der Ton auf der markierten Taste?', visual: { type: 'piano', from: r[0], to: r[1], labels: 'none', dots: [p.m] },
        answer: { type: 'choice', options: letterOpts(), row: true, correct: L },
        check: function (inp) {
          if (!inp || !inp.id) return { incomplete: true, msg: 'Wähle einen Ton.' };
          if (inp.id === L) return { ok: true };
          var d = LETTERS.indexOf(inp.id) - n.s; if (d > 3) d -= 7; if (d < -3) d += 7;
          return { ok: false, err: 'taste', msg: 'Du hast *' + inp.id + '* gewählt' + (Math.abs(d) === 1 ? ' – das ist die Taste ' + (d > 0 ? 'rechts' : 'links') + ' daneben' : '') + '. Die markierte Taste liegt ' + keyDescr(p.m) + ': *' + L + '*.' };
        },
        hints: ['Suche die schwarzen Tasten in der Nähe: Zweier- oder Dreiergruppe?', 'Um die Zweiergruppe liegen c d e, um die Dreiergruppe f g a h.', 'Die Taste liegt ' + keyDescr(p.m) + '.', 'Zähle von c (links neben den zwei schwarzen Tasten) nach rechts: c d e f g a h.'],
        solution: ['Das ist ein *' + L + '* – ' + keyDescr(p.m) + '.'], reveal: { keys: [p.m] }, sound: [p.m] };
    }
  });

  // ================================================================ Ganzton / Halbton

  reg({ id: 'ganzhalb', skill: 'ganzhalb', tags: ['schritte', 'short'],
    params: function (level, R) {
      if (level === 1) { var w = R.pick([[60, 62], [62, 64], [64, 65], [65, 67], [67, 69], [69, 71], [71, 72], [64, 65], [71, 72], [76, 77]]); return { a: w[0], b: w[1], how: 'piano' }; }
      var m = R.int(57, 78), d = R.pick([1, 2]); return { a: m, b: m + d, how: level === 3 ? 'staff' : 'piano', down: level === 3 && R.chance(0.3) };
    },
    build: function (p) {
      var a = p.a, b = p.b, d = b - a, kind = d === 1 ? 'halb' : 'ganz';
      var na = T.keyNames(a)[0], nb = T.keyNames(b)[T.isBlack(b) ? 1 : 0];
      if (T.isBlack(b) && na.s === T.keyNames(b)[1].s) nb = T.keyNames(b)[0];      // two different letters (a – b, not a – ais)
      var first = p.down ? b : a, second = p.down ? a : b;
      var n1 = p.down ? nb : na, n2 = p.down ? na : nb;
      var between = []; for (var m = a + 1; m < b; m++) between.push(m);
      var reason = kind === 'halb' ? 'Die Tasten liegen direkt nebeneinander – keine Taste dazwischen. Das ist ein *Halbtonschritt*.'
                                   : 'Zwischen den beiden Tasten liegt noch eine Taste (' + T.keyNames(a + 1).map(nm).join('/') + '). Das ist ein *Ganztonschritt*.';
      var vis = p.how === 'staff' ? { type: 'staff', events: [{ p: T.pos(n1), dur: 2, acc: n1.a ? (n1.a > 0 ? '#' : 'b') : null }, { p: T.pos(n2), dur: 2, acc: n2.a ? (n2.a > 0 ? '#' : 'b') : null }], zoom: 2.4 }
                                  : { type: 'piano', from: Math.max(55, Math.min(a, b) - 3 - (T.isBlack(Math.min(a, b) - 3) ? 1 : 0)), to: Math.min(84, Math.max(a, b) + 3), labels: 'all', hl: [a, b] };
      return { prompt: 'Halbton oder Ganzton?', sub: '*' + nm(n1) + '* – *' + nm(n2) + '*', visual: vis,
        play: [{ label: '🔊 Anhören', notes: [first, second] }],
        answer: { type: 'choice', options: [opt('halb', '∨ Halbtonschritt'), opt('ganz', '⌴ Ganztonschritt')], correct: kind },
        check: function (inp) { return checkChoice(kind, inp, function () { return { err: 'schritt', msg: 'Fast. ' + reason }; }); },
        hints: ['Schau auf die Klaviertastatur.', 'Liegt zwischen den beiden Tasten noch eine andere Taste (weiß oder schwarz)?', 'Zwischen e und f und zwischen h und c liegt keine schwarze Taste.', 'Keine Taste dazwischen = Halbton. Eine Taste dazwischen = Ganzton.'],
        solution: [nm(n1) + ' – ' + nm(n2) + ': ' + reason], reveal: { keys: [a, b], steps: [[a, b, kind]] }, soundSeq: [first, second] };
    }
  });

  // ================================================================ Dur-Tonleiter

  var PATTERN = ['ganz', 'ganz', 'halb', 'ganz', 'ganz', 'ganz', 'halb'];
  reg({ id: 'dur', skill: 'dur', tags: ['leiter'],
    params: function (level, R) { return { v: R.pick(level === 1 ? ['halbwo', 'grundton', 'muster', 'wieviele'] : level === 2 ? ['gaps', 'halbwo', 'welcher'] : ['gaps', 'welcher', 'gaps']), k: R.pick(level === 1 ? ['C'] : level === 2 ? ['C', 'F', 'A', 'Es'] : ['F', 'A', 'Es', 'G', 'D', 'B']), o: R.int(0, 3) }; },
    build: function (p) {
      var K = T.scaleById(p.k), names = K.notes.map(nm), wr = {}, prompt, opts, correct, ans;
      var stepHints = ['Die Dur-Tonleiter hat 8 Töne. Der 1. und der 8. Ton heißen gleich (Grundton).', 'Die meisten Schritte sind Ganztonschritte.', 'Nur zwischen dem 3. und 4. und zwischen dem 7. und 8. Ton liegt ein Halbtonschritt.', 'Muster: Ganz – Ganz – Halb – Ganz – Ganz – Ganz – Halb.'];
      if (p.v === 'gaps') {
        return { prompt: 'Trage die Schritte in der *' + K.title + '*-Tonleiter ein.', sub: 'Tippe zwischen die Töne: ⌴ Ganzton oder ∨ Halbton.',
          visual: { type: 'staff', events: K.notes.map(function (n) { return { p: T.pos(n), dur: 4, acc: n.a ? (n.a > 0 ? '#' : 'b') : null, label: nm(n) }; }), labels: true, spacing: 4.2 },
          play: [{ label: '🔊 Tonleiter anhören', notes: K.notes.map(T.midi) }],
          answer: { type: 'gaps', names: names, value: PATTERN },
          check: function (inp) {
            if (!inp || !inp.list || inp.list.some(function (x) { return !x; })) return { incomplete: true, msg: 'Trage alle 7 Schritte ein.' };
            var bad = []; inp.list.forEach(function (x, i) { if (x !== PATTERN[i]) bad.push(i); });
            if (!bad.length) return { ok: true };
            var i = bad[0];
            return { ok: false, err: 'leiter', msg: 'Schau dir den Schritt *' + names[i] + ' – ' + names[i + 1] + '* an: Das ist ein ' + (PATTERN[i] === 'halb' ? 'Halbtonschritt (keine Taste dazwischen).' : 'Ganztonschritt (eine Taste dazwischen).') + (bad.length > 1 ? ' Noch ' + (bad.length - 1) + ' weitere(r) Schritt(e) stimmt nicht.' : '') };
          },
          hints: stepHints, solution: ['Ganz – Ganz – *Halb* – Ganz – Ganz – Ganz – *Halb*: die Halbtöne liegen zwischen ' + names[2] + '–' + names[3] + ' und ' + names[6] + '–' + names[7] + '.'],
          reveal: { keys: K.notes.map(T.midi) } };
      }
      if (p.v === 'halbwo') { prompt = 'Zwischen welchen Tönen der Dur-Tonleiter liegen die Halbtonschritte?'; opts = [opt('a', 'zwischen dem 3./4. und dem 7./8. Ton'), opt('b', 'zwischen dem 2./3. und dem 6./7. Ton'), opt('c', 'zwischen dem 4./5. und dem 7./8. Ton'), opt('d', 'es gibt keine Halbtonschritte')]; correct = 'a'; }
      else if (p.v === 'grundton') { prompt = 'Wie heißt der tiefste (1.) Ton einer Tonleiter?'; opts = [opt('a', 'Grundton'), opt('b', 'Stammton'), opt('c', 'Halbton'), opt('d', 'Leitton')]; correct = 'a'; wr.b = { err: 'begriff', msg: 'Stammtöne sind c d e f g a h (die weißen Tasten). Der 1. Ton der Tonleiter heißt *Grundton*.' }; }
      else if (p.v === 'muster') { prompt = 'Welches Muster hat die Dur-Tonleiter?'; opts = [opt('a', 'Ganz – Ganz – Halb – Ganz – Ganz – Ganz – Halb'), opt('b', 'Ganz – Halb – Ganz – Ganz – Halb – Ganz – Ganz'), opt('c', 'Halb – Ganz – Ganz – Ganz – Halb – Ganz – Ganz'), opt('d', 'nur Ganztonschritte')]; correct = 'a'; }
      else if (p.v === 'wieviele') { prompt = 'Aus wie vielen *unterschiedlichen* Tönen besteht die Dur-Tonleiter?'; opts = [opt('a', '7 (der 8. heißt wie der 1.)'), opt('b', '8'), opt('c', '5'), opt('d', '12')]; correct = 'a'; wr.b = { err: 'begriff', msg: 'Die Tonleiter hat 8 Töne, aber der 8. heißt wie der 1. – also 7 unterschiedliche.' }; }
      else {   // welcher: which note belongs to the scale
        var alt = K.notes.filter(function (n) { return n.a !== 0 && nm(n) !== nm(K.tonic); })[0] || K.notes[3];
        var plain = N(alt.s, 0, alt.o), other = N(alt.s, alt.a ? -alt.a : 1, alt.o);
        prompt = 'Welcher Ton gehört in die *' + K.title + '*-Tonleiter?'; opts = [opt('a', nm(alt)), opt('b', nm(plain)), opt('c', nm(other))].filter(function (x, i, a) { return a.map(function (y) { return y.label; }).indexOf(x.label) === i; }); correct = 'a';
        var i = K.notes.indexOf(alt), prev = K.notes[i - 1];
        wr.b = wr.c = { err: 'leiter', msg: 'Vom ' + i + '. Ton (' + nm(prev) + ') zum ' + (i + 1) + '. muss ein ' + (PATTERN[i - 1] === 'halb' ? 'Halbtonschritt' : 'Ganztonschritt') + ' liegen. Das passt nur mit *' + nm(alt) + '*.' };
        stepHints = stepHints.slice(0, 2).concat(['Prüfe den Schritt vom ' + nm(prev) + ' aus.', 'Muster: Ganz – Ganz – Halb – Ganz – Ganz – Ganz – Halb.']);
      }
      if (!wr.b) ['b', 'c', 'd'].forEach(function (k) { wr[k] = { err: 'begriff', msg: 'Merke: Ganz – Ganz – *Halb* – Ganz – Ganz – Ganz – *Halb*. Die Halbtonschritte liegen zwischen dem 3./4. und dem 7./8. Ton.' }; });
      ans = rot(opts, p.o);
      return { prompt: prompt, answer: { type: 'choice', options: ans, correct: correct, long: true },
        visual: p.v === 'welcher' ? { type: 'staff', events: K.notes.map(function (n) { return { p: T.pos(n), dur: 4, acc: n.a ? (n.a > 0 ? '#' : 'b') : null }; }), hideAcc: true } : null,
        play: [{ label: '🔊 ' + K.title + ' anhören', notes: K.notes.map(T.midi) }],
        check: function (inp) { return checkChoice(correct, inp, wr); }, hints: stepHints, solution: [label(ans, correct)] };
    }
  });
  function label(opts, id) { for (var i = 0; i < opts.length; i++) if (opts[i].id === id) return 'Richtig ist: *' + opts[i].label + '*'; return ''; }

  reg({ id: 'dur_bauen', skill: 'dur_bauen', tags: ['leiter'],
    params: function (level, R) { return { k: R.pick(level === 1 ? ['C', 'F'] : level === 2 ? ['F', 'A', 'Es'] : ['A', 'Es', 'G', 'D', 'B']) }; },
    build: function (p) {
      var K = T.scaleById(p.k), want = K.notes, need = want.filter(function (n, i) { return i > 0 && i < 7 && n.a; }).length;
      return { prompt: 'Baue die *' + K.title + '*-Tonleiter.', sub: 'Der Grundton steht schon da. Tippe auf eine Note, um ♯ oder ♭ davorzusetzen – bis alle Schritte passen.',
        answer: { type: 'build', tonic: K.tonic, value: want.map(function (n) { return n.a; }) },
        check: function (inp) {
          if (!inp || !inp.accs) return { incomplete: true, msg: 'Setze die Versetzungszeichen.' };
          for (var i = 1; i < 8; i++) {
            var n = want[i], g = inp.accs[i];
            if (g !== n.a) {
              var prev = want[i - 1], cur = N(n.s, g, n.o), d = T.semis(prev, cur), need2 = PATTERN[i - 1];
              return { ok: false, err: 'leiter', msg: 'Schau auf den ' + i + '. Schritt: von *' + nm(prev) + '* zu *' + nm(cur) + '* ist ein ' + (d === 1 ? 'Halbtonschritt' : d === 2 ? 'Ganztonschritt' : (d > 2 ? 'zu großer Schritt' : 'zu kleiner Schritt')) + '. Hier muss aber ein *' + (need2 === 'halb' ? 'Halbtonschritt' : 'Ganztonschritt') + '* liegen' + (n.a !== 0 ? ' – also *' + nm(n) + '*.' : ' – ohne Versetzungszeichen.') };
            }
          }
          return { ok: true };
        },
        hints: ['Das Muster: Ganz – Ganz – Halb – Ganz – Ganz – Ganz – Halb.', 'Prüfe Schritt für Schritt auf der Tastatur: Passt der Abstand?', 'Wenn ein Schritt zu klein ist, erhöhe die obere Note (♯). Ist er zu groß, erniedrige sie (♭).',
                'Die ' + K.title + ' braucht ' + (need === 0 ? 'keine Versetzungszeichen' : need === 1 ? 'ein Versetzungszeichen' : need + ' Versetzungszeichen') + '.'],
        solution: [K.title + ': ' + want.map(nm).join(' – '), 'Ganz – Ganz – Halb – Ganz – Ganz – Ganz – Halb'], reveal: { keys: want.map(T.midi) }, soundSeq: want.map(T.midi) };
    }
  });

  // ================================================================ Versetzungszeichen

  function alterParams(dir) {
    return function (level, R) {
      var ok = []; for (var s = 0; s < 7; s++) { var nn = N(s, dir, 4); var nameOk = level >= 3 || !(dir > 0 ? (s === 2 || s === 6) : (s === 0 || s === 3)); if (nameOk) ok.push(s); }
      return { s: R.pick(ok), typed: level >= 2, v: R.pick(level === 1 ? ['name', 'name', 'was'] : ['name', 'name', 'taste']), o: R.int(0, 3) };
    };
  }
  function alterBuild(dir) {
    return function (p) {
      var base = N(p.s, 0, 4), n = N(p.s, dir, 4), w = nm(n), sign = dir > 0 ? 'Kreuz ♯' : 'b ♭', way = dir > 0 ? 'erhöht' : 'erniedrigt';
      if (p.v === 'was') {
        var opts = rot([opt('a', 'Es ' + way + ' den Stammton um einen Halbton.'), opt('b', 'Es ' + (dir > 0 ? 'erniedrigt' : 'erhöht') + ' den Stammton um einen Halbton.'), opt('c', 'Es ' + way + ' den Stammton um einen Ganzton.'), opt('d', 'Es hebt ein Versetzungszeichen auf.')], p.o);
        return { prompt: 'Was macht ein *' + sign + '*?', answer: { type: 'choice', options: opts, correct: 'a', long: true },
          visual: { type: 'piano', from: 60, to: 67, labels: 'all', hl: [T.midi(base), T.midi(n)] }, play: [{ label: '🔊 ' + nm(base) + ' → ' + w, notes: [T.midi(base), T.midi(n)] }],
          check: function (inp) { return checkChoice('a', inp, { b: { err: 'richtung', msg: dir > 0 ? 'Andersherum: Das Kreuz ♯ *erhöht* (Taste rechts daneben).' : 'Andersherum: Das b ♭ *erniedrigt* (Taste links daneben).' }, c: { err: 'begriff', msg: 'Nur um einen *Halbton* – die direkt benachbarte Taste.' }, d: { err: 'begriff', msg: 'Das macht das Auflösungszeichen ♮.' } }); },
          hints: ['Schau auf die Tastatur: ' + nm(base) + ' und ' + w + '.', 'Liegen die beiden Tasten direkt nebeneinander?', dir > 0 ? 'Kreuz → nach rechts (höher).' : 'b → nach links (tiefer).', 'Direkt nebeneinander = Halbton.'],
          solution: ['Ein ' + sign + ' ' + way + ' den Stammton um einen Halbton: ' + nm(base) + ' → ' + w + '.'], reveal: { keys: [T.midi(base), T.midi(n)] }, soundSeq: [T.midi(base), T.midi(n)] };
      }
      if (p.v === 'taste') {
        return { prompt: 'Spiele das *' + w + '*.', sub: '(' + nm(base) + ' mit ' + sign + ')', answer: { type: 'piano', from: 59, to: 72, labels: 'white', value: T.midi(n) },
          check: function (inp) {
            if (!inp || inp.m == null) return { incomplete: true, msg: 'Tippe auf eine Taste.' };
            if (inp.m % 12 === T.midi(n) % 12) return { ok: true };
            if (inp.m === T.midi(base)) return { ok: false, err: 'vorz_vergessen', msg: 'Das ist das ' + nm(base) + ' ohne Versetzungszeichen. Das ' + sign + ' ' + way + ' um einen Halbton: eine Taste nach ' + (dir > 0 ? 'rechts' : 'links') + '.' };
            if (inp.m === T.midi(base) - dir) return { ok: false, err: 'richtung', msg: 'Falsche Richtung: ' + (dir > 0 ? 'Kreuz = höher = nach rechts.' : 'b = tiefer = nach links.') };
            return { ok: false, err: 'taste', msg: 'Suche zuerst das ' + nm(base) + ', dann eine Taste nach ' + (dir > 0 ? 'rechts' : 'links') + '.' };
          },
          hints: ['Finde zuerst das ' + nm(base) + '.', 'Ein ' + sign + ' ' + way + ' um einen Halbton.', 'Halbton = die direkt benachbarte Taste (schwarz oder weiß).', 'Eine Taste nach ' + (dir > 0 ? 'rechts' : 'links') + '.'],
          solution: [w + ' = ' + nm(base) + ' ' + way + ' um einen Halbton.'], reveal: { keys: [T.midi(n)] }, sound: [T.midi(n)] };
      }
      var choices = rot([w, nm(base), nm(N(p.s, -dir, 4)), T.keyNames(T.midi(n)).map(nm).filter(function (x) { return x !== w; })[0] || nm(N((p.s + dir + 7) % 7, 0, 4))].filter(function (x, i, a) { return x && a.indexOf(x) === i; }).map(function (x) { return opt(x, x); }), p.o);
      return { prompt: 'Wie heißt der Ton?', sub: '*' + nm(base) + '* mit ' + sign, visual: { type: 'staff', events: single(n), zoom: 2.6 },
        answer: p.typed ? { type: 'name', value: w } : { type: 'choice', options: choices, row: true, correct: w },
        check: function (inp) {
          var r = readName(inp); if (!r || !r.raw) return { incomplete: true, msg: 'Schreibe den Tonnamen.' };
          if (r.n && r.n.s === n.s && r.n.a === n.a) return { ok: true };
          return nameFeedback(n, r.n, r.raw) || { ok: false, err: 'endung', msg: 'Nicht ganz. ' + nm(base) + ' mit ' + sign + ' heißt *' + w + '*.' };
        },
        hints: ['Der Stammton ist ' + nm(base) + '.', dir > 0 ? 'Bei einem Kreuz ♯ hängt man *-is* an.' : 'Bei einem b ♭ hängt man *-es* an.', dir > 0 ? 'Beispiele: c → cis, f → fis.' : 'Ausnahmen: e → es, a → as (das e fällt weg), h → b.', dir > 0 ? nm(base) + ' + is = ?' : 'd → des, g → ges … und ' + nm(base) + '?'],
        solution: [nm(base) + ' mit ' + sign + ' heißt *' + w + '*.'], reveal: { keys: [T.midi(n)] }, sound: [T.midi(n)] };
    };
  }
  reg({ id: 'kreuz', skill: 'kreuz', tags: ['vorz', 'short'], params: alterParams(1), build: alterBuild(1) });
  reg({ id: 'bzeichen', skill: 'bzeichen', tags: ['vorz', 'short'], params: alterParams(-1), build: alterBuild(-1) });

  // Name a note written with ♯ or ♭ on the staff (the observed weak spot: "c" written for cis)
  function namedParams(dir) {
    return function (level, R) {
      var cands = [];
      for (var q = -2; q <= 10; q++) { var b = T.fromPos(q); if (!b) continue; var n = N(b.s, dir, b.o); var mm = T.midi(n);
        if (mm >= 57 && mm <= 81 && (level >= 3 || T.isBlack(mm))) cands.push(q); }
      return { p: R.pick(cands), typed: level >= 2 };
    };
  }
  function namedBuild(dir, skill) {
    return function (p) {
      var b = T.fromPos(p.p), n = N(b.s, dir, b.o), w = nm(n);
      return { skill: skill, prompt: 'Wie heißt dieser Ton?', visual: { type: 'staff', events: single(n), zoom: 3 },
        answer: p.typed ? { type: 'name', value: w } : { type: 'choice', options: [w, nm(b), nm(N(b.s, -dir, b.o)), T.keyNames(T.midi(n)).map(nm).filter(function (x) { return x !== w; })[0]].filter(function (x, i, a) { return x && a.indexOf(x) === i; }).sort().map(function (x) { return opt(x, x); }), row: true, correct: w },
        check: function (inp) {
          var r = readName(inp); if (!r || !r.raw) return { incomplete: true, msg: 'Schreibe den Tonnamen.' };
          if (r.n && r.n.s === n.s && r.n.a === n.a) return { ok: true };
          return nameFeedback(n, r.n, r.raw) || readFeedback(n, r.n.s);
        },
        hints: ['Wie heißt der Stammton? ' + readHints(p.p)[1], 'Vor der Note steht ein ' + (dir > 0 ? 'Kreuz ♯.' : 'b ♭.'), dir > 0 ? 'Kreuz: an den Stammton *-is* anhängen.' : 'b: *-es* anhängen (es, as ohne e; h mit b heißt b).', 'Stammton ' + nm(b) + ' → ?'],
        solution: ['Stammton *' + nm(b) + '* mit ' + (dir > 0 ? 'Kreuz' : 'b') + ' → *' + w + '*.'], reveal: { band: p.p, keys: [T.midi(n)] }, sound: [T.midi(n)] };
    };
  }
  reg({ id: 'namen_is', skill: 'namen_is', tags: ['vorz', 'lesen', 'short'], params: namedParams(1), build: namedBuild(1, 'namen_is') });
  reg({ id: 'namen_es', skill: 'namen_es', tags: ['vorz', 'lesen', 'short'], params: namedParams(-1), build: namedBuild(-1, 'namen_es') });

  // Both names of a black key (the worksheet's marked keys); white-key specials at level 3
  reg({ id: 'enharmonisch', skill: 'enharmonisch', tags: ['vorz', 'taste'],
    params: function (level, R) {
      if (level === 3 && R.chance(0.4)) return { special: R.pick(['e', 'f', 'h', 'c']) };
      var m; do { m = R.int(60, 71); } while (!T.isBlack(m)); return { m: m };
    },
    build: function (p) {
      if (p.special) {
        var sp = { e: [64, 'fes', 'f mit b'], f: [65, 'eis', 'e mit Kreuz'], h: [71, 'ces', 'c mit b'], c: [60, 'his', 'h mit Kreuz'] }[p.special];
        var o2 = [sp[1], { fes: 'es', eis: 'fis', ces: 'b', his: 'cis' }[sp[1]], { fes: 'fis', eis: 'es', ces: 'cis', his: 'b' }[sp[1]]].sort().map(function (x) { return opt(x, x); });
        return { skill: 'enharmonisch', prompt: 'Diese weiße Taste ist *' + p.special + '*. Wie kann sie noch heißen?', visual: { type: 'piano', from: 59, to: 72, labels: 'none', dots: [sp[0]] },
          answer: { type: 'choice', options: o2, row: true, correct: sp[1] },
          check: function (inp) { return checkChoice(sp[1], inp, function () { return { err: 'enharm', msg: 'Zwischen e–f und h–c liegt keine schwarze Taste. Deshalb ist ' + sp[2] + ' die weiße Taste ' + p.special + ': *' + sp[1] + '*.' }; }); },
          hints: ['Zwischen e und f (und h und c) gibt es keine schwarze Taste.', 'Ein Kreuz ist immer die nächste Taste rechts, ein b die nächste links – auch wenn sie weiß ist.', 'Welcher Nachbar-Stammton landet mit ♯ oder ♭ auf dieser Taste?', sp[2] + '.'],
          solution: [p.special + ' = *' + sp[1] + '* (' + sp[2] + ').'], reveal: { keys: [sp[0]] }, sound: [sp[0]] };
      }
      var nn = T.keyNames(p.m), up = nm(nn[0]), dn = nm(nn[1]), below = nm(N(nn[0].s, 0, 4)), above = nm(N(nn[1].s, 0, 4));
      var all = ['cis', 'dis', 'fis', 'gis', 'ais'], allb = ['des', 'es', 'ges', 'as', 'b'];
      return { prompt: 'Wie heißt der Ton auf der markierten Taste? Gib *beide* Namen an.', visual: { type: 'piano', from: 60, to: 72, labels: 'white', dots: [p.m] },
        answer: { type: 'two', a: { label: 'mit ♯:', options: all, value: up }, b: { label: 'mit ♭:', options: allb, value: dn } },
        check: function (inp) {
          if (!inp || !inp.a || !inp.b) return { incomplete: true, msg: 'Wähle beide Namen.' };
          if (inp.a === up && inp.b === dn) return { ok: true };
          if (inp.a !== up) return { ok: false, err: 'enharm', msg: 'Mit ♯ kommt man *von unten*: von ' + below + ' einen Halbton höher → *' + up + '*.' };
          return { ok: false, err: 'enharm', msg: 'Mit ♭ kommt man *von oben*: von ' + above + ' einen Halbton tiefer → *' + dn + '*' + (inp.b === 'es' || inp.b === 'as' || inp.b === 'b' ? '' : '') + '. (Du hast ' + inp.b + ' gewählt.)' };
        },
        hints: ['Welche weißen Tasten liegen links und rechts daneben?', 'Links liegt ' + below + ', rechts liegt ' + above + '.', 'Von links (unten) erreicht man die Taste mit ♯, von rechts (oben) mit ♭.', below + ' + ♯ = ?, ' + above + ' + ♭ = ?'],
        solution: ['Von ' + below + ' aus: *' + up + '*. Von ' + above + ' aus: *' + dn + '*. Eine Taste, zwei Namen.'], reveal: { keys: [p.m] }, sound: [p.m] };
    }
  });

  // Auflösungszeichen and "gilt bis zum Taktstrich"
  reg({ id: 'aufloesung', skill: 'aufloesung', tags: ['vorz'],
    params: function (level, R) {
      var v = R.pick(level === 1 ? ['nach_aufl', 'was'] : ['im_takt', 'nach_aufl', 'neuer_takt']);
      var s = R.pick([0, 1, 3, 4, 5, 6]), dir = R.pick([1, -1]);
      if (dir < 0 && (s === 0 || s === 3)) dir = 1;
      return { v: v, s: s, dir: dir, o: R.int(0, 3) };
    },
    build: function (p) {
      var o = p.s >= 3 ? 4 : 5, alt = N(p.s, p.dir, o), plain = N(p.s, 0, o), pAlt = T.pos(alt), acc = p.dir > 0 ? '#' : 'b', sign = p.dir > 0 ? 'Kreuz' : 'b';
      if (p.v === 'was') {
        var ops = rot([opt('a', 'Es hebt ein vorheriges Versetzungszeichen auf.'), opt('b', 'Es erhöht den Ton um einen Halbton.'), opt('c', 'Es erniedrigt den Ton um einen Halbton.'), opt('d', 'Es verlängert die Note.')], p.o);
        return { prompt: 'Was bedeutet das *Auflösungszeichen ♮*?', answer: { type: 'choice', options: ops, correct: 'a', long: true },
          visual: { type: 'staff', events: [{ p: pAlt, dur: 2, acc: acc }, { p: pAlt, dur: 2, acc: 'n' }], zoom: 2.4 },
          play: [{ label: '🔊 ' + nm(alt) + ' → ' + nm(plain), notes: [T.midi(alt), T.midi(plain)] }],
          check: function (inp) { return checkChoice('a', inp, function () { return { err: 'begriff', msg: 'Das ♮ macht ein Versetzungszeichen rückgängig: aus ' + nm(alt) + ' wird wieder ' + nm(plain) + '.' }; }); },
          hints: ['Hör dir beide Töne an.', 'Der erste Ton hat ein ' + sign + '.', 'Der zweite Ton ist wieder der Stammton.', 'Das ♮ löst das Versetzungszeichen auf.'],
          solution: ['♮ hebt das ' + sign + ' auf: ' + nm(alt) + ' → ' + nm(plain) + '.'] };
      }
      var events, ask, want, why, i;
      if (p.v === 'im_takt') { events = [{ p: pAlt, dur: 1, acc: acc }, { p: pAlt - 2, dur: 1 }, { p: pAlt, dur: 1 }, { p: pAlt - 1, dur: 1 }]; i = 2; want = alt; why = 'Ein Versetzungszeichen gilt bis zum *Taktstrich*. Im selben Takt bleibt es also ' + nm(alt) + '.'; }
      else if (p.v === 'nach_aufl') { events = [{ p: pAlt, dur: 1, acc: acc }, { p: pAlt, dur: 1 }, { p: pAlt, dur: 1, acc: 'n' }, { p: pAlt - 1, dur: 1 }]; i = 2; want = plain; why = 'Das Auflösungszeichen ♮ hebt das ' + sign + ' auf: wieder *' + nm(plain) + '*.'; }
      else { events = [{ p: pAlt, dur: 1, acc: acc }, { p: pAlt - 1, dur: 1 }, { p: pAlt, dur: 2 }, { bar: true }, { p: pAlt, dur: 2 }, { p: pAlt - 2, dur: 2 }]; i = 4; want = plain; why = 'Nach dem *Taktstrich* gilt das ' + sign + ' nicht mehr: wieder *' + nm(plain) + '*.'; }
      events[i].cls = 'ask';
      var ops2 = [nm(alt), nm(plain)].map(function (x) { return opt(x, x); });
      return { prompt: 'Wie heißt der *markierte* Ton?', sub: 'Achte auf die Versetzungszeichen und den Taktstrich.',
        visual: { type: 'staff', events: events, time: p.v === 'neuer_takt' ? '4/4' : null, markIdx: i },
        answer: { type: 'choice', options: ops2, row: true, correct: nm(want) },
        check: function (inp) { return checkChoice(nm(want), inp, function () { return { err: p.v === 'nach_aufl' ? 'begriff' : 'takt', msg: why }; }); },
        hints: ['Welches Versetzungszeichen steht vorne im Takt?', 'Versetzungszeichen gelten bis zum nächsten Taktstrich.', 'Ein ♮ hebt sie vorher auf.', p.v === 'im_takt' ? 'Kein Taktstrich, kein ♮ dazwischen …' : p.v === 'nach_aufl' ? 'Vor dem markierten Ton steht ein ♮.' : 'Zwischen den Noten ist ein Taktstrich.'],
        solution: [why], soundSeq: (function () { var res = T.resolveAccidentals(events.filter(function (e) { return !e.bar; }).map(function (e, k) { var nn = T.fromPos(e.p); return { s: nn.s, o: nn.o, acc: e.acc || null, bar: p.v === 'neuer_takt' && k >= 3 ? 1 : 0 }; })); return res.map(function (x) { return T.midi(N(x.s, x.a, x.o)); }); })() };
    }
  });

  root.MB.gens = {
    reg: reg, list: LIST, byId: BY, makeR: makeR, rot: rot, opt: opt, checkChoice: checkChoice, LETTERS: LETTERS, letterOpts: letterOpts,
    readName: readName, nameFeedback: nameFeedback, readFeedback: readFeedback, single: single, PATTERN: PATTERN, label: label,
    make: function (id, level, params, rand, want) {
      var g = BY[id]; if (!g) throw new Error('unknown generator ' + id);
      var lv = Math.max(g.levels[0], Math.min(level || 1, g.levels[g.levels.length - 1]));
      var p = params || g.params(lv, makeR(rand), want);
      var t = g.build(p);
      t.gen = id; t.skill = t.skill || g.skill; t.level = lv; t.params = p; t.tags = g.tags;
      return t;
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
