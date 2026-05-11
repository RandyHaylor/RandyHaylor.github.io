# Notes for AI agents working on this repo

## Where to look first

Before reading `index.html` end-to-end, skim the `design-docs/` folder:

- [design-docs/architecture-overview.md](design-docs/architecture-overview.md)
  — file layout, startup contract, layout modes, audio, win condition.
- [design-docs/game-rules.md](design-docs/game-rules.md)
  — player stats, combat math, weapon/shield tables, torch, vendor.
- [design-docs/enemies.md](design-docs/enemies.md)
  — spawn pool, 3-pass spawn algorithm, current roster, how to add one.
- [design-docs/user-interface.md](design-docs/user-interface.md)
  — portrait vs landscape layout, overlays, input map.
- [design-docs/refactor-guidance.md](design-docs/refactor-guidance.md)
  — iterative engine-vs-content / core-vs-UI extraction plan.

[ENEMY_PLAN.md](ENEMY_PLAN.md) is older but still useful context for
the lvl 1–10 ramp design.

## Deploy

Two repos are kept in sync:

- Source repo (this one) — `git push origin main`.
- Pages repo at `~/RandyHaylor.github.io/grid-a-iron/` — same files
  copied over, separate `git push`. GitHub Pages serves from there at
  https://randyhaylor.github.io/grid-a-iron/.

When making changes during a session: prefer testing against the local
static server first (`python3 -m http.server 8765` from the source
repo root) before pushing to Pages. Pages takes 30–60s to rebuild and
the iteration loop is painful otherwise.

## Project conventions

- **No silent fallbacks for required data.** `enemies/pool.json`,
  every phrase JSON, and `enemies/condition_phrases.json` are all
  required at startup. Missing or malformed → throw, show a red
  banner, do not boot. Don't add ternary "if not loaded use stub"
  patterns.
- **No filenames with leading underscore for files that ship to the
  client.** GitHub Pages runs Jekyll by default and excludes those.
  This is why the spawn-pool JSON is `pool.json`, not `_pool.json`.
- **Move structural fixes, not band-aids.** When startup-order or
  scope problems show up, fix where the cause lives — don't reach
  for `queueMicrotask` / `setTimeout` to dodge a TDZ / a missed
  await.

## Test modes

- `?test=1` — Diamond gear, 100 herbs, all enemies on level 1, first
  stair-descend triggers the win sequence.
- `?test=2` — jumps straight to the win-sequence typewriter, useful
  for iterating on that overlay without playing through anything.

## Historical reference

The session that built most of this project (lvl 1–10 enemy ramp,
landscape mode, win sequence, design docs, refactor plan, deploy
workflow, the loud-failure startup contract) is logged at:

- session id: `b21a0abc-e62b-4b18-85cc-7900a20c3024`
- transcript: `~/.claude/projects/-home-aikenyon-ai-skills-agents-resources-source-of-truth-test-1/b21a0abc-e62b-4b18-85cc-7900a20c3024.jsonl`

If you need to recover *why* a decision was made (e.g. why no inline
fallbacks, why renamed `_pool.json` → `pool.json`, why phrases got
shortened twice), the answer is in that transcript.
