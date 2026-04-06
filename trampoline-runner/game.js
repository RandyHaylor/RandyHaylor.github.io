// trampoline-runner/src/entities/Player.ts
var Player = class _Player {
  static {
    this.WIDTH = 40;
  }
  static {
    this.HEIGHT = 60;
  }
  static {
    this.MOVE_SPEED = 300;
  }
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
  }
  bounds() {
    return { x: this.x, y: this.y, width: _Player.WIDTH, height: _Player.HEIGHT };
  }
  centerX() {
    return this.x + _Player.WIDTH / 2;
  }
  centerY() {
    return this.y + _Player.HEIGHT / 2;
  }
  moveLeft() {
    this.vx = -_Player.MOVE_SPEED;
  }
  moveRight() {
    this.vx = _Player.MOVE_SPEED;
  }
  stopHorizontal() {
    this.vx = 0;
  }
  update(dt, gravity) {
    this.vy += gravity * dt;
    this.y += this.vy * dt;
    this.x += this.vx * dt;
  }
};

// trampoline-runner/src/entities/Trampoline.ts
var Trampoline = class _Trampoline {
  static {
    this.WIDTH = 200;
  }
  static {
    this.HEIGHT = 20;
  }
  constructor(x, y, width = _Trampoline.WIDTH) {
    this.x = x;
    this.y = y;
    this.width = width;
  }
  bounds() {
    return { x: this.x, y: this.y, width: this.width, height: _Trampoline.HEIGHT };
  }
  isFarBehind(playerX) {
    return this.x + this.width < playerX - 1e3;
  }
};

// trampoline-runner/src/entities/Coin.ts
var Coin = class _Coin {
  static {
    this.WIDTH = 24;
  }
  static {
    this.HEIGHT = 24;
  }
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }
  bounds() {
    return { x: this.x, y: this.y, width: _Coin.WIDTH, height: _Coin.HEIGHT };
  }
  isFarBehind(playerX) {
    return this.x + _Coin.WIDTH < playerX - 1e3;
  }
};

// trampoline-runner/src/entities/Enemy.ts
var FLOAT_SPEED = 2;
var FLOAT_AMPLITUDE = 15;
var Enemy = class _Enemy {
  static {
    this.WIDTH = 40;
  }
  static {
    this.HEIGHT = 40;
  }
  static {
    this.FLOAT_AMPLITUDE = FLOAT_AMPLITUDE;
  }
  constructor(x, y) {
    this.x = x;
    this.baseY = y;
    this.phase = x * 0.05;
    this.elapsed = 0;
    this.y = y;
  }
  update(dt) {
    this.elapsed += dt;
    this.y = this.baseY + Math.sin(this.elapsed * FLOAT_SPEED + this.phase) * FLOAT_AMPLITUDE;
  }
  bounds() {
    return { x: this.x, y: this.y, width: _Enemy.WIDTH, height: _Enemy.HEIGHT };
  }
  isFarBehind(playerX) {
    return this.x + _Enemy.WIDTH < playerX - 1e3;
  }
};

// trampoline-runner/src/systems/CollisionSystem.ts
var CollisionSystem = class {
  static aabb(a, b) {
    return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
  }
};

// trampoline-runner/src/physics/bounce.ts
var MAX_BOUNCE_VELOCITY = 800;
var MIN_BOUNCE_VELOCITY = 300;
function bounceVelocityFor(playerCenterX, trampoline) {
  const trampolineCenterX = trampoline.x + trampoline.width / 2;
  const halfWidth = trampoline.width / 2;
  const t = Math.min(Math.abs(playerCenterX - trampolineCenterX) / halfWidth, 1);
  return MAX_BOUNCE_VELOCITY + t * (MIN_BOUNCE_VELOCITY - MAX_BOUNCE_VELOCITY);
}

