/*
 * screens.js — home, Lernen, Üben (areas & skills), Schnelltraining, Klavier-Entdecker, Melodien (Entchen),
 * Eltern. The practice runner is practice.js, the lessons lessons.js.
 */
(function (root) {
  'use strict';
  var MB = root.MB, U = MB.ui, h = U.h, T = MB.theory, M = MB.model, V = MB.vis, A = MB.audio, G = MB.gens;

  var AREAS = [
    { id: 'lesen',      icon: '🎼', title: 'Noten lesen',       sub: 'Linien, Zwischenräume, Hilfslinien' },
    { id: 'klavier',    icon: '🎹', title: 'Klavier',           sub: 'Tasten finden und benennen' },
    { id: 'hoeren',     icon: '👂', title: 'Hörtraining',       sub: 'höher, tiefer, welche Melodie?' },
    { id: 'rhythmus',   icon: '🥁', title: 'Rhythmus',          sub: 'du · du-de · du-a' },
    { id: 'tonleitern', icon: '🎶', title: 'Tonleitern',        sub: 'Ganzton, Halbton, Dur' },
    { id: 'vorzeichen', icon: '♯', title: 'Versetzungszeichen', sub: '♯ ♭ ♮ und zwei Namen' },
    { id: 'melodie',    icon: '🐤', title: 'Melodien',          sub: 'Entchen, Morgenstimmung' }
  ];
  var MODES = [
    { id: 'ueben',    icon: '🔁', title: 'Üben',              sub: 'Thema wählen' },
    { id: 'schnell',  icon: '⚡', title: 'Schnelltraining',   sub: '10 kurze Aufgaben' },
    { id: 'diktat',   icon: '✍️', title: 'Rhythmusdiktat',    sub: 'Hören und aufschreiben' },
    { id: 'pruefung', icon: '📝', title: 'Prüfungstraining',  sub: 'Wie im Test – Hilfe erst danach' },
    { id: 'fehler',   icon: '🎯', title: 'Fehlertraining',    sub: 'Deine Fehler – jetzt richtig' }
  ];

  function goalPhrase(st) { return st.goalLabel === 'Musiktest' ? 'zum Musiktest' : 'zur ' + st.goalLabel; }
  function tile(icon, title, sub, attrs, onclick) {
    var a = { class: 'tile', type: 'button', onclick: onclick }; for (var k in attrs) a[k] = attrs[k];
    return h('button', a, [h('span', { class: 'tile-icon', text: icon }), h('span', { class: 'tile-title', text: title }), h('span', { class: 'tile-sub', text: sub })]);
  }

  function home(app) {
    var pr = app.progress, P = app.platform, days = pr.daysToGoal(), st = pr.settings();
    var today = pr.todayCount(), wrongN = pr.doc.wrong.length;
    var countdown = days == null ? '' : days > 1 ? 'Noch ' + days + ' Tage bis ' + goalPhrase(st) + '.' : days === 1 ? 'Morgen ist ' + st.goalLabel + '!' : days === 0 ? 'Heute ist ' + st.goalLabel + ' – viel Erfolg!' : '';
    var line = today ? 'Heute schon ' + today + (today === 1 ? ' Aufgabe' : ' Aufgaben') + ' geschafft. Stark!' : 'Für heute: ca. 10–15 Minuten.';
    var v = h('section', { class: 'home' }, [
      h('div', { class: 'hero' }, [app.robin(today ? 'happy' : 'normal', 92), h('div', {}, [
        h('h1', { text: 'Hallo ' + P.childName + '!' }),
        countdown ? h('p', { class: 'countdown', text: '📅 ' + countdown }) : null,
        h('p', { class: 'hero-line', text: line })])]),
      h('button', { class: 'today-btn', type: 'button', 'data-menu': 'heute', onclick: function () { A.unlock(); app.start('heute'); } }, [
        h('span', { class: 'tb-icon', text: '▶' }),
        h('span', { class: 'tb-text' }, [h('span', { class: 'tb-title', text: 'Heute üben' }), h('span', { class: 'tb-sub', text: '11 Aufgaben: Noten · Tasten · Tonleitern · Rhythmus · Hören · ♯♭' })])]),
      wrongN >= 3 ? h('button', { class: 'problem-card', type: 'button', 'data-menu': 'fehler-card', onclick: function () { app.start('fehler'); } }, [
        h('span', { class: 'pc-icon', text: '🎯' }), h('span', {}, [h('b', { text: 'Fehlertraining' }), h('span', { class: 'note', text: ' – ' + wrongN + ' Aufgaben, die du jetzt verbessern kannst' })])]) : null,
      h('h2', { class: 'group-h', text: '📘 Lernen' }),
      h('div', { class: 'tiles modules' }, M.MODULES.map(function (m) {
        var done = pr.moduleDone(m.id), mast = m.skills.map(function (s) { var x = pr.doc.skills[s] || {}; return (x.m || 0) * Math.min(1, (x.n || 0) / 8); }), avg = mast.reduce(function (a, b) { return a + b; }, 0) / mast.length;
        return h('button', { class: 'tile module' + (done ? ' done' : ''), type: 'button', 'data-module': m.id, onclick: function () { A.unlock(); app.go('lernen/' + m.id); } }, [
          h('span', { class: 'tile-icon', text: m.icon }), h('span', { class: 'tile-title', text: m.id + ' · ' + m.title }),
          h('span', { class: 'tile-sub' }, [done ? h('span', { class: 'tag ok', text: '✓ gelernt' }) : h('span', { class: 'tag', text: 'neu' }), U.bar(avg)])]);
      })),
      h('h2', { class: 'group-h', text: '✏️ Üben' }),
      h('div', { class: 'tiles' }, MODES.map(function (m) {
        return tile(m.icon, m.title, m.id === 'fehler' ? (wrongN ? wrongN + ' Aufgaben' : 'gerade keine Fehler') : m.sub, { 'data-menu': m.id }, function () { A.unlock(); app.go(m.id === 'ueben' ? 'ueben' : m.id === 'schnell' ? 'schnell' : 'start/' + m.id); });
      })),
      h('h2', { class: 'group-h', text: '🧰 Ausprobieren' }),
      h('div', { class: 'tiles' }, [
        tile('🎹', 'Klavier-Entdecker', 'Taste drücken: Name, Note, Klang', { 'data-menu': 'klavier' }, function () { A.unlock(); app.go('klavier'); }),
        tile('🐤', 'Melodien', 'Alle meine Entchen & Morgenstimmung', { 'data-menu': 'melodien' }, function () { A.unlock(); app.go('melodien'); })])
    ]);
    app.setView(v);
  }

  function lernen(app) {
    var pr = app.progress;
    app.setView(h('section', { class: 'menu' }, [h('h1', { class: 'screen-h', text: '📘 Lernen' }), h('p', { class: 'screen-sub', text: 'Jedes Modul: ansehen, anhören, verstehen – dann selbst ausprobieren.' }),
      h('div', { class: 'list' }, M.MODULES.map(function (m) {
        return h('button', { class: 'list-item', type: 'button', 'data-module': m.id, onclick: function () { A.unlock(); app.go('lernen/' + m.id); } }, [h('span', { class: 'li-icon', text: m.icon }),
          h('span', { class: 'li-text' }, [h('b', { text: m.id + ' · ' + m.title }), h('span', { class: 'note', text: m.skills.map(function (s) { return M.skill(s).label; }).join(' · ') })]),
          pr.moduleDone(m.id) ? h('span', { class: 'tag ok', text: '✓' }) : null]);
      }))]), { back: true });
  }

  function ueben(app) {
    var pr = app.progress, groups = {};
    pr.overview().forEach(function (o) { (groups[o.group] = groups[o.group] || []).push(o); });
    var v = h('section', { class: 'menu' }, [h('h1', { class: 'screen-h', text: '🔁 Üben' }),
      h('div', { class: 'tiles' }, AREAS.map(function (a) { return tile(a.icon, a.title, a.sub, { 'data-area': a.id }, function () { A.unlock(); app.start(a.id); }); })),
      h('h2', { class: 'group-h', text: 'Oder ein einzelnes Thema' })]);
    Object.keys(groups).forEach(function (g) {
      v.appendChild(h('h3', { class: 'group-h small', text: g }));
      v.appendChild(h('div', { class: 'list' }, groups[g].map(function (o) {
        return h('button', { class: 'list-item skill', type: 'button', 'data-skill': o.id, onclick: function () { A.unlock(); app.start('skill', { skill: o.id }); } }, [
          h('span', { class: 'li-text' }, [h('b', { text: o.label }), h('span', { class: 'note', text: o.mastery.label + (o.n ? ' · ' + o.n + ' Aufgaben' : '') })]), U.bar(o.bar)]);
      })));
    });
    app.setView(v, { back: true });
  }

  function schnell(app) {
    var st = app.progress.settings();
    app.setView(h('section', { class: 'menu narrow' }, [h('h1', { class: 'screen-h', text: '⚡ Schnelltraining' }), h('p', { class: 'screen-sub', text: '10 kurze Aufgaben: Noten, Tasten, Halbtöne, Namen mit ♯ und ♭. Ohne Zeitdruck – die Stoppuhr ist freiwillig.' }),
      h('div', { class: 'row' }, [
        h('button', { class: 'btn primary', type: 'button', 'data-menu': 'schnell-ohne', text: 'Los – ohne Zeit', onclick: function () { app.progress.setSetting('timer', false); app.start('schnell', { timer: false }); } }),
        h('button', { class: 'btn soft', type: 'button', 'data-menu': 'schnell-mit', text: '⏱️ Mit Stoppuhr', onclick: function () { app.progress.setSetting('timer', true); app.start('schnell', { timer: true }); } })]),
      st.best_schnell ? h('p', { class: 'note', text: 'Deine Bestzeit (alles richtig): ' + Math.floor(st.best_schnell / 60) + ':' + ('0' + st.best_schnell % 60).slice(-2) }) : null]), { back: true });
  }

  // ---------------------------------------------------------------- Klavier-Entdecker: key → name → note → sound
  function klavier(app) {
    var labels = 'none', marks = false, info = h('div', { class: 'kl-info', 'aria-live': 'polite' }), staffBox = h('div', { class: 'kl-staff' }), pianoBox = h('div', { class: 'kl-piano' });
    function show(m) {
      var ns = T.keyNames(m), oct = function (n) { return T.fullName(n); };
      staffBox.innerHTML = '';
      staffBox.appendChild(V.render({ type: 'staff', zoom: 2.6, labels: true, spacing: 5, events: ns.map(function (n) { return { p: T.pos(n), dur: 4, acc: n.a ? (n.a > 0 ? '#' : 'b') : null, label: T.name(n) }; }) }));
      info.innerHTML = '';
      info.appendChild(h('p', { class: 'kl-name', text: ns.map(oct).join('  =  ') }));
      info.appendChild(h('p', { class: 'note', rich: T.isBlack(m) ? 'Schwarze Taste mit zwei Namen: von *' + T.name(T.note(ns[0].s, 0, ns[0].o)) + '* aus mit ♯ (*' + T.name(ns[0]) + '*), von *' + T.name(T.note(ns[1].s, 0, ns[1].o)) + '* aus mit ♭ (*' + T.name(ns[1]) + '*).' : 'Stammton *' + T.name(ns[0]) + '* – im Notensystem ' + T.where(T.pos(ns[0])) + ' (' + T.octaveWord(ns[0].o) + ').' }));
    }
    function build() {
      pianoBox.innerHTML = '';
      var last = null, p = MB.piano.render({ from: 55, to: 84, labels: labels, marks: marks, onPress: function (m) { if (last != null) p.unmark(last, 'sel'); last = m; p.mark(m, 'sel'); show(m); } });
      pianoBox.appendChild(p);
      setTimeout(function () { p.center(66); }, 30);
    }
    function chip(text, on, fn) { return h('button', { class: 'chip' + (on ? ' on' : ''), type: 'button', text: text, onclick: fn }); }
    var opts = h('div', { class: 'chips' });
    function drawOpts() {
      opts.innerHTML = '';
      [['none', 'Keine Namen'], ['white', 'Weiße Tasten'], ['all', 'Alle Namen']].forEach(function (x) { opts.appendChild(chip(x[1], labels === x[0], function () { labels = x[0]; drawOpts(); build(); })); });
      opts.appendChild(chip("Mit Strichen (c')", marks, function () { marks = !marks; drawOpts(); build(); }));
    }
    drawOpts(); build();
    info.appendChild(h('p', { class: 'note', text: 'Tippe auf eine Taste: Du hörst den Ton und siehst seinen Namen und seine Note.' }));
    app.setView(h('section', { class: 'menu klavier' }, [h('h1', { class: 'screen-h', text: '🎹 Klavier-Entdecker' }), opts, staffBox, info, pianoBox]), { back: true });
  }

  // ---------------------------------------------------------------- Melodien: see, hear (with highlighting), name, play along
  function melodien(app) {
    var song = 'entchen', key = 'C', showNames = false, along = false, pos = 0, timers = [];
    var box = h('div', { class: 'mel-box' }), ctrl = h('div', { class: 'mel-ctrl' }), msg = h('p', { class: 'note', 'aria-live': 'polite' });
    function stopAll() { timers.forEach(clearTimeout); timers = []; A.stop(); }
    function build() {
      stopAll(); box.innerHTML = ''; ctrl.innerHTML = ''; pos = 0; msg.textContent = '';
      var M0 = G.MELODIES[song], mel = G.melody(song, key);
      var songs = h('div', { class: 'chips' }, [['entchen', '🐤 Alle meine Entchen'], ['morgen', '🌅 Morgenstimmung']].map(function (x) {
        return h('button', { class: 'chip' + (song === x[0] ? ' on' : ''), type: 'button', text: x[1], onclick: function () { song = x[0]; if (G.MELODIES[song].keys.indexOf(key) < 0) key = G.MELODIES[song].keys[0]; build(); } });
      }));
      var keys = h('div', { class: 'chips' }, M0.keys.map(function (k) { return h('button', { class: 'chip' + (k === key ? ' on' : ''), type: 'button', 'data-key': k, text: T.scaleById(k).title, onclick: function () { key = k; build(); } }); }));
      ctrl.appendChild(songs); ctrl.appendChild(keys);
      var ev = mel.events.map(function (e, i) { var c = {}; for (var k2 in e) c[k2] = e[k2]; return c; });
      if (showNames) mel.evIdx.forEach(function (k3, i) { ev[k3].label = T.name(mel.notes[i].n); });
      var stf = MB.staff.render({ events: ev, time: mel.time, zoom: 2.2, labels: showNames });
      box.appendChild(h('div', { class: 'vis vis-staff mel-staff' }, [stf]));
      var lo = Math.max(55, Math.min.apply(null, mel.midis) - 3), hi = Math.min(84, Math.max(Math.max.apply(null, mel.midis) + 3, lo + 12));
      function mark() { mel.evIdx.forEach(function (k4, i) { stf.unmark(k4, 'now'); stf.unmark(k4, 'done'); if (along) { if (i < pos) stf.mark(k4, 'done'); else if (i === pos) stf.mark(k4, 'now'); } }); }
      var pn = MB.piano.render({ from: lo, to: hi, labels: showNames ? 'white' : 'none', onPress: function (m) {
        if (!along) return;
        if (m === mel.midis[pos]) { pos++; msg.textContent = pos >= mel.midis.length ? '🎉 Geschafft – das ganze Lied!' : ''; if (pos >= mel.midis.length) { along = false; build(); return; } }
        else { var want = mel.notes[pos]; msg.textContent = 'Das war ' + T.keyNames(m).map(T.name).join('/') + '. Gesucht: ' + (showNames ? T.name(want.n) : 'die markierte Note') + (want.n.a && !want.accShown ? ' – denk an das Versetzungszeichen vorne im Takt!' : '.'); }
        mark();
      } });
      box.appendChild(pn); setTimeout(function () { pn.center(mel.midis[0]); }, 30);
      function listen() {
        stopAll(); var b = 60 / 100, t = 0;
        mel.notes.forEach(function (x, i) {
          (function (k5, at) { timers.push(setTimeout(function () { mel.evIdx.forEach(function (kk) { stf.unmark(kk, 'now'); }); stf.mark(k5, 'now'); pn.mark(mel.midis[i], 'hl'); setTimeout(function () { pn.unmark(mel.midis[i], 'hl'); }, x.beats * b * 900); }, at * 1000)); })(mel.evIdx[i], t);
          t += x.beats * b;
        });
        timers.push(setTimeout(function () { mel.evIdx.forEach(function (kk) { stf.unmark(kk, 'now'); }); }, t * 1000 + 300));
        A.melody(mel.mel, 100);
      }
      box.insertBefore(h('div', { class: 'row' }, [
        h('button', { class: 'btn play', type: 'button', 'data-act': 'listen', text: '🔊 Anhören & mitlesen', onclick: listen }),
        h('button', { class: 'btn soft', type: 'button', 'data-act': 'along', text: along ? '✋ Mitspielen beenden' : '🎹 Mitspielen', onclick: function () { along = !along; pos = 0; build(); if (along) msg.textContent = 'Spiele die markierte Note.'; } }),
        h('button', { class: 'btn soft', type: 'button', 'data-act': 'names', text: showNames ? '🙈 Namen verstecken' : '🔤 Namen zeigen', onclick: function () { showNames = !showNames; var a2 = along; build(); along = a2; } })]), box.firstChild);
      if (along) { mark(); msg.textContent = 'Spiele die markierte Note.'; }
      box.appendChild(msg);
      box.appendChild(h('p', { class: 'note', rich: song === 'entchen' ? 'Fingersatz: Daumen (1) auf dem Grundton *' + T.name(mel.key.notes[0]) + '*, dann 2 – 3 – 4 – 5.' : 'Die Morgenstimmung ist von *Edvard Grieg* (aus „Peer Gynt“). Hier der Anfang, vereinfacht.' }));
    }
    build();
    app.setView(h('section', { class: 'menu melodien' }, [h('h1', { class: 'screen-h', text: '🐤 Melodien' }), ctrl, box,
      h('div', { class: 'row' }, [h('button', { class: 'btn primary', type: 'button', text: 'Aufgaben zu Melodien', onclick: function () { stopAll(); app.start('melodie'); } })])]), { back: true, onBack: stopAll });
  }

  // ---------------------------------------------------------------- parent page
  function parent(app) {
    var pr = app.progress, P = app.platform;
    if (P.parentHasPin() && !app.parentOk) {
      var inp = h('input', { type: 'password', inputmode: 'numeric', class: 'nbox pin', 'aria-label': 'Eltern-PIN', maxlength: 8 });
      var m = h('p', { class: 'hint' });
      var go = function () { if (P.parentCheck(inp.value)) { app.parentOk = true; parent(app); } else { m.textContent = 'Die PIN stimmt nicht.'; inp.value = ''; } };
      inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') go(); });
      app.setView(h('section', { class: 'pin-screen menu narrow' }, [h('h1', { class: 'screen-h', text: 'Elternbereich' }), h('p', { text: P.guest ? 'Bitte die Eltern-PIN eingeben.' : 'Bitte die Eltern-PIN von Robin’s Bobins eingeben.' }),
        h('div', { class: 'row' }, [inp, h('button', { class: 'btn primary', type: 'button', text: 'Öffnen', onclick: go })]), m]), { back: true });
      return setTimeout(function () { inp.focus(); }, 30);
    }
    var s = pr.stats(), st = pr.settings(), mc = pr.misconceptions(), recent = pr.recent(7), ov = pr.overview();
    var statRow = function (label, val) { return h('div', { class: 'pstat' }, [h('b', { text: val }), h('span', { text: label })]); };
    var groups = {}; ov.forEach(function (o) { (groups[o.group] = groups[o.group] || []).push(o); });
    var mastery = h('div', { class: 'mastery' });
    Object.keys(groups).forEach(function (g) {
      mastery.appendChild(h('h3', { text: g }));
      groups[g].forEach(function (o) {
        mastery.appendChild(h('div', { class: 'mrow m-' + o.mastery.key }, [h('span', { class: 'mlabel', text: o.label }), U.bar(o.bar),
          h('span', { class: 'mstate', text: o.mastery.label + (o.n ? ' (' + o.n + ')' : '') })]));
      });
    });
    var maxN = Math.max.apply(null, recent.map(function (r) { return r.n; }).concat([1]));
    var week = h('div', { class: 'week' }, recent.map(function (r) {
      var d = new Date(r.day + 'T12:00:00');
      return h('div', { class: 'wday', title: r.n + ' Aufgaben, ' + r.first + ' gleich richtig' }, [h('span', { class: 'wbar', style: 'height:' + Math.round(r.n / maxN * 60) + 'px' }, [h('span', { class: 'wbar-ok', style: 'height:' + (r.n ? Math.round(r.first / r.n * 100) : 0) + '%' })]),
        h('span', { class: 'wlab', text: ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'][d.getDay()] }), h('span', { class: 'wn', text: String(r.n) })]);
    }));
    var goal = h('input', { type: 'date', value: st.goalDate || '', 'aria-label': 'Zieldatum' });
    goal.addEventListener('change', function () { pr.setSetting('goalDate', goal.value); });
    var goalLab = h('select', { 'aria-label': 'Was ist an dem Tag?' }, ['Musiktest', 'Lernkontrolle', 'Klassenarbeit', 'Test'].map(function (x) { var o = h('option', { value: x, text: x }); if (x === st.goalLabel) o.selected = true; return o; }));
    goalLab.addEventListener('change', function () { pr.setSetting('goalLabel', goalLab.value); });
    var font = h('input', { type: 'checkbox' }); font.checked = st.font === 'dyslexic';
    font.addEventListener('change', function () { pr.setSetting('font', font.checked ? 'dyslexic' : ''); app.applySettings(); });
    var rate = h('select', { 'aria-label': 'Vorlesetempo' }, [['0.65', 'langsam'], ['0.8', 'ruhig'], ['1', 'normal']].map(function (x) { var o = h('option', { value: x[0], text: x[1] }); if (String(st.slowRate) === x[0]) o.selected = true; return o; }));
    rate.addEventListener('change', function () { pr.setSetting('slowRate', parseFloat(rate.value)); });
    var resetArmed = false, resetBtn = h('button', { class: 'btn soft', type: 'button', text: 'Lernstand zurücksetzen' });
    resetBtn.addEventListener('click', function () { if (!resetArmed) { resetArmed = true; resetBtn.textContent = 'Wirklich? Nochmal tippen zum Löschen'; return; } pr.reset(); app.go('home'); });

    app.setView(h('section', { class: 'parent menu' }, [
      h('h1', { class: 'screen-h', text: '👤 Elternbereich – ' + P.childName }),
      h('div', { class: 'card' }, [h('h2', { text: 'Überblick' }), h('div', { class: 'pstats' }, [
        statRow('Übungszeit', s.seconds && s.minutes < 1 ? '< 1 min' : s.minutes + ' min'), statRow('Aufgaben', String(s.tasks)), statRow('gleich richtig', s.firstPct == null ? '–' : s.firstPct + ' %'),
        statRow('nach Fehler selbst verbessert', String(s.corrected)), statRow('mit Tipps gelöst', String(s.hintTasks)), statRow('Lösung angesehen', String(s.solutions)),
        statRow('Tage in Folge', String(s.streak)), statRow('Robin-Münzen hier verdient', String(s.coins))]),
        h('p', { class: 'note', text: '„Gleich richtig“ = beim ersten Versuch ohne Tipp. Bei wenigen Aufgaben sind die Zahlen noch wenig aussagekräftig.' })]),
      h('div', { class: 'card' }, [h('h2', { text: 'Stand nach Thema' }), mastery,
        h('p', { class: 'note', text: '„Sicher“ erst nach mindestens 8 Aufgaben, mit zuletzt fast nur Treffern auf mittlerer oder höherer Stufe.' })]),
      h('div', { class: 'card' }, [h('h2', { text: 'Wiederkehrende Fehler' }),
        mc.length ? h('ul', { class: 'mc' }, mc.map(function (x) { return h('li', { text: x.text }); })) : h('p', { class: 'note', text: s.tasks < 10 ? 'Noch zu wenige Aufgaben für eine Aussage.' : 'Keine wiederkehrenden Fehler – prima.' })]),
      h('div', { class: 'card' }, [h('h2', { text: 'Letzte 7 Tage' }), week, h('p', { class: 'note', text: 'Balkenhöhe = Aufgaben, grün = davon gleich richtig.' })]),
      h('div', { class: 'card settings' }, [h('h2', { text: 'Einstellungen' }),
        h('label', { class: 'set' }, [h('span', { text: 'Countdown bis' }), goalLab, goal]),
        h('label', { class: 'set' }, [font, h('span', { text: 'Schrift OpenDyslexic' })]),
        h('label', { class: 'set' }, [h('span', { text: 'Vorlesen' }), rate]),
        h('p', { class: 'note', text: 'Lernstand und Münzen liegen nur auf diesem Gerät (in diesem Browser).' }),
        resetBtn, h('p', { class: 'note', text: 'Löscht den Lernstand in Musik-Bobins. Einstellungen und Robin-Münzen bleiben.' })])
    ]), { back: true });
  }

  root.MB.screens = { home: home, lernen: lernen, ueben: ueben, schnell: schnell, klavier: klavier, melodien: melodien, parent: parent, AREAS: AREAS, MODES: MODES };
})(typeof window !== 'undefined' ? window : globalThis);
