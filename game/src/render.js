// Everything the player sees: the night sea, the island, the lighthouse and
// its beam, the shadows, the particles, the HUD and every screen. Drawing is
// a pure function of the world state and its clock: no Math.random here, so
// a staged screenshot is the same frame every time it is taken.

import { BEAM, COLORS, COMBO, FIELD, HULL, LIGHTHOUSE, OIL, PULSE, TOTAL_WAVES } from './config.js';
import { ENEMY_TYPES } from './enemies.js';
import { createRandom } from './random.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_UPGRADE = 'upgrade';
export const SCREEN_PAUSE = 'pause';
export const SCREEN_WIN = 'win';
export const SCREEN_OVER = 'over';

const FONT = '"Trebuchet MS", "Segoe UI", system-ui, sans-serif';

/** Fixed starfield and island speckles, drawn once from a fixed seed. */
function scatter(seed, count, width, height) {
  const random = createRandom(seed);
  const points = [];
  for (let i = 0; i < count; i += 1) {
    points.push({ x: random() * width, y: random() * height, size: 0.6 + random() * 1.8, phase: random() * Math.PI * 2 });
  }
  return points;
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const stars = scatter(1234, 130, FIELD.width, FIELD.height);
  const speckles = scatter(777, 46, 280, 280);
  let scale = 1;
  let offsetX = 0;
  let offsetY = 0;
  let cardRects = [];

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.max(1, Math.round(rect.width * dpr));
    canvas.height = Math.max(1, Math.round(rect.height * dpr));
    scale = Math.min(canvas.width / FIELD.width, canvas.height / FIELD.height);
    offsetX = (canvas.width - FIELD.width * scale) / 2;
    offsetY = (canvas.height - FIELD.height * scale) / 2;
  }

  window.addEventListener('resize', resize);
  resize();

  function toLogical(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const px = (clientX - rect.left) * dpr;
    const py = (clientY - rect.top) * dpr;
    return { x: (px - offsetX) / scale, y: (py - offsetY) / scale };
  }

  function text(str, x, y, size, color, align = 'center', weight = 700) {
    ctx.font = `${weight} ${size}px ${FONT}`;
    ctx.textAlign = align;
    ctx.textBaseline = 'middle';
    ctx.fillStyle = color;
    ctx.fillText(str, x, y);
  }

  function bar(x, y, width, height, fraction, fill, back, edge) {
    const clamped = Math.max(0, Math.min(1, fraction));
    ctx.fillStyle = back;
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, height / 2);
    ctx.fill();
    if (clamped > 0) {
      ctx.fillStyle = fill;
      ctx.beginPath();
      ctx.roundRect(x, y, Math.max(height, width * clamped), height, height / 2);
      ctx.fill();
    }
    ctx.strokeStyle = edge;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, height / 2);
    ctx.stroke();
  }

  function drawBackground(time) {
    const gradient = ctx.createLinearGradient(0, 0, 0, FIELD.height);
    gradient.addColorStop(0, COLORS.skyTop);
    gradient.addColorStop(0.55, COLORS.skyBottom);
    gradient.addColorStop(1, COLORS.sea);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    for (const star of stars) {
      const twinkle = 0.45 + 0.55 * Math.sin(time * 1.4 + star.phase);
      ctx.globalAlpha = 0.25 + 0.55 * twinkle;
      ctx.fillStyle = '#dfe8ff';
      ctx.fillRect(star.x, star.y, star.size, star.size);
    }
    ctx.globalAlpha = 1;
    const moon = ctx.createRadialGradient(1120, 92, 8, 1120, 92, 90);
    moon.addColorStop(0, '#fdf6dd');
    moon.addColorStop(0.25, '#f3e6b8');
    moon.addColorStop(1, 'rgba(243,230,184,0)');
    ctx.fillStyle = moon;
    ctx.beginPath();
    ctx.arc(1120, 92, 90, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fbf3d9';
    ctx.beginPath();
    ctx.arc(1120, 92, 34, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e9dfba';
    ctx.beginPath();
    ctx.arc(1106, 80, 5, 0, Math.PI * 2);
    ctx.arc(1133, 102, 4, 0, Math.PI * 2);
    ctx.arc(1125, 72, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = COLORS.seaShimmer;
    ctx.lineWidth = 2;
    for (let i = 0; i < 9; i += 1) {
      const y = 560 + i * 18;
      const wobble = Math.sin(time * 0.9 + i * 1.7) * 14;
      ctx.globalAlpha = 0.35;
      ctx.beginPath();
      ctx.moveTo(60 + wobble, y);
      ctx.lineTo(230 + wobble, y);
      ctx.moveTo(1050 - wobble, y);
      ctx.lineTo(1220 - wobble, y);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  function drawIsland(time) {
    const { x, y } = LIGHTHOUSE;
    const glow = ctx.createRadialGradient(x, y, 40, x, y, 300);
    glow.addColorStop(0, 'rgba(255,217,122,0.10)');
    glow.addColorStop(1, 'rgba(255,217,122,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y, 300, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = COLORS.rock;
    ctx.beginPath();
    ctx.ellipse(x, y + 14, LIGHTHOUSE.islandRadius + 26, LIGHTHOUSE.islandRadius * 0.94 + 22, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = COLORS.islandEdge;
    ctx.beginPath();
    ctx.arc(x, y, LIGHTHOUSE.islandRadius + 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = COLORS.island;
    ctx.beginPath();
    ctx.arc(x, y, LIGHTHOUSE.islandRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = COLORS.islandInner;
    ctx.beginPath();
    ctx.arc(x, y, LIGHTHOUSE.islandRadius - 26, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#3a4a76';
    for (const speckle of speckles) {
      ctx.beginPath();
      ctx.arc(x - 140 + speckle.x, y - 140 + speckle.y, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = 'rgba(255,217,122,0.25)';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 10]);
    ctx.beginPath();
    ctx.arc(x, y, LIGHTHOUSE.strikeRadius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    void time;
  }

  function drawBeam(state, world) {
    if (!state.beamOn) return;
    const { x, y } = LIGHTHOUSE;
    const range = world.beamRange();
    const half = world.beamHalfAngle();
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const angle of world.beamAngles()) {
      const flicker = 0.92 + 0.08 * Math.sin(state.time * 31);
      // Wide, faint halo cone so the light feels volumetric, not cut out.
      const halo = ctx.createRadialGradient(x, y, 20, x, y, range);
      halo.addColorStop(0, `rgba(255,191,71,${0.2 * flicker})`);
      halo.addColorStop(1, 'rgba(255,191,71,0)');
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.arc(x, y, range, angle - half * 1.9, angle + half * 1.9);
      ctx.closePath();
      ctx.fill();
      // The main cone, bright at the lamp and gone at the edge of the dark.
      const gradient = ctx.createRadialGradient(x, y, 20, x, y, range);
      gradient.addColorStop(0, `rgba(255,243,196,${0.85 * flicker})`);
      gradient.addColorStop(0.55, `rgba(255,191,71,${0.4 * flicker})`);
      gradient.addColorStop(1, 'rgba(255,191,71,0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.arc(x, y, range, angle - half, angle + half);
      ctx.closePath();
      ctx.fill();
      // A hot core wedge down the middle of the cone.
      const core = ctx.createRadialGradient(x, y, 10, x, y, range * 0.8);
      core.addColorStop(0, `rgba(255,250,224,${0.75 * flicker})`);
      core.addColorStop(1, 'rgba(255,250,224,0)');
      ctx.fillStyle = core;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.arc(x, y, range * 0.8, angle - half * 0.42, angle + half * 0.42);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  /** The bright bite where the beam meets the nearest burning shadow. */
  function drawBeamImpact(state) {
    if (!state.beamOn) return;
    let target = null;
    let nearest = Infinity;
    for (const enemy of state.enemies) {
      if (enemy.burning <= 0) continue;
      const distance = Math.hypot(enemy.x - LIGHTHOUSE.x, enemy.y - LIGHTHOUSE.y);
      if (distance < nearest) {
        nearest = distance;
        target = enemy;
      }
    }
    if (!target) return;
    const flicker = 0.85 + 0.15 * Math.sin(state.time * 37);
    const radius = target.radius * 2.1;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const glow = ctx.createRadialGradient(target.x, target.y, 2, target.x, target.y, radius);
    glow.addColorStop(0, `rgba(255,250,224,${0.85 * flicker})`);
    glow.addColorStop(0.4, `rgba(255,217,122,${0.45 * flicker})`);
    glow.addColorStop(1, 'rgba(255,191,71,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(target.x, target.y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawLighthouse(state) {
    const { x, y } = LIGHTHOUSE;
    const pulse = 0.85 + 0.15 * Math.sin(state.time * 2.4);
    const glow = ctx.createRadialGradient(x, y, 6, x, y, 86);
    glow.addColorStop(0, `rgba(255,217,122,${0.75 * pulse})`);
    glow.addColorStop(1, 'rgba(255,217,122,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y, 86, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = COLORS.towerDark;
    ctx.beginPath();
    ctx.arc(x, y, 34, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = COLORS.towerLight;
    for (let i = 0; i < 8; i += 1) {
      if (i % 2 === 0) continue;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.arc(x, y, 34, (i / 8) * Math.PI * 2, ((i + 1) / 8) * Math.PI * 2);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = COLORS.towerLight;
    ctx.beginPath();
    ctx.arc(x, y, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = state.beamOn ? '#fff7dd' : COLORS.lampGlow;
    ctx.beginPath();
    ctx.arc(x, y, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fffdf4';
    ctx.beginPath();
    ctx.arc(x - 3, y - 3, 5, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawEnemy(enemy, state) {
    const type = ENEMY_TYPES[enemy.kind];
    const squash = 1 + 0.08 * Math.sin(state.time * 5 + enemy.wobblePhase);
    const burning = enemy.burning > 0;
    // A fresh hit makes the shadow flinch outward for a blink.
    const flinch = 1 + Math.max(0, enemy.flash) * 1.6;
    ctx.save();
    ctx.translate(enemy.x, enemy.y);
    ctx.scale(flinch, squash * flinch);
    const glow = ctx.createRadialGradient(0, 0, 2, 0, 0, enemy.radius * 2.4);
    glow.addColorStop(0, type.color);
    glow.addColorStop(0.55, `${type.color}aa`);
    glow.addColorStop(1, `${type.color}00`);
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, enemy.radius * 2.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = enemy.flash > 0 ? '#ffffff' : type.color;
    ctx.beginPath();
    ctx.arc(0, 0, enemy.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(10,10,26,0.55)';
    ctx.beginPath();
    ctx.arc(0, 0, enemy.radius * 0.55, 0, Math.PI * 2);
    ctx.fill();
    const look = Math.atan2(LIGHTHOUSE.y - enemy.y, LIGHTHOUSE.x - enemy.x);
    const eyeOffset = enemy.radius * 0.34;
    const eyeForward = enemy.radius * 0.22;
    ctx.fillStyle = '#fff7dd';
    for (const side of [-1, 1]) {
      const ex = Math.cos(look) * eyeForward + Math.cos(look + Math.PI / 2) * eyeOffset * side;
      const ey = Math.sin(look) * eyeForward + Math.sin(look + Math.PI / 2) * eyeOffset * side;
      ctx.beginPath();
      ctx.arc(ex, ey, Math.max(2.5, enemy.radius * 0.16), 0, Math.PI * 2);
      ctx.fill();
    }
    if (enemy.kind === 'boss') {
      ctx.fillStyle = COLORS.boss;
      for (let i = -2; i <= 2; i += 1) {
        ctx.beginPath();
        ctx.moveTo(i * 14 - 7, -enemy.radius + 6);
        ctx.lineTo(i * 14, -enemy.radius - 16);
        ctx.lineTo(i * 14 + 7, -enemy.radius + 6);
        ctx.closePath();
        ctx.fill();
      }
    }
    if (burning) {
      ctx.strokeStyle = 'rgba(255,243,196,0.9)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, enemy.radius + 3, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
    if (enemy.shield > 0) {
      ctx.strokeStyle = 'rgba(255,200,87,0.85)';
      ctx.lineWidth = 3;
      ctx.setLineDash([8, 6]);
      ctx.beginPath();
      ctx.arc(enemy.x, enemy.y, enemy.radius + 7, state.time * 1.5, state.time * 1.5 + Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    if (enemy.maxHp > 60 && enemy.hp < enemy.maxHp) {
      const width = enemy.radius * 2;
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(enemy.x - width / 2, enemy.y - enemy.radius - 14, width, 5);
      ctx.fillStyle = COLORS.danger;
      ctx.fillRect(enemy.x - width / 2, enemy.y - enemy.radius - 14, width * Math.max(0, enemy.hp / enemy.maxHp), 5);
    }
  }

  function drawEffects(state) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const particle of state.effects.particles) {
      const alpha = Math.max(0, particle.life / particle.maxLife);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = particle.color;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    ctx.globalAlpha = 1;
    for (const ringEffect of state.effects.rings) {
      const alpha = Math.max(0, ringEffect.life / ringEffect.maxLife);
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = ringEffect.color;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(ringEffect.x, ringEffect.y, ringEffect.radius, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    for (const floating of state.effects.texts) {
      const alpha = Math.max(0, floating.life / floating.maxLife);
      ctx.globalAlpha = alpha;
      text(floating.text, floating.x, floating.y, floating.size, floating.color);
    }
    ctx.globalAlpha = 1;
  }

  function drawEmbers(state) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const ember of state.embers) {
      const pulse = 0.7 + 0.3 * Math.sin(state.time * 6 + ember.x);
      const fade = Math.min(1, ember.life / 1.2);
      const gradient = ctx.createRadialGradient(ember.x, ember.y, 1, ember.x, ember.y, 16);
      gradient.addColorStop(0, `rgba(255,200,110,${0.9 * pulse * fade})`);
      gradient.addColorStop(1, 'rgba(255,179,71,0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(ember.x, ember.y, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffe9b8';
      ctx.beginPath();
      ctx.arc(ember.x, ember.y, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function pill(x, y, label, value) {
    ctx.font = `700 19px ${FONT}`;
    const width = ctx.measureText(`${label}  ${value}`).width + 34;
    ctx.fillStyle = 'rgba(8,12,28,0.72)';
    ctx.beginPath();
    ctx.roundRect(x, y, width, 34, 17);
    ctx.fill();
    ctx.strokeStyle = COLORS.panelEdge;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    text(label, x + 17, y + 18, 19, COLORS.textDim, 'left');
    text(value, x + width - 17, y + 18, 19, COLORS.text, 'right');
    return width;
  }

  function drawHud(state, world, best, muted) {
    pill(24, 20, 'WAVE', state.wave === 0 ? '–' : `${state.wave}/${TOTAL_WAVES}`);
    pill(24, 62, 'SHADOWS LEFT', String(world.enemiesLeft()));
    const scoreLabel = `SCORE ${state.score}`;
    ctx.font = `800 30px ${FONT}`;
    const scoreWidth = ctx.measureText(scoreLabel).width;
    ctx.fillStyle = 'rgba(8,12,28,0.72)';
    ctx.beginPath();
    ctx.roundRect(FIELD.width / 2 - scoreWidth / 2 - 20, 20, scoreWidth + 40, 42, 21);
    ctx.fill();
    ctx.strokeStyle = COLORS.panelEdge;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    text(scoreLabel, FIELD.width / 2, 42, 30, COLORS.text, 'center', 800);
    text(`BEST ${Math.max(best, state.score)}`, FIELD.width / 2, 76, 16, COLORS.textDim);
    if (state.boss && !state.boss.dead) {
      text('THE HOLLOW KING', FIELD.width / 2, 104, 18, COLORS.boss, 'center', 800);
      bar(FIELD.width / 2 - 190, 116, 380, 12, state.boss.hp / state.boss.maxHp, COLORS.boss, 'rgba(8,12,28,0.8)', COLORS.boss);
    }
    if (state.combo >= 2) {
      const multiplier = Math.min(COMBO.maxMultiplier, 1 + Math.floor(state.combo / 3));
      ctx.save();
      const pop = 1 + 0.12 * Math.sin(state.time * 8);
      ctx.translate(24, 124);
      ctx.scale(pop, pop);
      text(`COMBO x${multiplier}`, 0, 0, 26, COLORS.gold, 'left', 800);
      ctx.restore();
      bar(24, 138, 150, 6, state.comboTimer / COMBO.windowSeconds, COLORS.gold, 'rgba(8,12,28,0.8)', COLORS.panelEdge);
    }
    text(muted ? 'M · SOUND OFF' : 'M · SOUND ON', FIELD.width - 24, 36, 15, COLORS.textDim, 'right');
    text('HULL', 24, FIELD.height - 58, 17, COLORS.textDim, 'left', 800);
    bar(24, FIELD.height - 46, 300, 20, state.hp / state.hpMax, state.hp / state.hpMax > 0.3 ? COLORS.heal : COLORS.danger, 'rgba(8,12,28,0.8)', COLORS.panelEdge);
    text(`${Math.ceil(state.hp)} / ${state.hpMax}`, 334, FIELD.height - 35, 17, COLORS.text, 'left');
    const oilLabel = state.beamLocked ? 'OIL · RECHARGING' : 'OIL';
    text(oilLabel, FIELD.width - 24, FIELD.height - 58, 17, state.beamLocked ? COLORS.danger : COLORS.textDim, 'right', 800);
    // While the lamp recharges, the oil bar throbs so the lock is unmissable.
    const oilFlash = state.beamLocked && Math.sin(state.time * 8) > 0;
    bar(FIELD.width - 324, FIELD.height - 46, 300, 20, state.oil / state.oilMax, oilFlash ? '#ff8c42' : COLORS.oil, 'rgba(8,12,28,0.8)', oilFlash ? COLORS.danger : COLORS.panelEdge);
    if (state.modifiers.pulseLevel > 0) {
      const ready = state.pulseCooldown <= 0;
      const label = ready ? 'E · SHOCKWAVE READY' : `E · SHOCKWAVE ${Math.ceil(state.pulseCooldown)}s`;
      text(label, FIELD.width - 24, FIELD.height - 76, 16, ready ? COLORS.beamCore : COLORS.textDim, 'right', 800);
    }
    text('Mouse aims · Hold click / Space to burn · E shockwave · P pause', FIELD.width / 2, FIELD.height - 18, 15, 'rgba(170,179,208,0.75)');
  }

  function drawBanner(state) {
    const banner = state.banner;
    if (!banner || banner.timer <= 0) return;
    const alpha = Math.min(1, banner.timer / 0.6, (2.6 - banner.timer) / 0.3 + 0.4);
    ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
    text(banner.title, FIELD.width / 2, 150, 44, COLORS.text, 'center', 800);
    text(banner.sub, FIELD.width / 2, 188, 20, COLORS.textDim, 'center', 400);
    ctx.globalAlpha = 1;
  }

  function dimOverlay(alpha) {
    ctx.fillStyle = `rgba(5,8,20,${alpha})`;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  }

  function panel(x, y, width, height) {
    ctx.fillStyle = COLORS.panel;
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, 18);
    ctx.fill();
    ctx.strokeStyle = COLORS.panelEdge;
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  function drawTitle(state, best) {
    dimOverlay(0.45);
    const glow = ctx.createRadialGradient(FIELD.width / 2, 250, 10, FIELD.width / 2, 250, 320);
    glow.addColorStop(0, 'rgba(255,217,122,0.22)');
    glow.addColorStop(1, 'rgba(255,217,122,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    text('LUMENFALL', FIELD.width / 2, 168, 84, COLORS.gold, 'center', 800);
    text('Keep the lighthouse burning.', FIELD.width / 2, 222, 26, COLORS.text, 'center', 400);
    text('Shadows crawl from the dark. Aim the lamp with your mouse, hold click or Space to burn', FIELD.width / 2, 300, 21, COLORS.text);
    text('them down, and gather their embers to feed the flame. Survive all 10 waves —', FIELD.width / 2, 330, 21, COLORS.text);
    text('if a shadow reaches the lighthouse, the light dies.', FIELD.width / 2, 360, 21, COLORS.text);
    const pulse = 0.65 + 0.35 * Math.sin(state.time * 3);
    ctx.globalAlpha = pulse;
    text('CLICK OR PRESS SPACE TO START', FIELD.width / 2, 438, 28, COLORS.beamCore, 'center', 800);
    ctx.globalAlpha = 1;
    if (best > 0) text(`BEST SCORE ${best}`, FIELD.width / 2, 486, 19, COLORS.textDim);
    text('Arrows / A D turn the lamp · E shockwave (once unlocked) · P pause · M sound', FIELD.width / 2, 640, 17, COLORS.textDim, 'center', 400);
  }

  function drawUpgradeIcon(icon, x, y, size, color) {
    ctx.save();
    ctx.translate(x, y);
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    if (icon === 'fan') {
      for (const angle of [-0.5, 0, 0.5]) {
        ctx.beginPath();
        ctx.moveTo(0, size * 0.4);
        ctx.lineTo(Math.sin(angle) * size * 0.5, -size * 0.4);
        ctx.stroke();
      }
    } else if (icon === 'flame') {
      ctx.beginPath();
      ctx.moveTo(0, -size * 0.5);
      ctx.quadraticCurveTo(size * 0.42, -size * 0.05, size * 0.3, size * 0.3);
      ctx.quadraticCurveTo(0, size * 0.55, -size * 0.3, size * 0.3);
      ctx.quadraticCurveTo(-size * 0.42, -size * 0.05, 0, -size * 0.5);
      ctx.fill();
    } else if (icon === 'drop') {
      ctx.beginPath();
      ctx.moveTo(0, -size * 0.5);
      ctx.quadraticCurveTo(size * 0.4, size * 0.05, 0, size * 0.45);
      ctx.quadraticCurveTo(-size * 0.4, size * 0.05, 0, -size * 0.5);
      ctx.fill();
    } else if (icon === 'swirl') {
      ctx.beginPath();
      ctx.arc(0, 0, size * 0.38, 0.4, Math.PI * 1.5);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(size * 0.38, -size * 0.28);
      ctx.lineTo(size * 0.1, -size * 0.34);
      ctx.lineTo(size * 0.3, -size * 0.05);
      ctx.stroke();
    } else if (icon === 'shield') {
      ctx.beginPath();
      ctx.moveTo(0, -size * 0.45);
      ctx.lineTo(size * 0.38, -size * 0.25);
      ctx.lineTo(size * 0.38, size * 0.1);
      ctx.quadraticCurveTo(size * 0.38, size * 0.42, 0, size * 0.5);
      ctx.quadraticCurveTo(-size * 0.38, size * 0.42, -size * 0.38, size * 0.1);
      ctx.lineTo(-size * 0.38, -size * 0.25);
      ctx.closePath();
      ctx.stroke();
    } else if (icon === 'arrow') {
      ctx.beginPath();
      ctx.moveTo(-size * 0.4, 0);
      ctx.lineTo(size * 0.4, 0);
      ctx.moveTo(size * 0.15, -size * 0.25);
      ctx.lineTo(size * 0.4, 0);
      ctx.lineTo(size * 0.15, size * 0.25);
      ctx.stroke();
    } else if (icon === 'magnet') {
      ctx.beginPath();
      ctx.arc(0, -size * 0.05, size * 0.34, Math.PI, 0, true);
      ctx.lineTo(size * 0.34, size * 0.35);
      ctx.lineTo(size * 0.14, size * 0.35);
      ctx.lineTo(size * 0.14, -size * 0.05);
      ctx.arc(0, -size * 0.05, size * 0.14, 0, Math.PI, true);
      ctx.lineTo(-size * 0.14, size * 0.35);
      ctx.lineTo(-size * 0.34, size * 0.35);
      ctx.closePath();
      ctx.stroke();
    } else if (icon === 'ring') {
      ctx.beginPath();
      ctx.arc(0, 0, size * 0.36, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, size * 0.14, 0, Math.PI * 2);
      ctx.fill();
    } else if (icon === 'split') {
      for (const angle of [-0.45, 0.45]) {
        ctx.beginPath();
        ctx.moveTo(0, size * 0.4);
        ctx.lineTo(Math.sin(angle) * size * 0.5, -size * 0.4);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.arc(0, size * 0.4, 4, 0, Math.PI * 2);
      ctx.fill();
    } else {
      for (let i = 0; i < 4; i += 1) {
        const angle = (i / 4) * Math.PI * 2 + Math.PI / 4;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(angle) * size * 0.42, Math.sin(angle) * size * 0.42);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.arc(0, 0, size * 0.12, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawUpgrade(state, world, pointer) {
    void world;
    dimOverlay(0.62);
    text('THE LAMP GROWS STRONGER', FIELD.width / 2, 128, 40, COLORS.gold, 'center', 800);
    text(`Wave ${state.wave} cleared — choose one`, FIELD.width / 2, 168, 21, COLORS.textDim, 'center', 400);
    const cardWidth = 300;
    const cardHeight = 330;
    const gap = 28;
    const total = cardWidth * 3 + gap * 2;
    const startX = FIELD.width / 2 - total / 2;
    const cardY = 220;
    cardRects = [];
    state.choices.forEach((choice, index) => {
      const x = startX + index * (cardWidth + gap);
      const hovered = pointer && pointer.x >= x && pointer.x <= x + cardWidth && pointer.y >= cardY && pointer.y <= cardY + cardHeight;
      cardRects.push({ x, y: cardY, width: cardWidth, height: cardHeight });
      ctx.fillStyle = hovered ? '#1a2748f2' : COLORS.panel;
      ctx.beginPath();
      ctx.roundRect(x, cardY, cardWidth, cardHeight, 16);
      ctx.fill();
      ctx.strokeStyle = hovered ? COLORS.gold : COLORS.panelEdge;
      ctx.lineWidth = hovered ? 3 : 2;
      ctx.stroke();
      drawUpgradeIcon(choice.icon, x + cardWidth / 2, cardY + 78, 72, COLORS.gold);
      text(choice.name, x + cardWidth / 2, cardY + 158, 26, COLORS.text, 'center', 800);
      wrapText(choice.desc, x + 26, cardY + 196, cardWidth - 52, 19, COLORS.textDim);
      text(`PRESS ${index + 1} OR CLICK`, x + cardWidth / 2, cardY + cardHeight - 30, 15, COLORS.textDim, 'center', 400);
    });
  }

  function wrapText(str, x, y, maxWidth, size, color) {
    ctx.font = `400 ${size}px ${FONT}`;
    const words = str.split(' ');
    const lines = [];
    let line = '';
    for (const word of words) {
      const trial = line ? `${line} ${word}` : word;
      if (ctx.measureText(trial).width > maxWidth && line) {
        lines.push(line);
        line = word;
      } else {
        line = trial;
      }
    }
    if (line) lines.push(line);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = color;
    lines.forEach((entry, index) => {
      ctx.fillText(entry, x + maxWidth / 2, y + index * (size + 7));
    });
  }

  function drawEndScreen(state, best, won) {
    dimOverlay(0.6);
    if (won) {
      const glow = ctx.createRadialGradient(FIELD.width / 2, 240, 10, FIELD.width / 2, 240, 340);
      glow.addColorStop(0, 'rgba(255,217,122,0.32)');
      glow.addColorStop(1, 'rgba(255,217,122,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    }
    text(won ? 'THE DAWN BREAKS' : 'THE LIGHT DIES', FIELD.width / 2, 172, 64, won ? COLORS.gold : COLORS.danger, 'center', 800);
    ctx.strokeStyle = won ? COLORS.gold : COLORS.danger;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(FIELD.width / 2 - 90, 206);
    ctx.lineTo(FIELD.width / 2 + 90, 206);
    ctx.stroke();
    text(
      won ? 'You kept the lighthouse burning through all 10 waves.' : `The shadows reached the lighthouse on wave ${state.wave}.`,
      FIELD.width / 2,
      232,
      23,
      COLORS.text,
      'center',
      400,
    );
    panel(FIELD.width / 2 - 260, 286, 520, 190);
    const rows = [
      ['FINAL SCORE', String(state.score)],
      ['BEST SCORE', String(Math.max(best, state.score))],
      ['SHADOWS BURNED', String(state.kills)],
      ['BEST COMBO', `${state.bestCombo} in a row`],
      ['WAVES CLEARED', `${state.stats.wavesCleared} / ${TOTAL_WAVES}`],
    ];
    rows.forEach(([label, value], index) => {
      const y = 318 + index * 36;
      text(label, FIELD.width / 2 - 228, y, 19, COLORS.textDim, 'left', 400);
      text(value, FIELD.width / 2 + 228, y, 19, COLORS.text, 'right', 800);
    });
    const pulse = 0.65 + 0.35 * Math.sin(state.time * 3);
    ctx.globalAlpha = pulse;
    text('CLICK OR PRESS SPACE TO PLAY AGAIN', FIELD.width / 2, 540, 26, COLORS.beamCore, 'center', 800);
    ctx.globalAlpha = 1;
  }

  function drawPause() {
    dimOverlay(0.55);
    text('PAUSED', FIELD.width / 2, 320, 56, COLORS.text, 'center', 800);
    text('Press P or click to keep playing · R restarts the run · M toggles sound', FIELD.width / 2, 372, 20, COLORS.textDim, 'center', 400);
  }

  function drawVignette() {
    const gradient = ctx.createRadialGradient(FIELD.width / 2, FIELD.height / 2, FIELD.height * 0.42, FIELD.width / 2, FIELD.height / 2, FIELD.height * 0.85);
    gradient.addColorStop(0, 'rgba(0,0,0,0)');
    gradient.addColorStop(1, 'rgba(0,0,0,0.42)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  }

  function draw(world, screen, ui) {
    const state = world.state;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#05070f';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const shakeX = state.shake > 0.2 ? Math.sin(state.time * 47) * state.shake * 0.5 : 0;
    const shakeY = state.shake > 0.2 ? Math.cos(state.time * 53) * state.shake * 0.5 : 0;
    ctx.setTransform(scale, 0, 0, scale, offsetX + shakeX * scale, offsetY + shakeY * scale);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, FIELD.width, FIELD.height);
    ctx.clip();
    drawBackground(state.time);
    drawIsland(state.time);
    drawBeam(state, world);
    drawEmbers(state);
    const sorted = [...state.enemies].sort((a, b) => a.y - b.y);
    for (const enemy of sorted) drawEnemy(enemy, state);
    drawLighthouse(state);
    drawBeamImpact(state);
    drawEffects(state);
    drawVignette();
    if (state.hurtFlash > 0) {
      ctx.fillStyle = `rgba(255,60,60,${Math.min(0.3, state.hurtFlash)})`;
      ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    }
    // Low hull: the edges of the night throb red until the keeper recovers.
    if (state.hp > 0 && state.hp / state.hpMax <= 0.3 && (screen === SCREEN_PLAY || screen === SCREEN_UPGRADE || screen === SCREEN_PAUSE)) {
      const throb = 0.1 + 0.07 * Math.sin(state.time * 4);
      const edge = ctx.createRadialGradient(FIELD.width / 2, FIELD.height / 2, FIELD.height * 0.34, FIELD.width / 2, FIELD.height / 2, FIELD.height * 0.78);
      edge.addColorStop(0, 'rgba(255,40,40,0)');
      edge.addColorStop(1, `rgba(255,40,40,${throb})`);
      ctx.fillStyle = edge;
      ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    }
    if (screen === SCREEN_PLAY || screen === SCREEN_UPGRADE || screen === SCREEN_PAUSE) {
      drawHud(state, world, ui.best, ui.muted);
      drawBanner(state);
    }
    if (screen === SCREEN_TITLE) drawTitle(state, ui.best);
    if (screen === SCREEN_UPGRADE) drawUpgrade(state, world, ui.pointer);
    if (screen === SCREEN_PAUSE) drawPause();
    if (screen === SCREEN_WIN) drawEndScreen(state, ui.best, true);
    if (screen === SCREEN_OVER) drawEndScreen(state, ui.best, false);
    ctx.restore();
  }

  return { draw, resize, toLogical, upgradeRects: () => cardRects };
}

export { BEAM, HULL, OIL, PULSE };
