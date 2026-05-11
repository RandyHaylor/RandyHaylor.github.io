# User interface

- Entirely in `index.html`: CSS at the top, DOM in body, JS swaps content / class state.
- Mode toggled by `body.landscape`, set by `fitWrapToViewport()` on resize / rotate / iOS URL-bar animations.

## Portrait

- `#wrap`: fixed 400×700 logical, CSS-transform scaled to viewport.
- Contents top → bottom:
  1. `#topHud` — dungeon lvl + HP strip.
  2. `#game` — three.js canvas + held-item HUD (`.hand.left` torch, `.hand.right` weapon) + damage flash + descend fade + low-HP red vignette.
  3. `#compass` — green dial, N/E/S/W labels, red needle.
  4. `#ui` — status grid + combat / inventory / room panels.
  5. `#movePanel` — `↺ ↑ ↻ / ↓ Open Door / ▼ stairs` button grid.

## Landscape

- 3-col grid: `[1fr UI] [gameW 3D] [80 buffer]`.
- `gameW = floor(vh × 4/3)` (3D stays 4:3 at viewport height).
- Left column: `#ui`, full height.
- Center: `#game`, full height. Floating D-pad bottom-right: `< ^ >` top row, `v` below, `I` + sword on sides.
- Right column: `#landscapeRightBuffer` (80px). Stack: HP block, mini compass, MAP, ?, WASD toggle. Hamburger in top-right tip.
- `#landscapeTitleBar` (GRID-A-IRON DUNGEON) shown only while `#startScreen` visible (via `:has(#startScreen:not([hidden]))`).

## Full-viewport overlays

- `#startScreen` — title + Enter + Mute (Enter unlocks audio).
- `#deathOverlay` — death message + Play Again.
- `#inventoryOverlay` / `#vendorOverlay` — items + use / buy.
- `#helpOverlay` — swipe arrows + tap-target sprite examples. Toggled by `?` in icon column.
- `#settingsOverlay` — music + sfx sliders + mute. Opened by hamburger.
- `#winSequenceOverlay` — black-screen typewriter ending. Direct child of `<body>` (not trapped in transformed `#wrap`).
- All `position:fixed; inset:0` in landscape so the narrow UI column doesn't clip them.

## In-world UI

- **Enemy speech bubbles** — `makeTextSprite()` canvas-text sprites parented to `scene` (survive re-renders).
  - Word-wrap at 360px line limit (no clipping).
  - Movements wrap in asterisks (`*scurries*`); speech plain.
- **Floor item labels** — `makeTextSprite()` over each item sprite. Raycastable for tap-pickup.
- **Stairs marker** — bobbing `Descend` text sprite + stairs hatch sprite. Raycastable for tap-descend.

## Input

- **Keyboard**: WASD/arrows move, `F` attack, `R` run, `I` inv, `T` take, `E` door, `Space` descend, `H` herb, `V` vendor, `B` buy.
- **Touch (portrait)**: on-screen movement buttons + tap on 3D view (raycast → pickup / attack / door).
- **Touch (landscape)**:
  - Swipe 3D view: up = forward, down = backward, left/right = turn.
  - Floating D-pad with hold-to-repeat.
  - Hold on empty 3D view → fires attack after 500ms (in combat).

## Audio cues

- Music: random track from `MUSIC_TRACKS`, fade-out tail, 3–8s gap between tracks.
- SFX:
  - footstep per tile traversed
  - sword swing per attack
  - damage_dealt at attack peak
  - damage_taken on player hit
  - gold / herb pickup
  - descend stairs
  - death sting on death
- Win typewriter: footstep SFX per non-space char (soft typewriter / measured walk feel).
