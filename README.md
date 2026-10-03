# Musik-Bobins ♫

Lukas's music trainer for the Musiktest on **4.11.2026** (Violinschlüssel, Klaviertastatur, Ganz- und
Halbton, Dur-Tonleiter, Versetzungszeichen, Rhythmus, Hören, Melodien). Always
**SEHEN → HÖREN → VERSTEHEN → ANWENDEN**: every note can be heard, every answer is shown on the staff
and the keyboard afterwards, and each topic is taught before it is tested. German names with **H**
(h, b = h with ♭), never "hes".

Part of the **Robin's Bobins** family, but its own app: own code, own tests, own site.

- Live: https://chrismdooley.github.io/musik-bobins/ (from Robin's Bobins: Lukas → Musik-Bobins;
  for a classmate: the guest start page `…/robins-bobins/gast/?name=<Name>`)
- Runs on its own too: `python3 -m http.server` in the folder above and open `musik-bobins/`.

## What Lukas can do

| | |
|---|---|
| ▶ **Heute üben** | 11 tasks (~10–15 min): 2 Noten lesen · 2 Tastatur · 2 Ganz-/Halbton & Tonleiter · 2 Rhythmus · 1 Hören · 1 Versetzungszeichen · 1 challenge. Due reviews first (spaced repetition). |
| 📘 **Lernen** A–H | Notenlesen · Tastatur · Ganzton/Halbton · Versetzungszeichen ♯ ♭ ♮ · Dur-Tonleiter · Rhythmus (du, du-de, du-a) · Hören · Melodien. Each: Erklärung with picture and 🔊 → Merke → geführte Aufgabe → selbst → Wiederholung. |
| 🔁 Üben | an area (Noten lesen, Klavier, Hörtraining, Rhythmus, Tonleitern, Versetzungszeichen, Melodien) or one skill |
| ⚡ Schnelltraining | 10 short tasks; stopwatch only if he wants it |
| ✍️ Rhythmusdiktat | hear (limited replays), build the rhythm from blocks; on a mistake the wrong beat turns red, "Deine Lösung" and the dictation can be played to compare |
| 📝 Prüfungstraining | 17 mixed tasks, no help, no feedback until the end, then "Fehler verbessern" |
| 🎯 Fehlertraining | his own mistakes again (exact task first, then similar ones) |
| 🎹 Klavier-Entdecker | tap a key: sound, name(s) with octave marks, both spellings on the staff |
| 🐤 Melodien | Alle meine Entchen in C, F, A, Es and the beginning of Grieg's Morgenstimmung: listen with the notes lighting up, show/hide names, play along on the keyboard, fingering |

Answer types: letter buttons, typed names with a name pad (c … h, -is, -es, -s, b, '), tap a line/space on
the staff, tap a key, both names of a black key, Ganz/Halb between scale notes, build a scale by tapping
notes (♮ → ♯ → ♭, steps update live, listen to it), pick the heard notation, rhythm blocks, tap on a drum,
names under a melody, "which note sounds wrong?", play a melody on the keyboard.

**Hilf mir**: 4 graduated hints, then the solution. **Wrong answers** are explained by the likely
mistake, tracked separately: Note eine Stufe daneben, Linie/Zwischenraum, Oktave, falsche Taste,
Ganz-/Halbton verwechselt, Tonleiter-Muster, *Versetzungszeichen übersehen (c statt cis)*, Kreuz/b
verwechselt, -is/-es-Endung, *zweiter Name einer Taste (fis = ges, not cis)*, *gilt bis zum Taktstrich*,
Rhythmus, Notenwert, Begriff. The weak spots seen on Lukas's worksheets get extra tasks and exact feedback.

## Curriculum & decisions

From Lukas's worksheets (Violinschlüssel, Tastatur kleines g … c''', Ganz-/Halbton, Dur-Tonleiter C/F/A/Es,
Versetzungszeichen, Rhythmusdiktat, Alle meine Entchen, Morgenstimmung). Original tasks, nothing copied.
- Scales: C, F, A, Es (core) + G, D, B (extra, harder level).
- Exact names with octave marks (g, c', c'', c''') only at the harder levels.
- Rhythm syllables: du (Viertel), du-de (Doppelachtel), du-a (Halbe), du-a-a-a (Ganze, only in reading); no rests.
- Accidentals are written once per bar, like on the worksheets: they last to the bar line, ♮ cancels.
- Countdown: 4.11.2026 (Musiktest), changeable in the parent area.

## Code

```
js/theory.js   PITCH (MIDI) separate from SPELLING {s, a, o}; German names from a fixed table; staff positions,
               keys, scales from the pattern Ganz-Ganz-Halb-Ganz-Ganz-Ganz-Halb, accidentals to the bar line
js/rhythm.js   note values, syllables, onsets, beat-by-beat comparison, tapping check
js/audio.js    all sound made in the browser (Web Audio), exact pitches, no sound files
js/glyphs.js   music symbols (Bravura, SIL OFL)   js/staff.js  SVG staff   js/piano.js  SVG keyboard
js/gens.js     generators: Noten lesen, Tastatur, Ganz/Halbton, Dur, Versetzungszeichen
js/gens2.js    generators: Hören, Rhythmus, Melodien (Entchen, Morgenstimmung), Fingersatz
js/model.js    22 skills, error types, modules    js/progress.js  mastery, levels, spaced repetition, coins
js/session.js  which task next (all modes)        js/practice.js  task runner (sounds, hints, feedback, reveal)
js/vis.js      pictures + 🔊 buttons   js/widgets.js answer inputs   js/lessons.js modules A–H
js/screens.js  home, menus, Klavier-Entdecker, Melodien, parent page   js/app.js routing, coins
js/platform.js the only contact with Robin's Bobins (family or guest)   rb-card.js  line on the card
```

Tests: `node tests/theory.test.js` (names, keys, enharmonics, scales, rhythm) · `node tests/gens.test.js`
(≈400k checks: every generator × level, right answer accepted, wrong answers explained, rebuild from
params, all sounds on the keyboard range) · `node tests/logic.test.js` (sessions, coins, simulated learner)
· `python3 tests/e2e.py <shots-dir> [--with-platform]` (Chromium: lessons, all modes, real taps on keys,
staff and drum, dictation comparison, exam, parent page, phone layout, guest).

## Robin's Bobins

- Listed in `robins-bobins/apps/registry.js` (`url: '../musik-bobins/'`, granted to Lukas) and in
  `robins-bobins/shared/guest.js` for guests (Nuka).
- **Robin-Münzen** on the family balance (app `musik`): 1 per task (also with hints), +1 for correcting a
  mistake himself, +1 per 5 right in a row, +5 Heute üben, +4 Fehlertraining, +3 other rounds, +3 per
  module (once), +5 when a topic becomes "sicher" (once). No farming: easy tasks of a "sicher" topic pay
  nothing; per-task coins are capped at 60 a day.
- Progress: `localStorage['musik-bobins:<child>']` on this device.
- Parent page (family PIN; guest PIN for a guest): time, tasks, % right at first try, corrections, hints,
  state per topic, recurring mistakes, last 7 days, countdown date, OpenDyslexic, read-aloud speed.
