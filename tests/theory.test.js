// Music theory: German names, enharmonics, staff positions, scales, accidentals. Run: node tests/theory.test.js
const W = require('./load')(), T = W.MB.theory, R = W.MB.rhythm;
let pass = 0, fail = 0;
function ok(c, m, i) { if (c) pass++; else { fail++; console.log('FAIL', m, i !== undefined ? JSON.stringify(i) : ''); } }
const N = (str) => T.parse(str);

// names
ok(T.name(N("c'")) === 'c' && T.midi(N("c'")) === 60, "c' = MIDI 60");
ok(T.midi(N('a\'')) === 69, "a' = 69 (440 Hz)");
ok(T.midi(N('g')) === 55 && T.midi(N("c'''")) === 84, 'range kleines g … c\'\'\'');
const sharps = { c: 'cis', d: 'dis', e: 'eis', f: 'fis', g: 'gis', a: 'ais', h: 'his' };
const flats = { c: 'ces', d: 'des', e: 'es', f: 'fes', g: 'ges', a: 'as', h: 'b' };
Object.keys(sharps).forEach(st => { const n = N(st + "'"); ok(T.name(T.alter(n, 1)) === sharps[st], 'Kreuz: ' + st + ' → ' + sharps[st]); ok(T.name(T.alter(n, -1)) === flats[st], 'b: ' + st + ' → ' + flats[st]); });
ok(T.parse('hes') === null && T.parse('ees') === null && T.parse('aes') === null && T.parse('bes') === null, 'no wrong names (hes, ees, aes, bes)');
ok(T.fullName(N("fis''")) === "fis''" && T.fullName(N('g')) === 'g' && T.fullName(N("es'")) === "es'", 'octave marks');
// enharmonic: black keys have a Kreuz and a b name
const black = { 61: ['cis', 'des'], 63: ['dis', 'es'], 66: ['fis', 'ges'], 68: ['gis', 'as'], 70: ['ais', 'b'] };
Object.keys(black).forEach(m => { const k = T.keyNames(+m).map(T.name); ok(k.join() === black[m].join(), 'key ' + m + ' = ' + black[m].join('/'), k); });
ok(T.isBlack(66) && !T.isBlack(64) && !T.isBlack(71), 'black/white keys');
ok(T.samePitch(N("fis'"), N("ges'")) && !T.eqSpelling(N("fis'"), N("ges'")), 'fis = ges (same key, other spelling)');
ok(T.samePitch(N("e'"), N("fes'")) && T.samePitch(N("h"), N("ces'")) && T.samePitch(N("his"), N("c'")) && T.samePitch(N("eis'"), N("f'")), 'ces/his/fes/eis on white keys');
// steps
ok(T.stepKind(N("e'"), N("f'")) === 'halb' && T.stepKind(N("h'"), N("c''")) === 'halb' && T.stepKind(N("c'"), N("d'")) === 'ganz' && T.stepKind(N("f'"), N("g'")) === 'ganz', 'e–f and h–c are Halbtöne');
// staff
ok(T.pos(N("e'")) === 0 && T.pos(N("g'")) === 2 && T.pos(N("f''")) === 8 && T.pos(N("c'")) === -2, 'staff positions');
ok(T.where(2) === 'auf der zweiten Linie' && T.where(1) === 'im ersten Zwischenraum' && T.where(-2) === 'auf der ersten Hilfslinie unter dem System', 'where', [T.where(2), T.where(-2)]);
for (let p = -6; p <= 14; p++) ok(T.pos(T.fromPos(p)) === p, 'fromPos/pos round trip ' + p);
// scales
const want = { C: "c d e f g a h c", F: "f g a b c d e f", A: "a h cis d e fis gis a", Es: "es f g as b c d es", G: "g a h c d e fis g", D: "d e fis g a h cis d", B: "b c d es f g a b" };
T.SCALES.forEach(k => { const got = k.notes.map(T.name).join(' '); ok(got === want[k.id], k.title + ': ' + want[k.id], got);
  const st = []; for (let i = 0; i < 7; i++) st.push(T.semis(k.notes[i], k.notes[i + 1])); ok(st.join('') === '2212221', k.title + ' pattern G G H G G G H', st); });
ok(T.SCALES.filter(k => k.core).map(k => k.title).join(',') === 'C-Dur,F-Dur,A-Dur,Es-Dur', 'core scales from the worksheet');
// accidentals last to the bar line, ♮ cancels
const mel = T.resolveAccidentals([{ s: 6, o: 4, acc: 'b', bar: 0 }, { s: 6, o: 4, acc: null, bar: 0 }, { s: 6, o: 4, acc: 'n', bar: 0 }, { s: 6, o: 4, acc: null, bar: 1 }]);
ok(mel.map(x => x.a).join() === '-1,-1,0,0', 'b holds in the bar, ♮ cancels, next bar plain', mel.map(x => x.a));
// rhythm
ok(R.VALUES.V.syl === 'du' && R.VALUES.A.syl === 'du-de' && R.VALUES.H.syl === 'du-a' && R.VALUES.G.syl === 'du-a-a-a', 'rhythm syllables as on the worksheet');
ok(R.onsets(['V', 'A', 'H']).join() === '0,1,1.5,2' && R.beats(['V', 'A', 'H', 'G']) === 8, 'onsets/beats');
ok(R.beatDiff(['V', 'V', 'A', 'V'], ['V', 'A', 'A', 'V']).join() === '1', 'dictation: differing beat found');
ok(R.bars(['V', 'H', 'V', 'A', 'A', 'H'], 4).length === 2 && R.bars(['V', 'V', 'V', 'H'], 4) === null, 'bars');
const tc = R.tapCheck(['V', 'A', 'H'], [10, 10.6, 10.9, 11.2], 100); ok(tc.ok, 'tapping within tolerance', tc);
console.log(`\n${pass} passed, ${fail} failed`); if (fail) process.exit(1);
