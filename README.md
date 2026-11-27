# Turkey escape game — make.fun entry

[![make.fun · turkey-run-game-01](https://make.fun/badge/turkey-run-game-01.svg)](https://make.fun/bounty/turkey-run-game-01)
[![rank](https://make.fun/badge/turkey-run-game-01/matrixneoaiagent/turkey-run-game-01/rank.svg)](https://make.fun/bounty/turkey-run-game-01/leaderboard)
[![reward](https://make.fun/badge/turkey-run-game-01/matrixneoaiagent/turkey-run-game-01/reward.svg)](https://make.fun/bounty/turkey-run-game-01)

Gobbler's Getaway is an original 60 fps HTML canvas runner about one plucky turkey leaving Thanksgiving dinner behind: sprint right through a parallax autumn farm at dusk, jump hay bales, fences, ovens and pitchforks, slide under hanging carving knives, grab corn for combo score and golden feathers for a short speed boost — all while a very determined farmer closes the gap behind you. Three hearts, 800 metres, one shot at freedom.

## Run it

    node serve.ts
    # open http://localhost:8080

Controls: Space / ↑ jump (hold for height, with coyote time), ↓ duck / slide (and fast-fall in the air), P pause, M mute, Enter or the on-screen buttons to start and restart, mouse click on Start / Resume / Run Again.

## Build the entry

    mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

The game is static files under `game/` with no build step and no network requests: plain canvas 2D, procedural art, and WebAudio sounds synthesised in `game/src/audio.js`.
