#!/usr/bin/env python3
"""Capture the four real 1280x800 renders from a running `node serve.ts`.

Usage:
  node serve.ts &
  /home/kozak/AI/crypto-wallet/.venv/bin/python tools/capture.py
"""

from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
SHOTS = [
    ("1-title.jpg", "title"),
    ("2-run.jpg", "run"),
    ("3-chase.jpg", "chase"),
    ("4-end.jpg", "end"),
]
BASE = "http://localhost:8080"


def main() -> None:
    out = ROOT / "screenshots"
    out.mkdir(exist_ok=True)
    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=True,
            executable_path="/home/kozak/.local/bin/chromium",
            args=["--no-sandbox", "--disable-dev-shm-usage"],
        )
        page = browser.new_page(viewport={"width": 1280, "height": 800}, device_scale_factor=1)
        errors: list[str] = []
        page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
        page.on("pageerror", lambda e: errors.append(str(e)))
        for filename, scene in SHOTS:
            page.goto(f"{BASE}/?shot={scene}&seed=1", wait_until="load")
            page.wait_for_function("window.__shotReady === true", timeout=10000)
            page.screenshot(path=str(out / filename), type="jpeg", quality=90)
            print(f"{filename}: {(out / filename).stat().st_size} bytes")
        if errors:
            raise SystemExit(f"console/page errors: {errors}")
        browser.close()


if __name__ == "__main__":
    main()
