# Architecture overview

- Single-file static web game. No build step, no framework, no bundler.
- Browser opens `index.html` → three.js loaded from unpkg via importmap → plain JS.

## Files

```
index.html               // all game code (one big module script)
enemies/
  pool.json              // level-gated spawn table (used by newLevel)
  condition_phrases.json // HP-bracket combat-panel lines
  <name>.json            // per-enemy chatter (30 phrases + 20 movements)
npcs/
  vendor.json            // same shape as an enemy chatter file
sprites/
  enemy_*.png            // 32×32 RGBA enemy sprites
  item_*.png             // floor + held-item sprites
  tex_*.png              // wall / floor / ceiling / door / decal textures
audio_files/             // mp3 music + sfx
design-docs/             // you are here
ENEMY_PLAN.md            // older planning doc, still useful
README.md                // user-facing readme + controls
```

## Startup contract (`runMainStartup` at bottom of script)

- All required JSON must load successfully before anything else.
  - `enemies/pool.json`
  - every entry in `ENEMY_PHRASE_FILE` / `NPC_PHRASE_FILE`
  - `enemies/condition_phrases.json`
- Any fetch 404 / malformed JSON → throw → full-screen red banner.
- **No fallback / stub data.**
- Order:
  1. `Promise.all` over required JSON loads.
  2. `initThree()` — renderer, scene, camera, lights.
  3. `newLevel(1)` — dungeon + 3-pass enemy spawn + sword/shield/torch.
  4. Test-mode hooks (`?test=1` / `?test=2`).
  5. `fitWrapToViewport()` + `attachGameTouchHandlers()`.
  6. `loop()` — `requestAnimationFrame` render loop.

## Layout (CSS)

Two modes driven by `body.landscape` (aspect > 2:1).

- **Portrait** — `#wrap` 400×700 logical, scaled via CSS transform.
  Top→bottom: `#game` (canvas + held items) → `#ui` (status + panels)
  → `#movePanel` buttons.
- **Landscape** — `#wrap` is a 3-col grid: `[1fr UI] [gameW 3D] [80 buffer]`.
  `gameW = floor(vh × 4/3)`. Right buffer holds compass + MAP / ? / WASD.
  Floating on-screen D-pad in bottom-right of `#game`.

## Overlays

- `#startScreen`, `#deathOverlay`, `#inventoryOverlay`, `#helpOverlay`,
  `#winSequenceOverlay`, etc. — siblings of `#wrap` or `position:fixed`
  in landscape so they cover the viewport regardless of mode.

## Data flow

- `state` — single global. Player, level, combat, animation, dungeon.
- Dungeon: `state.dungeon.cells[y][x].walls[4]`.
  - Each wall: `{type:'wall'|'door'|'open', ...}`.
  - Doors: `open` bool + `variantIndex` (which of 3 door textures).
  - Wall faces cache `decalIndex` so random decals stay stable across re-renders.
- `renderVisibleRooms()` — rebuilds current room + visible neighbors on move/rotate.
  - Enemy sprites + item billboards parented to `dungeonGroup`.
  - Phrase bubbles parented to `scene` (survive re-renders).

## Audio

- Web Audio API: gain nodes for music + sfx.
- SFX pre-decoded into `AudioBuffer`s once `audioCtx` exists.
- `playSfx()` creates fresh `BufferSource` per fire → `sfxGainNode`.
  - Works on iOS where `new Audio(path).play()` outside the user-gesture chain silently fails.
- Context auto-suspends on tab background → `visibilitychange` + `focus`
  listener resumes it on return.

## Win condition

- `descendStairs()` checks `state.level >= FINAL_LEVEL` (10).
- Final descend sequence:
  1. Stair fade (1.5s).
  2. GUI containers fade opacity → 0.
  3. Music gain fades → 0.
  4. Typewriter overlay draws ending text one char at a time (footstep SFX per non-space).
- `?test=1` → first descend triggers the same flow.
- `?test=2` → jumps directly to the win overlay.
