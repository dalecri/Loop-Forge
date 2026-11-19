"""StrudelBox smoke test: serves the repo root, drives index.html in headless Chromium.
Checks taps, pitch drag, hold drag, code apply, reload persistence, slots and dropdowns.
The Strudel engine needs network, so sound itself is not tested here."""
import http.server, threading, functools, os, sys
from playwright.sync_api import sync_playwright
root = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
srv = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(http.server.SimpleHTTPRequestHandler, directory=root))
threading.Thread(target=srv.serve_forever, daemon=True).start()
URL = f'http://127.0.0.1:{srv.server_port}/index.html'
fails = []
def check(name, cond):
    print(('ok   ' if cond else 'FAIL ') + name)
    if not cond: fails.append(name)
with sync_playwright() as p:
    exe = os.environ.get('CHROME')
    b = p.chromium.launch(**({'executable_path': exe} if exe else {}), args=['--no-sandbox'])
    pg = b.new_page(viewport={'width': 1180, 'height': 820})
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(URL); pg.wait_for_timeout(800)
    line = lambda k: pg.evaluate(f"document.getElementById('code').value.split('\\n').find(l=>l.includes('{k}'))") or ''
    check('preset loads', 'bd*4' in line('RolandTR909'))
    cells = pg.query_selector_all('.lane:nth-child(2) .cell')
    bx = cells[0].bounding_box(); pg.mouse.click(bx['x'] + 10, bx['y'] + 30)
    check('tap adds a bass note', line('sawtooth').startswith('  note("[a1 a1'))
    bx = cells[1].bounding_box(); pg.mouse.move(bx['x'] + 10, bx['y'] + 30); pg.mouse.down(); pg.mouse.move(bx['x'] + 10, bx['y'] - 20, steps=5); pg.mouse.up()
    check('drag up moves pitch', 'a1 d2' in line('sawtooth'))
    c4 = cells[4].bounding_box(); c7 = cells[7].bounding_box(); pg.mouse.click(c4['x'] + 10, c4['y'] + 30)
    pg.mouse.move(c4['x'] + 10, c4['y'] + 30); pg.mouse.down(); pg.mouse.move(c7['x'] + 10, c4['y'] + 32, steps=6); pg.mouse.up()
    check('drag right holds a note', '] d2 [' in line('sawtooth'))
    pg.click('#codeBtn')
    pg.evaluate("""()=>{const t=document.getElementById('code'); t.value=t.value.replace('bd*4','bd bd ~ bd').replace('setcpm(150/4)','setcpm(128/4)').replace('.room(0.7)','.room(0.7).jux(rev)'); t.dispatchEvent(new Event('input'))}""")
    pg.click('#apply'); pg.wait_for_timeout(300)
    check('apply sets tempo', pg.inner_text('#bpmV') == '128')
    check('apply updates drums', 'bd bd ~ bd' in line('RolandTR909'))
    check('unsupported code kept as raw', '.jux(rev)' in (pg.inner_text('.raw') if pg.query_selector('.raw') else ''))
    pg.wait_for_timeout(400); pg.reload(); pg.wait_for_timeout(600)
    check('reload keeps the pattern', pg.inner_text('#bpmV') == '128' and 'bd bd ~ bd' in line('RolandTR909'))
    pg.click('.pat[data-s=B]'); check('slot B starts empty', 's("~")' in line('RolandTR909'))
    pg.click('.pat[data-s=A]'); check('slot A comes back', 'bd bd ~ bd' in line('RolandTR909'))
    pg.select_option('.lane:nth-child(2) select', 'gm_marimba'); check('instrument dropdown', 'gm_marimba' in line('marimba'))
    pg.select_option('.lane:nth-child(1) select', 'RolandTR606'); check('drum machine dropdown + clap fallback', '[~ sd]*2' in line('TR606'))
    check('no page errors', not errs)
    b.close()
srv.shutdown()
sys.exit(1 if fails else 0)
