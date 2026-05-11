# Enemies

## Where data lives

- `enemies/pool.json` — spawn table. Single source of truth for who/where/how many/first-strike.
- `enemies/<name>.json` — per-enemy chatter. Shape: `{ "name", "phrases":[…30], "movements":[…20] }`.
  - Phrases: first-person speech.
  - Movements: short third-person actions (rendered with asterisks).
- `enemies/condition_phrases.json` — HP-bracket lines replacing the combat HP readout.
  - 5 brackets × 5 options. One comedic per bracket.
- `sprites/enemy_<name>.png` — 32×32 RGBA pixel art.
  - Evil Vendor reuses `sprites/npc_vendor.png` with runtime blue tint.

## Spawn-pool entry shape

```jsonc
{
  "name": "Cave Troll",
  "hp": 22,
  "atk": 6,
  "minLevel": 4,           // first floor it can appear on
  "maxLevel": 7,           // last floor (inclusive)
  "mincount": 1,           // OPTIONAL — guaranteed copies per floor
  "maxcount": 1,           // OPTIONAL — hard cap per floor
  "firstStrike": true      // OPTIONAL — free attack on cell-entry
}
```

## 3-pass spawn at level gen

1. **Mincount pass** — every entry with `mincount > 0` placed first (pool order, honoring `maxcount`).
2. **Variety pass** — one copy of every other eligible entry, so each species appears at least once.
3. **Random fill** — pad to per-floor budget `3 + level` with random eligible entries, skipping any at `maxcount`.

Result: lvl-9 floor reliably has 1 Demon Lord + 1 of each other eligible species + extras (not 10 random rolls).

## Current roster (lvl 1 → 10)

| Enemy            | HP | atk | min | max | first strike |
|------------------|----|-----|-----|-----|--------------|
| Giant Rat        | 5  | 2   | 1   | 3   |              |
| Slime            | 6  | 2   | 1   | 4   |              |
| Goblin           | 8  | 3   | 2   | 5   |              |
| Skeleton         | 12 | 4   | 2   | 5   |              |
| Vampire Bat      | 14 | 3   | 3   | 6   |              |
| Floating Eyeball | 8  | 8   | 3   | 6   | ✓            |
| Cave Troll       | 22 | 6   | 5   | 7   |              |
| Lich             | 30 | 7   | 6   | 10  |              |
| Shadow Fiend     | 28 | 8   | 5   | 8   |              |
| Wraith           | 24 | 9   | 8   | 10  | ✓            |
| Bone Knight      | 38 | 10  | 8   | 10  |              |
| Evil Vendor      | 40 | 7   | 7   | 7   | ✓ (mincount 1) |
| Bunny            | 40 | 9   | 8   | 8   | (mincount 1) |
| Demon Lord       | 55 | 11  | 9   | 9   | (mincount 1) |
| Dragon           | 90 | 14  | 10  | 10  | ✓ (mincount 1) |

- `enemies/pool.json` is canonical — if anything looks off, trust the file.

## Adding a new enemy

1. Add row to `enemies/pool.json` (min/max + optional first-strike/mincount/maxcount).
2. Add `enemies/<lowercase_name>.json` (30 phrases + 20 movements).
3. Add path to `ENEMY_PHRASE_FILE` in `index.html`.
4. Either:
   - drop `sprites/enemy_<name>.png` + add to `ENEMY_SPRITE_PATH`, **or**
   - build a canvas-text sprite in `ENEMY_SPRITE_FACTORY`.
5. Loader is loud-on-missing — skipping a step fails startup with a clear error.
