// Lumenfall's hand-in program (Node 22, standard library only). The grader
// runs `node /bot/main.ts` with no network, a read-only /bot and an empty
// writable /output: this file copies the game and its screenshots from
// beside it into /output, then writes /output/dossier.json — the summary
// the judge reads — with the vendored make.fun library. Outside the
// grader, MAKEFUN_OUTPUT_DIR stands in for /output, so
// `mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts` shows exactly what
// the grader would receive.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const entryDir = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(outputDir, { recursive: true });
cpSync(join(entryDir, 'game'), join(outputDir, 'game'), { recursive: true });
const shotsTarget = join(outputDir, 'screenshots');
mkdirSync(shotsTarget, { recursive: true });
const shotsSource = join(entryDir, 'screenshots');
if (existsSync(shotsSource)) cpSync(shotsSource, shotsTarget, { recursive: true });

// The scorer's own caps: text_max_bytes shapes the dossier's bytes, and the
// rest refuse an entry the scorer would refuse — at most 4 screenshots,
// each at most 256 KiB; at most 993 files and 48 MiB under game/, and no
// path under game/ over 1000 bytes.
const dossier = buildDossier(outputDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
writeFileSync(join(outputDir, 'dossier.json'), dossier);
