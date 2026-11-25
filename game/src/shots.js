// The four screenshot scenes behind ?shot=cover|assemble|serve|rush. Each one opens a real shift,
// lets a simple kitchen bot cook for a few seconds (so orders, timers and the tray are exactly what
// play produces), then arranges the last few details of the frame: the cook mid-kitchen, a plate
// half-built, a finished plate in hand, or the rush's four short-patience tickets. Same seed, same
// frame.
import { CRATES, DISHES, INGREDIENTS, STAND } from './config.js';
import { canAdd, dishFor, isPrepped } from './world.js';
import { SCREEN_PLAY } from './render.js';

const STEP = 1 / 60;

/** The components of `dish` still missing from the plate, the tray and the two prep stations. */
function missing(world, dish) {
  const pool = DISHES[dish].components.slice();
  const have = world.plate.components.slice();
  if (world.boardWork) have.push(world.boardWork.key);
  if (world.wok) have.push(world.wok.key);
  for (const item of world.tray) have.push(item.key);
  for (const key of have) {
    const at = pool.indexOf(key);
    if (at >= 0) pool.splice(at, 1);
  }
  return pool;
}

/** Is a needed ingredient already somewhere, raw, waiting to be prepped? */
function rawOf(world, key) {
  for (const item of world.tray) if (item.key === key && item.prep === 'raw') return true;
  return false;
}

/**
 * One bot decision: the station to use and the crate index, or null to wait. It is deliberately
 * simple, the way a hurried player is: finish what is on the fire, then feed the nearest order.
 */
function think(world) {
  const wok = world.wok;
  const board = world.boardWork;

  if (wok && wok.state === 'burnt') return { kind: 'wok', index: -1 };
  if (wok && wok.state === 'done' && world.tray.length < 4) return { kind: 'wok', index: -1 };
  if (board && board.done && world.tray.length < 4) return { kind: 'board', index: -1 };
  if (world.plate.dish) return { kind: 'plating', index: -1 };
  if (world.carriedDish) {
    const match = world.orders.some((o) => o.dish === world.carriedDish.dish);
    return match ? { kind: 'serving', index: -1 } : { kind: 'plating', index: -1 };
  }

  // Plate what is ready, if it moves a live order forward.
  for (let i = 0; i < world.tray.length; i += 1) {
    const item = world.tray[i];
    if (!isPrepped(item) || !canAdd(world.plate.components, item.key)) continue;
    const completes = dishFor(world.plate.components.concat([item.key]));
    if (completes && !world.orders.some((o) => o.dish === completes)) continue;
    return { kind: 'plating', index: -1 };
  }

  // Pick the hungriest order and the next component it still needs.
  if (world.orders.length === 0) return null;
  const order = world.orders.slice().sort((a, b) => a.patience - b.patience)[0];
  const need = missing(world, order.dish);
  if (need.length === 0) return world.plate.components.length ? { kind: 'plating', index: -1 } : null;

  const key = need[0];
  const def = INGREDIENTS[key];
  if (def.prep === 'chop') {
    const hasPrepped = world.tray.some((i) => i.key === key && i.prep === 'chopped');
    if (hasPrepped || (board && board.key === key)) return null;
    if (!board && world.tray.length < 4) return { kind: 'board', index: -1 };
    if (board) return null;
    const at = CRATES.findIndex((c) => c.key === key);
    return { kind: 'crates', index: at };
  }
  if (def.prep === 'cook') {
    const hasPrepped = world.tray.some((i) => i.key === key && i.prep === 'cooked');
    if (hasPrepped || (wok && wok.key === key)) return null;
    if (!wok && world.tray.length < 4) return { kind: 'wok', index: -1 };
    if (wok) return null;
    const at = CRATES.findIndex((c) => c.key === key);
    return { kind: 'crates', index: at };
  }
  if (world.tray.some((i) => i.key === key)) return null;
  const at = CRATES.findIndex((c) => c.key === key);
  return { kind: 'crates', index: at };
}

/** Let the bot cook for `seconds` of shift time. */
function cook(world, seconds) {
  let idle = 0;
  let last = '';
  for (let t = 0; t < seconds / STEP; t += 1) {
    if (world.status !== 'playing') break;
    if (!world.pending && !world.walkTarget) {
      const action = think(world);
      if (action) {
        const stand = world.standPoint(action.kind, action.index);
        const near = world.nearestStation();
        const here = near && near.kind === action.kind && (action.kind !== 'crates' || near.index === action.index);
        if (here) world.interact(action.kind, action.index);
        else world.walkTo(stand.x, stand.y, action.kind, action.index);
      } else {
        idle += STEP;
      }
    }
    world.step(STEP, true);
    world.takeEvents();
    const tag = world.message;
    if (tag !== last) { last = tag; idle = 0; }
    if (idle > 3) break;
  }
}

/** Stand the cook at a spot, walking speed be damned: the frame only needs the pose. */
function pose(world, x, y, face) {
  world.player.x = x;
  world.player.y = y;
  world.player.face = face;
  world.player.walk = 0.9;
  world.walkTarget = null;
  world.pending = null;
  world.moveDir.x = 0;
  world.moveDir.y = 0;
}

