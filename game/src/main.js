// Boot, the screen state machine and the fixed-step loop. Play runs at
// 1/60 s steps so the game feels the same on every machine; rendering
// follows the browser's own frame rate. With ?shot=<scene> the game instead
// stages that scene deterministically, draws one frame and raises
// window.__shotReady for the screenshot harness.

import { createWorld, EVENT_BOSS, EVENT_HURT, EVENT_KILL, EVENT_OVER, EVENT_PICKUP, EVENT_PULSE, EVENT_UPGRADE, EVENT_WAVE_START, EVENT_WIN } from './world.js';
import { createRenderer, SCREEN_OVER, SCREEN_PAUSE, SCREEN_PLAY, SCREEN_TITLE, SCREEN_UPGRADE, SCREEN_WIN } from './render.js';
import { createAudio } from './audio.js';
import { ACTION_CONFIRM, ACTION_MUTE, ACTION_PAUSE, ACTION_PICK_1, ACTION_PICK_2, ACTION_PICK_3, ACTION_PULSE, ACTION_RESTART, createInput } from './input.js';
import { createRandom } from './random.js';
import { SHOT_SEEDS, stageShot } from './shots.js';

const canvas = document.getElementById('game');
const STEP = 1 / 60;
const BEST_KEY = 'lumenfall.best';

function loadBest() {
  try {
    return Number(localStorage.getItem(BEST_KEY)) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // A private window still plays; it just forgets the best score.
  }
}

const params = new URLSearchParams(window.location.search);
const shotScene = params.get('shot');
if (shotScene && SHOT_SEEDS[shotScene] !== undefined) {
  const renderer = createRenderer(canvas);
  // ?seed=<n> restages the same scene under another fixed seed, for picking
  // the best cover frame; without it the shipped seed is used.
  const seedParam = params.get('seed');
  const seed = seedParam !== null && Number.isFinite(Number(seedParam)) ? Number(seedParam) >>> 0 : SHOT_SEEDS[shotScene];
  const world = createWorld(createRandom(seed));
  world.reset(shotScene === 'title');
  const staged = stageShot(world, shotScene);
  const screens = { title: SCREEN_TITLE, play: SCREEN_PLAY, upgrade: SCREEN_UPGRADE, win: SCREEN_WIN, over: SCREEN_OVER };
  renderer.draw(world, screens[staged] ?? SCREEN_PLAY, { best: 0, muted: false, pointer: null });
  window.__shotReady = true;
} else {
  runGame();
}

function runGame() {
  const renderer = createRenderer(canvas);
  const audio = createAudio();
  const input = createInput(canvas, renderer.toLogical);
  const seed = (Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0;
  const world = createWorld(createRandom(seed));
  world.reset(true);
  let screen = SCREEN_TITLE;
  let best = loadBest();
  let muted = false;
  let pulseQueued = false;
  let last = performance.now();
  let accumulator = 0;

  function startGame() {
    world.reset(false);
    screen = SCREEN_PLAY;
  }

  function saveIfBest() {
    if (world.state.score > best) {
      best = world.state.score;
      saveBest(best);
    }
  }

  function pickUpgrade(index) {
    if (world.chooseUpgrade(index)) {
      audio.upgrade();
      screen = SCREEN_PLAY;
    }
  }

  function handleEvents(events) {
    const state = world.state;
    if (events & EVENT_KILL) audio.kill(state.combo);
    if (events & EVENT_PICKUP) audio.ember();
    if (events & EVENT_HURT) audio.hurt();
    if (events & EVENT_WAVE_START) audio.waveHorn();
    if (events & EVENT_BOSS) audio.roar();
    if (events & EVENT_PULSE) audio.pulse();
    if (events & EVENT_UPGRADE) {
      audio.waveClear();
      screen = SCREEN_UPGRADE;
    }
    if (events & EVENT_WIN) {
      saveIfBest();
      audio.victory();
      screen = SCREEN_WIN;
    }
    if (events & EVENT_OVER) {
      saveIfBest();
      audio.defeat();
      screen = SCREEN_OVER;
    }
  }

  function handleActions(actions) {
    if (actions & ACTION_MUTE) muted = audio.toggleMute();
    if (screen === SCREEN_TITLE) {
      if (actions & ACTION_CONFIRM) {
        audio.unlock();
        audio.click();
        startGame();
      }
      return;
    }
    if (screen === SCREEN_PLAY) {
      if (actions & ACTION_PAUSE) screen = SCREEN_PAUSE;
      else if (actions & ACTION_RESTART) startGame();
      else if (actions & ACTION_PULSE) pulseQueued = true;
      return;
    }
    if (screen === SCREEN_UPGRADE) {
      if (actions & ACTION_PICK_1) pickUpgrade(0);
      else if (actions & ACTION_PICK_2) pickUpgrade(1);
      else if (actions & ACTION_PICK_3) pickUpgrade(2);
      else if (actions & ACTION_RESTART) startGame();
      else if (actions & ACTION_CONFIRM) {
        const pointer = input.pointer();
        const rects = renderer.upgradeRects();
        rects.forEach((rect, index) => {
          if (pointer.x >= rect.x && pointer.x <= rect.x + rect.width && pointer.y >= rect.y && pointer.y <= rect.y + rect.height) {
            pickUpgrade(index);
          }
        });
      }
      return;
    }
    if (screen === SCREEN_PAUSE) {
      if (actions & ACTION_PAUSE || actions & ACTION_CONFIRM) screen = SCREEN_PLAY;
      else if (actions & ACTION_RESTART) startGame();
      return;
    }
    if (screen === SCREEN_WIN || screen === SCREEN_OVER) {
      if (actions & ACTION_CONFIRM || actions & ACTION_RESTART) startGame();
    }
  }

  function tick(dt) {
    if (screen === SCREEN_TITLE || screen === SCREEN_WIN || screen === SCREEN_OVER) {
      world.step(dt, { aim: 0, beam: false, pulse: false });
      return;
    }
    if (screen !== SCREEN_PLAY) return;
    const controls = { aim: input.aimAngle(dt), beam: input.beamHeld(), pulse: pulseQueued };
    pulseQueued = false;
    handleEvents(world.step(dt, controls));
  }

  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    handleActions(input.takeActions());
    accumulator += dt;
    let steps = 0;
    while (accumulator >= STEP && steps < 5) {
      tick(STEP);
      accumulator -= STEP;
      steps += 1;
    }
    if (steps === 5) accumulator = 0;
    audio.setBeamHum(screen === SCREEN_PLAY && world.state.beamOn);
    renderer.draw(world, screen, { best, muted, pointer: input.pointer() });
  }

  requestAnimationFrame(frame);
}
