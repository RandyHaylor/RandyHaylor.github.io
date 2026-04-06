import { World } from './World';
import { GameLoop } from './GameLoop';
import { SpawnSystem } from './systems/SpawnSystem';
import { Renderer } from './renderer/Renderer';
import type { GameConfig } from './types';

export function startGame(canvas: HTMLCanvasElement): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get 2d context');

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  const config: GameConfig = {
    gravity: 980,
    scrollSpeed: 200,
    canvasWidth: canvas.width,
    canvasHeight: canvas.height,
  };

  const world = new World(config);
  const gameLoop = new GameLoop(world);
  const spawnSystem = new SpawnSystem(config);
  const renderer = new Renderer(ctx);

  // Place an initial trampoline under the player
  world.addTrampoline(config.canvasWidth * 0.1, config.canvasHeight * 0.7);

  let lastTime = 0;

  function frame(time: number) {
    const dt = Math.min((time - lastTime) / 1000, 0.05); // cap at 50ms
    lastTime = time;

    // Update config dimensions on resize
    config.canvasWidth = canvas.width;
    config.canvasHeight = canvas.height;

    spawnSystem.update(world, dt);
    gameLoop.tick(dt);
    renderer.render(world);

    requestAnimationFrame(frame);
  }

  requestAnimationFrame((time) => {
    lastTime = time;
    requestAnimationFrame(frame);
  });
}
