import type { Rect } from '../types';

export class Trampoline {
  static readonly WIDTH = 200;
  static readonly HEIGHT = 20;

  x: number;
  y: number;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  bounds(): Rect {
    return { x: this.x, y: this.y, width: Trampoline.WIDTH, height: Trampoline.HEIGHT };
  }

  update(dt: number, scrollSpeed: number): void {
    this.x -= scrollSpeed * dt;
  }

  isOffScreen(): boolean {
    return this.x + Trampoline.WIDTH < 0;
  }
}
