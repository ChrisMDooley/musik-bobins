/*
 * rb-card.js — the one line Robin's Bobins shows on Musik-Bobins' card
 * ("Noch 32 Tage bis zum Musiktest · heute 12 Aufgaben"). Loaded by the Robin's Bobins home page
 * (and the guest start page) from ../musik-bobins/rb-card.js; reads only this app's own storage.
 */
(function (root) {
  'use strict';
  function days(d) {
    var t = new Date(d + 'T08:00:00'), n = new Date();
    return Math.round((Date.UTC(t.getFullYear(), t.getMonth(), t.getDate()) - Date.UTC(n.getFullYear(), n.getMonth(), n.getDate())) / 86400000);
  }
  root.RBMusik = {
    cardInfo: function (childId) {
      var doc = null;
      try { doc = JSON.parse(localStorage.getItem('musik-bobins:' + childId) || 'null'); } catch (e) { doc = null; }
      var st = (doc && doc.settings) || {}, goal = st.goalDate || '2026-11-04', label = st.goalLabel || 'Musiktest';
      var today = new Date().toDateString(), parts = [];
      var n = doc ? doc.log.filter(function (a) { return new Date(a.ts).toDateString() === today; }).length : 0;
      var d = days(goal);
      if (d > 1) parts.push('Noch ' + d + ' Tage bis ' + (label === 'Musiktest' ? 'zum Musiktest' : 'zur ' + label));
      else if (d === 1) parts.push('Morgen: ' + label);
      if (n) parts.push('heute ' + n + (n === 1 ? ' Aufgabe' : ' Aufgaben'));
      return parts.join(' · ') || 'Noten, Klavier, Tonleitern & Rhythmus';
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
