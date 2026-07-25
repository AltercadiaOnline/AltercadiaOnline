import type { BattleLootPackagePayload } from '../../../shared/combat/battleLootPackage.js';
import { BATTLE_LOOT_PACKAGE_WAIT_MS } from '../../../shared/combat/battleLootConstants.js';

import {
  peekBattleLootPackage,
  waitForBattleLootPackage,
} from './battleLootPackageBuffer.js';
import {
  ensureBattleLootPackageStaged,
  isBattleLootResolved,
  isOnlineCombatClient,
  type BattleLootSourceContext,
} from '../../game/battleLootStageClient.js';

export type BattleLootLoadContext = BattleLootSourceContext;

/**
 * Busca pacote de loot quando o jogador clica em Recompensas.
 * Online: aguarda exclusivamente BATTLE_LOOT_PACKAGE do servidor.
 * Local: aguarda pacote da LocalCombatAuthority (sem re-roll).
 * Mock puro: staging via mock economy (uma vez por battleId).
 */
export async function loadBattleLootPackageOnDemand(
  battleId: string,
  timeoutMs = BATTLE_LOOT_PACKAGE_WAIT_MS,
  context: BattleLootLoadContext = {},
): Promise<BattleLootPackagePayload> {
  const cached = peekBattleLootPackage(battleId);
  if (cached) return cached;

  // Já coletou/descartou nesta batalha — sem segundo roll.
  if (isBattleLootResolved(battleId)) {
    throw new Error('Recompensas desta batalha já foram resolvidas.');
  }

  if (isOnlineCombatClient()) {
    const wsPkg = await waitForBattleLootPackage(battleId, timeoutMs);
    if (wsPkg) return wsPkg;
    throw new Error('Pacote de loot indisponível. Aguarde o servidor e tente novamente.');
  }

  const staged = ensureBattleLootPackageStaged(battleId, context);
  if (staged) return staged;

  const wsPkg = await waitForBattleLootPackage(battleId, timeoutMs);
  if (wsPkg) return wsPkg;

  throw new Error('Pacote de loot indisponível. Tente novamente em instantes.');
}
