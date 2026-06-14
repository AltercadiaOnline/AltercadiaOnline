import type { PlayerCombatLoadout } from '../../shared/character/equipmentState.js';
import { ConsumableEffectType, ConsumableUsage } from '../../shared/items/itemTypes.js';
import { getConsumableDefinition } from '../../shared/items/consumablesCatalog.js';
import { getRuneDefinition } from '../../shared/items/runesBooksCatalog.js';
import type { Combatant, CombatantCombatStats, SkillData } from '../../shared/types.js';
import { resolveCombatLoadout } from '../../shared/combat/combatLoadoutResolver.js';
import {
  resolveEquippedRuneDurability,
} from '../../shared/items/chargedEquipment.js';
import { loadCombatBalanceConfig } from '../engine/combatBalanceConfig.js';
import { clampPlayerHpCurrent, computePlayerHpMax } from '../../shared/character/playerVitals.js';

function resolveClassSpeedBias(classId: PlayerCombatLoadout['classId']): number {
  return loadCombatBalanceConfig().initiative.classSpeedBias[classId] ?? 0;
}

export function buildCombatantFromLoadout(
  loadout: PlayerCombatLoadout,
  battleSkills: SkillData[],
  displayName = 'Operative',
): Combatant {
  const resolved = resolveCombatLoadout({
    classId: loadout.classId,
    level: loadout.level,
    equippedSkillIds: loadout.equippedSkillIds,
    activeMarcos: loadout.activeMarcos,
    nodeProgression: loadout.nodeProgression,
    equipped: loadout.equipped,
    flowSpeedBase: loadout.flowSpeedBase,
  });

  const maxHp = computePlayerHpMax(resolved.modifiers.maxHpBonusPercent);
  const persistedHp = loadout.worldVitals?.hpCurrent;
  const hpCurrent =
    persistedHp !== undefined ? clampPlayerHpCurrent(persistedHp, maxHp) : maxHp;

  const combatStats: CombatantCombatStats = resolved.combatStats;

  const activeConsumables = loadout.inventory
    .filter((stack) => {
      const def = getConsumableDefinition(stack.itemId);
      return def?.usage === ConsumableUsage.InCombat && stack.quantity > 0;
    })
    .map((stack) => ({ itemId: stack.itemId, quantity: stack.quantity }));

  let runeInstance: Combatant['runeInstance'];
  const runeDurability = resolveEquippedRuneDurability(loadout.inventory, loadout.equipped);
  if (loadout.equipped.rune && runeDurability > 0) {
    const rune = getRuneDefinition(loadout.equipped.rune);
    if (rune) {
      const combatProcs = rune.combatProcsPerBattle;
      runeInstance = {
        runeId: rune.id,
        chargesRemaining: combatProcs,
        maxCharges: combatProcs,
        combatEffect: rune.combatEffect,
      };
    }
  }

  const base: Combatant = {
    id: loadout.playerId,
    name: loadout.displayName ?? displayName,
    hp: hpCurrent,
    maxHp,
    hpCurrent,
    hpMax: maxHp,
    classId: loadout.classId,
    combatRole: 'PLAYER',
    speedProfile: {
      flowSpeedBase: loadout.flowSpeedBase,
      activeMarcos: [...loadout.activeMarcos],
      marcoSpeedFlat: resolved.marcoSpeedFlat,
      equipSpeedFlat: resolved.modifiers.equipSpeedFlat,
      classSpeedBias: resolveClassSpeedBias(loadout.classId),
      runeSpeedFlatConditional: 0,
    },
    skills: battleSkills,
    combatStats,
    combatStatSources: resolved.combatStatSources,
    marcoCombatFlags: resolved.marcoCombatFlags,
    activeConsumables,
    statusEffects: [],
    activeStatuses: [],
    activeShields: [],
    temporaryModifiers: [],
    lockedSkillIds: [],
  };

  return runeInstance ? { ...base, runeInstance } : base;
}

export function computeConsumableHeal(combatant: Combatant, consumableId: string): number {
  const def = getConsumableDefinition(consumableId);
  if (!def) return 0;
  const maxHp = combatant.hpMax ?? combatant.maxHp;
  let heal = 0;
  for (const effect of def.effects) {
    if (effect.type === ConsumableEffectType.HealHp) {
      heal += effect.value <= 1
        ? Math.floor(maxHp * effect.value)
        : Math.floor(effect.value);
    }
  }
  return heal;
}
