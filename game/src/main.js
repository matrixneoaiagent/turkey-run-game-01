// Boot, the fixed-step loop and the four screen states. Input is gathered once a frame; the world
// advances in 1/60 s steps (capped so a background tab does not replay a minute of farm); the
// renderer paints the result. Sound events are bit flags returned by the world, and the canvas
// buttons are hit-tested in logical coordinates so they work at every window size.
//
// ?seed=N makes the farm repeatable. ?shot=title|run|chase|end (with or without &seed=N) stages a
// scene and sets window.__shotReady when it has been painted. ?debug=1 exposes a small state and
// test hook for the Playwright verification script.

import { BEST_KEY, DISTANCE, FIELD, MUTE_KEY, SCREENS, STEP } from './config.js';
import { createRandom } from './random.js';
import { createWorld, EV_CAUGHT, EV_COIN, EV_ESCAPED, EV_FEATHER, EV_HIT, EV_JUMP, EV_LAND } from './world.js';
import { ACTION_CONFIRM, ACTION_MUTE, ACTION_PAUSE, createInput } from './input.js';
import { BUTTONS, createRenderer } from './render.js';
import { stageShot } from './shots.js';
import { createAudio } from './audio.js';

const MAX_FRAME = 0.1;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);
const debugMode = params.has('debug') || Boolean(shot);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Private windows keep the best score for this visit only.
  }
}

function readMuted() {
  try {
    return window.localStorage.getItem(MUTE_KEY) === '1';
  } catch {
    return false;
  }
}

function saveMuted(value) {
  try {
    window.localStorage.setItem(MUTE_KEY, value ? '1' : '0');
  } catch {
    // Nothing to save; the toggle still applies to this visit.
  }
}

