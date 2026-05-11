# Architecture overview

A single-file static web game. The deploy is whatever sits in this repo
plus the `enemies/`, `npcs/`, and `sprites/` folders. No build step, no
framework, no bundler. Browser opens `index.html`, three.js loads from
unpkg via an importmap, the rest is plain JS.

## Files at a glance

```
index.html               // all game code (one big module script)
enemies/
  pool.json              // level-gated spawn table (the data behind newLevel)
  condition_phrases.json // HP-bracket flavor lines for the combat panel
  <name>.json            // per-enemy phrases + movements (chatter bubbles)
npcs/
  vendor.json            // same shape as an enemy chatter file
sprites/
  enemy_*.png            // 32x32 RGBA enemy sprites
  item_*.png             // floor + held-item sprites
  tex_*.png              // wall / floor / ceiling / door / decal textures
audio_files/             // mp3 music + sfx (paths assembled at runtime)
design-docs/             // you are here
ENEMY_PLAN.md            // older planning doc — still useful background
README.md                // user-facing readme + controls
```

## Startup contract

`index.html` boots through `runMainStartup()` at the very bottom of the
script. The contract is strict on purpose: every required JSON file
(`enemies/pool.json`, every entry in `ENEMY_PHRASE_FILE` /
`NPC_PHRASE_FILE`, and `enemies/condition_phrases.json`) must load
successfully before anything else runs. If any fetch 404s or returns
malformed JSON the loader throws and a full-screen red banner shows the
underlying error. The game does **not** start with fallback / stub data.

Order inside `runMainStartup`:

1. `Promise.all` over all required JSON loads.
2. `initThree()` — renderer, scene, camera, lights.
3. `newLevel(1)` — generate dungeon, place enemies (3-pass spawn),
   pick floor sword + shield + torch.
4. Test-mode hooks if `?test=1` or `?test=2` in the URL.
5. `fitWrapToViewport()` + `attachGameTouchHandlers()`.
6. `loop()` — `requestAnimationFrame` render loop.

## Layout (CSS)

There are two big modes driven by `body.landscape` (set by
`fitWrapToViewport` when viewport aspect > 2:1):

- **Portrait** — `#wrap` is a fixed 400×700 logical area scaled to the
  visible viewport via CSS transform. Inside: `#game` on top (3D
  canvas + held-item HUD), then `#ui` (status grid + combat / inventory
  panels), then the `#movePanel` button grid below.
- **Landscape** — `#wrap` becomes a CSS grid (`[1fr UI] [gameW 3D]
  [80 buffer]`). The UI panel resizes to fit; the 3D viewport stays at
  the 4:3 ratio derived from viewport height; the right buffer holds
  the compass + MAP / ? / WASD buttons. A separate on-screen D-pad is
  toggled into the bottom-right of `#game`.

Full-screen overlays (`#startScreen`, `#deathOverlay`, `#inventoryOverlay`,
`#helpOverlay`, `#winSequenceOverlay`, etc.) live as siblings of `#wrap`
or are upgraded to `position:fixed` in landscape so they cover the
viewport regardless of mode.

## Data flow

- `state` is a single global object holding the player, current level,
  combat state, animation state, dungeon grid, etc.
- The dungeon is `state.dungeon.cells[y][x]` with `walls[4]` per cell.
  Each wall is `{type:'wall'|'door'|'open', ...}`. Doors carry an
  `open` boolean and a `variantIndex` (which of the 3 door textures
  to use). Wall faces cache a `decalIndex` so the random decal stays
  stable across re-renders.
- `renderVisibleRooms()` rebuilds the player's current room + visible
  neighbors each move / rotate. Enemy sprites and item billboards are
  parented to `dungeonGroup`. Phrase bubbles are parented to `scene`
  so they survive re-renders.

## Audio

Web Audio API via gain nodes (music + sfx). SFX are pre-decoded into
`AudioBuffer`s once `audioCtx` exists; `playSfx()` creates a fresh
`BufferSource` per fire and connects it to `sfxGainNode`. This works on
iOS where `new Audio(path).play()` outside the user gesture chain
silently fails.

The context auto-suspends when the tab backgrounds; a
`visibilitychange` + `focus` listener resumes it on return.

## Win condition

`descendStairs()` checks `state.level >= FINAL_LEVEL` (10). On the
final descend the stair fade runs, then GUI containers fade to 0
opacity, then music fades, then the typewriter overlay draws the
ending text one character at a time. `?test=1` short-circuits this so
the very first descend triggers the same flow. `?test=2` jumps directly
into the win overlay.
