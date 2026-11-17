// Pointer and keyboard input, translated into one aim angle, one beam switch
// and a bitmask of edge-triggered actions the screens consume each frame.
// Mouse aims; holding the mouse or Space burns the beam. Keyboard-only play
// works too: arrows or A/D turn the lamp, Space burns, E fires the shockwave.

import { FIELD, LIGHTHOUSE } from './config.js';

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_PULSE = 4;
export const ACTION_MUTE = 8;
export const ACTION_RESTART = 16;
export const ACTION_PICK_1 = 32;
export const ACTION_PICK_2 = 64;
export const ACTION_PICK_3 = 128;

const TURN_SPEED = 2.8;

export function createInput(canvas, toLogical) {
  const keys = new Set();
  let pointerX = FIELD.width / 2;
  let pointerY = FIELD.height / 4;
  let pointerDown = false;
  let pointerSeen = false;
  let keyboardAim = -Math.PI / 2;
  let actions = 0;

  function updatePointer(event) {
    const point = toLogical(event.clientX, event.clientY);
    pointerX = point.x;
    pointerY = point.y;
    pointerSeen = true;
  }

  function onKey(event, down) {
    const key = event.key;
    if ([' ', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(key)) event.preventDefault();
    if (down && event.repeat) return;
    if (down) keys.add(key);
    else keys.delete(key);
    if (!down) return;
    if (key === ' ' || key === 'Enter') actions |= ACTION_CONFIRM;
    if (key === 'p' || key === 'P' || key === 'Escape') actions |= ACTION_PAUSE;
    if (key === 'e' || key === 'E') actions |= ACTION_PULSE;
    if (key === 'm' || key === 'M') actions |= ACTION_MUTE;
    if (key === 'r' || key === 'R') actions |= ACTION_RESTART;
    if (key === '1') actions |= ACTION_PICK_1;
    if (key === '2') actions |= ACTION_PICK_2;
    if (key === '3') actions |= ACTION_PICK_3;
  }

  canvas.addEventListener('pointermove', updatePointer);
  canvas.addEventListener('pointerdown', (event) => {
    updatePointer(event);
    if (event.button === 2) {
      actions |= ACTION_PULSE;
      return;
    }
    pointerDown = true;
    actions |= ACTION_CONFIRM;
  });
  window.addEventListener('pointerup', (event) => {
    if (event.button === 0) pointerDown = false;
  });
  canvas.addEventListener('contextmenu', (event) => event.preventDefault());
  window.addEventListener('keydown', (event) => onKey(event, true));
  window.addEventListener('keyup', (event) => onKey(event, false));
  window.addEventListener('blur', () => {
    keys.clear();
    pointerDown = false;
  });

  return {
    /** The lamp's aim angle, from the pointer when one moved, else the keys. */
    aimAngle(dt) {
      const turningLeft = keys.has('ArrowLeft') || keys.has('a') || keys.has('A');
      const turningRight = keys.has('ArrowRight') || keys.has('d') || keys.has('D');
      if (turningLeft) keyboardAim -= TURN_SPEED * dt;
      if (turningRight) keyboardAim += TURN_SPEED * dt;
      if (pointerSeen && !turningLeft && !turningRight) {
        keyboardAim = Math.atan2(pointerY - LIGHTHOUSE.y, pointerX - LIGHTHOUSE.x);
      }
      return keyboardAim;
    },
    /** The beam burns while the mouse or Space is held. */
    beamHeld() {
      return pointerDown || keys.has(' ');
    },
    pointer() {
      return { x: pointerX, y: pointerY, down: pointerDown };
    },
    /** Edge-triggered actions since the last call; reading clears them. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
  };
}
