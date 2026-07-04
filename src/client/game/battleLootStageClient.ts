import type { BattleLootPackagePayload } from '../../shared/combat/battleLootPackage.js';
import { resolveDefeatedCreatureLevel } from '../../shared/combat/battleXpRewards.js';
import type { CombatDispatchPayload } from '../../shared/combatWire.js';
import { getMonsterRegistryEntry } from '../../shared/world/monsterRegistry.js';
import { getCombatRole } from '../../shared/pet/petCombatRules.js';
import { resolveBattleCreatureId } from '../../shared/items/combatCreatureRegistry.js';
import { resolveCreatureIdFromActorId } from '../../shared/combat/MonsterCatalog.js';
import { getActionDispatcher } from '../ActionDispatcher.js';
import { getMockEconomyService } from '../economy/economyLayer.js';
import { peekBattleLootPackage } from '../combat/client/battleLootPackageBuffer.js';

const stagedBattleIds = new Set<string>();

export type BattleLootStageStatus = 'READY' | 'WAITING_FOR_SERVER' | 'UNAVAILABLE';

export type BattleLootLocalStageResult =
  | BattleLootPackagePayload
  | { readonly status: 'WAITING_FOR_SERVER' };

export function isOnlineCombatClient(): boolean {
  return getActionDispatcher().getMode() === 'online';
}

/** Pacote autoritativo recebido (servidor ou mock economy) — cliente não recalcula drops. */
export function hasValidPendingBattleLoot(battleId: string): boolean {
  return peekBattleLootPackage(battleId) !== null;
}

export function resolveBattleLootStageStatus(battleId: string): BattleLootStageStatus {
  if (hasValidPendingBattleLoot(battleId)) return 'READY';
  if (isOnlineCombatClient()) return 'WAITING_FOR_SERVER';
  return 'UNAVAILABLE';
}

export function isBattleLootWaitingForServer(
  result: BattleLootLocalStageResult | null,
): result is { readonly status: 'WAITING_FOR_SERVER' } {
  return result !== null && typeof result === 'object' && 'status' in result
    && result.status === 'WAITING_FOR_SERVER';
}

export function resolveLootSourceFromDispatch(
  dispatch: CombatDispatchPayload | null,
  playerActorId: string,
): { readonly sourceId: string; readonly defeatedLevel: number } | null {
  if (!dispatch) return null;
  const sourceId = resolveBattleCreatureId(dispatch.state.combatants, playerActorId);
  if (!sourceId) return null;
  return {
    sourceId,
    defeatedLevel: resolveDefeatedCreatureLevel(sourceId),
  };
}

export type BattleLootSourceContext = {
  readonly dispatch?: CombatDispatchPayload | null;
  readonly playerActorId?: string;
  readonly monsterInstanceId?: string;
  readonly previewSourceId?: string;
};

/** Resolve fonte de loot — dispatch, BATTLE_ENDED, preview ou primeiro inimigo. */
export function resolveLootSourceForBattle(
  context: BattleLootSourceContext,
): { readonly sourceId: string; readonly defeatedLevel: number } | null {
  const { dispatch, playerActorId } = context;

  if (dispatch && playerActorId) {
    const fromDispatch = resolveLootSourceFromDispatch(dispatch, playerActorId);
    if (fromDispatch) return fromDispatch;
  }

  if (context.previewSourceId) {
    return {
      sourceId: context.previewSourceId,
      defeatedLevel: resolveDefeatedCreatureLevel(context.previewSourceId),
    };
  }

  if (context.monsterInstanceId) {
    const entry = getMonsterRegistryEntry(context.monsterInstanceId);
    const sourceId = entry?.creatureId ?? 'rat';
    return {
      sourceId,
      defeatedLevel: resolveDefeatedCreatureLevel(sourceId),
    };
  }

  if (dispatch) {
    for (const [actorId, combatant] of Object.entries(dispatch.state.combatants)) {
      if (playerActorId && actorId === playerActorId) continue;
      if (actorId.startsWith('pet_')) continue;
      const role = getCombatRole(combatant);
      if (role !== 'ENEMY') continue;
      const sourceId = resolveCreatureIdFromActorId(actorId) ?? actorId.replace(/^enemy_/, '');
      if (!sourceId) continue;
      return {
        sourceId,
        defeatedLevel: resolveDefeatedCreatureLevel(sourceId),
      };
    }
  }

  return { sourceId: 'rat', defeatedLevel: resolveDefeatedCreatureLevel('rat') };
}

/**
 * Solicita staging via mock economy (gateway autoritativo).
 * Online: nunca gera no cliente — aguarda BATTLE_LOOT_PACKAGE.
 */
function requestBattleLootStagingViaMock(
  battleId: string,
  context: BattleLootSourceContext,
): BattleLootPackagePayload | null {
  const cached = peekBattleLootPackage(battleId);
  if (cached) return cached;

  if (isOnlineCombatClient()) return null;
  if (getActionDispatcher().getMode() !== 'mock' || !getMockEconomyService()) return null;

  const source = resolveLootSourceForBattle(context);
  if (!source) return null;

  const result = getActionDispatcher().dispatch({
    type: 'STAGE_BATTLE_LOOT',
    payload: {
      battleId,
      sourceId: source.sourceId,
      defeatedLevel: source.defeatedLevel,
    },
  });
  if (!result.ok) return null;

  stagedBattleIds.add(battleId);
  return peekBattleLootPackage(battleId);
}

/**
 * Pré-solicita loot após vitória PVE (mock).
 * Online: só retorna pacote já recebido via BATTLE_LOOT_PACKAGE.
 */
export function ensureBattleLootPackageStaged(
  battleId: string,
  context: BattleLootSourceContext,
): BattleLootPackagePayload | null {
  const cached = peekBattleLootPackage(battleId);
  if (cached) return cached;

  if (isOnlineCombatClient()) return null;

  return requestBattleLootStagingViaMock(battleId, context);
}

export function clearBattleLootStageSession(): void {
  stagedBattleIds.clear();
}
