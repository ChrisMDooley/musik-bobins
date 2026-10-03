"""
Musik-Bobins in a real browser (headless Chromium): lessons A–H, all practice modes, real taps on the keyboard
and the staff, wrong answers with explained mistakes, hints, the Rhythmusdiktat comparison, sounds, the
Klavier-Entdecker, play-along melodies, Prüfungstraining → Fehler verbessern, coins, parent page, phone layout;
with --with-platform also the launch from Robin's Bobins and the guest start page.

  python3 tests/e2e.py <shots-dir> [--with-platform]
  (set RB_TEST_PIN for the family parent PIN, MB_GUEST_PIN for the guest parent PIN)
"""
import http.server, threading, functools, os, sys, re
from playwright.sync_api import sync_playwright

args = [a for a in sys.argv[1:] if not a.startswith('--')]
OUT = args[0] if args else os.path.join(os.path.dirname(os.path.abspath(__file__)), 'shots')
os.makedirs(OUT, exist_ok=True)
APP = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
platform = '--with-platform' in sys.argv
ROOT = os.path.dirname(APP)

class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Quiet, directory=ROOT))
threading.Thread(target=srv.serve_forever, daemon=True).start()
PORT = srv.server_address[1]
BASE = 'http://127.0.0.1:%d/' % PORT
URL = BASE + os.path.basename(APP) + '/index.html'
UNLOCK = "try { localStorage.setItem('rb:gate', 'c623d5d8fdd2353ef1861b66169370d4a168aeb62f94cf63e08da88cddb06639'); } catch (e) {}"
MOCK_SPEECH = """
  window.__spoken = [];
  (function () {
    var fake = { getVoices: function () { return [{ name: 'Anna', lang: 'de-DE', localService: true }]; }, speak: function (u) { window.__spoken.push(u.text); setTimeout(function () { u.onend && u.onend(); }, 5); }, cancel: function () {}, speaking: false, addEventListener: function () {} };
    Object.defineProperty(window, 'speechSynthesis', { value: fake, configurable: true });
    window.SpeechSynthesisUtterance = function (t) { this.text = t; };
  })();
"""
passed, failed = 0, 0
def check(cond, msg, info=''):
    global passed, failed
    if cond: passed += 1
    else: failed += 1; print('  FAIL', msg, ' → ', str(info)[:300])

def cur(pg):
    return pg.evaluate("""() => { const s = window.__mbTest && window.__mbTest(); if (!s) return null;
      return { gen: s.task.gen, skill: s.task.skill, type: s.task.answer.type, prompt: s.task.prompt, level: s.task.level }; }""")
def fill_right(pg):
    return pg.evaluate("""() => { const s = window.__mbTest(), a = s.task.answer;
      if (a.type === 'tap') { s.widget.__taps = true; return false; }
      s.widget.fill(MB.widgets.keyOf(a)); return true; }""")
def fill_wrong(pg):
    pg.evaluate("""() => { const s = window.__mbTest(), a = s.task.answer, k = MB.widgets.keyOf(a), T = MB.theory;
      const other = n => MB.gens.LETTERS[(T.parseName(n.replace(/'+$/, '')).s + 1) % 7];
      let w;
      switch (a.type) {
        case 'choice': case 'staffs': w = { id: a.options.find(o => o.id !== a.correct).id }; break;
        case 'name': w = { text: other(a.value) + (a.marks ? (a.value.match(/'+$/) || [''])[0] : '') }; break;
        case 'place': w = { p: a.value + 1 }; break;
        case 'piano': w = { m: a.value + 1 }; break;
        case 'two': w = { a: a.a.options.find(x => x !== a.a.value), b: a.b.value }; break;
        case 'gaps': w = { list: a.value.map((x, i) => i ? x : (x === 'ganz' ? 'halb' : 'ganz')) }; break;
        case 'build': w = { accs: a.value.map((x, i) => i === 1 ? (x ? 0 : 1) : x) }; break;
        case 'rhythm': { const p = a.value.slice(), i = p.findIndex(c => c === 'V' || c === 'A'); if (i >= 0) p[i] = p[i] === 'V' ? 'A' : 'V'; else p.splice(0, 1, 'V', 'V'); w = { pattern: p }; break; }
        case 'names': w = { list: a.value.map((x, i) => i ? x : other(x)) }; break;
        case 'pickNote': w = { i: (a.value + 1) % a.count }; break;
        case 'pianoSeq': w = { seq: a.value.map((m, i) => i ? m : m + 1) }; break;
      }
      s.widget.fill(w); }""")
