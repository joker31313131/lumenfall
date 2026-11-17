// Staging for screenshots: the real game, played forward by a simple
// autopilot under a fixed seed, frozen at the chosen moment. Nothing here
// fakes a scene — the title drifts, the fight burns, the upgrade choice is
// rolled by the same rules, and victory and defeat are real outcomes of
// playing. The browser harness calls stageShot with ?shot=<scene> and the
// capture script waits for window.__shotReady.

import { LIGHTHOUSE, PULSE } from './config.js';

export const SHOT_SEEDS = { title: 11, play: 3, upgrade: 7, victory: 99, defeat: 5 };

const UPGRADE_PRIORITY = ['hot', 'split', 'wide', 'reach', 'tank', 'wick', 'siphon', 'pulse', 'magnet', 'hull'];

/** Aim at the shadow nearest the lighthouse; burn while one is in range. */
export function autopilotControls(world) {
  const state = world.state;
  let target = null;
  let nearest = Infinity;
  for (const enemy of state.enemies) {
    const distance = Math.hypot(enemy.x - LIGHTHOUSE.x, enemy.y - LIGHTHOUSE.y);
    if (distance < nearest) {
      nearest = distance;
      target = enemy;
    }
  }
  const aim = target ? Math.atan2(target.y - LIGHTHOUSE.y, target.x - LIGHTHOUSE.x) : state.time * 0.4;
  const beam = Boolean(target) && nearest < world.beamRange() * 0.98 && state.oil > 14 && !state.beamLocked;
  let pulse = false;
  if (state.modifiers.pulseLevel > 0 && state.pulseCooldown <= 0) {
    let near = 0;
    for (const enemy of state.enemies) {
      if (Math.hypot(enemy.x - LIGHTHOUSE.x, enemy.y - LIGHTHOUSE.y) < PULSE.radius) near += 1;
    }
    pulse = near >= 2;
  }
  return { aim, beam, pulse };
}

/** The autopilot's upgrade taste: damage first, survival second. */
export function autopilotPick(state) {
  let bestIndex = 0;
  let bestRank = Infinity;
  state.choices.forEach((choice, index) => {
    const rank = UPGRADE_PRIORITY.indexOf(choice.id);
    if (rank !== -1 && rank < bestRank) {
      bestRank = rank;
      bestIndex = index;
    }
  });
  return bestIndex;
}

/**
 * How photogenic a fighting frame is: a crowd on screen, the beam biting,
 * the boss in view, the fight close to the light, kill feedback mid-air.
 * Frames that are not a live fight score -1 and are never picked.
 */
function playFrameScore(world) {
  const state = world.state;
  if (state.phase !== 'fighting' || !state.beamOn) return -1;
  let visible = 0;
  let burning = 0;
  let nearest = Infinity;
  for (const enemy of state.enemies) {
    if (enemy.x > 20 && enemy.x < 1260 && enemy.y > 20 && enemy.y < 700) visible += 1;
    if (enemy.burning > 0.05) burning += 1;
    const distance = Math.hypot(enemy.x - LIGHTHOUSE.x, enemy.y - LIGHTHOUSE.y);
    if (distance < nearest) nearest = distance;
  }
  if (visible < 3 || burning < 1) return -1;
  const boss = state.enemies.some((enemy) => enemy.kind === 'boss');
  return (
    visible * 10 +
    burning * 25 +
    (boss ? 60 : 0) +
    state.wave * 5 +
    (nearest < 300 ? 20 : 0) +
    Math.min(10, state.effects.texts.length * 5)
  );
}

/**
 * The cover frame: play the run forward once, remember the single most
 * photogenic fighting frame, then restore the world to exactly that frame.
 * The snapshot is plain data, so the restored frame draws identically.
 */
function stagePlay(world) {
  const dt = 1 / 60;
  const state = world.state;
  let best = null;
  let bestScore = -1;
  const cap = 60 * 60 * 8;
  let steps = 0;
  while (steps < cap) {
    if (state.phase === 'upgrade') {
      world.chooseUpgrade(autopilotPick(state));
      continue;
    }
    if (state.phase === 'won' || state.phase === 'lost' || state.wave > 6) break;
    world.step(dt, autopilotControls(world));
    steps += 1;
    const score = playFrameScore(world);
    if (score > bestScore) {
      bestScore = score;
      best = structuredClone(state);
    }
  }
  if (best) Object.assign(state, best);
  return 'play';
}

/**
 * Play `world` forward at fixed 1/60 s steps until `scene` is reached.
 * Returns the screen name to show: 'title', 'play', 'upgrade', 'win' or 'over'.
 * The world must already be reset: attract mode for 'title', a fresh run else.
 */
export function stageShot(world, scene) {
  const dt = 1 / 60;
  const state = world.state;
  if (scene === 'title') {
    for (let i = 0; i < 150; i += 1) world.step(dt, { aim: 0, beam: false, pulse: false });
    return 'title';
  }
  if (scene === 'play') return stagePlay(world);
  let guard = 0;
  const maxSteps = 60 * 60 * 10;
  while (guard < maxSteps) {
    guard += 1;
    if (state.phase === 'upgrade') {
      if (scene === 'upgrade') {
        // Let the last kill's floating texts fade fully (their life is
        // 0.9 s = 54 frames), so the choice is photographed clean.
        for (let i = 0; i < 60; i += 1) world.step(dt, { aim: 0, beam: false, pulse: false });
        return 'upgrade';
      }
      world.chooseUpgrade(autopilotPick(state));
      continue;
    }
    if (state.phase === 'won' || state.phase === 'lost') {
      // Let the hurt flash and the last floating texts fade, so the end
      // screen is photographed clean instead of mid-impact.
      for (let i = 0; i < 60; i += 1) world.step(dt, { aim: 0, beam: false, pulse: false });
      return state.phase === 'won' ? 'win' : 'over';
    }
    const controls = scene === 'defeat'
      ? { aim: state.time * 0.5, beam: false, pulse: false }
      : autopilotControls(world);
    world.step(dt, controls);
  }
  return 'play';
}
