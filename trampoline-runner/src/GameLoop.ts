import { World } from './World';

export class GameLoop {
  world: World;
  elapsed: number;

  constructor(world: World) {
    this.world = world;
    this.elapsed = 0;
  }

  tick(dt: number): World {
    this.elapsed += dt;
    this.world.update(dt);
    return this.world;
  }
}