function runShot(name) {
  const staged = stageShot(name, world);
  const ui = { best: staged.best ?? 0, muted: false, newBest: Boolean(staged.newBest) };
  let painted = 0;
  window.__shotReady = false;
  function paint() {
    renderer.draw(world.state, staged.screen, ui);
    painted += 1;
    if (painted < 3) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  const audio = createAudio();
  let muted = readMuted();
  audio.setMuted(muted);

  const ui = { best: readBest(), muted, newBest: false };
  let screen = SCREENS.title;
  let accumulator = 0;
  let last = performance.now();
  let previousDuck = false;

  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    world.reset();
    accumulator = 0;
    previousDuck = false;
    screen = SCREENS.play;
    ui.newBest = false;
    input.clearJump();
    audio.unlock();
    audio.click();
    announce(`Playing. ${world.state.lives} hearts. Run 800 metres to escape.`);
  }

  function endGame(outcome) {
    if (screen === SCREENS.end) return;
    const finalScore = Math.floor(world.state.score);
    const oldBest = ui.best;
    if (finalScore > ui.best) {
      ui.best = finalScore;
      saveBest(ui.best);
    }
    ui.newBest = finalScore > oldBest;
    screen = SCREENS.end;
    accumulator = 0;
    announce(
      `${outcome === 'escaped' ? 'Escaped' : 'Caught'}. Score ${finalScore}. Distance ${world.state.distanceM} metres. Press Enter or click Run Again.`,
    );
  }

  function pauseGame() {
    if (screen !== SCREENS.play) return;
    screen = SCREENS.paused;
    accumulator = 0;
    audio.pause();
    announce('Paused. Press P or Enter to resume.');
  }

  function resumeGame() {
    if (screen !== SCREENS.paused) return;
    screen = SCREENS.play;
    accumulator = 0;
    previousDuck = false;
    audio.click();
    announce('Playing.');
  }

  function toggleMute() {
    muted = !muted;
    audio.setMuted(muted);
    ui.muted = muted;
    saveMuted(muted);
    announce(muted ? 'Muted.' : 'Sound on.');
  }

  function handleEvents(events) {
    if (events & EV_JUMP) audio.jump();
    if (events & EV_LAND) audio.land();
    if (events & EV_COIN) audio.coin(world.state.combo);
    if (events & EV_FEATHER) audio.boost();
    if (events & EV_HIT) {
      audio.hit();
      announce(`Hit! ${world.state.lives} ${world.state.lives === 1 ? 'heart' : 'hearts'} left.`);
    }
    if (events & EV_ESCAPED) {
      if (screen === SCREENS.play) endGame('escaped');
      audio.win();
    } else if (events & EV_CAUGHT) {
      if (screen === SCREENS.play) endGame('caught');
      audio.lose();
    }
  }

  function handleAction(action) {
    if (action === 'mute') toggleMute();
    else if (action === 'start' || action === 'restart') startGame();
    else if (action === 'resume') resumeGame();
    else if (action === 'jump' && screen === SCREENS.play) world.requestJump();
  }

  canvas.addEventListener('pointerdown', (event) => {
    audio.unlock();
    const point = renderer.toLogical(event.clientX, event.clientY);
    renderer.setPointer(point.x, point.y);
    const action = renderer.actionAt(point.x, point.y, screen);
    if (action) handleAction(action);
  });

  canvas.addEventListener('pointermove', (event) => {
    const point = renderer.toLogical(event.clientX, event.clientY);
    renderer.setPointer(point.x, point.y);
    const action = renderer.actionAt(point.x, point.y, screen);
    canvas.style.cursor = action ? 'pointer' : 'default';
  });

  canvas.addEventListener('pointerleave', () => {
    renderer.setPointer(-1000, -1000);
    canvas.style.cursor = 'default';
  });

  window.addEventListener('keydown', () => audio.unlock(), { once: true });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) pauseGame();
  });

  function frame(now) {
    requestAnimationFrame(frame);
    let dt = (now - last) / 1000;
    last = now;
    if (!Number.isFinite(dt) || dt < 0) dt = 0;
    dt = Math.min(dt, MAX_FRAME);

    const frameInput = input.consume();
    let justStarted = false;

    if (frameInput.actions & ACTION_MUTE) toggleMute();
    if (frameInput.actions & ACTION_PAUSE) {
      if (screen === SCREENS.play) pauseGame();
      else if (screen === SCREENS.paused) resumeGame();
    }
    if (frameInput.actions & ACTION_CONFIRM) {
      if (screen === SCREENS.title) {
        startGame();
        justStarted = true;
      } else if (screen === SCREENS.paused) {
        resumeGame();
      } else if (screen === SCREENS.end) {
        startGame();
        justStarted = true;
      }
    }

    if (screen === SCREENS.play && !justStarted) {
      if (frameInput.jumpPressed) world.requestJump();
      if (frameInput.jumpReleased) world.cutJump();
      if (frameInput.duck && !previousDuck) audio.duck();
      previousDuck = frameInput.duck;
    }

    if (screen === SCREENS.title || screen === SCREENS.end) {
      world.idle(dt);
    } else if (screen === SCREENS.play) {
      accumulator += dt;
      let guard = 0;
      while (accumulator >= STEP && guard < 6 && screen === SCREENS.play) {
        const events = world.step(STEP, { duck: frameInput.duck });
        handleEvents(events);
        accumulator -= STEP;
        guard += 1;
      }
      if (screen !== SCREENS.play) accumulator = 0;
    }

    renderer.draw(world.state, screen, ui);
  }

  if (debugMode) {
    window.__gobbler = {
      snapshot() {
        const player = world.state.player;
        return {
          screen,
          score: Math.floor(world.state.score),
          distanceM: world.state.distanceM,
          distancePx: Math.round(world.state.distancePx),
          lives: world.state.lives,
          gap: Math.round(world.state.gap),
          ducking: Boolean(player.ducking && player.onGround),
          onGround: player.onGround,
          feetY: Math.round(player.feetY),
          vy: Math.round(player.vy),
          boost: Number(world.state.boost.toFixed(2)),
          outcome: world.state.outcome,
          cause: world.state.cause,
          best: ui.best,
          muted,
          elapsed: Number(world.state.time.toFixed(2)),
        };
      },
      buttons() {
        return JSON.parse(JSON.stringify(BUTTONS));
      },
      start() {
        startGame();
      },
      pause() {
        pauseGame();
      },
      resume() {
        resumeGame();
      },
      damage(count = 1) {
        for (let i = 0; i < count; i += 1) {
          if (screen !== SCREENS.play) break;
          handleEvents(world.applyHit('debug'));
        }
      },
      finish(kind = 'escaped') {
        if (screen !== SCREENS.play) return;
        world.finish(kind);
        endGame(kind);
        if (kind === 'escaped') audio.win();
        else audio.lose();
      },
      spawn(kind = 'hay', screenX = 720) {
        return Boolean(world.placeHazard(kind, screenX));
      },
      pickup(kind = 'corn', screenX = 420, top = FIELD.groundY - 80) {
        return Boolean(world.placePickup(kind, screenX, top));
      },
      setGap(px) {
        world.state.gap = Math.max(0, px);
      },
      setDistanceM(metres) {
        world.jumpToDistance(Math.max(0, Math.min(DISTANCE.escapeMetres, metres)));
      },
      clear() {
        world.clearField();
      },
      setLives(value) {
        world.state.lives = Math.max(0, Math.min(3, Math.floor(value)));
      },
      setScore(value) {
        world.state.score = Math.max(0, Math.floor(value));
      },
    };
  }

  announce("Gobbler's Getaway. Press Enter or click Start Running.");
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
