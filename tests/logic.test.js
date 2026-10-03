// Progress, sessions, coins, adaptivity. Run: node tests/logic.test.js
const load = require('./load');
let pass = 0, fail = 0;
function ok(c, msg, info) { if (c) pass++; else { fail++; console.log('FAIL', msg, info !== undefined ? JSON.stringify(info).slice(0, 300) : ''); } }

function fresh() { const W = load(); return { W, MB: W.MB, pr: new W.MB.Progress('lukas', W.localStorage) }; }
const RIGHT = { firstTry: true, ok: true, tries: 1, hint: 0, secs: 20 };
const WRONG_CORR = { firstTry: false, ok: true, tries: 2, hint: 0, secs: 40, err: 'vorz_vergessen', corrected: true };
const SOL = { firstTry: false, ok: false, tries: 2, hint: 4, solution: true, secs: 60, err: 'lesen' };

// ---- generator map
{
  const { MB } = fresh();
  Object.keys(MB.session.BY_SKILL).forEach(sk => ok(MB.model.skill(sk), 'BY_SKILL key is a skill', sk));
  MB.model.SKILLS.forEach(s => ok(MB.session.BY_SKILL[s.id], 'every skill can be practised', s.id));
  Object.values(MB.session.POOLS).forEach(p => p.forEach(sk => ok(MB.session.BY_SKILL[sk], 'pool skill exists', sk)));
  MB.model.MODULES.forEach(m => m.skills.forEach(sk => ok(MB.model.skill(sk), 'module skill exists', sk)));
  ok(MB.model.SKILLS.every(s => MB.model.MODULES.some(m => m.skills.includes(s.id))), 'every skill belongs to a module');
}

// ---- Heute üben plan
{
  const { MB, pr } = fresh();
  const s = MB.session.create(pr, { mode: 'heute' }); const tasks = [];
  let t; while ((t = s.next())) { tasks.push(t); s.done(t, RIGHT); }
  ok(tasks.length === 11, 'Heute üben = 11 tasks', tasks.length);
  const P = MB.session.POOLS, inP = (t, p) => p.includes(t.skill);
  ok(inP(tasks[0], P.lesen) && inP(tasks[1], P.lesen), 'slots 1–2 Noten lesen', tasks.map(t => t.skill));
  ok(inP(tasks[2], P.klavier) && inP(tasks[3], P.klavier), 'slots 3–4 Tastatur');
  ok(inP(tasks[4], P.tonleitern) && inP(tasks[5], P.tonleitern), 'slots 5–6 Ganz/Halbton & Tonleiter');
  ok(inP(tasks[6], P.rhythmus) && inP(tasks[7], P.rhythmus), 'slots 7–8 Rhythmus');
  ok(['hoeher', 'hoeren_ton'].includes(tasks[8].skill), 'slot 9 Hören');
  ok(inP(tasks[9], P.vorzeichen), 'slot 10 Versetzungszeichen');
  ok(tasks[10].challenge && tasks[10].level >= 2, 'slot 11 challenge, level ≥ 2', tasks[10]);
  const sum = s.finish();
  ok(sum.n === 11 && sum.first === 11, 'summary counts');
  ok(sum.total >= 15 && sum.total <= 25, 'a perfect Heute round ≈ 15–25 coins', sum.total);
  ok(sum.endBonus === 5, 'Heute bonus +5');
}

// ---- area modes, Schnell, Prüfung
{
  const { MB, pr } = fresh();
  ['lesen', 'klavier', 'hoeren', 'rhythmus', 'tonleitern', 'vorzeichen', 'diktat', 'melodie'].forEach(mode => {
    for (let r = 0; r < 15; r++) {
      const s = MB.session.create(pr, { mode }); let t, n = 0;
      while ((t = s.next())) { n++; ok(MB.session.POOLS[mode].includes(t.skill), mode + ': only its skills', t.skill); s.done(t, RIGHT); }
      ok(n === (mode === 'diktat' ? 5 : 10), mode + ' round length', n);
    }
  });
  for (let r = 0; r < 30; r++) {
    const s = MB.session.create(pr, { mode: 'schnell' }); let t, n = 0;
    while ((t = s.next())) { n++; ok(t.tags.includes('short'), 'Schnelltraining: short tasks only', t.gen); s.done(t, RIGHT); }
    ok(n === 10, 'Schnelltraining = 10');
  }
  const s = MB.session.create(pr, { mode: 'pruefung' }); let t, n = 0; const sk = new Set();
  while ((t = s.next())) { n++; sk.add(t.skill); ok(t.level >= 2, 'Prüfung at least level 2', [t.gen, t.level]); s.done(t, RIGHT); }
  ok(n === MB.session.EXAM.length && sk.size >= 15, 'Prüfung: mixed tasks', [...sk]);
}