def tap_rhythm(pg):
    """Real taps on the drum, on time."""
    on = pg.evaluate("() => { const a = window.__mbTest().task.answer; return MB.rhythm.onsets(a.pattern).map(b => b * 60 / a.bpm); }")
    box = pg.locator('.drum').bounding_box()
    last = 0
    for t in on:
        pg.wait_for_timeout(int((t - last) * 1000)); last = t
        pg.mouse.move(box['x'] + box['width'] / 2, box['y'] + box['height'] / 2); pg.mouse.down(); pg.mouse.up()
def solve(pg, how='right'):
    c = cur(pg)
    if not c: return 'done'
    if how == 'wrong-first' and c['type'] != 'tap':
        fill_wrong(pg); pg.click('.run .check'); pg.wait_for_timeout(60)
        check(pg.locator('.fb-box.no').count() == 1, 'wrong answer → explanation', c['gen'])
    if c['type'] == 'tap': tap_rhythm(pg)
    else: fill_right(pg)
    if pg.locator('.run .check').is_visible(): pg.click('.run .check')
    pg.wait_for_timeout(60)
    fb = 'ok' if pg.locator('.fb-box.ok').count() else 'no' if pg.locator('.fb-box.no').count() else 'none'
    return fb
def next_btn(pg):
    if pg.locator('.next').count(): pg.click('.next'); pg.wait_for_timeout(80)
def run_round(pg, how='right', shot=None, maxn=30):
    n, fbs = 0, []
    for i in range(maxn):
        c = cur(pg)
        if not c: break
        if shot and i < 2: pg.screenshot(path='%s/%s_%d.png' % (OUT, shot, i), full_page=True)
        fbs.append((c['gen'], solve(pg, how)))
        n += 1
        if pg.locator('.next').count(): pg.click('.next')
        else:     # exam: no feedback, the next task comes at once
            pass
        pg.wait_for_timeout(70)
    return n, fbs

