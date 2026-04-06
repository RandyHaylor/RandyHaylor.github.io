import type { Rect } from '../types';

export class Coin {
  static readonly WIDTH = 24;
  static readonly HEIGHT = 24;

  x: number;
  y: number;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  bounds(): Rect {
    return { x: this.x, y: this.y, width: Coin.WIDTH, height: Coin.HEIGHT };
  }

  update(dt: number, scrollSpeed: number): void {
    this.x -= scrollSpeed * dt;
  }

  isOffScreen(): boolean {
    return this.x + Coin.WIDTH < 0;
  }
}
