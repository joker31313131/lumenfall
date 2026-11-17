// The wave director: what each wave sends, in what order, and when the next
// one begins. Waves grow in count and mix; waves 5 and 10 send a boss with
// escorts. The director only hands out spawn orders; the world runs them.

import { BOSS_WAVES, TOTAL_WAVES, WAVES } from './config.js';
import { UNLOCK_WAVE } from './enemies.js';
import { randomPick } from './random.js';

/** Kinds the director may send on `wave`, weighted toward the newly unlocked. */
function kindPool(wave) {
  const pool = ['shade', 'shade', 'skitter'];
  if (wave >= UNLOCK_WAVE.hulk) pool.push('hulk', 'shade');
  if (wave >= UNLOCK_WAVE.splitter) pool.push('splitter', 'skitter');
  if (wave >= UNLOCK_WAVE.shielded) pool.push('shielded', 'shade');
  return pool;
}

/**
 * The spawn list for a wave: one entry per enemy, each with its kind and the
 * delay after the previous spawn. Boss waves lead with escorts, then the boss.
 */
export function waveComposition(wave, random) {
  const count = 5 + wave * 2;
  const pool = kindPool(wave);
  const entries = [];
  const isBossWave = BOSS_WAVES.includes(wave);
  const interval = Math.max(
    WAVES.spawnIntervalEnd,
    WAVES.spawnIntervalStart - (WAVES.spawnIntervalStart - WAVES.spawnIntervalEnd) * ((wave - 1) / (TOTAL_WAVES - 1)),
  );
  for (let i = 0; i < count; i += 1) {
    entries.push({ kind: randomPick(random, pool), delay: interval * (0.7 + random() * 0.6) });
  }
  if (isBossWave) {
    entries.push({ kind: 'boss', delay: 2.2 });
    entries.push({ kind: 'skitter', delay: 1.2 });
    entries.push({ kind: 'skitter', delay: 1.2 });
  }
  return entries;
}

/** True while waves remain after `wave`. */
export function hasNextWave(wave) {
  return wave < TOTAL_WAVES;
}

/** The banner text shown as a wave begins. */
export function waveBanner(wave) {
  if (wave === TOTAL_WAVES) return { title: `FINAL WAVE ${wave}`, sub: 'The Hollow King comes for the light.' };
  if (BOSS_WAVES.includes(wave)) return { title: `WAVE ${wave}`, sub: 'Something enormous moves in the dark…' };
  return { title: `WAVE ${wave}`, sub: wave === 1 ? 'Burn the shadows before they reach the light.' : 'They come in greater numbers.' };
}
