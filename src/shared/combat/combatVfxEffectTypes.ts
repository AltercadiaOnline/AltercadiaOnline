import type { CombatActionKind } from './combatIntentFeedback.js';

/** VFX autoritativo — servidor envia; cliente apenas reproduz o sprite do golpe. */
export type CombatVfxEffectType =
  | 'PROJECTILE_BASIC'
  | 'SLASH'
  | 'FIREBALL'
  | 'ICE_SHARD'
  | 'SHOCK'
  | 'HEAL_GLOW'
  | 'BLOCK_IMPACT';

const EFFECT_TYPES: readonly CombatVfxEffectType[] = [
  'PROJECTILE_BASIC',
  'SLASH',
  'FIREBALL',
  'ICE_SHARD',
  'SHOCK',
  'HEAL_GLOW',
  'BLOCK_IMPACT',
];

export function isCombatVfxEffectType(value: unknown): value is CombatVfxEffectType {
  return typeof value === 'string' && EFFECT_TYPES.includes(value as CombatVfxEffectType);
}

export function resolveCombatVfxEffectType(
  action: CombatActionKind,
  options: {
    readonly skillId?: string;
    readonly effectType?: CombatVfxEffectType;
    readonly isHeal?: boolean;
    readonly blocked?: boolean;
  } = {},
): CombatVfxEffectType {
  if (options.effectType && isCombatVfxEffectType(options.effectType)) {
    return options.effectType;
  }
  if (options.isHeal) return 'HEAL_GLOW';
  if (options.blocked) return 'BLOCK_IMPACT';

  const skill = options.skillId?.toLowerCase() ?? '';
  if (skill.includes('fire') || skill.includes('flame') || skill.includes('burn')) {
    return 'FIREBALL';
  }
  if (skill.includes('ice') || skill.includes('frost') || skill.includes('freeze')) {
    return 'ICE_SHARD';
  }
  if (action === 'SKILL') return 'SHOCK';
  return 'PROJECTILE_BASIC';
}
