# User interface

The UI lives entirely in `index.html` — CSS at the top, the DOM tree
defines the panels, and JS swaps content / class state during play.

## Layout modes

Driven by `body.landscape`, set by `fitWrapToViewport()` whenever the
visual viewport changes (resize, orientation flip, iOS URL-bar
animation).

### Portrait

`#wrap` is a fixed 400×700 logical "screen" scaled to fit the viewport.
Contents top → bottom:

1. `#topHud` — dungeon level + HP strip at the top of the 3D view.
2. `#game` — three.js canvas, held-item HUD (`.hand.left` torch,
   `.hand.right` weapon), damage flash, descend fade, low-HP red
   vignette.
3. `#compass` — green dial top-right with N/E/S/W labels and a
   red needle.
4. `#ui` — status grid + combat / inventory / room info panels.
5. `#movePanel` — `↺ ↑ ↻ / ↓ Open Door / ▼ stairs` button grid.

### Landscape

3-column CSS grid `[1fr UI] [gameW 3D] [80 buffer]`. `gameW` is
`floor(vh × 4 / 3)`, so the 3D view stays 4:3 at viewport height.

- **Left column** — the same `#ui` panel, full height.
- **Center column** — `#game`, full height, with floating on-screen
  D-pad in the bottom-right (`<` `^` `>` row, `v` below, `I` /
  sword to the sides).
- **Right column** — `#landscapeRightBuffer` 80px wide, stacking
  HP block, mini compass, `MAP`, `?`, `WASD` toggle buttons. A
  hamburger button sits in the top-right tip of the column.

The landscape title bar (`#landscapeTitleBar`) shows GRID-A-IRON
DUNGEON across the top **only while the start screen is up** (via
`:has(#startScreen:not([hidden]))`).

## Overlays (full-viewport)

- `#startScreen` — title + Enter button + Mute (also unlocks audio
  on first gesture).
- `#deathOverlay` — death message + Play Again.
- `#inventoryOverlay` / `#vendorOverlay` — list of items + use / buy
  buttons.
- `#helpOverlay` — how-to-play with swipe arrows + tap-target sprite
  examples (slime, sword, herb). Toggled by `?` on the icon column.
- `#settingsOverlay` — music + sfx sliders + mute. Opened by the
  hamburger button.
- `#winSequenceOverlay` — black-screen typewriter ending. Lives as a
  direct child of `<body>` so it's not trapped inside the transformed
  `#wrap`.

Most of these are sized `position:fixed; inset:0` in landscape so the
narrow `#ui` column doesn't clip them.

## In-world UI

- **Enemy speech bubbles** — `makeTextSprite()` builds canvas-text
  sprites parented to the scene (not the dungeon group) so they
  survive room rebuilds. Long lines auto word-wrap to a 360px line
  limit instead of clipping. Movements (`*scurries*`) wrap in
  asterisks; speech is plain.
- **Floor item labels** — same `makeTextSprite()` over each item
  sprite, raycastable for tap-to-pick-up.
- **Stairs marker** — bobbing `Descend` text sprite over the stairs
  hatch sprite. Raycastable for tap-to-descend.

## Input

- **Keyboard**: WASD / arrows for movement, `F` attack, `R` run,
  `I` inventory, `T` take, `E` door, `Space` descend, `H` herb,
  `V` vendor, `B` buy.
- **Touch (portrait)**: on-screen movement buttons + tap on the
  3D view (raycast picks up items / attacks enemies / opens doors).
- **Touch (landscape)**: swipe on the 3D view (up = forward,
  down = backward, left/right = turn), or use the floating D-pad
  with hold-to-repeat. Hold-on-empty-3D-view also fires attack
  after 500ms in combat.

## Audio cues

- Music: random track from `MUSIC_TRACKS`, fade-out tail + 3–8s gap
  before the next track.
- SFX: footstep on every tile traversed, sword swing per attack,
  damage_dealt at the player's attack peak, damage_taken on player
  hit, gold/herb pickup, descend stairs, death sting on death.
- The win typewriter plays a footstep per non-space character so it
  reads like a soft typewriter / measured walk.
