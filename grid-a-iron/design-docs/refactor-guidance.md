# Refactor guidance

Notes for an iterative, CD-style refactor of `index.html`. The game stays shippable after every step. No big-bang rewrites.

## North-star dream (aspirational, not required)

- Cleanly separate **engine** (generic systems) from **content** (this dungeon's specifics).
- Cleanly separate **game core** (state + rules, headless-runnable) from **UI** (three.js + DOM).
- Far enough that a different presentation layer — 2D overhead canvas, terminal text view, alternate native shell — could plug in without touching game rules.
- Treat that target as a compass, not a deadline. Stop when the cost outweighs the clarity gain.

## What is engine vs content

- **Engine** (no game-specific names):
  - Dungeon grid generation, neighbor / passage rules.
  - Grid movement + 90° rotation animations.
  - Turn-based combat resolution (hit-roll, damage-roll, run-roll).
  - Inventory + consumable use.
  - Loot drop / pickup mechanics.
  - 3-pass spawn algorithm (mincount → variety → random fill, honoring maxcount).
  - Chatter scheduler (phrase queue, idle-thought vs combat).
  - Torch step counter + flicker state machine.
  - Audio graph + SFX buffer cache.
  - Required-data loader contract (load loud, no fallbacks).
- **Content** (specific to *this* dungeon):
  - `enemies/pool.json`, every `enemies/*.json`, `npcs/*.json`.
  - `enemies/condition_phrases.json`.
  - Weapon / shield stat tables (currently inline; should move to JSON).
  - Vendor inventory + prices (currently inline).
  - Win-sequence text (currently inline as `WIN_SEQUENCE_TEXT`).
  - Sprite paths, music track list, sfx category map.
  - Start-screen / death-screen copy.

Rule of thumb: if reading the file makes you say *"oh that's the dragon"* or *"oh that's the win text"*, it's content. Pull it out.

## What is game core vs UI

- **Game core** (UI-agnostic, in principle headless-runnable):
  - `state` object mutations.
  - `newLevel(level)` and dungeon gen.
  - `tryMoveForward / Backward`, `rotate(delta)`.
  - `combatAttack`, `combatRun`, `enemyTurn`.
  - `pickUpItem`, `useConsumableByName`, `toggleDoor`, `descendStairs`.
  - `consumePlayerTorchStep`, `extinguishPlayerTorch`.
  - Spawn / loot / phrase-queue logic.
- **UI layer**:
  - `initThree()`, `renderVisibleRooms()`, `loop()`, `drawWall()`, `drawStairsMarker`.
  - `makeTextSprite`, `makeBillboardSprite`, `makeCanvasBillboardSprite`.
  - `refreshUI()` and everything it touches (DOM panels, HUD).
  - `fitWrapToViewport`, landscape grid math, all CSS.
  - Touch handlers, key handlers, overlay toggles.
  - HP bracket-phrase resolver (presentation concern only).

The key smell: game-core functions today directly call `renderVisibleRooms()`, `refreshUI()`, `playSfx(...)`. That's the coupling to dissolve.

## CD-style refactor — playable after every step

Each step is one PR / commit. Game must boot, be testable via local server + `?test=1` / `?test=2`, no visible regression. Don't combine steps.

Suggested order (each ≈ 30–60 min of focused work):

1. **Tag the seams.** Add JSDoc-style comments marking `// ENGINE`, `// CONTENT`, `// UI`, `// CORE` on every top-level function and constant. Zero behavior change. Makes the next steps mechanical.
2. **Move inline content tables to JSON.** `WEAPON_STATS`, `SHIELD_STATS`, the vendor inventory, `WIN_SEQUENCE_TEXT`, `MUSIC_TRACKS`, `SFX_BANK`, `FUNNY_SHARED_PHRASES`. Load them in `runMainStartup`'s `Promise.all`. Same loud-failure contract.
3. **Group code by tag.** Reorder `index.html` so all `// CONTENT` lives together, then `// ENGINE`, then `// UI`. Still one file. Pure cut/paste, no logic change.
4. **Introduce a small event bus.** A 30-line `gameEvents.on(name, fn)` / `gameEvents.emit(name, payload)`. Game-core functions emit (`'levelChanged'`, `'playerHpChanged'`, `'combatStarted'`, `'phrase'`, etc.). UI subscribes. Initially every emit is duplicated next to the existing direct UI call so nothing breaks.
5. **Cut direct UI calls one event at a time.** Once an event has a UI subscriber, delete the matching direct call from the game-core function. After each cut, smoke-test. Game core now only emits.
6. **Lift game core into a module.** Pull all `// CORE` code into a single `<script type="module">` (still in `index.html`, or split file). Export a small API: `core.move()`, `core.attack()`, `core.descend()`, `core.state` (read-only). UI imports and calls only that API + listens to events.
7. **Lift the UI renderer.** Same treatment — pull three.js + DOM into a render module. It owns the scene, subscribes to events, queries `core.state` on demand. From here on, the renderer is **swappable**.
8. **Optional later — write a second renderer.** A 2D overhead canvas view, or a textual one for tests, sharing the same core + events. Possible because steps 4–7 already removed the coupling.

## Rules to keep the refactor honest

- **No silent fallbacks.** The current loud-failure startup contract is non-negotiable through the refactor. If a step removes a required JSON, ship the new one too.
- **One step, one commit, one stable game.** No "this'll be broken for a few commits while I'm rewriting." If you can't keep it playable, the step is too big — split it.
- **Verify after every step.** Local server + playwright headless run. `?test=1` + `?test=2` must boot clean. Combat + descend + win still work.
- **Don't pre-abstract.** Only add an extension point when the second use case is right in front of you. The aspirational "2D mode" doesn't justify designing for it before step 8 — it justifies *not foreclosing* on it during steps 1–7.
- **Names earn their keep.** When you extract a function or constant, name it for the engine concept, not the current visual (e.g. `rollWeaponDamage`, not `rollSwordDamage`).
- **Resist "while I'm here" cleanup.** Bundle non-essential tidying into a separate commit at the end of the step. Mixed-purpose commits are how refactors quietly become rewrites.

## What this refactor is NOT

- Not a port to a framework. Single-file, no-build still wins for this size.
- Not an OOP / class-hierarchy redesign. Plain functions + plain data are fine.
- Not a perf project. If a step makes things slower without an immediate gameplay reason, revert.
- Not exhaustive — additional steps will appear once steps 1–3 are done and the shape of the code becomes obvious.
