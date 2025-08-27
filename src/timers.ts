export type TickHandler = (msLeft: number) => void;
export type DoneHandler = () => void;

export class Countdown {
  private duration: number;
  private endTs = 0;
  private rafId = 0;
  private running = false;
  constructor(durationMs: number, private onTick: TickHandler, private onDone: DoneHandler) {
    this.duration = durationMs;
  }
  start() {
    if (this.running) return;
    this.endTs = performance.now() + this.duration;
    this.running = true;
    const loop = () => {
      if (!this.running) return;
      const msLeft = Math.max(0, this.endTs - performance.now());
      this.onTick(msLeft);
      if (msLeft <= 0) {
        this.running = false;
        this.onDone();
        return;
      }
      this.rafId = requestAnimationFrame(loop);
    };
    this.rafId = requestAnimationFrame(loop);
  }
  stop() {
    this.running = false;
    cancelAnimationFrame(this.rafId);
  }
}