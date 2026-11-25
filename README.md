# Dapur Nusa: Rush Hour Kitchen

An original Indonesian street-food cooking game for one cook and one busy warung. You have three
minutes, six crates of ingredients, one chopping board, one wok, one plating counter and one
serving window. Every order that walks out hungry is a mark against the shift, and three of them
close the kitchen.

The whole kitchen is drawn on a single 1280x720 canvas in code (terracotta counters, a teal tiled
back wall, cream tickets), and every sound is synthesised with WebAudio. No image files, no audio
files, no web fonts and no network requests at all.

## How to play

Walk the cook into reach of a station, then use it. The floor prompt names what the station wants.

| Key | What it does |
| --- | --- |
| `WASD` / arrow keys | walk around the kitchen |
| `Space` | use the station you stand at (take a crate, chop, cook, plate, serve) |
| `X` | toss: empty a burning wok, scrape the board, clear the plate, drop a tray item |
| `P` / `Esc` | pause (the shift clock stops) |
| `M` | mute the kitchen |
| mouse click | walk there (a click on a station also uses it on arrival) |

A dish is never one step:

1. **Crates** (left wall): take raw ingredients — rice, noodles, chicken, egg, greens, chilli sauce.
2. **Chopping board**: chicken 2s, greens 1.6s. A ring shows the chop; the board holds the item
   until you take it, so you can walk away and come back.
3. **Wok stove**: rice and noodles 3s, egg 2.2s. The wok keeps cooking after it is ready and starts
   to burn — take it off in time or `X` to toss it.
4. **Plating counter**: one visit lays every prepped item on the plate. A ring counts the dish's
   components; a finished dish is plated as a whole.
5. **Serving window**: carry the finished plate here and it goes to the matching order.

**The four dishes** (each order names one, with its coin value and patience bar):

- Nasi Goreng — rice (wok) + egg (wok) + chilli sauce
- Mie Goreng — noodles (wok) + chicken (board) + greens (board)
- Sate Ayam — chicken (board) + chilli sauce
- Gado-Gado — greens (board) + egg (wok) + chilli sauce

**Scoring**: the dish's price, plus a tip for the patience left, times a combo multiplier for
serving again within six seconds (up to x3). Serving the wrong dish is refused, not punished;
letting a ticket run out of patience is. Orders arrive closer together and ask for the bigger
dishes as the three minutes run down.

## The kitchen's files

- `game/src/config.js` — dishes, recipes, prices, patience, station positions, colours
- `game/src/random.js` — seeded mulberry32 RNG, so a seed always gives the same shift
- `game/src/input.js` — keyboard and mouse input, held keys and one-shot presses
- `game/src/world.js` — the rules and state: orders, prep timers, the tray, the plate, the score
- `game/src/bot.js` — the small kitchen bot that stages the screenshot scenes
- `game/src/render.js` — every canvas drawing: kitchen, stations, order board, HUD, cook, food
- `game/src/shots.js` — the four deterministic screenshot scenes (`?shot=cover|assemble|serve|rush`)
- `game/src/audio.js` — WebAudio synthesis: chop, sizzle, ding, coin, burn, serve
- `game/src/main.js` — bootstrap, fixed-step loop and the title / play / paused / won / lost screens
- `main.ts` — copies `game/` and `screenshots/` to the output and writes `dossier.json`

## Run it

```bash
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts   # hand it in
node serve.ts                                        # play it at http://localhost:8080
```

`?shot=cover&seed=1` (and `assemble`, `serve`, `rush`) stages the four screenshot scenes from the
same seeded rules the game itself runs.

[![bounty](https://make.fun/badge/best-cooking-game-20261125-0137.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137)
[![rank](https://make.fun/badge/best-cooking-game-20261125-0137/Sipalingtesnet/best-cooking-game-20261125-0137-entry-ris/rank.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137)
[![reward](https://make.fun/badge/best-cooking-game-20261125-0137/Sipalingtesnet/best-cooking-game-20261125-0137-entry-ris/reward.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137)
