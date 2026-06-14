import type { PlayerCombatLoadout } from '../../shared/character/equipmentState.js';
import type { CombatClassId } from '../../shared/types.js';
import { getDefaultClassActiveLoadout } from '../../shared/combat/movesetLoadout.js';
import { emptyMarcosNodeProgression } from '../../shared/progression/marcoProgression.js';
import {
  getCharacterProfile,
  seedDemoProfileIfEmpty,
} from '../../Economy/economyStore.js';
import { resolveEffectiveEquippedForCombat } from '../../shared/economy/chargedEquipmentBattle.js';

export function getOrCreateDemoLoadout(
  playerId: string,
  displayName = 'Operative',
  characterId = 1,
  classId: CombatClassId = 'IMPETUS',
): PlayerCombatLoadout {
  seedDemoProfileIfEmpty(playerId, characterId);
  const profile = getCharacterProfile(playerId, characterId);
  const effectiveEquipped = resolveEffectiveEquippedForCombat(profile.equipped, profile.inventory);

  return {
    playerId,
    characterId,
    classId,
    level: 1,
    flowSpeedBase: 35,
    activeMarcos: ['quickStep'],
    nodeProgression: emptyMarcosNodeProgression(),
    equipped: effectiveEquipped,
    inventory: [...profile.inventory],
    activeBookBuff: profile.activeBookBuff,
    equippedSkillIds: getDefaultClassActiveLoadout(classId),
    displayName,
  };
}
