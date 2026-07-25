import { useEffect } from 'react';
import {
  BATTLE_LOOT_PACKAGE_EVENT,
  peekBattleLootPackage,
} from '../../combat/client/battleLootPackageBuffer.js';
import type { BattleLootPackagePayload } from '../../../shared/combat/battleLootPackage.js';
import { BATTLE_LOOT_PACKAGE_WAIT_MS } from '../../../shared/combat/battleLootConstants.js';
import { getPostBattleHudBridge } from '../bridge/postBattleHudBridge.js';
import { postSystemNotification } from '../../ui/logService.js';

/** Espera máxima no hub antes de liberar o botão com erro recuperável. */
const HUB_LOOT_WAIT_MS = BATTLE_LOOT_PACKAGE_WAIT_MS + 3_000;

/** Escuta pacote de loot do servidor e libera botão Recompensas na HUD React. */
export function usePostBattleLootPackageWatcher(
  battleId: string | undefined,
  rewardsLootStatus: string,
): void {
  useEffect(() => {
    if (!battleId || rewardsLootStatus !== 'waiting_for_server') return;

    // Pacote pode já ter chegado antes do effect montar — checa cache primeiro.
    if (peekBattleLootPackage(battleId)) {
      getPostBattleHudBridge().setRewardsLootStatus('ready');
      return;
    }

    const onPackage = (event: Event) => {
      const detail = (event as CustomEvent<BattleLootPackagePayload>).detail;
      if (!detail || detail.battleId !== battleId) return;
      getPostBattleHudBridge().setRewardsLootStatus('ready');
    };

    window.addEventListener(BATTLE_LOOT_PACKAGE_EVENT, onPackage);

    // Sem pacote a tempo: libera o botão (ready) — clique abre cassino com retry.
    // Não usar 'unavailable' (desabilitava Recompensas e quebrava o fluxo PVE).
    const timer = window.setTimeout(() => {
      if (peekBattleLootPackage(battleId)) {
        getPostBattleHudBridge().setRewardsLootStatus('ready');
        return;
      }
      const status = getPostBattleHudBridge().snapshot().rewardsLootStatus;
      if (status !== 'waiting_for_server') return;
      getPostBattleHudBridge().setRewardsLootStatus('ready');
      postSystemNotification(
        'Pacote de recompensas atrasado — clique em Recompensas para tentar de novo.',
        'normal',
      );
    }, HUB_LOOT_WAIT_MS);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener(BATTLE_LOOT_PACKAGE_EVENT, onPackage);
    };
  }, [battleId, rewardsLootStatus]);
}
