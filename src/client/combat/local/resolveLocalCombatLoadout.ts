/**
 * Monta PlayerCombatLoadout a partir dos stores do client — mesmo shape do combat-join online.
 */

import type { PlayerCombatLoadout } from '../../../shared/character/equipmentState.js';
import { canPetEnterBattle } from '../../../shared/pet/petModel.js';
import {
  resolvePlayerEquippedSkillIds,
} from '../../../shared/combat/movesetLoadout.js';
import { AppScreens } from '../../browser/appScreens.js';
import { getGlobalPlayerStore } from '../../ui/moveset/globalPlayerStore.js';
import { getPlayerEquipmentStore } from '../../ui/equipment/playerEquipmentStore.js';
import { getPlayerItemStore } from '../../ui/items/playerItemStore.js';
import { getPlayerPetStore } from '../../ui/pet/playerPetStore.js';
import { getPlayerProgressionStore } from '../../progression/playerProgressionStore.js';
import { getDataStore } from '../../economy/economyLayer.js';
import { resolveClientCombatEquipmentSnapshot } from '../resolveClientCombatEquipment.js';

export function resolveLocalCombatLoadoutFromClient(): PlayerCombatLoadout | null {
  const selected = AppScreens.getSelectedCharacter();
  const characterId = selected?.id ?? 1;
  const playerId = `local_${characterId}`;
  const equipment = getPlayerEquipmentStore().getSnapshot();
  // Preferir classe do store (sincronizada) sobre a do hub — evita moveset IMP residual.
  const classId = equipment.classId || selected?.class || 'IMPETUS';
  const confirmed = getGlobalPlayerStore().getConfirmedLoadout();
  const equippedSkillIds = resolvePlayerEquippedSkillIds(classId, confirmed);
  const vitals = getGlobalPlayerStore().getWorldVitals();
  const marcos = getDataStore().getMarcosState();
  const pet = getPlayerPetStore().getSnapshot();
  const equipmentSnapshot = resolveClientCombatEquipmentSnapshot();
  const inventory = getPlayerItemStore().toInventoryStacks();
  const progression = getPlayerProgressionStore().getSnapshot();
  const level = typeof selected?.level === 'number' ? selected.level : equipment.level;

  return {
    playerId,
    characterId,
    classId,
    level: Math.max(1, level),
    flowSpeedBase: 35,
    activeMarcos: [...(marcos.activeMarcos ?? [])],
    nodeProgression: {
      byNodeId: { ...(marcos.nodeProgression?.byNodeId ?? {}) },
    },
    equipped: { ...equipmentSnapshot },
    inventory: inventory.map((row) => ({ ...row })),
    activeBookBuff: null,
    equippedSkillIds,
    displayName: selected?.name ?? equipment.displayName ?? 'Operative',
    worldVitals: vitals,
    movesetMastery: { ...(progression.movesetMastery ?? {}) },
    ...(pet && canPetEnterBattle(pet) ? { pet } : {}),
  };
}
