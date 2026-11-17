// The upgrades offered between waves: pick one of three. Each one names what
// it changes in plain words, so the choice on screen is the choice that
// matters. Stacks are tracked so the same upgrade can be offered again with
// its effect growing; Split Lens only appears once the lamp is warm.

export const UPGRADE_POOL = [
  { id: 'wide', name: 'Wider Beam', desc: '+35% beam width. Sweep more of the dark at once.', icon: 'fan', minWave: 1, maxStacks: 4 },
  { id: 'hot', name: 'Hotter Beam', desc: '+35% burn damage. Shadows fall faster in the light.', icon: 'flame', minWave: 1, maxStacks: 5 },
  { id: 'tank', name: 'Bigger Tank', desc: '+40 max oil and refill 40 now. Burn longer.', icon: 'drop', minWave: 1, maxStacks: 4 },
  { id: 'wick', name: 'Swift Wick', desc: '+45% oil regeneration. The lamp recovers sooner.', icon: 'swirl', minWave: 1, maxStacks: 4 },
  { id: 'hull', name: 'Reinforce', desc: '+30 max hull, repair 40 now. The lighthouse stands longer.', icon: 'shield', minWave: 1, maxStacks: 4 },
  { id: 'reach', name: 'Long Reach', desc: '+25% beam range. Strike the dark further out.', icon: 'arrow', minWave: 1, maxStacks: 3 },
  { id: 'magnet', name: 'Ember Magnet', desc: 'Embers fly twice as fast and twice as far to you.', icon: 'magnet', minWave: 2, maxStacks: 2 },
  { id: 'pulse', name: 'Shockwave', desc: 'Unlock E / right-click: a blast that burns and throws back every shadow near the light.', icon: 'ring', minWave: 2, maxStacks: 3 },
  { id: 'split', name: 'Split Lens', desc: 'The beam splits in two, 14 degrees apart. Twice the burning sky.', icon: 'split', minWave: 4, maxStacks: 1 },
  { id: 'siphon', name: 'Siphon Wick', desc: 'Every kill restores +3 oil at once.', icon: 'spark', minWave: 3, maxStacks: 3 },
];

/** How many times `id` has been taken already. */
export function stackCount(taken, id) {
  return taken.filter((entry) => entry === id).length;
}

/** Three distinct upgrades the wave allows and the stacks allow, drawn at random. */
export function rollUpgradeChoices(wave, taken, random) {
  const available = UPGRADE_POOL.filter(
    (upgrade) => wave >= upgrade.minWave && stackCount(taken, upgrade.id) < upgrade.maxStacks,
  );
  const choices = [];
  const pool = [...available];
  while (choices.length < 3 && pool.length > 0) {
    const index = Math.floor(random() * pool.length);
    choices.push(pool.splice(index, 1)[0]);
  }
  return choices;
}

/** Apply an upgrade's effect to the world's modifiers. */
export function applyUpgrade(modifiers, id) {
  if (id === 'wide') modifiers.beamWidth *= 1.35;
  if (id === 'hot') modifiers.beamDamage *= 1.35;
  if (id === 'tank') {
    modifiers.oilMax += 40;
    modifiers.oilRefill = (modifiers.oilRefill ?? 0) + 40;
  }
  if (id === 'wick') modifiers.oilRegen *= 1.45;
  if (id === 'hull') {
    modifiers.hullMax += 30;
    modifiers.hullRepair = (modifiers.hullRepair ?? 0) + 40;
  }
  if (id === 'reach') modifiers.beamRange *= 1.25;
  if (id === 'magnet') modifiers.emberMagnet *= 2;
  if (id === 'pulse') modifiers.pulseLevel += 1;
  if (id === 'split') modifiers.beamCount = 2;
  if (id === 'siphon') modifiers.siphon += 3;
}

/** The world's starting modifiers, before any upgrade. */
export function createModifiers() {
  return {
    beamWidth: 1,
    beamDamage: 1,
    beamRange: 1,
    beamCount: 1,
    oilMax: 0,
    oilRegen: 1,
    oilRefill: 0,
    hullMax: 0,
    hullRepair: 0,
    emberMagnet: 1,
    pulseLevel: 0,
    siphon: 0,
  };
}
