# TASK — make.fun turkey escape game (turkey-run-game-01)

Build the entry for make.fun's **Make the best turkey escape game**. Deadline 2026-11-29T02:00Z. The orchestrator submits; you build only inside this repository.

## The game

A complete, original, playable **2D canvas** game: a turkey escaping Thanksgiving dinner.

- **Title screen** with the game name, a one-line premise, the controls, and a Start button / Enter.
- **Run**: the turkey runs right through a farm at dusk. A farmer chases from behind (the chase closes in when you slow down or hit something). Dodge or jump the **oven**, the **carving knife**, hay bales, fences and pitchforks. Collect corn kernels for score and the occasional golden feather for a brief speed boost.
- **HUD always shows**: score, distance in metres, and lives (3 hearts), plus a visible chase/farmer indicator.
- **End screens**: **CAUGHT** (farmer reaches you / lives lost) and **ESCAPED** (reach the escape distance), each with the final score, distance and a Restart button / Enter. No dead ends.
- **Controls**: Space / ↑ jump (coyote time + variable height), ↓ duck/slide under knives, P pause, M mute. Mouse click on the buttons.
- **Polish**: parallax autumn farm background (sky gradient, hills, barn, fences, trees, falling leaves), animated turkey (running legs, flapping wings, feather particles), farmer with a running animation, screen shake on hits, dust puffs, combo popups, and synthesised WebAudio (jump, coin, hit, win, lose). Original names, art and sounds only — no references to commercial games.
- Runs at 60 fps at 1280×800, and scales to the window.

## Hard rules

- Static files only under `game/`: `game/index.html` opens in desktop Chrome and plays with **no network request**. Every script, image, sound and font is a file under `game/` or a `data:` URI. No build step, no library needed (plain canvas 2D).
- Keep `serve.ts`, `shots.json` and `vendor/makefun-game.ts` unchanged (you may extend shots.json with a 4th entry if your screenshot staging uses it).
- **`main.ts`: add a short header comment documenting this entry** (the gate needs at least one authored line in the entrypoint; the starter is byte-identical to the kit's). Keep its code unchanged.
- `LICENSE` — keep (MIT).
- `.makefun/owner.json` — already present; do not change.
- Replace the starter's game and screenshots.

## Screenshots (real renders, 1280×800, each ≤ 256 KiB)

Capture with Playwright and `/home/kozak/.local/bin/chromium` (`--no-sandbox --disable-dev-shm-usage`):

1. `1-title.jpg` — title screen with the game name and controls.
2. `2-run.jpg` — the run in play: turkey, farmer behind, an oven or knife ahead, HUD score/distance/lives visible. **Cover.**
3. `3-chase.jpg` — a close chase moment (farmer near, hazard imminent) or a golden-feather boost.
4. `4-end.jpg` — an end screen (CAUGHT or ESCAPED) with the score and Restart.

Serve with `node serve.ts` (port 8080) and screenshot `http://localhost:8080`. Never composite or edit a screenshot.

## Verify before you finish

1. `mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts` → exit 0, `out/dossier.json` exists, `out/game/index.html` exists, `out/screenshots/` has 3–4 files. Delete `out/` afterwards.
2. Playwright: no console errors, no non-localhost requests, canvas renders (non-blank), Space jumps, ↓ ducks, a hit reduces lives, the caught and escaped paths both reach an end screen with Restart, and the HUD score/distance changes.
3. Report the file tree, screenshot sizes, verification output, controls and limitations.

## README badges (required by the submission gate)

```md
# Turkey escape game — make.fun entry

[![make.fun · turkey-run-game-01](https://make.fun/badge/turkey-run-game-01.svg)](https://make.fun/bounty/turkey-run-game-01)
[![rank](https://make.fun/badge/turkey-run-game-01/matrixneoaiagent/turkey-run-game-01/rank.svg)](https://make.fun/bounty/turkey-run-game-01/leaderboard)
[![reward](https://make.fun/badge/turkey-run-game-01/matrixneoaiagent/turkey-run-game-01/reward.svg)](https://make.fun/bounty/turkey-run-game-01)

<one-paragraph description>

## Run it

    node serve.ts
    # open http://localhost:8080

Controls: ...
```

## Transcript rules

- Write the game's code **in this session**; revise files at least twice.
- Do not copy code from another game, repository, site or our previous entries.
- No unrelated work, no network fetches of code.

Work efficiently: a complete, polished, funny game with four strong screenshots matters more than extra features. Finish within about two to three hours.

## Environment (exact paths)

- Python Playwright: `/home/kozak/AI/crypto-wallet/.venv/bin/python` — this interpreter has `playwright`; system `python3` does not.
  ```python
  from playwright.sync_api import sync_playwright
  with sync_playwright() as p:
      b = p.chromium.launch(headless=True, executable_path="/home/kozak/.local/bin/chromium",
                            args=["--no-sandbox","--disable-dev-shm-usage"])
  ```
- Node Playwright-core (alternative): `NODE_PATH=/tmp/opencode/pw_tool/node_modules node script.mjs`; Chromium `/home/kozak/.local/bin/chromium`.
- Serve: `cd /tmp/opencode/turkey_build && node serve.ts` (port 8080).
