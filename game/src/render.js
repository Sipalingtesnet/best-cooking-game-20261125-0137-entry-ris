// All canvas drawing: the warung kitchen, counters, stations, the order board, the HUD, the cook,
// the food, and every progress ring and overlay. Nothing here changes the world.
import {
  BOARD_H, COL, CRATE_SIZE, CRATES, DISHES, FLOOR, H, INGREDIENTS, ORDER, SHIFT_LENGTH, STATIONS,
  W,
} from './config.js';
import { STATION_BOXES, isPrepped, plateTarget } from './world.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_WON = 'won';
export const SCREEN_LOST = 'lost';
export const SCREEN_PAUSED = 'paused';

const FONT = 'system-ui, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
const MONO = 'ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace';

function font(size, weight = 600) {
  return `${weight} ${size}px ${FONT}`;
}

function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.lineTo(x + w - rr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
  ctx.lineTo(x + w, y + h - rr);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
  ctx.lineTo(x + rr, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
  ctx.lineTo(x, y + rr);
  ctx.quadraticCurveTo(x, y, x + rr, y);
  ctx.closePath();
}

function text(ctx, str, x, y, size, color, align = 'left', weight = 600) {
  ctx.font = font(size, weight);
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(str, x, y);
}

function shadowText(ctx, str, x, y, size, color, align = 'left', weight = 800) {
  ctx.font = font(size, weight);
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fillText(str, x + 2, y + 2);
  ctx.fillStyle = color;
  ctx.fillText(str, x, y);
}

/** A ring, drawn clockwise from 12 o'clock. */
function ring(ctx, x, y, r, frac, width, back, front) {
  const f = Math.max(0, Math.min(1, frac));
  ctx.lineWidth = width;
  ctx.strokeStyle = back;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.stroke();
  if (f <= 0) return;
  ctx.strokeStyle = front;
  ctx.beginPath();
  ctx.arc(x, y, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * f);
  ctx.stroke();
}
// ---------------------------------------------------------------- food

/** One ingredient, drawn in a box of `s` pixels with its top-left at (x, y). */
export function drawIngredient(ctx, key, x, y, s, prep = 'ready') {
  const def = INGREDIENTS[key];
  const cx = x + s / 2;
  const cy = y + s / 2;
  ctx.save();
  if (key === 'rice') {
    ctx.fillStyle = def.color;
    ctx.beginPath();
    ctx.ellipse(cx, cy + s * 0.08, s * 0.40, s * 0.28, 0, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    for (let i = 0; i < 7; i += 1) {
      const a = (i / 7) * Math.PI * 2;
      ctx.beginPath();
      ctx.ellipse(cx + Math.cos(a) * s * 0.18, cy + Math.sin(a) * s * 0.10 - s * 0.02, s * 0.055, s * 0.032, a, 0, Math.PI * 2);
      ctx.fill();
    }
    if (prep === 'cooked') {
      ctx.strokeStyle = 'rgba(200,140,60,0.8)';
      ctx.lineWidth = Math.max(1, s * 0.03);
      for (let i = 0; i < 3; i += 1) {
        ctx.beginPath();
        ctx.arc(cx - s * 0.15 + i * s * 0.14, cy + s * 0.02, s * 0.10, -0.6, 1.2);
        ctx.stroke();
      }
    }
  } else if (key === 'noodles') {
    ctx.strokeStyle = def.color;
    ctx.lineWidth = Math.max(1.5, s * 0.075);
    ctx.lineCap = 'round';
    for (let i = 0; i < 5; i += 1) {
      const yy = cy - s * 0.18 + i * s * 0.09;
      ctx.beginPath();
      for (let t = 0; t <= 8; t += 1) {
        const px = cx - s * 0.34 + (t / 8) * s * 0.68;
        const py = yy + Math.sin(t * 1.5 + i) * s * 0.035;
        if (t === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(150,110,40,0.55)';
    ctx.lineWidth = Math.max(1, s * 0.025);
    for (let i = 0; i < 5; i += 1) {
      const yy = cy - s * 0.18 + i * s * 0.09;
      ctx.beginPath();
      ctx.moveTo(cx - s * 0.3, yy + s * 0.03);
      ctx.lineTo(cx + s * 0.3, yy + s * 0.03);
      ctx.stroke();
    }
  } else if (key === 'chicken') {
    ctx.fillStyle = def.color;
    ctx.beginPath();
    ctx.ellipse(cx + s * 0.06, cy + s * 0.04, s * 0.26, s * 0.30, -0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f0e0c0';
    ctx.beginPath();
    ctx.ellipse(cx - s * 0.28, cy + s * 0.26, s * 0.075, s * 0.055, 0.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e8d4b0';
    ctx.fillRect(cx - s * 0.30, cy + s * 0.24, s * 0.06, s * 0.16);
    ctx.strokeStyle = 'rgba(150,90,40,0.65)';
    ctx.lineWidth = Math.max(1, s * 0.03);
    ctx.beginPath();
    ctx.arc(cx + s * 0.08, cy, s * 0.18, -1.1, 1.6);
    ctx.stroke();
    if (prep === 'chopped') {
      ctx.fillStyle = 'rgba(255,240,215,0.85)';
      for (let i = 0; i < 5; i += 1) {
        const a = i * 1.7;
        ctx.beginPath();
        ctx.arc(cx + Math.cos(a) * s * 0.3, cy + Math.sin(a) * s * 0.26, s * 0.05, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } else if (key === 'egg') {
    ctx.fillStyle = '#fffaf0';
    ctx.beginPath();
    for (let i = 0; i <= 20; i += 1) {
      const a = (i / 20) * Math.PI * 2;
      const rr = s * (0.36 + 0.06 * Math.sin(i * 1.9));
      const px = cx + Math.cos(a) * rr;
      const py = cy + Math.sin(a) * rr * 0.78;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = def.color;
    ctx.beginPath();
    ctx.arc(cx + s * 0.02, cy - s * 0.02, s * 0.17, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.beginPath();
    ctx.arc(cx - s * 0.03, cy - s * 0.07, s * 0.05, 0, Math.PI * 2);
    ctx.fill();
  } else if (key === 'greens') {
    ctx.fillStyle = def.color;
    ctx.beginPath();
    ctx.ellipse(cx, cy, s * 0.36, s * 0.22, -0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#79c25c';
    ctx.beginPath();
    ctx.ellipse(cx + s * 0.10, cy - s * 0.10, s * 0.26, s * 0.15, 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#2f6b28';
    ctx.lineWidth = Math.max(1, s * 0.035);
    ctx.beginPath();
    ctx.moveTo(cx - s * 0.30, cy + s * 0.16);
    ctx.quadraticCurveTo(cx, cy, cx + s * 0.26, cy - s * 0.20);
    ctx.stroke();
    if (prep === 'chopped') {
      ctx.fillStyle = '#8fd06b';
      for (let i = 0; i < 4; i += 1) {
        ctx.beginPath();
        ctx.ellipse(cx - s * 0.2 + i * s * 0.14, cy + s * 0.26, s * 0.07, s * 0.04, 0.3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } else if (key === 'sauce') {
    ctx.fillStyle = def.color;
    ctx.beginPath();
    ctx.ellipse(cx, cy + s * 0.10, s * 0.30, s * 0.20, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#d8472f';
    ctx.beginPath();
    ctx.ellipse(cx - s * 0.06, cy + s * 0.04, s * 0.18, s * 0.12, 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#7d2116';
    ctx.lineWidth = Math.max(1, s * 0.035);
    ctx.beginPath();
    ctx.moveTo(cx + s * 0.20, cy - s * 0.34);
    ctx.quadraticCurveTo(cx + s * 0.22, cy - s * 0.05, cx + s * 0.26, cy + s * 0.04);
    ctx.stroke();
    ctx.fillStyle = '#e8b93a';
    ctx.beginPath();
    ctx.arc(cx + s * 0.21, cy - s * 0.36, s * 0.05, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** The plate ring: a big cream plate with the dish's components arranged on it. */
export function drawDish(ctx, dish, x, y, s, complete = true) {
  const def = DISHES[dish];
  const cx = x + s / 2;
  const cy = y + s / 2;
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.ellipse(cx, cy + s * 0.36, s * 0.44, s * 0.10, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#f7f1e4';
  ctx.beginPath();
  ctx.ellipse(cx, cy, s * 0.46, s * 0.40, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = complete ? COL.gold : COL.creamDark;
  ctx.lineWidth = Math.max(1.5, s * 0.035);
  ctx.beginPath();
  ctx.ellipse(cx, cy, s * 0.37, s * 0.32, 0, 0, Math.PI * 2);
  ctx.stroke();
  const n = def.components.length;
  for (let i = 0; i < n; i += 1) {
    const a = -Math.PI / 2 + (i / n) * Math.PI * 2;
    const px = cx + Math.cos(a) * s * 0.13;
    const py = cy + Math.sin(a) * s * 0.11;
    drawIngredient(ctx, def.components[i], px - s * 0.15, py - s * 0.15, s * 0.3, 'cooked');
  }
  if (dish === 'Sate Ayam') {
    ctx.strokeStyle = '#c8a15a';
    ctx.lineWidth = Math.max(1, s * 0.03);
    for (let i = -1; i <= 1; i += 1) {
      ctx.beginPath();
      ctx.moveTo(cx - s * 0.3, cy + s * 0.1 + i * s * 0.05);
      ctx.lineTo(cx + s * 0.3, cy - s * 0.18 + i * s * 0.05);
      ctx.stroke();
    }
  }
  ctx.restore();
}

/** A mini ticket picture for the order board: the dish, shrunk. */
function drawTicketIcon(ctx, dish, x, y, s) {
  drawDish(ctx, dish, x, y, s, true);
}
// ---------------------------------------------------------------- the kitchen

function drawBackground(ctx, world) {
  // Warm wall above the counter.
  const g = ctx.createLinearGradient(0, BOARD_H, 0, 320);
  g.addColorStop(0, '#33231a');
  g.addColorStop(1, '#472f21');
  ctx.fillStyle = g;
  ctx.fillRect(0, BOARD_H, W, 320 - BOARD_H);
  // Wall tiles: cream and teal, a warung's tiled back wall.
  ctx.lineWidth = 1;
  for (let ty = BOARD_H + 4; ty < 300; ty += 30) {
    for (let tx = 0; tx < W; tx += 34) {
      const on = ((tx / 34) + (ty / 30)) % 2 < 1;
      ctx.fillStyle = on ? 'rgba(244,230,200,0.055)' : 'rgba(31,122,109,0.10)';
      ctx.fillRect(tx + ((ty / 30) % 2) * 17, ty, 32, 28);
    }
  }
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.fillRect(0, 298, W, 12);

  // Floor: worn boards running away from the counter.
  ctx.fillStyle = COL.floor;
  ctx.fillRect(0, 308, W, H - 308);
  for (let y = 320; y < H; y += 34) {
    ctx.fillStyle = ((y / 34) | 0) % 2 === 0 ? COL.floorDark : '#553725';
    ctx.fillRect(0, y, W, 32);
  }
  ctx.strokeStyle = 'rgba(0,0,0,0.18)';
  ctx.lineWidth = 2;
  for (let x = 0; x < W; x += 96) {
    ctx.beginPath();
    ctx.moveTo(x, 308);
    ctx.lineTo(x + 18, H);
    ctx.stroke();
  }
  // Warm light pool in the middle of the floor.
  const lamp = ctx.createRadialGradient(700, 300, 40, 700, 420, 620);
  lamp.addColorStop(0, 'rgba(255,214,150,0.16)');
  lamp.addColorStop(1, 'rgba(255,214,150,0)');
  ctx.fillStyle = lamp;
  ctx.fillRect(0, 148, W, H - 148);
}

function drawCounterShell(ctx) {
  // The long prep counter the three stations sit on.
  ctx.fillStyle = COL.counterEdge;
  ctx.fillRect(320, 262, 900, 48);
  ctx.fillStyle = COL.counter;
  ctx.fillRect(320, 250, 900, 22);
  ctx.fillStyle = COL.counterTop;
  ctx.fillRect(320, 242, 900, 14);
  ctx.fillStyle = 'rgba(255,255,255,0.10)';
  ctx.fillRect(320, 242, 900, 4);
  // Panelled front.
  ctx.strokeStyle = 'rgba(0,0,0,0.20)';
  ctx.lineWidth = 2;
  for (let x = 356; x < 1210; x += 74) {
    ctx.beginPath();
    ctx.moveTo(x, 262);
    ctx.lineTo(x, 310);
    ctx.stroke();
  }
  // Steel rail under the counter.
  ctx.fillStyle = '#8b8f92';
  ctx.fillRect(330, 306, 880, 6);
}

/** The crate rack down the left wall, with its six ingredient crates. */
function drawCrates(ctx, world) {
  const near = world.nearestStation();
  const nearKind = near && near.kind === 'crates' ? near.index : -1;
  ctx.fillStyle = '#2b1b12';
  roundRect(ctx, 38, 294, 196, 382, 10);
  ctx.fill();
  ctx.fillStyle = '#4a2f1e';
  roundRect(ctx, 44, 300, 184, 370, 8);
  ctx.fill();
  for (let i = 0; i < CRATES.length; i += 1) {
    const crate = CRATES[i];
    const def = INGREDIENTS[crate.key];
    const x = crate.x - CRATE_SIZE.w / 2;
    const y = crate.y;
    const hot = i === nearKind;
    ctx.fillStyle = hot ? '#d8a05a' : '#8a5a33';
    roundRect(ctx, x, y, CRATE_SIZE.w, CRATE_SIZE.h, 6);
    ctx.fill();
    ctx.strokeStyle = hot ? COL.gold : '#5e3c22';
    ctx.lineWidth = hot ? 3 : 2;
    ctx.stroke();
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.fillRect(x + 8, y + 8, 52, CRATE_SIZE.h - 16);
    drawIngredient(ctx, crate.key, x + 12, y + 8, 44, def.prep === 'chop' ? 'raw' : 'cooked');
    text(ctx, def.name, x + 64, y + 27, 14, '#fdf3dd', 'left', 700);
    text(ctx, def.prep === 'none' ? 'ready' : def.prep === 'chop' ? 'chop' : 'cook',
      x + 64, y + 48, 12, hot ? '#3a2412' : '#e7cfa4', 'left', 600);
    if (hot) {
      ctx.strokeStyle = 'rgba(232,185,58,0.35)';
      ctx.lineWidth = 6;
      roundRect(ctx, x - 3, y - 3, CRATE_SIZE.w + 6, CRATE_SIZE.h + 6, 8);
      ctx.stroke();
    }
  }
}

/** The chopping board with its item and chop ring. */
function drawBoard(ctx, world) {
  const bx = STATIONS.board.x;
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  roundRect(ctx, bx - 96, 214, 192, 54, 8);
  ctx.fill();
  ctx.fillStyle = '#c89a63';
  roundRect(ctx, bx - 94, 208, 188, 50, 8);
  ctx.fill();
  ctx.strokeStyle = '#9b7240';
  ctx.lineWidth = 2;
  ctx.stroke();
  for (let i = 0; i < 4; i += 1) {
    ctx.fillStyle = 'rgba(120,84,40,0.35)';
    ctx.fillRect(bx - 80, 216 + i * 11, 160, 3);
  }
  if (world.boardWork) {
    const work = world.boardWork;
    const def = INGREDIENTS[work.key];
    drawIngredient(ctx, work.key, bx - 26, 212, 52, 'raw');
    const frac = work.t / def.chopTime;
    ring(ctx, bx + 64, 236, 22, frac, 7, 'rgba(0,0,0,0.35)', work.done ? COL.green : COL.gold);
    if (work.done) {
      text(ctx, 'READY', bx + 64, 241, 11, COL.cream, 'center', 800);
    } else {
      text(ctx, `${Math.ceil(def.chopTime - work.t)}s`, bx + 64, 241, 13, COL.cream, 'center', 800);
    }
    // Knife ticks as the chop advances.
    ctx.save();
    ctx.translate(bx - 62, 208);
    ctx.rotate(-0.5 + frac * 0.9);
    ctx.fillStyle = '#e6e9ea';
    ctx.fillRect(0, 0, 26, 5);
    ctx.fillStyle = '#6b4b2c';
    ctx.fillRect(24, -1, 10, 7);
    ctx.restore();
  } else {
    text(ctx, 'CHOP', bx, 242, 15, 'rgba(60,36,18,0.55)', 'center', 800);
  }
  text(ctx, 'Chopping Board', bx, 290, 14, COL.creamDark, 'center', 600);
}

/** The wok: pan, fire, food, cook ring, smoke when burnt. */
function drawWok(ctx, world) {
  const wx = STATIONS.wok.x;
  const wy = 244;
  // Stove body.
  ctx.fillStyle = '#3b3f42';
  roundRect(ctx, wx - 92, 252, 184, 56, 8);
  ctx.fill();
  ctx.fillStyle = '#4c5155';
  roundRect(ctx, wx - 84, 256, 168, 10, 5);
  ctx.fill();
  // Flames.
  const burning = world.wok && world.wok.state === 'done';
  for (let i = 0; i < 5; i += 1) {
    const fx = wx - 30 + i * 15;
    const h = 14 + Math.sin(world.elapsed * 8 + i) * 5 + (burning ? 6 : 0);
    ctx.fillStyle = i % 2 === 0 ? '#f5a13a' : '#ffd25a';
    ctx.beginPath();
    ctx.moveTo(fx - 7, 262);
    ctx.quadraticCurveTo(fx, 262 - h, fx + 7, 262);
    ctx.closePath();
    ctx.fill();
  }
  // The pan.
  ctx.fillStyle = '#2a2c2e';
  ctx.beginPath();
  ctx.ellipse(wx, wy, 62, 20, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#3d4145';
  ctx.beginPath();
  ctx.ellipse(wx, wy - 2, 56, 16, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#9aa0a4';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(wx + 58, wy - 4);
  ctx.lineTo(wx + 104, wy - 16);
  ctx.stroke();

  if (world.wok) {
    const wok = world.wok;
    const def = INGREDIENTS[wok.key];
    drawIngredient(ctx, wok.key, wx - 30, wy - 32, 60, wok.state === 'burnt' ? 'cooked' : 'raw');
    if (wok.state === 'cooking') {
      const frac = wok.t / wok.cookTime;
      ring(ctx, wx, wy - 52, 24, frac, 7, 'rgba(0,0,0,0.4)', COL.gold);
      text(ctx, `${Math.ceil(wok.cookTime - wok.t)}s`, wx, wy - 47, 13, COL.cream, 'center', 800);
    } else if (wok.state === 'done') {
      const left = Math.max(0, wok.cookTime + wok.burnTime - wok.t);
      ring(ctx, wx, wy - 52, 24, left / wok.burnTime, 7, 'rgba(0,0,0,0.4)', left < 0.9 ? COL.red : COL.green);
      text(ctx, 'TAKE', wx, wy - 47, 11, COL.cream, 'center', 800);
    } else {
      for (let i = 0; i < 4; i += 1) {
        const t = (world.elapsed * 0.7 + i * 0.25) % 1;
        ctx.fillStyle = `rgba(70,66,62,${0.5 * (1 - t)})`;
        ctx.beginPath();
        ctx.arc(wx - 14 + i * 10 + Math.sin(t * 6) * 6, wy - 40 - t * 54, 10 + t * 14, 0, Math.PI * 2);
        ctx.fill();
      }
      shadowText(ctx, 'BURNT', wx, wy - 46, 16, '#ffb0a0', 'center');
    }
  } else {
    text(ctx, 'WOK', wx, 242, 15, 'rgba(255,255,255,0.22)', 'center', 800);
  }
  text(ctx, 'Wok Stove', wx, 290, 14, COL.creamDark, 'center', 600);
}

/** The plating counter: the plate, its components, and the assembly ring. */
function drawPlating(ctx, world) {
  const px = STATIONS.plating.x;
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  roundRect(ctx, px - 96, 208, 192, 56, 8);
  ctx.fill();
  ctx.fillStyle = '#d9c69a';
  roundRect(ctx, px - 94, 202, 188, 52, 8);
  ctx.fill();
  ctx.strokeStyle = '#b09a6a';
  ctx.lineWidth = 2;
  ctx.stroke();

  if (world.carriedDish) {
    text(ctx, 'hands full', px, 240, 14, 'rgba(60,36,18,0.55)', 'center', 700);
  } else if (world.plate.components.length === 0) {
    ctx.strokeStyle = 'rgba(90,60,30,0.35)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(px, 226, 40, 18, 0, 0, Math.PI * 2);
    ctx.stroke();
    text(ctx, 'PLATE', px, 232, 13, 'rgba(60,36,18,0.5)', 'center', 800);
  } else {
    const comps = world.plate.components;
    const target = plateTarget(comps);
    ctx.fillStyle = '#f7f1e4';
    ctx.beginPath();
    ctx.ellipse(px, 228, 62, 24, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = world.plate.dish ? COL.gold : COL.creamDark;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(px, 228, 50, 18, 0, 0, Math.PI * 2);
    ctx.stroke();
    for (let i = 0; i < comps.length; i += 1) {
      const a = Math.PI * (0.15 + (i / Math.max(2, comps.length)) * 0.7);
      drawIngredient(ctx, comps[i], px - 60 + Math.cos(a) * 44, 214 - Math.sin(a) * 6, 38, 'cooked');
    }
    if (world.plate.dish) {
      ring(ctx, px + 70, 226, 22, 1, 7, 'rgba(0,0,0,0.3)', COL.gold);
      text(ctx, 'OK', px + 70, 231, 13, '#3a2412', 'center', 900);
    } else if (target) {
      const total = comps.length + target.left.length;
      ring(ctx, px + 70, 226, 22, comps.length / total, 7, 'rgba(0,0,0,0.3)', COL.tealLight);
      text(ctx, `${comps.length}/${total}`, px + 70, 231, 12, COL.cream, 'center', 800);
    }
  }
  text(ctx, 'Plating Counter', px, 290, 14, COL.creamDark, 'center', 600);
}

/** The serving window, which glows when a matching plate is in hand. */
function drawServing(ctx, world) {
  const sx = STATIONS.serving.x;
  const canServe = !!world.carriedDish && world.orders.some((o) => o.dish === world.carriedDish.dish);
  ctx.fillStyle = '#241611';
  roundRect(ctx, sx - 108, 158, 216, 156, 10);
  ctx.fill();
  ctx.fillStyle = canServe ? '#3fa892' : '#1f7a6d';
  roundRect(ctx, sx - 100, 166, 200, 114, 8);
  ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  for (let i = 0; i < 4; i += 1) {
    ctx.fillRect(sx - 100 + i * 50, 166, 3, 114);
  }
  // Heat lamp.
  ctx.fillStyle = '#c9b17e';
  roundRect(ctx, sx - 84, 160, 168, 8, 4);
  ctx.fill();
  if (canServe) {
    const glow = ctx.createRadialGradient(sx, 214, 10, sx, 214, 150);
    glow.addColorStop(0, 'rgba(255,225,150,0.32)');
    glow.addColorStop(1, 'rgba(255,225,150,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(sx - 150, 120, 300, 220);
  }
  // The pass shelf.
  ctx.fillStyle = COL.counterTop;
  roundRect(ctx, sx - 104, 266, 208, 18, 6);
  ctx.fill();
  text(ctx, canServe ? 'SERVE NOW' : 'Serving Window', sx, 290, canServe ? 16 : 14,
    canServe ? COL.gold : COL.creamDark, 'center', canServe ? 900 : 600);
  // A little awning over the window.
  ctx.fillStyle = COL.terracotta;
  ctx.beginPath();
  ctx.moveTo(sx - 112, 156);
  ctx.lineTo(sx + 112, 156);
  ctx.lineTo(sx + 96, 138);
  ctx.lineTo(sx - 96, 138);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  for (let i = 0; i < 6; i += 1) {
    ctx.fillRect(sx - 96 + i * 34, 138, 14, 18);
  }
}
// ---------------------------------------------------------------- the order board

function patienceColor(frac) {
  if (frac > 0.55) return COL.green;
  if (frac > 0.28) return COL.gold;
  return COL.red;
}

function drawOrderBoard(ctx, world) {
  // Board backing: a dark teal wooden rail with a cream pinboard.
  ctx.fillStyle = '#1c2b26';
  roundRect(ctx, 12, 10, W - 24, BOARD_H - 14, 12);
  ctx.fill();
  ctx.fillStyle = '#274039';
  roundRect(ctx, 18, 16, W - 36, BOARD_H - 26, 10);
  ctx.fill();
  ctx.fillStyle = COL.teal;
  ctx.fillRect(18, 16, W - 36, 30);
  text(ctx, 'ORDER BOARD', 34, 38, 18, COL.cream, 'left', 900);
  text(ctx, `served ${world.stats.served}   expired ${world.stats.expired}/${ORDER.maxExpired}`,
    470, 38, 15, 'rgba(244,230,200,0.85)', 'left', 700);
  const seconds = Math.ceil(world.remaining);
  const mm = Math.floor(seconds / 60);
  const ss = String(seconds % 60).padStart(2, '0');
  const low = world.remaining < 30;
  // The shift clock, always visible.
  ctx.fillStyle = low ? '#7a2218' : '#14332d';
  roundRect(ctx, W - 292, 20, 268, 24, 6);
  ctx.fill();
  text(ctx, low ? 'CLOSING' : 'SHIFT', W - 278, 38, 13, low ? '#ffd0c4' : 'rgba(244,230,200,0.8)', 'left', 800);
  text(ctx, `${mm}:${ss}`, W - 42, 39, 20, low ? '#ffe6d8' : COL.cream, 'right', 800);

  const slots = 4;
  const gap = 12;
  const left = 24;
  const width = Math.floor((W - 48 - gap * (slots - 1)) / slots);
  const top = 50;
  const height = BOARD_H - 64;

  for (let i = 0; i < slots; i += 1) {
    const x = left + i * (width + gap);
    const order = world.orders[i];
    if (!order) {
      ctx.strokeStyle = 'rgba(244,230,200,0.13)';
      ctx.lineWidth = 2;
      ctx.setLineDash([7, 7]);
      roundRect(ctx, x, top, width, height, 8);
      ctx.stroke();
      ctx.setLineDash([]);
      text(ctx, 'waiting', x + width / 2, top + height / 2 + 5, 14, 'rgba(244,230,200,0.22)', 'center', 600);
      continue;
    }
    const frac = Math.max(0, Math.min(1, order.patience / order.maxPatience));
    const pop = 1 + Math.max(0, order.fresh) * 0.06;
    ctx.save();
    ctx.translate(x + width / 2, top + height / 2);
    ctx.scale(pop, pop);
    ctx.translate(-(x + width / 2), -(top + height / 2));
    ctx.fillStyle = '#f7efdc';
    roundRect(ctx, x, top, width, height, 8);
    ctx.fill();
    ctx.strokeStyle = 'rgba(90,60,30,0.4)';
    ctx.lineWidth = 2;
    ctx.stroke();
    // Ticket stub.
    ctx.fillStyle = frac > 0.28 ? COL.terracotta : COL.red;
    roundRect(ctx, x, top, 8, height, 4);
    ctx.fill();
    drawTicketIcon(ctx, order.dish, x + 16, top + 8, height - 30);
    text(ctx, order.dish, x + 86, top + 28, 19, '#2b1b12', 'left', 800);
    text(ctx, `+${order.price}`, x + width - 14, top + 28, 17, '#8a5a33', 'right', 800);
    text(ctx, `${Math.ceil(order.patience)}s`, x + width - 14, top + 47, 12, '#7a6650', 'right', 700);
    // Patience bar.
    const barX = x + 86;
    const barW = width - 102;
    ctx.fillStyle = 'rgba(90,60,30,0.22)';
    roundRect(ctx, barX, top + height - 20, barW, 10, 5);
    ctx.fill();
    ctx.fillStyle = patienceColor(frac);
    roundRect(ctx, barX, top + height - 20, Math.max(4, barW * frac), 10, 5);
    ctx.fill();
    ctx.restore();
  }
}

// ---------------------------------------------------------------- the cook

/** The cook, from behind and just above: apron, head-wrap, arms, tray. */
export function drawCook(ctx, world) {
  const p = world.player;
  const bob = Math.sin(p.walk) * 2.2;
  const x = p.x;
  const y = p.y + bob;
  ctx.save();
  // Shadow.
  ctx.fillStyle = 'rgba(0,0,0,0.30)';
  ctx.beginPath();
  ctx.ellipse(x, p.y + 30, 30, 11, 0, 0, Math.PI * 2);
  ctx.fill();
  // Legs.
  ctx.fillStyle = '#2f4a63';
  ctx.fillRect(x - 15, y + 4, 11, 26);
  ctx.fillRect(x + 4, y + 4, 11, 26);
  ctx.fillStyle = '#1d2f40';
  ctx.fillRect(x - 17, y + 26, 15, 7);
  ctx.fillRect(x + 2, y + 26, 15, 7);
  // Body: teal shirt and cream apron.
  ctx.fillStyle = COL.teal;
  roundRect(ctx, x - 21, y - 26, 42, 38, 10);
  ctx.fill();
  ctx.fillStyle = COL.cream;
  roundRect(ctx, x - 15, y - 8, 30, 24, 6);
  ctx.fill();
  ctx.strokeStyle = 'rgba(160,130,90,0.6)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x - 9, y - 22);
  ctx.lineTo(x - 13, y - 8);
  ctx.moveTo(x + 9, y - 22);
  ctx.lineTo(x + 13, y - 8);
  ctx.stroke();
  // Arms.
  ctx.fillStyle = '#b97f52';
  ctx.fillRect(x - 27, y - 22, 8, 20);
  ctx.fillRect(x + 19, y - 22, 8, 20);
  // Head: skin, hair, head-wrap.
  ctx.fillStyle = '#e0aa78';
  ctx.beginPath();
  ctx.arc(x, y - 36, 15, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#2a1a12';
  ctx.beginPath();
  ctx.arc(x, y - 40, 15, Math.PI * 0.95, Math.PI * 2.05);
  ctx.fill();
  ctx.fillStyle = COL.terracotta;
  roundRect(ctx, x - 16, y - 50, 32, 9, 4);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  roundRect(ctx, x - 16, y - 50, 32, 3, 2);
  ctx.fill();
  // Eyes, facing the way the cook last walked.
  ctx.fillStyle = '#20140e';
  ctx.beginPath();
  ctx.arc(x - 5 * p.face + p.face * 2, y - 32, 2.1, 0, Math.PI * 2);
  ctx.arc(x + 5 * p.face + p.face * 2, y - 32, 2.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** The tray of ingredients the cook carries, drawn above the head. */
function drawTray(ctx, world) {
  if (world.tray.length === 0 && !world.carriedDish) return;
  const p = world.player;
  const x = p.x;
  const y = p.y - 76;
  const items = world.tray.length;
  const w = world.carriedDish ? 82 : Math.max(46, items * 30 + 14);
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  roundRect(ctx, x - w / 2 + 2, y + 4, w, 30, 6);
  ctx.fill();
  ctx.fillStyle = '#c8a165';
  roundRect(ctx, x - w / 2, y, w, 28, 6);
  ctx.fill();
  ctx.strokeStyle = '#8a6534';
  ctx.lineWidth = 2;
  ctx.stroke();
  if (world.carriedDish) {
    drawDish(ctx, world.carriedDish.dish, x - 25, y - 26, 52, true);
  } else {
    for (let i = 0; i < items; i += 1) {
      const item = world.tray[i];
      const ix = x - w / 2 + 8 + i * 28;
      drawIngredient(ctx, item.key, ix, y + 3, 24, item.prep);
      if (item.prep === 'raw') {
        ctx.fillStyle = 'rgba(30,20,12,0.55)';
        ctx.beginPath();
        ctx.arc(ix + 20, y + 5, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = COL.cream;
        text(ctx, 'R', ix + 20, y + 8, 8, COL.cream, 'center', 800);
      }
    }
  }
}
// ---------------------------------------------------------------- HUD

function drawHud(ctx, world) {
  // Bottom bar.
  ctx.fillStyle = 'rgba(20,12,8,0.82)';
  ctx.fillRect(0, H - 70, W, 70);
  ctx.fillStyle = COL.teal;
  ctx.fillRect(0, H - 70, W, 4);

  // Coins.
  ctx.fillStyle = COL.gold;
  ctx.beginPath();
  ctx.arc(42, H - 36, 15, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#a8801c';
  ctx.beginPath();
  ctx.arc(42, H - 36, 9, 0, Math.PI * 2);
  ctx.fill();
  shadowText(ctx, String(world.stats.coins), 66, H - 27, 27, COL.cream, 'left', 800);
  text(ctx, 'coins', 66, H - 10, 12, 'rgba(244,230,200,0.6)', 'left', 600);

  // Combo.
  const streak = world.stats.streak;
  const comboAlpha = world.stats.comboTimer > 0 ? 1 : 0.35;
  ctx.globalAlpha = comboAlpha;
  text(ctx, streak > 1 ? `COMBO x${streak}` : 'COMBO', 250, H - 26, 19,
    streak > 1 ? COL.gold : 'rgba(244,230,200,0.5)', 'left', 800);
  ctx.globalAlpha = 1;
  if (world.stats.comboTimer > 0 && streak > 1) {
    const frac = world.stats.comboTimer / 6;
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    roundRect(ctx, 248, H - 20, 128, 5, 2);
    ctx.fill();
    ctx.fillStyle = COL.gold;
    roundRect(ctx, 248, H - 20, 128 * frac, 5, 2);
    ctx.fill();
  }

  // Dishes served.
  text(ctx, `served ${world.stats.served}`, 420, H - 26, 17, COL.creamDark, 'left', 700);
  text(ctx, `expired ${world.stats.expired}/${ORDER.maxExpired}`, 420, H - 8, 13, 'rgba(244,230,200,0.6)', 'left', 600);

  // Carried tray labels.
  if (world.carriedDish) {
    text(ctx, `in hands: ${world.carriedDish.dish}`, 660, H - 26, 16, COL.gold, 'left', 800);
    text(ctx, 'walk to the serving window', 660, H - 8, 12, 'rgba(244,230,200,0.6)', 'left', 600);
  } else if (world.tray.length > 0) {
    text(ctx, `tray: ${world.tray.map((i) => INGREDIENTS[i.key].name).join(', ')}`,
      660, H - 26, 15, COL.creamDark, 'left', 600);
    text(ctx, 'space uses the nearest station', 660, H - 8, 12, 'rgba(244,230,200,0.55)', 'left', 600);
  } else {
    text(ctx, 'take an ingredient from the crates', 660, H - 26, 15, 'rgba(244,230,200,0.55)', 'left', 600);
  }

  // Keys.
  text(ctx, 'WASD / arrows walk   SPACE use   X toss   P pause   M mute',
    W - 22, H - 20, 13, 'rgba(244,230,200,0.55)', 'right', 600);

  // The cook's message, above the bottom bar.
  if (world.message) {
    const a = Math.min(1, world.messageT * 2);
    ctx.globalAlpha = Math.max(0, a);
    ctx.font = font(19, 700);
    const tw = ctx.measureText(world.message).width;
    ctx.fillStyle = 'rgba(20,12,8,0.86)';
    roundRect(ctx, W / 2 - tw / 2 - 18, H - 116, tw + 36, 36, 18);
    ctx.fill();
    ctx.strokeStyle = 'rgba(232,185,58,0.5)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    text(ctx, world.message, W / 2, H - 92, 19, COL.cream, 'center', 700);
    ctx.globalAlpha = 1;
  }
}

/** The nearest-station prompt and the mouse hover box. */
function drawTargeting(ctx, world) {
  const near = world.nearestStation();
  if (near && world.status === 'playing') {
    const point = near.kind === 'crates' ? world.standPoint('crates', near.index) : world.standPoint(near.kind);
    ctx.strokeStyle = 'rgba(232,185,58,0.55)';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 5]);
    ctx.beginPath();
    ctx.ellipse(point.x, point.y + 26, 44, 15, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    let hint = 'SPACE';
    if (near.kind === 'crates') hint = `SPACE + ${INGREDIENTS[CRATES[near.index].key].name}`;
    else if (near.kind === 'board') hint = world.boardWork ? (world.boardWork.done ? 'SPACE take' : 'chopping') : 'SPACE chop';
    else if (near.kind === 'wok') hint = world.wok ? (world.wok.state === 'done' ? 'SPACE take' : world.wok.state === 'burnt' ? 'X toss' : 'sizzling') : 'SPACE cook';
    else if (near.kind === 'plating') hint = 'SPACE plate';
    else hint = 'SPACE serve';
    ctx.font = font(13, 700);
    const tw = ctx.measureText(hint).width;
    ctx.fillStyle = 'rgba(20,12,8,0.75)';
    roundRect(ctx, point.x - tw / 2 - 9, point.y + 34, tw + 18, 22, 11);
    ctx.fill();
    text(ctx, hint, point.x, point.y + 49, 13, COL.cream, 'center', 700);
  }
  if (world.hoveredStation) {
    const b = STATION_BOXES[world.hoveredStation];
    if (b) {
      ctx.strokeStyle = 'rgba(244,230,200,0.35)';
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 6]);
      roundRect(ctx, b.x, b.y, b.w, b.h, 10);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }
}

/** The little recipe strip on the wall: what today's dishes need. */
function drawRecipeCard(ctx) {
  const x = 330;
  const y = 146;
  const w = 610;
  const h = 44;
  ctx.fillStyle = 'rgba(20,12,8,0.5)';
  roundRect(ctx, x, y, w, h, 8);
  ctx.fill();
  text(ctx, 'MENU', x + 12, y + 27, 12, COL.gold, 'left', 900);
  const names = Object.keys(DISHES);
  const cell = (w - 70) / 4;
  for (let i = 0; i < names.length; i += 1) {
    const name = names[i];
    const cx = x + 62 + i * cell;
    drawDish(ctx, name, cx, y + 8, 28, true);
    text(ctx, name, cx + 28, y + 20, 11, COL.cream, 'left', 700);
    text(ctx, DISHES[name].components.join(' + '), cx + 28, y + 33, 9, 'rgba(244,230,200,0.55)', 'left', 600);
  }
}
// ---------------------------------------------------------------- screens

function drawTitle(ctx, world, best) {
  ctx.fillStyle = 'rgba(16,10,6,0.62)';
  ctx.fillRect(0, 0, W, H);
  const cx = W / 2;
  // Banner.
  ctx.fillStyle = 'rgba(31,122,109,0.96)';
  roundRect(ctx, cx - 390, 176, 780, 132, 18);
  ctx.fill();
  ctx.strokeStyle = COL.gold;
  ctx.lineWidth = 4;
  ctx.stroke();
  shadowText(ctx, 'DAPUR NUSA', cx, 246, 62, COL.cream, 'center', 900);
  shadowText(ctx, 'RUSH HOUR KITCHEN', cx, 288, 27, '#ffe2a8', 'center', 800);
  text(ctx, 'One cook, one wok, three minutes of warung orders.', cx, 336, 18, COL.creamDark, 'center', 600);

  // Controls card.
  ctx.fillStyle = 'rgba(20,12,8,0.86)';
  roundRect(ctx, cx - 340, 366, 680, 176, 14);
  ctx.fill();
  ctx.strokeStyle = 'rgba(244,230,200,0.22)';
  ctx.lineWidth = 2;
  ctx.stroke();
  const lines = [
    ['WASD / arrows', 'walk the kitchen'],
    ['SPACE', 'use the station you stand at'],
    ['click', 'walk there, then act'],
    ['X', 'toss what is burning or wrong'],
    ['P / M', 'pause / mute'],
  ];
  for (let i = 0; i < lines.length; i += 1) {
    const y = 398 + i * 29;
    text(ctx, lines[i][0], cx - 300, y, 16, COL.gold, 'left', 800);
    text(ctx, lines[i][1], cx - 130, y, 16, COL.cream, 'left', 600);
  }
  text(ctx, 'Crates -> board or wok -> plate -> window.', cx + 200, 398, 14, COL.creamDark, 'left', 600);
  text(ctx, 'Serve before patience runs out. 3 expired', cx + 200, 424, 14, COL.creamDark, 'left', 600);
  text(ctx, 'orders close the shift early.', cx + 200, 450, 14, COL.creamDark, 'left', 600);
  text(ctx, 'Same dish twice in a row = combo bonus.', cx + 200, 476, 14, COL.creamDark, 'left', 600);

  const pulse = 0.6 + 0.4 * Math.sin(world.elapsed * 4);
  ctx.globalAlpha = pulse;
  text(ctx, 'PRESS SPACE OR CLICK TO OPEN THE SHIFT', cx, 596, 24, '#ffe2a8', 'center', 900);
  ctx.globalAlpha = 1;
  if (best > 0) text(ctx, `best shift: ${best} coins`, cx, 626, 15, COL.creamDark, 'center', 600);
}

function drawEnd(ctx, world, won, best) {
  ctx.fillStyle = won ? 'rgba(12,26,20,0.78)' : 'rgba(38,12,8,0.80)';
  ctx.fillRect(0, 0, W, H);
  const cx = W / 2;
  const summary = world.summary();
  const isBest = summary.coins > 0 && summary.coins >= best;
  ctx.fillStyle = 'rgba(20,12,8,0.92)';
  roundRect(ctx, cx - 330, 176, 660, 388, 18);
  ctx.fill();
  ctx.strokeStyle = won ? COL.gold : COL.terracotta;
  ctx.lineWidth = 4;
  ctx.stroke();

  shadowText(ctx, won ? 'SHIFT COMPLETE' : 'SHIFT OVER', cx, 246, 46, won ? '#ffe2a8' : '#ffc0ac', 'center', 900);
  text(ctx, won ? 'The warung closes satisfied.' : `${summary.expired} orders walked out hungry.`,
    cx, 280, 17, COL.creamDark, 'center', 600);

  text(ctx, String(summary.coins), cx - 190, 360, 64, COL.gold, 'center', 900);
  text(ctx, 'coins', cx - 190, 386, 15, COL.creamDark, 'center', 700);
  text(ctx, String(summary.served), cx, 360, 64, COL.cream, 'center', 900);
  text(ctx, 'dishes served', cx, 386, 15, COL.creamDark, 'center', 700);
  text(ctx, `x${summary.bestCombo}`, cx + 190, 360, 64, COL.tealLight, 'center', 900);
  text(ctx, 'best combo', cx + 190, 386, 15, COL.creamDark, 'center', 700);

  if (isBest) {
    text(ctx, 'new best shift!', cx, 420, 17, '#ffe2a8', 'center', 800);
  } else if (best > 0) {
    text(ctx, `best shift: ${best} coins`, cx, 420, 15, COL.creamDark, 'center', 600);
  }
  const pulse = 0.6 + 0.4 * Math.sin(world.elapsed * 5);
  ctx.globalAlpha = pulse;
  text(ctx, 'SPACE OR CLICK TO COOK AGAIN', cx, 508, 22, COL.cream, 'center', 900);
  ctx.globalAlpha = 1;
}

/** The pause card. */
function drawPause(ctx, world) {
  ctx.fillStyle = 'rgba(16,10,6,0.62)';
  ctx.fillRect(0, 0, W, H);
  const cx = W / 2;
  ctx.fillStyle = 'rgba(20,12,8,0.9)';
  roundRect(ctx, cx - 230, 268, 460, 150, 16);
  ctx.fill();
  ctx.strokeStyle = COL.tealLight;
  ctx.lineWidth = 3;
  ctx.stroke();
  shadowText(ctx, 'PAUSED', cx, 336, 40, COL.cream, 'center', 900);
  text(ctx, 'the shift clock is stopped', cx, 368, 15, COL.creamDark, 'center', 600);
  text(ctx, 'SPACE or P to keep cooking', cx, 396, 15, COL.gold, 'center', 700);
}

/**
 * Paint one frame. `screen` is one of the SCREEN_* names; `best` is the stored best shift.
 */
export function draw(ctx, world, screen, best = 0) {
  ctx.save();
  ctx.clearRect(0, 0, W, H);
  drawBackground(ctx, world);
  drawRecipeCard(ctx);
  drawCounterShell(ctx);
  drawCrates(ctx, world);
  drawBoard(ctx, world);
  drawWok(ctx, world);
  drawPlating(ctx, world);
  drawServing(ctx, world);
  drawTargeting(ctx, world);
  drawCook(ctx, world);
  drawTray(ctx, world);
  drawOrderBoard(ctx, world);
  drawHud(ctx, world);
  if (screen === SCREEN_TITLE) drawTitle(ctx, world, best);
  else if (screen === SCREEN_WON) drawEnd(ctx, world, true, best);
  else if (screen === SCREEN_LOST) drawEnd(ctx, world, false, best);
  else if (screen === SCREEN_PAUSED) drawPause(ctx, world);
  ctx.restore();
}

