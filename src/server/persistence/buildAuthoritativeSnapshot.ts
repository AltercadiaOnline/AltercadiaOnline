import {
  calculateVoltsFromAlterCoins,
  formatAlterCoins,
  formatVolts,
} from '../../shared/economy/premiumCurrency.js';
import type { AuthoritativePlayerSnapshot } from '../../shared/playerDataSnapshots.js';
import { equippedToEquipmentUiGrid } from '../../shared/character/equipmentUiSlots.js';
import { removeEquippedItemsFromUiGrid } from '../../shared/character/syncInventoryWithEquipment.js';
import {
  buildInventorySnapshot,
  INVENTORY_SLOT_COUNT,
  stacksToInventorySlots,
} from '../../shared/character/inventorySlots.js';
import { computeInventoryChecksumFromStacks } from '../../shared/character/inventoryChecksum.js';
import { buildBankStorageView } from '../../shared/bank/bankService.js';
import { buildMovesProgressionData } from '../../shared/progression/moveProgression.js';
import {
  ensureMovesetMasteryForClass,
  inferClassIdFromMovesetMastery,
  resolveClassMovePoolForMastery,
} from '../../shared/progression/movesetMasterySeed.js';
import type { ClassType } from '../../shared/types/classes.js';
import { getPetAffinityRecord } from '../../Economy/petAffinityStore.js';
import { getPetRosterSnapshot } from '../../Economy/petRosterStore.js';
import { getOwnedSkinsRecord } from '../../Economy/skinOwnershipStore.js';
import {
  exportCharacterEconomyPersistence,
  getPlayerWallet,
} from '../../Economy/economyStore.js';
import { getAuthoritativeProgression } from '../progression/authoritativeProgressionStore.js';
import { getTimeManager } from '../TimeManager.js';

/** Monta payload `full-state-sync` a partir do estado autoritativo em memória. */
export function buildAuthoritativePlayerSnapshot(
  playerId: string,
  characterId: number,
  revision = Date.now(),
): AuthoritativePlayerSnapshot {
  const wallet = getPlayerWallet(playerId);
  const economy = exportCharacterEconomyPersistence(playerId, characterId);
  const progressionState = getAuthoritativeProgression(playerId, characterId);
  const equipmentUiGrid = economy.profile.equipmentUiGrid
    ? { ...economy.profile.equipmentUiGrid }
    : equippedToEquipmentUiGrid(economy.profile.equipped);
  const inventoryStacks = removeEquippedItemsFromUiGrid(
    economy.profile.inventory,
    equipmentUiGrid,
  );
  const inventorySlots = stacksToInventorySlots(inventoryStacks, INVENTORY_SLOT_COUNT);
  const bankView = buildBankStorageView(
    economy.bank.itemStacks,
    economy.bank.currencies,
  );

  const inferredClassId: ClassType = inferClassIdFromMovesetMastery(
    progressionState.progression.movesetMastery,
  ) ?? 'IMPETUS';
  const classPool = resolveClassMovePoolForMastery(
    progressionState.progression.movesetMastery,
    inferredClassId,
  );
  const masteryForSnapshot = ensureMovesetMasteryForClass(
    progressionState.progression.movesetMastery,
    inferredClassId,
  );
  const movesProgression = buildMovesProgressionData(masteryForSnapshot, classPool);

  return {
    revision,
    wallet: {
      dollarVolt: wallet.dollarVolt,
      alterCoins: wallet.alterCoins,
      voltsFormatted: formatVolts(wallet.dollarVolt),
      alterFormatted: formatAlterCoins(wallet.alterCoins),
      revision,
    },
    inventory: {
      ...buildInventorySnapshot(inventorySlots, INVENTORY_SLOT_COUNT),
      revision,
      inventoryChecksum: computeInventoryChecksumFromStacks(inventoryStacks),
    },
    equipped: { ...economy.profile.equipped },
    equipmentUiGrid,
    bankStorage: {
      itemStacks: bankView.itemStacks,
      currencies: bankView.currencies,
      itemCapacity: bankView.itemCapacity,
      itemsUsed: bankView.itemsUsed,
      voltsFormatted: bankView.voltsFormatted,
      alterFormatted: bankView.alterFormatted,
      revision,
    },
    marcosState: {
      activeMarcos: [...progressionState.marcos.activeMarcos],
      flowSpeedBase: progressionState.marcos.flowSpeedBase,
      milestoneTotalProgress: progressionState.progression.milestoneTotalProgress,
      ramificacaoSelecionada: progressionState.progression.ramificacaoSelecionada,
      trilhaTravada: progressionState.progression.trilhaTravada,
      nodeProgression: {
        byNodeId: { ...progressionState.marcos.nodeProgression.byNodeId },
      },
      revision,
    },
    movesProgression: {
      ...movesProgression,
      revision,
    },
    petRoster: {
      ...getPetRosterSnapshot(playerId, characterId),
      revision,
    },
    petAffinity: {
      ...getPetAffinityRecord(playerId, characterId),
      revision,
    },
    ownedSkins: getOwnedSkinsRecord(playerId, characterId),
    gameTime: getTimeManager().getGameTimeSeconds(),
    gameTimeServerMs: revision,
  };
}

/** Utilitário QA — taxa Alter → Volts exposta no snapshot de carteira. */
export function previewAlterExchangeVolts(alterCoins: number): number {
  return calculateVoltsFromAlterCoins(alterCoins);
}
