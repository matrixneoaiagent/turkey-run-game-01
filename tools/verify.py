#!/usr/bin/env python3
"""Exercise the real game in Chromium and assert the brief's acceptance points.

Usage (with `node serve.ts` running):
  /home/kozak/AI/crypto-wallet/.venv/bin/python tools/verify.py
"""

import sys
from playwright.sync_api import sync_playwright

BASE = "http://localhost:8080"
VIEW = {"width": 1280, "height": 800}


def snapshot(page):
    return page.evaluate("window.__gobbler.snapshot()")


def main() -> int:
    failures = []
    checks = []

    def check(name, ok, detail=""):
        checks.append((name, bool(ok), detail))
        if not ok:
            failures.append(name)

    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=True,
            executable_path="/home/kozak/.local/bin/chromium",
            args=["--no-sandbox", "--disable-dev-shm-usage"],
        )
        page = browser.new_page(viewport=VIEW, device_scale_factor=1)
        console_errors, page_errors, requests = [], [], []
        page.on("console", lambda m: console_errors.append(m.text) if m.type == "error" else None)
        page.on("pageerror", lambda e: page_errors.append(str(e)))
        page.on("request", lambda r: requests.append(r.url))

        page.goto(f"{BASE}/?debug=1&seed=7", wait_until="load")
        page.wait_for_timeout(300)
        title = snapshot(page)
        check("title screen", title["screen"] == "title", title["screen"])

        buttons = page.evaluate("window.__gobbler.buttons()")
        start = buttons["start"]
        page.mouse.click(start["x"] + start["w"] / 2, start["y"] + start["h"] / 2)
        page.wait_for_timeout(400)
        check("start button enters play", snapshot(page)["screen"] == "play")
        page.evaluate("window.__gobbler.clear()")

        before = snapshot(page)
        page.wait_for_timeout(900)
        after = snapshot(page)
        check("distance advances", after["distanceM"] > before["distanceM"],
              f'{before["distanceM"]} -> {after["distanceM"]} m')

        page.keyboard.down("Space")
        page.wait_for_timeout(150)
        jump = snapshot(page)
        check("Space jumps", (not jump["onGround"]) and jump["feetY"] < 672,
              f'feetY={jump["feetY"]}, vy={jump["vy"]}')
        page.keyboard.up("Space")
        page.wait_for_timeout(900)
        check("jump lands", snapshot(page)["onGround"])

        page.keyboard.down("ArrowDown")
        page.wait_for_timeout(150)
        duck = snapshot(page)
        check("Down ducks", duck["ducking"], str(duck))
        page.keyboard.up("ArrowDown")
        page.wait_for_timeout(150)

        before_hit = snapshot(page)
        page.evaluate("window.__gobbler.spawn('hay', 340)")
        page.wait_for_timeout(250)
        after_hit = snapshot(page)
        check("hazard hit removes a life", after_hit["lives"] == before_hit["lives"] - 1,
              f'{before_hit["lives"]} -> {after_hit["lives"]}')

        page.evaluate("window.__gobbler.damage(2)")
        page.wait_for_timeout(200)
        caught = snapshot(page)
        check("caught end screen", caught["screen"] == "end" and caught["outcome"] == "caught", str(caught))
        check("caught has distance/score", caught["distanceM"] >= 0 and caught["score"] >= 0)

        buttons = page.evaluate("window.__gobbler.buttons()")
        restart = buttons["restart"]
        page.mouse.click(restart["x"] + restart["w"] / 2, restart["y"] + restart["h"] / 2)
        page.wait_for_timeout(300)
        check("restart button returns to play", snapshot(page)["screen"] == "play")

        score_before = snapshot(page)["score"]
        page.evaluate("window.__gobbler.pickup('corn', 340, 592)")
        page.wait_for_timeout(250)
        score_after = snapshot(page)["score"]
        check("corn raises score", score_after > score_before, f"{score_before} -> {score_after}")

        page.evaluate("window.__gobbler.setDistanceM(799.95)")
        page.wait_for_timeout(450)
        escaped = snapshot(page)
        check("escaped end screen", escaped["screen"] == "end" and escaped["outcome"] == "escaped", str(escaped))
        check("escape at 800 m", escaped["distanceM"] == 800, str(escaped["distanceM"]))

        buttons = page.evaluate("window.__gobbler.buttons()")
        restart = buttons["restart"]
        page.mouse.click(restart["x"] + restart["w"] / 2, restart["y"] + restart["h"] / 2)
        page.wait_for_timeout(300)
        check("restart after escape", snapshot(page)["screen"] == "play")

        page.evaluate("window.__gobbler.setGap(10)")
        page.wait_for_timeout(250)
        farmer = snapshot(page)
        check("farmer catch path", farmer["screen"] == "end" and farmer["cause"] == "farmer", str(farmer))

        pixels = page.evaluate(
            """() => {
              const c = document.getElementById('game');
              const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
              let min = 255, max = 0, n = 0;
              for (let i = 0; i < d.length; i += 4 * 501) {
                const v = (d[i] + d[i + 1] + d[i + 2]) / 3;
                if (v < min) min = v;
                if (v > max) max = v;
                n++;
              }
              return { min, max, samples: n, width: c.width, height: c.height };
            }"""
        )
        check("canvas renders (non-blank)", pixels["max"] - pixels["min"] > 40, str(pixels))
        check("no console errors", not console_errors, str(console_errors))
        check("no page errors", not page_errors, str(page_errors))
        bad = [u for u in requests if not u.startswith("http://localhost:8080")]
        check("no non-localhost requests", not bad, str(bad))

        browser.close()

    for name, ok, detail in checks:
        print(f'{"PASS" if ok else "FAIL"}  {name}' + (f"  [{detail}]" if detail else ""))
    print(f"\n{len(checks) - len(failures)}/{len(checks)} checks passed")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
