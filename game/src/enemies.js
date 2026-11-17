// The shadow kinds: what each one is, how fast and hard it is, and how it
// walks. Every enemy drifts toward the lighthouse with its own wobble, so a
// wave never marches in a straight line; the boss also sheds skitterers.

import { COLORS, LIGHTHOUSE, WAVES } from './config.js';
import { randomInt } from './random.js';

/** kind -> base stats. Health and speed grow with the wave (see scaleForWave). */
export const ENEMY_TYPES = {
  shade: { hp: 30, speed: 34, radius: 19, damage: 8, score: 10, color: COLORS.shade, wobble: 0.55, emberChance: 0.55 },
  skitter: { hp: 16, speed: 74, radius: 13, damage: 5, score: 15, color: COLORS.skitter, wobble: 1.5, emberChance: 0.35 },
  hulk: { hp: 150, speed: 20, radius: 30, damage: 20, score: 40, color: COLORS.hulk, wobble: 0.2, emberChance: 1 },
  splitter: { hp: 55, speed: 30, radius: 21, damage: 10, score: 20, color: COLORS.splitter, wobble: 0.5, emberChance: 0.6 },
  mini: { hp: 12, speed: 62, radius: 10, damage: 4, score: 5, color: COLORS.mini, wobble: 1.2, emberChance: 0.2 },
  shielded: { hp: 60, shield: 45, speed: 26, radius: 20, damage: 12, score: 30, color: COLORS.shielded, wobble: 0.4, emberChance: 0.7 },
  boss: { hp: 780, speed: 14, radius: 48, damage: 40, score: 500, color: COLORS.boss, wobble: 0.15, emberChance: 1 },
};

/** The wave on which each kind first appears. */
export const UNLOCK_WAVE = { shade: 1, skitter: 1, hulk: 3, splitter: 4, shielded: 5, boss: 5 };

/** Health and speed multipliers for a wave number. */
export function scaleForWave(wave) {
  return {
    hp: 1 + WAVES.hpGrowthPerWave * (wave - 1),
    speed: Math.min(WAVES.maxSpeedGrowth, 1 + WAVES.speedGrowthPerWave * (wave - 1)),
  };
}

/** A fresh enemy of `kind` at the field's edge, at `angle` around the lighthouse. */
export function spawnEnemy(kind, angle, wave, random, spawnRadius) {
  const type = ENEMY_TYPES[kind];
  const scale = scaleForWave(wave);
  const radius = spawnRadius ?? 640;
  return {
    kind,
    x: LIGHTHOUSE.x + Math.cos(angle) * radius,
    y: LIGHTHOUSE.y + Math.sin(angle) * radius,
    hp: type.hp * scale.hp,
    maxHp: type.hp * scale.hp,
    shield: (type.shield ?? 0) * scale.hp,
    maxShield: (type.shield ?? 0) * scale.hp,
    speed: type.speed * scale.speed,
    radius: type.radius,
    damage: type.damage,
    score: type.score,
    wobblePhase: random() * Math.PI * 2,
    wobble: type.wobble,
    flash: 0,
    spawnTimer: kind === 'boss' ? 6 : 0,
    dead: false,
    struck: false,
  };
}

/** Two minis born where a splitter died, flung sideways from its path. */
export function splitEnemy(enemy, wave, random) {
  const minis = [];
  for (let i = 0; i < 2; i += 1) {
    const mini = spawnEnemy('mini', 0, wave, random, 0);
    const angle = Math.atan2(enemy.y - LIGHTHOUSE.y, enemy.x - LIGHTHOUSE.x) + (i === 0 ? 0.9 : -0.9);
    mini.x = enemy.x + Math.cos(angle) * 22;
    mini.y = enemy.y + Math.sin(angle) * 22;
    minis.push(mini);
  }
  return minis;
}

/** Walk one enemy toward the lighthouse for `dt`, wobbling as it goes. */
export function walkEnemy(enemy, dt, time) {
  const dx = LIGHTHOUSE.x - enemy.x;
  const dy = LIGHTHOUSE.y - enemy.y;
  const distance = Math.hypot(dx, dy) || 1;
  const sway = Math.sin(time * 2.2 + enemy.wobblePhase) * enemy.wobble;
  const angle = Math.atan2(dy, dx) + sway * 0.35;
  enemy.x += Math.cos(angle) * enemy.speed * dt;
  enemy.y += Math.sin(angle) * enemy.speed * dt;
  if (enemy.flash > 0) enemy.flash -= dt;
  return Math.hypot(LIGHTHOUSE.x - enemy.x, LIGHTHOUSE.y - enemy.y);
}

/**
 * Burn an enemy for `damage`: the shield soaks it first, then health.
 * Returns true when the enemy dies from this hit.
 */
export function damageEnemy(enemy, damage) {
  let left = damage;
  if (enemy.shield > 0) {
    const soaked = Math.min(enemy.shield, left);
    enemy.shield -= soaked;
    left -= soaked;
  }
  enemy.hp -= left;
  enemy.flash = 0.09;
  if (enemy.hp <= 0) {
    enemy.dead = true;
    return true;
  }
  return false;
}

/** A random edge angle, kept away from `avoidAngle` so spawns spread out. */
export function spreadAngle(random, avoidAngle) {
  let angle = random() * Math.PI * 2;
  if (avoidAngle !== undefined) {
    let diff = Math.abs(angle - avoidAngle) % (Math.PI * 2);
    if (diff > Math.PI) diff = Math.PI * 2 - diff;
    if (diff < 0.7) angle = avoidAngle + 0.7 + random() * (Math.PI * 2 - 1.4);
  }
  return angle;
}

/** How many embers a dead enemy drops. */
export function emberCountFor(enemy, random) {
  const type = ENEMY_TYPES[enemy.kind];
  if (enemy.kind === 'boss') return 5;
  if (enemy.kind === 'hulk') return 2;
  return random() < type.emberChance ? 1 : 0;
}

/** A random integer in [min, max] — kept here so waves read without importing random twice. */
export function pickCount(random, min, max) {
  return randomInt(random, min, max);
}
