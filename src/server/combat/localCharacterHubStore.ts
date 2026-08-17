import type { PlayerCombatLoadout } from '../../shared/character/equipmentState.js';
import type { CombatClassId } from '../../shared/types.js';
import { getDefaultClassActiveLoadout } from '../../shared/combat/movesetLoadout.js';
import { emptyMarcosNodeProgression } from '../../shared/progression/marcoProgression.js';
import {
  getCharacterProfile,
  ensureAuthoritativePlayerEconomyEmpty,
} from '../../Economy/economyStore.js';
import { resolveEffectiveEquippedForCombat } from '../../shared/economy/chargedEquipmentBattle.js';

export function getOrCreateDemoLoadout(
  playerId: string,
  displayName = 'Operative',
  characterId = 1,
  classId: CombatClassId = 'IMPETUS',
): PlayerCombatLoadout {
  ensureAuthoritativePlayerEconomyEmpty(playerId, characterId);
  const profile = getCharacterProfile(playerId, characterId);
  const effectiveEquipped = resolveEffectiveEquippedForCombat(profile.equipped, profile.inventory);
  const equippedItemIds = profile.equipmentUiGrid
    ? Object.values(profile.equipmentUiGrid).filter((id): id is string => Boolean(id))
    : undefined;

  return {
    playerId,
    characterId,
    classId,
    level: 1,
    flowSpeedBase: 35,
    activeMarcos: ['quickStep'],
    nodeProgression: emptyMarcosNodeProgression(),
    equipped: effectiveEquipped,
    ...(equippedItemIds ? { equippedItemIds } : {}),
    inventory: [...profile.inventory],
    activeBookBuff: profile.activeBookBuff,
    equippedSkillIds: getDefaultClassActiveLoadout(classId),
    displayName,
  };
}
