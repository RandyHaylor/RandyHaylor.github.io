# Enemies

## Where the data lives

- `enemies/pool.json` — the spawn table. Single source of truth for who
  appears on which floors, in what numbers, and which ones get a first
  strike. See `architecture-overview.md` for how it's loaded.
- `enemies/<name>.json` — per-enemy chatter library. Shape:
  `{ "name": "...", "phrases": [...], "movements": [...] }`. Phrases
  are first-person speech; movements are short third-person actions
  (rendered with asterisks around them in-game). 30 phrases + 20
  movements per entry.
- `enemies/condition_phrases.json` — HP-bracket lines that replace
  the combat panel's HP readout (5 brackets, 5 options per bracket,
  one comedic per bracket).
- `sprites/enemy_<name>.png` — 32×32 RGBA pixel art. Evil Vendor
  reuses `sprites/npc_vendor.png` with a runtime blue tint.

## Spawn pool fields

```jsonc
{
  "name": "Cave Troll",
  "hp": 22,
  "atk": 6,
  "minLevel": 4,           // first floor it can appear on
  "maxLevel": 7,           // last floor (filter is inclusive)
  "mincount": 1,           // OPTIONAL — guaranteed copies per floor
  "maxcount": 1,           // OPTIONAL — hard cap per floor
  "firstStrike": true      // OPTIONAL — free attack on cell-entry
}
```

## 3-pass spawn at level generation

1. **Mincount pass.** Every entry with `mincount > 0` gets exactly that
   many copies placed first, in pool declaration order, honoring
   `maxcount`.
2. **Variety pass.** For every other eligible entry, place one copy
   so each species appears at least once.
3. **Random fill.** Pad up to the per-floor budget (`3 + level`)
   with random picks from any entry that hasn't hit its `maxcount`.

This means a level-9 floor reliably contains one Demon Lord + one of
each other eligible species + extras, rather than ten random rolls.

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

Numbers reflect `enemies/pool.json` at the time of writing — that file
is the canonical source if anything looks off.

## Adding a new enemy

1. Add a row to `enemies/pool.json` with min/max level and any
   first-strike / mincount / maxcount you want.
2. Add `enemies/<lowercase_name>.json` with 30 phrases + 20 movements.
3. Add the file path to `ENEMY_PHRASE_FILE` in `index.html`.
4. Either drop `sprites/enemy_<name>.png` and add the entry to
   `ENEMY_SPRITE_PATH`, or build a canvas-text sprite via
   `ENEMY_SPRITE_FACTORY` (fallback for enemies without PNGs).

Because the loader is loud-on-missing, forgetting any one of those
steps fails startup with a clear error.
