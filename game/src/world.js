// The kitchen's rules and state, with no DOM in it: orders, stations, the cook, the tray, cooking
// timers, the shift clock and the score. render.js draws this, main.js steps it, and the offline
// logic simulation (work/logic-sim.mjs) imports it to play hundreds of shifts in plain Node.
import {
  CRATES, DISHES, FLOOR, INGREDIENTS, ORDER, PLAYER_SPEED, PLAYER_START, REACH, SHIFT_LENGTH,
  STAND,
} from './config.js';

/** How many ingredients the cook can carry at once. */
export const TRAY_MAX = 4;

/** A fresh tray item: raw for anything that must be prepped, ready for sauce. */
export function makeItem(key) {
  const def = INGREDIENTS[key];
  if (!def) throw new Error(`unknown ingredient ${key}`);
  return { key, prep: def.prep === 'none' ? 'ready' : 'raw' };
}

/** Whether an item may go on a plate: chopped, cooked, or needing no prep at all. */
export function isPrepped(item) {
  return item.prep === 'ready' || item.prep === 'chopped' || item.prep === 'cooked';
}

/** The multiset of keys, sorted, so dishes compare cheaply. */
function sorted(keys) {
  return keys.slice().sort();
}

/** The dish whose components are exactly `keys`, or null. */
export function dishFor(keys) {
  const want = sorted(keys);
  for (const name of Object.keys(DISHES)) {
    const have = sorted(DISHES[name].components);
    if (have.length !== want.length) continue;
    let same = true;
    for (let i = 0; i < want.length; i += 1) {
      if (want[i] !== have[i]) { same = false; break; }
    }
    if (same) return name;
  }
  return null;
}

/** Whether adding `key` to the plate still leaves a dish it can become (no dead ends). */
export function canAdd(components, key) {
  for (const name of Object.keys(DISHES)) {
    const pool = DISHES[name].components.slice();
    if (components.length + 1 > pool.length) continue;
    let ok = true;
    for (const k of components.concat([key])) {
      const at = pool.indexOf(k);
      if (at < 0) { ok = false; break; }
      pool.splice(at, 1);
    }
    if (ok) return true;
  }
  return false;
}

/**
 * The dish a plate is heading for: the live dish that the plate and the tray can best finish.
 * A component is only ever offered to the plate when this dish wants it, so the plating counter
 * never takes an ingredient the cook then has to fish back out.
 */
export function plateTarget(components, tray = [], orders = []) {
  let best = null;
  let bestScore = -1;
  let bestTotal = -1;
  const wanted = new Set(orders.map((o) => o.dish));
  for (const name of Object.keys(DISHES)) {
    if (wanted.size > 0 && !wanted.has(name)) continue;
    const pool = DISHES[name].components.slice();
    let ok = true;
    for (const k of components) {
      const at = pool.indexOf(k);
      if (at < 0) { ok = false; break; }
      pool.splice(at, 1);
    }
    if (!ok) continue;
    let usable = 0;
    const seen = pool.slice();
    for (const item of tray) {
      if (!isPrepped(item)) continue;
      const at = seen.indexOf(item.key);
      if (at >= 0) { seen.splice(at, 1); usable += 1; }
    }
    const total = DISHES[name].components.length;
    if (usable > bestScore || (usable === bestScore && total > bestTotal)) {
      bestScore = usable;
      bestTotal = total;
      best = { dish: name, left: pool };
    }
  }
  return best;
}

/** The drawn hit boxes of the kitchen furniture, in canvas coordinates (mouse targets). */
export const STATION_BOXES = {
  crates:  { x: 44, y: 168, w: 176, h: 448 },
  board:   { x: 340, y: 190, w: 180, h: 118 },
  wok:     { x: 540, y: 178, w: 184, h: 130 },
  plating: { x: 742, y: 190, w: 188, h: 118 },
  serving: { x: 962, y: 150, w: 216, h: 158 },
};