with sync_playwright() as p:
    br = p.chromium.launch()
    ctx = br.new_context(viewport={'width': 1100, 'height': 900})
    ctx.add_init_script(UNLOCK); ctx.add_init_script(MOCK_SPEECH)
    pg = ctx.new_page()
    errors = []
    pg.on('pageerror', lambda e: errors.append(str(e)))
    pg.on('console', lambda m: errors.append(m.text) if m.type == 'error' and 'Failed to load resource' not in m.text else None)
    pg.goto(URL + '?child=lukas'); pg.wait_for_selector('.home')

    # ---- home
    txt = pg.inner_text('.home')
    check('Hallo' in txt and re.search(r'Noch \d+ Tage bis zum Musiktest|Morgen ist Musiktest|Heute ist Musiktest', txt), 'home: greeting + countdown to the Musiktest', txt[:200])
    check(pg.locator('[data-module]').count() == 8, 'home: 8 modules')
    pg.screenshot(path=OUT + '/01_home.png', full_page=True)

    # ---- lessons A–H
    for mid in 'ABCDEFGH':
        pg.goto(URL + '?child=lukas#/lernen/' + mid); pg.wait_for_selector('.lesson-wrap, .run')
        steps = 0
        for _ in range(60):
            if pg.locator('.run').count() and cur(pg):
                run_round(pg); continue
            if pg.locator('.lesson.review').count() or 'Modul geschafft' in pg.inner_text('#main'): break
            if mid in 'DEF' and steps == 0: pg.screenshot(path='%s/02_lesson_%s.png' % (OUT, mid), full_page=True)
            if pg.locator('.lesson .play-row .btn').count():
                before = pg.evaluate('window.__mbPlayed.length'); pg.locator('.lesson .play-row .btn').first.click(); pg.wait_for_timeout(50)
                check(pg.evaluate('window.__mbPlayed.length') > before, 'lesson %s: 🔊 plays' % mid)
            nb = pg.locator('.lesson-nav .btn.primary')
            if nb.count(): nb.click(); steps += 1; pg.wait_for_timeout(60)
            else: pg.wait_for_timeout(100)
        check('Modul geschafft' in pg.inner_text('#main'), 'lesson %s completes' % mid, pg.inner_text('#main')[:200])
    check(pg.evaluate("Object.keys(MB.app.progress.doc.modules).length") == 8, 'all 8 modules marked done')

    # ---- Heute üben
    pg.goto(URL + '?child=lukas'); pg.wait_for_selector('.home')
    pg.click('[data-menu=heute]'); pg.wait_for_selector('.run')
    n, fbs = run_round(pg, 'right', shot='03_heute')
    check(n == 11 and all(f == 'ok' for _, f in fbs), 'Heute üben: 11 tasks solved', fbs)
    check('Geschafft für heute' in pg.inner_text('#main'), 'Heute üben end screen')
    pg.screenshot(path=OUT + '/04_heute_end.png', full_page=True)

    # ---- every area, wrong first (explanations, corrections)
    for mode in ['lesen', 'klavier', 'hoeren', 'rhythmus', 'tonleitern', 'vorzeichen', 'melodie', 'schnell']:
        pg.goto(URL + '?child=lukas#/start/' + mode); pg.wait_for_selector('.run')
        n, fbs = run_round(pg, 'wrong-first', shot='05_' + mode)
        check(n >= 10 and all(f == 'ok' for _, f in fbs), mode + ': round with corrections', fbs)

    # ---- real input: piano key, staff placement, name pad
    def start_task(gen, level, params):
        pg.evaluate("""([g, lv, pa]) => { const s = MB.session.create(MB.app.progress, { mode: 'lernen', tasks: [{ gen: g, level: lv, params: pa }] }); MB.practice.run(MB.app, s, { title: 'Test' }); }""", [gen, level, params])
        pg.wait_for_timeout(120)
    start_task('taste', 1, {'m': 64, 'which': 0, 'exact': False})
    pt = pg.evaluate("() => window.__mbTest().widget.piano.keyPoint(65)")
    pg.mouse.click(pt['x'], pt['y']); pg.click('.run .check'); pg.wait_for_timeout(60)
    check('Das war *f*' not in pg.inner_text('.feedback') and 'f' in pg.inner_text('.feedback') and pg.locator('.fb-box.no').count(), 'piano: wrong key f for e explained', pg.inner_text('.feedback'))
    pt = pg.evaluate("() => window.__mbTest().widget.piano.keyPoint(64)")
    pg.mouse.click(pt['x'], pt['y']); pg.click('.run .check'); pg.wait_for_timeout(60)
    check(pg.locator('.fb-box.ok').count() == 1, 'piano: real tap on e accepted')
    check(pg.locator('.feedback .key.right').count() >= 0, 'reveal')
    start_task('setzen', 1, {'p': 2, 'exact': False})
    pt = pg.evaluate("() => window.__mbTest().widget.staff.clickPos(2)")
    pg.mouse.click(pt['x'], pt['y']); pg.click('.run .check'); pg.wait_for_timeout(60)
    check(pg.locator('.fb-box.ok').count() == 1, 'staff: real tap on the 2nd line = g accepted', pg.inner_text('.feedback'))
    start_task('namen_is', 2, {'p': -2, 'typed': True})
    pg.click('.pad-key >> text="c"'); pg.click('.run .check'); pg.wait_for_timeout(60)
    fbt = pg.inner_text('.feedback')
    check('Versetzungszeichen' in fbt and 'cis' in fbt, 'c for cis → "Achtung, das Versetzungszeichen!"', fbt)
    pg.click('.pad-key >> text="-is"'); pg.click('.run .check'); pg.wait_for_timeout(60)
    check(pg.locator('.fb-box.ok').count() == 1, 'name pad: c + -is = cis accepted')
    pg.screenshot(path=OUT + '/06_namen_is.png', full_page=True)
    start_task('enharmonisch', 1, {'m': 66})
    pg.click('.ans-two .chip >> text="fis"'); pg.click('.ans-two .chip >> text="des"'); pg.click('.run .check'); pg.wait_for_timeout(60)
    check('von oben' in pg.inner_text('.feedback'), 'fis/des explained (b-name from above)')
    # build a scale by tapping notes
    start_task('dur_bauen', 2, {'k': 'A'})
    for k, times in ((2, 1), (5, 1), (6, 1)):
        for _ in range(times):
            pg.locator('.ans-build .ev[data-i="%d"]' % k).click(); pg.wait_for_timeout(40)
    pg.click('.run .check'); pg.wait_for_timeout(60)
    check(pg.locator('.fb-box.ok').count() == 1, 'A-Dur built by tapping cis, fis, gis', pg.inner_text('.feedback'))
    pg.screenshot(path=OUT + '/07_dur_bauen.png', full_page=True)
    # Rhythmusdiktat: build with buttons, wrong → bad beats marked + compare buttons
    start_task('diktat', 2, {'pat': ['V', 'A', 'H', 'A', 'A', 'V', 'V'], 'per': 4, 'bars': 2, 'codes': ['V', 'A', 'H'], 'bpm': 80, 'max': 4})
    plays = pg.evaluate('window.__mbPlayed.length'); pg.click('.play-row .btn'); pg.wait_for_timeout(50)
    check(pg.evaluate('window.__mbPlayed.length') > plays and '(3×)' in pg.inner_text('.play-row'), 'dictation plays; replays counted')
    for c in ['Viertel', '2 Achtel', 'Viertel', 'Viertel', '2 Achtel', '2 Achtel', 'Viertel', 'Viertel']:
        pg.click('.rh-key >> text=' + c); pg.wait_for_timeout(20)
    pg.click('.run .check'); pg.wait_for_timeout(80)
    check(pg.locator('.ans-rhythm .ev.bad').count() >= 1 and pg.locator('.compare .btn').count() == 2, 'dictation: wrong beat marked red, both versions playable', pg.inner_text('.feedback'))
    check('Schlag 4' in pg.inner_text('.feedback'), 'dictation: names the beat', pg.inner_text('.feedback'))
    pg.screenshot(path=OUT + '/08_diktat_wrong.png', full_page=True)
    # tapping on the drum
    start_task('rh_lesen', 2, {'v': 'klopfen', 'pat': ['V', 'A', 'H'], 'alts': [], 'per': 4, 'bpm': 72, 'o': 0})
    tap_rhythm(pg); pg.click('.run .check'); pg.wait_for_timeout(60)
    check(pg.locator('.fb-box.ok').count() == 1, 'drum taps on time accepted', pg.inner_text('.feedback'))
    # melody on the keyboard with real taps
    start_task('mel_spielen', 1, {'v': 'spielen', 'id': 'entchen', 'key': 'C', 'from': 0, 'to': 6})
    for m in [60, 62, 64, 65, 67, 67]:
        pt = pg.evaluate("(m) => window.__mbTest().widget.piano.keyPoint(m)", m); pg.mouse.click(pt['x'], pt['y']); pg.wait_for_timeout(30)
    pg.wait_for_timeout(450)
    check(pg.locator('.fb-box.ok').count() == 1, 'Entchen played on the keyboard (auto-check)', pg.inner_text('.feedback'))
    # hints → solution
    start_task('lesen', 1, {'p': 2, 'typed': False})
    for i in range(4): pg.click('.help'); pg.wait_for_timeout(30)
    check('Robin-Tipp 4' in pg.inner_text('.hints'), '4 graduated hints')
    pg.click('.help'); pg.wait_for_timeout(60)
    check(pg.locator('.fb-box.sol').count() == 1 and pg.locator('.staff-svg .band').count() >= 1, 'solution shown with the line marked')

    # ---- Prüfung → Fehler verbessern
    pg.goto(URL + '?child=lukas#/start/pruefung'); pg.wait_for_selector('.run')
    k = 0
    for i in range(30):
        c = cur(pg)
        if not c: break
        check(pg.locator('.help').count() == 0, 'exam: no help button')
        if c['type'] == 'tap': tap_rhythm(pg)
        elif k < 3: fill_wrong(pg)
        else: fill_right(pg)
        k += 1; pg.click('.run .check'); pg.wait_for_timeout(60)
    txt = pg.inner_text('#main')
    check(re.search(r'\d+ von 17 richtig', txt), 'exam result', txt[:200])
    pg.screenshot(path=OUT + '/09_pruefung.png', full_page=True)
    pg.click('text=Fehler verbessern'); pg.wait_for_timeout(100)
    n, fbs = run_round(pg)
    check(n >= 2 and all(f == 'ok' for _, f in fbs), 'Fehler verbessern after the exam', fbs)

    # ---- Fehlertraining
    pg.goto(URL + '?child=lukas#/start/fehler'); pg.wait_for_selector('#main section')
    n, fbs = run_round(pg)
    check(n >= 1, 'Fehlertraining runs', n)

    # ---- Klavier-Entdecker, Melodien
    pg.goto(URL + '?child=lukas#/klavier'); pg.wait_for_selector('.klavier')
    pt = pg.evaluate("() => { const r = document.querySelector('.key[data-m=\"66\"] rect').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }")
    pg.mouse.click(pt['x'], pt['y']); pg.wait_for_timeout(60)
    check("fis' = ges'" in pg.inner_text('.kl-name'), 'Klavier-Entdecker: fis\' = ges\'', pg.inner_text('.kl-info'))
    pg.screenshot(path=OUT + '/10_klavier.png', full_page=True)
    pg.goto(URL + '?child=lukas#/melodien'); pg.wait_for_selector('.melodien')
    pg.click('[data-key=A]'); pg.click('[data-act=along]'); pg.wait_for_timeout(60)
    mids = pg.evaluate("MB.gens.melody('entchen', 'A').midis")
    pt = pg.evaluate("() => { const r = document.querySelector('.mel-box .key[data-m=\"72\"] rect').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height * .8 }; }")
    for m in mids[:3]:
        if m == 73:   # first try the "c" (the worksheet mistake)
            pg.mouse.click(pt['x'], pt['y']); pg.wait_for_timeout(30)
            check('cis' not in pg.inner_text('.mel-box') or 'Gesucht' in pg.inner_text('.mel-box'), 'play-along: wrong key answered')
        q = pg.evaluate("(m) => { const r = document.querySelector('.mel-box .key[data-m=\"' + m + '\"] rect').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height * (MB.theory.isBlack(m) ? .5 : .8) }; }", m)
        pg.mouse.click(q['x'], q['y']); pg.wait_for_timeout(30)
    check(pg.locator('.mel-staff .ev.done').count() == 3, 'play-along: 3 notes done', pg.locator('.mel-staff .ev.done').count())
    pg.screenshot(path=OUT + '/11_melodien.png', full_page=True)

    # ---- sounds after answering, coins, parent page
    check(pg.evaluate("window.__mbPlayed.some(x => x.type === 'click')") and pg.evaluate("window.__mbPlayed.filter(x => x.type === 'note').length > 50"), 'notes and clicks were played')
    pg.goto(URL + '?child=lukas#/eltern'); pg.wait_for_timeout(300)
    if pg.locator('.pin-screen').count():
        pin = os.environ.get('RB_TEST_PIN')
        if pin:
            pg.fill('.pin', pin); pg.click('.pin-screen .btn.primary'); pg.wait_for_timeout(200)
    if pg.locator('.parent').count():
        t = pg.inner_text('.parent')
        check('Stand nach Thema' in t and 'Wiederkehrende Fehler' in t and 'Musiktest' in t, 'parent page', t[:200])
        pg.screenshot(path=OUT + '/12_parent.png', full_page=True)
    else:
        check(not os.environ.get('RB_TEST_PIN'), 'parent page opens with the family PIN')

    # ---- phone layout
    ph = br.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, is_mobile=True, has_touch=True)
    ph.add_init_script(UNLOCK); ph.add_init_script(MOCK_SPEECH)
    pp = ph.new_page(); pp.on('pageerror', lambda e: errors.append(str(e)))
    pp.goto(URL + '?child=lukas'); pp.wait_for_selector('.home')
    pp.screenshot(path=OUT + '/20_phone_home.png', full_page=True)
    for gen, lv, pa, name in [('dur_bauen', 2, {'k': 'Es'}, 'bauen'), ('diktat', 2, None, 'diktat'), ('mel_lesen', 3, {'v': 'names', 'id': 'entchen', 'key': 'A', 'from': 6, 'to': 11, 'i': 0, 'typed': True, 'wrong': None}, 'names'), ('taste', 3, None, 'taste'), ('dur', 2, {'v': 'gaps', 'k': 'Es', 'o': 0}, 'gaps')]:
        pp.evaluate("""([g, lv, pa]) => { const s = MB.session.create(MB.app.progress, { mode: 'lernen', tasks: [{ gen: g, level: lv, params: pa }] }); MB.practice.run(MB.app, s, { title: 'Test' }); }""", [gen, lv, pa])
        pp.wait_for_timeout(150)
        ow = pp.evaluate("document.documentElement.scrollWidth - window.innerWidth")
        check(ow <= 1, 'phone: no sideways scrolling (%s)' % name, ow)
        pp.screenshot(path='%s/21_phone_%s.png' % (OUT, name), full_page=True)

    # ---- with Robin's Bobins: card + guest
    if platform:
        g = br.new_context(viewport={'width': 1000, 'height': 900}); g.add_init_script(MOCK_SPEECH)
        gp = g.new_page(); gp.on('pageerror', lambda e: errors.append(str(e)))
        gp.goto(URL + '?gast=Nuka'); gp.wait_for_selector('.home')
        check('Hallo Nuka' in gp.inner_text('.home'), 'guest: Nuka')
        check(gp.inner_text('#apps-link').strip() == '‹ Start', 'guest: ‹ Start link', gp.inner_text('#apps-link'))
        gp.goto(BASE + 'robins-bobins/gast/?name=Nuka'); gp.wait_for_timeout(600)
        check('Musik' in gp.inner_text('body'), 'guest start page lists Musik-Bobins', gp.inner_text('body')[:300])
        gp.screenshot(path=OUT + '/30_guest_start.png', full_page=True)

    check(not errors, 'no JS errors', errors[:5])
    br.close()
print('\ne2e: %d passed, %d failed' % (passed, failed))
sys.exit(1 if failed else 0)
