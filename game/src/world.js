// The game state and its one step: spawning, walking, burning, oil, hull,
// score and combo, waves and upgrades. The world owns no input and no
// drawing: main.js feeds it controls, render.js paints what it holds.
// Everything random comes from the seeded generator, so the same seed and
// the same controls always play the same game.

import { BEAM, COLORS, COMBO, FIELD, HULL, LIGHTHOUSE, OIL, PULSE, TOTAL_WAVES, WAVES } from './config.js';
import { damageEnemy, emberCountFor, spawnEnemy, splitEnemy, spreadAngle, walkEnemy } from './enemies.js';
import { applyUpgrade, createModifiers, rollUpgradeChoices } from './upgrades.js';
import { hasNextWave, waveBanner, waveComposition } from './waves.js';
import { burst, createEffects, floatText, mote, ring, stepEffects } from './particles.js';

export const EVENT_KILL = 1;
export const EVENT_HURT = 2;
export const EVENT_WAVE_CLEAR = 4;
export const EVENT_WAVE_START = 8;
export const EVENT_OVER = 16;
export const EVENT_WIN = 32;
export const EVENT_PICKUP = 64;
export const EVENT_PULSE = 128;
export const EVENT_UPGRADE = 256;
export const EVENT_BOSS = 512;

const EMBER_LIFE = 6;
const BOSS_MINION_INTERVAL = 8;
const MAX_ENEMIES = 42;

