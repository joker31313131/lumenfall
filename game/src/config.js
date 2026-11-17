// Every tuning number and colour in one place. The playfield is a fixed 1280x720
// logical area; the renderer scales it to the window, so no rule below depends
// on the screen size. Balance goal: a first-time player reaches wave 4-6, a
// careful one wins wave 10; the screenshot autopilot wins on its fixed seed.

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

export const FIELD = { width: 1280, height: 720 };

/** The lighthouse stands at the centre; enemies walk toward it from every side. */
export const LIGHTHOUSE = { x: 640, y: 360, islandRadius: 132, strikeRadius: 96 };

export const TOTAL_WAVES = 10;
export const BOSS_WAVES = [5, 10];

export const BEAM = {
  range: 520,
  halfAngle: 0.16,
  dps: 46,
  /** Oil drained per second while the beam burns. */
  drainPerSecond: 13,
  /** Beam stays off until oil climbs back past this, so it never flickers at empty. */
  rearmOil: 18,
};

export const OIL = { max: 100, regenPerSecond: 7, emberRefund: 9 };

export const HULL = { max: 100 };

export const COMBO = { windowSeconds: 2.5, maxMultiplier: 5 };

export const PULSE = { radius: 250, damage: 70, knockback: 190, cooldownSeconds: 12 };

export const WAVES = {
  /** Seconds of quiet before the first wave and between a choice and the next wave. */
  breatherSeconds: 2.6,
  spawnIntervalStart: 0.85,
  spawnIntervalEnd: 0.38,
  /** Enemy health and speed grow with the wave number. */
  hpGrowthPerWave: 0.12,
  speedGrowthPerWave: 0.02,
  maxSpeedGrowth: 1.25,
};

export const BEST_KEY = 'lumenfall-best-score';

/** One coherent night palette: deep sea blues, warm lamp gold, cold enemy glows. */
export const COLORS = {
  skyTop: '#070a1a',
  skyBottom: '#101a38',
  sea: '#0d1830',
  seaShimmer: '#1b2c55',
  island: '#2e3a5e',
  islandEdge: '#3d4e7d',
  islandInner: '#36446a',
  rock: '#222c4c',
  towerLight: '#f3e9d2',
  towerDark: '#c94f4f',
  lampGlow: '#ffd97a',
  beamCore: '#fff3c4',
  beamEdge: '#ffbf47',
  gold: '#ffd97a',
  ink: '#0b0e1c',
  panel: '#101830ee',
  panelEdge: '#3d5a8f',
  text: '#f4f1e6',
  textDim: '#aab3d0',
  danger: '#ff5d5d',
  heal: '#7be495',
  oil: '#ffb347',
  shade: '#8f7bff',
  skitter: '#5ee6ff',
  hulk: '#ff6fa5',
  splitter: '#9dff6e',
  mini: '#c8ff9e',
  shielded: '#ffc857',
  boss: '#ff4d6d',
  ember: '#ffb347',
};
