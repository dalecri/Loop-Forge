"""GBX-16 smoke test.

Serves the repo root on localhost, drives the app in headless Chromium with touch, and checks:
audio unlock on first tap, the offline cold start through the service worker, old Loop Forge
share-link forwarding, the sequencer, live record, pattern queue, mute, copy, filter, saving,
and that nothing overflows at iPad and iPad mini sizes.

    pip install playwright && python -m playwright install chromium
    python tests/smoke.py            # or CHROME_PATH=/path/to/chrome python tests/smoke.py
"""
import asyncio, functools, http.server, os, sys, threading
from pathlib import Path
from playwright.async_api import async_playwright

ROOT = Path(__file__).resolve().parent.parent
PORT = 8790
URL = f'http://127.0.0.1:{PORT}/'
SIZES = [(1180, 820), (1133, 744), (1133, 660), (744, 1133), (744, 1030), (820, 1180)]
fails = []

def check(name, ok, detail=''):
    print(('PASS ' if ok else 'FAIL ') + name + (f'  ({detail})' if detail else ''))
    if not ok: fails.append(name)

class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass

async def drag(pg, sel, dy):
    box = await (await pg.query_selector(sel)).bounding_box()
    x, y = box['x'] + box['width'] / 2, box['y'] + box['height'] / 2
    await pg.mouse.move(x, y); await pg.mouse.down()
    await pg.mouse.move(x, y + dy, steps=6); await pg.mouse.up()
    await pg.wait_for_timeout(350)

async def tap_center(pg, el):
    b = await el.bounding_box()
    await pg.touchscreen.tap(b['x'] + b['width'] / 2, b['y'] + b['height'] / 2)

