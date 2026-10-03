/*
 * lessons.js — LERNEN: modules A–H. Always SEHEN → HÖREN → VERSTEHEN → ANWENDEN:
 * Erklärung (with picture) → Anhören (🔊) → Merke → geführte Aufgabe → selbst → Wiederholung.
 *
 * Step types:  { t: 'explain'|'example'|'rule', title, lines: [markup], visual(s): vis spec, play: [play specs], robin }
 *              { t: 'guided', task: {gen, level, params?} }   first tip shown at once
 *              { t: 'self', tasks: [{gen, level, params?}, …] }
 *              { t: 'review' }
 */
(function (root) {
  'use strict';
  var MB = root.MB, U = MB.ui, h = U.h, V = MB.vis, T = MB.theory, RH = MB.rhythm, G = MB.gens;

  // "c' e' g'" → staff picture with names under the notes; accidentals from the spelling
  function notes(str) { return str.split(/\s+/).map(function (x) { return T.parse(x, 3); }); }
  function S(str, o) {
    o = o || {};
    var ns = notes(str);
    return { type: 'staff', labels: o.labels !== false, zoom: o.zoom || 2.4, spacing: o.spacing, time: o.time,
      events: ns.map(function (n, i) { return { p: T.pos(n), dur: o.dur || 4, acc: n.a ? (n.a > 0 ? '#' : 'b') : null, label: o.labels === false ? null : (o.full ? T.fullName(n) : T.name(n)), cls: o.hl && o.hl.indexOf(i) >= 0 ? 'ask' : null }; }) };
  }
  function snd(label, str) { return { label: '🔊 ' + label, notes: notes(str).map(T.midi) }; }
  function K(from, to, o) { o = o || {}; return { type: 'piano', from: from, to: to, labels: o.labels || 'white', dots: o.dots, hl: o.hl, marks: o.marks }; }
  function rh(pat, per) { return { type: 'staff', events: G.rhEvents(pat, per || 4), time: (per || 4) + '/4', clef: false, zoom: 2.2, syl: RH.syllables(pat), rhythm: true }; }
  function rhPlay(label, pat, bpm) { return { label: '🔊 ' + label, rhythm: pat, bpm: bpm || 80, countIn: true }; }
  var ENT = G.melody('entchen', 'C'), ENT_A = G.melody('entchen', 'A', 0, 11);

  var L = {
    A: [
      { t: 'explain', title: 'Das Notensystem', lines: ['Noten stehen auf *5 Linien*. Man zählt sie *von unten*: 1. Linie, 2. Linie … 5. Linie.', 'Zwischen den Linien liegen *4 Zwischenräume*.', 'Je *höher* eine Note steht, desto *höher* klingt sie.'],
        visual: S("c' d' e' f' g' a' h' c''", { dur: 4 }), play: [snd('Von unten nach oben', "c' d' e' f' g' a' h' c''")] },
      { t: 'explain', title: 'Der Violinschlüssel', robin: 'Der Violinschlüssel heißt auch *G-Schlüssel*.', lines: ['Er beginnt auf der *2. Linie* und windet sich um sie herum.', 'Auf der 2. Linie liegt deshalb das *g*.', 'Von dort kannst du alle anderen Noten abzählen.'],
        visual: S("g'"), play: [snd('g anhören', "g'")] },
      { t: 'rule', title: 'Merke: Linien und Zwischenräume', lines: ['Auf den *Linien* (von unten): [e] – [g] – [h] – [d] – [f]', 'In den *Zwischenräumen* (von unten): [f] – [a] – [c] – [e]'],
        visuals: [S("e' g' h' d'' f''"), S("f' a' c'' e''")], play: [snd('Linien-Töne', "e' g' h' d'' f''"), snd('Zwischenraum-Töne', "f' a' c'' e''")] },
      { t: 'explain', title: 'Hilfslinien', lines: ['Für tiefere und höhere Töne zeichnet man kurze *Hilfslinien*.', 'Das *c* liegt auf der *ersten Hilfslinie unter* dem System, das *d* direkt darunter (unter der 1. Linie).', 'Noch tiefer: h, a (2. Hilfslinie), g. Oben: g, *a* (1. Hilfslinie über dem System), h, c.'],
        visual: S("g a h c' d' g'' a'' h'' c'''"), play: [snd('Tief', "g a h c' d'"), snd('Hoch', "g'' a'' h'' c'''")] },
      { t: 'example', title: 'Genaue Tonnamen: Striche', lines: ['Jeder Ton kommt mehrmals vor. Darum gibt es *Striche*:', 'g a h ohne Strich: *kleine Oktave* (tief).', "c' bis h': *eingestrichen* – c' ist das c in der Mitte der Tastatur.", "c'' bis h'': *zweigestrichen*, c''': *dreigestrichen*."],
        visual: S("g c' g' c'' g'' c'''", { full: true }), play: [snd('Alle c und g', "g c' g' c'' g'' c'''")] },
      { t: 'guided', task: { gen: 'lesen', level: 1 } },
      { t: 'guided', task: { gen: 'setzen', level: 1 } },
      { t: 'self', tasks: [{ gen: 'lesen', level: 1 }, { gen: 'lesen', level: 2 }, { gen: 'setzen', level: 2 }, { gen: 'oktave', level: 1 }, { gen: 'lesen', level: 2 }] },
      { t: 'review' }
    ],
    B: [
      { t: 'explain', title: 'Weiße und schwarze Tasten', lines: ['Die schwarzen Tasten kommen in *Zweier-* und *Dreiergruppen*.', 'An ihnen erkennst du jede weiße Taste.', 'Das *c* liegt immer *links neben den zwei schwarzen Tasten*.'],
        visual: K(60, 72, { labels: 'none', hl: [60, 72] }), play: [snd('c', "c'"), snd('c und c', "c' c''")] },
      { t: 'explain', title: 'Die Stammtöne', lines: ['Die weißen Tasten heißen *c d e f g a h* – dann geht es wieder mit c los.', '*c d e* liegen um die *Zweiergruppe*.', '*f g a h* liegen um die *Dreiergruppe*.', 'Probier es aus: Tippe auf die Tasten!'],
        visual: K(60, 72), play: [snd('c d e f g a h c', "c' d' e' f' g' a' h' c''")] },
      { t: 'explain', title: 'Note → Taste', lines: ['Auf dem Arbeitsblatt: Erst den Tonnamen lesen, dann die Taste suchen.', "Das *c'* ist das c in der Mitte. Links davon (tiefer): h, a, g.", 'Höhere Noten im System = Tasten weiter *rechts*.'],
        visuals: [S("c' e' g' c''", { full: true }), K(55, 76, { marks: true, dots: [60, 64, 67, 72] })], play: [snd('Anhören', "c' e' g' c''")] },
      { t: 'guided', task: { gen: 'taste', level: 1 } },
      { t: 'guided', task: { gen: 'taste_name', level: 1 } },
      { t: 'self', tasks: [{ gen: 'taste', level: 1 }, { gen: 'note_taste', level: 1 }, { gen: 'taste_name', level: 1 }, { gen: 'note_taste', level: 2 }, { gen: 'taste', level: 2 }] },
      { t: 'review' }
    ],
    C: [
      { t: 'explain', title: 'Der Halbtonschritt', lines: ['Zwei Tasten liegen *direkt nebeneinander* – keine Taste dazwischen.', 'Das ist der kleinste Schritt: ein *Halbtonschritt*. Zeichen: ∨', 'Beispiele: c – cis, e – f, h – c.'],
        visual: { type: 'piano', from: 59, to: 67, labels: 'all', hl: [64, 65], steps: true }, play: [snd('e – f', "e' f'"), snd('h – c', "h c'")] },
      { t: 'explain', title: 'Der Ganztonschritt', lines: ['Zwischen den zwei Tasten liegt *noch eine* Taste.', 'Das ist ein *Ganztonschritt* (= 2 Halbtöne). Zeichen: ⌴', 'Beispiele: c – d (dazwischen cis), f – g (dazwischen fis).'],
        visual: { type: 'piano', from: 59, to: 67, labels: 'all', hl: [60, 62], steps: true }, play: [snd('c – d', "c' d'"), snd('f – g', "f' g'")] },
      { t: 'rule', title: 'Merke', lines: ['*Halbton*: keine Taste dazwischen. *Ganzton*: eine Taste dazwischen.', 'Zwischen *e – f* und *h – c* gibt es *keine* schwarze Taste: das sind Halbtöne!', 'Alle anderen weißen Nachbarn sind Ganztöne.'] },
      { t: 'guided', task: { gen: 'ganzhalb', level: 1, params: { a: 64, b: 65, how: 'piano' } } },
      { t: 'self', tasks: [{ gen: 'ganzhalb', level: 1 }, { gen: 'ganzhalb', level: 1 }, { gen: 'ganzhalb', level: 2 }, { gen: 'ganzhalb', level: 2 }, { gen: 'ganzhalb', level: 3 }] },
      { t: 'review' }
    ],
    D: [
      { t: 'explain', title: 'Das Kreuz ♯', lines: ['Ein *Kreuz* vor der Note *erhöht* den Ton um einen *Halbton*: eine Taste nach *rechts*.', 'An den Namen hängt man *-is*: c → *cis*, f → *fis*, g → *gis*.'],
        visuals: [S("c' cis' f' fis'"), K(60, 67, { labels: 'all', hl: [61, 66] })], play: [snd('c → cis', "c' cis'"), snd('f → fis', "f' fis'")] },
      { t: 'explain', title: 'Das b ♭', lines: ['Ein *b* vor der Note *erniedrigt* den Ton um einen *Halbton*: eine Taste nach *links*.', 'An den Namen hängt man *-es*: d → *des*, g → *ges*.', 'Ausnahmen: e → *es*, a → *as* (das e fällt weg), h → *b*.'],
        visuals: [S("d' des' e' es' a' as' h' b'"), K(60, 72, { labels: 'all', hl: [61, 63, 68, 70] })], play: [snd('e → es', "e' es'"), snd('h → b', "h' b'")] },
      { t: 'explain', title: 'Eine Taste – zwei Namen', robin: 'Die schwarze Taste zwischen f und g: Ist das *fis* oder *ges*?', lines: ['Beides! Von *unten* (f) erreicht man sie mit ♯: *fis*.', 'Von *oben* (g) erreicht man sie mit ♭: *ges*.', 'Genauso: cis = des, dis = es, gis = as, ais = b.'],
        visual: K(60, 72, { labels: 'all', dots: [66] }), play: [snd('fis / ges', "fis'")] },
      { t: 'rule', title: 'Merke: Das Auflösungszeichen ♮ und der Taktstrich', lines: ['Ein Versetzungszeichen gilt für alle Noten auf derselben Stelle – *bis zum nächsten Taktstrich*.', 'Das *Auflösungszeichen ♮* hebt es vorher auf: Der Ton ist wieder der Stammton.', 'Nach dem Taktstrich gilt es nicht mehr.'],
        visual: { type: 'staff', time: '4/4', zoom: 2.4, labels: true, events: [{ p: 1, dur: 1, acc: '#', label: 'fis' }, { p: 1, dur: 1, label: 'fis' }, { p: 1, dur: 1, acc: 'n', label: 'f' }, { p: 0, dur: 1, label: 'e' }, { bar: true }, { p: 1, dur: 2, label: 'f' }, { p: -1, dur: 2, label: 'd' }] },
        play: [snd('Anhören', "fis' fis' f' e' f' d'")] },
      { t: 'guided', task: { gen: 'namen_is', level: 1 } },
      { t: 'guided', task: { gen: 'enharmonisch', level: 1, params: { m: 66 } } },
      { t: 'self', tasks: [{ gen: 'kreuz', level: 1 }, { gen: 'bzeichen', level: 1 }, { gen: 'namen_es', level: 1 }, { gen: 'enharmonisch', level: 1 }, { gen: 'aufloesung', level: 2 }, { gen: 'namen_is', level: 2 }] },
      { t: 'review' }
    ],
    E: [
      { t: 'explain', title: 'Die C-Dur-Tonleiter', lines: ['Eine Tonleiter hat *8 Töne* – der 8. heißt wie der 1. (der *Grundton*).', 'C-Dur: c d e f g a h c – nur weiße Tasten.', 'Die Halbtöne liegen zwischen *e – f* (3./4. Ton) und *h – c* (7./8. Ton).'],
        visuals: [S("c' d' e' f' g' a' h' c''", { spacing: 4.2 }), { type: 'piano', from: 60, to: 72, labels: 'white', hl: [60, 62, 64, 65, 67, 69, 71, 72], steps: true }], play: [snd('C-Dur anhören', "c' d' e' f' g' a' h' c''")], steps: 'C' },
      { t: 'rule', title: 'Merke: das Muster der Dur-Tonleiter', lines: ['*Ganz – Ganz – Halb – Ganz – Ganz – Ganz – Halb*', 'Die Halbtonschritte liegen immer zwischen dem *3./4.* und dem *7./8.* Ton.', 'Mit diesem Muster kannst du *jede* Dur-Tonleiter bauen.'] },
      { t: 'example', title: 'F-Dur braucht ein b', lines: ['f – g – a – *h*? Von a nach h ist ein Ganzton – aber der 3./4. Schritt muss ein *Halbton* sein!', 'Also: h erniedrigen → *b*.', 'F-Dur: f g a *b* c d e f'],
        visuals: [S("f' g' a' b' c'' d'' e'' f''", { spacing: 4.2 }), { type: 'piano', from: 65, to: 77, labels: 'all', hl: [65, 67, 69, 70, 72, 74, 76, 77], steps: true }], play: [snd('F-Dur anhören', "f' g' a' b' c'' d'' e'' f''")], steps: 'F' },
      { t: 'example', title: 'A-Dur und Es-Dur', lines: ['A-Dur braucht *drei Kreuze*: a h *cis* d e *fis* *gis* a.', 'Es-Dur braucht *drei b*: *es* f g *as* *b* c d es.', 'Prüfe Schritt für Schritt mit dem Muster!'],
        visuals: [S("a' h' cis'' d'' e'' fis'' gis'' a''", { spacing: 4 }), S("es' f' g' as' b' c'' d'' es''", { spacing: 4 })], play: [snd('A-Dur', "a' h' cis'' d'' e'' fis'' gis'' a''"), snd('Es-Dur', "es' f' g' as' b' c'' d'' es''")] },
      { t: 'guided', task: { gen: 'dur', level: 2, params: { v: 'gaps', k: 'C', o: 0 } } },
      { t: 'guided', task: { gen: 'dur_bauen', level: 1, params: { k: 'F' } } },
      { t: 'self', tasks: [{ gen: 'dur', level: 1 }, { gen: 'dur', level: 2 }, { gen: 'dur_bauen', level: 2, params: { k: 'A' } }, { gen: 'dur_bauen', level: 2, params: { k: 'Es' } }, { gen: 'dur', level: 2 }] },
      { t: 'review' }
    ],
    F: [
      { t: 'explain', title: 'Der Grundschlag', lines: ['Musik hat einen *Grundschlag* – wie dein Herzschlag oder wie Schritte.', 'Im *4/4-Takt* zählt man: 1 – 2 – 3 – 4. Dann kommt ein *Taktstrich*.', 'Klopf beim Anhören mit!'],
        visual: rh(['V', 'V', 'V', 'V', 'V', 'V', 'V', 'V']), play: [rhPlay('Grundschlag', ['V', 'V', 'V', 'V', 'V', 'V', 'V', 'V'])] },
      { t: 'explain', title: 'du · du-de · du-a', lines: ['*Viertelnote* = *du* – ein Grundschlag. Zeichen: —', '*Doppelachtel* (zwei Achtel mit Balken) = *du-de* – zwei schnelle Töne in einem Schlag. Zeichen: | |', '*Halbe Note* (leerer Kopf mit Hals) = *du-a* – ein langer Ton über zwei Schläge. Zeichen: —|—', '*Ganze Note* (leerer Kopf ohne Hals) = *du-a-a-a* – vier Schläge lang.'],
        visual: rh(['V', 'A', 'H', 'G'], 4), play: [rhPlay('du', ['V', 'V', 'V', 'V']), rhPlay('du-de', ['A', 'A', 'A', 'A']), rhPlay('du-a', ['H', 'H'])] },
      { t: 'example', title: 'Rhythmen sprechen', lines: ['Lies den Rhythmus und sprich die Silben: *du du-de du-a*.', 'Dann hör ihn dir an und klopf mit.'],
        visual: rh(['V', 'A', 'H', 'A', 'A', 'V', 'V']), play: [rhPlay('Anhören', ['V', 'A', 'H', 'A', 'A', 'V', 'V'])] },
      { t: 'rule', title: 'So geht ein Rhythmusdiktat', lines: ['1. Einmal nur *zuhören* und den Grundschlag mitklopfen.', '2. Beim 2. Hören *leise mitsprechen*: du, du-de, du-a?', '3. Aufschreiben, was du sicher weißt – dann die Lücken.', '4. Am Ende vergleichen: *Deine Lösung* anhören!'] },
      { t: 'guided', task: { gen: 'rh_lesen', level: 1 } },
      { t: 'guided', task: { gen: 'diktat', level: 1 } },
      { t: 'self', tasks: [{ gen: 'rh_lesen', level: 2 }, { gen: 'rh_hoeren', level: 1 }, { gen: 'rh_hoeren', level: 2 }, { gen: 'diktat', level: 1 }, { gen: 'rh_lesen', level: 2, params: { v: 'klopfen', pat: ['V', 'A', 'H'], alts: [], per: 4, bpm: 72, o: 0 } }] },
      { t: 'review' }
    ],
    G: [
      { t: 'explain', title: 'Hoch und tief', lines: ['*Hohe* Töne klingen hell – wie ein Vogel.', '*Tiefe* Töne klingen dunkel – wie ein Bär.', 'Auf der Tastatur: rechts = höher, links = tiefer. Im Notensystem: oben = höher.'],
        visual: S("g c' g' c'' g''", { full: true }), play: [snd('Tief → hoch', "g c' g' c'' g''"), snd('Hoch → tief', "g'' c'' g' c' g")] },
      { t: 'explain', title: 'Wohin geht die Melodie?', lines: ['Eine Melodie kann *steigen* ⬆️, *fallen* ⬇️ oder *gleich bleiben* ➡️.', 'Zeig beim Hören mit der Hand mit!', 'Kleine Schritte klingen weich, große Sprünge springen.'],
        visuals: [S("c' d' e' g'", { labels: false }), S("g' f' e' c'", { labels: false })], play: [snd('steigt', "c' d' e' g'"), snd('fällt', "g' f' e' c'")] },
      { t: 'guided', task: { gen: 'hoeher', level: 1 } },
      { t: 'self', tasks: [{ gen: 'hoeher', level: 1 }, { gen: 'hoeren_ton', level: 1 }, { gen: 'hoeher', level: 2 }, { gen: 'hoeren_ton', level: 2 }, { gen: 'hoeher', level: 2 }] },
      { t: 'review' }
    ],
    H: [
      { t: 'explain', title: 'Alle meine Entchen', lines: ['Du kennst das Lied! Hier steht es in *C-Dur*.', 'Lies mit, während es spielt: c d e f g g …', 'Die Melodie geht erst Schritt für Schritt *nach oben* und am Ende wieder *nach unten*.'],
        visual: { type: 'staff', events: ENT.events.slice(0, ENT.evIdx[16]), time: '4/4', zoom: 2.2 }, play: [{ label: '🔊 Anhören', melody: ENT.mel, bpm: 100 }] },
      { t: 'explain', title: 'Der Fingersatz', lines: ['Die Finger der rechten Hand haben Nummern: *Daumen 1*, Zeigefinger 2, Mittelfinger 3, Ringfinger 4, kleiner Finger 5.', 'Leg den *Daumen auf den Grundton* (c). Jeder Finger bekommt eine Taste: c=1, d=2, e=3, f=4, g=5.', 'So spielst du die ersten Töne, ohne die Hand zu bewegen.'],
        visual: { type: 'piano', from: 60, to: 72, labels: 'white', dots: [60, 62, 64, 65, 67] }, play: [snd('c d e f g', "c' d' e' f' g'")] },
      { t: 'explain', title: 'Entchen in A-Dur – Achtung, Kreuze!', robin: 'Jetzt beginnt das Lied auf *a*. Dafür braucht es *cis* und *fis*.', lines: ['a h *cis* d e e | *fis* fis fis fis e …', 'Das Kreuz steht nur vor der *ersten* Note im Takt – es gilt aber *bis zum Taktstrich* für alle Noten auf dieser Stelle.', 'Also heißen auch die anderen Noten im Takt *fis*, nicht f!'],
        visual: { type: 'staff', events: ENT_A.events, time: '4/4', zoom: 2.2, labels: true }, play: [{ label: '🔊 Anhören', melody: ENT_A.mel, bpm: 100 }] },
      { t: 'guided', task: { gen: 'mel_lesen', level: 2, params: { v: 'name1', id: 'entchen', key: 'A', from: 6, to: 16, i: 2, typed: false, wrong: null } } },
      { t: 'guided', task: { gen: 'mel_spielen', level: 1, params: { v: 'spielen', id: 'entchen', key: 'C', from: 0, to: 6 } } },
      { t: 'self', tasks: [{ gen: 'mel_spielen', level: 1, params: { v: 'finger', key: 'C', deg: 4, o: 1 } }, { gen: 'mel_lesen', level: 2 }, { gen: 'mel_spielen', level: 2 }, { gen: 'mel_lesen', level: 3 }, { gen: 'mel_lesen', level: 1 }] },
      { t: 'review' }
    ]
  };

  function play(app, id, from) {
    var mod = MB.model.module(id), steps = L[id], i = from || 0;
    function render() {
      MB.audio.stop();
      var st = steps[i];
      if (st.t === 'guided' || st.t === 'self') return runTasks(st);
      var dots = h('div', { class: 'dots', 'aria-hidden': 'true' }, steps.map(function (_, k) { return h('span', { class: 'dot' + (k < i ? ' done' : k === i ? ' now' : '') }); }));
      var card = h('article', { class: 'lesson card ' + st.t });
      if (st.t === 'review') {
        MB.model.module(id).skills.forEach(function (sk) { var s = app.progress.stat(sk); if (s.n) s.due = Date.now() + 20 * 3600000; });
        app.progress.save();
        app.progress.setModuleDone(id);
        var first = app.progress.claimModule(id), coins = first ? app.bonus(3, 'Modul ' + id + ' geschafft') : 0;
        card.appendChild(h('div', { class: 'end-hero' }, [app.robin('celebrating', 90), h('div', {}, [h('h2', { text: 'Modul geschafft!' }),
          h('p', { text: 'Wiederholung: Diese Themen kommen ab morgen in „Heute üben“ wieder dran – so bleiben sie im Kopf.' }),
          coins ? h('p', { class: 'end-coins' }, [U.coin(24), '+' + coins + ' Robin-Münzen']) : null])]));
        card.appendChild(h('div', { class: 'row' }, [h('button', { class: 'btn primary', type: 'button', text: 'Zu den Modulen', onclick: function () { app.go('lernen'); } }),
          h('button', { class: 'btn soft', type: 'button', text: 'Zum Start', onclick: function () { app.go('home'); } })]));
        return app.setView(h('section', { class: 'lesson-wrap' }, [h('h1', { class: 'screen-h', text: mod.icon + ' ' + mod.title }), dots, card]), { back: true });
      }
      var label = { explain: 'Erklärung', example: 'Beispiel', rule: 'Merke' }[st.t];
      card.appendChild(h('p', { class: 'kicker', text: label }));
      card.appendChild(h('div', { class: 'lesson-top' }, [h('h2', { text: st.title }), U.readButton(function () { return (st.robin ? st.robin + '. ' : '') + st.lines.join('. '); })]));
      if (st.robin) card.appendChild(U.robinSays(app.robin('normal', 56), st.robin));
      card.appendChild(h('div', { class: 'lesson-lines' }, st.lines.map(function (l) { return h('p', { rich: l }); })));
      if (st.play) card.appendChild(V.playButtons(st.play));
      var pics = st.visuals || (st.visual ? [st.visual] : []);
      if (pics.length) card.appendChild(h('div', { class: 'lesson-pics' }, pics.map(function (v) {
        var el = V.render(v);
        if (v.steps && el.piano) { var K0 = T.scaleById(st.steps || 'C'); if (st.steps) for (var k = 0; k < 7; k++) el.piano.step(T.midi(K0.notes[k]), T.midi(K0.notes[k + 1]), T.MAJOR[k] === 1 ? 'halb' : 'ganz'); else if (v.hl && v.hl.length === 2) el.piano.step(v.hl[0], v.hl[1], v.hl[1] - v.hl[0] === 1 ? 'halb' : 'ganz'); }
        return el;
      })));
      var nav = h('div', { class: 'row lesson-nav' }, [
        i > 0 ? h('button', { class: 'btn soft', type: 'button', text: '‹ Zurück', onclick: function () { i--; render(); } }) : null,
        h('button', { class: 'btn primary', type: 'button', text: 'Weiter ›', onclick: function () { i++; render(); } })]);
      card.appendChild(nav);
      app.setView(h('section', { class: 'lesson-wrap' }, [h('h1', { class: 'screen-h', text: mod.icon + ' ' + mod.title }), dots, card]), { back: true });
      setTimeout(function () { var b = nav.querySelector('.btn.primary'); if (b) b.focus({ preventScroll: true }); }, 50);
    }
    function runTasks(st) {
      var list = st.t === 'guided' ? [st.task] : st.tasks;
      var s = MB.session.create(app.progress, { mode: 'lernen', tasks: list });
      MB.practice.run(app, s, { title: mod.icon + ' ' + (st.t === 'guided' ? 'Geführte Aufgabe' : 'Jetzt du!'), guided: st.t === 'guided', after: function () { i++; render(); } });
    }
    render();
  }

  root.MB.lessons = { L: L, play: play };
})(typeof window !== 'undefined' ? window : globalThis);
