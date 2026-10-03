// Every generator, every level, many times: well-formed task, right answer accepted, wrong answers rejected
// with an explanation and a known error type, 4 hints, a solution, no broken markup, rebuild from params.
// Run: node tests/gens.test.js [--n=300] [--show]
const load = require('./load');
const W = load(), MB = W.MB, T = MB.theory, RH = MB.rhythm, G = MB.gens;
let pass = 0, fail = 0; const fails = {};
function ok(c, msg, info) { if (c) pass++; else { fail++; fails[msg] = (fails[msg] || 0) + 1; if (fails[msg] <= 3) console.log('FAIL', msg, info !== undefined ? JSON.stringify(info).slice(0, 500) : ''); } }

function keyInput(a) {
  switch (a.type) {
    case 'choice': case 'staffs': return { id: a.correct };
    case 'name': return { text: a.value };
    case 'place': return { p: a.value };
    case 'piano': return { m: a.value };
    case 'two': return { a: a.a.value, b: a.b.value };
    case 'gaps': return { list: a.value.slice() };
    case 'build': return { accs: a.value.slice() };
    case 'rhythm': return { pattern: a.value.slice() };
    case 'tap': return { taps: RH.onsets(a.pattern).map(b => 3 + b * 60 / a.bpm + 0.03) };
    case 'names': return { list: a.value.slice() };
    case 'pickNote': return { i: a.value };
    case 'pianoSeq': return { seq: a.value.slice() };
  }
  throw new Error('no key for ' + a.type);
}
function otherLetter(name) { const n = T.parseName(name.replace(/'+$/, '')); return G.LETTERS[(n.s + 1) % 7]; }
function wrongInput(a) {
  switch (a.type) {
    case 'choice': case 'staffs': return { id: a.options.find(x => x.id !== a.correct).id };
    case 'name': return { text: otherLetter(a.value) + (a.marks ? (a.value.match(/'+$/) || [''])[0] : '') };
    case 'place': return { p: a.value + 1 };
    case 'piano': return { m: a.value + 1 };
    case 'two': return { a: a.a.options.find(x => x !== a.a.value), b: a.b.value };
    case 'gaps': return { list: a.value.map((x, i) => i === 0 ? (x === 'ganz' ? 'halb' : 'ganz') : x) };
    case 'build': return { accs: a.value.map((x, i) => i === 1 ? (x === 0 ? 1 : 0) : x) };
    case 'rhythm': { const p = a.value.slice(), i = p.findIndex(c => c === 'V' || c === 'A'); if (i >= 0) p[i] = p[i] === 'V' ? 'A' : 'V'; else p.splice(0, 1, 'V', 'V'); return { pattern: p }; }
    case 'tap': { const k = keyInput(a); k.taps.pop(); return k; }
    case 'names': return { list: a.value.map((x, i) => i === 0 ? otherLetter(x) : x) };
    case 'pickNote': return { i: (a.value + 1) % a.count };
    case 'pianoSeq': return { seq: a.value.map((m, i) => i === 0 ? m + 1 : m) };
  }
}
function texts(t) {
  const out = [t.prompt, t.sub || ''].concat(t.hints || [], t.solution || []);
  (t.answer.options || []).forEach(o => out.push(o.label || ''));
  (t.play || []).forEach(p => out.push(p.label));
  return out;
}
function markupOK(s) {
  if (/undefined|NaN|null|\[object/.test(s)) return false;
  const c = ch => (s.match(new RegExp('\\' + ch, 'g')) || []).length;
  if (c('[') !== c(']') || c('*') % 2) return false;
  if (/\b(hes|ees|aes|bes)\b/.test(s)) return false;          // never these wrong German names
  return true;
}
function playOK(p) {
  if (p.notes) return p.notes.length && p.notes.every(m => m >= T.LOW && m <= T.HIGH);
  if (p.melody) return p.melody.length && p.melody.every(x => x.m >= T.LOW && x.m <= T.HIGH && x.beats > 0);
  if (p.rhythm) return p.rhythm.length && p.rhythm.every(c => RH.VALUES[c]) && p.bpm > 30;
  return false;
}
function eventsOK(evs) { return Array.isArray(evs) && evs.every(e => e.bar || (Number.isInteger(e.p) && e.p >= -7 && e.p <= 14 && [4, 2, 1, 0.5].includes(e.dur))); }

const N = +(process.argv.find(a => /^--n=/.test(a)) || '--n=300').slice(4);
const show = process.argv.includes('--show');
const seenErr = {};
G.list.forEach(g => {
  g.levels.forEach(level => {
    for (let i = 0; i < N; i++) {
      let t; try { t = G.make(g.id, level); } catch (e) { ok(false, g.id + ' L' + level + ' builds', e.stack); continue; }
      if (show && i < 2) console.log('\n[' + g.id + ' L' + level + '] ' + MB.text.plain(t.prompt) + (t.sub ? ' | ' + MB.text.plain(t.sub) : '') + '\n   Lösung: ' + (t.solution || []).map(MB.text.plain).join(' / '));
      ok(MB.model.skill(t.skill), g.id + ' has a known skill', t.skill);
      ok(t.hints && t.hints.length === 4 && t.hints.every(h => h && h.length > 3), g.id + ' L' + level + ' has 4 hints', t.hints);
      ok(t.solution && t.solution.length > 0 && t.solution.every(Boolean), g.id + ' has a solution', t.solution);
      texts(t).forEach(s => ok(markupOK(String(s)), g.id + ' L' + level + ' text ok', s));
      (t.play || []).forEach(p => ok(playOK(p), g.id + ' L' + level + ' play button valid', p));
      if (t.visual && t.visual.type === 'staff') ok(eventsOK(t.visual.events), g.id + ' staff events valid', t.visual.events);
      if (t.visual && t.visual.type === 'piano') ok(t.visual.from >= T.LOW && t.visual.to <= T.HIGH && t.visual.from < t.visual.to, g.id + ' piano range valid', t.visual);
      if (t.answer.type === 'piano' || t.answer.type === 'pianoSeq') {
        const vals = [].concat(t.answer.value);
        ok(t.answer.from >= T.LOW && t.answer.to <= T.HIGH && vals.every(m => m >= t.answer.from - 1 && m <= t.answer.to + 1), g.id + ' L' + level + ' answer key is on the keyboard', t.answer);
      }
      if (t.answer.type === 'staffs') ok(t.answer.options.length >= 2 && t.answer.options.every(o => eventsOK(o.events)), g.id + ' staff options valid');
      if (t.answer.type === 'rhythm') ok(RH.bars(t.answer.value, t.answer.per) && RH.beats(t.answer.value) === t.answer.per * t.answer.bars, g.id + ' rhythm fills bars', t.answer);
      if (t.sound) ok(t.sound.every(m => m >= T.LOW && m <= T.HIGH), g.id + ' sound in range', t.sound);
      if (t.soundSeq) ok(t.soundSeq.every(m => m >= T.LOW && m <= T.HIGH), g.id + ' soundSeq in range', t.soundSeq);
      const t2 = G.make(g.id, level, JSON.parse(JSON.stringify(t.params)));
      ok(t2.prompt === t.prompt && JSON.stringify(t2.answer.value) === JSON.stringify(t.answer.value) && t2.answer.correct === t.answer.correct, g.id + ' rebuilds from params');
      const r = t.check(keyInput(t.answer)); ok(r.ok === true, g.id + ' L' + level + ' accepts the right answer', { p: t.params, r, k: keyInput(t.answer) });
      const w = t.check(wrongInput(t.answer)); ok(w.ok === false && !!w.msg, g.id + ' L' + level + ' rejects a wrong answer with a message', { p: t.params, w, k: wrongInput(t.answer) });
      if (w.ok === false) { ok(MB.model.ERRORS[w.err], g.id + ' error type known', w.err); ok(markupOK(w.msg), g.id + ' feedback text ok', w.msg); seenErr[g.id + ':' + w.err] = 1; }
      const e = t.check({}); ok(e.incomplete || e.ok === false, g.id + ' empty input is not right');
      ok(MB.text.say(t.prompt).indexOf('*') < 0, g.id + ' speech has no markup');
    }
  });
});

// ---- the observed weak spots get the right explanation
const nis = G.make('namen_is', 2, { p: -2, typed: true });       // c' with ♯ → cis
ok(nis.check({ text: 'cis' }).ok, 'cis accepted');
ok(nis.check({ text: 'c' }).err === 'vorz_vergessen', 'c for cis → Versetzungszeichen vergessen', nis.check({ text: 'c' }));
ok(nis.check({ text: 'des' }).err === 'enharm', 'des for written cis → enharmonic explanation', nis.check({ text: 'des' }));
ok(nis.check({ text: 'ces' }).err === 'richtung', 'ces for cis → Kreuz/b verwechselt');
const nes = G.make('namen_es', 2, { p: 4, typed: true });        // h' with ♭ → b
ok(nes.check({ text: 'b' }).ok, 'h with ♭ = b');
ok(/einfach \*b\*/.test(nes.check({ text: 'hes' }).msg), '"hes" explained', nes.check({ text: 'hes' }));
const en = G.make('enharmonisch', 1, { m: 66 });
ok(en.check({ a: 'fis', b: 'ges' }).ok, 'fis = ges');
ok(en.check({ a: 'fis', b: 'cis' }).ok === false && /von oben/.test(en.check({ a: 'fis', b: 'cis' }).msg), 'fis / cis rejected (the worksheet error)');
const au = G.make('aufloesung', 2, { v: 'neuer_takt', s: 3, dir: 1, o: 0 });
ok(au.answer.correct === 'f' && au.check({ id: 'fis' }).err === 'takt', 'after the bar line the ♯ no longer counts');
const au2 = G.make('aufloesung', 2, { v: 'im_takt', s: 3, dir: 1, o: 0 });
ok(au2.answer.correct === 'fis' && au2.check({ id: 'f' }).err === 'takt', 'in the same bar the ♯ still counts');
const db = G.make('dur_bauen', 2, { k: 'A' });
ok(JSON.stringify(db.answer.value) === '[0,0,1,0,0,1,1,0]', 'A-Dur: cis fis gis', db.answer.value);
ok(db.check({ accs: [0, 0, 0, 0, 0, 1, 1, 0] }).err === 'leiter' && /cis/.test(db.check({ accs: [0, 0, 0, 0, 0, 1, 1, 0] }).msg), 'A-Dur without cis explained');
const dbe = G.make('dur_bauen', 2, { k: 'Es' });
ok(JSON.stringify(dbe.answer.value) === '[-1,0,0,-1,-1,0,0,-1]', 'Es-Dur: es as b', dbe.answer.value);

// ---- melodies
const ent = G.melody('entchen', 'A');
ok(ent.notes.map(x => T.name(x.n)).join(' ') === 'a h cis d e e fis fis fis fis e fis fis fis fis e d d d d cis cis h h h h a', 'Entchen in A-Dur', ent.notes.map(x => T.name(x.n)).join(' '));
ok(RH.beats(['V']) && ent.notes.reduce((s, x) => s + x.beats, 0) === 20, 'Entchen: 5 bars of 4 beats');
ok(ent.events.filter(e => e.bar).length === 4, 'Entchen: 4 bar lines');
// only the first cis / fis of a bar carries the sign
const shown = ent.notes.filter(x => x.n.a).map(x => x.accShown);
ok(shown.join(',') === 'true,true,false,false,false,true,false,false,false,true,false', 'accidentals written once per bar', shown);
ok(G.barStarts('entchen').join(',') === '0,6,11,16,22,27', 'Entchen bar starts', G.barStarts('entchen'));
ok(G.melody('entchen', 'Es').notes.slice(0, 6).map(x => T.name(x.n)).join(' ') === 'es f g as b b', 'Entchen in Es-Dur');
const ml = G.make('mel_lesen', 2, { v: 'name1', id: 'entchen', key: 'A', from: 6, to: 16, i: 1, typed: true, wrong: null });
ok(ml.check({ text: 'fis' }).ok && ml.check({ text: 'f' }).err === 'takt', 'unmarked fis later in the bar: "f" → Taktstrich-Regel', ml.check({ text: 'f' }));
const ms = G.make('mel_spielen', 1, { v: 'spielen', id: 'entchen', key: 'C', from: 0, to: 6 });
ok(ms.check({ seq: [60, 62, 64, 65, 67, 67] }).ok, 'play c d e f g g');
ok(ms.check({ seq: [60, 62, 64, 64, 67, 67] }).at === 3, 'wrong 4th key located');
const mg = G.melody('morgen', 'C');
ok(mg.notes.slice(0, 6).map(x => T.name(x.n)).join(' ') === 'g e d c d e', 'Morgenstimmung begins g e d c d e');

// ---- rhythm
const dk = G.make('diktat', 2, { pat: ['V', 'A', 'H', 'A', 'A', 'V', 'V'], per: 4, bars: 2, codes: ['V', 'A', 'H'], bpm: 80, max: 4 });
ok(dk.check({ pattern: ['V', 'A', 'H', 'A', 'A', 'V', 'V'] }).ok, 'diktat right');
const dw = dk.check({ pattern: ['V', 'A', 'V', 'V', 'A', 'A', 'V', 'V'] });
ok(dw.err === 'wert' && dw.badBeats.join() === '3' && /Schlag 4/.test(dw.msg), 'Halbe vs 2 Viertel → Notenwert, beat 4 of bar 1', dw);
const dr = dk.check({ pattern: ['A', 'A', 'H', 'A', 'A', 'V', 'V'] });
ok(dr.err === 'rhythmus' && dr.badBeats.join() === '0' && dr.compare, 'du-de for du → beat 1, compare available', dr);
const tp = G.make('rh_lesen', 2, { v: 'klopfen', pat: ['V', 'A', 'H'], alts: [], per: 4, bpm: 80, o: 0 });
ok(tp.check({ taps: [0, 0.75, 1.1, 1.5] }).ok, 'tapping on time accepted');
ok(tp.check({ taps: [0, 0.75, 1.5] }).ok === false, 'tapping too few rejected');
ok(G.beatSyl(['H', 'V', 'A'], 1) === 'a' && G.beatSyl(['H', 'V', 'A'], 3) === 'du-de', 'beat syllables');

Object.keys(seenErr).sort();
console.log('\ngens: ' + pass + ' passed, ' + fail + ' failed');
if (fail) { console.log(fails); process.exit(1); }