async def main():
    srv = http.server.ThreadingHTTPServer(('127.0.0.1', PORT), functools.partial(Quiet, directory=str(ROOT)))
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    async with async_playwright() as p:
        kw = {'args': ['--no-sandbox', '--autoplay-policy=user-gesture-required']}
        if os.environ.get('CHROME_PATH'): kw['executable_path'] = os.environ['CHROME_PATH']
        b = await p.chromium.launch(**kw)

        # --- core flow -------------------------------------------------------
        c = await b.new_context(viewport={'width': 1180, 'height': 820}, has_touch=True)
        pg = await c.new_page(); errs = []; offsite = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
        pg.on('request', lambda r: offsite.append(r.url) if not r.url.startswith(URL) else None)
        await pg.goto(URL); await pg.wait_for_timeout(500)
        check('no off-site requests', not offsite, ', '.join(offsite))

        await pg.evaluate('__gb.ctx.suspend()'); await pg.wait_for_timeout(150)
        check('audio starts locked', await pg.evaluate('__gb.ctx.state') == 'suspended')
        pads = await pg.query_selector_all('.pad')
        await tap_center(pg, pads[0]); await pg.wait_for_timeout(300)
        check('audio unlocks on first tap', await pg.evaluate('__gb.ctx.state') == 'running')

        await pg.tap('#play'); await pg.wait_for_timeout(700)
        check('sequencer runs with playhead', await pg.evaluate("__gb.playing && document.querySelectorAll('.cell.ph').length === 1"))

        await pg.evaluate('__gb.S.patterns[0].steps[5].fill(0)')
        await pg.tap('#rec')
        for _ in range(4):
            await tap_center(pg, pads[5]); await pg.wait_for_timeout(330)
        rec = await pg.evaluate('__gb.S.patterns[0].steps[5].filter(Boolean).length')
        check('live record quantizes hits', rec >= 3, f'{rec} steps')
        await pg.tap('#rec')

        await pg.tap('.pat[data-i="1"]')
        await pg.wait_for_timeout(int(60 / 96 * 4 * 1000) + 300)
        check('pattern switch waits for loop end', await pg.evaluate('__gb.S.cur') == 1)
        await pg.tap('.pat[data-i="0"]'); await pg.tap('#play'); await pg.wait_for_timeout(200)

        await pg.tap('#copy'); await pg.tap('.pat[data-i="2"]')
        check('copy pattern', await pg.evaluate('JSON.stringify(__gb.S.patterns[2]) === JSON.stringify(__gb.S.patterns[0])'))
        await drag(pg, '#flt', 60)
        check('filter knob sweeps', await pg.evaluate('__gb.filter() < 0'))
        check('screen shows the knob value', (await pg.inner_text('#lsound')).startswith('FILTER'))

        # vibes, key lock, diatonic chords, space, reset
        await pg.tap('#vibes'); await pg.wait_for_timeout(150)
        hyper = (await pg.query_selector_all('.vibe'))[0]
        await hyper.tap(); await hyper.tap(); await pg.wait_for_timeout(200)
        check('vibe starter loads', await pg.evaluate('__gb.S.bpm === 158 && __gb.S.patterns.every(p => p.len === 32) && __gb.S.patterns[1].steps[0].some(Boolean)'))
        names = await pg.evaluate("[...document.querySelectorAll('.pad .nt')].slice(12).map(e => e.textContent)")
        check('chord pads follow the key', names == ['Am', 'F', 'C', 'G'], ' '.join(names))
        await pg.evaluate("document.querySelectorAll('.pad')[8].dispatchEvent(new PointerEvent('pointerdown', {bubbles: true, pointerId: 9}))")
        await pg.evaluate("window.dispatchEvent(new PointerEvent('pointerup', {pointerId: 9}))")
        await drag(pg, '#pit', -14)
        check('key lock keeps pitch in scale', await pg.evaluate("(() => { const p = __gb.S.pads[8].pitch, k = __gb.S.key; return [0,2,3,5,7,8,10].includes(((p - k.root) % 12 + 12) % 12); })()"))
        await pg.tap('#vibes'); await pg.tap('#knext'); await pg.wait_for_timeout(100)
        names = await pg.evaluate("[...document.querySelectorAll('.pad .nt')].slice(12).map(e => e.textContent)")
        check('changing key moves the chords', names == ['Bbm', 'Gb', 'Db', 'Ab'], ' '.join(names))
        await pg.tap('#scl [data-s="major"]'); await pg.wait_for_timeout(100)
        check('scale switch stays in key', await pg.evaluate("__gb.S.pads.filter((p, i) => i >= 8).every(p => [0,2,4,5,7,9,11].includes(((p.pitch - 10) % 12 + 12) % 12))"))
        await pg.tap('#rkit'); await pg.tap('#rkit'); await pg.wait_for_timeout(100)
        check('reset kit', await pg.evaluate("__gb.S.pads[13].sound === 'chord' && __gb.S.pads[0].sound === 'kick' && __gb.S.key.root === 0 && __gb.S.bpm === 158"))
        await pg.tap('#rall'); await pg.tap('#rall'); await pg.wait_for_timeout(100)
        check('reset everything', await pg.evaluate("__gb.S.bpm === 96 && __gb.S.patterns[1].steps.every(r => !r.some(Boolean))"))
        await pg.tap('#shx')
        await drag(pg, '#spc', -40)
        check('space knob', await pg.evaluate('__gb.S.space > 20'))
        await pg.tap('#mute'); await pads[0].tap(); await pg.tap('#mute')
        check('mute toggles a pad', await pg.evaluate('__gb.S.mutes[0] === 1'))

        await pg.reload(); await pg.wait_for_timeout(500)
        check('state saves across reload', await pg.evaluate('__gb.S.mutes[0] === 1'))
        check('filter opens clean', await pg.evaluate('__gb.filter() === 0'))

        # --- offline cold start through the service worker ---------------------
        await pg.evaluate('navigator.serviceWorker.ready')
        await pg.reload(); await pg.wait_for_timeout(400)
        await c.set_offline(True)
        await pg.reload(); await pg.wait_for_timeout(500)
        check('opens offline from cache', await pg.title() == 'GBX-16')
        await c.set_offline(False)
        check('no page errors', not [e for e in errs if 'ERR_INTERNET_DISCONNECTED' not in e], '; '.join(errs))
        await c.close()

        # --- old share links + archived app -----------------------------------
        c = await b.new_context(viewport={'width': 1180, 'height': 820})
        pg = await c.new_page(); aerr = []
        pg.on('pageerror', lambda e: aerr.append(str(e)))
        await pg.goto(URL + '#s=test'); await pg.wait_for_timeout(1200)
        check('old share link forwards to archive', '/archive/loop-forge/' in pg.url, pg.url)
        check('archived Loop Forge loads', 'Loop Forge' in await pg.title() and not aerr, '; '.join(aerr))
        await c.close()

        # --- layout ----------------------------------------------------------
        for w, h in SIZES:
            c = await b.new_context(viewport={'width': w, 'height': h}, has_touch=True)
            pg = await c.new_page(); await pg.goto(URL); await pg.wait_for_timeout(400)
            over = await pg.evaluate("""[...document.querySelectorAll('.top>*,.pad,.cell,.pat,.mode,.knob,#load,.lcd')]
              .filter(e => { const r = e.getBoundingClientRect(); return r.right > innerWidth + 1 || r.bottom > innerHeight + 1; }).length""")
            pad = await pg.evaluate("Math.round(document.querySelector('.pad').getBoundingClientRect().height)")
            check(f'layout {w}x{h}', over == 0 and pad >= 90, f'pad height {pad}px')
            await pg.tap('#vibes'); await pg.wait_for_timeout(100)
            sh = await pg.evaluate("(() => { const r = document.querySelector('.panel').getBoundingClientRect(); return r.bottom <= innerHeight && r.right <= innerWidth && r.top >= 0; })()")
            check(f'vibes panel fits {w}x{h}', sh)
            await c.close()
        await b.close()
    srv.shutdown()
    print(f'\n{len(fails)} failed' if fails else '\nall passed')
    sys.exit(1 if fails else 0)

asyncio.run(main())
