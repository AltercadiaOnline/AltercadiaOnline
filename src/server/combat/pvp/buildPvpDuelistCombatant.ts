import { resolveCombatLoadout } from '../../../shared/combat/combatLoadoutResolver.js';
import {
  getDefaultClassActiveLoadout,
  moveIdsToSkillData,
} from '../../../shared/combat/movesetLoadout.js';
import type { PvpDuelistRegistryEntry } from '../../../shared/world/pvpDuelistRegistry.js';
import { computePlayerHpMax } from '../../../shared/character/playerVitals.js';
import type { Combatant } from '../../../shared/types.js';
import { loadCombatBalanceConfig } from '../../engine/combatBalanceConfig.js';

function resolveClassSpeedBias(classId: PvpDuelistRegistryEntry['classId']): number {
  return loadCombatBalanceConfig().initiative.classSpeedBias[classId] ?? 0;
}

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
  const maxHp = computePlayerHpMax(resolved.modifiers.maxHpBonusPercent);

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
      classSpeedBias: resolveClassSpeedBias(entry.classId),
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
