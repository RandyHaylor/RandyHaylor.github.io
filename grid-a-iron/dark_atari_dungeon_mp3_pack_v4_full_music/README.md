# Dark Atari Dungeon MP3 Pack v4 — Full Music

This version keeps the revised v3 SFX and replaces the very short music loops with fuller structured song versions.

## Music

- 10 full retro/haunting background tracks
- Roughly 84–98 seconds each
- Mono MP3, 22.05 kHz, 56 kbps
- Structured as intro / A / B / return / bridge / finale, not just time-stretched loops

## SFX

SFX are copied from v3:

- More separated damage, door, herb, and sword identities
- Slower death sting
- Slower descend stairs
- 4 variations per SFX category

## Folder structure

- `music_mp3/` — full background tracks
- `sfx_mp3/<name>/` — 4 variations per SFX
- `manifest.json` — loadable path list

## Game usage

Use music as looping background tracks. Because the tracks have fade-ins/fade-outs, they work best as dungeon-area ambience rather than seamless rhythm-locked loops.

For seamless looping, trim the first/last few seconds or use WebAudio crossfading between repeat plays.
