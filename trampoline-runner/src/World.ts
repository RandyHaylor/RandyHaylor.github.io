import type { GameConfig } from './types';
import { Player } from './entities/Player';
import { Trampoline } from './entities/Trampoline';
import { Coin } from './entities/Coin';
import { Enemy } from './entities/Enemy';
import { CollisionSystem } from './systems/CollisionSystem';
import { bounceVelocityFor } from './physics/bounce';

export class World {
  config: GameConfig;
  player: Player;
  trampolines: Trampoline[];
  coins: Coin[];
  enemies: Enemy[];
  score: number;

  constructor(config: GameConfig) {
    this.config = config;
    this.player = new Player(config.canvasWidth * 0.2, config.canvasHeight * 0.5);
    this.trampolines = [];
    this.coins = [];
    this.enemies = [];
    this.score = 0;
  }

  addTrampoline(x: number, y: number): void {
    this.trampolines.push(new Trampoline(x, y));
  }

  addCoin(x: number, y: number): void {
    this.coins.push(new Coin(x, y));
  }

  addEnemy(x: number, y: number): void {
    this.enemies.push(new Enemy(x, y));
  }

  update(dt: number): void {
    this.player.update(dt, this.config.gravity);

    for (const t of this.trampolines) {
      t.update(dt, this.config.scrollSpeed);
    }
    for (const c of this.coins) {
      c.update(dt, this.config.scrollSpeed);
    }
    for (const e of this.enemies) {
      e.update(dt, this.config.scrollSpeed);
    }

    // Bounce off trampolines
    const playerBounds = this.player.bounds();
    for (const t of this.trampolines) {
      if (CollisionSystem.aabb(playerBounds, t.bounds()) && this.player.vy > 0) {
        this.player.vy = -bounceVelocityFor(this.player.centerX(), t.bounds());
        this.player.y = t.y - Player.HEIGHT;
      }
    }

    // Collect coins
    this.coins = this.coins.filter(c => {
      if (CollisionSystem.aabb(playerBounds, c.bounds())) {
        this.score += 1;
        return false;
      }
      return true;
    });

    // Remove offscreen entities
    this.trampolines = this.trampolines.filter(t => !t.isOffScreen());
    this.coins = this.coins.filter(c => !c.isOffScreen());
    this.enemies = this.enemies.filter(e => !e.isOffScreen());
  }
}
