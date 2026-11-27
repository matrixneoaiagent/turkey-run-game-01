// The rules of Gobbler's Getaway, with no drawing and no browser in it. The turkey is pinned to a
// screen x; the world scrolls past at a speed that ducks, boosts and stumbles change. The farmer
// hangs behind the turkey at `gap` pixels: he gains when the bird slides or stumbles, loses ground
// when it finds a golden feather, and grabs it when the gap closes or the third heart goes.
//
// step() advances one fixed 1/60 s tick and returns bit flags for the shell to turn into sound and
// announcements. Items, particles and popups all live in preallocated pools so gameplay allocates
// nothing after boot.

import {
  CORN,
  DISTANCE,
  FEATHER,
  FIELD,
  HAZARDS,
  KNIFE_TOP,
  LIVES,
  PLAYER,
  SPAWN,
} from './config.js';

export const EV_JUMP = 1;
export const EV_LAND = 2;
export const EV_COIN = 4;
export const EV_HIT = 8;
export const EV_FEATHER = 16;
export const EV_CAUGHT = 32;
export const EV_ESCAPED = 64;

const ITEM_POOL = 96;
const PARTICLE_POOL = 240;
const POPUP_POOL = 14;
const HAZARD_NAMES = ['hay', 'fence', 'oven', 'fork', 'knife'];

const clamp = (value, low, high) => Math.max(low, Math.min(high, value));

function overlaps(a, b) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

