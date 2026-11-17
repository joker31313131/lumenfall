// A small seeded random number generator (mulberry32): the same seed gives the
// same game, which is what makes the screenshot scenes repeatable. The live
// game seeds it from Math.random; the staged scenes pass a fixed seed.

export function createRandom(seed) {
  let state = seed | 0;
  return function random() {
    state = (state + 0x6d2b79f5) | 0;
    let mixed = Math.imul(state ^ (state >>> 15), 1 | state);
    mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

/** An integer in [min, max], drawn from `random`. */
export function randomInt(random, min, max) {
  return min + Math.floor(random() * (max - min + 1));
}

/** One element of `items`, drawn from `random`. */
export function randomPick(random, items) {
  return items[Math.floor(random() * items.length)];
}
