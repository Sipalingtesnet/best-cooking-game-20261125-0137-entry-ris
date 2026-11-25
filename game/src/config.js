// Dapur Nusa: Rush Hour Kitchen — configuration
// All tuning values, recipes, dishes, prices, timings and colours live here.

export const W = 1280;
export const H = 720;

// Palette — warm warung-kitchen look.
export const COL = {
  bg: '#2b1d16',          // deep warm brown background
  wall: '#3a2a1e',
  floor: '#5a3a26',
  floorDark: '#4a2f1e',
  counter: '#8a5a33',     // wood counter
  counterTop: '#a06a3c',
  counterEdge: '#6e4526',
  teal: '#1f7a6d',        // accent teal
  tealLight: '#2fa08f',
  cream: '#f4e6c8',       // cream text
  creamDark: '#d9c69a',
  terracotta: '#c96f3a',
  terracottaDark: '#a8552a',
  red: '#c0392b',
  green: '#4c9a4a',
  white: '#ffffff',
  black: '#1a120c',
  gold: '#e8b93a',
  smoke: 'rgba(120,120,120,0.5)',
  shadow: 'rgba(0,0,0,0.35)',
};

// Ingredient definitions.
// Each ingredient has a name, colour, and a prep type: 'chop' (chopping board) or 'cook' (wok).
export const INGREDIENTS = {
  rice:    { name: 'Rice',    color: '#f2e8d0', prep: 'cook', cookTime: 3.0, burnTime: 2.2, label: 'Rice' },
  noodles: { name: 'Noodles', color: '#e8d9a8', prep: 'cook', cookTime: 3.0, burnTime: 2.2, label: 'Noodles' },
  chicken: { name: 'Chicken', color: '#d9a06a', prep: 'chop', chopTime: 2.0, label: 'Chicken' },
  egg:     { name: 'Egg',     color: '#f4d35a', prep: 'cook', cookTime: 2.2, burnTime: 2.0, label: 'Egg' },
  greens:  { name: 'Greens',  color: '#5fae4a', prep: 'chop', chopTime: 1.6, label: 'Greens' },
  sauce:   { name: 'Chilli Sauce', color: '#b33a2a', prep: 'none', label: 'Sauce' },
};

// Recipes: each dish is a set of required components (ingredient keys).
// The dish is assembled on the plating counter from its cooked/chopped components.
export const DISHES = {
  'Nasi Goreng': { components: ['rice', 'egg', 'sauce'], price: 12, icon: 'rice' },
  'Mie Goreng':  { components: ['noodles', 'chicken', 'greens'], price: 14, icon: 'noodles' },
  'Sate Ayam':   { components: ['chicken', 'sauce'], price: 10, icon: 'chicken' },
  'Gado-Gado':   { components: ['greens', 'egg', 'sauce'], price: 11, icon: 'greens' },
};

// Order generation.
export const ORDER = {
  baseInterval: 12,       // seconds between orders at shift start
  minInterval: 5.0,       // fastest interval
  intervalDropPerSec: 0.025, // how much interval shrinks per second of shift
  patienceBase: 34,       // base patience seconds
  patienceMin: 15,
  patienceDropPerSec: 0.055,
  maxActive: 4,           // max orders on board
  maxExpired: 3,          // expired orders before shift over
};

// Shift length in seconds.
export const SHIFT_LENGTH = 180; // 3 minutes

// Player movement speed (px/s).
export const PLAYER_SPEED = 330;

// Combo: consecutive serves within this window multiply score.
export const COMBO_WINDOW = 6; // seconds
export const COMBO_MULT = 0.25; // each combo level adds 25%

// Station positions (centres of the drawn station furniture).
export const STATIONS = {
  crates:  { x: 130, y: 400 },   // ingredient crate shelf (six crates stacked)
  board:   { x: 430, y: 236 },   // chopping board
  wok:     { x: 632, y: 236 },   // wok stove
  plating: { x: 836, y: 236 },   // plating counter
  serving: { x: 1068, y: 236 },  // serving window
};

// Where the cook stands to use a station: the front of its counter.
export const STAND = {
  board:   { x: 430, y: 372 },
  wok:     { x: 632, y: 372 },
  plating: { x: 836, y: 372 },
  serving: { x: 1068, y: 372 },
  crates:  { x: 300, y: 400 },
};

// How close the cook must stand to use something.
export const REACH = 132;

// The cook's play area (kept clear of the counters and the crate shelf).
export const FLOOR = { x0: 250, y0: 330, x1: 1240, y1: 682 };

export const PLAYER_START = { x: 660, y: 560 };

// Crate shelf: six crates in one column, top to bottom.
export const CRATES = [
  { key: 'rice',    x: 130, y: 208 },
  { key: 'noodles', x: 130, y: 280 },
  { key: 'chicken', x: 130, y: 352 },
  { key: 'egg',     x: 130, y: 424 },
  { key: 'greens',  x: 130, y: 496 },
  { key: 'sauce',   x: 130, y: 568 },
];
export const CRATE_SIZE = { w: 152, h: 64 };

// Order board height (the tickets sit across the top of the screen).
export const BOARD_H = 148;
