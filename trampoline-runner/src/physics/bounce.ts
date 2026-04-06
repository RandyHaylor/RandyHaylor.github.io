import type { Rect } from '../types';

const MAX_BOUNCE_VELOCITY = 800;
const MIN_BOUNCE_VELOCITY = 300;

export function bounceVelocityFor(playerCenterX: number, trampoline: Rect): number {
  const trampolineCenterX = trampoline.x + trampoline.width / 2;
  const halfWidth = trampoline.width / 2;
  const t = Math.min(Math.abs(playerCenterX - trampolineCenterX) / halfWidth, 1);
  return MAX_BOUNCE_VELOCITY + t * (MIN_BOUNCE_VELOCITY - MAX_BOUNCE_VELOCITY);
}
