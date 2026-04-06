import type { Rect } from '../types';

export class Player {
  static readonly WIDTH = 40;
  static readonly HEIGHT = 60;

  x: number;
  y: number;
  vx: number;
  vy: number;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
  }

  bounds(): Rect {
    return { x: this.x, y: this.y, width: Player.WIDTH, height: Player.HEIGHT };
  }

  centerX(): number {
    return this.x + Player.WIDTH / 2;
  }

  update(dt: number, gravity: number): void {
    this.vy += gravity * dt;
    this.y += this.vy * dt;
  }
}