// ---- mastery needs enough data; level up/down
{
  const { MB, pr } = fresh();
  for (let i = 0; i < 3; i++) pr.record(MB.gens.make('lesen', 1), RIGHT);
  ok(pr.mastery('lesen').key === 'neu', '3 right answers are not enough for "sicher"');
  ok(pr.level('lesen') === 2, '3 right in a row → level 2');
  for (let i = 0; i < 6; i++) pr.record(MB.gens.make('lesen', 2), RIGHT);
  ok(pr.mastery('lesen').key === 'sicher', '9 right incl. level 2 → sicher', pr.mastery('lesen'));
  for (let i = 0; i < 6; i++) pr.record(MB.gens.make('lesen', pr.level('lesen')), SOL);
  ok(pr.mastery('lesen').key === 'uebung' && pr.level('lesen') < 3, 'many solution views → braucht Übung, level goes down');
}

// ---- Fehlertraining: the exact task comes back first
{
  const { MB, pr } = fresh();
  const t = MB.gens.make('namen_is', 2, { p: -2, typed: true });
  pr.record(t, WRONG_CORR);
  const s = MB.session.create(pr, { mode: 'fehler' });
  const t1 = s.next();
  ok(t1.gen === 'namen_is' && t1.answer.value === 'cis' && t1.fromMistake, 'Fehlertraining starts with the exact task');
  const out = s.done(t1, RIGHT);
  ok(out.coins === 2 && pr.doc.wrong.length === 0, 'former mistake solved: +2, removed from list', out);
}

// ---- coins: no farming
{
  const { MB, pr } = fresh();
  const t = MB.gens.make('taste', 1);
  ok(pr.taskCoins(t, RIGHT) === 1 && pr.taskCoins(t, WRONG_CORR) === 2 && pr.taskCoins(t, SOL) === 0, 'coins for effort');
  for (let i = 0; i < 14; i++) pr.record(MB.gens.make('taste', pr.level('taste')), RIGHT);
  ok(pr.mastery('taste').key === 'sicher' && pr.level('taste') === 3, 'taste sicher at level 3');
  ok(pr.taskCoins(MB.gens.make('taste', 1), RIGHT) === 0, 'easy tasks of a mastered skill pay nothing');
  let got = 0; for (let i = 0; i < 200; i++) got += pr.taskCoins(MB.gens.make('ganzhalb', 1), RIGHT);
  ok(got <= MB.progressUtil.DAILY_TASK_CAP, 'daily cap', got);
  const f = fresh(); let mast = 0;
  for (let r = 0; r < 3; r++) { const ss = f.MB.session.create(f.pr, { mode: 'skill', skill: 'kreuz' }); let x; while ((x = ss.next())) { if (ss.done(x, RIGHT).mastered) mast++; } }
  ok(mast === 1, 'mastery bonus only once', mast);
}

// ---- misconceptions
{
  const { MB, pr } = fresh();
  for (let i = 0; i < 4; i++) pr.record(MB.gens.make('mel_lesen', 2), Object.assign({}, WRONG_CORR, { err: 'takt' }));
  ok(pr.misconceptions().length === 0, 'no statements from 4 tasks');
  for (let i = 0; i < 10; i++) pr.record(MB.gens.make('lesen', 1), RIGHT);
  const mc = pr.misconceptions();
  ok(mc.length === 1 && mc[0].err === 'takt' && /Taktstrich/.test(mc[0].text) && /Melodien/.test(mc[0].text), 'Taktstrich rule in melodies recognised', mc);
}

// ---- simulated learner: weak skills come back
{
  const { MB, pr } = fresh();
  const ability = { namen_is: 0.35, enharmonisch: 0.35, dur_bauen: 0.4 };
  const count = {};
  for (let day = 0; day < 14; day++) {
    const s = MB.session.create(pr, { mode: 'heute' }); let t;
    while ((t = s.next())) { count[t.skill] = (count[t.skill] || 0) + 1; const a = Math.min(0.95, (ability[t.skill] || 0.85) + day * 0.04); s.done(t, Math.random() < a ? RIGHT : WRONG_CORR); }
    s.finish();
  }
  const total = Object.values(count).reduce((a, b) => a + b, 0);
  ok(total === 154, '14 days of Heute üben', total);
  ok((count.namen_is || 0) + (count.enharmonisch || 0) + (count.dur_bauen || 0) >= 14, 'weak skills come back often', count);
  ok(MB.model.SKILLS.filter(s => (pr.doc.skills[s.id] || {}).n).length >= 18, 'almost every skill practised', Object.keys(count).length);
}

// ---- countdown
{
  const { pr } = fresh();
  ok(pr.settings().goalDate === '2026-11-04' && pr.settings().goalLabel === 'Musiktest', 'goal: Musiktest on 4 Nov');
}

console.log(`\nlogic: ${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