// trampoline-runner/src/World.ts
var World = class {
  constructor(config) {
    this.config = config;
    this.player = new Player(config.canvasWidth * 0.2, config.canvasHeight * 0.5);
    this.trampolines = [];
    this.trampolineField = null;
    this.coinField = null;
    this.enemyField = null;
    this.coins = [];
    this.enemies = [];
    this.score = 0;
    this.cameraX = 0;
    this.cameraY = 0;
    this.collectedCoins = /* @__PURE__ */ new Set();
  }
  addTrampoline(x, y) {
    this.trampolines.push(new Trampoline(x, y));
  }
  addCoin(x, y) {
    this.coins.push(new Coin(x, y));
  }
  addEnemy(x, y) {
    this.enemies.push(new Enemy(x, y));
  }
  coinKey(x, y) {
    return `${x},${y}`;
  }
  update(dt) {
    this.player.update(dt, this.config.gravity);
    if (this.trampolineField) {
      this.trampolines = this.trampolineField.getTrampolinesInView(
        this.cameraX,
        this.cameraY,
        this.config.canvasWidth,
        this.config.canvasHeight
      );
    }
    if (this.coinField) {
      const coinPositions = this.coinField.getEntitiesInView(
        this.cameraX,
        this.cameraY,
        this.config.canvasWidth,
        this.config.canvasHeight
      );
      this.coins = coinPositions.filter((p) => !this.collectedCoins.has(this.coinKey(p.x, p.y))).map((p) => new Coin(p.x, p.y));
    }
    if (this.enemyField) {
      const enemyPositions = this.enemyField.getEntitiesInView(
        this.cameraX,
        this.cameraY,
        this.config.canvasWidth,
        this.config.canvasHeight
      );
      this.enemies = enemyPositions.map((p) => new Enemy(p.x, p.y));
    }
    for (const enemy of this.enemies) {
      enemy.update(dt);
    }
    const playerBounds = this.player.bounds();
    for (const t of this.trampolines) {
      if (CollisionSystem.aabb(playerBounds, t.bounds()) && this.player.vy > 0) {
        this.player.vy = -bounceVelocityFor(this.player.centerX(), t.bounds());
        this.player.y = t.y - Player.HEIGHT;
      }
    }
    this.coins = this.coins.filter((c) => {
      if (CollisionSystem.aabb(playerBounds, c.bounds())) {
        this.score += 1;
        this.collectedCoins.add(this.coinKey(c.x, c.y));
        return false;
      }
      return true;
    });
    if (!this.trampolineField) {
      this.trampolines = this.trampolines.filter((t) => !t.isFarBehind(this.player.x));
    }
    if (!this.coinField) {
      this.coins = this.coins.filter((c) => !c.isFarBehind(this.player.x));
    }
    if (!this.enemyField) {
      this.enemies = this.enemies.filter((e) => !e.isFarBehind(this.player.x));
    }
  }
};

// trampoline-runner/src/GameLoop.ts
var GameLoop = class {
  constructor(world) {
    this.world = world;
    this.elapsed = 0;
  }
  tick(dt) {
    this.elapsed += dt;
    this.world.update(dt);
    return this.world;
  }
};

// trampoline-runner/src/math/PerlinNoise.ts
var PerlinNoise = class {
  constructor(seed) {
    this.perm = this.buildPermutation(seed);
  }
  /** Returns a noise value in [-1, 1] for the given 2D coordinates. */
  noise2D(x, y) {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const xf = x - xi;
    const yf = y - yi;
    const u = this.fade(xf);
    const v = this.fade(yf);
    const aa = this.hash(xi, yi);
    const ab = this.hash(xi, yi + 1);
    const ba = this.hash(xi + 1, yi);
    const bb = this.hash(xi + 1, yi + 1);
    const g00 = this.grad(aa, xf, yf);
    const g10 = this.grad(ba, xf - 1, yf);
    const g01 = this.grad(ab, xf, yf - 1);
    const g11 = this.grad(bb, xf - 1, yf - 1);
    const x0 = this.lerp(g00, g10, u);
    const x1 = this.lerp(g01, g11, u);
    return this.lerp(x0, x1, v);
  }
  /** Quintic fade curve: 6t^5 - 15t^4 + 10t^3 */
  fade(t) {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }
  /** Linear interpolation */
  lerp(a, b, t) {
    return a + t * (b - a);
  }
  /** Hash 2D integer coords to a permutation value */
  hash(ix, iy) {
    const x = (ix % 256 + 256) % 256;
    const y = (iy % 256 + 256) % 256;
    return this.perm[(this.perm[x] + y) % 256];
  }
  /** Compute gradient dot product using hash to select from 4 gradients */
  grad(hash, dx, dy) {
    switch (hash & 3) {
      case 0:
        return dx + dy;
      case 1:
        return -dx + dy;
      case 2:
        return dx - dy;
      case 3:
        return -dx - dy;
      default:
        return 0;
    }
  }
  /** Build a seeded permutation table using a simple LCG PRNG */
  buildPermutation(seed) {
    const perm = new Uint8Array(256);
    for (let i = 0; i < 256; i++) perm[i] = i;
    let s = seed >>> 0;
    for (let i = 255; i > 0; i--) {
      s = s * 1664525 + 1013904223 >>> 0;
      const j = s % (i + 1);
      const tmp = perm[i];
      perm[i] = perm[j];
      perm[j] = tmp;
    }
    return perm;
  }
};

