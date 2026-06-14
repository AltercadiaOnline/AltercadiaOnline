import { resolveCombatLoadout } from '../../shared/combat/combatLoadoutResolver.js';
import { BattleType } from '../../shared/combat/battleType.js';
import {
  buildMirrorBotActorId,
  buildMirrorBotDisplayName,
  pickRandomMirrorClass,
  resolveMirrorEquippedSkillIds,
} from '../../shared/combat/mirrorPlayerConfig.js';
import { moveIdsToSkillData } from '../../shared/combat/movesetLoadout.js';
import { createInitialPetAllianceState } from '../../shared/combat/allianceTurnCycle.js';
import type { Combatant, CombatState } from '../../shared/types.js';
import { computePlayerHpMax } from '../../shared/character/playerVitals.js';
import { loadCombatBalanceConfig } from '../engine/combatBalanceConfig.js';

function resolveClassSpeedBias(classId: ReturnType<typeof pickRandomMirrorClass>): number {
  return loadCombatBalanceConfig().initiative.classSpeedBias[classId] ?? 0;
}

export function buildMirrorPlayerCombatant(seed?: number): Combatant {
  const classId = pickRandomMirrorClass(seed);
  const actorId = buildMirrorBotActorId();
  const name = buildMirrorBotDisplayName(classId);
  const equippedSkillIds = resolveMirrorEquippedSkillIds(classId);
  const skills = moveIdsToSkillData(equippedSkillIds);
  const resolved = resolveCombatLoadout({
    classId,
    level: 12,
    equippedSkillIds,
    activeMarcos: [],
    nodeProgression: { byNodeId: {} },
    equipped: {},
    flowSpeedBase: 32,
  });
  const maxHp = computePlayerHpMax(resolved.modifiers.maxHpBonusPercent);

  return {
    id: actorId,
    name,
    hp: maxHp,
    maxHp,
    hpCurrent: maxHp,
    hpMax: maxHp,
    classId,
    combatRole: 'PLAYER',
    speedProfile: {
      flowSpeedBase: 32,
      classSpeedBias: resolveClassSpeedBias(classId),
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

export function buildMirrorInjectedState(
  current: CombatState,
  mirror: Combatant,
  playerActorId: string,
): CombatState {
  const combatants: Record<string, Combatant> = {};
  for (const [id, combatant] of Object.entries(current.combatants)) {
    if (combatant.combatRole === 'ENEMY') continue;
    combatants[id] = combatant;
  }
  combatants[mirror.id] = mirror;

  const hasPet = Object.values(combatants).some((c) => c.combatRole === 'PET');

  return {
    ...current,
    battleType: BattleType.PVP,
    combatants,
    phase: 'CHOOSING',
    activeActorId: playerActorId,
    ...(hasPet ? createInitialPetAllianceState() : {}),
  };
}
