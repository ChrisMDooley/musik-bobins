/*
 * ui.js — small DOM helpers shared by all screens.
 */
(function (root) {
  'use strict';
  var T = root.MB.text;

  function h(tag, attrs, kids) {
    var e = document.createElement(tag);
    attrs = attrs || {};
    for (var k in attrs) {
      var v = attrs[k];
      if (v == null || v === false) continue;
      if (k === 'class') e.className = v;
      else if (k === 'text') e.textContent = v;
      else if (k === 'rich') e.appendChild(T.rich(v));
      else if (k.indexOf('on') === 0 && typeof v === 'function') e.addEventListener(k.slice(2), v);
      else e.setAttribute(k, v === true ? '' : v);
    }
    (kids || []).forEach(function (c) { if (c != null && c !== false) e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return e;
  }

  var settingsRef = null;
  function speak(text) {
    var st = settingsRef ? settingsRef() : {};
    return root.MB.speech.speak(T.say(text), { slow: true, slowRate: st.slowRate || 0.8, voiceName: st.voice || '' });
  }
  // "🔊 Vorlesen" for a task text
  function readButton(getText, label) {
    return h('button', { class: 'btn soft read', type: 'button', 'aria-label': 'Aufgabe vorlesen', onclick: function () { speak(typeof getText === 'function' ? getText() : getText); } }, [label || '🔊 Vorlesen']);
  }
  function robinSays(robinEl, text, cls) {
    return h('div', { class: 'robin-says ' + (cls || '') }, [robinEl, h('p', { class: 'bubble', rich: text })]);
  }
  function coin(size) { var c = h('span', { class: 'bb-coin', 'aria-hidden': 'true' }); if (size) c.style.width = c.style.height = size + 'px'; return c; }
  function coinFloat(anchor, n) {
    if (!anchor || !anchor.getBoundingClientRect || !n) return;
    var r = anchor.getBoundingClientRect(), f = h('div', { class: 'coin-float' }, [coin(22), h('span', { text: '+' + n })]);
    f.style.left = Math.round(r.left + r.width / 2) + 'px'; f.style.top = Math.round(r.top + 6) + 'px';
    document.body.appendChild(f); setTimeout(function () { f.remove(); }, 1100);
  }
  // simple modal; returns close()
  function modal(title, body, opts) {
    opts = opts || {};
    var close, box = h('div', { class: 'modal ' + (opts.cls || ''), role: 'dialog', 'aria-modal': 'true', 'aria-label': title }, [
      h('div', { class: 'modal-head' }, [h('h2', { text: title }), h('button', { class: 'link modal-x', type: 'button', 'aria-label': 'Schließen', text: '✕', onclick: function () { close(); } })]),
      body]);
    var back = h('div', { class: 'modal-back', onclick: function (e) { if (e.target === back) close(); } }, [box]);
    close = function () { back.remove(); document.removeEventListener('keydown', esc); if (opts.onClose) opts.onClose(); };
    function esc(e) { if (e.key === 'Escape') close(); }
    document.addEventListener('keydown', esc);
    document.body.appendChild(back);
    var f = box.querySelector('button, input'); if (f) setTimeout(function () { f.focus(); }, 30);
    return close;
  }
  function bar(v) { var pct = Math.round(Math.max(0, Math.min(1, v || 0)) * 100); return h('span', { class: 'mbar' }, [h('span', { class: 'mbar-fill', style: 'width:' + pct + '%' })]); }

  root.MB.ui = { h: h, speak: speak, readButton: readButton, robinSays: robinSays, coin: coin, coinFloat: coinFloat, modal: modal, bar: bar,
                 useSettings: function (fn) { settingsRef = fn; } };
})(typeof window !== 'undefined' ? window : globalThis);
