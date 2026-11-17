// Particles, floating score texts and shockwave rings: the feedback that
// makes every burn, pickup and hit feel answered. All of them are plain
// data updated here and drawn by the renderer; counts are capped so the
// busiest fight never slows the game down.

const MAX_PARTICLES = 320;
const MAX_TEXTS = 24;

export function createEffects() {
  return { particles: [], texts: [], rings: [] };
}

/** A burst of glowing sparks at (x, y), in `color`, flying outward. */
export function burst(effects, x, y, color, count, speed, random) {
  for (let i = 0; i < count; i += 1) {
    if (effects.particles.length >= MAX_PARTICLES) return;
    const angle = random() * Math.PI * 2;
    const velocity = speed * (0.35 + random() * 0.85);
    effects.particles.push({
      x,
      y,
      vx: Math.cos(angle) * velocity,
      vy: Math.sin(angle) * velocity,
      life: 0.35 + random() * 0.4,
      maxLife: 0.75,
      size: 2 + random() * 3.5,
      color,
      drag: 3.2,
    });
  }
}

/** A slow ember mote that drifts upward, for ambience and the beam's dust. */
export function mote(effects, x, y, color, random) {
  if (effects.particles.length >= MAX_PARTICLES) return;
  effects.particles.push({
    x,
    y,
    vx: (random() - 0.5) * 14,
    vy: -12 - random() * 18,
    life: 0.8 + random() * 0.8,
    maxLife: 1.6,
    size: 1.5 + random() * 2,
    color,
    drag: 0.4,
  });
}

/** A number or word that floats up from (x, y) and fades. */
export function floatText(effects, x, y, text, color, size = 20) {
  if (effects.texts.length >= MAX_TEXTS) effects.texts.shift();
  effects.texts.push({ x, y, text, color, size, life: 0.9, maxLife: 0.9 });
}

/** An expanding ring, for the shockwave and the lighthouse taking a hit. */
export function ring(effects, x, y, color, maxRadius, seconds = 0.45) {
  effects.rings.push({ x, y, color, radius: 10, maxRadius, life: seconds, maxLife: seconds });
}

/** Advance every effect by `dt`; dead ones drop out. */
export function stepEffects(effects, dt) {
  for (let i = effects.particles.length - 1; i >= 0; i -= 1) {
    const particle = effects.particles[i];
    particle.life -= dt;
    if (particle.life <= 0) {
      effects.particles.splice(i, 1);
      continue;
    }
    const drag = 1 - Math.min(1, particle.drag * dt);
    particle.vx *= drag;
    particle.vy *= drag;
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
  }
  for (let i = effects.texts.length - 1; i >= 0; i -= 1) {
    const text = effects.texts[i];
    text.life -= dt;
    text.y -= 42 * dt;
    if (text.life <= 0) effects.texts.splice(i, 1);
  }
  for (let i = effects.rings.length - 1; i >= 0; i -= 1) {
    const ringEffect = effects.rings[i];
    ringEffect.life -= dt;
    const progress = 1 - Math.max(0, ringEffect.life / ringEffect.maxLife);
    ringEffect.radius = 10 + (ringEffect.maxRadius - 10) * progress * progress;
    if (ringEffect.life <= 0) effects.rings.splice(i, 1);
  }
}
