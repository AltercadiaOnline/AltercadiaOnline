import type { CombatVfxEffectType } from '../../../shared/combat/combatVfxEffectTypes.js';
import type { ClassType } from '../../../shared/types/classes.js';

export type PhaserProjectileMotion = 'travel' | 'arc' | 'burst_at_target' | 'rise_at_source';

export type PhaserProjectileStyle = {
  readonly motion: PhaserProjectileMotion;
  readonly coreColor: number;
  readonly glowColor: number;
  readonly accentColor: number;
  readonly coreRadius: number;
  readonly glowRadius: number;
  readonly trailCount: number;
  readonly durationMs: number;
  readonly shape: 'orb' | 'slash' | 'diamond' | 'bolt' | 'hex' | 'cross';
};

export const PHASER_PROJECTILE_DURATION_MS: Record<CombatVfxEffectType, number> = {
  PROJECTILE_BASIC: 780,
  SLASH: 660,
  FIREBALL: 960,
  ICE_SHARD: 900,
  SHOCK: 780,
  HEAL_GLOW: 900,
  BLOCK_IMPACT: 600,
};

export const PHASER_PROJECTILE_STYLES: Record<CombatVfxEffectType, PhaserProjectileStyle> = {
  PROJECTILE_BASIC: {
    motion: 'travel',
    coreColor: 0xff9a3c,
    glowColor: 0xff5a20,
    accentColor: 0xffe0b0,
    coreRadius: 5,
    glowRadius: 9,
    trailCount: 3,
    durationMs: PHASER_PROJECTILE_DURATION_MS.PROJECTILE_BASIC,
    shape: 'orb',
  },
  SLASH: {
    motion: 'arc',
    coreColor: 0xe8f4ff,
    glowColor: 0x58a6ff,
    accentColor: 0xffffff,
    coreRadius: 0,
    glowRadius: 0,
    trailCount: 0,
    durationMs: PHASER_PROJECTILE_DURATION_MS.SLASH,
    shape: 'slash',
  },
  FIREBALL: {
    motion: 'travel',
    coreColor: 0xffe566,
    glowColor: 0xff5020,
    accentColor: 0xff9040,
    coreRadius: 8,
    glowRadius: 16,
    trailCount: 5,
    durationMs: PHASER_PROJECTILE_DURATION_MS.FIREBALL,
    shape: 'orb',
  },
  ICE_SHARD: {
    motion: 'travel',
    coreColor: 0xd8f4ff,
    glowColor: 0x38bdf8,
    accentColor: 0x7dd3fc,
    coreRadius: 7,
    glowRadius: 0,
    trailCount: 2,
    durationMs: PHASER_PROJECTILE_DURATION_MS.ICE_SHARD,
    shape: 'diamond',
  },
  SHOCK: {
    motion: 'travel',
    coreColor: 0xfef08a,
    glowColor: 0xeab308,
    accentColor: 0xffffff,
    coreRadius: 4,
    glowRadius: 10,
    trailCount: 0,
    durationMs: PHASER_PROJECTILE_DURATION_MS.SHOCK,
    shape: 'bolt',
  },
  HEAL_GLOW: {
    motion: 'rise_at_source',
    coreColor: 0x86efac,
    glowColor: 0x22c55e,
    accentColor: 0xdcfce7,
    coreRadius: 6,
    glowRadius: 18,
    trailCount: 4,
    durationMs: PHASER_PROJECTILE_DURATION_MS.HEAL_GLOW,
    shape: 'cross',
  },
  BLOCK_IMPACT: {
    motion: 'burst_at_target',
    coreColor: 0x58a6ff,
    glowColor: 0x1d4ed8,
    accentColor: 0xbfdbfe,
    coreRadius: 0,
    glowRadius: 0,
    trailCount: 0,
    durationMs: PHASER_PROJECTILE_DURATION_MS.BLOCK_IMPACT,
    shape: 'hex',
  },
};

const CLASS_TINT: Record<ClassType, number> = {
  IMPETUS: 0xff6a28,
  COGITOR: 0x46a0ff,
  TUTATOR: 0xffc850,
  DISSOLUTUS: 0x3cd282,
};

/** Mistura cor base com tint da classe do atacante. */
export function blendClassTint(baseColor: number, classId: ClassType, weight = 0.35): number {
  const tint = CLASS_TINT[classId] ?? CLASS_TINT.IMPETUS;
  const br = (baseColor >> 16) & 0xff;
  const bg = (baseColor >> 8) & 0xff;
  const bb = baseColor & 0xff;
  const tr = (tint >> 16) & 0xff;
  const tg = (tint >> 8) & 0xff;
  const tb = tint & 0xff;
  const r = Math.round(br * (1 - weight) + tr * weight);
  const g = Math.round(bg * (1 - weight) + tg * weight);
  const b = Math.round(bb * (1 - weight) + tb * weight);
  return (r << 16) | (g << 8) | b;
}
