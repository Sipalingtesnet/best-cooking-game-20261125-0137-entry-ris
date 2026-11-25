// Boot and the one loop: input is read every frame, the shift advances in fixed 1/60 s steps, and
// render.js paints. Screens: title, play, paused, won (shift complete) and lost (three orders
// walked out). ?shot=<name>&seed=N stages one of shots.js's scenes and paints it once for a
// screenshot, then sets document.body.dataset.ready.
import { COL, ORDER, SHIFT_LENGTH, W, H } from './config.js';
import { makeRng } from './random.js';
import { createInput } from './input.js';
import { createWorld, STATION_BOXES } from './world.js';
import { draw, SCREEN_LOST, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WON } from './render.js';
import { stageShot } from './shots.js';
import { audio } from './audio.js';

const STEP = 1 / 60;
const MAX_FRAME = 0.25;
const BEST_KEY = 'dapur-nusa.best';

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
canvas.width = W;
canvas.height = H;
const ctx = canvas.getContext('2d');

const world = createWorld(makeRng(seed));

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
    // Storage may be off (private windows): the best then lasts this visit only.
  }
}

// ---------------------------------------------------------------- screenshot scenes

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    draw(ctx, world, scene.screen, scene.best);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else document.body.dataset.ready = 'true';
  }
  requestAnimationFrame(paint);
}

// ---------------------------------------------------------------- the game

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();
  let muted = false;
  const mouse = { x: 0, y: 0, inside: false };

  function announce(message) {
    status.textContent = message;
  }

  function startShift() {
    world.reset();
    accumulator = 0;
    screen = SCREEN_PLAY;
    announce(`Shift open. ${SHIFT_LENGTH} seconds, ${ORDER.maxExpired} orders can expire.`);
  }

  function finishShift() {
    screen = world.status === 'won' ? SCREEN_WON : SCREEN_LOST;
    const summary = world.summary();
    if (summary.coins > best) {
      best = summary.coins;
      saveBest(best);
    }
    announce(screen === SCREEN_WON
      ? `Shift complete. ${summary.coins} coins, ${summary.served} dishes served, best combo ${summary.bestCombo}.`
      : `Shift over. ${summary.coins} coins, ${summary.expired} orders expired.`);
  }

  function hoverStationAt(x, y) {
    for (const kind of ['crates', 'board', 'wok', 'plating', 'serving']) {
      const b = STATION_BOXES[kind];
      if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return kind;
    }
    return '';
  }

  function click() {
    if (!mouse.inside) return;
    audio.unlock();
    const { x, y } = mouse;
    if (y < 300 && hoverStationAt(x, y)) {
      const at = world.stationAt(x, y);
      if (at) {
        const point = world.standPoint(at.kind, at.index);
        world.walkTo(point.x, point.y, at.kind, at.index);
        return;
      }
    }
    world.walkTo(x, y);
  }

  function handleFrameInput() {
    if (input.consumeClick()) {
      if (screen === SCREEN_TITLE || screen === SCREEN_WON || screen === SCREEN_LOST) startShift();
      else if (screen === SCREEN_PAUSED) screen = SCREEN_PLAY;
      else click();
    }
    if (screen === SCREEN_TITLE || screen === SCREEN_WON || screen === SCREEN_LOST) {
      if (input.isDown(' ', 'enter')) { input.consumeKey(' '); input.consumeKey('enter'); startShift(); }
      return;
    }
    if (input.isDown('p', 'escape')) {
      input.consumeKey('p');
      input.consumeKey('escape');
      screen = screen === SCREEN_PAUSED ? SCREEN_PLAY : SCREEN_PAUSED;
      announce(screen === SCREEN_PAUSED ? 'Paused.' : 'Cooking.');
      accumulator = 0;
      return;
    }
    if (input.isDown('m')) {
      input.consumeKey('m');
      muted = !muted;
      audio.setMuted(muted);
    }
    if (screen === SCREEN_PAUSED) return;

    const mx = (input.isDown('d', 'arrowright') ? 1 : 0) - (input.isDown('a', 'arrowleft') ? 1 : 0);
    const my = (input.isDown('s', 'arrowdown') ? 1 : 0) - (input.isDown('w', 'arrowup') ? 1 : 0);
    if (mx !== 0 || my !== 0) world.setMoveDir(mx, my);
    else if (world.walkTarget) world.setMoveDir(0, 0);

    if (input.isDown(' ')) {
      input.consumeKey(' ');
      const near = world.nearestStation();
      if (near) world.interact(near.kind, near.index);
    }
    if (input.isDown('x')) {
      input.consumeKey('x');
      world.toss();
    }
    mouse.x = input.mouse.x;
    mouse.y = input.mouse.y;
    world.hoveredStation = hoverStationAt(mouse.x, mouse.y);
  }

  function playEvents() {
    for (const name of world.takeEvents()) {
      if (name === 'serve') audio.serve();
      else if (name === 'order') audio.ding();
      else if (name === 'ding') audio.ding();
      else if (name === 'chop') audio.chop();
      else if (name === 'sizzle') audio.sizzle();
      else if (name === 'pick') audio.tap();
      else if (name === 'plate') audio.plate();
      else if (name === 'burn') audio.burn();
      else if (name === 'toss') audio.toss();
      else if (name === 'expire') audio.error();
      else if (name === 'error') audio.error();
      else if (name === 'over') audio.ding();
    }
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleFrameInput();
    if (screen === SCREEN_PLAY) {
      while (accumulator >= STEP) {
        world.step(STEP, true);
        accumulator -= STEP;
        if (world.status !== 'playing') {
          finishShift();
          accumulator = 0;
          break;
        }
      }
    } else if (screen === SCREEN_PAUSED) {
      accumulator = 0;
      world.messageT = Math.max(world.messageT, 0.01);
    } else {
      // The title and end screens keep the kitchen breathing, but spend no shift time.
      while (accumulator >= STEP) {
        world.step(STEP, false);
        accumulator -= STEP;
      }
    }
    playEvents();
    draw(ctx, world, screen, best);
    if (!document.body.dataset.ready) document.body.dataset.ready = 'true';
  }

  canvas.addEventListener('mousemove', (event) => {
    const rect = canvas.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * W;
    const y = ((event.clientY - rect.top) / rect.height) * H;
    mouse.x = x;
    mouse.y = y;
    mouse.inside = x >= 0 && x <= W && y >= 0 && y <= H;
    input.mouse.x = x;
    input.mouse.y = y;
  });
  canvas.addEventListener('mouseleave', () => { mouse.inside = false; world.hoveredStation = ''; });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  announce('Dapur Nusa. Press Space or click to open the shift.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