/**
 * Set `world` to the named scene and return the screen to draw. Any other name (or no name) is the
 * cover.
 */
export function stageShot(name, world) {
  world.reset();
  world.takeEvents();

  if (name === 'assemble') {
    cook(world, 20);
    // A Mie Goreng half-built: noodles cooked on the wok, chicken chopped on the board, greens in
    // the tray and one more needed, so the plate's ring reads 2/3.
    world.orders = world.orders.filter((o) => o.dish !== 'Mie Goreng');
    world.orders.unshift({ id: 900, dish: 'Mie Goreng', patience: 21, maxPatience: 24, price: DISHES['Mie Goreng'].price, fresh: 0.6 });
    world.orders = world.orders.slice(0, 3);
    world.tray = [
      { key: 'greens', prep: 'chopped' },
      { key: 'egg', prep: 'cooked' },
    ];
    world.boardWork = { key: 'chicken', t: 1.25, done: false };
    world.wok = { key: 'noodles', t: 2.1, state: 'cooking', cookTime: 3.0, burnTime: 2.2 };
    world.plate = { components: ['noodles', 'chicken'], dish: null };
    world.carriedDish = null;
    world.message = 'Mie Goreng - greens to go';
    world.messageT = 3;
    pose(world, STAND.plating.x, STAND.plating.y + 8, -1);
    world.hoveredStation = '';
    world.elapsed = 44;
    world.remaining = 136;
    return { screen: SCREEN_PLAY, best: 0 };
  }

  if (name === 'serve') {
    cook(world, 26);
    // A Nasi Goreng finished and in hand, its order still on the board and worth serving now.
    world.orders = world.orders.filter((o) => o.dish !== 'Nasi Goreng');
    world.orders.unshift({ id: 901, dish: 'Nasi Goreng', patience: 17, maxPatience: 22, price: DISHES['Nasi Goreng'].price, fresh: 0 });
    world.orders = world.orders.slice(0, 3);
    world.carriedDish = { dish: 'Nasi Goreng', components: ['rice', 'egg', 'sauce'] };
    world.plate = { components: [], dish: null };
    world.tray = [{ key: 'chicken', prep: 'chopped' }];
    world.boardWork = null;
    world.wok = { key: 'egg', t: 2.2, state: 'done', cookTime: 2.2, burnTime: 2.0 };
    world.message = 'Nasi Goreng plated - serve it hot';
    world.messageT = 3;
    pose(world, STAND.serving.x - 6, STAND.serving.y + 4, 1);
    world.hoveredStation = '';
    world.elapsed = 58;
    world.remaining = 122;
    return { screen: SCREEN_PLAY, best: 0 };
  }

  if (name === 'rush') {
    cook(world, 66);
    // The last hour of service: four tickets, little patience left, stove and board both busy.
    const dishes = ['Mie Goreng', 'Nasi Goreng', 'Gado-Gado', 'Sate Ayam'];
    const patience = [5.5, 8, 3.5, 11];
    world.orders = dishes.map((dish, i) => ({
      id: 910 + i,
      dish,
      patience: patience[i],
      maxPatience: 20,
      price: DISHES[dish].price,
      fresh: 0,
    }));
    world.wok = { key: 'rice', t: 1.9, state: 'cooking', cookTime: 3.0, burnTime: 2.2 };
    world.boardWork = { key: 'chicken', t: 1.1, done: false };
    world.tray = [
      { key: 'greens', prep: 'chopped' },
      { key: 'egg', prep: 'cooked' },
      { key: 'noodles', prep: 'cooked' },
    ];
    world.plate = { components: ['egg'], dish: null };
    world.carriedDish = null;
    world.message = 'Four tickets up - keep the wok moving';
    world.messageT = 3.4;
    pose(world, 700, 470, 1);
    world.hoveredStation = '';
    world.elapsed = 132;
    world.remaining = 48;
    world.stats.served = 9;
    world.stats.coins = 128;
    world.stats.streak = 3;
    world.stats.comboTimer = 4.2;
    world.stats.bestCombo = 3;
    return { screen: SCREEN_PLAY, best: 0 };
  }

  // cover: a real opening shift, three tickets on the board, the cook out on the floor.
  cook(world, 24);
  while (world.orders.length < 3) {
    world.step(STEP, true);
    world.takeEvents();
    if (world.elapsed > 70) break;
  }
  if (world.orders.length === 0) {
    world.orders.push({ id: 905, dish: 'Nasi Goreng', patience: 20, maxPatience: 22, price: DISHES['Nasi Goreng'].price, fresh: 0 });
  }
  world.tray = [{ key: 'egg', prep: 'cooked' }, { key: 'greens', prep: 'raw' }, { key: 'rice', prep: 'cooked' }];
  world.boardWork = { key: 'chicken', t: 0.6, done: false };
  world.wok = { key: 'noodles', t: 1.1, state: 'cooking', cookTime: 3.0, burnTime: 2.2 };
  world.plate = { components: ['rice'], dish: null };
  pose(world, 636, 512, 1);
  world.hoveredStation = '';
  world.message = 'Three tickets up - one cook, three minutes';
  world.messageT = 4;
  return { screen: SCREEN_PLAY, best: 0 };
}
