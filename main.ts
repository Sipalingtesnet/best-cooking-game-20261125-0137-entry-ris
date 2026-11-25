// Dapur Nusa: Rush Hour Kitchen — the hand-in program.
//
// The game itself is game/: plain static files (index.html plus the ES modules under src/) that a
// desktop browser loads offline, with every ingredient, recipe, station and colour configured in
// src/config.js, the kitchen's rules in src/world.js, the cooking bot that stages the screenshots
// in src/bot.js, and all drawing in src/render.js. There is no build step and nothing is fetched
// over the network: sounds are synthesised with WebAudio and the art is drawn on one canvas.
//
// This program copies game/ and screenshots/ beside it into the output directory (/output in the
// grader, else $MAKEFUN_OUTPUT_DIR) and writes dossier.json there with buildDossier from the
// vendored make.fun library, so the judge's summary is byte for byte what the scorer computes.
//
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
//
// Serve the kitchen to play it: node serve.ts   (http://localhost:8080)

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repo = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });

// game/ is the playable entry: copy it whole, tree and all.
cpSync(join(repo, 'game'), join(out, 'game'), { recursive: true });

// screenshots/: the four real renders (cover first by name, then the assembly, the serve and the
// rush). The scorer accepts 3 or 4 images of at most 256 KiB each.
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(repo, 'screenshots'))) {
  cpSync(join(repo, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

// The dossier: the source text and the screenshots, built by the kit's own library with the
// scorer's caps, so the bytes match the gate's rebuild exactly (two runs write the same bytes).
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);

console.log(`Dapur Nusa handed in at ${out}: game/ + screenshots/ + dossier.json`);
