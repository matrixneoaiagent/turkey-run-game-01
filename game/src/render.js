// Drawing only: world state in, pixels out. Everything is original vector art on a 1280x800
// logical canvas: a dusk sky, layered hills, a barn and silo, fences, autumn trees, falling
// leaves, a flapping turkey, a sprinting farmer, the hazards, particles, the HUD and the cards.
// The canvas is scaled to the window and letterboxed; canvas text uses local system faces.

import { DISTANCE, FIELD, FONT, FONT_SERIF, LIVES, PALETTE, PLAYER } from './config.js';
import { hash01 } from './random.js';

const W = FIELD.width;
const H = FIELD.height;
const GROUND = FIELD.groundY;

const HUD = {
  score: { x: 24, y: 16, w: 252, h: 72 },
  distance: { x: 430, y: 16, w: 420, h: 72 },
  lives: { x: 1004, y: 16, w: 252, h: 72 },
  chase: { x: 24, y: 98, w: 352, h: 58 },
  boost: { x: 516, y: 96, w: 248, h: 38 },
};

export const BUTTONS = {
  start: { x: 490, y: 576, w: 300, h: 66 },
  resume: { x: 490, y: 418, w: 300, h: 62 },
  restart: { x: 490, y: 528, w: 300, h: 66 },
  mute: { x: 1180, y: 742, w: 76, h: 40 },
};

const clamp01 = (v) => Math.max(0, Math.min(1, v));
const mod = (v, n) => ((v % n) + n) % n;

function pointIn(rect, x, y) {
  return x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;
}

function roundRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function text(ctx, value, x, y, size, color, align = 'left', weight = 700, baseline = 'alphabetic', font = FONT) {
  ctx.font = `${weight} ${size}px ${font}`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = baseline;
  ctx.fillText(value, x, y);
}

function spacedText(ctx, value, x, y, size, color, spacing, align = 'center', weight = 900, font = FONT) {
  ctx.font = `${weight} ${size}px ${font}`;
  const widths = [...value].map((ch) => ctx.measureText(ch).width);
  const total = widths.reduce((a, b) => a + b, 0) + spacing * Math.max(0, widths.length - 1);
  let cursor = align === 'center' ? x - total / 2 : align === 'right' ? x - total : x;
  ctx.fillStyle = color;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  for (let i = 0; i < widths.length; i += 1) {
    ctx.fillText(value[i], cursor, y);
    cursor += widths[i] + spacing;
  }
}

