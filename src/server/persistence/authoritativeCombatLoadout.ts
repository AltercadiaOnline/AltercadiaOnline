import type { PlayerCombatLoadout } from '../../shared/character/equipmentState.js';
import { equipmentUiGridToEquipped } from '../../shared/character/equipmentUiSlots.js';
import {
  getDefaultClassActiveLoadout,
  normalizeClassActiveLoadout,
} from '../../shared/combat/movesetLoadout.js';
import { resolveEffectiveEquippedForCombat } from '../../shared/economy/chargedEquipmentBattle.js';
import { inferClassIdFromMovesetMastery } from '../../shared/progression/movesetMasterySeed.js';
import { exportCharacterEconomyPersistence } from '../../Economy/economyStore.js';
import { resolveAuthoritativePlayerLoadout } from '../world/loadoutGateway.js';
import { getWorldProfile } from '../world/worldProfileStore.js';
import { getAuthoritativeProgression } from '../progression/authoritativeProgressionStore.js';
import { getAuthoritativeCombatMarcos } from './authoritativeCombatMarcos.js';

/** Monta loadout de combate exclusivamente a partir do estado autoritativo persistido. */
export function resolveAuthoritativeCombatLoadout(
  playerId: string,
  characterId: number,
): PlayerCombatLoadout {
  const economy = exportCharacterEconomyPersistence(playerId, characterId);
  const progressionState = getAuthoritativeProgression(playerId, characterId);
  const world = getWorldProfile(playerId, characterId);
  const playerLoadout = resolveAuthoritativePlayerLoadout(playerId, characterId);
  const equippedSlots =
    playerLoadout.equipped ?? equipmentUiGridToEquipped(playerLoadout.equipmentUiGrid);
  const equipped = resolveEffectiveEquippedForCombat(equippedSlots, economy.profile.inventory);
  const authoritativeMarcos = getAuthoritativeCombatMarcos(playerId, characterId);
  const movesetMastery = { ...progressionState.progression.movesetMastery };
  const classId = inferClassIdFromMovesetMastery(movesetMastery) ?? 'IMPETUS';
  const sessionSync = world.sessionSync;
  const normalizedMoves =
    sessionSync?.activeMovesets && sessionSync.activeMovesets.length > 0
      ? normalizeClassActiveLoadout(classId, sessionSync.activeMovesets)
        ?? getDefaultClassActiveLoadout(classId)
      : getDefaultClassActiveLoadout(classId);

  return {
    playerId,
    characterId,
    classId,
    level: progressionState.characterProfile.level ?? 1,
    flowSpeedBase: 35,
    activeMarcos: [...authoritativeMarcos.activeMarcos],
    nodeProgression: {
      byNodeId: { ...authoritativeMarcos.nodeProgression.byNodeId },
    },
    equipped,
    inventory: economy.profile.inventory.map((row) => ({ ...row })),
    activeBookBuff: economy.profile.activeBookBuff,
    equippedSkillIds: [...normalizedMoves],
    displayName: progressionState.characterProfile.displayName ?? 'Operative',
    ...(sessionSync?.worldVitals ? { worldVitals: { ...sessionSync.worldVitals } } : {}),
    ...(sessionSync?.pet !== undefined ? { pet: sessionSync.pet } : {}),
    movesetMastery,
  };
}
