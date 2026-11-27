// Keyboard handling. One-shot actions (confirm, pause, mute) are queued; jump presses and
// releases are edge events so the world can start a jump buffer and cut a jump short; ducking is
// a held state. Keys are followed by code rather than character, so layouts do not matter.

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_MUTE = 4;

const JUMP_CODES = new Set(['Space', 'ArrowUp', 'KeyW']);
const DUCK_CODES = new Set(['ArrowDown', 'KeyS']);
const CONFIRM_CODES = new Set(['Enter', 'NumpadEnter', 'Space']);
const PAUSE_CODES = new Set(['KeyP', 'Escape']);
const MUTE_CODES = new Set(['KeyM']);

export function createInput(target) {
  const jumpKeys = new Set();
  let duckHeld = false;
  let actions = 0;
  let jumpPressed = false;
  let jumpReleased = false;

  window.addEventListener('keydown', (event) => {
    let handled = true;
    if (JUMP_CODES.has(event.code)) {
      if (!jumpKeys.has(event.code)) {
        jumpKeys.add(event.code);
        if (jumpKeys.size === 1) jumpPressed = true;
      }
      if (CONFIRM_CODES.has(event.code) && !event.repeat) actions |= ACTION_CONFIRM;
    } else if (DUCK_CODES.has(event.code)) {
      duckHeld = true;
    } else if (CONFIRM_CODES.has(event.code)) {
      if (!event.repeat) actions |= ACTION_CONFIRM;
    } else if (PAUSE_CODES.has(event.code)) {
      if (!event.repeat) actions |= ACTION_PAUSE;
    } else if (MUTE_CODES.has(event.code)) {
      if (!event.repeat) actions |= ACTION_MUTE;
    } else {
      handled = false;
    }
    if (handled) event.preventDefault();
  });

  window.addEventListener('keyup', (event) => {
    if (JUMP_CODES.has(event.code)) {
      jumpKeys.delete(event.code);
      if (jumpKeys.size === 0) jumpReleased = true;
      event.preventDefault();
    } else if (DUCK_CODES.has(event.code)) {
      duckHeld = false;
      event.preventDefault();
    }
  });

  // A key released while the tab loses focus never sends keyup. Let go of everything instead.
  window.addEventListener('blur', () => {
    jumpKeys.clear();
    duckHeld = false;
    jumpPressed = false;
    jumpReleased = true;
  });
  target.addEventListener('pointerdown', () => {
    // Creating/resuming the audio context needs a user gesture; the main loop does it too.
  });

  return {
    consume() {
      const frame = { actions, jumpPressed, jumpReleased, duck: duckHeld };
      actions = 0;
      jumpPressed = false;
      jumpReleased = false;
      return frame;
    },
    /** Forget a jump that started the game, so the title does not launch the turkey immediately. */
    clearJump() {
      jumpPressed = false;
      jumpReleased = true;
    },
    ducking() {
      return duckHeld;
    },
  };
}
