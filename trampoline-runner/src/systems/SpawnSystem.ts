import type { GameConfig } from '../types';
import { World } from '../World';

const TRAMPOLINE_INTERVAL = 300; // pixels between trampolines
const COIN_INTERVAL = 200; // pixels between coins
const ENEMY_INTERVAL = 600; // pixels between enemies

export class SpawnSystem {
  private config: GameConfig;
  private distanceTraveled: number;
  private lastTrampolineAt: number;
  private lastCoinAt: number;
  private lastEnemyAt: number;

  constructor(config: GameConfig) {
    this.config = config;
    this.distanceTraveled = 0;
    this.lastTrampolineAt = 0;
    this.lastCoinAt = 0;
    this.lastEnemyAt = 0;
  }

  update(world: World, dt: number): void {
    this.distanceTraveled += this.config.scrollSpeed * dt;

    if (this.distanceTraveled - this.lastTrampolineAt >= TRAMPOLINE_INTERVAL) {
      const y = this.config.canvasHeight * 0.6 + Math.random() * (this.config.canvasHeight * 0.3);
      world.addTrampoline(this.config.canvasWidth, y);
      this.lastTrampolineAt = this.distanceTraveled;
    }

    if (this.distanceTraveled - this.lastCoinAt >= COIN_INTERVAL) {
      const y = this.config.canvasHeight * 0.2 + Math.random() * (this.config.canvasHeight * 0.4);
      world.addCoin(this.config.canvasWidth, y);
      this.lastCoinAt = this.distanceTraveled;
    }

    if (this.distanceTraveled - this.lastEnemyAt >= ENEMY_INTERVAL) {
      const y = this.config.canvasHeight * 0.5 + Math.random() * (this.config.canvasHeight * 0.3);
      world.addEnemy(this.config.canvasWidth, y);
      this.lastEnemyAt = this.distanceTraveled;
    }
  }
}
