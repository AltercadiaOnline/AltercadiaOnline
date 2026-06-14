import { buildInventorySnapshot } from '../../shared/character/inventorySlots.js';
import {
  equippedSlotsFromItems,
  equipmentGridFromItems,
  inventoryStacksFromItems,
} from '../../shared/character/itemSlotModel.js';
import type { AuthoritativePlayerSnapshot } from '../../shared/playerDataSnapshots.js';
import { readMovesProgressionSnapshot } from '../progression/movesProgressionReader.js';
import { getMutableDataStore } from '../PlayerDataStore.js';
import { getPlayerMarcosStore } from '../ui/marcos/playerMarcosStore.js';
import { getPlayerItemStore } from '../ui/items/playerItemStore.js';
import { getPlayerPetStore } from '../ui/pet/playerPetStore.js';
import { getPlayerProgressionStore } from '../progression/playerProgressionStore.js';
import { getPlayerWalletStore } from '../ui/wallet/playerWalletStore.js';

/** Captura o estado autoritativo local imediatamente antes de enviar um comando. */
export function captureClientAuthoritativeSnapshot(): AuthoritativePlayerSnapshot {
  const dataStore = getMutableDataStore();
  const playerSnapshot = dataStore.getSnapshot();
  const itemSnap = getPlayerItemStore().getSnapshot();
  const stacks = inventoryStacksFromItems(itemSnap.items);
  const wallet = getPlayerWalletStore().getSnapshot();
  const marcos = getPlayerMarcosStore().getSnapshot();
  const progression = getPlayerProgressionStore().getSnapshot();
  const petStore = getPlayerPetStore();
  const petRoster = petStore.getRoster();
  const petAffinity = petStore.getPetAffinitySnapshot();

  return {
    revision: dataStore.getGlobalRevision(),
    wallet: {
      dollarVolt: wallet.dollarVolt,
      alterCoins: wallet.alterCoins,
      voltsFormatted: wallet.voltsFormatted,
      alterFormatted: wallet.alterFormatted,
      revision: playerSnapshot.wallet.revision,
    },
    inventory: {
      ...buildInventorySnapshot(stacks),
      revision: playerSnapshot.inventory.revision,
    },
    equipped: equippedSlotsFromItems(itemSnap.items),
    equipmentUiGrid: equipmentGridFromItems(itemSnap.items),
    bankStorage: playerSnapshot.bankStorage,
    marcosState: {
      activeMarcos: [...marcos.activeMarcos],
      flowSpeedBase: marcos.flowSpeedBase,
      milestoneTotalProgress: progression.milestoneTotalProgress,
      ramificacaoSelecionada: progression.ramificacaoSelecionada,
      trilhaTravada: progression.trilhaTravada,
      nodeProgression: {
        byNodeId: { ...marcos.nodeProgression.byNodeId },
      },
      revision: playerSnapshot.marcosState.revision,
    },
    movesProgression: readMovesProgressionSnapshot(playerSnapshot.movesProgression.revision),
    petRoster: {
      pets: petRoster.pets.map((pet) => ({ ...pet })),
      activeSlotIndex: petRoster.activeSlotIndex,
      selectedSlotIndex: petRoster.selectedSlotIndex,
    },
    petAffinity: {
      ...petAffinity,
      revision: dataStore.getGlobalRevision(),
    },
  };
}
