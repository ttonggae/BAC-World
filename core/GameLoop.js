export class GameLoop {
  constructor({ update, render, fixedStep = 1 / 60 }) {
    this.update = update;
    this.render = render;
    this.fixedStep = fixedStep;
    this.accumulator = 0;
    this.lastTime = 0;
    this.frameId = 0;
    this.running = false;
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    this.frameId = requestAnimationFrame(this.tick);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.frameId);
  }

  tick = (now) => {
    if (!this.running) return;

    const frameTime = Math.min((now - this.lastTime) / 1000, 0.1);
    this.lastTime = now;
    this.accumulator += frameTime;

    while (this.accumulator >= this.fixedStep) {
      this.update(this.fixedStep);
      this.accumulator -= this.fixedStep;
    }

    this.render(this.accumulator / this.fixedStep);
    this.frameId = requestAnimationFrame(this.tick);
  };
}
