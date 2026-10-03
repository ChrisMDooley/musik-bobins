/*
 * text.js — the little markup used in task texts (*bold*, [highlight]) and text for read-aloud.
 * Read-aloud turns music signs into words: ♯ → Kreuz, ♭ → b, ♮ → Auflösungszeichen, c'' → c zweigestrichen.
 */
(function (root) {
  'use strict';
  var MARKS = { 1: ' eingestrichen', 2: ' zweigestrichen', 3: ' dreigestrichen' };
  function say(s) {
    return String(s)
      .replace(/\b([a-h]|[a-h]is|[a-h]es|es|as)('{1,3})/g, function (_, n, m) { return n + MARKS[m.length]; })
      .replace(/♯/g, ' Kreuz ').replace(/♭/g, ' b ').replace(/♮/g, ' Auflösungszeichen ')
      .replace(/[⌴∨⬆️⬇️➡️⤴️⤵️🔊]/gu, '').replace(/—\|—/g, '').replace(/\s[–—]\s/g, ', ')
      .replace(/[\[\]*]/g, '').replace(/\s+/g, ' ').trim();
  }
  function rich(s, into) {
    var doc = root.document, frag = into || doc.createDocumentFragment();
    var re = /\[([^\]]+)\]|\*([^*]+)\*/g, last = 0, m;
    s = String(s);
    while ((m = re.exec(s))) {
      if (m.index > last) frag.appendChild(doc.createTextNode(s.slice(last, m.index)));
      if (m[1]) { var q = doc.createElement('span'); q.className = 'qty'; rich(m[1], q); frag.appendChild(q); }
      else { var b = doc.createElement('b'); rich(m[2], b); frag.appendChild(b); }
      last = re.lastIndex;
    }
    if (last < s.length) frag.appendChild(doc.createTextNode(s.slice(last)));
    return frag;
  }
  function plain(s) { return String(s).replace(/[\[\]*]/g, ''); }
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  root.MB = root.MB || {};
  root.MB.text = { say: say, rich: rich, plain: plain, cap: cap };
})(typeof window !== 'undefined' ? window : globalThis);
