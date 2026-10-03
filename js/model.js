/*
 * model.js — skills, error types, learning modules. No DOM.
 */
(function (root) {
  'use strict';

  var SKILLS = [
    { id: 'lesen',        label: 'Noten im Violinschlüssel erkennen', group: 'Noten lesen' },
    { id: 'setzen',       label: 'Noten ins System setzen',           group: 'Noten lesen' },
    { id: 'oktave',       label: 'Genaue Tonnamen (c\', c\'\' …)',    group: 'Noten lesen' },
    { id: 'taste',        label: 'Ton auf der Tastatur finden',       group: 'Tastatur' },
    { id: 'note_taste',   label: 'Note → Taste spielen',              group: 'Tastatur' },
    { id: 'taste_name',   label: 'Taste → Tonname',                   group: 'Tastatur' },
    { id: 'ganzhalb',     label: 'Ganzton / Halbton unterscheiden',   group: 'Tonleitern' },
    { id: 'dur',          label: 'Dur-Tonleiter verstehen',           group: 'Tonleitern' },
    { id: 'dur_bauen',    label: 'Dur-Tonleiter aufbauen',            group: 'Tonleitern' },
    { id: 'kreuz',        label: 'Kreuz (♯) verstehen',               group: 'Versetzungszeichen' },
    { id: 'bzeichen',     label: 'b (♭) verstehen',                   group: 'Versetzungszeichen' },
    { id: 'aufloesung',   label: 'Auflösungszeichen (♮) & Taktstrich', group: 'Versetzungszeichen' },
    { id: 'namen_is',     label: 'Erhöhte Töne benennen (-is)',       group: 'Versetzungszeichen' },
    { id: 'namen_es',     label: 'Erniedrigte Töne benennen (-es, b)', group: 'Versetzungszeichen' },
    { id: 'enharmonisch', label: 'Zwei Namen für eine Taste',          group: 'Versetzungszeichen' },
    { id: 'hoeher',       label: 'Höher / tiefer hören',              group: 'Hören' },
    { id: 'hoeren_ton',   label: 'Töne erkennen (hören)',             group: 'Hören' },
    { id: 'rh_lesen',     label: 'Rhythmus lesen',                    group: 'Rhythmus' },
    { id: 'rh_hoeren',    label: 'Rhythmus hören',                    group: 'Rhythmus' },
    { id: 'diktat',       label: 'Rhythmusdiktat',                    group: 'Rhythmus' },
    { id: 'mel_lesen',    label: 'Melodie lesen',                     group: 'Melodien' },
    { id: 'mel_spielen',  label: 'Melodie spielen',                   group: 'Melodien' }
  ];

  var ERRORS = {
    nachbar:   { label: 'Note eine Stufe daneben gelesen',      say: 'Noten werden manchmal eine Stufe zu hoch oder zu tief gelesen' },
    linie:     { label: 'Linie und Zwischenraum verwechselt',   say: 'Linie und Zwischenraum werden manchmal verwechselt' },
    lesen:     { label: 'Note falsch gelesen',                  say: 'Beim Notenlesen passieren noch Fehler' },
    oktave:    { label: 'Oktave / Striche falsch',              say: 'Die Oktavstriche (c\', c\'\') stimmen noch nicht immer' },
    taste:     { label: 'falsche Taste',                        say: 'Töne werden auf der Tastatur manchmal verwechselt' },
    schritt:   { label: 'Ganzton/Halbton verwechselt',          say: 'Ganz- und Halbtonschritte werden manchmal verwechselt (Tipp: schwarze Taste dazwischen?)' },
    leiter:    { label: 'Tonleiter-Muster nicht angewendet',    say: 'Beim Aufbau von Tonleitern wird das Muster Ganz-Ganz-Halb-Ganz-Ganz-Ganz-Halb noch nicht sicher angewendet' },
    vorz_vergessen: { label: 'Versetzungszeichen nicht beachtet', say: 'Versetzungszeichen werden beim Benennen manchmal übersehen (z. B. c statt cis)' },
    richtung:  { label: 'Kreuz und b verwechselt',              say: 'Kreuz (erhöhen) und b (erniedrigen) werden manchmal verwechselt' },
    endung:    { label: 'Endung -is/-es falsch',                say: 'Die Namen mit -is/-es (es, as, b …) sind noch nicht sicher' },
    enharm:    { label: 'zweiten Namen einer Taste falsch',     say: 'Der zweite Name einer schwarzen Taste stimmt manchmal nicht (z. B. fis = ges)' },
    takt:      { label: 'Gültigkeit bis zum Taktstrich',        say: 'Dass Versetzungszeichen bis zum Taktstrich gelten, wird manchmal vergessen' },
    hoeren:    { label: 'falsch gehört',                        say: 'Beim Hören von Tonhöhen passieren noch Fehler' },
    rhythmus:  { label: 'Rhythmus falsch',                      say: 'Rhythmen werden noch nicht immer sicher erkannt' },
    wert:      { label: 'Notenwert verwechselt',                say: 'Notenwerte (Viertel, Halbe, Doppelachtel) werden manchmal verwechselt' },
    begriff:   { label: 'Begriff verwechselt',                  say: 'Fachbegriffe werden manchmal verwechselt' },
    other:     { label: 'anderer Fehler',                       say: 'Verschiedene andere Fehler' }
  };

  var MODULES = [
    { id: 'A', title: 'Notenlesen im Violinschlüssel', icon: '🎼', skills: ['lesen', 'setzen', 'oktave'] },
    { id: 'B', title: 'Noten auf der Tastatur',        icon: '🎹', skills: ['taste', 'note_taste', 'taste_name'] },
    { id: 'C', title: 'Ganzton und Halbton',           icon: '⌴', skills: ['ganzhalb'] },
    { id: 'D', title: 'Versetzungszeichen ♯ ♭ ♮',      icon: '♯', skills: ['kreuz', 'bzeichen', 'aufloesung', 'namen_is', 'namen_es', 'enharmonisch'] },
    { id: 'E', title: 'Die Dur-Tonleiter',             icon: '🎶', skills: ['dur', 'dur_bauen'] },
    { id: 'F', title: 'Rhythmus: du, du-de, du-a',     icon: '🥁', skills: ['rh_lesen', 'rh_hoeren', 'diktat'] },
    { id: 'G', title: 'Hören: höher oder tiefer?',     icon: '👂', skills: ['hoeher', 'hoeren_ton'] },
    { id: 'H', title: 'Melodien lesen und spielen',    icon: '🐤', skills: ['mel_lesen', 'mel_spielen'] }
  ];

  var byId = {}; SKILLS.forEach(function (s) { byId[s.id] = s; });
  var modById = {}; MODULES.forEach(function (m) { modById[m.id] = m; });
  root.MB = root.MB || {};
  root.MB.model = { SKILLS: SKILLS, ERRORS: ERRORS, MODULES: MODULES, skill: function (id) { return byId[id]; }, module: function (id) { return modById[id]; } };
})(typeof window !== 'undefined' ? window : globalThis);