/** Distance between two points. */
function dist(ax, ay, bx, by) {
  return Math.hypot(ax - bx, ay - by);
}
/** A world: one shift's worth of state, reset for every new game. */
export function createWorld(rng) {
  const world = {
    rng,
    status: 'playing',      // playing | won | lost
    elapsed: 0,
    remaining: SHIFT_LENGTH,
    player: { x: PLAYER_START.x, y: PLAYER_START.y, face: 1, walk: 0 },
    moveDir: { x: 0, y: 0 },
    walkTarget: null,       // {x, y}
    pending: null,          // {x, y, kind, index}: walked to, then used once
    tray: [],
    carriedDish: null,      // a finished plate in the cook's hands
    boardWork: null,        // {key, t, done}
    wok: null,              // {key, t, state: cooking | done | burnt}
    plate: { components: [], dish: null },
    orders: [],
    nextOrderId: 1,
    spawnIn: 1.4,
    crateFocus: 0,
    hoveredCrate: -1,
    hoveredStation: '',
    message: '',
    messageT: 0,
    events: [],
    sizzleT: 0,
    lastGain: 0,
    stats: { coins: 0, served: 0, expired: 0, streak: 0, bestCombo: 0, comboTimer: 0, tips: 0 },
  };

  const emit = (name) => { world.events.push(name); };

  world.say = (text) => {
    world.message = text;
    world.messageT = 2.2;
  };

  world.takeEvents = () => {
    const out = world.events;
    world.events = [];
    return out;
  };

  world.reset = () => {
    world.status = 'playing';
    world.elapsed = 0;
    world.remaining = SHIFT_LENGTH;
    world.player = { x: PLAYER_START.x, y: PLAYER_START.y, face: 1, walk: 0 };
    world.moveDir = { x: 0, y: 0 };
    world.walkTarget = null;
    world.pending = null;
    world.tray = [];
    world.carriedDish = null;
    world.boardWork = null;
    world.wok = null;
    world.plate = { components: [], dish: null };
    world.orders = [];
    world.nextOrderId = 1;
    world.spawnIn = 1.4;
    world.crateFocus = 0;
    world.hoveredCrate = -1;
    world.hoveredStation = '';
    world.message = '';
    world.messageT = 0;
    world.events = [];
    world.sizzleT = 0;
    world.lastGain = 0;
    world.stats = { coins: 0, served: 0, expired: 0, streak: 0, bestCombo: 0, comboTimer: 0, tips: 0 };
  };

  // ------------------------------------------------------------ orders

  /** A dish weighted toward the bigger recipes as the shift runs on. */
  function pickDish() {
    const frac = Math.min(1, world.elapsed / SHIFT_LENGTH);
    const names = Object.keys(DISHES);
    const weights = names.map((n) => 1 + frac * 1.8 * (DISHES[n].components.length - 2));
    let total = 0;
    for (const w of weights) total += w;
    let roll = world.rng.next() * total;
    for (let i = 0; i < names.length; i += 1) {
      roll -= weights[i];
      if (roll <= 0) return names[i];
    }
    return names[names.length - 1];
  }

  function spawnOrder() {
    const dish = pickDish();
    const patience = Math.max(ORDER.patienceMin, ORDER.patienceBase - world.elapsed * ORDER.patienceDropPerSec);
    world.orders.push({
      id: world.nextOrderId,
      dish,
      patience,
      maxPatience: patience,
      price: DISHES[dish].price,
      fresh: 1,
    });
    world.nextOrderId += 1;
    emit('order');
  }

  // ------------------------------------------------------------ movement

  /** Keyboard steering, each axis -1, 0 or 1. */
  world.setMoveDir = (x, y) => {
    world.walkTarget = null;
    world.pending = null;
    world.moveDir.x = x;
    world.moveDir.y = y;
  };

  /** Click-to-walk: go to a point; then use `kind` there when `kind` is given. */
  world.walkTo = (x, y, kind = '', index = -1) => {
    const cx = Math.max(FLOOR.x0, Math.min(FLOOR.x1, x));
    const cy = Math.max(FLOOR.y0, Math.min(FLOOR.y1, y));
    world.walkTarget = { x: cx, y: cy };
    world.pending = kind ? { x: cx, y: cy, kind, index } : null;
  };

  /** The stand point in front of a station (or crate). */
  world.standPoint = (kind, index = -1) => {
    if (kind === 'crates') {
      const crate = CRATES[Math.max(0, Math.min(CRATES.length - 1, index))];
      return { x: STAND.crates.x, y: Math.max(FLOOR.y0 + 14, Math.min(FLOOR.y1 - 14, crate.y)) };
    }
    if (kind === 'drop') return { x: world.player.x, y: world.player.y };
    return { x: STAND[kind].x, y: STAND[kind].y };
  };

  /** What the cook is close enough to use: {kind, index} or null. */
  world.nearestStation = () => {
    const p = world.player;
    let best = null;
    let bestD = REACH;
    for (const kind of ['board', 'wok', 'plating', 'serving']) {
      const s = STAND[kind];
      const d = dist(p.x, p.y, s.x, s.y);
      if (d < bestD) { bestD = d; best = { kind, index: -1 }; }
    }
    for (let i = 0; i < CRATES.length; i += 1) {
      const s = world.standPoint('crates', i);
      const d = dist(p.x, p.y, s.x, s.y);
      if (d < bestD) { bestD = d; best = { kind: 'crates', index: i }; }
    }
    return best;
  };

  /** Which station (or crate) a canvas point is inside, for the mouse. */
  world.stationAt = (x, y) => {
    for (const kind of ['crates', 'board', 'wok', 'plating', 'serving']) {
      const b = STATION_BOXES[kind];
      if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
        if (kind !== 'crates') return { kind, index: -1 };
        for (let i = 0; i < CRATES.length; i += 1) {
          if (y >= CRATES[i].y - 32 && y < CRATES[i].y + 32) return { kind: 'crates', index: i };
        }
        return { kind: 'crates', index: world.crateFocus };
      }
    }
    return null;
  };
  // ------------------------------------------------------------ interactions

  function trayRoom() {
    return world.tray.length < TRAY_MAX;
  }

  function findRawTray(pred) {
    for (let i = 0; i < world.tray.length; i += 1) {
      const item = world.tray[i];
      if (item.prep === 'raw' && INGREDIENTS[item.key].prep === pred) return i;
    }
    return -1;
  }

  /** Use a station once. Returns true when something happened. */
  world.interact = (kind, index = -1) => {
    if (world.status !== 'playing') return false;
    switch (kind) {
      case 'crates': {
        const at = Math.max(0, Math.min(CRATES.length - 1, index));
        const crate = CRATES[at];
        world.crateFocus = at;
        if (!trayRoom()) { world.say('Tray full - plate or toss first'); emit('error'); return false; }
        world.tray.push(makeItem(crate.key));
        world.say(`+ ${INGREDIENTS[crate.key].name}`);
        emit('pick');
        return true;
      }
      case 'board': {
        if (world.boardWork) {
          if (!world.boardWork.done) { world.say('Chopping...'); return false; }
          if (!trayRoom()) { world.say('Tray full - plate or toss first'); emit('error'); return false; }
          world.tray.push({ key: world.boardWork.key, prep: 'chopped' });
          world.say(`${INGREDIENTS[world.boardWork.key].name} chopped`);
          world.boardWork = null;
          emit('pick');
          return true;
        }
        const at = findRawTray('chop');
        if (at < 0) { world.say('Nothing to chop - bring chicken or greens'); emit('error'); return false; }
        const item = world.tray.splice(at, 1)[0];
        world.boardWork = { key: item.key, t: 0, done: false };
        emit('chop');
        return true;
      }
      case 'wok': {
        if (world.wok) {
          if (world.wok.state === 'cooking') { world.say('Sizzling...'); return false; }
          if (world.wok.state === 'burnt') {
            world.wok = null;
            world.say('Burnt batch tossed');
            emit('toss');
            return true;
          }
          if (!trayRoom()) { world.say('Tray full - plate or toss first'); emit('error'); return false; }
          world.tray.push({ key: world.wok.key, prep: 'cooked' });
          world.say(`${INGREDIENTS[world.wok.key].name} cooked`);
          world.wok = null;
          emit('pick');
          return true;
        }
        const at = findRawTray('cook');
        if (at < 0) { world.say('Nothing to cook - bring rice, noodles or egg'); emit('error'); return false; }
        const item = world.tray.splice(at, 1)[0];
        const def = INGREDIENTS[item.key];
        world.wok = { key: item.key, t: 0, state: 'cooking', cookTime: def.cookTime, burnTime: def.burnTime };
        world.sizzleT = 0;
        emit('sizzle');
        return true;
      }
      case 'plating': {
        if (world.carriedDish) {
          // Put the plate back down, so a dish nobody ordered can be cleared with toss.
          if (world.plate.components.length > 0) { world.say('The counter is busy'); emit('error'); return false; }
          world.plate = { components: world.carriedDish.components.slice(), dish: world.carriedDish.dish };
          world.carriedDish = null;
          world.say('Plate put down');
          emit('plate');
          return true;
        }
        if (world.plate.dish) {
          world.carriedDish = { dish: world.plate.dish, components: world.plate.components.slice() };
          world.plate = { components: [], dish: null };
          world.say(`${world.carriedDish.dish} plated - to the window`);
          emit('plate');
          return true;
        }
        // One visit plates every tray item the plate's dish still needs: a cook with full hands
        // is not made to walk back for each piece.
        const target = plateTarget(world.plate.components, world.tray, world.orders);
        if (!target) { world.say('The plate is full'); emit('error'); return false; }
        const pool = target.left.slice();
        let added = 0;
        let lastKey = '';
        for (let i = 0; i < world.tray.length;) {
          const item = world.tray[i];
          const at = pool.indexOf(item.key);
          if (!isPrepped(item) || at < 0) { i += 1; continue; }
          pool.splice(at, 1);
          world.tray.splice(i, 1);
          world.plate.components.push(item.key);
          lastKey = item.key;
          added += 1;
        }
        if (added === 0) {
          world.say(`Need ${INGREDIENTS[pool[0]].name} next`);
          emit('error');
          return false;
        }
        const dish = dishFor(world.plate.components);
        if (dish) {
          world.plate.dish = dish;
          world.say(`${dish} ready - plate it up`);
          emit('ding');
        } else {
          const left = plateTarget(world.plate.components, world.tray, world.orders);
          world.say(left ? `${INGREDIENTS[lastKey].name} on - ${left.left.length} to go` : 'Plate on its way');
          emit('plate');
        }
        return true;
      }
      case 'serving': {
        if (!world.carriedDish) { world.say('Bring a finished plate'); emit('error'); return false; }
        let at = -1;
        for (let i = 0; i < world.orders.length; i += 1) {
          if (world.orders[i].dish === world.carriedDish.dish) { at = i; break; }
        }
        if (at < 0) { world.say(`No order for ${world.carriedDish.dish}`); emit('error'); return false; }
        serve(at);
        return true;
      }
      case 'drop':
        return world.dropTray(index);
      default:
        return false;
    }
  };

  /** Drop one tray item by index (the bot uses it to make room; the player's X drops the last). */
  world.dropTray = (index) => {
    if (world.status !== 'playing') return false;
    const at = Math.max(0, Math.min(world.tray.length - 1, index));
    if (world.tray.length === 0) return false;
    const item = world.tray.splice(at, 1)[0];
    world.say(`${INGREDIENTS[item.key].name} dropped`);
    emit('toss');
    return true;
  };

  /** Toss whatever is at the station the cook stands at: wok, board, plate, else a tray item. */
  world.toss = () => {
    if (world.status !== 'playing') return false;
    const near = world.nearestStation();
    if (near && near.kind === 'wok' && world.wok) {
      world.wok = null;
      world.say('Wok emptied');
      emit('toss');
      return true;
    }
    if (near && near.kind === 'board' && world.boardWork) {
      world.boardWork = null;
      world.say('Board scraped');
      emit('toss');
      return true;
    }
    if (near && near.kind === 'plating' && world.plate.components.length > 0) {
      world.plate = { components: [], dish: null };
      world.say('Plate returned');
      emit('toss');
      return true;
    }
    if (world.tray.length > 0) {
      const item = world.tray.pop();
      world.say(`${INGREDIENTS[item.key].name} dropped`);
      emit('toss');
      return true;
    }
    world.say('Nothing to toss');
    return false;
  };

  // ------------------------------------------------------------ scoring

  function serve(index) {
    const order = world.orders[index];
    const frac = Math.max(0, Math.min(1, order.patience / order.maxPatience));
    const tip = Math.round(order.price * 0.6 * frac);
    const stats = world.stats;
    stats.streak = stats.comboTimer > 0 ? stats.streak + 1 : 1;
    stats.comboTimer = 6;
    if (stats.streak > stats.bestCombo) stats.bestCombo = stats.streak;
    const mult = Math.min(3, 1 + (stats.streak - 1) * 0.25);
    const gain = Math.max(0, Math.round((order.price + tip) * mult));
    stats.coins += gain;
    stats.tips += tip;
    stats.served += 1;
    world.orders.splice(index, 1);
    world.carriedDish = null;
    world.lastGain = gain;
    world.say(`Served ${order.dish} +${gain}${stats.streak > 1 ? ` x${stats.streak}` : ''}`);
    emit('serve');
  }
  // ------------------------------------------------------------ the shift

  /**
   * Advance the world by dt seconds. `active` false holds the shift clock, the orders and the
   * combo window still (the title screen shows a living kitchen without spending the shift);
   * movement and cooking timers always run, so the kitchen never lies dormant mid-shift.
   */
  world.step = (dt, active = true) => {
    if (world.messageT > 0) {
      world.messageT -= dt;
      if (world.messageT <= 0) world.message = '';
    }

    if (world.status !== 'playing') return;

    // Movement.
    const p = world.player;
    let vx = 0;
    let vy = 0;
    if (world.walkTarget) {
      const dx = world.walkTarget.x - p.x;
      const dy = world.walkTarget.y - p.y;
      const d = Math.hypot(dx, dy);
      if (d < 3) {
        p.x = world.walkTarget.x;
        p.y = world.walkTarget.y;
        world.walkTarget = null;
      } else {
        vx = (dx / d) * PLAYER_SPEED;
        vy = (dy / d) * PLAYER_SPEED;
      }
    } else {
      vx = world.moveDir.x * PLAYER_SPEED;
      vy = world.moveDir.y * PLAYER_SPEED;
      if (vx !== 0 && vy !== 0) { vx *= 0.7071; vy *= 0.7071; }
    }
    if (vx !== 0 || vy !== 0) {
      p.x = Math.max(FLOOR.x0, Math.min(FLOOR.x1, p.x + vx * dt));
      p.y = Math.max(FLOOR.y0, Math.min(FLOOR.y1, p.y + vy * dt));
      if (vx !== 0) p.face = vx > 0 ? 1 : -1;
      p.walk += dt * 9;
    } else {
      p.walk += dt * 2;
    }
    if (world.pending) {
      const target = world.pending;
      if (dist(p.x, p.y, target.x, target.y) < 12) {
        world.pending = null;
        world.walkTarget = null;
        world.interact(target.kind, target.index);
      }
    }

    // The board chops on its own once the item is laid down.
    if (world.boardWork && !world.boardWork.done) {
      const def = INGREDIENTS[world.boardWork.key];
      world.boardWork.t += dt;
      if (world.boardWork.t >= def.chopTime) {
        world.boardWork.t = def.chopTime;
        world.boardWork.done = true;
        emit('ding');
      }
    }

    // The wok cooks, holds, then burns.
    if (world.wok) {
      const wok = world.wok;
      wok.t += dt;
      if (wok.state === 'cooking') {
        world.sizzleT -= dt;
        if (world.sizzleT <= 0) { world.sizzleT = 0.45; emit('sizzle'); }
        if (wok.t >= wok.cookTime) {
          wok.state = 'done';
          wok.t = wok.cookTime;
          world.say(`${INGREDIENTS[wok.key].name} is ready - take it off`);
          emit('ding');
        }
      } else if (wok.state === 'done') {
        if (wok.t >= wok.cookTime + wok.burnTime) {
          wok.state = 'burnt';
          wok.t = wok.cookTime + wok.burnTime;
          world.say('Burning! Toss it!');
          emit('burn');
        }
      }
    }

    if (!active) return;

    // The shift clock.
    world.elapsed += dt;
    world.remaining = Math.max(0, SHIFT_LENGTH - world.elapsed);

    // Combos decay.
    if (world.stats.comboTimer > 0) {
      world.stats.comboTimer = Math.max(0, world.stats.comboTimer - dt);
      if (world.stats.comboTimer === 0) world.stats.streak = 0;
    }

    // Orders drain patience, expire, and arrive faster as the shift runs on.
    for (let i = world.orders.length - 1; i >= 0; i -= 1) {
      const order = world.orders[i];
      order.patience -= dt;
      if (order.fresh > 0) order.fresh = Math.max(0, order.fresh - dt * 3);
      if (order.patience <= 0) {
        order.patience = 0;
        world.orders.splice(i, 1);
        world.stats.expired += 1;
        world.stats.streak = 0;
        world.stats.comboTimer = 0;
        world.say(`${order.dish} order expired!`);
        emit('expire');
        if (world.stats.expired >= ORDER.maxExpired) {
          world.status = 'lost';
          emit('over');
          return;
        }
      }
    }

    world.spawnIn -= dt;
    if (world.spawnIn <= 0 && world.orders.length < ORDER.maxActive) {
      spawnOrder();
      const gap = Math.max(ORDER.minInterval, ORDER.baseInterval - world.elapsed * ORDER.intervalDropPerSec);
      world.spawnIn = gap * (0.75 + world.rng.next() * 0.5);
    } else if (world.spawnIn <= 0) {
      world.spawnIn = 0.6;
    }

    if (world.remaining <= 0) {
      world.status = 'won';
      emit('over');
    }
  };

  /** The shift's tally for the end screens. */
  world.summary = () => ({
    coins: world.stats.coins,
    served: world.stats.served,
    expired: world.stats.expired,
    bestCombo: world.stats.bestCombo,
    tips: world.stats.tips,
    status: world.status,
  });

  return world;
}
