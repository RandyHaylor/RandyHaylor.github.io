# Game rules

## Map & movement

- 10 procedurally-generated dungeon levels.
- Grid-based, one cell per step, ~0.25s tweened transitions.
- Rotate 90° CCW/CW, step forward/backward.
- Entering an enemy room → combat starts.
  - `firstStrike` enemies get a free attack the same turn.
- Stairs cell + descend → next floor with black fade.
- Level-10 descend → **win sequence** (see architecture overview).

## Player

- 20 HP, no max-HP growth between levels.
- One weapon slot, one shield slot.
  - Picking up a different weapon / shield drops the previous one.
- Inventory: consumables (`Healing Herb`) + gold drops.
- Spare Torch in inventory auto-equips when the lit one runs out.

## Combat

- Attack: `F` key / Attack button / sword button on the d-pad.
- **Hit chance: 85%** flat.
- **Damage roll:** `ceil(atk/2) + ri(floor(atk/2)+1)`.
  - Min: `ceil(weapon.atk / 2)`. Max: `weapon.atk`.
  - Diamond Sword (atk 10) → 5–10. Fists (atk 2) → 1–2.
- Enemy hit chance: ~50% on lvl 1, +5%/floor (cap 90%). See `enemyHitChance`.
- Damage taken: `1 + ri(enemy.atk) - shield.dr` (clamped ≥ 0).
- Run: 60% chance to flee back one cell; otherwise enemy hits.
- Combat panel shows **no HP number** — phrase from `enemies/condition_phrases.json` keyed to the enemy's HP bracket.

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

- Each floor spawns exactly: 1 sword (by tier table), 1 shield (by tier table), 1 Torch.

## Torch

- 75–90 steps of life per pickup (random).
- Each step consumes 1 charge.
- < 10 charges → sprite + room light flicker.
- 0 charges → goes out.
  - Spare Torch in inventory → auto-equips after a brief darkness.
  - No spare → room dims to tight close-quarters lighting.

## Vendor

- Even floors only.
- Placed adjacent to player start cell, no wall between (always reachable without combat).
- Sells: Torch 10gp, Healing Herb 5gp.
- `V` on vendor cell → opens vendor UI. `B` → buy first item.

## Win / lose

- HP → 0: death overlay (`one more skeleton for my army…`) + Play Again.
- Final descend from lvl 10: black-screen typewriter ending + `Slumber and dream again…` (reloads page).
