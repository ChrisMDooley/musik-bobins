// Loads the app's logic files (no DOM) into one context for node tests.
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
const FILES = ['js/theory.js', 'js/rhythm.js', 'js/text.js', 'js/model.js', 'js/gens.js', 'js/gens2.js', 'js/progress.js', 'js/session.js'];
module.exports = function load() {
  const store = {};
  const ctx = { console, Math, Date, JSON, Object, Array, String, Number, Error, Set, isNaN, isFinite, parseInt, parseFloat,
    localStorage: { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } } };
  ctx.window = ctx; ctx.globalThis = ctx; vm.createContext(ctx);
  FILES.forEach(f => { if (fs.existsSync(path.join(ROOT, f))) vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename: f }); });
  return ctx;
};