export function createWorld(random) {
  const state = {};
  reset(false);

  function reset(attract) {
    state.time = 0;
    state.attract = attract;
    state.phase = attract ? 'attract' : 'breather';
    state.wave = 0;
    state.score = 0;
    state.kills = 0;
    state.combo = 0;
    state.comboTimer = 0;
    state.bestCombo = 0;
    state.oil = OIL.max;
    state.oilMax = OIL.max;
    state.hp = HULL.max;
    state.hpMax = HULL.max;
    state.aimAngle = -Math.PI / 2;
    state.beamOn = false;
    state.beamLocked = false;
    state.enemies = [];
    state.embers = [];
    state.effects = createEffects();
    state.spawnQueue = [];
    state.spawnTimer = 0;
    state.lastSpawnAngle = 0;
    state.modifiers = createModifiers();
    state.upgradesTaken = [];
    state.choices = [];
    state.pulseCooldown = 0;
    state.breatherTimer = attract ? 0 : WAVES.breatherSeconds;
    state.banner = attract ? null : { title: 'LUMENFALL', sub: 'The night is coming. Keep the light burning.', timer: 3 };
    state.shake = 0;
    state.hurtFlash = 0;
    state.boss = null;
    state.stats = { shotsBurned: 0, wavesCleared: 0 };
    if (attract) {
      for (let i = 0; i < 7; i += 1) {
        const wisp = spawnEnemy(i % 3 === 0 ? 'skitter' : 'shade', (i / 7) * Math.PI * 2, 1, random, 250 + random() * 190);
        wisp.ambient = true;
        wisp.orbitRadius = Math.hypot(wisp.x - LIGHTHOUSE.x, wisp.y - LIGHTHOUSE.y);
        wisp.orbitAngle = Math.atan2(wisp.y - LIGHTHOUSE.y, wisp.x - LIGHTHOUSE.x);
        state.enemies.push(wisp);
      }
      state.beamOn = true;
    }
  }

  /** The beam's cone angles: one, or two split 14 degrees apart. */
  function beamAngles() {
    if (state.modifiers.beamCount > 1) return [state.aimAngle - 0.245, state.aimAngle + 0.245];
    return [state.aimAngle];
  }

  function beamRange() {
    return BEAM.range * state.modifiers.beamRange;
  }

  function beamHalfAngle() {
    return BEAM.halfAngle * state.modifiers.beamWidth;
  }

  /** True when the point sits inside any live beam cone. `radius` widens the
      cone by the target's own size, so big shadows are easier to catch. */
  function inBeam(x, y, radius = 18) {
    const dx = x - LIGHTHOUSE.x;
    const dy = y - LIGHTHOUSE.y;
    const distance = Math.hypot(dx, dy);
    if (distance > beamRange()) return false;
    const angle = Math.atan2(dy, dx);
    return beamAngles().some((beamAngle) => {
      let diff = Math.abs(angle - beamAngle) % (Math.PI * 2);
      if (diff > Math.PI) diff = Math.PI * 2 - diff;
      return diff < beamHalfAngle() + Math.atan2(radius, Math.max(60, distance));
    });
  }

  function killEnemy(enemy, events) {
    enemy.dead = true;
    state.kills += 1;
    state.combo += 1;
    state.comboTimer = COMBO.windowSeconds;
    const multiplier = Math.min(COMBO.maxMultiplier, 1 + Math.floor(state.combo / 3));
    state.bestCombo = Math.max(state.bestCombo, state.combo);
    const gained = enemy.score * multiplier;
    state.score += gained;
    floatText(state.effects, enemy.x, enemy.y - enemy.radius, `+${gained}`, multiplier > 1 ? COLORS.gold : COLORS.text, multiplier > 1 ? 24 : 19);
    burst(state.effects, enemy.x, enemy.y, enemy.kind === 'boss' ? COLORS.boss : COLORS.ember, enemy.kind === 'boss' ? 46 : 14, 170, random);
    if (enemy.kind === 'splitter') {
      for (const mini of splitEnemy(enemy, state.wave, random)) state.enemies.push(mini);
    }
    const embers = emberCountFor(enemy, random);
    for (let i = 0; i < embers; i += 1) {
      state.embers.push({
        x: enemy.x + (random() - 0.5) * 24,
        y: enemy.y + (random() - 0.5) * 24,
        vx: (random() - 0.5) * 40,
        vy: (random() - 0.5) * 40,
        life: EMBER_LIFE,
      });
    }
    if (state.modifiers.siphon > 0) state.oil = Math.min(state.oilMax, state.oil + state.modifiers.siphon);
    if (enemy.kind === 'boss') {
      state.boss = null;
      state.shake = Math.min(16, state.shake + 10);
      ring(state.effects, enemy.x, enemy.y, COLORS.boss, 260, 0.6);
      floatText(state.effects, enemy.x, enemy.y - 60, 'BOSS DOWN', COLORS.boss, 34);
    }
    return events | EVENT_KILL;
  }

  function startWave(events) {
    state.wave += 1;
    state.spawnQueue = waveComposition(state.wave, random);
    state.spawnTimer = 0.4;
    state.phase = 'fighting';
    state.banner = { ...waveBanner(state.wave), timer: 2.6 };
    return events | EVENT_WAVE_START;
  }

  function beginUpgradeChoice(events) {
    state.choices = rollUpgradeChoices(state.wave, state.upgradesTaken, random);
    state.phase = 'upgrade';
    state.beamOn = false;
    // Clearing a wave lets the keeper catch a breath: a little hull patched,
    // a little oil poured back, before the next choice is made.
    state.hp = Math.min(state.hpMax, state.hp + 8);
    state.oil = Math.min(state.oilMax, state.oil + 15);
    return events | EVENT_UPGRADE;
  }

  /** Take upgrade `index` from the current choice and count down to the next wave. */
  function chooseUpgrade(index) {
    const choice = state.choices[index];
    if (!choice || state.phase !== 'upgrade') return false;
    applyUpgrade(state.modifiers, choice.id);
    state.upgradesTaken.push(choice.id);
    state.oilMax = OIL.max + state.modifiers.oilMax;
    state.oil = Math.min(state.oilMax, state.oil + state.modifiers.oilRefill);
    state.modifiers.oilRefill = 0;
    state.hpMax = HULL.max + state.modifiers.hullMax;
    state.hp = Math.min(state.hpMax, state.hp + state.modifiers.hullRepair);
    state.modifiers.hullRepair = 0;
    state.choices = [];
    state.phase = 'breather';
    state.breatherTimer = WAVES.breatherSeconds;
    state.banner = { title: `WAVE ${state.wave + 1} INCOMING`, sub: 'Hold the light.', timer: 2.2 };
    return true;
  }

  function firePulse(events) {
    if (state.modifiers.pulseLevel < 1 || state.pulseCooldown > 0) return events;
    const level = state.modifiers.pulseLevel;
    const damage = PULSE.damage * (1 + 0.5 * (level - 1));
    state.pulseCooldown = PULSE.cooldownSeconds * Math.pow(0.85, level - 1);
    ring(state.effects, LIGHTHOUSE.x, LIGHTHOUSE.y, COLORS.beamCore, PULSE.radius, 0.5);
    state.shake = Math.min(14, state.shake + 6);
    for (const enemy of state.enemies) {
      const distance = Math.hypot(enemy.x - LIGHTHOUSE.x, enemy.y - LIGHTHOUSE.y);
      if (distance > PULSE.radius + enemy.radius) continue;
      const angle = Math.atan2(enemy.y - LIGHTHOUSE.y, enemy.x - LIGHTHOUSE.x);
      enemy.x += Math.cos(angle) * PULSE.knockback * 0.28;
      enemy.y += Math.sin(angle) * PULSE.knockback * 0.28;
      if (damageEnemy(enemy, damage)) events = killEnemy(enemy, events);
    }
    return events | EVENT_PULSE;
  }

  function step(dt, controls) {
    let events = 0;
    state.time += dt;
    if (state.shake > 0) state.shake *= Math.exp(-5.5 * dt);
    if (state.hurtFlash > 0) state.hurtFlash -= dt;
    if (state.banner && state.banner.timer > 0) state.banner.timer -= dt;
    if (state.pulseCooldown > 0) state.pulseCooldown -= dt;
    stepEffects(state.effects, dt);

    if (state.attract) {
      state.aimAngle += 0.22 * dt;
      for (const wisp of state.enemies) {
        wisp.orbitAngle += 0.1 * dt * (wisp.kind === 'skitter' ? 1.6 : 1);
        wisp.x = LIGHTHOUSE.x + Math.cos(wisp.orbitAngle) * wisp.orbitRadius;
        wisp.y = LIGHTHOUSE.y + Math.sin(wisp.orbitAngle) * wisp.orbitRadius * 0.82;
      }
      if (random() < 0.1) mote(state.effects, LIGHTHOUSE.x + (random() - 0.5) * 90, LIGHTHOUSE.y - 40, COLORS.lampGlow, random);
      return events;
    }

    if (state.phase === 'upgrade' || state.phase === 'won' || state.phase === 'lost') {
      for (const enemy of state.enemies) walkEnemy(enemy, dt * 0.25, state.time);
      return events;
    }

    state.aimAngle = controls.aim;
    const wantBeam = controls.beam && !state.beamLocked && state.oil > 0;
    state.beamOn = wantBeam && state.phase === 'fighting';
    if (state.beamOn) {
      state.oil -= BEAM.drainPerSecond * dt;
      state.stats.shotsBurned += dt;
      if (state.oil <= 0) {
        state.oil = 0;
        state.beamLocked = true;
        state.beamOn = false;
      }
    } else {
      state.oil = Math.min(state.oilMax, state.oil + OIL.regenPerSecond * state.modifiers.oilRegen * dt);
      if (state.beamLocked && state.oil >= BEAM.rearmOil) state.beamLocked = false;
    }
    if (controls.pulse && state.phase === 'fighting') events = firePulse(events);

    if (state.comboTimer > 0) {
      state.comboTimer -= dt;
      if (state.comboTimer <= 0) state.combo = 0;
    }

    if (state.phase === 'breather') {
      state.breatherTimer -= dt;
      if (state.breatherTimer <= 0) events = startWave(events);
    }

    if (state.phase === 'fighting') {
      if (state.spawnQueue.length > 0) {
        state.spawnTimer -= dt;
        if (state.spawnTimer <= 0 && state.enemies.length < MAX_ENEMIES) {
          const next = state.spawnQueue.shift();
          state.lastSpawnAngle = spreadAngle(random, state.lastSpawnAngle);
          const enemy = spawnEnemy(next.kind, state.lastSpawnAngle, state.wave, random, 640);
          state.enemies.push(enemy);
          if (next.kind === 'boss') {
            state.boss = enemy;
            events |= EVENT_BOSS;
            state.banner = { title: 'THE HOLLOW KING', sub: 'Burn it down before it reaches the light.', timer: 3 };
          }
          state.spawnTimer = next.delay;
        }
      }

      for (const enemy of state.enemies) {
        if (enemy.dead) continue;
        if (enemy.kind === 'boss') {
          enemy.spawnTimer -= dt;
          if (enemy.spawnTimer <= 0 && state.enemies.length < MAX_ENEMIES) {
            enemy.spawnTimer = BOSS_MINION_INTERVAL;
            for (let i = 0; i < 2; i += 1) {
              const minion = spawnEnemy('skitter', random() * Math.PI * 2, state.wave, random, 0);
              minion.x = enemy.x + (random() - 0.5) * 70;
              minion.y = enemy.y + (random() - 0.5) * 70;
              state.enemies.push(minion);
            }
          }
        }
        const distance = walkEnemy(enemy, dt, state.time);
        if (distance < LIGHTHOUSE.strikeRadius) {
          enemy.struck = true;
          enemy.dead = true;
          state.hp -= enemy.damage;
          state.shake = Math.min(16, state.shake + 7);
          state.hurtFlash = 0.35;
          ring(state.effects, LIGHTHOUSE.x, LIGHTHOUSE.y, COLORS.danger, 190, 0.5);
          burst(state.effects, enemy.x, enemy.y, COLORS.danger, 18, 190, random);
          floatText(state.effects, LIGHTHOUSE.x, LIGHTHOUSE.y - 110, `-${enemy.damage} HULL`, COLORS.danger, 24);
          events |= EVENT_HURT;
          if (enemy.kind === 'boss') state.boss = null;
          if (state.hp <= 0) {
            state.hp = 0;
            state.phase = 'lost';
            state.beamOn = false;
            return events | EVENT_OVER;
          }
        }
      }

      if (state.beamOn) {
        const damage = BEAM.dps * state.modifiers.beamDamage * dt;
        for (const enemy of state.enemies) {
          if (enemy.dead) continue;
          if (!inBeam(enemy.x, enemy.y, enemy.radius)) continue;
          enemy.burning = 0.12;
          if (random() < 0.25) mote(state.effects, enemy.x, enemy.y - enemy.radius, COLORS.ember, random);
          if (damageEnemy(enemy, damage)) events = killEnemy(enemy, events);
        }
      }
      for (const enemy of state.enemies) {
        if (enemy.burning > 0) enemy.burning -= dt;
      }
      state.enemies = state.enemies.filter((enemy) => !enemy.dead);

      if (state.spawnQueue.length === 0 && state.enemies.length === 0) {
        state.stats.wavesCleared = state.wave;
        if (!hasNextWave(state.wave)) {
          state.phase = 'won';
          state.beamOn = false;
          return events | EVENT_WIN;
        }
        events = beginUpgradeChoice(events) | EVENT_WAVE_CLEAR;
      }
    }

    for (let i = state.embers.length - 1; i >= 0; i -= 1) {
      const ember = state.embers[i];
      ember.life -= dt;
      const dx = LIGHTHOUSE.x - ember.x;
      const dy = LIGHTHOUSE.y - ember.y;
      const distance = Math.hypot(dx, dy) || 1;
      const pull = 60 * state.modifiers.emberMagnet;
      ember.vx += (dx / distance) * pull * dt * 3;
      ember.vy += (dy / distance) * pull * dt * 3;
      ember.vx *= 1 - Math.min(1, 2.2 * dt);
      ember.vy *= 1 - Math.min(1, 2.2 * dt);
      ember.x += ember.vx * dt;
      ember.y += ember.vy * dt;
      const collected = distance < LIGHTHOUSE.strikeRadius || (state.beamOn && inBeam(ember.x, ember.y));
      if (collected) {
        state.oil = Math.min(state.oilMax, state.oil + OIL.emberRefund);
        floatText(state.effects, ember.x, ember.y - 10, `+${OIL.emberRefund} OIL`, COLORS.oil, 17);
        burst(state.effects, ember.x, ember.y, COLORS.ember, 6, 90, random);
        state.embers.splice(i, 1);
        events |= EVENT_PICKUP;
      } else if (ember.life <= 0) {
        state.embers.splice(i, 1);
      }
    }

    return events;
  }

  /** Enemies still to face this wave: waiting to spawn plus alive. */
  function enemiesLeft() {
    return state.spawnQueue.length + state.enemies.length;
  }

  return { state, reset, step, chooseUpgrade, beamAngles, beamRange, beamHalfAngle, inBeam, enemiesLeft };
}
