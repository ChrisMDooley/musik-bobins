/*
 * practice.js — runs a round of tasks (any session from session.js).
 *
 * One task: prompt (🔊 read aloud), 🔊 sound buttons, picture, answer widget, [Prüfen] [💡 Hilf mir].
 * After answering: the answer is shown (line/space on the staff, keys on the keyboard, Ganz/Halbton) and heard.
 * Wrong → the likely misconception is explained (never just "falsch"), then try again.
 * Hilf mir → 4 graduated hints, then "Lösung ansehen". After 2 wrong tries the help is offered.
 * Prüfungstraining: no help and no feedback until the end; then "Fehler verbessern".
 */
(function (root) {
  'use strict';
  var MB = root.MB, U = MB.ui, h = U.h, T = MB.text, W = MB.widgets, V = MB.vis, M = MB.model;
  var PRAISE = ['Richtig!', 'Genau!', 'Super!', 'Stimmt!', 'Klasse!', 'Sehr gut!'];

  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function fmt(s) { var m = Math.floor(s / 60), x = s % 60; return m + ':' + (x < 10 ? '0' : '') + x; }

  function run(app, session, opts) {
    opts = opts || {};
    var exam = session.mode === 'pruefung', results = [], timerOn = !!opts.timer, t0 = Date.now(), tick = null;
    var head = h('div', { class: 'run-head' }), count = h('span', { class: 'run-count' }), clock = h('span', { class: 'run-clock', hidden: !timerOn });
    head.appendChild(h('span', { class: 'run-title', text: opts.title || '' })); head.appendChild(count); head.appendChild(clock);
    var body = h('div', { class: 'run-body' });
    var view = h('section', { class: 'run' + (exam ? ' is-exam' : '') }, [head, body]);
    app.setView(view, { back: true, onBack: function () { if (tick) clearInterval(tick); MB.speech.stop(); MB.audio.stop(); } });
    if (timerOn) tick = setInterval(function () { clock.textContent = '⏱️ ' + fmt(Math.round((Date.now() - t0) / 1000)); }, 500);

    function next() {
      MB.speech.stop(); MB.audio.stop();
      var t = session.next();
      if (!t) return end();
      count.textContent = session.limit ? 'Aufgabe ' + Math.min(t.no, session.limit + (t.followUp ? 1 : 0)) + (t.followUp ? '' : ' von ' + session.limit) : '';
      if (t.followUp) count.textContent = 'Warum stimmt das?';
      show(t);
    }

    // ---------------------------------------------------------------- one task
    function show(t) {
      body.innerHTML = '';
      var started = Date.now(), compareLeft = 2, hintLevel = 0, wrongs = 0, firstErr = null, solved = false, solutionShown = false, finished = false;
      var card = h('article', { class: 'task card', 'data-gen': t.gen, 'data-skill': t.skill });
      var promptEl = h('h2', { class: 'prompt', rich: t.prompt });
      var tools = h('div', { class: 'task-tools' }, [U.readButton(function () { return t.prompt + (t.sub ? '. ' + t.sub : ''); })]);
      card.appendChild(h('div', { class: 'task-top' }, [promptEl, tools]));
      if (t.sub) card.appendChild(h('p', { class: 'sub', rich: t.sub }));
      var plays = (t.play || []).filter(function (p) { return !(exam && p.help); });
      if (plays.length) card.appendChild(V.playButtons(plays));
      var pic = t.visual && !W.OWNS_VISUAL[t.answer.type] ? V.render(t.visual) : null;
      if (pic) card.appendChild(pic);
      var hintBox = h('div', { class: 'hints', 'aria-live': 'polite' }), fb = h('div', { class: 'feedback', 'aria-live': 'polite' });
      var area = h('div', { class: 'answer' });
      card.appendChild(area);
      var helpBtn = h('button', { class: 'btn soft help', type: 'button', text: '💡 Hilf mir', onclick: function () { help(); } });
      var solBtn = h('button', { class: 'btn soft', type: 'button', text: 'Lösung ansehen', hidden: true, onclick: function () { showSolution(); } });
      var checkBtn = h('button', { class: 'btn primary check', type: 'button', text: exam ? 'Weiter ›' : 'Prüfen' });
      var actions = h('div', { class: 'row actions' }, [checkBtn, exam ? null : helpBtn, exam ? null : solBtn]);
      card.appendChild(actions); card.appendChild(hintBox); card.appendChild(fb);
      body.appendChild(card);

      // ---- answer: one widget, or several steps one after another
      var steps = t.answer.type === 'steps' ? t.answer.steps : [{ label: null, answer: t.answer, check: t.check }];
      var si = 0, widget = null, stepEls = [];
      function mountStep() {
        var st = steps[si];
        var row = h('div', { class: 'step' + (steps.length > 1 ? ' multi' : '') }, [st.label ? h('p', { class: 'step-label', rich: (steps.length > 1 ? (si + 1) + '. ' : '') + st.label }) : null]);
        widget = W.make(st.answer, function () { checkBtn.click(); }, t);
        row.appendChild(widget); area.appendChild(row); stepEls.push(row);
        var typ = st.answer.type;
        if (typ === 'name' || typ === 'names') setTimeout(function () { try { widget.focus(); } catch (e) { /* ignore */ } }, 60);
      }
      mountStep();
      if (opts.guided) setTimeout(function () { help(); }, 120);     // geführte Aufgabe: the first tip is shown at once

      checkBtn.addEventListener('click', function () {
        if (finished) return;
        var st = steps[si], inp = widget.value(), r = st.check(inp);
        if (r.incomplete) { flash(r.msg); return; }
        if (exam) {                                   // no feedback during the exam
          if (!r.ok && !firstErr) firstErr = r.err || 'other';
          if (!r.ok) wrongs++;
          if (si < steps.length - 1) { widget.lock(); si++; mountStep(); return; }
          return finish(wrongs === 0, null);
        }
        fb.innerHTML = '';
        if (r.ok) {
          widget.lock(); if (widget.markRight) widget.markRight(st.answer.correct);
          if (si < steps.length - 1) {
            stepEls[si].appendChild(h('p', { class: 'step-ok', rich: '✓ ' + (r.note || pick(PRAISE)) }));
            si++; mountStep(); return;
          }
          solved = true;
          return finish(true, r);
        }
        wrongs++; if (!firstErr) firstErr = r.err || 'other';
        if (widget.markWrong) widget.markWrong();
        if (widget.feedback) widget.feedback(r);
        var box = h('div', { class: 'fb-box no' }, [h('p', { class: 'fb-main', rich: r.msg || 'Das stimmt noch nicht.' })]);
        if (r.compare) box.appendChild(h('div', { class: 'row compare' }, [
          h('button', { class: 'btn soft small', type: 'button', text: '▶ Deine Lösung', onclick: function () { V.play({ rhythm: r.compare.got, bpm: r.compare.bpm }); } }),
          compareLeft > 0 ? h('button', { class: 'btn soft small', type: 'button', text: '▶ Diktat zum Vergleich (1×)', onclick: function (e) { e.target.disabled = true; compareLeft--; V.play({ rhythm: r.compare.want, bpm: r.compare.bpm, countIn: true }); } }) : null]));
        if (wrongs >= 2 && hintLevel < 4) box.appendChild(h('p', { class: 'fb-sub', text: 'Tipp: Nimm „💡 Hilf mir“ – Schritt für Schritt.' }));
        box.appendChild(h('p', { class: 'fb-sub', text: 'Versuch es noch einmal.' }));
        fb.appendChild(box);
        if (wrongs >= 2) solBtn.hidden = false;
        helpBtn.classList.toggle('pulse', wrongs >= 2);
        if (st.answer.type === 'choice' || st.answer.type === 'staffs' || st.answer.type === 'piano' || st.answer.type === 'pickNote') setTimeout(function () { widget.clearInput(); }, 900);
      });

      function flash(msg) { fb.innerHTML = ''; fb.appendChild(h('div', { class: 'fb-box info' }, [h('p', { rich: msg })])); }

      function help() {
        if (hintLevel >= 4) return showSolution();
        hintLevel++;
        hintBox.innerHTML = '';
        hintBox.appendChild(U.robinSays(app.robin(hintLevel >= 3 ? 'glasses' : 'thinking', 44), '*Robin-Tipp ' + hintLevel + ':* ' + t.hints[hintLevel - 1], 'hint'));
        helpBtn.textContent = hintLevel >= 4 ? 'Lösung ansehen' : '💡 Noch ein Tipp (' + hintLevel + '/4)';
      }
      function showSolution() {
        if (solutionShown) return;
        solutionShown = true;
        hintBox.innerHTML = ''; fb.innerHTML = '';
        // fill in the remaining steps with the right answers
        for (var k = si; k < steps.length; k++) {
          if (k > si) { si = k; mountStep(); }
          var key = W.keyOf(steps[k].answer); if (key) widget.fill(key);
          widget.lock();
        }
        var sol = h('div', { class: 'fb-box sol' }, [h('p', { class: 'fb-main', text: 'So geht es:' })].concat(t.solution.map(function (l) { return h('p', { class: 'sol-line', rich: l }); })));
        sol.appendChild(h('p', { class: 'fb-sub', text: 'Diese Aufgabe kommt später noch einmal – dann schaffst du sie.' }));
        fb.appendChild(sol);
        finish(false, null);
      }

      function finish(ok, r) {
        if (finished) return; finished = true;
        checkBtn.hidden = true; helpBtn.hidden = true; solBtn.hidden = true;
        var res = { firstTry: wrongs === 0 && !solutionShown, ok: !solutionShown && (exam ? wrongs === 0 : ok), tries: wrongs + 1, hint: hintLevel, solution: solutionShown,
                    secs: (Date.now() - started) / 1000, err: firstErr, corrected: !exam && wrongs > 0 && ok && !solutionShown };
        var out = session.done(t, res);
        results.push({ t: t, r: res, out: out });
        if (exam) return next();
        reveal(t, ok);
        if (ok) {
          var box = h('div', { class: 'fb-box ok' }, [h('p', { class: 'fb-main', rich: (res.corrected ? '✓ Jetzt stimmt es! Gut verbessert.' : (r && r.note) || pick(PRAISE)) })]);
          if (t.solution && (res.corrected || hintLevel)) box.appendChild(h('p', { class: 'sol-line', rich: t.solution[t.solution.length - 1] }));
          if (out.streakBonus) box.appendChild(U.robinSays(app.robin('happy', 40), out.streakBonus + ' hintereinander richtig! +1 Bonus'));
          if (out.levelUp) box.appendChild(U.robinSays(app.robin('celebrating', 40), 'Das klappt richtig gut – ab jetzt wird es etwas kniffliger.'));
          if (out.mastered) box.appendChild(U.robinSays(app.robin('celebrating', 40), '*' + M.skill(t.skill).label + '*: jetzt sicher! +5 Robin-Münzen'));
          fb.appendChild(box);
        }
        var nx = h('button', { class: 'btn primary next', type: 'button', text: 'Weiter ›', onclick: next });
        fb.appendChild(h('div', { class: 'row' }, [nx]));
        var gained = out.coins + out.bonus;
        if (gained && app.coinsOn()) U.coinFloat(fb.querySelector('.fb-box') || nx, gained);
        setTimeout(function () { try { nx.focus({ preventScroll: true }); } catch (e) { nx.focus(); } fb.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }, 60);
        root.__mbTest = function () { return null; };
      }
      // After answering: SEE and HEAR the answer — band on the staff, keys on the keyboard, the sound.
      function reveal(t, ok) {
        var R = t.reveal || {}, stf = pic && pic.staff;
        if (R.band != null && stf) stf.band(R.band, 'reveal');
        if (t.markEv != null) { var tw = widget.querySelector && widget.querySelector('.staff'); if (tw && tw.mark) tw.mark(t.markEv, 'right'); }
        if (R.keys && R.keys.length) {
          var pn = pic && pic.piano ? pic.piano : widget.piano || null;
          if (!pn) {
            var lo = Math.max(55, Math.min.apply(null, R.keys) - 4), hi = Math.min(84, Math.max.apply(null, R.keys) + 4);
            if (hi - lo < 12) hi = Math.min(84, lo + 12);
            var extra = V.render({ type: 'piano', from: lo, to: hi, labels: 'white', steps: !!R.steps, sound: true });
            extra.classList.add('reveal-piano'); fb.appendChild(extra); pn = extra.piano;
          }
          R.keys.forEach(function (m) { pn.mark(m, 'right'); });
          (R.steps || []).forEach(function (s3) { pn.step(s3[0], s3[1], s3[2]); });
        }
        if (t.revealStaff) fb.appendChild(V.render({ type: 'staff', events: t.revealStaff.events, zoom: 2 }));
        var snd = t.soundMel ? { melody: t.soundMel, bpm: 100 } : t.soundRhythm ? { rhythm: t.soundRhythm.pattern, bpm: t.soundRhythm.bpm } : t.soundSeq ? { notes: t.soundSeq } : t.sound ? { notes: t.sound } : null;
        if (snd) {
          if (!t.soundRhythm && !t.soundMel) V.play(snd);
          fb.appendChild(h('div', { class: 'row' }, [h('button', { class: 'btn soft small', type: 'button', text: t.soundRhythm ? '🔊 So klingt es richtig' : t.soundMel ? '🔊 Melodie anhören' : '🔊 Nochmal hören', onclick: function () { V.play(snd); } })]));
        }
      }
      root.__mbTest = function () { return { task: t, step: si, widget: widget, steps: steps.length }; };
    }

    // ---------------------------------------------------------------- end of round
    function end() {
      if (tick) clearInterval(tick);
      root.__mbTest = function () { return null; };
      var sum = session.finish();
      if (timerOn) {
        sum.time = Math.round((Date.now() - t0) / 1000);
        var bestKey = 'best_' + session.mode, best = app.progress.settings()[bestKey];
        if (sum.first === sum.n && (!best || sum.time < best)) { app.progress.setSetting(bestKey, sum.time); sum.newBest = true; }
        sum.best = app.progress.settings()[bestKey];
      }
      app.reward(sum);
      if (opts.after) return opts.after(sum, results);
      body.innerHTML = '';
      count.textContent = '';
      if (exam) return examEnd(sum);
      var good = {}, more = {};
      results.forEach(function (x) { var l = M.skill(x.t.skill).label; if (x.r.firstTry && !x.r.hint) { if (!more[l]) good[l] = 1; } else { more[l] = 1; delete good[l]; } });
      var box = h('div', { class: 'end card' }, [
        h('div', { class: 'end-hero' }, [app.robin(sum.first >= sum.n * 0.7 ? 'celebrating' : 'encouraging', 96), h('div', {}, [
          h('h1', { text: session.mode === 'heute' ? 'Geschafft für heute!' : session.mode === 'fehler' ? 'Fehler verbessert!' : 'Runde geschafft!' }),
          sum.total && app.coinsOn() ? h('p', { class: 'end-coins' }, [U.coin(26), '+' + sum.total + ' Robin-Münzen']) : null,
          sum.time ? h('p', { class: 'note', text: '⏱️ ' + fmt(sum.time) + (sum.newBest ? ' – neue Bestzeit!' : sum.best ? ' · Bestzeit (alles richtig): ' + fmt(sum.best) : '') }) : null])]),
        h('div', { class: 'end-stats' }, [stat(sum.first, 'gleich richtig'), sum.corrected ? stat(sum.corrected, 'selbst verbessert') : null, sum.hints ? stat(sum.hints, 'mit Tipps gelöst') : null]),
        list('Das kannst du schon gut:', Object.keys(good), 'good'),
        list('Das üben wir noch:', Object.keys(more), 'more'),
        h('div', { class: 'row' }, [
          h('button', { class: 'btn primary', type: 'button', text: 'Zum Start', onclick: function () { app.go('home'); } }),
          app.progress.doc.wrong.length && session.mode !== 'fehler' ? h('button', { class: 'btn soft', type: 'button', text: '🎯 Fehlertraining', onclick: function () { app.start('fehler'); } }) : null,
          h('button', { class: 'btn soft', type: 'button', text: 'Noch eine Runde', onclick: function () { app.start(session.mode, opts.again || {}); } })])
      ]);
      body.appendChild(box);
      if (opts.onEnd) opts.onEnd(sum);
    }
    function examEnd(sum) {
      var right = results.filter(function (x) { return x.r.ok; }).length, wrongTasks = results.filter(function (x) { return !x.r.ok; });
      var box = h('div', { class: 'end card exam-end' }, [
        h('div', { class: 'end-hero' }, [app.robin('glasses', 90), h('div', {}, [h('p', { class: 'kicker', text: 'Prüfungstraining' }), h('h1', { class: 'score', text: right + ' von ' + results.length + ' richtig' }),
          sum.total && app.coinsOn() ? h('p', { class: 'end-coins' }, [U.coin(26), '+' + sum.total + ' Robin-Münzen']) : null])]),
        h('ol', { class: 'exam-list' }, results.map(function (x) {
          return h('li', { class: x.r.ok ? 'ok' : 'no' }, [h('span', { class: 'mark', text: x.r.ok ? '✓' : '✗' }), h('span', { rich: T.plain(x.t.prompt).length > 70 ? M.skill(x.t.skill).label : x.t.prompt })]);
        })),
        wrongTasks.length ? h('p', { text: 'Verbessere jetzt deine Fehler – mit Tipps. Dafür gibt es extra Münzen.' }) : h('p', { text: 'Alles richtig – stark!' }),
        h('div', { class: 'row' }, [
          wrongTasks.length ? h('button', { class: 'btn primary', type: 'button', text: '✏️ Fehler verbessern', onclick: function () {
            var s = MB.session.create(app.progress, { mode: 'fehler', tasks: wrongTasks.map(function (x) { return { gen: x.t.gen, level: x.t.level, params: x.t.params }; }) });
            run(app, s, { title: '✏️ Fehler verbessern' });
          } }) : null,
          h('button', { class: 'btn soft', type: 'button', text: 'Zum Start', onclick: function () { app.go('home'); } })])
      ]);
      body.appendChild(box);
    }
    function stat(n, label) { return h('div', { class: 'stat' }, [h('b', { text: String(n) }), h('span', { text: label })]); }
    function list(title, arr, cls) { return arr.length ? h('div', { class: 'res-list ' + cls }, [h('h3', { text: title }), h('ul', {}, arr.slice(0, 6).map(function (x) { return h('li', { text: x }); }))]) : null; }

    next();
  }

  root.MB.practice = { run: run };
})(typeof window !== 'undefined' ? window : globalThis);
