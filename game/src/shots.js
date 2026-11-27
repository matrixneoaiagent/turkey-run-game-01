// Deterministic staged scenes for the four screenshots, selected with ?shot=title|run|chase|end
// (the old starter names start/play also work). A scene is built from the real world state and
// drawn by the real renderer; nothing is composited afterwards.

import { DISTANCE, FIELD, PLAYER, SCREENS } from './config.js';

function clearRun(world) {
  world.reset();
  world.state.time = 9.2;
  world.state.player.anim = 34;
}

function addRunningParticles(world) {
  const s = world.state;
  world.emit('dust', FIELD.playerX - 22, FIELD.groundY - 2, 6, {
    vx: -55,
    vy: -14,
    spread: 70,
    size: 5,
    sizeJitter: 7,
    life: 0.6,
    color: 'rgba(196, 158, 117, 0.75)',
  });
  world.emit('feather', FIELD.playerX - 20, FIELD.groundY - 58, 4, {
    vx: -38,
    vy: -20,
    spread: 40,
    size: 2,
    sizeJitter: 3,
    life: 1.3,
    color: '#e4a45d',
  });
}

function stageTitle(world) {
  world.reset();
  world.state.time = 7.4;
  world.state.distancePx = 380;
  world.state.player.anim = 27;
  return { screen: SCREENS.title, best: 0, newBest: false };
}

function stageRun(world) {
  clearRun(world);
  world.jumpToDistance(142);
  const s = world.state;
  s.score = 1180;
  s.gap = 205;
  s.lives = 3;
  s.distanceM = 142;
  s.player.anim = 39;
  s.time = 10.6;
  // The oven ahead, a tall fence further on, and an arc of corn to pull the eye forward.
  world.placeHazard('oven', 795);
  world.placeHazard('fence', 1080);
  world.placeHazard('hay', 1188);
  world.placePickup('corn', 660, FIELD.groundY - 156);
  world.placePickup('corn', 714, FIELD.groundY - 204);
  world.placePickup('corn', 768, FIELD.groundY - 156);
  addRunningParticles(world);
  return { screen: SCREENS.play, best: 2860, newBest: false };
}

function stageChase(world) {
  clearRun(world);
  world.jumpToDistance(238);
  const s = world.state;
  s.score = 2040;
  s.gap = 78;
  s.lives = 2;
  s.distanceM = 238;
  s.player.ducking = true;
  s.player.onGround = true;
  s.player.feetY = FIELD.groundY;
  s.player.anim = 52;
  s.speed = PLAYER.duckSpeed;
  s.time = 18.6;
  // A carving knife at head height, the farmer right behind, dust from the slide.
  world.placeHazard('knife', 585);
  world.placeHazard('oven', 1030);
  world.placePickup('feather', 895, FIELD.groundY - 132);
  world.emit('dust', FIELD.playerX - 38, FIELD.groundY - 2, 12, {
    vx: -95,
    vy: -26,
    spread: 100,
    size: 5,
    sizeJitter: 8,
    life: 0.7,
    color: 'rgba(205, 167, 126, 0.8)',
  });
  world.addPopup("HE'S CLOSE!", FIELD.playerX + 4, FIELD.groundY - 232, '#ff8a70', 26);
  return { screen: SCREENS.play, best: 2860, newBest: false };
}

function stageEnd(world) {
  clearRun(world);
  world.jumpToDistance(DISTANCE.escapeMetres);
  const s = world.state;
  s.score = 4280;
  s.distanceM = DISTANCE.escapeMetres;
  s.lives = 2;
  s.gap = 176;
  s.time = 41.5;
  s.outcome = 'escaped';
  s.cause = 'escape';
  s.player.anim = 44;
  s.speed = PLAYER.runSpeed;
  world.celebrate();
  return { screen: SCREENS.end, best: 0, newBest: true };
}

export function stageShot(name, world) {
  switch (name) {
    case 'run':
    case 'play':
      return stageRun(world);
    case 'chase':
      return stageChase(world);
    case 'end':
    case 'escape':
      return stageEnd(world);
    case 'title':
    case 'start':
    default:
      return stageTitle(world);
  }
}