// trampoline-runner/src/systems/TrampolineField.ts
var CELL_SIZE = 250;
var NOISE_THRESHOLD = 0.1;
var MIN_WIDTH = 80;
var MAX_WIDTH = 300;
var NOISE_SCALE = 0.05;
var TrampolineField = class {
  constructor(seed, canvasWidth, canvasHeight) {
    this.noise = new PerlinNoise(seed);
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
  }
  getTrampolinesInView(cameraX, cameraY, viewportWidth, viewportHeight) {
    const buffer = viewportWidth * 0.25;
    const left = cameraX - buffer;
    const right = cameraX + viewportWidth + buffer;
    const top = cameraY - buffer;
    const bottom = cameraY + viewportHeight + buffer;
    const cellLeft = Math.floor(left / CELL_SIZE);
    const cellRight = Math.floor(right / CELL_SIZE);
    const cellTop = Math.floor(top / CELL_SIZE);
    const cellBottom = Math.floor(bottom / CELL_SIZE);
    const trampolines = [];
    for (let cx = cellLeft; cx <= cellRight; cx++) {
      for (let cy = cellTop; cy <= cellBottom; cy++) {
        const noiseVal = this.noise.noise2D(cx * NOISE_SCALE, cy * NOISE_SCALE);
        if (noiseVal > NOISE_THRESHOLD) {
          const t = (noiseVal - NOISE_THRESHOLD) / (1 - NOISE_THRESHOLD);
          const width = MIN_WIDTH + t * (MAX_WIDTH - MIN_WIDTH);
          const x = cx * CELL_SIZE;
          const y = cy * CELL_SIZE;
          trampolines.push(new Trampoline(x, y, width));
        }
      }
    }
    return trampolines;
  }
};

// trampoline-runner/src/systems/EntityField.ts
var CELL_SIZE2 = 200;
var NOISE_SCALE2 = 0.08;
var NOISE_OFFSET = 1e3;
var COIN_THRESHOLD = 0.05;
var ENEMY_THRESHOLD = 0.25;
var EntityField = class {
  constructor(seed, canvasWidth, canvasHeight, entityType) {
    this.noise = new PerlinNoise(seed);
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.entityType = entityType;
    this.threshold = entityType === "coin" ? COIN_THRESHOLD : ENEMY_THRESHOLD;
  }
  getEntitiesInView(cameraX, cameraY, viewportWidth, viewportHeight) {
    const buffer = viewportWidth * 0.25;
    const left = cameraX - buffer;
    const right = cameraX + viewportWidth + buffer;
    const top = cameraY - buffer;
    const bottom = cameraY + viewportHeight + buffer;
    const cellLeft = Math.floor(left / CELL_SIZE2);
    const cellRight = Math.floor(right / CELL_SIZE2);
    const cellTop = Math.floor(top / CELL_SIZE2);
    const cellBottom = Math.floor(bottom / CELL_SIZE2);
    const entities = [];
    for (let cx = cellLeft; cx <= cellRight; cx++) {
      for (let cy = cellTop; cy <= cellBottom; cy++) {
        const noiseVal = this.noise.noise2D(
          cx * NOISE_SCALE2 + NOISE_OFFSET,
          cy * NOISE_SCALE2 + NOISE_OFFSET
        );
        if (noiseVal > this.threshold) {
          entities.push({
            x: cx * CELL_SIZE2,
            y: cy * CELL_SIZE2
          });
        }
      }
    }
    return entities;
  }
};

