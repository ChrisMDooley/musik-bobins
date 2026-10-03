/*
 * session.js — which tasks come next. No DOM.
 *
 *   var s = MB.session.create(progress, { mode, skill, tasks })
 *   modes: heute · skill · lesen · klavier · hoeren · rhythmus · tonleitern · vorzeichen · diktat · melodie ·
 *          schnell · pruefung · fehler · (tasks: given list, e.g. a lesson)
 *   s.next() → task or null · s.done(task, result) → { coins, bonus, levelUp, mastered } · s.finish() → summary
 *
 * Adaptive: skills by need (low mastery, due for review, recent errors); the level per skill follows the
 * learner (progress.js). Heute üben (~10–15 min): 2 Noten lesen, 2 Tastatur, 2 Ganz-/Halbton & Tonleiter,
 * 2 Rhythmus, 1 Hören, 1 Versetzungszeichen, 1 Herausforderung.
 */
(function (root) {
  'use strict';
  var G = root.MB.gens, M = root.MB.model;

  var BY_SKILL = {};
  G.list.forEach(function (g) { (BY_SKILL[g.skill] = BY_SKILL[g.skill] || []).push(g.id); });
  var POOLS = {
    lesen:      ['lesen', 'setzen', 'oktave', 'namen_is', 'namen_es', 'mel_lesen'],
    klavier:    ['taste', 'note_taste', 'taste_name', 'enharmonisch', 'mel_spielen'],
    hoeren:     ['hoeher', 'hoeren_ton', 'rh_hoeren'],
    rhythmus:   ['rh_lesen', 'rh_hoeren', 'diktat'],
    tonleitern: ['ganzhalb', 'dur', 'dur_bauen'],
    vorzeichen: ['kreuz', 'bzeichen', 'aufloesung', 'namen_is', 'namen_es', 'enharmonisch'],
    diktat:     ['diktat'],
    melodie:    ['mel_lesen', 'mel_spielen']
  };
  var SHORT = M.SKILLS.map(function (s) { return s.id; }).filter(function (id) { return (BY_SKILL[id] || []).some(function (g) { return G.byId[g].tags.indexOf('short') >= 0; }); });
  var EXAM = ['lesen', 'lesen', 'setzen', 'oktave', 'taste', 'note_taste', 'ganzhalb', 'dur', 'dur_bauen', 'kreuz', 'namen_is', 'namen_es', 'enharmonisch', 'aufloesung', 'rh_lesen', 'diktat', 'mel_lesen'];

  function create(pr, opts) {
    opts = opts || {};
    var mode = opts.mode || 'skill', rand = opts.rand || Math.random;
    var queue = [], done = [], lastGen = null, coins = 0, bonus = 0, streak = 0, mastered = [], started = Date.now();
    var limit = { heute: 11, schnell: 10, pruefung: EXAM.length, fehler: 8, skill: 8, diktat: 5 }[mode] || 10;

    function weighted(items, wfn) {
      var tot = 0, ws = items.map(function (x) { var w = Math.max(0, wfn(x)); tot += w; return w; });
      if (!tot) return items[Math.floor(rand() * items.length)];
      var r = rand() * tot;
      for (var i = 0; i < items.length; i++) { r -= ws[i]; if (r <= 0) return items[i]; }
      return items[items.length - 1];
    }
    function task(skill, levelShift, minLevel) {
      var gens = BY_SKILL[skill]; if (!gens) return null;
      var alt = gens.filter(function (g) { return g !== lastGen; }), gid = (alt.length ? alt : gens)[Math.floor(rand() * (alt.length || gens.length))];
      var lv = Math.max(minLevel || 1, Math.min(3, pr.level(skill) + (levelShift || 0)));
      var t = G.make(gid, lv, null, rand);
      lastGen = gid;
      return t;
    }
    // pick a skill from a pool by need; avoid the same skill twice in a row when possible
    var lastSkill = null;
    function pick(pool, levelShift) {
      var p = pool.length > 1 ? pool.filter(function (x) { return x !== lastSkill; }) : pool;
      var sk = weighted(p, function (id) { return pr.weight(id); });
      lastSkill = sk;
      return task(sk, levelShift);
    }

    if (mode === 'heute') {
      var due = pr.due().sort(function (a, b) { return pr.weight(b) - pr.weight(a); });
      var plan = [POOLS.lesen, POOLS.lesen, POOLS.klavier, POOLS.klavier, POOLS.tonleitern, POOLS.tonleitern, POOLS.rhythmus, POOLS.rhythmus, ['hoeher', 'hoeren_ton'], POOLS.vorzeichen];
      plan.forEach(function (pool) {
        queue.push(function () {        // a due review from this area first
          var d = due.filter(function (id) { return pool.indexOf(id) >= 0; })[0];
          if (d) { due.splice(due.indexOf(d), 1); lastSkill = d; return task(d); }
          return pick(pool);
        });
      });
      queue.push(function () {          // challenge: a strong skill one level up
        var seen = Object.keys(pr.doc.skills).filter(function (id) { return pr.doc.skills[id].n && BY_SKILL[id]; });
        var strong = seen.sort(function (a, b) { return pr.doc.skills[b].m - pr.doc.skills[a].m; })[0];
        var t = task(strong || 'dur_bauen', 1, 2); if (t) t.challenge = true; return t;
      });
    } else if (mode === 'pruefung') {
      EXAM.forEach(function (sk) { queue.push(function () { lastSkill = sk; return task(sk, 0, 2); }); });
    } else if (opts.tasks) {
      opts.tasks.forEach(function (x) { queue.push(function () { var t = G.make(x.gen, x.level || 1, x.params || null, rand); if (mode === 'fehler') t.fromMistake = true; lastGen = x.gen; return t; }); });
      limit = queue.length;
    } else if (mode === 'fehler') {
      var wrong = pr.doc.wrong.slice().reverse().slice(0, 6);
      wrong.forEach(function (w) { queue.push(function () { var t = G.make(w.gen, w.level, w.params); t.fromMistake = true; lastGen = w.gen; return t; }); });
      for (var i = queue.length; i < Math.min(limit, wrong.length * 2); i++) {
        (function (w) { queue.push(function () { lastGen = w.gen; return G.make(w.gen, w.level, null, rand); }); })(wrong[i % wrong.length]);
      }
      limit = queue.length;
    } else {
      var pool = mode === 'skill' ? [opts.skill] : mode === 'schnell' ? SHORT : POOLS[mode] || M.SKILLS.map(function (s) { return s.id; });
      for (var k = 0; k < limit; k++) queue.push(function () {
        if (mode === 'schnell') { var sk = weighted(SHORT, function (id) { return pr.weight(id); }), gs = BY_SKILL[sk].filter(function (g) { return G.byId[g].tags.indexOf('short') >= 0; }); lastGen = gs[0]; return G.make(gs[Math.floor(rand() * gs.length)], pr.level(sk), null, rand); }
        return pick(pool);
      });
    }

    var s = {
      mode: mode, limit: limit, started: started,
      get count() { return done.length; },
      next: function () {
        if (!queue.length) return null;
        var f = queue.shift(), t = null;
        for (var tries = 0; tries < 5 && !t; tries++) t = f();
        if (!t) return s.next();
        t.no = done.length + 1;
        s.current = t;
        return t;
      },
      // result: { firstTry, ok, tries, hint, solution, secs, err, corrected }
      done: function (t, r) {
        r.mode = mode;
        var rec = pr.record(t, r), out = { levelUp: rec.levelUp, mastered: false, coins: 0, bonus: 0 };
        out.coins = mode === 'pruefung' ? (r.firstTry && !r.hint ? pr.taskCoins(t, r) : 0) : pr.taskCoins(t, r);
        if (t.fromMistake && r.ok && !r.solution && !r.corrected) out.coins += 1;           // a former mistake, now solved
        if (r.firstTry && !r.hint) { streak++; if (streak % 5 === 0) { out.bonus += 1; out.streakBonus = streak; } } else streak = 0;
        if (rec.mastered && pr.claimMastery(t.skill)) { out.bonus += 5; out.mastered = true; mastered.push(t.skill); }
        coins += out.coins; bonus += out.bonus;
        done.push({ t: t, r: r });
        return out;
      },
      finish: function () {
        var n = done.length, first = done.filter(function (d) { return d.r.firstTry && !d.r.hint; }).length, end = 0;
        if (n >= Math.min(5, limit) && mode !== 'lernen') end = { heute: 5, fehler: 4 }[mode] || 3;
        var secs = Math.round((Date.now() - started) / 1000);
        var sum = { mode: mode, n: n, first: first, corrected: done.filter(function (d) { return d.r.corrected; }).length,
                    hints: done.filter(function (d) { return d.r.hint; }).length, coins: coins, bonus: bonus + end, endBonus: end, total: coins + bonus + end,
                    secs: secs, mastered: mastered.slice(), startedAt: started, endedAt: Date.now(), done: done };
        pr.addSession({ mode: mode, n: n, first: first, secs: secs, coins: sum.total, ts: started });
        return sum;
      }
    };
    return s;
  }

  root.MB.session = { create: create, BY_SKILL: BY_SKILL, POOLS: POOLS, SHORT: SHORT, EXAM: EXAM };
})(typeof window !== 'undefined' ? window : globalThis);
