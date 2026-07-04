import { useEffect } from 'react';
import { BATTLE_LOOT_PACKAGE_EVENT } from '../../combat/client/battleLootPackageBuffer.js';
import type { BattleLootPackagePayload } from '../../../shared/combat/battleLootPackage.js';
import { getPostBattleHudBridge } from '../bridge/postBattleHudBridge.js';

/** Escuta pacote de loot do servidor e libera botão Recompensas na HUD React. */
export function usePostBattleLootPackageWatcher(
  battleId: string | undefined,
  rewardsLootStatus: string,
): void {
  useEffect(() => {
    if (!battleId || rewardsLootStatus !== 'waiting_for_server') return;

    const onPackage = (event: Event) => {
      const detail = (event as CustomEvent<BattleLootPackagePayload>).detail;
      if (!detail || detail.battleId !== battleId) return;
      getPostBattleHudBridge().setRewardsLootStatus('ready');
    };

    window.addEventListener(BATTLE_LOOT_PACKAGE_EVENT, onPackage);
    return () => window.removeEventListener(BATTLE_LOOT_PACKAGE_EVENT, onPackage);
  }, [battleId, rewardsLootStatus]);
}
