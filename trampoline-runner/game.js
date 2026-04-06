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
    this.worldGen = null;
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
    if (this.worldGen) {
      const entities = this.worldGen.getEntitiesInView(
        this.cameraX,
        this.cameraY,
        this.config.canvasWidth,
        this.config.canvasHeight
      );
      this.trampolines = entities.trampolines.map(
        (t) => new Trampoline(t.x, t.y, t.width)
      );
      this.coins = entities.coins.filter((p) => !this.collectedCoins.has(this.coinKey(p.x, p.y))).map((p) => new Coin(p.x, p.y));
      this.enemies = entities.enemies.map((p) => new Enemy(p.x, p.y));
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
        if (this.worldGen) {
          this.worldGen.collectCoin(c.x, c.y);
        }
        return false;
      }
      return true;
    });
    if (!this.worldGen) {
      this.trampolines = this.trampolines.filter((t) => !t.isFarBehind(this.player.x));
      this.coins = this.coins.filter((c) => !c.isFarBehind(this.player.x));
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

// trampoline-runner/src/math/HashRandom.ts
function hashRandom(x, y) {
  let h = x * 374761393 + y * 668265263 | 0;
  h = Math.imul(h ^ h >>> 13, 1274126177);
  h = Math.imul(h ^ h >>> 16, 1911520717);
  h = h ^ h >>> 13;
  return (h >>> 0) / 4294967296;
}

// trampoline-runner/src/systems/WorldGen.ts
var CHANNEL_OFFSET = {
  trampolines: 0,
  coins: 1,
  enemies: 2
};
var WorldGen = class {
  constructor(config, collectedCoins) {
    this.cellSize = config.cellSize ?? 100;
    this.configs = {
      trampolines: config.trampolines,
      coins: config.coins,
      enemies: config.enemies
    };
    this.collectedCoins = collectedCoins ?? /* @__PURE__ */ new Set();
  }
  hash(gridX, gridY, type) {
    return hashRandom(gridX * 3 + CHANNEL_OFFSET[type], gridY);
  }
  shouldSpawn(gridX, gridY, type) {
    const config = this.configs[type];
    const h = this.hash(gridX, gridY, type);
    if (h >= config.chance) return false;
    const r = config.minSpacing;
    for (let dx = -r; dx <= r; dx++) {
      for (let dy = -r; dy <= r; dy++) {
        if (dx === 0 && dy === 0) continue;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > r) continue;
        const nx = gridX + dx;
        const ny = gridY + dy;
        const nh = this.hash(nx, ny, type);
        if (nh < config.chance && nh > h) {
          return false;
        }
      }
    }
    return true;
  }
  getEntitiesInView(cameraX, cameraY, viewportWidth, viewportHeight) {
    const bufferX = viewportWidth * 0.25;
    const bufferY = viewportHeight * 0.25;
    const left = cameraX - bufferX;
    const right = cameraX + viewportWidth + bufferX;
    const top = cameraY - bufferY;
    const bottom = cameraY + viewportHeight + bufferY;
    const minGX = Math.floor(left / this.cellSize);
    const maxGX = Math.floor(right / this.cellSize);
    const minGY = Math.floor(top / this.cellSize);
    const maxGY = Math.floor(bottom / this.cellSize);
    const result = {
      trampolines: [],
      coins: [],
      enemies: []
    };
    for (let gx = minGX; gx <= maxGX; gx++) {
      for (let gy = minGY; gy <= maxGY; gy++) {
        const worldX = gx * this.cellSize;
        const worldY = gy * this.cellSize;
        if (this.shouldSpawn(gx, gy, "trampolines")) {
          const cfg = this.configs.trampolines;
          let width = this.cellSize;
          if (cfg.sizeRange) {
            const sizeHash = hashRandom(gx * 3 + 10, gy);
            width = cfg.sizeRange.min + sizeHash * (cfg.sizeRange.max - cfg.sizeRange.min);
          }
          result.trampolines.push({ x: worldX, y: worldY, width });
        }
        if (this.shouldSpawn(gx, gy, "coins")) {
          const key = `${gx},${gy}`;
          if (!this.collectedCoins.has(key)) {
            result.coins.push({ x: worldX, y: worldY });
          }
        }
        if (this.shouldSpawn(gx, gy, "enemies")) {
          result.enemies.push({ x: worldX, y: worldY });
        }
      }
    }
    return result;
  }
  collectCoin(x, y) {
    const gx = Math.round(x / this.cellSize);
    const gy = Math.round(y / this.cellSize);
    this.collectedCoins.add(`${gx},${gy}`);
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
  world.worldGen = new WorldGen({
    cellSize: 100,
    trampolines: { chance: 0.3, minSpacing: 2, sizeRange: { min: 80, max: 300 } },
    coins: { chance: 0.2, minSpacing: 1 },
    enemies: { chance: 0.1, minSpacing: 3 }
  });
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
