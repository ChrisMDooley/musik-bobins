/*
 * progress.js — what Lukas can do, per skill. No DOM. Stored in localStorage['musik-bobins:<child>'].
 *
 * Per skill: attempts, first-try-right, a mastery estimate m (0…1, recent answers count more),
 * a difficulty level 1–3, a spaced-repetition box/due date, hints, corrections, error types.
 * Per task (log): skill, generator, level, first try?, tries, hint level, seconds, error type, corrected?, mode.
 *
 * A task's score: right at once without help = 1 · with 1–2 hints ≈ .6 · with 3–4 hints ≈ .35 ·
 * wrong, then corrected alone = .5 · solution shown = 0.
 */
(function (root) {
  'use strict';
  var M = root.MB.model;
  var DAY = 86400000, MIN = 60000;
  var BOX = [0, 10 * MIN, 20 * 3600000, 2 * DAY, 4 * DAY, 9 * DAY];   // review intervals
  var DEFAULT_GOAL = '2026-11-04';

  function now() { return Date.now(); }
  function dayKey(t) { var d = new Date(t); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function score(r) {
    if (r.solution) return 0;
    if (r.firstTry && !r.hint) return 1;
    if (!r.ok) return 0;
    if (r.hint >= 3) return 0.35;
    if (r.hint >= 1) return 0.6;
    return 0.5;                                     // wrong first, then corrected alone
  }

  function Progress(childId, storage) {
    this.childId = childId;
    this.key = 'musik-bobins:' + childId;
    this.storage = storage || (root.localStorage || null);
    this.doc = this.load();
  }
  var P = Progress.prototype;

  P.blank = function () {
    return { v: 1, created: now(), skills: {}, log: [], wrong: [], modules: {}, sessions: [],
             coins: { log: [], days: {}, mastery: {}, modules: {} },
             settings: { goalDate: DEFAULT_GOAL, goalLabel: 'Musiktest', timer: false, font: '', voice: '', slowRate: 0.8 } };
  };
  P.load = function () {
    var d = null;
    try { d = JSON.parse(this.storage && this.storage.getItem(this.key) || 'null'); } catch (e) { d = null; }
    var b = this.blank();
    if (!d || d.v !== 1) return b;
    for (var k in b) if (!(k in d)) d[k] = b[k];
    for (var s in b.settings) if (!(s in d.settings)) d.settings[s] = b.settings[s];
    for (var c in b.coins) if (!(c in d.coins)) d.coins[c] = b.coins[c];
    return d;
  };
  P.save = function () {
    var d = this.doc;
    if (d.log.length > 2500) d.log = d.log.slice(-2000);
    if (d.coins.log.length > 600) d.coins.log = d.coins.log.slice(-500);
    try { this.storage && this.storage.setItem(this.key, JSON.stringify(d)); } catch (e) { /* storage full / blocked: keep going */ }
  };
  P.settings = function () { return this.doc.settings; };
  P.setSetting = function (k, v) { this.doc.settings[k] = v; this.save(); };
  P.reset = function () { var st = this.doc.settings; this.doc = this.blank(); this.doc.settings = st; this.save(); };

  P.stat = function (id) {
    var s = this.doc.skills[id];
    if (!s) s = this.doc.skills[id] = { n: 0, first: 0, m: 0, level: 1, box: 0, due: 0, last: 0, hints: 0, corrected: 0, errs: {}, streak: 0 };
    return s;
  };

  // r: { firstTry, ok, tries, hint (0–4), solution, secs, err, corrected, mode }
  // returns { score, levelUp, levelDown, mastered (newly 'sicher'), wasWrongItem }
  P.record = function (task, r, t) {
    t = t || now();
    var id = task.skill, s = this.stat(id), sc = score(r), out = { score: sc };
    var before = this.mastery(id);
    s.n++; s.last = t;
    if (r.firstTry && !r.hint) { s.first++; s.streak++; } else s.streak = 0;
    s.m = s.n === 1 ? sc : s.m * 0.7 + sc * 0.3;
    if (r.hint) s.hints++;
    if (r.corrected) s.corrected++;
    if (r.err) s.errs[r.err] = (s.errs[r.err] || 0) + 1;
    // difficulty follows the learner
    if (sc === 1 && s.streak >= 3 && s.m >= 0.75 && s.level < 3 && task.level >= s.level) { s.level++; s.streak = 0; out.levelUp = true; }
    else if (sc < 0.4 && s.m < 0.45 && s.level > 1) { s.level--; out.levelDown = true; }
    // spaced repetition
    if (sc >= 0.99) { if (s.due <= t || s.box < 2) s.box = Math.min(BOX.length - 1, s.box + 1); }
    else if (sc < 0.5) s.box = Math.max(0, s.box - 2);
    s.due = t + BOX[s.box];
    // the learning history
    this.doc.log.push({ ts: t, skill: id, gen: task.gen, level: task.level, ok: !!r.ok, first: !!(r.firstTry && !r.hint), tries: r.tries || 1,
                        hint: r.hint || 0, sol: !!r.solution, secs: Math.round(r.secs || 0), err: r.err || null, corr: !!r.corrected, mode: r.mode || '' });
    // mistakes come back in Fehlertraining (exact task first)
    var key = task.gen + ':' + JSON.stringify(task.params);
    var w = this.doc.wrong, idx = -1;
    for (var i = 0; i < w.length; i++) if (w[i].key === key) idx = i;
    if (!(r.firstTry && !r.hint)) {
      if (idx < 0) w.push({ key: key, gen: task.gen, params: task.params, level: task.level, skill: id, err: r.err || null, ts: t, n: 1 });
      else { w[idx].ts = t; w[idx].n++; }
      if (w.length > 40) w.splice(0, w.length - 40);
    } else if (idx >= 0) { w.splice(idx, 1); out.wasWrongItem = true; }
    var after = this.mastery(id);
    if (after.key === 'sicher' && before.key !== 'sicher' && !this.doc.coins.mastery[id]) out.mastered = true;
    this.save();
    return out;
  };

  // "sicher" needs enough evidence (brief §19: don't overinterpret small amounts of data).
  P.mastery = function (id) {
    var s = this.doc.skills[id];
    if (!s || s.n < 4) return { key: 'neu', label: s && s.n ? 'noch wenig geübt' : 'noch nicht geübt' };
    if (s.m >= 0.85 && s.n >= 8 && s.level >= 2) return { key: 'sicher', label: 'sicher' };
    if (s.m >= 0.65) return { key: 'weitgehend', label: 'weitgehend sicher' };
    return { key: 'uebung', label: 'braucht Übung' };
  };
  P.level = function (id) { return (this.doc.skills[id] || {}).level || 1; };
  P.overview = function () {
    var self = this;
    return M.SKILLS.map(function (sk) { var s = self.doc.skills[sk.id] || { n: 0, m: 0 };
      // bar: mastery, but with little data it stays short (one right answer is not "full")
      return { id: sk.id, label: sk.label, group: sk.group, n: s.n, m: s.m, bar: s.m * Math.min(1, s.n / 8), level: s.level || 1, mastery: self.mastery(sk.id) }; });
  };
  P.due = function (t) { t = t || now(); var d = this.doc.skills, out = []; for (var id in d) if (d[id].n && d[id].due <= t) out.push(id); return out; };

  // How much each skill should be practised now (used by session.js).
  P.weight = function (id, t) {
    t = t || now();
    var s = this.doc.skills[id];
    if (!s || !s.n) return 1.2;                                 // not tried yet
    var w = 0.25 + (1 - s.m) * 2;
    if (s.due <= t) w += 0.8;
    var recentErr = 0; for (var e in s.errs) recentErr += s.errs[e];
    w += Math.min(0.6, recentErr / Math.max(8, s.n) );
    if (this.mastery(id).key === 'sicher') w *= 0.4;
    return w;
  };

  // Recurring misconceptions: only with enough data, recent window.
  P.misconceptions = function () {
    var recent = this.doc.log.slice(-80), counts = {}, ctx = {}, wrongN = 0;
    recent.forEach(function (l) { if (l.err) { wrongN++; counts[l.err] = (counts[l.err] || 0) + 1; (ctx[l.err] = ctx[l.err] || {})[l.skill] = (ctx[l.err][l.skill] || 0) + 1; } });
    if (recent.length < 10) return [];
    var out = [];
    Object.keys(counts).sort(function (a, b) { return counts[b] - counts[a]; }).forEach(function (e) {
      if (counts[e] < 3 || e === 'other') return;
      var E = M.ERRORS[e] || M.ERRORS.other, sentence = E.say, c = ctx[e];
      var mel = (c.mel_lesen || 0) + (c.mel_spielen || 0);
      if ((e === 'vorz_vergessen' || e === 'takt') && mel >= counts[e] / 2) sentence += ' – vor allem beim Lesen von Melodien';
      var often = counts[e] >= 6 ? 'häufig' : 'gelegentlich';
      out.push({ err: e, n: counts[e], text: sentence.replace('gelegentlich', often).replace('manchmal', often) + '.' });
    });
    return out;
  };

  // Numbers for the parent page.
  P.stats = function () {
    var log = this.doc.log, first = 0, corr = 0, hints = 0, sol = 0;
    log.forEach(function (l) { if (l.first) first++; if (l.corr) corr++; if (l.hint) hints++; if (l.sol) sol++; });
    var secs = log.reduce(function (s, l) { return s + Math.min(l.secs || 0, 600); }, 0);     // time on tasks (capped per task: breaks don't count)
    var coins = this.doc.coins.log.reduce(function (s, c) { return s + c.amount; }, 0);
    return { tasks: log.length, firstPct: log.length ? Math.round(first / log.length * 100) : null, corrected: corr, hintTasks: hints, solutions: sol,
             minutes: Math.round(secs / 60), seconds: secs, coins: coins, streak: this.streakDays(), sessions: this.doc.sessions.length };
  };
  P.recent = function (days) {
    var out = [], t = now();
    for (var i = days - 1; i >= 0; i--) {
      var k = dayKey(t - i * DAY), L = this.doc.log.filter(function (l) { return dayKey(l.ts) === k; });
      out.push({ day: k, n: L.length, first: L.filter(function (l) { return l.first; }).length });
    }
    return out;
  };
  P.streakDays = function () {
    var days = {}; this.doc.log.forEach(function (l) { days[dayKey(l.ts)] = 1; });
    var t = now(), n = 0;
    if (!days[dayKey(t)]) t -= DAY;
    while (days[dayKey(t)]) { n++; t -= DAY; }
    return n;
  };
  P.todayCount = function () { var k = dayKey(now()); return this.doc.log.filter(function (l) { return dayKey(l.ts) === k; }).length; };
  P.daysToGoal = function () {
    var g = this.doc.settings.goalDate; if (!g) return null;
    var a = new Date(g + 'T08:00:00'), b = new Date();
    return Math.round((Date.UTC(a.getFullYear(), a.getMonth(), a.getDate()) - Date.UTC(b.getFullYear(), b.getMonth(), b.getDate())) / DAY);
  };
  P.addSession = function (s) { this.doc.sessions.push(s); if (this.doc.sessions.length > 400) this.doc.sessions.shift(); this.save(); };

  // ---------------------------------------------------------------- Robin-Münzen
  // Effort pays (brief §16), but easy tasks of a skill that is already "sicher" stop paying,
  // and per-task coins are capped per day, so tapping through easy tasks cannot farm coins.
  var DAILY_TASK_CAP = 60;
  P.taskCoins = function (task, r) {
    if (!r.ok || r.solution) return 0;
    var s = this.doc.skills[task.skill] || {}, k = dayKey(now()), d = this.doc.coins.days[k] || (this.doc.coins.days[k] = { task: 0 });
    var easy = this.mastery(task.skill).key === 'sicher' && task.level < (s.level || 1);
    if (easy || d.task >= DAILY_TASK_CAP) return 0;
    var n = 1 + (r.corrected ? 1 : 0);                 // +1 for correcting a mistake by yourself
    n = Math.min(n, DAILY_TASK_CAP - d.task);
    d.task += n;
    return n;
  };
  P.logCoins = function (amount, reason) { if (amount > 0) { this.doc.coins.log.push({ ts: now(), amount: amount, reason: reason }); this.save(); } };
  P.claimMastery = function (id) { if (this.doc.coins.mastery[id]) return false; this.doc.coins.mastery[id] = now(); this.save(); return true; };
  P.claimModule = function (id) { if (this.doc.coins.modules[id]) return false; this.doc.coins.modules[id] = now(); this.save(); return true; };
  P.moduleDone = function (id) { return !!this.doc.modules[id]; };
  P.setModuleDone = function (id) { if (!this.doc.modules[id]) { this.doc.modules[id] = now(); this.save(); } };

  root.MB.Progress = Progress;
  root.MB.progressUtil = { dayKey: dayKey, score: score, BOX: BOX, DAILY_TASK_CAP: DAILY_TASK_CAP };
})(typeof window !== 'undefined' ? window : globalThis);
