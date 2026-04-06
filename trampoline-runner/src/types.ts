export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface EntityState {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export interface GameConfig {
  gravity: number;
  scrollSpeed: number;
  canvasWidth: number;
  canvasHeight: number;
}
