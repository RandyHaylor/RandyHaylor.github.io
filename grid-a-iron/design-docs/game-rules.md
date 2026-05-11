# Game rules

## Map & movement

- 10 dungeon levels generated procedurally on entry. Each level is a
  randomized grid of rooms connected by walls / doors / open passages.
- Movement is grid-based, one cell at a time, with smoothed transitions
  (~0.25s tween). Player can rotate 90° CCW / CW or step forward /
  backward.
- Stepping into a room containing an enemy starts combat; a "first
  strike" enemy gets a free attack the same turn.
- Pressing descend on the stairs cell moves to the next floor with a
  black fade. Descending from level 10 triggers the **win sequence**
  (see architecture overview).

## Player

- 20 HP, no max-HP growth between levels.
- One weapon slot, one shield slot. Picking up a different weapon /
  shield drops the previous one onto the floor.
- Inventory holds consumables (only `Healing Herb` today) and gold
  drops. Carrying a Torch counts toward the lit torch when the current
  one runs out.

## Combat

- Player attacks with `F` key, attack button, or sword button on the
  d-pad.
- Hit chance: **85%** flat.
- Damage roll: `ceil(atk/2) + ri(floor(atk/2)+1)` — minimum is
  ceil(weapon.atk / 2), maximum is weapon.atk. Diamond Sword (atk 10)
  rolls 5–10; Fists (atk 2) rolls 1–2.
- Enemy hit chance starts ~50% and scales upward with floor depth
  (see `enemyHitChance` in code).
- Damage taken = `1 + ri(enemy.atk) - shield.dr` (clamped to ≥ 0).
- Run: 60% chance to flee one cell back, otherwise the enemy hits.

The combat panel does **not** show enemy HP numbers; instead it shows
a phrase keyed to the enemy's current HP-bracket (see
`enemies/condition_phrases.json`).

## Weapons & shields

| Item            | Effect | Spawned on lvl |
|-----------------|--------|----------------|
| Fists (default) | atk 2  | —              |
| Rusty Sword     | atk 3  | 1–3            |
| Iron Sword      | atk 5  | 4–6            |
| Steel Sword     | atk 7  | 6–8            |
| Diamond Sword   | atk 10 | 9–10           |
| Rusty Shield    | dr 1   | 1–3            |
| Iron Shield     | dr 2   | 4–6            |
| Steel Shield    | dr 3   | 6–8            |
| Diamond Shield  | dr 4   | 7–10           |

Each floor spawns exactly one sword and one shield (tier per the
table above) and exactly one Torch.

## Torch

- Each torch has 75–90 steps of life (random per pickup). Stepping
  consumes one charge.
- Below 10 charges the torch sprite and the room light flicker.
- At 0 charges the torch goes out. If the player carries a spare
  Torch in inventory it auto-equips after a brief darkness; otherwise
  the room dims to a tight close-quarters lighting mode.

## Vendor

- Spawns once on even-numbered floors only, somewhere adjacent to the
  player's start cell with no wall between (always reachable without
  combat).
- Sells torches (10gp) and herbs (5gp). Press `V` on the vendor cell
  to open the vendor UI; `B` buys the first item.

## Win / lose

- HP reaches 0 → death overlay with "one more skeleton for my army…"
  Play Again resets state and goes back to the start screen.
- Final descend from level 10 → black screen typewriter ending. A
  `Slumber and dream again…` button reloads the page.
