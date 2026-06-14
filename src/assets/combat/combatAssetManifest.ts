import type { CombatVfxEffectType } from '../../shared/combat/combatVfxEffectTypes.js';

/** URL pública servida de `public/assets/combat/`. */
export const COMBAT_ASSET_PUBLIC_BASE = '/assets/combat';

export const COMBAT_PROJECTILE_DIR = `${COMBAT_ASSET_PUBLIC_BASE}/projectiles`;
export const COMBAT_VFX_DIR = `${COMBAT_ASSET_PUBLIC_BASE}/vfx`;
export const COMBAT_ICON_DIR = `${COMBAT_ASSET_PUBLIC_BASE}/icons`;

/** Arquivo por effectType — fonte em src/assets/combat/projectiles/ (espelho em public/). */
export const PROJECTILE_FILE_BY_EFFECT: Readonly<Record<CombatVfxEffectType, string>> = {
  PROJECTILE_BASIC: 'projectile_basic.png',
  SLASH: 'slash.png',
  FIREBALL: 'fireball.png',
  ICE_SHARD: 'ice_shard.png',
  SHOCK: 'shock.png',
  HEAL_GLOW: 'heal_glow.png',
  BLOCK_IMPACT: 'block_impact.png',
};

export type CombatVfxParticleId = 'impact_dust' | 'hit_flash';

const VFX_PARTICLE_FILES: Readonly<Record<CombatVfxParticleId, string>> = {
  impact_dust: 'impact_dust.png',
  hit_flash: 'hit_flash.png',
};

export function getProjectileAsset(effectType: CombatVfxEffectType): string {
  const file = PROJECTILE_FILE_BY_EFFECT[effectType] ?? PROJECTILE_FILE_BY_EFFECT.PROJECTILE_BASIC;
  return `${COMBAT_PROJECTILE_DIR}/${file}`;
}

export function getVfxAsset(particleId: CombatVfxParticleId): string {
  return `${COMBAT_VFX_DIR}/${VFX_PARTICLE_FILES[particleId]}`;
}

/** Ícone de habilidade — arquivo em src/assets/combat/icons/ → public/assets/combat/icons/. */
export function getSkillIconAsset(skillId: string): string {
  const safe = skillId.trim().replace(/[^a-zA-Z0-9_-]/g, '_') || 'unknown';
  return `${COMBAT_ICON_DIR}/${safe}.png`;
}
