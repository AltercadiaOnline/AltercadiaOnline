import { resolveCombatLoadout } from '../../../shared/combat/combatLoadoutResolver.js';
import { resolveClassAgility } from '../../../shared/combat/resolveClassAgility.js';
import {
  getDefaultClassActiveLoadout,
  moveIdsToSkillData,
} from '../../../shared/combat/movesetLoadout.js';
import type { PvpDuelistRegistryEntry } from '../../../shared/world/pvpDuelistRegistry.js';
import { computePlayerHpMax } from '../../../shared/character/playerVitals.js';
import type { Combatant } from '../../../shared/types.js';

/** Combatente PVP — sempre combatRole PLAYER, nunca ENEMY. */
export function buildPvpDuelistCombatant(entry: PvpDuelistRegistryEntry): Combatant {
  const actorId = `pvp_bot_${entry.id}`;
  const equippedSkillIds = getDefaultClassActiveLoadout(entry.classId);
  const skills = moveIdsToSkillData(equippedSkillIds);
  const resolved = resolveCombatLoadout({
    classId: entry.classId,
    level: entry.level,
    equippedSkillIds,
    activeMarcos: [],
    nodeProgression: { byNodeId: {} },
    equipped: {},
    flowSpeedBase: 32,
  });
  const maxHp = computePlayerHpMax(entry.level, resolved.modifiers.maxHpBonusPercent);
  const classAgility = resolveClassAgility(entry.classId);

  return {
    id: actorId,
    name: entry.displayName,
    hp: maxHp,
    maxHp,
    hpCurrent: maxHp,
    hpMax: maxHp,
    classId: entry.classId,
    combatRole: 'PLAYER',
    speedProfile: {
      flowSpeedBase: 32,
      classAgility,
      classSpeedBias: classAgility,
      marcoSpeedFlat: resolved.marcoSpeedFlat,
      equipSpeedFlat: resolved.modifiers.equipSpeedFlat,
      activeMarcos: [],
      runeSpeedFlatConditional: 0,
    },
    skills,
    combatStats: resolved.combatStats,
    combatStatSources: resolved.combatStatSources,
    statusEffects: [],
    activeStatuses: [],
    activeShields: [],
    temporaryModifiers: [],
    lockedSkillIds: [],
  };
}
