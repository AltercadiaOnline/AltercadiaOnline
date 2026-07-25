import { getPlayerItemStore, resetPlayerItemStore } from '../ui/items/playerItemStore.js';
import { resetPlayerInventoryStore } from '../ui/inventory/playerInventoryStore.js';
import { getPlayerEquipmentStore, resetPlayerEquipmentStore } from '../ui/equipment/playerEquipmentStore.js';
import { getPlayerProfileStore, resetPlayerProfileStore } from '../ui/character/playerProfileStore.js';
import { resetPlayerWalletStore, getPlayerWalletStore } from '../ui/wallet/playerWalletStore.js';
import { resetPlayerPetStore } from '../ui/pet/playerPetStore.js';
import { resetPlayerProgressionStore } from '../progression/playerProgressionStore.js';
import { resetPlayerMarcosStore } from '../ui/marcos/playerMarcosStore.js';
import { resetInventorySyncScheduler } from '../game/PlayerItemSession.js';
import { getGlobalStateSynchronizer } from '../sync/GlobalStateSynchronizer.js';
import { getActionDispatcher } from '../ActionDispatcher.js';

export type InitializePlayerStateOptions = {
  /** Mantém nome/classe do slot selecionado; zera nível visual até o sync. */
  readonly displayName?: string | undefined;
  readonly classId?: string | undefined;
  /** Após limpar o espelho, pede snapshot autoritativo (online). */
  readonly requestServerSync?: boolean | undefined;
};

/**
 * Personagem limpo — base do espelho local (startup + Reset Local Data).
 * Não inventa loot/pets/moedas; o servidor é a fonte da verdade após sync.
 */
export function initializePlayerState(options: InitializePlayerStateOptions = {}): void {
  resetInventorySyncScheduler();
  resetPlayerItemStore();
  resetPlayerInventoryStore();
  resetPlayerPetStore();
  resetPlayerProgressionStore();
  resetPlayerMarcosStore();
  resetPlayerWalletStore();
  getPlayerWalletStore().applyBalances({ dollarVolt: 0, alterCoins: 0 });

  const name = options.displayName?.trim() || 'Operative';
  const classId = options.classId;

  resetPlayerEquipmentStore();
  resetPlayerProfileStore();
  getPlayerProfileStore().setProfile(name, 1);
  getPlayerEquipmentStore().setPlayerInfo(name, 1, {
    resetVitals: true,
    ...(classId ? { classId: classId as never } : {}),
  });

  getPlayerItemStore().hydrateFromServerBundle([], undefined, { immediate: true });

  if (options.requestServerSync !== false && getActionDispatcher().getMode() === 'online') {
    getGlobalStateSynchronizer().requestFullState();
  }
}