function heart(ctx, x, y, size, filled, color = PALETTE.red) {
  ctx.beginPath();
  ctx.moveTo(x, y + size * 0.28);
  ctx.bezierCurveTo(x, y, x - size * 0.5, y, x - size * 0.5, y + size * 0.34);
  ctx.bezierCurveTo(x - size * 0.5, y + size * 0.64, x - size * 0.16, y + size * 0.84, x, y + size);
  ctx.bezierCurveTo(x + size * 0.16, y + size * 0.84, x + size * 0.5, y + size * 0.64, x + size * 0.5, y + size * 0.34);
  ctx.bezierCurveTo(x + size * 0.5, y, x, y, x, y + size * 0.28);
  ctx.closePath();
  if (filled) {
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = 'rgba(60, 22, 22, 0.55)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  } else {
    ctx.fillStyle = 'rgba(255, 242, 213, 0.08)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 242, 213, 0.28)';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

function cornIcon(ctx, x, y, scale = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.fillStyle = PALETTE.cornLeaf;
  ctx.beginPath();
  ctx.ellipse(-6, 2, 8, 14, -0.45, 0, Math.PI * 2);
  ctx.ellipse(6, 2, 8, 14, 0.45, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = PALETTE.corn;
  ctx.beginPath();
  ctx.ellipse(0, 0, 7, 14, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#d9a121';
  for (let row = -2; row <= 2; row += 1) {
    for (let col = -1; col <= 1; col += 1) {
      ctx.beginPath();
      ctx.arc(col * 3.4, row * 4.2, 1.1, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function featherShape(ctx, x, y, length, width, angle, color, detail = 'rgba(255, 246, 219, 0.55)') {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.beginPath();
  ctx.moveTo(-length / 2, 0);
  ctx.quadraticCurveTo(0, -width / 2, length / 2, 0);
  ctx.quadraticCurveTo(0, width / 2, -length / 2, 0);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = 'rgba(80, 46, 20, 0.35)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.strokeStyle = detail;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-length / 2 + 2, 0);
  ctx.lineTo(length / 2 - 2, 0);
  ctx.stroke();
  ctx.restore();
}

function drawPanel(ctx, x, y, w, h, r = 16, fill = PALETTE.panel, border = 'rgba(255, 200, 87, 0.22)') {
  roundRect(ctx, x, y, w, h, r);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = border;
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

function drawButton(ctx, rect, label, hint, time, colorA = '#ffd875', colorB = '#f0a93c') {
  const pulse = 0.5 + 0.5 * Math.sin(time * 3.4);
  ctx.save();
  ctx.shadowColor = `rgba(255, 196, 80, ${0.22 + pulse * 0.16})`;
  ctx.shadowBlur = 18 + pulse * 10;
  roundRect(ctx, rect.x, rect.y, rect.w, rect.h, 16);
  const gradient = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h);
  gradient.addColorStop(0, colorA);
  gradient.addColorStop(1, colorB);
  ctx.fillStyle = gradient;
  ctx.fill();
  ctx.restore();
  roundRect(ctx, rect.x, rect.y, rect.w, rect.h, 16);
  ctx.strokeStyle = 'rgba(92, 48, 20, 0.55)';
  ctx.lineWidth = 2;
  ctx.stroke();
  text(ctx, label, rect.x + rect.w / 2, rect.y + rect.h / 2 - 2, 25, '#52250f', 'center', 900);
  if (hint) text(ctx, hint, rect.x + rect.w / 2, rect.y + rect.h + 20, 13, PALETTE.muted, 'center', 600);
}

function drawKeycap(ctx, x, y, w, label) {
  roundRect(ctx, x, y - 20, w, 28, 7);
  ctx.fillStyle = 'rgba(255, 242, 213, 0.1)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 220, 160, 0.35)';
  ctx.lineWidth = 1.3;
  ctx.stroke();
  text(ctx, label, x + w / 2, y - 1, 13, PALETTE.cream, 'center', 800);
}

function drawSpeaker(ctx, x, y, muted) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = muted ? 'rgba(255, 242, 213, 0.42)' : PALETTE.cream;
  ctx.beginPath();
  ctx.moveTo(-8, -4);
  ctx.lineTo(-3, -4);
  ctx.lineTo(3, -10);
  ctx.lineTo(3, 10);
  ctx.lineTo(-3, 4);
  ctx.lineTo(-8, 4);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = muted ? 'rgba(255, 242, 213, 0.28)' : PALETTE.cream;
  ctx.lineWidth = 1.6;
  if (muted) {
    ctx.strokeStyle = PALETTE.red;
    ctx.beginPath();
    ctx.moveTo(-11, -11);
    ctx.lineTo(11, 11);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.arc(5, 0, 7, -0.7, 0.7);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(5, 0, 12, -0.65, 0.65);
    ctx.stroke();
  }
  ctx.restore();
}

function drawTurkeyIcon(ctx, x, y, scale = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.fillStyle = PALETTE.tail[1];
  ctx.beginPath();
  ctx.arc(-5, 0, 7, Math.PI * 0.65, Math.PI * 1.8);
  ctx.fill();
  ctx.fillStyle = PALETTE.turkey;
  ctx.beginPath();
  ctx.ellipse(0, 2, 7, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(7, -5, 3.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = PALETTE.beak;
  ctx.beginPath();
  ctx.moveTo(10, -5);
  ctx.lineTo(14, -3.5);
  ctx.lineTo(10, -2);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawFarmerIcon(ctx, x, y, scale = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.fillStyle = PALETTE.farmerHat;
  ctx.fillRect(-8, -8, 16, 4);
  ctx.fillRect(-5, -14, 10, 7);
  ctx.fillStyle = PALETTE.farmerSkin;
  ctx.beginPath();
  ctx.arc(0, -2, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#5a3320';
  ctx.fillRect(-5, -1, 3, 1.5);
  ctx.fillRect(2, -1, 3, 1.5);
  ctx.restore();
}

function cloud(ctx, x, y, s, alpha) {
  ctx.fillStyle = `rgba(240, 184, 162, ${alpha})`;
  ctx.beginPath();
  ctx.ellipse(x, y, 60 * s, 16 * s, 0, 0, Math.PI * 2);
  ctx.ellipse(x - 34 * s, y + 2 * s, 34 * s, 13 * s, 0, 0, Math.PI * 2);
  ctx.ellipse(x + 38 * s, y + 1 * s, 40 * s, 14 * s, 0, 0, Math.PI * 2);
  ctx.ellipse(x + 4 * s, y - 10 * s, 34 * s, 17 * s, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawTree(ctx, x, baseY, scale, variant) {
  ctx.save();
  ctx.translate(x, baseY);
  ctx.scale(scale, scale);
  ctx.strokeStyle = PALETTE.trunk;
  ctx.lineWidth = 9;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(-3, -35, 2, -68);
  ctx.stroke();
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(0, -40);
  ctx.lineTo(-24, -66);
  ctx.moveTo(1, -52);
  ctx.lineTo(28, -76);
  ctx.stroke();
  const colors = [
    [PALETTE.leafOrange, PALETTE.leafGold, PALETTE.leafRed],
    [PALETTE.leafGold, PALETTE.leafOrange, PALETTE.leafBrown],
    [PALETTE.leafRed, PALETTE.leafOrange, PALETTE.leafGold],
  ][variant % 3];
  const blobs = [
    [-24, -86, 30, 23],
    [10, -104, 34, 27],
    [40, -80, 28, 22],
    [-4, -74, 30, 22],
    [26, -116, 24, 20],
  ];
  for (let i = 0; i < blobs.length; i += 1) {
    const [bx, by, rx, ry] = blobs[i];
    ctx.fillStyle = colors[i % colors.length];
    ctx.beginPath();
    ctx.ellipse(bx, by, rx, ry, (i - 2) * 0.2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 0.18;
  ctx.fillStyle = '#24151b';
  ctx.beginPath();
  ctx.ellipse(4, -88, 58, 40, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.restore();
}

function drawBarn(ctx, x, baseY, scale) {
  ctx.save();
  ctx.translate(x, baseY);
  ctx.scale(scale, scale);
  // Silo behind the barn.
  ctx.fillStyle = '#8b8077';
  ctx.fillRect(190, -148, 46, 148);
  ctx.strokeStyle = 'rgba(50, 37, 35, 0.5)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 5; i += 1) ctx.strokeRect(190, -148 + i * 29, 46, 29);
  ctx.fillStyle = '#a79a8d';
  ctx.beginPath();
  ctx.ellipse(213, -148, 23, 12, 0, Math.PI, Math.PI * 2);
  ctx.fill();
  // Barn wall and roof.
  ctx.fillStyle = PALETTE.barn;
  ctx.fillRect(0, -124, 188, 124);
  ctx.fillStyle = PALETTE.barnDark;
  ctx.fillRect(0, -24, 188, 24);
  ctx.fillStyle = PALETTE.roof;
  ctx.beginPath();
  ctx.moveTo(-14, -120);
  ctx.lineTo(94, -184);
  ctx.lineTo(202, -120);
  ctx.lineTo(188, -108);
  ctx.lineTo(94, -166);
  ctx.lineTo(0, -108);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(238, 207, 160, 0.55)';
  ctx.lineWidth = 2;
  ctx.strokeRect(8, -116, 172, 112);
  // Loft door.
  ctx.fillStyle = '#3d2525';
  ctx.fillRect(74, -110, 40, 40);
  ctx.strokeStyle = 'rgba(238, 207, 160, 0.65)';
  ctx.strokeRect(74, -110, 40, 40);
  ctx.beginPath();
  ctx.moveTo(74, -110);
  ctx.lineTo(114, -70);
  ctx.moveTo(114, -110);
  ctx.lineTo(74, -70);
  ctx.stroke();
  // Big doors.
  ctx.fillStyle = '#4a2927';
  ctx.fillRect(56, -76, 76, 76);
  ctx.strokeStyle = 'rgba(238, 207, 160, 0.6)';
  ctx.strokeRect(56, -76, 76, 76);
  ctx.beginPath();
  ctx.moveTo(94, -76);
  ctx.lineTo(94, 0);
  ctx.moveTo(56, -38);
  ctx.lineTo(132, -38);
  ctx.stroke();
  // Warm windows.
  for (const [wx, wy] of [[24, -92], [142, -96]]) {
    ctx.fillStyle = '#ffcf74';
    ctx.fillRect(wx, wy, 22, 20);
    ctx.strokeStyle = '#3d2525';
    ctx.lineWidth = 2;
    ctx.strokeRect(wx, wy, 22, 20);
    ctx.beginPath();
    ctx.moveTo(wx + 11, wy);
    ctx.lineTo(wx + 11, wy + 20);
    ctx.moveTo(wx, wy + 10);
    ctx.lineTo(wx + 22, wy + 10);
    ctx.stroke();
  }
  ctx.restore();
}

function drawFenceLine(ctx, offset, baseY, scale = 1, front = false) {
  const spacing = 58 * scale;
  const start = -mod(offset, spacing) - spacing;
  const railColor = front ? '#7b5637' : '#9b7751';
  ctx.save();
  for (let x = start; x < W + spacing; x += spacing) {
    ctx.fillStyle = railColor;
    ctx.fillRect(x + 4 * scale, baseY - 42 * scale, 7 * scale, 42 * scale);
    ctx.fillStyle = 'rgba(50, 30, 22, 0.35)';
    ctx.fillRect(x + 8 * scale, baseY - 42 * scale, 2 * scale, 42 * scale);
    ctx.fillStyle = railColor;
    ctx.fillRect(x - spacing + 15 * scale, baseY - 33 * scale, spacing + 6 * scale, 5 * scale);
    ctx.fillRect(x - spacing + 15 * scale, baseY - 17 * scale, spacing + 6 * scale, 5 * scale);
  }
  ctx.restore();
}

function drawSign(ctx, x, y) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = '#6b452d';
  ctx.fillRect(6, 0, 7, 60);
  ctx.fillStyle = '#9a6b42';
  ctx.beginPath();
  ctx.moveTo(0, -8);
  ctx.lineTo(128, -8);
  ctx.lineTo(145, 12);
  ctx.lineTo(128, 32);
  ctx.lineTo(0, 32);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#5c3622';
  ctx.lineWidth = 2;
  ctx.stroke();
  text(ctx, 'FREEDOM  >', 16, 18, 17, '#3c2418', 'left', 900);
  ctx.restore();
}

function drawPumpkin(ctx, x, y, scale, alpha = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.globalAlpha = alpha;
  ctx.fillStyle = '#c95e2e';
  ctx.beginPath();
  ctx.ellipse(0, 0, 28, 21, 0, 0, Math.PI * 2);
  ctx.ellipse(-15, 0, 15, 20, 0, 0, Math.PI * 2);
  ctx.ellipse(15, 0, 15, 20, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(90, 37, 19, 0.35)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(0, 0, 28, 21, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#55703b';
  ctx.fillRect(-3, -24, 6, 10);
  ctx.restore();
}

function drawLeaf(ctx, x, y, size, angle, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(-size, 0);
  ctx.quadraticCurveTo(0, -size * 0.62, size, 0);
  ctx.quadraticCurveTo(0, size * 0.62, -size, 0);
  ctx.fill();
  ctx.strokeStyle = 'rgba(75, 42, 25, 0.35)';
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.moveTo(-size, 0);
  ctx.lineTo(size, 0);
  ctx.stroke();
  ctx.restore();
}

function drawAmbientLeaves(ctx, state, front) {
  const colors = [PALETTE.leafOrange, PALETTE.leafGold, PALETTE.leafRed, PALETTE.leafBrown];
  const count = front ? 9 : 24;
  for (let i = 0; i < count; i += 1) {
    const seed = i + (front ? 70 : 0);
    const speed = 13 + hash01(seed * 3.1) * 22;
    const x = mod(hash01(seed * 1.7) * 1500 + state.time * (8 + speed * 0.5) - state.distancePx * (0.06 + hash01(seed + 4) * 0.16), W + 160) - 80;
    const y = mod(hash01(seed * 2.3) * 940 + state.time * speed, H + 120) - 60;
    const size = (front ? 6 : 3.4) + hash01(seed + 8) * (front ? 5 : 3.4);
    const angle = state.time * (0.7 + hash01(seed + 5) * 1.4) + hash01(seed + 9) * 6;
    ctx.globalAlpha = front ? 0.82 : 0.55;
    drawLeaf(ctx, x, y, size, angle, colors[(i + (front ? 2 : 0)) % colors.length]);
  }
  ctx.globalAlpha = 1;
}

function drawBackground(ctx, state) {
  // Dusk sky.
  const sky = ctx.createLinearGradient(0, 0, 0, GROUND);
  sky.addColorStop(0, PALETTE.skyTop);
  sky.addColorStop(0.42, PALETTE.skyMid);
  sky.addColorStop(0.72, PALETTE.skyLow);
  sky.addColorStop(0.92, PALETTE.horizon);
  sky.addColorStop(1, '#ffd287');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  // A handful of early stars.
  for (let i = 0; i < 26; i += 1) {
    const x = hash01(i * 2 + 1) * W;
    const y = hash01(i * 2 + 2) * 250;
    const twinkle = 0.16 + 0.18 * (0.5 + 0.5 * Math.sin(state.time * 1.2 + i));
    ctx.fillStyle = `rgba(255, 240, 205, ${twinkle})`;
    ctx.fillRect(x, y, 2, 2);
  }

  // The low sun.
  const sunX = 988;
  const sunY = 468;
  const glow = ctx.createRadialGradient(sunX, sunY, 8, sunX, sunY, 190);
  glow.addColorStop(0, 'rgba(255, 228, 164, 0.75)');
  glow.addColorStop(0.45, 'rgba(255, 194, 112, 0.28)');
  glow.addColorStop(1, 'rgba(255, 170, 100, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(sunX - 200, sunY - 200, 400, 400);
  ctx.fillStyle = PALETTE.sun;
  ctx.beginPath();
  ctx.arc(sunX, sunY, 58, 0, Math.PI * 2);
  ctx.fill();

  // Slow clouds.
  for (let i = 0; i < 5; i += 1) {
    const speed = 2.5 + hash01(i + 20) * 4;
    const x = mod(hash01(i + 12) * 1500 + state.time * speed - state.distancePx * 0.012, W + 420) - 210;
    const y = 118 + hash01(i + 30) * 190;
    const scale = 0.7 + hash01(i + 40) * 0.65;
    cloud(ctx, x, y, scale, 0.16 + hash01(i + 50) * 0.12);
  }

  // Distant hills, each layer moving a little slower than the one in front.
  drawHillLayer(ctx, state.distancePx * 0.045, 538, 30, 260, PALETTE.hillFar);
  drawHillLayer(ctx, state.distancePx * 0.095, 574, 26, 210, PALETTE.hillMid);
  drawHillLayer(ctx, state.distancePx * 0.16, 607, 18, 170, PALETTE.hillNear);

  // The far field band.
  const field = ctx.createLinearGradient(0, 594, 0, GROUND);
  field.addColorStop(0, '#7a4e35');
  field.addColorStop(1, '#4b2e25');
  ctx.fillStyle = field;
  ctx.fillRect(0, 594, W, GROUND - 594 + 2);

  // Barns, silos and trees on the middle distance.
  const layer = state.distancePx * 0.28;
  const period = 1560;
  const offset = mod(layer, period);
  for (let base = -offset - period; base < W + period; base += period) {
    drawBarn(ctx, base + 150, 650, 0.92);
    drawTree(ctx, base + 540, 652, 0.98, 0);
    drawTree(ctx, base + 690, 650, 0.7, 1);
    drawTree(ctx, base + 980, 654, 1.08, 2);
    drawTree(ctx, base + 1280, 650, 0.64, 1);
  }

  // A fence along the field.
  drawFenceLine(ctx, state.distancePx * 0.52, 656, 0.92, false);

  // Dirt path the turkey runs on.
  const path = ctx.createLinearGradient(0, GROUND, 0, 772);
  path.addColorStop(0, PALETTE.pathLight);
  path.addColorStop(1, PALETTE.path);
  ctx.fillStyle = path;
  ctx.fillRect(0, GROUND, W, 100);

  // Ground edge grass.
  for (let i = 0; i < 70; i += 1) {
    const x = mod(hash01(i * 3 + 1) * 1400 - state.distancePx, 1430) - 75;
    const y = GROUND + 1;
    const h = 4 + hash01(i + 7) * 8;
    ctx.strokeStyle = i % 3 === 0 ? '#9a6d3d' : '#7b5030';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + 2, y - h * 0.5, x + (hash01(i + 2) - 0.5) * 6, y - h);
    ctx.stroke();
  }

  // Ruts and pebbles on the path.
  ctx.save();
  ctx.strokeStyle = 'rgba(50, 28, 22, 0.32)';
  ctx.lineWidth = 3;
  ctx.setLineDash([26, 34]);
  ctx.lineDashOffset = -mod(state.distancePx, 60);
  ctx.beginPath();
  ctx.moveTo(0, 710);
  ctx.lineTo(W, 710);
  ctx.moveTo(0, 744);
  ctx.lineTo(W, 744);
  ctx.stroke();
  ctx.setLineDash([]);
  for (let i = 0; i < 46; i += 1) {
    const x = mod(hash01(i * 4 + 3) * 1400 - state.distancePx * 1.03, 1430) - 40;
    const y = 684 + hash01(i + 12) * 72;
    ctx.fillStyle = i % 4 === 0 ? 'rgba(224, 184, 127, 0.28)' : 'rgba(55, 31, 24, 0.32)';
    ctx.beginPath();
    ctx.ellipse(x, y, 1.5 + hash01(i + 20) * 2.4, 1 + hash01(i + 30) * 1.4, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // Foreground soil below the path.
  const soil = ctx.createLinearGradient(0, 772, 0, H);
  soil.addColorStop(0, '#33211d');
  soil.addColorStop(1, '#1f1516');
  ctx.fillStyle = soil;
  ctx.fillRect(0, 772, W, H - 772);

  // Big, soft foreground tufts at the edges.
  for (let i = 0; i < 18; i += 1) {
    const x = i < 9 ? 10 + i * 18 : W - 10 - (i - 9) * 18;
    const h = 24 + hash01(i + 90) * 58;
    ctx.strokeStyle = 'rgba(28, 18, 20, 0.85)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(x, H);
    ctx.quadraticCurveTo(x + (hash01(i + 2) - 0.5) * 24, H - h * 0.55, x + (hash01(i + 3) - 0.5) * 40, H - h);
    ctx.stroke();
  }

  drawAmbientLeaves(ctx, state, false);
}

function drawHillLayer(ctx, offset, baseY, amplitude, wavelength, color) {
  ctx.beginPath();
  ctx.moveTo(-20, H);
  for (let x = -20; x <= W + 20; x += 16) {
    const y =
      baseY +
      Math.sin((x + offset) / wavelength) * amplitude +
      Math.sin((x + offset) / (wavelength * 0.37) + 1.7) * amplitude * 0.34;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(W + 20, H);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

// ------------------------------------------------------------------ characters

function drawTurkey(ctx, cx, feetY, anim, options = {}) {
  const ducking = Boolean(options.ducking);
  const airborne = Boolean(options.airborne);
  const boost = Boolean(options.boost);
  const alpha = options.alpha ?? 1;
  const scale = options.scale ?? 1;
  const groundY = options.groundY ?? GROUND;
  const time = options.time ?? 0;
  const invulnerable = options.invulnerable ?? 0;

  if (invulnerable > 0 && Math.floor(invulnerable * 18) % 2 === 0) ctx.globalAlpha = 0.42;
  ctx.save();
  ctx.translate(cx, feetY);
  ctx.scale(scale, scale);
  ctx.globalAlpha *= alpha;

  // Ground shadow stays put while the turkey jumps.
  const heightOff = Math.max(0, groundY - feetY);
  ctx.fillStyle = `rgba(24, 13, 18, ${0.24 + Math.max(0, 0.18 - heightOff / 900)})`;
  ctx.beginPath();
  ctx.ellipse(0, groundY - feetY + 2, 38 - Math.min(18, heightOff / 10), 9, 0, 0, Math.PI * 2);
  ctx.fill();

  if (boost) {
    const aura = ctx.createRadialGradient(0, -52, 8, 0, -52, 82);
    aura.addColorStop(0, 'rgba(255, 219, 110, 0.34)');
    aura.addColorStop(1, 'rgba(255, 190, 70, 0)');
    ctx.fillStyle = aura;
    ctx.fillRect(-90, -145, 180, 150);
  }

  const bob = ducking || airborne ? 0 : Math.sin(anim * 2) * 2;
  const wingFlap = airborne ? -1.25 + Math.sin(time * 9) * 0.16 : -0.28 + Math.sin(anim) * 0.22;
  const legSwing = Math.sin(anim * 1.25);
  const legSwing2 = Math.sin(anim * 1.25 + Math.PI);

  // Legs behind the body.
  ctx.strokeStyle = PALETTE.leg;
  ctx.lineWidth = 5.5;
  ctx.lineCap = 'round';
  if (ducking) {
    ctx.beginPath();
    ctx.moveTo(-10, -18);
    ctx.lineTo(-30, -10);
    ctx.lineTo(-38, -2);
    ctx.moveTo(8, -18);
    ctx.lineTo(26, -8);
    ctx.lineTo(33, -2);
    ctx.stroke();
    // Slide streaks behind the flattened bird.
    ctx.strokeStyle = 'rgba(238, 206, 158, 0.55)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-52, -28);
    ctx.lineTo(-78, -28);
    ctx.moveTo(-56, -17);
    ctx.lineTo(-88, -17);
    ctx.moveTo(-50, -7);
    ctx.lineTo(-70, -7);
    ctx.stroke();
    ctx.strokeStyle = PALETTE.leg;
  } else if (airborne) {
    ctx.beginPath();
    ctx.moveTo(-9, -28);
    ctx.quadraticCurveTo(-22, -18, -28, -8);
    ctx.moveTo(10, -28);
    ctx.quadraticCurveTo(20, -16, 26, -6);
    ctx.stroke();
  } else {
    for (const [phase, side] of [[legSwing, -1], [legSwing2, 1]]) {
      const hipX = side * 8;
      const hipY = -32;
      const kneeX = hipX + phase * 9;
      const kneeY = -16;
      const footX = hipX + phase * 16;
      const footY = -2 - Math.max(0, phase) * 5;
      ctx.beginPath();
      ctx.moveTo(hipX, hipY);
      ctx.lineTo(kneeX, kneeY);
      ctx.lineTo(footX, footY);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(footX - 7, footY);
      ctx.lineTo(footX + 9, footY);
      ctx.moveTo(footX, footY);
      ctx.lineTo(footX + 3, footY + 5);
      ctx.stroke();
    }
  }

  // Tail fan.
  const tailBaseX = ducking ? -38 : -24;
  const tailBaseY = ducking ? -26 : -55 + bob;
  const tailSpread = ducking ? 0.5 : 1;
  for (let i = 0; i < 5; i += 1) {
    const angle = Math.PI * (0.8 + i * 0.105 * tailSpread) + (airborne ? -0.08 : 0);
    ctx.save();
    ctx.translate(tailBaseX, tailBaseY);
    ctx.rotate(angle);
    ctx.fillStyle = PALETTE.tail[i];
    ctx.beginPath();
    ctx.ellipse(-24, 0, 27, 8.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(75, 38, 20, 0.3)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  }

  // Body.
  ctx.fillStyle = PALETTE.turkey;
  ctx.beginPath();
  if (ducking) {
    ctx.ellipse(0, -24, 46, 21, -0.05, 0, Math.PI * 2);
  } else {
    ctx.ellipse(0, -54 + bob, 33, 29, 0.04, 0, Math.PI * 2);
  }
  ctx.fill();
  ctx.strokeStyle = 'rgba(73, 36, 20, 0.32)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = PALETTE.turkeyLight;
  ctx.beginPath();
  if (ducking) ctx.ellipse(5, -18, 30, 12, -0.05, 0, Math.PI * 2);
  else ctx.ellipse(4, -47 + bob, 24, 18, 0.05, 0, Math.PI * 2);
  ctx.fill();

  // Wing.
  ctx.save();
  if (ducking) {
    ctx.translate(-6, -26);
    ctx.rotate(-0.25);
    ctx.fillStyle = PALETTE.turkeyDark;
    ctx.beginPath();
    ctx.ellipse(0, 0, 26, 10, 0, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.translate(-5, -58 + bob);
    ctx.rotate(wingFlap);
    ctx.fillStyle = PALETTE.turkeyDark;
    ctx.beginPath();
    ctx.ellipse(0, 0, 21, 13, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(238, 196, 140, 0.35)';
    ctx.lineWidth = 1.3;
    for (let i = -1; i <= 1; i += 1) {
      ctx.beginPath();
      ctx.moveTo(-13, i * 4);
      ctx.quadraticCurveTo(0, i * 5 - 2, 15, i * 4);
      ctx.stroke();
    }
  }
  ctx.restore();

  // Neck and head.
  ctx.strokeStyle = PALETTE.turkeyLight;
  ctx.lineWidth = 13;
  ctx.lineCap = 'round';
  ctx.beginPath();
  if (ducking) {
    ctx.moveTo(22, -24);
    ctx.quadraticCurveTo(42, -22, 56, -32);
  } else {
    ctx.moveTo(18, -68 + bob);
    ctx.quadraticCurveTo(31, -86 + bob, 33, -97 + bob);
  }
  ctx.stroke();
  const headX = ducking ? 59 : 34;
  const headY = ducking ? -33 : -99 + bob;
  ctx.fillStyle = PALETTE.turkeyLight;
  ctx.beginPath();
  ctx.arc(headX, headY, ducking ? 10 : 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = PALETTE.wattle;
  ctx.beginPath();
  ctx.ellipse(headX + 4, headY + 12, 4.5, 7.5, 0.15, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = PALETTE.beak;
  ctx.beginPath();
  ctx.moveTo(headX + 8, headY - 3);
  ctx.lineTo(headX + 23, headY + 1);
  ctx.lineTo(headX + 8, headY + 5);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(138, 78, 26, 0.5)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = '#fff8e7';
  ctx.beginPath();
  ctx.arc(headX + 3, headY - 4, 3.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#241619';
  ctx.beginPath();
  ctx.arc(headX + 4.2, headY - 4, 1.8, 0, Math.PI * 2);
  ctx.fill();

  if (boost) {
    ctx.strokeStyle = 'rgba(255, 220, 110, 0.65)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, -54, 48, 0.2, 2.9);
    ctx.stroke();
  }

  ctx.restore();
  ctx.globalAlpha = 1;
}

function drawFarmer(ctx, x, feetY, anim, options = {}) {
  const facing = options.facing ?? 1;
  const scale = options.scale ?? 1;
  const close = Boolean(options.close);
  const alpha = options.alpha ?? 1;
  ctx.save();
  ctx.translate(x, feetY);
  ctx.scale(facing * scale, scale);
  ctx.globalAlpha = alpha;

  ctx.fillStyle = 'rgba(24, 13, 18, 0.26)';
  ctx.beginPath();
  ctx.ellipse(0, 2, 30, 8, 0, 0, Math.PI * 2);
  ctx.fill();

  const bob = Math.abs(Math.sin(anim * 1.15)) * 3;
  const legA = Math.sin(anim * 1.15);
  const legB = Math.sin(anim * 1.15 + Math.PI);

  // Legs.
  ctx.strokeStyle = PALETTE.farmerOveralls;
  ctx.lineWidth = 10;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-8, -50 + bob);
  ctx.lineTo(-9 + legA * 13, -25);
  ctx.lineTo(-9 + legA * 18, -7);
  ctx.moveTo(8, -50 + bob);
  ctx.lineTo(9 + legB * 13, -25);
  ctx.lineTo(9 + legB * 18, -7);
  ctx.stroke();
  ctx.strokeStyle = '#3b2b25';
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(-9 + legA * 18, -7);
  ctx.lineTo(-9 + legA * 18 + 12, -5);
  ctx.moveTo(9 + legB * 18, -7);
  ctx.lineTo(9 + legB * 18 + 12, -5);
  ctx.stroke();

  // Body, shirt and overalls.
  ctx.fillStyle = PALETTE.farmerOveralls;
  ctx.beginPath();
  ctx.ellipse(0, -66 + bob, 24, 29, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = PALETTE.farmerShirt;
  ctx.beginPath();
  ctx.ellipse(0, -77 + bob, 25, 19, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = PALETTE.farmerOveralls;
  ctx.fillRect(-18, -70 + bob, 36, 15);
  ctx.strokeStyle = 'rgba(30, 30, 42, 0.5)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-10, -68 + bob);
  ctx.lineTo(-9, -55 + bob);
  ctx.moveTo(10, -68 + bob);
  ctx.lineTo(9, -55 + bob);
  ctx.stroke();

  // Arms: one forward, one back, both with a good swing.
  ctx.strokeStyle = PALETTE.farmerShirt;
  ctx.lineWidth = 8;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-17, -78 + bob);
  ctx.lineTo(-28 - legA * 6, -64 + bob);
  ctx.lineTo(-20 - legA * 9, -53 + bob);
  ctx.moveTo(17, -78 + bob);
  ctx.lineTo(28 + legB * 6, -67 + bob);
  ctx.lineTo(35 + legB * 8, -80 + bob);
  ctx.stroke();
  ctx.fillStyle = PALETTE.farmerSkin;
  ctx.beginPath();
  ctx.arc(-20 - legA * 9, -53 + bob, 4.5, 0, Math.PI * 2);
  ctx.arc(35 + legB * 8, -80 + bob, 4.5, 0, Math.PI * 2);
  ctx.fill();

  // A wooden spoon in the front hand: the chase is serious, the weapon is not.
  ctx.save();
  ctx.translate(35 + legB * 8, -80 + bob);
  ctx.rotate(-0.55);
  ctx.strokeStyle = '#8a5832';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, -20);
  ctx.stroke();
  ctx.fillStyle = '#a56e3d';
  ctx.beginPath();
  ctx.ellipse(0, -24, 5, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Head, face, bandana and straw hat.
  ctx.fillStyle = PALETTE.farmerSkin;
  ctx.beginPath();
  ctx.arc(2, -98 + bob, 16, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#6a3c22';
  ctx.beginPath();
  ctx.arc(-8, -100 + bob, 2.4, 0, Math.PI * 2);
  ctx.arc(12, -101 + bob, 2.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#6a3c22';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(-9, -106 + bob);
  ctx.lineTo(-2, -103 + bob);
  ctx.moveTo(15, -107 + bob);
  ctx.lineTo(8, -104 + bob);
  ctx.stroke();
  ctx.fillStyle = '#7d4a2a';
  ctx.beginPath();
  ctx.ellipse(2, -90 + bob, 6, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = PALETTE.red;
  ctx.beginPath();
  ctx.moveTo(-12, -86 + bob);
  ctx.lineTo(15, -86 + bob);
  ctx.lineTo(2, -78 + bob);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = PALETTE.farmerHat;
  ctx.beginPath();
  ctx.ellipse(2, -113 + bob, 25, 6, -0.04, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(2, -119 + bob, 14, 10, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#8f6a38';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-10, -117 + bob);
  ctx.lineTo(14, -117 + bob);
  ctx.stroke();

  if (close) {
    ctx.strokeStyle = '#ffd764';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(22, -136 + bob);
    ctx.lineTo(28, -145 + bob);
    ctx.moveTo(29, -131 + bob);
    ctx.lineTo(39, -136 + bob);
    ctx.stroke();
  }
  ctx.restore();
  ctx.globalAlpha = 1;
}

// ------------------------------------------------------------------ hazards and pickups

function drawHay(ctx, x, y, w, h, time) {
  ctx.save();
  ctx.fillStyle = '#b9863f';
  roundRect(ctx, x, y, w, h, 10);
  ctx.fill();
  ctx.strokeStyle = '#825a29';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = '#d9a852';
  roundRect(ctx, x + 5, y + 4, w - 10, h - 9, 8);
  ctx.fill();
  ctx.strokeStyle = '#a97935';
  ctx.lineWidth = 2;
  for (let i = 1; i < 4; i += 1) {
    ctx.beginPath();
    ctx.moveTo(x + (w / 4) * i, y + 4);
    ctx.lineTo(x + (w / 4) * i, y + h - 5);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(x + 6, y + h / 2);
  ctx.lineTo(x + w - 6, y + h / 2);
  ctx.stroke();
  ctx.strokeStyle = '#f2cb7d';
  ctx.lineWidth = 1.4;
  for (let i = 0; i < 6; i += 1) {
    const sx = x + 8 + ((i * 17 + Math.sin(time + i) * 3) % (w - 16));
    ctx.beginPath();
    ctx.moveTo(sx, y + 7);
    ctx.lineTo(sx + 8, y - 4 - (i % 2) * 4);
    ctx.stroke();
  }
  ctx.restore();
}

function drawFence(ctx, x, y, w, h) {
  ctx.save();
  const post = 9;
  ctx.fillStyle = '#b99b70';
  ctx.fillRect(x + 8, y, post, h);
  ctx.fillRect(x + w - 17, y, post, h);
  ctx.fillStyle = 'rgba(83, 53, 32, 0.4)';
  ctx.fillRect(x + 13, y + 2, 3, h - 2);
  ctx.fillRect(x + w - 12, y + 2, 3, h - 2);
  ctx.fillStyle = '#c9ae82';
  for (let i = 0; i < 3; i += 1) {
    const ry = y + 10 + i * (h - 28) * 0.5;
    ctx.fillRect(x, ry, w, 8);
    ctx.fillStyle = 'rgba(83, 53, 32, 0.25)';
    ctx.fillRect(x, ry + 6, w, 2);
    ctx.fillStyle = '#c9ae82';
  }
  ctx.fillStyle = '#e4d1ac';
  ctx.beginPath();
  ctx.moveTo(x + 8, y);
  ctx.lineTo(x + 17, y);
  ctx.lineTo(x + 13, y - 8);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawOven(ctx, x, y, w, h, time) {
  ctx.save();
  const glow = ctx.createRadialGradient(x + w * 0.45, y + h * 0.55, 4, x + w * 0.45, y + h * 0.55, w * 0.8);
  glow.addColorStop(0, 'rgba(255, 148, 58, 0.28)');
  glow.addColorStop(1, 'rgba(255, 110, 40, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(x - 30, y - 20, w + 60, h + 50);

  // Feet.
  ctx.fillStyle = '#25202a';
  ctx.fillRect(x + 14, y + h - 9, 12, 9);
  ctx.fillRect(x + w - 26, y + h - 9, 12, 9);
  // Stove body.
  ctx.fillStyle = '#37313b';
  roundRect(ctx, x, y + 8, w, h - 12, 10);
  ctx.fill();
  ctx.strokeStyle = '#18141d';
  ctx.lineWidth = 2.5;
  ctx.stroke();
  // Top plate.
  ctx.fillStyle = '#524a56';
  roundRect(ctx, x - 5, y, w + 10, 18, 7);
  ctx.fill();
  ctx.strokeStyle = '#1d1821';
  ctx.lineWidth = 2;
  ctx.stroke();
  // Chimney with a lazy smoke puff.
  ctx.fillStyle = '#302a35';
  ctx.fillRect(x + w - 32, y - 46, 18, 50);
  ctx.fillStyle = 'rgba(210, 190, 190, 0.2)';
  for (let i = 0; i < 3; i += 1) {
    const puff = (time * 22 + i * 20) % 58;
    ctx.beginPath();
    ctx.arc(x + w - 23 + Math.sin(time + i) * 8, y - 50 - puff, 5 + puff * 0.14, 0, Math.PI * 2);
    ctx.fill();
  }
  // Oven door.
  ctx.fillStyle = '#1e1a23';
  roundRect(ctx, x + 13, y + 28, w - 26, h - 44, 7);
  ctx.fill();
  ctx.strokeStyle = '#625767';
  ctx.lineWidth = 2;
  ctx.stroke();
  const windowGlow = ctx.createLinearGradient(0, y + 34, 0, y + h - 20);
  windowGlow.addColorStop(0, '#ff9b3f');
  windowGlow.addColorStop(1, '#c44222');
  ctx.fillStyle = windowGlow;
  roundRect(ctx, x + 23, y + 38, w - 46, h - 62, 5);
  ctx.fill();
  ctx.strokeStyle = 'rgba(40, 18, 14, 0.65)';
  ctx.lineWidth = 2;
  for (let i = 1; i < 4; i += 1) {
    ctx.beginPath();
    ctx.moveTo(x + 23 + (i * (w - 46)) / 4, y + 38);
    ctx.lineTo(x + 23 + (i * (w - 46)) / 4, y + h - 24);
    ctx.stroke();
  }
  ctx.fillStyle = '#c7bcc9';
  ctx.fillRect(x + w - 30, y + 34, 17, 4);
  ctx.restore();
}

function drawFork(ctx, x, y, w, h) {
  ctx.save();
  ctx.translate(x + w * 0.58, y + h);
  ctx.rotate(-0.38);
  ctx.strokeStyle = '#7b4a2a';
  ctx.lineWidth = 8;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, -h * 0.78);
  ctx.stroke();
  ctx.strokeStyle = '#c4cbd3';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(-13, -h * 0.78);
  ctx.lineTo(-13, -h);
  ctx.moveTo(0, -h * 0.78);
  ctx.lineTo(0, -h - 4);
  ctx.moveTo(13, -h * 0.78);
  ctx.lineTo(13, -h);
  ctx.moveTo(-14, -h * 0.78);
  ctx.lineTo(14, -h * 0.78);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-12, -h * 0.9);
  ctx.lineTo(-12, -h * 0.98);
  ctx.moveTo(1, -h * 0.9);
  ctx.lineTo(1, -h * 0.99);
  ctx.stroke();
  ctx.restore();
}

function drawKnife(ctx, x, y, w, h, time, phase) {
  const bob = Math.sin(time * 3 + phase) * 3;
  const top = y + bob;
  ctx.save();
  // Chain and ring.
  ctx.strokeStyle = 'rgba(212, 220, 228, 0.5)';
  ctx.lineWidth = 2;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(x + w * 0.82, top - 86);
  ctx.lineTo(x + w * 0.82, top + 16);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.strokeStyle = '#b8c2cc';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(x + w * 0.82, top - 88, 7, 0, Math.PI * 2);
  ctx.stroke();
  // Blade.
  const blade = ctx.createLinearGradient(x, top, x, top + h);
  blade.addColorStop(0, '#f3f6fa');
  blade.addColorStop(0.45, '#c9d2db');
  blade.addColorStop(1, '#8c98a5');
  ctx.fillStyle = blade;
  ctx.beginPath();
  ctx.moveTo(x + 86, top + 4);
  ctx.lineTo(x + 22, top + 4);
  ctx.quadraticCurveTo(x + 2, top + 12, x + 6, top + 39);
  ctx.lineTo(x + 86, top + 39);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#5e6a77';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x + 22, top + 10);
  ctx.quadraticCurveTo(x + 12, top + 20, x + 19, top + 32);
  ctx.stroke();
  // Handle.
  ctx.fillStyle = PALETTE.handle;
  roundRect(ctx, x + 86, top + 13, 28, 19, 5);
  ctx.fill();
  ctx.strokeStyle = '#432817';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = '#c5a477';
  ctx.beginPath();
  ctx.arc(x + 94, top + 22, 2, 0, Math.PI * 2);
  ctx.arc(x + 105, top + 22, 2, 0, Math.PI * 2);
  ctx.fill();
  // Glint.
  ctx.strokeStyle = `rgba(255, 255, 255, ${0.55 + Math.sin(time * 4 + phase) * 0.25})`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x + 48, top - 5);
  ctx.lineTo(x + 58, top + 3);
  ctx.moveTo(x + 54, top - 7);
  ctx.lineTo(x + 62, top - 1);
  ctx.stroke();
  ctx.restore();
}

function drawCorn(ctx, x, y, w, h, time, phase) {
  const bob = Math.sin(time * 2.2 + phase) * 3;
  const cx = x + w / 2;
  const cy = y + h / 2 + bob;
  ctx.save();
  const glow = ctx.createRadialGradient(cx, cy, 2, cx, cy, 30);
  glow.addColorStop(0, 'rgba(255, 221, 100, 0.24)');
  glow.addColorStop(1, 'rgba(255, 221, 100, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(cx - 32, cy - 32, 64, 64);
  ctx.fillStyle = PALETTE.cornLeaf;
  ctx.beginPath();
  ctx.ellipse(cx - 8, cy + 8, 7, 13, -0.5, 0, Math.PI * 2);
  ctx.ellipse(cx + 8, cy + 8, 7, 13, 0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = PALETTE.corn;
  ctx.beginPath();
  ctx.ellipse(cx, cy, 8, 15, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#d5a11f';
  for (let row = -3; row <= 3; row += 1) {
    for (let col = -1; col <= 1; col += 1) {
      ctx.beginPath();
      ctx.arc(cx + col * 3.6, cy + row * 3.8, 1.1, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.strokeStyle = 'rgba(255, 246, 190, 0.75)';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.ellipse(cx - 2, cy - 2, 5, 11, 0, -1.3, 1.3);
  ctx.stroke();
  ctx.restore();
}

function drawGoldenFeather(ctx, x, y, w, h, time, phase) {
  const bob = Math.sin(time * 2.8 + phase) * 4;
  const cx = x + w / 2;
  const cy = y + h / 2 + bob;
  ctx.save();
  const glow = ctx.createRadialGradient(cx, cy, 3, cx, cy, 54);
  glow.addColorStop(0, 'rgba(255, 221, 110, 0.42)');
  glow.addColorStop(1, 'rgba(255, 200, 80, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(cx - 56, cy - 56, 112, 112);
  featherShape(ctx, cx, cy, 58, 30, -0.35 + Math.sin(time * 2 + phase) * 0.08, '#ffd764');
  ctx.strokeStyle = 'rgba(255, 250, 210, 0.85)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx - 22, cy + 8);
  ctx.lineTo(cx + 22, cy - 8);
  ctx.stroke();
  for (let i = -2; i <= 2; i += 1) {
    const sparkle = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(time * 4 + i));
    ctx.fillStyle = `rgba(255, 248, 194, ${sparkle})`;
    ctx.beginPath();
    ctx.arc(cx + i * 15, cy - 26 + (i % 2) * 8, 1.7, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawItems(ctx, state) {
  const items = state.items;
  for (let i = 0; i < items.length; i += 1) {
    const item = items[i];
    if (!item.active) continue;
    const x = item.x - state.distancePx + FIELD.playerX;
    if (x + item.w < -180 || x > W + 180) continue;
    switch (item.kind) {
      case 'hay':
        drawHay(ctx, x, item.y, item.w, item.h, state.time);
        break;
      case 'fence':
        drawFence(ctx, x, item.y, item.w, item.h);
        break;
      case 'oven':
        drawOven(ctx, x, item.y, item.w, item.h, state.time);
        break;
      case 'fork':
        drawFork(ctx, x, item.y, item.w, item.h);
        break;
      case 'knife':
        drawKnife(ctx, x, item.y, item.w, item.h, state.time, item.phase);
        break;
      case 'corn':
        drawCorn(ctx, x, item.y, item.w, item.h, state.time, item.phase);
        break;
      case 'feather':
        drawGoldenFeather(ctx, x, item.y, item.w, item.h, state.time, item.phase);
        break;
      default:
        break;
    }
  }
}

function drawParticle(ctx, p, frontPass) {
  const front = p.type === 'spark' || p.type === 'gold' || p.type === 'hit' || p.type === 'confetti';
  if (front !== frontPass) return;
  const alpha = clamp01(p.life / p.maxLife);
  ctx.save();
  ctx.globalAlpha = alpha;
  if (p.type === 'dust') {
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * (1.2 - alpha * 0.4), 0, Math.PI * 2);
    ctx.fill();
  } else if (p.type === 'feather') {
    featherShape(ctx, p.x, p.y, p.size * 3.2, p.size * 1.5, p.rot, p.color, 'rgba(255, 242, 213, 0.3)');
  } else if (p.type === 'spark') {
    ctx.strokeStyle = p.color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(p.x - p.size, p.y);
    ctx.lineTo(p.x + p.size, p.y);
    ctx.moveTo(p.x, p.y - p.size);
    ctx.lineTo(p.x, p.y + p.size);
    ctx.stroke();
  } else if (p.type === 'gold') {
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * 0.55, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 250, 210, 0.75)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(p.x - p.size, p.y);
    ctx.lineTo(p.x + p.size, p.y);
    ctx.stroke();
  } else if (p.type === 'hit') {
    ctx.fillStyle = p.color;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    ctx.fillRect(-p.size, -1, p.size * 2, 2);
    ctx.fillRect(-1, -p.size, 2, p.size * 2);
    ctx.restore();
  } else if (p.type === 'confetti') {
    ctx.fillStyle = p.color;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    ctx.fillRect(-p.size, -p.size * 0.4, p.size * 2, p.size * 0.8);
    ctx.restore();
  }
  ctx.restore();
}

function drawParticles(ctx, state, frontPass) {
  for (let i = 0; i < state.particles.length; i += 1) {
    const p = state.particles[i];
    if (p.active) drawParticle(ctx, p, frontPass);
  }
}

function drawPopups(ctx, state) {
  for (let i = 0; i < state.popups.length; i += 1) {
    const p = state.popups[i];
    if (!p.active) continue;
    ctx.save();
    ctx.globalAlpha = clamp01(p.life * 2.4);
    ctx.font = `900 ${p.size}px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 5;
    ctx.strokeStyle = 'rgba(35, 20, 28, 0.65)';
    ctx.strokeText(p.text, p.x, p.y);
    ctx.fillStyle = p.color;
    ctx.fillText(p.text, p.x, p.y);
    ctx.restore();
  }
}

function drawWorld(ctx, state) {
  drawItems(ctx, state);
  drawParticles(ctx, state, false);

  const player = state.player;
  const ducking = player.ducking && player.onGround;
  const farmerX = 270 - state.gap;
  if (farmerX > -90) {
    drawFarmer(ctx, farmerX, GROUND, state.time * 13.5, {
      close: state.gap < 105,
      facing: 1,
    });
  }
  drawTurkey(ctx, FIELD.playerX, player.feetY, player.anim, {
    ducking,
    airborne: !player.onGround,
    boost: state.boost > 0,
    time: state.time,
    invulnerable: player.invulnerable,
  });

  drawParticles(ctx, state, true);
  if (state.outcome === null) drawPopups(ctx, state);
  drawAmbientLeaves(ctx, state, true);
}

// ------------------------------------------------------------------ HUD and screens

function drawHud(ctx, state, best) {
  // Score.
  const s = HUD.score;
  drawPanel(ctx, s.x, s.y, s.w, s.h, 16);
  cornIcon(ctx, s.x + 32, s.y + 40, 1.15);
  text(ctx, 'SCORE', s.x + 66, s.y + 21, 11, PALETTE.muted, 'left', 800);
  text(ctx, Math.floor(state.score).toLocaleString('en-US'), s.x + 66, s.y + 53, 28, PALETTE.cream, 'left', 900);

  // Distance and escape progress.
  const d = HUD.distance;
  drawPanel(ctx, d.x, d.y, d.w, d.h, 16);
  text(ctx, 'DISTANCE', d.x + d.w / 2, d.y + 20, 11, PALETTE.muted, 'center', 800);
  const metres = Math.min(DISTANCE.escapeMetres, state.distanceM);
  text(ctx, `${metres} m`, d.x + d.w / 2 - 34, d.y + 50, 28, PALETTE.cream, 'center', 900);
  text(ctx, `/ ${DISTANCE.escapeMetres} m`, d.x + d.w / 2 + 76, d.y + 48, 15, PALETTE.muted, 'left', 700);
  const progress = clamp01(metres / DISTANCE.escapeMetres);
  roundRect(ctx, d.x + 24, d.y + 58, d.w - 48, 5, 3);
  ctx.fillStyle = 'rgba(255, 242, 213, 0.12)';
  ctx.fill();
  roundRect(ctx, d.x + 24, d.y + 58, Math.max(4, (d.w - 48) * progress), 5, 3);
  const distanceGradient = ctx.createLinearGradient(d.x + 24, 0, d.x + d.w - 24, 0);
  distanceGradient.addColorStop(0, '#f2a93c');
  distanceGradient.addColorStop(1, '#ffe7a4');
  ctx.fillStyle = distanceGradient;
  ctx.fill();
  // Flag at the finish.
  ctx.strokeStyle = 'rgba(255, 242, 213, 0.55)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(d.x + d.w - 22, d.y + 36);
  ctx.lineTo(d.x + d.w - 22, d.y + 54);
  ctx.stroke();
  ctx.fillStyle = PALETTE.green;
  ctx.beginPath();
  ctx.moveTo(d.x + d.w - 21, d.y + 36);
  ctx.lineTo(d.x + d.w - 8, d.y + 41);
  ctx.lineTo(d.x + d.w - 21, d.y + 46);
  ctx.closePath();
  ctx.fill();

  // Lives.
  const l = HUD.lives;
  drawPanel(ctx, l.x, l.y, l.w, l.h, 16);
  text(ctx, 'LIVES', l.x + 20, l.y + 24, 11, PALETTE.muted, 'left', 800);
  for (let i = 0; i < LIVES; i += 1) {
    heart(ctx, l.x + 52 + i * 58, l.y + 31, 27, i < state.lives);
  }
  if (best > 0) text(ctx, `BEST ${best.toLocaleString('en-US')}`, l.x + l.w - 18, l.y + 62, 11, PALETTE.muted, 'right', 700);

  // Chase meter.
  const c = HUD.chase;
  drawPanel(ctx, c.x, c.y, c.w, c.h, 14, 'rgba(27, 20, 32, 0.84)');
  const ratio = clamp01(state.gap / PLAYER.gapMax);
  const danger = ratio < 0.3;
  drawFarmerIcon(ctx, c.x + 24, c.y + 27, 1.15);
  text(ctx, 'FARMER', c.x + 44, c.y + 16, 10, PALETTE.muted, 'left', 800);
  roundRect(ctx, c.x + 82, c.y + 20, 196, 11, 6);
  ctx.fillStyle = 'rgba(255, 242, 213, 0.12)';
  ctx.fill();
  const fill = Math.max(5, 196 * ratio);
  roundRect(ctx, c.x + 82, c.y + 20, fill, 11, 6);
  ctx.fillStyle = danger ? '#e0503c' : ratio < 0.6 ? '#e6a23b' : '#7fbd72';
  ctx.fill();
  const markerX = c.x + 82 + fill;
  ctx.fillStyle = PALETTE.cream;
  ctx.beginPath();
  ctx.moveTo(markerX, c.y + 18);
  ctx.lineTo(markerX + 6, c.y + 12);
  ctx.lineTo(markerX - 6, c.y + 12);
  ctx.closePath();
  ctx.fill();
  drawTurkeyIcon(ctx, c.x + 301, c.y + 27, 1.05);
  text(ctx, `${(state.gap * DISTANCE.metresPerPixel).toFixed(1)} m behind`, c.x + 82, c.y + 50, 10, PALETTE.muted, 'left', 600);
  if (state.gap < 105) {
    ctx.save();
    ctx.globalAlpha = 0.65 + 0.35 * Math.sin(state.time * 9);
    text(ctx, "HE'S CLOSE!", c.x + c.w - 16, c.y + 50, 11, PALETTE.red, 'right', 800);
    ctx.restore();
  } else {
    text(ctx, 'KEEP RUNNING', c.x + c.w - 16, c.y + 50, 10, PALETTE.green, 'right', 700);
  }

  // Golden feather countdown.
  if (state.boost > 0) {
    const b = HUD.boost;
    drawPanel(ctx, b.x, b.y, b.w, b.h, 12, 'rgba(64, 45, 20, 0.9)', 'rgba(255, 215, 100, 0.6)');
    featherShape(ctx, b.x + 24, b.y + 19, 26, 12, -0.4, '#ffd764');
    text(ctx, 'GOLDEN TAILWIND', b.x + 46, b.y + 15, 10, '#ffe9ad', 'left', 800);
    roundRect(ctx, b.x + 46, b.y + 21, b.w - 68, 6, 3);
    ctx.fillStyle = 'rgba(255, 242, 213, 0.14)';
    ctx.fill();
    roundRect(ctx, b.x + 46, b.y + 21, (b.w - 68) * clamp01(state.boost / PLAYER.boostTime), 6, 3);
    ctx.fillStyle = '#ffd764';
    ctx.fill();
    text(ctx, `${state.boost.toFixed(1)}s`, b.x + b.w - 14, b.y + 16, 11, '#ffe9ad', 'right', 700);
  }
}

function drawTitleDecor(ctx, state) {
  const time = state.time;
  // A quiet farm moment behind the title card.
  drawFenceLine(ctx, 120 + state.distancePx * 0.4, 660, 0.86, true);
  drawSign(ctx, 12, 596);
  drawPumpkin(ctx, 112, 716, 0.72);
  drawPumpkin(ctx, 1324 - 140, 716, 0.62);
  drawHay(ctx, 1040, 636, 102, 58, time);
  drawHay(ctx, 1152, 640, 78, 54, time);
  drawPumpkin(ctx, 1188, 708, 0.82);
  drawTurkey(ctx, 234, 704, time * 9.2, { scale: 1.02, time, groundY: 704 });
  drawFarmer(ctx, 1102, 706, time * 12.5, { facing: -1, scale: 1.0, alpha: 0.98 });
}

function drawTitleCards(ctx, state, ui) {
  // Logo.
  const glow = ctx.createRadialGradient(W / 2, 170, 20, W / 2, 170, 330);
  glow.addColorStop(0, 'rgba(255, 188, 90, 0.16)');
  glow.addColorStop(1, 'rgba(255, 188, 90, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(W / 2 - 360, 0, 720, 340);
  featherShape(ctx, 292, 188, 62, 28, -0.65, '#e6a04a');
  featherShape(ctx, 1004, 154, 54, 24, 0.55, '#d98540');
  spacedText(ctx, "GOBBLER'S", W / 2, 108, 40, PALETTE.gold, 10, 'center', 800);
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.font = `900 114px ${FONT_SERIF}`;
  ctx.lineWidth = 12;
  ctx.strokeStyle = 'rgba(31, 17, 27, 0.9)';
  ctx.strokeText('GETAWAY', W / 2, 214);
  const titleFill = ctx.createLinearGradient(0, 114, 0, 218);
  titleFill.addColorStop(0, '#fff6dd');
  titleFill.addColorStop(0.65, '#ffd77d');
  titleFill.addColorStop(1, '#f0a83e');
  ctx.fillStyle = titleFill;
  ctx.fillText('GETAWAY', W / 2, 214);
  ctx.restore();
  text(ctx, 'One plucky turkey. One hungry farmer. One shot at freedom.', W / 2, 254, 20, PALETTE.cream, 'center', 600, 'alphabetic', FONT_SERIF);

  // Card.
  drawPanel(ctx, 280, 280, 720, 420, 24, 'rgba(30, 21, 31, 0.9)', 'rgba(255, 210, 125, 0.3)');
  roundRect(ctx, 294, 294, 692, 392, 18);
  ctx.strokeStyle = 'rgba(255, 210, 125, 0.13)';
  ctx.lineWidth = 1;
  ctx.stroke();
  spacedText(ctx, 'HOW TO FLY', W / 2, 322, 13, PALETTE.gold, 5, 'center', 800);

  const rows = [
    ['SPACE / ↑', 'Jump — hold for a higher hop'],
    ['↓', 'Duck and slide under knives'],
    ['P', 'Pause the chase'],
    ['M', 'Mute the sounds'],
    ['ENTER', 'Start or run again'],
  ];
  const keyWidths = [132, 48, 48, 48, 82];
  for (let i = 0; i < rows.length; i += 1) {
    const y = 350 + i * 38;
    drawKeycap(ctx, 376, y, keyWidths[i], rows[i][0]);
    text(ctx, rows[i][1], 536, y, 17, PALETTE.cream, 'left', 600);
  }
  drawButton(ctx, BUTTONS.start, 'START RUNNING', null, state.time);
  text(ctx, 'or press Enter  ·  click the button', W / 2, 668, 13, PALETTE.muted, 'center', 600);
  if (ui.best > 0) text(ctx, `BEST ${ui.best.toLocaleString('en-US')}`, 922, 324, 13, PALETTE.gold, 'right', 800);
}

function drawPause(ctx, state, ui) {
  ctx.fillStyle = 'rgba(12, 8, 18, 0.58)';
  ctx.fillRect(0, 0, W, H);
  drawPanel(ctx, 390, 238, 500, 318, 24, 'rgba(32, 22, 33, 0.95)', 'rgba(255, 210, 125, 0.35)');
  text(ctx, 'PAUSED', W / 2, 314, 58, PALETTE.cream, 'center', 900, 'alphabetic', FONT_SERIF);
  text(ctx, 'The cranberry sauce can wait.', W / 2, 354, 19, PALETTE.muted, 'center', 600, 'alphabetic', FONT_SERIF);
  drawButton(ctx, BUTTONS.resume, 'RESUME', null, state.time);
  text(ctx, 'Press P or Enter  ·  M mutes', W / 2, 512, 13, PALETTE.muted, 'center', 600);
  if (ui.best > 0) text(ctx, `BEST ${ui.best.toLocaleString('en-US')}`, W / 2, 538, 12, PALETTE.gold, 'center', 700);
}

function drawEnd(ctx, state, ui) {
  ctx.fillStyle = 'rgba(12, 8, 18, 0.62)';
  ctx.fillRect(0, 0, W, H);
  const escaped = state.outcome === 'escaped';
  const accent = escaped ? PALETTE.green : PALETTE.red;
  drawPanel(ctx, 320, 156, 640, 528, 26, 'rgba(31, 21, 31, 0.96)', escaped ? 'rgba(143, 214, 148, 0.45)' : 'rgba(224, 80, 60, 0.45)');
  roundRect(ctx, 335, 171, 610, 498, 20);
  ctx.strokeStyle = escaped ? 'rgba(143, 214, 148, 0.15)' : 'rgba(224, 80, 60, 0.15)';
  ctx.lineWidth = 1;
  ctx.stroke();

  const title = escaped ? 'ESCAPED!' : 'CAUGHT!';
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.font = `900 82px ${FONT_SERIF}`;
  ctx.lineWidth = 9;
  ctx.strokeStyle = 'rgba(22, 12, 20, 0.85)';
  ctx.strokeText(title, W / 2, 266);
  ctx.fillStyle = escaped ? '#b9f0a9' : '#ff8b73';
  ctx.fillText(title, W / 2, 266);
  ctx.restore();

  let cause;
  if (escaped) cause = 'Past the fence, into the dusk, and off the menu. Free bird!';
  else if (state.cause === 'farmer') cause = 'The farmer closed the gap. Thanksgiving is back on.';
  else cause = 'Three tumbles and the farmer has the bird. The oven is already warm.';
  text(ctx, cause, W / 2, 306, 17, PALETTE.muted, 'center', 600, 'alphabetic', FONT_SERIF);

  const stats = [
    ['FINAL SCORE', Math.floor(state.score).toLocaleString('en-US')],
    ['DISTANCE', `${Math.min(DISTANCE.escapeMetres, state.distanceM)} m`],
    ['BEST', Math.max(ui.best, Math.floor(state.score)).toLocaleString('en-US')],
  ];
  for (let i = 0; i < stats.length; i += 1) {
    const bx = 362 + i * 188;
    drawPanel(ctx, bx, 342, 168, 88, 14, 'rgba(255, 242, 213, 0.06)', 'rgba(255, 242, 213, 0.14)');
    text(ctx, stats[i][0], bx + 84, 366, 10, PALETTE.muted, 'center', 800);
    text(ctx, stats[i][1], bx + 84, 405, 27, i === 0 ? PALETTE.gold : PALETTE.cream, 'center', 900);
  }
  if (ui.newBest) {
    ctx.save();
    ctx.translate(W / 2, 460);
    ctx.rotate(-0.03);
    drawPanel(ctx, -82, -18, 164, 36, 18, 'rgba(255, 200, 87, 0.16)', 'rgba(255, 200, 87, 0.55)');
    text(ctx, 'NEW BEST!', 0, 6, 17, PALETTE.gold, 'center', 800);
    ctx.restore();
  } else {
    text(ctx, escaped ? 'The farmer is still yelling.' : 'The corn is still out there.', W / 2, 463, 15, PALETTE.muted, 'center', 600, 'alphabetic', FONT_SERIF);
  }

  drawButton(ctx, BUTTONS.restart, 'RUN AGAIN', null, state.time, escaped ? '#c3efac' : '#ffca80', escaped ? '#7ccb86' : '#ef9b45');
  text(ctx, 'Press Enter  ·  click the button', W / 2, 620, 13, PALETTE.muted, 'center', 600);
}

function drawMute(ctx, muted) {
  const b = BUTTONS.mute;
  roundRect(ctx, b.x, b.y, b.w, b.h, 12);
  ctx.fillStyle = 'rgba(27, 20, 32, 0.66)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 242, 213, 0.18)';
  ctx.lineWidth = 1.2;
  ctx.stroke();
  drawSpeaker(ctx, b.x + 22, b.y + 20, muted);
  text(ctx, 'M', b.x + 48, b.y + 26, 14, muted ? 'rgba(255,242,213,0.45)' : PALETTE.cream, 'center', 800);
}

function drawVignette(ctx) {
  const gradient = ctx.createRadialGradient(W / 2, H * 0.46, H * 0.26, W / 2, H * 0.46, H * 0.9);
  gradient.addColorStop(0, 'rgba(12, 8, 18, 0)');
  gradient.addColorStop(1, 'rgba(12, 8, 18, 0.34)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, W, H);
}

// ------------------------------------------------------------------ renderer

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d', { alpha: false });
  const view = { scale: 1, ox: 0, oy: 0, cssScale: 1, cssOx: 0, cssOy: 0 };
  const pointer = { x: -1000, y: -1000 };

  function resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const cw = Math.max(1, Math.round(window.innerWidth * dpr));
    const ch = Math.max(1, Math.round(window.innerHeight * dpr));
    canvas.width = cw;
    canvas.height = ch;
    view.scale = Math.min(cw / W, ch / H);
    view.ox = (cw - W * view.scale) / 2;
    view.oy = (ch - H * view.scale) / 2;
    view.cssScale = Math.min(window.innerWidth / W, window.innerHeight / H);
    view.cssOx = (window.innerWidth - W * view.cssScale) / 2;
    view.cssOy = (window.innerHeight - H * view.cssScale) / 2;
  }

  function toLogical(clientX, clientY) {
    return {
      x: (clientX - view.cssOx) / view.cssScale,
      y: (clientY - view.cssOy) / view.cssScale,
    };
  }

  function actionAt(x, y, screen) {
    if (pointIn(BUTTONS.mute, x, y)) return 'mute';
    if (screen === 'title' && pointIn(BUTTONS.start, x, y)) return 'start';
    if (screen === 'end' && pointIn(BUTTONS.restart, x, y)) return 'restart';
    if (screen === 'paused' && pointIn(BUTTONS.resume, x, y)) return 'resume';
    if (screen === 'play') return 'jump';
    return null;
  }

  function setPointer(x, y) {
    pointer.x = x;
    pointer.y = y;
  }

  function draw(state, screen, ui) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#120d16';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(view.scale, 0, 0, view.scale, view.ox, view.oy);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, W, H);
    ctx.clip();

    if (screen === 'title') {
      drawBackground(ctx, state);
      drawTitleDecor(ctx, state);
      drawTitleCards(ctx, state, ui);
    } else {
      const shake = state.shake;
      ctx.save();
      if (shake > 0) {
        const sx = Math.sin(state.time * 87) * shake * 0.7;
        const sy = Math.cos(state.time * 93) * shake * 0.45;
        ctx.translate(sx, sy);
      }
      drawBackground(ctx, state);
      drawWorld(ctx, state);
      ctx.restore();
      if (state.flash > 0) {
        ctx.fillStyle = `rgba(255, 96, 62, ${state.flash * 0.22})`;
        ctx.fillRect(0, 0, W, H);
      }
      drawHud(ctx, state, ui.best);
      if (screen === 'paused') drawPause(ctx, state, ui);
      else if (screen === 'end') drawEnd(ctx, state, ui);
    }

    drawMute(ctx, ui.muted);
    drawVignette(ctx);
    ctx.restore();
  }

  resize();
  window.addEventListener('resize', resize);
  return { draw, resize, toLogical, actionAt, setPointer, view };
}