// trampoline-runner/src/renderer/Renderer.ts
var Renderer = class {
  constructor(ctx) {
    this.ctx = ctx;
  }
  render(world, camera) {
    const { width, height } = this.ctx.canvas;
    this.ctx.clearRect(0, 0, width, height);
    this.ctx.fillStyle = "#87CEEB";
    this.ctx.fillRect(0, 0, width, height);
    this.ctx.fillStyle = "#4CAF50";
    for (const t of world.trampolines) {
      this.ctx.fillRect(camera.worldToScreen(t.x), camera.worldToScreenY(t.y), t.width, Trampoline.HEIGHT);
    }
    this.ctx.fillStyle = "#FFD700";
    for (const c of world.coins) {
      this.ctx.fillRect(camera.worldToScreen(c.x), camera.worldToScreenY(c.y), Coin.WIDTH, Coin.HEIGHT);
    }
    this.ctx.fillStyle = "#FF0000";
    for (const e of world.enemies) {
      this.ctx.fillRect(camera.worldToScreen(e.x), camera.worldToScreenY(e.y), Enemy.WIDTH, Enemy.HEIGHT);
    }
    this.ctx.fillStyle = "#2196F3";
    this.ctx.fillRect(camera.worldToScreen(world.player.x), camera.worldToScreenY(world.player.y), Player.WIDTH, Player.HEIGHT);
    this.ctx.fillStyle = "#FFFFFF";
    this.ctx.font = "24px sans-serif";
    this.ctx.fillText(`Score: ${world.score}`, 16, 36);
  }
};

// trampoline-runner/src/Camera.ts
var Camera = class {
  constructor(viewportWidth, viewportHeight = 0) {
    this.viewportWidth = viewportWidth;
    this.viewportHeight = viewportHeight;
    this.x = 0;
    this.y = 0;
  }
  follow(playerCenterX, playerCenterY) {
    const leftBound = this.x + this.viewportWidth / 3;
    const rightBound = this.x + 2 * this.viewportWidth / 3;
    if (playerCenterX < leftBound) {
      this.x -= leftBound - playerCenterX;
    } else if (playerCenterX > rightBound) {
      this.x += playerCenterX - rightBound;
    }
    if (playerCenterY !== void 0 && this.viewportHeight > 0) {
      const topBound = this.y + this.viewportHeight / 3;
      const bottomBound = this.y + 2 * this.viewportHeight / 3;
      if (playerCenterY < topBound) {
        this.y -= topBound - playerCenterY;
      } else if (playerCenterY > bottomBound) {
        this.y += playerCenterY - bottomBound;
      }
    }
  }
  worldToScreen(worldX) {
    return worldX - this.x;
  }
  worldToScreenY(worldY) {
    return worldY - this.y;
  }
};

// trampoline-runner/src/systems/InputSystem.ts
var LEFT_KEYS = /* @__PURE__ */ new Set(["ArrowLeft", "KeyA"]);
var RIGHT_KEYS = /* @__PURE__ */ new Set(["ArrowRight", "KeyD"]);
var InputSystem = class {
  constructor(player) {
    this.player = player;
    this.held = /* @__PURE__ */ new Set();
  }
  keyDown(code) {
    this.held.add(code);
    this.resolve();
  }
  keyUp(code) {
    this.held.delete(code);
    this.resolve();
  }
  resolve() {
    const left = [...this.held].some((k) => LEFT_KEYS.has(k));
    const right = [...this.held].some((k) => RIGHT_KEYS.has(k));
    if (left && !right) {
      this.player.moveLeft();
    } else if (right && !left) {
      this.player.moveRight();
    } else {
      this.player.stopHorizontal();
    }
  }
};

// trampoline-runner/src/main.ts
function startGame(canvas) {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not get 2d context");
  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener("resize", resize);
  const config = {
    gravity: 980,
    canvasWidth: canvas.width,
    canvasHeight: canvas.height
  };
  const world = new World(config);
  const gameLoop = new GameLoop(world);
  const trampolineField = new TrampolineField(12345, config.canvasWidth, config.canvasHeight);
  const coinField = new EntityField(54321, config.canvasWidth, config.canvasHeight, "coin");
  const enemyField = new EntityField(67890, config.canvasWidth, config.canvasHeight, "enemy");
  world.trampolineField = trampolineField;
  world.coinField = coinField;
  world.enemyField = enemyField;
  const camera = new Camera(config.canvasWidth, config.canvasHeight);
  const renderer = new Renderer(ctx);
  const input = new InputSystem(world.player);
  window.addEventListener("keydown", (e) => input.keyDown(e.code));
  window.addEventListener("keyup", (e) => input.keyUp(e.code));
  let lastTime = 0;
  function frame(time) {
    const dt = Math.min((time - lastTime) / 1e3, 0.05);
    lastTime = time;
    config.canvasWidth = canvas.width;
    config.canvasHeight = canvas.height;
    camera.follow(world.player.centerX(), world.player.centerY());
    world.cameraX = camera.x;
    world.cameraY = camera.y;
    gameLoop.tick(dt);
    renderer.render(world, camera);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame((time) => {
    lastTime = time;
    requestAnimationFrame(frame);
  });
}
export {
  startGame
};