export function createWorld(random) {
  const player = {
    feetY: FIELD.groundY,
    vy: 0,
    onGround: true,
    coyote: 0,
    jumpBuffer: 0,
    ducking: false,
    anim: 0,
    invulnerable: 0,
  };

  const items = [];
  for (let i = 0; i < ITEM_POOL; i += 1) {
    items.push({ active: false, kind: '', x: 0, y: 0, w: 0, h: 0, resolved: false, phase: 0 });
  }
  const particles = [];
  for (let i = 0; i < PARTICLE_POOL; i += 1) {
    particles.push({ active: false, type: 'dust', x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 1, size: 4, rot: 0, vr: 0, color: '#fff' });
  }
  const popups = [];
  for (let i = 0; i < POPUP_POOL; i += 1) {
    popups.push({ active: false, text: '', x: 0, y: 0, life: 0, maxLife: 1, color: '#fff', size: 22 });
  }

  const state = {
    time: 0,
    distancePx: 0,
    distanceM: 0,
    score: 0,
    lives: LIVES,
    gap: PLAYER.gapStart,
    speed: PLAYER.runSpeed,
    boost: 0,
    stumble: 0,
    combo: 1,
    comboTimer: 0,
    outcome: null,
    cause: '',
    shake: 0,
    flash: 0,
    player,
    items,
    particles,
    popups,
    spawnCursor: SPAWN.initialHazard,
    pickupCursor: SPAWN.initialPickup,
    hazardCount: 0,
    pickupCount: 0,
    dustTimer: 0,
    featherTimer: 0,
    farmerDustTimer: 0,
    goldTimer: 0,
    boostWasActive: false,
  };

  function freeItem() {
    for (let i = 0; i < items.length; i += 1) if (!items[i].active) return items[i];
    return null;
  }

  function addPopup(text, x, y, color = '#fff2d5', size = 23) {
    for (let i = 0; i < popups.length; i += 1) {
      const p = popups[i];
      if (!p.active) {
        p.active = true;
        p.text = text;
        p.x = x;
        p.y = y;
        p.life = 1.15;
        p.maxLife = 1.15;
        p.color = color;
        p.size = size;
        return;
      }
    }
  }

  function emit(type, x, y, count, options = {}) {
    for (let n = 0; n < count; n += 1) {
      let free = null;
      for (let i = 0; i < particles.length; i += 1) {
        if (!particles[i].active) {
          free = particles[i];
          break;
        }
      }
      if (free === null) return;
      const spread = options.spread ?? 40;
      free.active = true;
      free.type = type;
      free.x = x + (random() - 0.5) * (options.areaX ?? 18);
      free.y = y + (random() - 0.5) * (options.areaY ?? 10);
      free.vx = (options.vx ?? 0) + (random() - 0.5) * spread;
      free.vy = (options.vy ?? -30) + (random() - 0.5) * spread;
      free.size = (options.size ?? 4) + random() * (options.sizeJitter ?? 4);
      free.maxLife = (options.life ?? 0.6) + random() * 0.3;
      free.life = free.maxLife;
      free.rot = random() * Math.PI * 2;
      free.vr = (random() - 0.5) * 8;
      free.color = options.color ?? '#e8cda0';
    }
  }

  function dust(x, y, count, backwards = true) {
    emit('dust', x, y, count, {
      vx: backwards ? -70 : 20,
      vy: -24,
      spread: 56,
      size: 4,
      sizeJitter: 7,
      life: 0.5,
      areaX: 16,
      areaY: 6,
      color: 'rgba(189, 155, 120, 0.75)',
    });
  }

  function hazardDimensions(kind) {
    return HAZARDS[kind] ?? HAZARDS.hay;
  }

  function activateHazard(kind, worldX) {
    const item = freeItem();
    if (item === null) return null;
    const dims = hazardDimensions(kind);
    item.active = true;
    item.kind = kind;
    item.x = worldX;
    item.w = dims.width;
    item.h = dims.height;
    item.y = dims.float ? KNIFE_TOP : FIELD.groundY - dims.height;
    item.resolved = false;
    item.phase = random() * Math.PI * 2;
    return item;
  }

  function activatePickup(kind, worldX, top) {
    const item = freeItem();
    if (item === null) return null;
    item.active = true;
    item.kind = kind;
    item.x = worldX;
    item.w = kind === 'feather' ? FEATHER.width : CORN.width;
    item.h = kind === 'feather' ? FEATHER.height : CORN.height;
    item.y = top;
    item.resolved = false;
    item.phase = random() * Math.PI * 2;
    return item;
  }

  function chooseHazard() {
    // Every seventh hazard is a knife, so the duck mechanic always reappears in a run.
    if (state.hazardCount % 7 === 3) return 'knife';
    const roll = random();
    if (roll < 0.21) return 'hay';
    if (roll < 0.41) return 'fence';
    if (roll < 0.59) return 'fork';
    if (roll < 0.76) return 'oven';
    return 'knife';
  }

  function spawnCornArc(worldX) {
    const high = random() < 0.55;
    const baseY = high ? FIELD.groundY - 162 : FIELD.groundY - 88;
    const middleY = high ? FIELD.groundY - 214 : FIELD.groundY - 132;
    activatePickup('corn', worldX, baseY);
    activatePickup('corn', worldX + 64, middleY);
    activatePickup('corn', worldX + 128, baseY);
  }

  function spawnFromCursors() {
    let guard = 0;
    while (state.spawnCursor < state.distancePx + SPAWN.ahead && guard < 8) {
      const kind = chooseHazard();
      activateHazard(kind, state.spawnCursor);
      state.spawnCursor += SPAWN.hazardGapMin + random() * (SPAWN.hazardGapMax - SPAWN.hazardGapMin);
      state.hazardCount += 1;
      guard += 1;
    }
    guard = 0;
    while (state.pickupCursor < state.distancePx + SPAWN.ahead && guard < 8) {
      if (state.pickupCount % 7 === 5) {
        activatePickup('feather', state.pickupCursor, FIELD.groundY - 128);
      } else {
        spawnCornArc(state.pickupCursor);
      }
      state.pickupCursor += SPAWN.pickupGapMin + random() * (SPAWN.pickupGapMax - SPAWN.pickupGapMin);
      state.pickupCount += 1;
      guard += 1;
    }
  }

  function playerBox() {
    const ducking = player.ducking && player.onGround;
    const width = ducking ? PLAYER.duckWidth : PLAYER.standWidth;
    const height = ducking ? PLAYER.duckHeight : PLAYER.standHeight;
    return {
      x: FIELD.playerX - width / 2,
      y: player.feetY - height,
      width,
      height,
    };
  }

  function applyHit(cause = 'hazard') {
    if (state.outcome !== null) return 0;
    state.lives = Math.max(0, state.lives - 1);
    player.invulnerable = PLAYER.invulnerableTime;
    player.ducking = false;
    state.gap = Math.max(0, state.gap - 50);
    state.stumble = PLAYER.stumbleTime;
    state.combo = 1;
    state.comboTimer = 0;
    state.shake = Math.max(state.shake, 18);
    state.flash = Math.max(state.flash, 0.5);
    const box = playerBox();
    emit('hit', box.x + box.width / 2, box.y + box.height / 2, 12, {
      vx: 20,
      vy: -120,
      spread: 300,
      size: 4,
      sizeJitter: 5,
      life: 0.5,
      color: '#ffd37a',
    });
    emit('feather', box.x + box.width / 2, box.y + 20, 8, {
      vx: -50,
      vy: -90,
      spread: 220,
      size: 3,
      sizeJitter: 4,
      life: 0.9,
      color: '#b96a3d',
    });
    addPopup('OUCH!', FIELD.playerX, box.y - 16, '#ff8a70', 27);
    let events = EV_HIT;
    if (state.lives <= 0) {
      state.lives = 0;
      state.outcome = 'caught';
      state.cause = cause === 'farmer' ? 'farmer' : 'lives';
      state.shake = 24;
      events |= EV_CAUGHT;
    }
    return events;
  }

  function catchByFarmer() {
    if (state.outcome !== null) return 0;
    state.gap = 0;
    state.outcome = 'caught';
    state.cause = 'farmer';
    state.shake = 24;
    state.flash = 0.45;
    const box = playerBox();
    emit('dust', box.x + box.width / 2, player.feetY - 12, 18, {
      vx: -40,
      vy: -120,
      spread: 260,
      size: 6,
      sizeJitter: 8,
      life: 0.8,
      color: 'rgba(214, 178, 139, 0.8)',
    });
    addPopup('GOTCHA!', FIELD.playerX, box.y - 18, '#ff8a70', 30);
    return EV_CAUGHT;
  }

  function finish(kind) {
    if (state.outcome !== null) return;
    state.outcome = kind === 'escaped' ? 'escaped' : 'caught';
    state.cause = 'debug';
  }

  function celebrate() {
    const colors = ['#ffc857', '#f28b45', '#fff2d5', '#8fd694', '#e0503c'];
    for (let i = 0; i < 5; i += 1) {
      emit('confetti', FIELD.width / 2 + (random() - 0.5) * 500, 220 + random() * 120, 16, {
        vx: (random() - 0.5) * 460,
        vy: -40 - random() * 180,
        spread: 100,
        size: 4,
        sizeJitter: 6,
        life: 2.2,
        color: colors[i % colors.length],
      });
    }
  }

  function updateEffects(dt) {
    for (let i = 0; i < particles.length; i += 1) {
      const p = particles[i];
      if (!p.active) continue;
      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += (p.type === 'confetti' ? 330 : p.type === 'feather' ? 105 : 180) * dt;
      p.rot += p.vr * dt;
    }
    for (let i = 0; i < popups.length; i += 1) {
      const p = popups[i];
      if (!p.active) continue;
      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        continue;
      }
      p.y -= 32 * dt;
    }
  }

  function ambientEffects(dt) {
    if (player.onGround && state.speed > 80) {
      state.dustTimer -= dt;
      if (state.dustTimer <= 0) {
        state.dustTimer = 0.09;
        dust(FIELD.playerX - 26, FIELD.groundY - 2, player.ducking ? 3 : 2);
      }
    }
    if (player.onGround) {
      state.featherTimer -= dt;
      if (state.featherTimer <= 0) {
        state.featherTimer = 0.38;
        emit('feather', FIELD.playerX - 22, player.feetY - 58, 1, {
          vx: -60,
          vy: -18,
          spread: 30,
          size: 2,
          sizeJitter: 3,
          life: 1.2,
          color: random() < 0.5 ? '#d68a4e' : '#f0c179',
        });
      }
    }
    if (state.gap < PLAYER.gapMax - 8) {
      state.farmerDustTimer -= dt;
      if (state.farmerDustTimer <= 0) {
        state.farmerDustTimer = 0.13;
        const fx = FIELD.playerX - state.gap - 24;
        if (fx > -40) dust(fx, FIELD.groundY - 2, 2, false);
      }
    }
    if (state.boost > 0) {
      state.goldTimer -= dt;
      if (state.goldTimer <= 0) {
        state.goldTimer = 0.045;
        emit('gold', FIELD.playerX - 18, player.feetY - 50, 2, {
          vx: -180,
          vy: -10,
          spread: 80,
          size: 2,
          sizeJitter: 4,
          life: 0.55,
          color: '#ffd764',
        });
      }
    }
  }

  function updateItems(dt, eventsRef) {
    const box = playerBox();
    for (let i = 0; i < items.length; i += 1) {
      const item = items[i];
      if (!item.active) continue;
      const screenX = item.x - state.distancePx + FIELD.playerX;

      if (item.kind === 'corn' || item.kind === 'feather') {
        item.phase += dt * 2.4;
        if (screenX + item.w < -120) {
          item.active = false;
          continue;
        }
        if (overlaps(box, { x: screenX, y: item.y, width: item.w, height: item.h })) {
          item.active = false;
          if (item.kind === 'corn') {
              state.combo = state.comboTimer > 0 ? Math.min(CORN.comboMax, state.combo + 1) : 1;
              state.comboTimer = CORN.comboTime;
              const points = CORN.points * state.combo;
              state.score += points;
              emit('spark', screenX + item.w / 2, item.y + item.h / 2, 5, {
                vx: 30,
                vy: -40,
                spread: 120,
                size: 2,
                sizeJitter: 3,
                life: 0.35,
                color: '#ffe084',
              });
              addPopup(
                state.combo > 1 ? `+${points}  x${state.combo}` : `+${points}`,
                screenX + 8,
                item.y - 10,
                state.combo > 1 ? '#ffd764' : '#ffe9ad',
                state.combo > 1 ? 24 : 20,
              );
              eventsRef.flags |= EV_COIN;
            } else {
              state.boost = PLAYER.boostTime;
              state.boostWasActive = true;
              state.gap = Math.min(PLAYER.gapMax, state.gap + 26);
              state.score += FEATHER.points;
              emit('gold', screenX + item.w / 2, item.y + item.h / 2, 20, {
                vx: 30,
                vy: -50,
                spread: 280,
                size: 3,
                sizeJitter: 5,
                life: 0.8,
                color: '#ffd764',
              });
              addPopup('GOLDEN FEATHER!', FIELD.playerX + 20, FIELD.groundY - 250, '#ffd764', 28);
              eventsRef.flags |= EV_FEATHER;
            }
        }
        continue;
      }

      if (!item.resolved) {
        item.phase += dt * 3.2;
        const inset = item.kind === 'knife' ? 4 : 8;
        const hazardBox = { x: screenX + inset, y: item.y, width: item.w - inset * 2, height: item.h };
        if (overlaps(box, hazardBox)) {
          if (player.invulnerable <= 0) {
            item.resolved = true;
            item.active = false;
            eventsRef.flags |= applyHit('hazard');
            continue;
          }
        }
        if (screenX + item.w < FIELD.playerX - 70) {
          item.resolved = true;
          state.score += 4;
        }
      }
      if (screenX + item.w < -60) item.active = false;
    }
  }

  function step(dt, controls = {}) {
    if (state.outcome !== null) return 0;
    const eventsRef = { flags: 0 };
    state.time += dt;
    player.anim += dt * (8 + state.speed / 40);
    state.distanceM = Math.min(DISTANCE.escapeMetres, Math.floor(state.distancePx * DISTANCE.metresPerPixel));

    if (player.invulnerable > 0) player.invulnerable = Math.max(0, player.invulnerable - dt);
    if (state.boost > 0) {
      state.boost = Math.max(0, state.boost - dt);
      if (state.boost === 0) state.boostWasActive = false;
    }
    if (state.stumble > 0) state.stumble = Math.max(0, state.stumble - dt);
    if (state.comboTimer > 0) {
      state.comboTimer = Math.max(0, state.comboTimer - dt);
      if (state.comboTimer === 0) state.combo = 1;
    }
    state.shake = Math.max(0, state.shake - 44 * dt);
    state.flash = Math.max(0, state.flash - 2.2 * dt);
    player.jumpBuffer = Math.max(0, player.jumpBuffer - dt);

    if (player.onGround) player.coyote = PLAYER.coyoteTime;
    else player.coyote = Math.max(0, player.coyote - dt);

    if (player.jumpBuffer > 0 && (player.onGround || player.coyote > 0)) {
      player.onGround = false;
      player.ducking = false;
      player.vy = PLAYER.jumpVelocity;
      player.jumpBuffer = 0;
      player.coyote = 0;
      eventsRef.flags |= EV_JUMP;
      dust(FIELD.playerX - 4, FIELD.groundY - 2, 7);
    }

    if (!player.onGround) {
      const gravity = PLAYER.gravity * (controls.duck ? PLAYER.fastFallScale : 1);
      player.vy += gravity * dt;
      player.feetY += player.vy * dt;
      if (player.feetY >= FIELD.groundY) {
        player.feetY = FIELD.groundY;
        player.vy = 0;
        player.onGround = true;
        player.ducking = Boolean(controls.duck);
        eventsRef.flags |= EV_LAND;
        dust(FIELD.playerX, FIELD.groundY - 2, 5);
      }
    } else {
      player.ducking = Boolean(controls.duck);
    }

    let targetSpeed = player.ducking ? PLAYER.duckSpeed : PLAYER.runSpeed;
    if (state.boost > 0) targetSpeed *= PLAYER.boostScale;
    if (state.stumble > 0) targetSpeed *= 0.6;
    state.speed += (targetSpeed - state.speed) * Math.min(1, dt * 5.5);
    state.distancePx += state.speed * dt;
    state.distanceM = Math.min(DISTANCE.escapeMetres, Math.floor(state.distancePx * DISTANCE.metresPerPixel));

    let drift = 12;
    if (state.boost > 0) drift = 90;
    else if (state.stumble > 0) drift = -30;
    else if (player.ducking) drift = -45;
    state.gap = clamp(state.gap + drift * dt, 0, PLAYER.gapMax);
    if (state.gap <= PLAYER.gapCatch) eventsRef.flags |= catchByFarmer();
    if (state.outcome !== null) {
      updateEffects(dt);
      return eventsRef.flags;
    }

    spawnFromCursors();
    updateItems(dt, eventsRef);
    if (state.outcome === null && state.distanceM >= DISTANCE.escapeMetres) {
      state.outcome = 'escaped';
      state.score += 500;
      addPopup('FREEDOM!', FIELD.playerX, FIELD.groundY - 250, '#8fd694', 34);
      celebrate();
      eventsRef.flags |= EV_ESCAPED;
    }
    ambientEffects(dt);
    updateEffects(dt);
    return eventsRef.flags;
  }

  function idle(dt) {
    state.time += dt;
    player.anim += dt * 9;
    updateEffects(dt);
  }

  function reset() {
    state.time = 0;
    state.distancePx = 0;
    state.distanceM = 0;
    state.score = 0;
    state.lives = LIVES;
    state.gap = PLAYER.gapStart;
    state.speed = PLAYER.runSpeed;
    state.boost = 0;
    state.stumble = 0;
    state.combo = 1;
    state.comboTimer = 0;
    state.outcome = null;
    state.cause = '';
    state.shake = 0;
    state.flash = 0;
    state.spawnCursor = SPAWN.initialHazard;
    state.pickupCursor = SPAWN.initialPickup;
    state.hazardCount = 0;
    state.pickupCount = 0;
    state.dustTimer = 0;
    state.featherTimer = 0;
    state.farmerDustTimer = 0;
    state.goldTimer = 0;
    state.boostWasActive = false;
    player.feetY = FIELD.groundY;
    player.vy = 0;
    player.onGround = true;
    player.coyote = 0;
    player.jumpBuffer = 0;
    player.ducking = false;
    player.anim = 0;
    player.invulnerable = 0;
    for (const item of items) item.active = false;
    for (const p of particles) p.active = false;
    for (const p of popups) p.active = false;
  }

  function requestJump() {
    player.jumpBuffer = PLAYER.jumpBufferTime;
  }

  function cutJump() {
    if (!player.onGround && player.vy < PLAYER.jumpCut) player.vy = PLAYER.jumpCut;
  }

  function placeHazard(kind, screenX = 760) {
    return activateHazard(kind, state.distancePx + screenX - FIELD.playerX);
  }

  function placePickup(kind, screenX = 620, top = FIELD.groundY - 100) {
    return activatePickup(kind, state.distancePx + screenX - FIELD.playerX, top);
  }

  function jumpToDistance(metres) {
    state.distancePx = metres / DISTANCE.metresPerPixel;
    state.distanceM = Math.floor(metres);
    state.spawnCursor = state.distancePx + SPAWN.initialHazard;
    state.pickupCursor = state.distancePx + SPAWN.initialPickup;
    for (const item of items) item.active = false;
  }

  /** Test helper: clear the track and put both spawn cursors far beyond the test. */
  function clearField() {
    for (const item of items) item.active = false;
    state.spawnCursor = state.distancePx + 100000;
    state.pickupCursor = state.distancePx + 100000;
  }

  reset();
  return {
    state,
    reset,
    step,
    idle,
    requestJump,
    cutJump,
    applyHit,
    finish,
    celebrate,
    placeHazard,
    placePickup,
    jumpToDistance,
    clearField,
    addPopup,
    emit,
  };
}
