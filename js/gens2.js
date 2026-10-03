/*
 * gens2.js — generators for Hören · Rhythmus · Melodien (uses the registry in gens.js).
 *
 * Extra task fields used here:
 *   play: [{label, notes:[midi]} | {label, melody:[{m,beats}], bpm} | {label, rhythm:[codes], bpm, countIn, max}]
 *   soundMel: [{m,beats}] (after answering) · soundRhythm: {pattern, bpm} (after answering)
 *   answer types: 'staffs' (pick one of several small staves), 'rhythm' (Rhythmus-Baukasten), 'tap' (klopfen),
 *                 'names' (several note names), 'pickNote' (tap a note on the staff), 'pianoSeq' (play a sequence)
 */
(function (root) {
  'use strict';
  var T = root.MB.theory, RH = root.MB.rhythm, Gn = root.MB.gens;
  var reg = Gn.reg, opt = Gn.opt, rot = Gn.rot, checkChoice = Gn.checkChoice, nm = T.name, full = T.fullName;
  function N(s, a, o) { return T.note(s, a, o); }
  function accOf(n) { return n.a ? (n.a > 0 ? '#' : 'b') : null; }

  // ================================================================ melodies (degrees of the Dur-Tonleiter)
  // Each item: [degree (1–8), beats]; 0.5-beat notes come in beamed pairs. Bars are given by `per`.
  var E8 = 0.5;
  var MELODIES = {
    entchen: { title: 'Alle meine Entchen', per: 4, keys: ['C', 'F', 'A', 'Es'],
      tune: [[1, E8], [2, E8], [3, E8], [4, E8], [5, 1], [5, 1],
             [6, E8], [6, E8], [6, E8], [6, E8], [5, 2],
             [6, E8], [6, E8], [6, E8], [6, E8], [5, 2],
             [4, E8], [4, E8], [4, E8], [4, E8], [3, 1], [3, 1],
             [2, E8], [2, E8], [2, E8], [2, E8], [1, 2]],
      text: 'Al-le mei-ne Ent-chen schwim-men auf dem See …' },
    morgen: { title: 'Morgenstimmung (Grieg, Anfang)', per: 3, keys: ['C', 'F', 'G', 'A'], noTime: true,
      tune: [[5, 1], [3, 1], [2, 1], [1, 1], [2, 1], [3, 1],
             [5, 1], [3, 1], [2, 1], [1, 1], [2, 1], [3, 1],
             [5, 1], [3, 1], [5, 1], [6, 1], [3, 1], [6, 1],
             [5, 1], [3, 1], [2, 1], [1, 3]] },
    haenschen: { title: 'Hänschen klein', per: 4, keys: ['C'],
      tune: [[5, 1], [3, 1], [3, 2], [4, 1], [2, 1], [2, 2], [1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [5, 1], [5, 2]] }
  };
  // → { notes: [{n, beats, bar}], events (staff), evIdx: note index → event index, midis, mel: [{m, beats}] }
  // Accidentals are written like on the worksheets: in front of the first altered note of a bar; later ones in
  // the same bar are not marked again (they still count until the bar line).
  function melody(id, key, from, to) {
    var M = MELODIES[id], K = T.scaleById(key), tune = M.tune.slice(from || 0, to == null ? M.tune.length : to);
    var t = 0, startT = 0; for (var q = 0; q < (from || 0); q++) startT += M.tune[q][1];
    t = startT;
    var notes = [], events = [], evIdx = [], seen = {}, lastBar = Math.floor(startT / M.per + 1e-9);
    tune.forEach(function (x, i) {
      var bar = Math.floor(t / M.per + 1e-9);
      if (bar !== lastBar) { if (events.length) events.push({ bar: true }); seen = {}; lastBar = bar; }
      var n = K.notes[x[0] - 1], k = n.o * 7 + n.s, acc = null;
      if (n.a && seen[k] !== n.a) { acc = accOf(n); seen[k] = n.a; }
      notes.push({ n: n, deg: x[0], beats: x[1], bar: bar, accShown: !!acc });
      evIdx.push(events.length);
      events.push({ p: T.pos(n), dur: x[1] === E8 ? 0.5 : x[1] >= 4 ? 4 : x[1] >= 2 ? 2 : 1, beam: x[1] === E8, acc: acc, dot: x[1] === 3 });
      t += x[1];
    });
    return { title: M.title, key: K, per: M.per, time: M.noTime ? null : M.per + '/4', notes: notes, events: events, evIdx: evIdx,
             midis: notes.map(function (x) { return T.midi(x.n); }), mel: notes.map(function (x) { return { m: T.midi(x.n), beats: x.beats }; }) };
  }
  // slice boundaries (note indices) at bar lines: entchen bars → [0,6,11,16,22,27]
  function barStarts(id) {
    var M = MELODIES[id], out = [0], t = 0;
    M.tune.forEach(function (x, i) { t += x[1]; if (Math.abs(t / M.per - Math.round(t / M.per)) < 1e-9 && i < M.tune.length - 1) out.push(i + 1); });
    out.push(M.tune.length); return out;
  }

  // ================================================================ Hören

  reg({ id: 'hoeher', skill: 'hoeher', tags: ['hoeren', 'short'],
    params: function (level, R) {
      var d = level === 1 ? R.int(5, 12) : level === 2 ? R.int(2, 5) : R.int(1, 3);
      var same = level >= 2 && R.chance(0.15), a = R.int(60, 76 - d);
      var up = R.chance(0.5);
      return { a: up ? a : a + d, b: same ? (up ? a : a + d) : (up ? a + d : a), same3: level >= 2 };
    },
    build: function (p) {
      var kind = p.b > p.a ? 'hoeher' : p.b < p.a ? 'tiefer' : 'gleich';
      var opts = [opt('hoeher', '⬆️ höher'), opt('tiefer', '⬇️ tiefer')]; if (p.same3) opts.push(opt('gleich', '➡️ gleich'));
      var d = Math.abs(p.b - p.a), na = nm(T.keyNames(p.a)[0]), nb = nm(T.keyNames(p.b)[0]);
      var expl = kind === 'gleich' ? 'Beide Töne waren gleich hoch (' + na + ').' : 'Der zweite Ton (' + nb + ') war ' + (kind === 'hoeher' ? 'höher' : 'tiefer') + ' als der erste (' + na + ').';
      return { prompt: 'Ist der zweite Ton höher oder tiefer?', sub: 'Hör gut zu – du kannst es mehrmals anhören.',
        play: [{ label: '🔊 Anhören', notes: [p.a, p.b] }, { label: '1. Ton', notes: [p.a], small: true }, { label: '2. Ton', notes: [p.b], small: true }],
        answer: { type: 'choice', options: opts, row: true, correct: kind },
        check: function (inp) { return checkChoice(kind, inp, function () { return { err: 'hoeren', msg: expl }; }); },
        hints: ['Hör dir beide Töne einzeln an.', 'Sing die Töne leise mit: Geht deine Stimme nach oben oder nach unten?', d <= 2 ? 'Die Töne liegen sehr nah beieinander – nur ' + (d === 1 ? 'ein Halbton' : 'ein Ganzton') + '.' : 'Hohe Töne klingen hell (wie ein Vogel), tiefe Töne dunkel (wie ein Bär).', kind === 'gleich' ? 'Vielleicht sind sie gleich?' : 'Stell dir eine Treppe vor: Steigst du hinauf oder hinab?'],
        solution: [expl], reveal: { keys: p.a === p.b ? [p.a] : [p.a, p.b] }, soundSeq: [p.a, p.b] };
    }
  });

  // Tonfolgen hören: contour (L1), which notation was heard (L2, L3)
  var CONTOURS = { auf: 'nach oben ⬆️', ab: 'nach unten ⬇️', aufab: 'erst hoch, dann runter ⤴️', abauf: 'erst runter, dann hoch ⤵️' };
  function shortTune(R, len, maxStep) {
    var out = [R.int(-1, 6)];
    while (out.length < len) { var st = R.int(-maxStep, maxStep), nx = out[out.length - 1] + st; if (st !== 0 && nx >= -2 && nx <= 9) out.push(nx); }
    return out;     // staff positions (white keys, C-Dur)
  }
  reg({ id: 'hoeren_ton', skill: 'hoeren_ton', tags: ['hoeren'],
    params: function (level, R) {
      if (level === 1) {
        var c = R.pick(['auf', 'ab', 'aufab', 'abauf']), s = R.int(0, 3), L = 4, ps = [];
        if (c === 'auf') ps = [s, s + 1, s + 2, s + 4]; else if (c === 'ab') ps = [s + 5, s + 3, s + 2, s];
        else if (c === 'aufab') ps = [s, s + 2, s + 4, s + 1]; else ps = [s + 4, s + 2, s, s + 3];
        return { v: 'kontur', c: c, ps: ps };
      }
      var t = shortTune(R, 4, level === 2 ? 4 : 2), alts = [], tries = 0;
      while (alts.length < 2 && tries++ < 100) {
        var a = t.slice(), i = R.int(1, 3), d = R.pick(level === 2 ? [-3, -2, 2, 3] : [-1, 1, -2, 2]);
        a[i] += d; if (a[i] < -2 || a[i] > 9) continue;
        if (level === 2 && R.chance(0.5)) { var j = i === 3 ? 2 : i + 1; a[j] = a[j] + R.pick([-2, 2]); if (a[j] < -2 || a[j] > 9) continue; }
        var key = a.join(','); if (key === t.join(',') || alts.some(function (x) { return x.join(',') === key; })) continue;
        alts.push(a);
      }
      return { v: 'welche', t: t, alts: alts, o: R.int(0, 2) };
    },
    build: function (p) {
      if (p.v === 'kontur') {
        var ms = p.ps.map(function (q) { return T.midi(T.fromPos(q)); });
        var opts = ['auf', 'ab', 'aufab', 'abauf'].map(function (k) { return opt(k, CONTOURS[k]); });
        return { prompt: 'Wohin geht die Melodie?', sub: 'Hör dir die vier Töne an.',
          play: [{ label: '🔊 Melodie anhören', notes: ms }], answer: { type: 'choice', options: opts, correct: p.c, long: true },
          check: function (inp) { return checkChoice(p.c, inp, function () { return { err: 'hoeren', msg: 'Die Melodie ging ' + CONTOURS[p.c] + '. Schau dir die Noten an: so sieht das auch auf dem Papier aus.' }; }); },
          hints: ['Hör dir die Melodie noch einmal an.', 'Zeig mit der Hand mit: Geht sie nach oben oder nach unten?', 'Achte besonders auf den letzten Ton: Ist er höher oder tiefer als der erste?', 'Hohe Töne stehen auf dem Notenblatt weiter oben.'],
          solution: ['Die Melodie ging ' + CONTOURS[p.c] + '.'], soundSeq: ms,
          revealStaff: { events: p.ps.map(function (q) { return { p: q, dur: 1 }; }) } };
      }
      function ev(ps) { return ps.map(function (q) { return { p: q, dur: 1 }; }); }
      var ms2 = p.t.map(function (q) { return T.midi(T.fromPos(q)); });
      var options = rot([{ id: 'r', events: ev(p.t) }].concat(p.alts.map(function (a, i) { return { id: 'f' + i, events: ev(a) }; })), p.o);
      var names = p.t.map(function (q) { return nm(T.fromPos(q)); }).join(' – ');
      return { prompt: 'Welche Notenzeile hast du gehört?', sub: 'Hör genau hin und lies mit.',
        play: [{ label: '🔊 Anhören', notes: ms2 }],
        answer: { type: 'staffs', options: options, correct: 'r' },
        check: function (inp) {
          if (!inp || !inp.id) return { incomplete: true, msg: 'Wähle eine Notenzeile.' };
          if (inp.id === 'r') return { ok: true };
          var f = p.alts[+inp.id.slice(1)], i = 0; while (i < 4 && f[i] === p.t[i]) i++;
          return { ok: false, err: 'hoeren', msg: 'Am Anfang stimmt es – aber der ' + (i + 1) + '. Ton ist ' + (f[i] > p.t[i] ? 'in deiner Zeile zu hoch' : 'in deiner Zeile zu tief') + '. Gehört hast du: ' + names + '.' };
        },
        hints: ['Hör dir die Melodie an und zeig mit dem Finger auf jede Note.', 'Geht der 2. Ton nach oben oder nach unten?', 'Vergleiche die Zeilen: Wo unterscheiden sie sich?', 'Großer Sprung oder kleiner Schritt? Große Sprünge sieht man auch in den Noten.'],
        solution: ['Gehört hast du: ' + names + '.'], soundSeq: ms2 };
    }
  });

  // ================================================================ Rhythmus

  function rhEvents(pattern, per, opts) {
    opts = opts || {};
    var ev = [], t = 0, q = opts.p == null ? 2 : opts.p;
    pattern.forEach(function (c, i) {
      if (t > 0 && t % per === 0) ev.push({ bar: true });
      var cls = opts.cls && opts.cls[i] ? opts.cls[i] : null;
      if (c === 'A') { ev.push({ p: q, dur: 0.5, beam: true, cls: cls, k: i }); ev.push({ p: q, dur: 0.5, beam: true, cls: cls, k: i }); }
      else ev.push({ p: q, dur: RH.VALUES[c].beats >= 4 ? 4 : RH.VALUES[c].beats, cls: cls, k: i });
      t += RH.VALUES[c].beats;
    });
    return ev;
  }
  function rhStaff(pattern, per, extra) {
    var o = { type: 'staff', events: rhEvents(pattern, per), time: per + '/4', clef: false, rhythm: true, zoom: 2.2, syl: RH.syllables(pattern) };
    for (var k in extra || {}) o[k] = extra[k];
    return o;
  }
  // a similar but different pattern (one value changed), still filling the bars exactly
  function mutate(R, pattern, per, codes) {
    for (var tries = 0; tries < 60; tries++) {
      var a = pattern.slice(), i = R.int(0, a.length - 1), c = a[i], kind = R.int(0, 2);
      if (kind === 0 && (c === 'V' || c === 'A')) a[i] = c === 'V' ? 'A' : 'V';
      else if (kind === 1 && c === 'H' && codes.indexOf('V') >= 0) a.splice(i, 1, 'V', 'V');
      else if (kind === 2 && c === 'V' && a[i + 1] === 'V' && codes.indexOf('H') >= 0 && RH.bars(a.slice(0, i).concat(['H']), per)) a.splice(i, 2, 'H');
      else continue;
      if (!RH.same(a, pattern) && RH.bars(a, per) && RH.beats(a) === RH.beats(pattern)) return a;
    }
    return null;
  }
  // what is heard on beat b ("du", "du-de", "du" / "a" for the 2nd beat of a Halbe)
  function beatSyl(pattern, b) {
    var t = 0;
    for (var i = 0; i < pattern.length; i++) {
      var V = RH.VALUES[pattern[i]];
      if (b >= t && b < t + V.beats) { if (pattern[i] === 'A') return 'du-de'; return b === t ? 'du' : 'a'; }
      t += V.beats;
    }
    return '–';
  }
  // how a beat sounds, in words for the feedback
  var SAY = { 'du': '„du“ (ein neuer Ton)', 'du-de': '„du-de“ (zwei schnelle Töne)', 'a': '„-a“ (der lange Ton klingt weiter)', '–': 'nichts' };
  function beatSay(pattern, b) { return SAY[beatSyl(pattern, b)]; }
  function rhCodes(level) { return level === 1 ? ['V', 'A'] : ['V', 'A', 'H']; }
  var BPM = { 1: 72, 2: 80, 3: 92 };
  var RH_HINTS = ['Sprich die Rhythmussilben leise mit: du, du-de, du-a.', 'Eine Viertelnote = *du* (1 Schlag). Zwei Achtel = *du-de* (1 Schlag). Eine Halbe = *du-a* (2 Schläge).', 'Klopf beim Anhören den Grundschlag mit dem Fuß mit.', 'Ein Takt hat 4 Grundschläge. Zähle mit: 1 – 2 – 3 – 4.'];

  reg({ id: 'rh_lesen', skill: 'rh_lesen', tags: ['rhythmus'],
    params: function (level, R) {
      var v = R.pick(level === 1 ? ['wert', 'silben', 'schlaege'] : level === 2 ? ['silben', 'silben', 'morse', 'klopfen'] : ['silben', 'klopfen', 'klopfen', 'morse']);
      var per = 4, codes = rhCodes(level);
      if (v === 'wert' || v === 'schlaege') return { v: v, c: R.pick(level === 1 ? ['V', 'A', 'H'] : ['V', 'A', 'H', 'G']), o: R.int(0, 3) };
      var pat = RH.randomPattern(R, level === 3 ? 2 : 1, per, codes, 2), alts = [], tries = 0;
      while (alts.length < 2 && tries++ < 50) { var m = mutate(R, pat, per, codes); if (m && !alts.some(function (x) { return RH.same(x, m); })) alts.push(m); }
      return { v: v, pat: pat, alts: alts, per: per, bpm: BPM[level], o: R.int(0, 2) };
    },
    build: function (p) {
      if (p.v === 'wert' || p.v === 'schlaege') {
        var V = RH.VALUES[p.c], vis = rhStaff([p.c], RH.VALUES[p.c].beats, { time: null, syl: null });
        if (p.v === 'wert') {
          var names = rot(['V', 'A', 'H', 'G'].map(function (c) { return opt(c, RH.VALUES[c].name); }), p.o);
          return { prompt: 'Wie heißt dieser Notenwert?', visual: vis, answer: { type: 'choice', options: names, correct: p.c },
            check: function (inp) { return checkChoice(p.c, inp, function (id) { return { err: 'wert', msg: 'Das ist eine *' + V.name + '* (' + V.syl + ', ' + V.beats + (V.beats === 1 ? ' Grundschlag' : ' Grundschläge') + '). ' + RH.VALUES[id].name + ' sieht so aus: ' + RH.VALUES[id].morse }; }); },
            hints: ['Ist der Notenkopf ausgemalt (schwarz) oder leer (weiß)?', 'Hat die Note einen Hals? Gibt es einen Balken?', 'Leerer Kopf mit Hals = Halbe Note. Leerer Kopf ohne Hals = Ganze Note.', 'Schwarzer Kopf mit Hals = Viertelnote. Zwei Noten mit Balken = Doppelachtel.'],
            solution: ['Das ist eine *' + V.name + '*: ' + V.syl + '.'], soundRhythm: { pattern: [p.c], bpm: 72 } };
        }
        var bo = rot([1, 2, 4, 0.5].map(function (b) { return opt(String(b), b === 0.5 ? '½' : String(b)); }), p.o);
        return { prompt: 'Wie viele Grundschläge dauert diese Note?', sub: '*' + V.name + '*', visual: vis, answer: { type: 'choice', options: bo, row: true, correct: String(V.beats) },
          check: function (inp) { return checkChoice(String(V.beats), inp, function () { return { err: 'wert', msg: 'Die ' + V.name + ' dauert *' + V.beats + '* ' + (V.beats === 1 ? 'Grundschlag' : 'Grundschläge') + ' – man spricht ' + V.syl + '.' + (p.c === 'A' ? ' (Die zwei Achtel zusammen = 1 Schlag.)' : '') }; }); },
          hints: ['Sprich die Rhythmussilbe: wie lange klingt sie?', 'Viertelnote: du (1). Halbe: du-a (2).', 'Ganze: du-a-a-a (4). Doppelachtel: du-de – zusammen 1.', 'Zähle die Silben, die zu einem Schlag gehören.'],
          solution: [V.name + ' = ' + V.beats + (V.beats === 1 ? ' Grundschlag' : ' Grundschläge') + ' (' + V.syl + ').'], soundRhythm: { pattern: [p.c], bpm: 72 } };
      }
      var syl = RH.syllables(p.pat);
      if (p.v === 'klopfen') {
        return { prompt: 'Klopfe diesen Rhythmus!', sub: 'Erst kommt ein Vorzähler (4 Klicks). Dann tippe für jede Note einmal auf die Trommel.',
          visual: rhStaff(p.pat, p.per), play: [{ label: '🔊 Vormachen', rhythm: p.pat, bpm: p.bpm, countIn: true, help: true }],
          answer: { type: 'tap', pattern: p.pat, bpm: p.bpm, per: p.per },
          check: function (inp) {
            if (!inp || !inp.taps || !inp.taps.length) return { incomplete: true, msg: 'Tippe den Rhythmus auf die Trommel.' };
            var r = RH.tapCheck(p.pat, inp.taps, p.bpm);
            if (r.ok) return { ok: true };
            if (r.countWrong) return { ok: false, err: 'rhythmus', msg: 'Du hast ' + r.n + '-mal getippt – es sind aber *' + r.want + '* Töne. Sprich mit: ' + syl + '.' };
            return { ok: false, err: 'rhythmus', msg: 'Die Anzahl stimmt! Aber Ton ' + (r.bad[0] + 1) + ' kam nicht im richtigen Moment. Sprich mit: ' + syl + '.' };
          },
          hints: RH_HINTS, solution: ['So klingt es: ' + syl], soundRhythm: { pattern: p.pat, bpm: p.bpm } };
      }
      var all = rot([{ id: 'r', pat: p.pat }].concat(p.alts.map(function (a, i) { return { id: 'f' + i, pat: a }; })), p.o);
      var fmt = p.v === 'morse' ? RH.morse : RH.syllables;
      var opts = all.map(function (x) { return opt(x.id, fmt(x.pat)); });
      return { prompt: p.v === 'morse' ? 'Welche Zeichen passen zu diesem Rhythmus?' : 'Wie spricht man diesen Rhythmus?', sub: p.v === 'morse' ? '— = du · | | = du-de · —|— = du-a' : null,
        visual: rhStaff(p.pat, p.per, { syl: null }), answer: { type: 'choice', options: opts, correct: 'r', long: true, mono: p.v === 'morse' },
        check: function (inp) {
          if (!inp || !inp.id) return { incomplete: true, msg: 'Wähle eine Antwort.' };
          if (inp.id === 'r') return { ok: true };
          var f = all.filter(function (x) { return x.id === inp.id; })[0].pat, b = RH.beatDiff(p.pat, f)[0];
          return { ok: false, err: 'rhythmus', msg: 'Schau auf Schlag ' + (b % p.per + 1) + (p.pat.length > 4 ? ' im ' + (Math.floor(b / p.per) + 1) + '. Takt' : '') + ': dort steht ' + beatSay(p.pat, b) + ', nicht ' + beatSay(f, b) + '.' };
        },
        hints: RH_HINTS, solution: ['Richtig ist: *' + fmt(p.pat) + '*' + (p.v === 'morse' ? ' (' + syl + ')' : '')], soundRhythm: { pattern: p.pat, bpm: p.bpm } };
    }
  });

  reg({ id: 'rh_hoeren', skill: 'rh_hoeren', tags: ['rhythmus', 'hoeren'],
    params: function (level, R) {
      var per = 4, codes = rhCodes(level), pat = RH.randomPattern(R, level === 3 ? 2 : 1, per, codes, 2), alts = [], tries = 0, want = level === 1 ? 1 : 2;
      while (alts.length < want && tries++ < 60) { var m = mutate(R, pat, per, codes); if (m && !alts.some(function (x) { return RH.same(x, m); })) alts.push(m); }
      return { pat: pat, alts: alts, per: per, bpm: BPM[level], o: R.int(0, 2) };
    },
    build: function (p) {
      var all = rot([{ id: 'r', pat: p.pat }].concat(p.alts.map(function (a, i) { return { id: 'f' + i, pat: a }; })), p.o);
      return { prompt: 'Welchen Rhythmus hörst du?', sub: 'Erst kommt ein Vorzähler (4 Klicks).',
        play: [{ label: '🔊 Rhythmus anhören', rhythm: p.pat, bpm: p.bpm, countIn: true }],
        answer: { type: 'staffs', rhythm: true, options: all.map(function (x) { return { id: x.id, events: rhEvents(x.pat, p.per), time: p.per + '/4', clef: false }; }), correct: 'r' },
        check: function (inp) {
          if (!inp || !inp.id) return { incomplete: true, msg: 'Wähle einen Rhythmus.' };
          if (inp.id === 'r') return { ok: true };
          var f = all.filter(function (x) { return x.id === inp.id; })[0].pat, b = RH.beatDiff(p.pat, f)[0];
          return { ok: false, err: 'rhythmus', msg: 'Auf Schlag ' + (b % p.per + 1) + (p.pat.length > 4 ? ' im ' + (Math.floor(b / p.per) + 1) + '. Takt' : '') + ' war ' + beatSay(p.pat, b) + ' zu hören – in deiner Zeile steht ' + beatSay(f, b) + '.' };
        },
        hints: RH_HINTS, solution: ['Gehört: *' + RH.syllables(p.pat) + '*'], soundRhythm: { pattern: p.pat, bpm: p.bpm } };
    }
  });

  // Rhythmusdiktat: hear it (a few times), build it from blocks; on a mistake both versions can be played
  reg({ id: 'diktat', skill: 'diktat', tags: ['rhythmus', 'hoeren'],
    params: function (level, R) {
      var per = 4, nb = level === 1 ? 1 : 2, codes = rhCodes(level);
      return { pat: RH.randomPattern(R, nb, per, codes, level === 3 ? 3 : 1), per: per, bars: nb, codes: codes, bpm: BPM[level], max: level === 3 ? 3 : 4 };
    },
    build: function (p) {
      var syl = RH.syllables(p.pat);
      return { prompt: 'Rhythmusdiktat: Schreib auf, was du hörst.', sub: p.bars + (p.bars === 1 ? ' Takt' : ' Takte') + ' im 4/4-Takt. Du darfst ' + p.max + '-mal anhören.',
        play: [{ label: '🔊 Diktat anhören', rhythm: p.pat, bpm: p.bpm, countIn: true, max: p.max }],
        answer: { type: 'rhythm', per: p.per, bars: p.bars, codes: p.codes, value: p.pat, bpm: p.bpm },
        check: function (inp) {
          if (!inp || !inp.pattern || RH.beats(inp.pattern) !== p.per * p.bars) return { incomplete: true, msg: 'Fülle alle Takte (je 4 Schläge).' };
          if (RH.same(inp.pattern, p.pat)) return { ok: true };
          var bad = RH.beatDiff(p.pat, inp.pattern), b = bad[0];
          var isWert = bad.every(function (x) { var w = beatSyl(p.pat, x), g = beatSyl(inp.pattern, x); return (w === 'a' && g === 'du') || (w === 'du' && g === 'a'); });
          var where = bad.map(function (x) { return (p.bars > 1 ? 'Takt ' + (Math.floor(x / p.per) + 1) + ', ' : '') + 'Schlag ' + (x % p.per + 1); });
          return { ok: false, err: isWert ? 'wert' : 'rhythmus', badBeats: bad, compare: { want: p.pat, got: inp.pattern, bpm: p.bpm },
            msg: 'Fast! ' + (bad.length === 1 ? 'Ein Schlag stimmt' : bad.length + ' Schläge stimmen') + ' noch nicht: ' + where.join(' · ') + '. Dort war ' + beatSay(p.pat, b) + ' zu hören – du hast ' + beatSay(inp.pattern, b) + ' geschrieben.' + (isWert ? ' (Halbe Note oder zwei Viertel? Klingt der Ton weiter oder kommt ein neuer?)' : '') };
        },
        hints: ['Hör dir das ganze Diktat einmal nur an. Klopf den Grundschlag mit.', 'Sprich beim zweiten Hören leise mit: du, du-de oder du-a?', 'Schreib zuerst die Schläge auf, bei denen du sicher bist.', 'Zwei schnelle Töne in einem Schlag = du-de. Ein langer Ton über zwei Schläge = du-a.'],
        solution: ['Richtig: *' + syl + '*'], soundRhythm: { pattern: p.pat, bpm: p.bpm } };
    }
  });

  // ================================================================ Melodien

  var MEL_KEYS = { 1: ['C', 'F'], 2: ['F', 'A', 'C'], 3: ['A', 'Es', 'F'] };
  function pickMel(R, level) {
    var id = level === 1 ? 'entchen' : R.pick(['entchen', 'entchen', 'morgen']);
    var keys = MELODIES[id].keys.filter(function (k) { return MEL_KEYS[level].indexOf(k) >= 0; });
    return { id: id, key: R.pick(keys.length ? keys : MELODIES[id].keys) };
  }
  function nameHints(n, shown, inBar) {
    var p = T.pos(n);
    return ['Wie heißt der Stammton? Die Note liegt ' + T.where(p) + '.', n.a ? (shown ? 'Vor der Note steht ein ' + (n.a > 0 ? 'Kreuz ♯' : 'b ♭') + '.' : 'Schau weiter vorne im *selben Takt*: Steht dort schon ein Versetzungszeichen vor diesem Ton?') : 'Gibt es in diesem Takt vorher ein Versetzungszeichen auf dieser Linie oder in diesem Zwischenraum?',
            'Versetzungszeichen gelten bis zum Taktstrich – auch für spätere Noten auf derselben Stelle.', n.a ? (n.a > 0 ? 'Kreuz → -is anhängen.' : 'b → -es anhängen (es, as, b).') : 'Kein Versetzungszeichen → Stammton.'];
  }
  function nameCheck(n, inp, shown) {
    var r = Gn.readName(inp); if (!r || !r.raw) return { incomplete: true, msg: 'Schreibe den Tonnamen.' };
    if (r.n && r.n.s === n.s && r.n.a === n.a) return { ok: true };
    if (r.n && r.n.s === n.s && r.n.a === 0 && n.a && !shown) return { ok: false, err: 'takt', msg: 'Achtung: Vorne im Takt steht ein ' + (n.a > 0 ? 'Kreuz ♯' : 'b ♭') + ' vor diesem Ton. Es gilt bis zum Taktstrich – also auch hier: *' + nm(n) + '*.' };
    return Gn.nameFeedback(n, r.n, r.raw) || Gn.readFeedback(n, r.n ? r.n.s : 0);
  }

  reg({ id: 'mel_lesen', skill: 'mel_lesen', tags: ['melodie', 'lesen'],
    params: function (level, R) {
      var m = pickMel(R, level), bs = barStarts(m.id), b = R.int(0, Math.min(bs.length - 3, level === 1 ? 1 : 9));
      var v = R.pick(level === 1 ? ['name1', 'name1', 'welches'] : level === 2 ? ['name1', 'names', 'falsch'] : ['names', 'falsch', 'name1']);
      if (v === 'welches') return { v: v, o: R.int(0, 2) };
      var from = bs[Math.max(0, b - (v === 'falsch' ? 0 : 1))], to = bs[Math.min(bs.length - 1, b + 1)];
      if (v === 'falsch' || v === 'names') { from = bs[b]; to = bs[Math.min(bs.length - 1, b + (v === 'falsch' || MELODIES[m.id].per === 3 ? 2 : 1))]; }
      var mel = melody(m.id, m.key, from, to), cand = [];
      mel.notes.forEach(function (x, i) { if (v !== 'name1' || level === 1 || x.n.a || R.chance(0.3)) cand.push(i); });
      var idx = R.pick(cand.length ? cand : [0]);
      var wrong = null;
      if (v === 'falsch') { var d = R.pick(level === 2 ? [-2, 2, 3, -3] : [-1, 1, -2, 2]); wrong = { i: R.int(1, mel.notes.length - 1), d: d }; }
      return { v: v, id: m.id, key: m.key, from: from, to: to, i: idx, typed: level >= 2, wrong: wrong };
    },
    build: function (p) {
      if (p.v === 'welches') {
        var songs = rot([['entchen', 'C'], ['morgen', 'C'], ['haenschen', 'C']].map(function (s) { return opt(s[0], MELODIES[s[0]].title.replace(/ \(.*\)$/, '')); }), p.o), want = songs[0].id;
        var mm = melody(want, 'C', 0, barStarts(want)[2]);
        return { prompt: 'Welches Lied ist das?', sub: 'Hör dir den Anfang an.', play: [{ label: '🔊 Anhören', melody: mm.mel, bpm: want === 'morgen' ? 120 : 100 }],
          answer: { type: 'choice', options: songs, correct: want, long: true },
          check: function (inp) { return checkChoice(want, inp, function () { return { err: 'hoeren', msg: 'Das war der Anfang von *' + songs[0].label + '*. Sing ihn mal mit!' }; }); },
          hints: ['Sing leise mit, was du hörst.', 'Geht es am Anfang Schritt für Schritt nach oben?', 'Alle meine Entchen beginnt mit c d e f g g. Hänschen klein beginnt mit g e e. Die Morgenstimmung beginnt mit g e d c d e.', 'Hör noch einmal und vergleiche.'],
          solution: ['Das war *' + songs[0].label + '*.'], soundMel: mm.mel };
      }
      var mel = melody(p.id, p.key, p.from, p.to), ev = mel.events.map(function (e) { var c = {}; for (var k in e) c[k] = e[k]; return c; });
      var head = mel.title + ' in ' + mel.key.title;
      if (p.v === 'falsch') {
        // the wrong note: another note of the same scale, |d| steps away (never the written one)
        var wd = mel.notes[p.wrong.i].deg + p.wrong.d; if (wd < 1 || wd > 8) wd = mel.notes[p.wrong.i].deg - p.wrong.d;
        var wn = T.midi(mel.key.notes[wd - 1]);
        var heard = mel.mel.map(function (x, i) { return i === p.wrong.i ? { m: wn, beats: x.beats } : x; });
        var wname = nm(mel.key.notes[wd - 1]);
        return { prompt: 'Ein Ton klingt falsch! Welcher?', sub: head + ' – lies mit und tippe auf die Note, die anders klingt.',
          visual: { type: 'staff', events: ev, time: mel.time, pick: true }, play: [{ label: '🔊 Anhören', melody: heard, bpm: 92 }],
          answer: { type: 'pickNote', count: mel.notes.length, evIdx: mel.evIdx, value: p.wrong.i },
          check: function (inp) {
            if (!inp || inp.i == null) return { incomplete: true, msg: 'Tippe auf eine Note.' };
            if (inp.i === p.wrong.i) return { ok: true, note: 'Gespielt wurde ' + wname + ' statt ' + nm(mel.notes[p.wrong.i].n) + '.' };
            return { ok: false, err: 'hoeren', msg: 'Diese Note wurde richtig gespielt. Der falsche Ton war der ' + (p.wrong.i + 1) + '. – dort klang ' + (wn > mel.midis[p.wrong.i] ? 'ein höherer' : 'ein tieferer') + ' Ton.' };
          },
          hints: ['Zeig beim Anhören mit dem Finger auf jede Note.', 'Sing die Melodie leise mit. Wo stolperst du?', 'Der falsche Ton ist ' + (p.wrong.i < mel.notes.length / 2 ? 'in der ersten Hälfte.' : 'in der zweiten Hälfte.'), 'Geht die Melodie an einer Stelle anders nach oben oder unten als die Noten?'],
          solution: ['Der ' + (p.wrong.i + 1) + '. Ton war falsch: gespielt ' + wname + ', geschrieben ' + nm(mel.notes[p.wrong.i].n) + '.'], soundMel: mel.mel, markEv: mel.evIdx[p.wrong.i] };
      }
      if (p.v === 'names') {
        var want = mel.notes.map(function (x) { return nm(x.n); });
        mel.evIdx.forEach(function (k) { ev[k].cls = 'ask'; });
        return { prompt: 'Schreibe die Tonnamen unter die Noten.', sub: head + '. Achte auf die Versetzungszeichen – sie gelten bis zum Taktstrich!',
          visual: { type: 'staff', events: ev, time: mel.time, labels: true }, play: [{ label: '🔊 Anhören', melody: mel.mel, bpm: 92 }],
          answer: { type: 'names', count: want.length, value: want, evIdx: mel.evIdx },
          check: function (inp) {
            if (!inp || !inp.list || inp.list.some(function (x) { return !x; })) return { incomplete: true, msg: 'Schreibe unter jede Note einen Namen.' };
            var bad = [], first = null;
            inp.list.forEach(function (x, i) { var r = nameCheck(mel.notes[i].n, { text: x }, mel.notes[i].accShown); if (!r.ok) { bad.push(i); if (!first) first = r; } });
            if (!bad.length) return { ok: true };
            return { ok: false, err: first.err, bad: bad, msg: (bad.length === 1 ? 'Ein Name stimmt noch nicht (Note ' + (bad[0] + 1) + '). ' : bad.length + ' Namen stimmen noch nicht (Note ' + bad.map(function (b) { return b + 1; }).join(', ') + '). ') + first.msg };
          },
          hints: ['Fang mit der ersten Note an: Linie oder Zwischenraum?', 'Melodien gehen oft in Schritten: Der nächste Ton ist meist der Nachbar.', 'Versetzungszeichen gelten bis zum Taktstrich – auch für spätere Noten auf derselben Stelle.', 'Die ' + mel.key.title + ' hat die Töne: ' + mel.key.notes.slice(0, 7).map(nm).join(' ') + '.'],
          solution: ['Richtig: ' + want.join(' – ')], soundMel: mel.mel };
      }
      var x = mel.notes[p.i], n = x.n, k = mel.evIdx[p.i]; ev[k].cls = 'ask';
      var w = nm(n), choices = [w, nm(N(n.s, 0, n.o)), nm(T.fromPos(T.pos(n) + 1, n.a)), nm(T.fromPos(T.pos(n) - 1, n.a))].filter(function (y, i, a) { return y && a.indexOf(y) === i; }).sort().map(function (y) { return opt(y, y); });
      return { prompt: 'Wie heißt die *markierte* Note?', sub: head,
        visual: { type: 'staff', events: ev, time: mel.time, markIdx: k }, play: [{ label: '🔊 Melodie anhören', melody: mel.mel, bpm: 92 }],
        answer: p.typed ? { type: 'name', value: w } : { type: 'choice', options: choices, row: true, correct: w },
        check: function (inp) { return nameCheck(n, inp, x.accShown); },
        hints: nameHints(n, x.accShown), solution: ['Die Note heißt *' + w + '*' + (n.a && !x.accShown ? ' – das ' + (n.a > 0 ? 'Kreuz' : 'b') + ' vorne im Takt gilt bis zum Taktstrich.' : '.')],
        reveal: { band: T.pos(n), keys: [T.midi(n)] }, sound: [T.midi(n)] };
    }
  });

  // Melodie spielen (on the piano) and Fingersatz
  var FINGERS = ['Daumen', 'Zeigefinger', 'Mittelfinger', 'Ringfinger', 'kleiner Finger'];
  reg({ id: 'mel_spielen', skill: 'mel_spielen', tags: ['melodie', 'taste'],
    params: function (level, R) {
      var v = R.pick(level === 1 ? ['spielen', 'finger', 'fingername'] : ['spielen', 'spielen', 'finger']);
      if (v === 'fingername') return { v: v, f: R.int(1, 5), o: R.int(0, 3) };
      if (v === 'finger') return { v: v, key: R.pick(MEL_KEYS[level]), deg: R.int(2, 5), o: R.int(0, 3) };
      var m = pickMel(R, level), bs = barStarts(m.id), b = R.int(0, bs.length - (level === 3 ? 3 : 2));
      return { v: v, id: m.id, key: m.key, from: bs[b], to: bs[Math.min(bs.length - 1, b + (level === 3 ? 2 : 1))] };
    },
    build: function (p) {
      if (p.v === 'fingername') {
        var fo = rot(FINGERS.map(function (f, i) { return opt(String(i + 1), f); }), p.o);
        return { prompt: 'Welcher Finger hat die Nummer *' + p.f + '*?', sub: 'Fingersatz beim Klavierspielen (rechte Hand).', answer: { type: 'choice', options: fo, correct: String(p.f), long: true },
          check: function (inp) { return checkChoice(String(p.f), inp, function () { return { err: 'begriff', msg: 'Man zählt vom Daumen aus: Daumen 1, Zeigefinger 2, Mittelfinger 3, Ringfinger 4, kleiner Finger 5. Also: *' + FINGERS[p.f - 1] + '*.' }; }); },
          hints: ['Halte deine rechte Hand hoch.', 'Der Daumen ist Finger 1.', 'Zähle weiter: Zeigefinger 2, Mittelfinger 3 …', 'Der kleine Finger ist Finger 5.'],
          solution: ['Finger ' + p.f + ' = *' + FINGERS[p.f - 1] + '*.'] };
      }
      if (p.v === 'finger') {
        var K = T.scaleById(p.key), n = K.notes[p.deg - 1], t0 = K.notes[0];
        var fo2 = rot([1, 2, 3, 4, 5].map(function (f) { return opt(String(f), f + ' – ' + FINGERS[f - 1]); }), p.o);
        return { prompt: 'Der Daumen (1) liegt auf dem *' + nm(t0) + '*. Mit welchem Finger spielst du das *' + nm(n) + '*?', sub: 'Jeder Finger hat seine eigene Taste: ' + K.notes.slice(0, 5).map(nm).join(' – ') + '.',
          visual: { type: 'piano', from: Math.max(55, T.midi(t0) - 2), to: Math.min(84, T.midi(K.notes[4]) + 2), labels: 'all', dots: [T.midi(t0)] },
          answer: { type: 'choice', options: fo2, correct: String(p.deg), long: true },
          check: function (inp) { return checkChoice(String(p.deg), inp, function () { return { err: 'taste', msg: 'Daumen auf ' + nm(t0) + ', dann Finger für Finger: ' + K.notes.slice(0, 5).map(function (x, i) { return nm(x) + ' = ' + (i + 1); }).join(', ') + '. Also Finger *' + p.deg + '*.' }; }); },
          hints: ['Leg in Gedanken jeden Finger auf eine Taste der Tonleiter.', 'Daumen = 1 auf ' + nm(t0) + '.', 'Zeigefinger = 2 auf ' + nm(K.notes[1]) + '.', 'Zähle die Töne der Tonleiter von ' + nm(t0) + ' bis ' + nm(n) + '.'],
          solution: [K.notes.slice(0, 5).map(function (x, i) { return nm(x) + ' = ' + (i + 1); }).join(' · ')], reveal: { keys: [T.midi(n)] }, sound: [T.midi(n)] };
      }
      var mel = melody(p.id, p.key, p.from, p.to), lo = Math.min.apply(null, mel.midis), hi = Math.max.apply(null, mel.midis);
      lo = Math.max(55, lo - 3); hi = Math.min(84, Math.max(hi + 3, lo + 12));
      var names = mel.notes.map(function (x) { return nm(x.n); });
      return { prompt: 'Spiele die Melodie auf der Tastatur.', sub: mel.title + ' in ' + mel.key.title + ' – Ton für Ton.',
        visual: { type: 'staff', events: mel.events, time: mel.time, follow: true },
        play: [{ label: '🔊 Vorspielen', melody: mel.mel, bpm: 92, help: true }],
        answer: { type: 'pianoSeq', from: lo, to: hi, labels: 'none', value: mel.midis, evIdx: mel.evIdx },
        check: function (inp) {
          if (!inp || !inp.seq || inp.seq.length < mel.midis.length) return { incomplete: true, msg: 'Spiele alle ' + mel.midis.length + ' Töne.' };
          for (var i = 0; i < mel.midis.length; i++) if (inp.seq[i] !== mel.midis[i]) {
            var x = mel.notes[i].n, got = inp.seq[i];
            var err = got % 12 === T.midi(N(x.s, 0, x.o)) % 12 && x.a ? (mel.notes[i].accShown ? 'vorz_vergessen' : 'takt') : got % 12 === mel.midis[i] % 12 ? 'oktave' : 'taste';
            return { ok: false, err: err, at: i, msg: 'Ton ' + (i + 1) + ' war ' + T.keyNames(got).map(nm).join('/') + ' – gesucht ist *' + nm(x) + '*.' + (err === 'takt' ? ' Das Versetzungszeichen vorne im Takt gilt auch hier!' : err === 'vorz_vergessen' ? ' Achte auf das Versetzungszeichen.' : '') };
          }
          return { ok: true };
        },
        hints: ['Lies zuerst alle Tonnamen.', 'Die ' + mel.key.title + ' hat: ' + mel.key.notes.slice(0, 7).map(nm).join(' ') + '.', 'Versetzungszeichen gelten bis zum Taktstrich.', 'Die Töne: ' + names.slice(0, Math.ceil(names.length / 2)).join(' ') + ' …'],
        solution: ['Die Töne: ' + names.join(' – ')], soundMel: mel.mel };
    }
  });

  root.MB.gens.MELODIES = MELODIES;
  root.MB.gens.melody = melody;
  root.MB.gens.barStarts = barStarts;
  root.MB.gens.rhEvents = rhEvents;
  root.MB.gens.beatSyl = beatSyl;
})(typeof window !== 'undefined' ? window : globalThis);
