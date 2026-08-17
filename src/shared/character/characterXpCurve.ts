import { ZoneId } from '../items/itemTypes.js';
import { resolveZoneBattleXpPool } from '../combat/battleXpRewards.js';
import {
  BATTLE_LEVEL_XP_PACE,
  BATTLE_LEVEL_XP_RATIO,
} from '../progression/battleProgressionGrant.js';

/**
 * Curva de XP do **personagem** (exploração / nível da ficha).
 * Sem teto de nível. Domínio de moves usa `CharacterProgressionService` (curva antiga).
 *
 * Ritmo em lutas na **zona natural** (XP fixo da zona, não do nível do jogador):
 * 1→2 ≈ 2, 2→3 ≈ 4, 50→51 ≈ 35, 51→52 ≈ 38,
 * 70 ≈ 80, 80 ≈ 90, 90 ≈ 120, 100 ≈ 150, depois acelera (sem cap).
 */

const ENDGAME_BATTLE_GROWTH = 1.03;

function lerp(level: number, fromLevel: number, fromValue: number, toLevel: number, toValue: number): number {
  const span = toLevel - fromLevel;
  if (span <= 0) return toValue;
  const t = (level - fromLevel) / span;
  return fromValue + t * (toValue - fromValue);
}

/** Zona de farm esperada para o nível do personagem. */
export function resolveNaturalPveZoneId(playerLevel: number): ZoneId {
  const level = Math.max(1, Math.floor(playerLevel));
  if (level >= 40) return ZoneId.Zone5;
  if (level >= 30) return ZoneId.Zone4;
  if (level >= 20) return ZoneId.Zone3;
  if (level >= 10) return ZoneId.Zone2;
  return ZoneId.Zone1;
}

/** XP na barra do personagem por vitória na zona natural — o bicho da zona não muda de XP com o teu nível. */
export function resolveTypicalCharacterLevelXpPerBattle(playerLevel: number): number {
  const pool = resolveZoneBattleXpPool(resolveNaturalPveZoneId(playerLevel));
  return Math.max(1, Math.floor(pool * BATTLE_LEVEL_XP_RATIO * BATTLE_LEVEL_XP_PACE));
}

/** Alvo de lutas para subir `level` → `level + 1`. Sem teto. */
export function resolveCharacterLevelBattleTarget(playerLevel: number): number {
  const level = Math.max(1, Math.floor(playerLevel));
  if (level <= 1) return 2;
  if (level <= 2) return 4;
  if (level <= 50) return lerp(level, 2, 4, 50, 35);
  if (level <= 51) return lerp(level, 50, 35, 51, 38);
  if (level <= 70) return lerp(level, 51, 38, 70, 80);
  if (level <= 80) return lerp(level, 70, 80, 80, 90);
  if (level <= 90) return lerp(level, 80, 90, 90, 120);
  if (level <= 100) return lerp(level, 90, 120, 100, 150);
  return 150 * ENDGAME_BATTLE_GROWTH ** (level - 100);
}

/** XP necessário para o próximo nível — sem teto de personagem. */
export function resolveCharacterRequiredXp(playerLevel: number): number {
  const level = Math.max(1, Math.floor(playerLevel));
  const xpPerBattle = resolveTypicalCharacterLevelXpPerBattle(level);
  const battles = resolveCharacterLevelBattleTarget(level);
  return Math.max(1, Math.floor(battles * xpPerBattle));
}
