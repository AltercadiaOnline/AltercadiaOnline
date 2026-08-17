import { getCreatureDropEntry } from '../items/creatureDrops.js';
import { ZoneId, type ZoneId as ZoneIdType } from '../items/itemTypes.js';
import type { CombatState } from '../types.js';
import {
  getMonsterZoneScalingConfig,
  resolveMonsterZoneDefaultLevel,
} from './monsterZoneScaling.js';

/**
 * Fallback de **nível de combate** (loot / HUD), não de XP.
 * XP de vitória é âncora da zona (`resolveZoneBattleXpPool`) — não escala com o jogador.
 */
export function resolveDefeatedCreatureLevel(creatureId: string): number {
  const drop = getCreatureDropEntry(creatureId);
  const zoneId = drop?.zoneId ?? ZoneId.Zone1;
  return resolveMonsterZoneDefaultLevel(zoneId);
}

/**
 * Nível de combate da criatura nesta sessão (stats). Não alimenta XP.
 */
export function resolveSessionPveDefeatedLevel(
  state: Pick<CombatState, 'pveEnemyCombatLevel'>,
  creatureId?: string | null,
): number {
  const fromSession = state.pveEnemyCombatLevel;
  if (typeof fromSession === 'number' && Number.isFinite(fromSession) && fromSession >= 1) {
    return Math.floor(fromSession);
  }
  return creatureId ? resolveDefeatedCreatureLevel(creatureId) : 1;
}

function resolveCreatureZoneId(creatureId: string): ZoneIdType {
  return getCreatureDropEntry(creatureId)?.zoneId ?? ZoneId.Zone1;
}

/** Nível âncora da zona (entrada) — rato da Zona 1 = sempre o XP do nível 1. */
export function resolveZoneXpAnchorLevel(zoneId: ZoneIdType): number {
  return getMonsterZoneScalingConfig(zoneId).levelMin;
}

/** Pool de XP da zona. Independente do nível do jogador e do `pveEnemyCombatLevel`. */
export function resolveZoneBattleXpPool(zoneId: ZoneIdType): number {
  return 15 + resolveZoneXpAnchorLevel(zoneId) * 10;
}

/**
 * XP de vitória PvE — única fonte para o payload COMBAT_FINISHED.
 * Vem da **zona do bicho**, não do nível do personagem nem do scaling de combate.
 * `defeatedLevel` é ignorado (compat de assinatura) — loot continua usando o nível de sessão.
 */
export function resolveBattleXpGain(creatureId: string, _defeatedLevel?: number): number {
  return resolveZoneBattleXpPool(resolveCreatureZoneId(creatureId));
}
