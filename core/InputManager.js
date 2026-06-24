const GAME_KEYS = new Set([
  "KeyA",
  "KeyD",
  "KeyW",
  "KeyS",
  "KeyJ",
  "KeyK",
  "KeyL",
  "KeyR",
  "Escape",
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  "ArrowDown",
  "Slash",
]);

export class InputManager {
  constructor(target = window) {
    this.down = new Set();
    this.pressed = new Set();
    this.released = new Set();
    target.addEventListener("keydown", this.handleKeyDown);
    target.addEventListener("keyup", this.handleKeyUp);
    target.addEventListener("blur", this.reset);
  }

  isDown(code) {
    return this.down.has(code);
  }

  wasPressed(code) {
    return this.pressed.has(code);
  }

  wasReleased(code) {
    return this.released.has(code);
  }

  endFrame() {
    this.pressed.clear();
    this.released.clear();
  }

  reset = () => {
    this.down.clear();
    this.pressed.clear();
    this.released.clear();
  };

  handleKeyDown = (event) => {
    if (GAME_KEYS.has(event.code)) event.preventDefault();
    if (!this.down.has(event.code)) this.pressed.add(event.code);
    this.down.add(event.code);
  };

  handleKeyUp = (event) => {
    if (GAME_KEYS.has(event.code)) event.preventDefault();
    this.down.delete(event.code);
    this.released.add(event.code);
  };
}
