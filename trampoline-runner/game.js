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
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }
  bounds() {
    return { x: this.x, y: this.y, width: _Trampoline.WIDTH, height: _Trampoline.HEIGHT };
  }
  isFarBehind(playerX) {
    return this.x + _Trampoline.WIDTH < playerX - 1e3;
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
var Enemy = class _Enemy {
  static {
    this.WIDTH = 40;
  }
  static {
    this.HEIGHT = 40;
  }
  constructor(x, y) {
    this.x = x;
    this.y = y;
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
    this.coins = [];
    this.enemies = [];
    this.score = 0;
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
  update(dt) {
    this.player.update(dt, this.config.gravity);
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
        return false;
      }
      return true;
    });
    this.trampolines = this.trampolines.filter((t) => !t.isFarBehind(this.player.x));
    this.coins = this.coins.filter((c) => !c.isFarBehind(this.player.x));
    this.enemies = this.enemies.filter((e) => !e.isFarBehind(this.player.x));
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

// trampoline-runner/src/systems/SpawnSystem.ts
var TRAMPOLINE_INTERVAL = 300;
var COIN_INTERVAL = 200;
var ENEMY_INTERVAL = 600;
var SpawnSystem = class {
  constructor(config) {
    this.config = config;
    this.lastTrampolineSpawnX = 0;
    this.lastCoinSpawnX = 0;
    this.lastEnemySpawnX = 0;
  }
  update(world, _dt) {
    const playerX = world.player.x;
    if (playerX - this.lastTrampolineSpawnX >= TRAMPOLINE_INTERVAL) {
      const y = this.config.canvasHeight * 0.6 + Math.random() * (this.config.canvasHeight * 0.3);
      world.addTrampoline(playerX + this.config.canvasWidth, y);
      this.lastTrampolineSpawnX = playerX;
    }
    if (playerX - this.lastCoinSpawnX >= COIN_INTERVAL) {
      const y = this.config.canvasHeight * 0.2 + Math.random() * (this.config.canvasHeight * 0.4);
      world.addCoin(playerX + this.config.canvasWidth, y);
      this.lastCoinSpawnX = playerX;
    }
    if (playerX - this.lastEnemySpawnX >= ENEMY_INTERVAL) {
      const y = this.config.canvasHeight * 0.5 + Math.random() * (this.config.canvasHeight * 0.3);
      world.addEnemy(playerX + this.config.canvasWidth, y);
      this.lastEnemySpawnX = playerX;
    }
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
      this.ctx.fillRect(camera.worldToScreen(t.x), t.y, Trampoline.WIDTH, Trampoline.HEIGHT);
    }
    this.ctx.fillStyle = "#FFD700";
    for (const c of world.coins) {
      this.ctx.fillRect(camera.worldToScreen(c.x), c.y, Coin.WIDTH, Coin.HEIGHT);
    }
    this.ctx.fillStyle = "#FF0000";
    for (const e of world.enemies) {
      this.ctx.fillRect(camera.worldToScreen(e.x), e.y, Enemy.WIDTH, Enemy.HEIGHT);
    }
    this.ctx.fillStyle = "#2196F3";
    this.ctx.fillRect(camera.worldToScreen(world.player.x), world.player.y, Player.WIDTH, Player.HEIGHT);
    this.ctx.fillStyle = "#FFFFFF";
    this.ctx.font = "24px sans-serif";
    this.ctx.fillText(`Score: ${world.score}`, 16, 36);
  }
};

// trampoline-runner/src/Camera.ts
var Camera = class {
  constructor(viewportWidth) {
    this.viewportWidth = viewportWidth;
    this.x = 0;
  }
  follow(playerCenterX) {
    this.x = Math.max(0, playerCenterX - this.viewportWidth / 2);
  }
  worldToScreen(worldX) {
    return worldX - this.x;
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
  const spawnSystem = new SpawnSystem(config);
  const camera = new Camera(config.canvasWidth);
  const renderer = new Renderer(ctx);
  const input = new InputSystem(world.player);
  window.addEventListener("keydown", (e) => input.keyDown(e.code));
  window.addEventListener("keyup", (e) => input.keyUp(e.code));
  world.addTrampoline(config.canvasWidth * 0.1, config.canvasHeight * 0.7);
  let lastTime = 0;
  function frame(time) {
    const dt = Math.min((time - lastTime) / 1e3, 0.05);
    lastTime = time;
    config.canvasWidth = canvas.width;
    config.canvasHeight = canvas.height;
    spawnSystem.update(world, dt);
    gameLoop.tick(dt);
    camera.follow(world.player.centerX());
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
