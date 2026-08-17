import type { EquippedSlots } from '../character/equipmentState.js';

import type { CombatClassId, CombatStatSources, CombatantCombatStats, MarcoCombatFlags } from '../types.js';

import { ItemBuffType, RuneCombatEffectType, RuneTrigger, type ItemBuffModifier } from '../items/itemTypes.js';

import { getBookDefinition, getRuneDefinition } from '../items/runesBooksCatalog.js';

import { getEquipableItem } from '../items/itemCatalog.js';

import {

  computeMarcoBranchTotals,

  getEstiloPersonagem,

  type EstiloPersonagem,

  type MarcoBranchTotals,

  type MarcoDominanceInput,

} from '../progression/estiloPersonagem.js';

import type { MarcosNodeProgressionData } from '../progression/marcoProgression.js';

import { resolveMarcoCombatModifiers } from './resolveMarcoCombatModifiers.js';
import { EquipmentSlot } from '../items/itemTypes.js';
import {
  applyBuffsToPercentMap,
  type BuffPercentByType,
} from './combatBuffSnapshot.js';



/**

 * Entrada única para o motor de combate — moveset de classe é a base;

 * marcos, runas, livros e equipáveis somam buffs em `combatStats` + `combatStatSources`.

 */

export type CombatLoadoutResolveInput = {

  readonly classId: CombatClassId;

  readonly level: number;

  readonly equippedSkillIds: readonly string[];

  readonly activeMarcos: readonly string[];

  readonly nodeProgression: MarcosNodeProgressionData;

  readonly equipped: EquippedSlots;

  /** Extra do grid visual (2º anel, calças+botas, 2º amuleto) — soma no combate. */
  readonly equippedItemIds?: readonly string[];

  readonly flowSpeedBase: number;

};



export type CombatModifierStack = {

  readonly attackPercent: number;

  readonly defensePercent: number;

  readonly critChanceBonus: number;

  readonly critDamageBonus: number;

  readonly dodgePercent: number;

  readonly maxHpBonusPercent: number;

  readonly equipSpeedFlat: number;

  readonly damageReductionPercent: number;

};



export type ResolvedCombatLoadout = {

  readonly combatStatSources: CombatStatSources;

  readonly combatStats: CombatantCombatStats;

  readonly modifiers: CombatModifierStack;

  readonly marcoBranchTotals: MarcoBranchTotals;

  readonly estilo: EstiloPersonagem;

  readonly marcoSpeedFlat: number;

  readonly marcoCombatFlags: MarcoCombatFlags;

};



type StatAccumulator = {

  equipSpeedFlat: number;

  critChanceBonus: number;

  critDamageBonus: number;

  defensePercent: number;

  maxHpBonusPercent: number;

  attackPercent: number;

  dodgePercent: number;

  damageReductionPercent: number;

  agilityPercent: number;

};



function emptyStats(): StatAccumulator {

  return {

    equipSpeedFlat: 0,

    critChanceBonus: 0,

    critDamageBonus: 0,

    defensePercent: 0,

    maxHpBonusPercent: 0,

    attackPercent: 0,

    dodgePercent: 0,

    damageReductionPercent: 0,

    agilityPercent: 0,

  };

}



function applyBuffModifiers(target: StatAccumulator, buffs: readonly ItemBuffModifier[]): void {

  for (const buff of buffs) {

    switch (buff.type) {

      case ItemBuffType.Agility:

        target.agilityPercent += buff.percent;

        break;

      case ItemBuffType.Critical:

        target.critChanceBonus += buff.percent / 100;

        break;

      case ItemBuffType.Defense:

        target.defensePercent += buff.percent;

        break;

      case ItemBuffType.Hp:

        target.maxHpBonusPercent += buff.percent;

        break;

      case ItemBuffType.Strength:

        target.attackPercent += buff.percent;

        break;

      case ItemBuffType.Dodge:

        target.dodgePercent += buff.percent;

        break;

    }

  }

}



/** Marcos: stats de rolagem (crítico, esquiva, redução) — % ATK/DEF ficam só em `combatStatSources`. */
function applyMarcoRollStats(target: StatAccumulator, marcos: ReturnType<typeof resolveMarcoCombatModifiers>): void {
  const p = marcos.passives;
  target.critChanceBonus += p.critChanceBonus;
  target.critDamageBonus += p.critDamageBonus;
  target.dodgePercent += p.dodgePercent;
  target.damageReductionPercent += p.damageReductionPercent;
}

function mergeStatAccumulators(...parts: readonly StatAccumulator[]): StatAccumulator {
  const out = emptyStats();
  for (const part of parts) {
    out.equipSpeedFlat += part.equipSpeedFlat;
    out.critChanceBonus += part.critChanceBonus;
    out.critDamageBonus += part.critDamageBonus;
    out.defensePercent += part.defensePercent;
    out.maxHpBonusPercent += part.maxHpBonusPercent;
    out.attackPercent += part.attackPercent;
    out.dodgePercent += part.dodgePercent;
    out.damageReductionPercent += part.damageReductionPercent;
    out.agilityPercent += part.agilityPercent;
  }
  return out;
}

function emptyCombatStatSources(): CombatStatSources {
  return {
    attackRunePercent: 0,
    attackBookPercent: 0,
    attackArmorPercent: 0,
    attackMarcosFlat: 0,
    attackMarcosPercent: 0,
    defenseArmorPercent: 0,
    defenseRunePercent: 0,
    defenseBookPercent: 0,
    defenseMarcosFlat: 0,
    defenseMarcosPercent: 0,
    marcoCritPercent: 0,
    marcoDodgePercent: 0,
    marcoDamageReductionPercent: 0,
  };
}



function uniqueEquippedItemIds(
  equipped: EquippedSlots,
  extraItemIds: readonly (string | null | undefined)[] = [],
): readonly string[] {
  const ids: string[] = [];
  const seen = new Set<string>();
  const push = (itemId: string | null | undefined) => {
    if (!itemId || seen.has(itemId)) return;
    seen.add(itemId);
    ids.push(itemId);
  };
  push(equipped.head);
  push(equipped.top);
  push(equipped.bottom);
  push(equipped.ring);
  push(equipped.amulet);
  for (const itemId of extraItemIds) push(itemId);
  return ids;
}

function collectArmorItemBonuses(
  equipped: EquippedSlots,
  extraItemIds: readonly string[] = [],
): {
  readonly stats: StatAccumulator;
  readonly attackArmorPercent: number;
  readonly defenseArmorPercent: number;
  readonly equipByBuff: BuffPercentByType;
  readonly amuletByBuff: BuffPercentByType;
  readonly ringByBuff: BuffPercentByType;
} {
  const stats = emptyStats();
  const equipByBuff: BuffPercentByType = {};
  const amuletByBuff: BuffPercentByType = {};
  const ringByBuff: BuffPercentByType = {};
  let attackArmorPercent = 0;
  let defenseArmorPercent = 0;

  const applyPiece = (buffs: readonly ItemBuffModifier[], target: BuffPercentByType): void => {
    applyBuffModifiers(stats, buffs);
    applyBuffsToPercentMap(target, buffs);
    for (const buff of buffs) {
      if (buff.type === ItemBuffType.Strength) attackArmorPercent += buff.percent;
      if (buff.type === ItemBuffType.Defense) defenseArmorPercent += buff.percent;
    }
  };

  for (const itemId of uniqueEquippedItemIds(equipped, extraItemIds)) {
    const equipable = getEquipableItem(itemId);
    if (!equipable) continue;
    if (equipable.slot === EquipmentSlot.Amulet) {
      applyPiece(equipable.buffs, amuletByBuff);
      continue;
    }
    if (equipable.slot === EquipmentSlot.Ring) {
      applyPiece(equipable.buffs, ringByBuff);
      continue;
    }
    if (equipable.slot === EquipmentSlot.Book || equipable.slot === EquipmentSlot.Rune) {
      continue;
    }
    applyPiece(equipable.buffs, equipByBuff);
  }

  return {
    stats,
    attackArmorPercent,
    defenseArmorPercent,
    equipByBuff,
    amuletByBuff,
    ringByBuff,
  };
}

function collectRuneBonuses(runeId: string | null | undefined): {
  readonly stats: StatAccumulator;
  readonly attackRunePercent: number;
  readonly defenseRunePercent: number;
  readonly runeByBuff: BuffPercentByType;
} {
  const stats = emptyStats();
  const runeByBuff: BuffPercentByType = {};
  let attackRunePercent = 0;
  let defenseRunePercent = 0;
  if (!runeId) {
    return { stats, attackRunePercent, defenseRunePercent, runeByBuff };
  }

  const rune = getRuneDefinition(runeId);
  if (!rune) {
    return { stats, attackRunePercent, defenseRunePercent, runeByBuff };
  }

  if (rune.passiveBuffs) {
    applyBuffModifiers(stats, rune.passiveBuffs);
    applyBuffsToPercentMap(runeByBuff, rune.passiveBuffs);
    for (const buff of rune.passiveBuffs) {
      if (buff.type === ItemBuffType.Strength) attackRunePercent += buff.percent;
      if (buff.type === ItemBuffType.Defense) defenseRunePercent += buff.percent;
    }
  }

  // IMPACT CRIT entra na chance do combatente (todos os golpes do moveset), não só no proc.
  const combat = rune.combatEffect;
  if (
    combat.type === RuneCombatEffectType.CritBonus
    && combat.trigger === RuneTrigger.Impact
    && combat.value > 0
  ) {
    stats.critChanceBonus += combat.value;
  }

  return { stats, attackRunePercent, defenseRunePercent, runeByBuff };
}

function collectBookBonuses(bookId: string | null | undefined): {
  readonly stats: StatAccumulator;
  readonly attackBookPercent: number;
  readonly defenseBookPercent: number;
  readonly bookByBuff: BuffPercentByType;
} {
  const stats = emptyStats();
  const bookByBuff: BuffPercentByType = {};
  let attackBookPercent = 0;
  let defenseBookPercent = 0;
  if (!bookId) {
    return { stats, attackBookPercent, defenseBookPercent, bookByBuff };
  }

  const book = getBookDefinition(bookId);
  if (!book?.passiveBuffs) {
    return { stats, attackBookPercent, defenseBookPercent, bookByBuff };
  }

  applyBuffModifiers(stats, book.passiveBuffs);
  applyBuffsToPercentMap(bookByBuff, book.passiveBuffs);
  for (const buff of book.passiveBuffs) {
    if (buff.type === ItemBuffType.Strength) attackBookPercent += buff.percent;
    if (buff.type === ItemBuffType.Defense) defenseBookPercent += buff.percent;
  }

  return { stats, attackBookPercent, defenseBookPercent, bookByBuff };
}



/** Domínio por trilha — Ficha / estilo; não entra na fórmula de dano do motor. */

function resolveMarcoDominanceFlat(

  equippedSkillIds: readonly string[],

  marcos: MarcoDominanceInput,

): Pick<CombatStatSources, 'attackMarcosFlat' | 'defenseMarcosFlat'> {

  const totals = computeMarcoBranchTotals(equippedSkillIds, marcos);

  return {

    attackMarcosFlat: totals.fluxo + totals.precisao,

    defenseMarcosFlat: totals.resiliencia,

  };

}



/**

 * Resolve todas as contribuições do loadout para o CombatEngine.

 * Camadas independentes: equipamento + runa + livro + marcos (sem uma depender da outra).

 */

export function resolveCombatLoadout(input: CombatLoadoutResolveInput): ResolvedCombatLoadout {

  const marcoInput: MarcoDominanceInput = {

    activeMarcos: input.activeMarcos,

    nodeProgression: input.nodeProgression,

    playerLevel: input.level,

  };



  const armor = collectArmorItemBonuses(input.equipped, input.equippedItemIds ?? []);

  const rune = collectRuneBonuses(input.equipped.rune);

  const book = collectBookBonuses(input.equipped.book);

  const marcoResolved = resolveMarcoCombatModifiers({

    activeMarcos: input.activeMarcos,

    nodeProgression: input.nodeProgression,

    playerLevel: input.level,

  });



  const gearStats = mergeStatAccumulators(armor.stats, rune.stats, book.stats);

  const marcoRollStats = emptyStats();

  applyMarcoRollStats(marcoRollStats, marcoResolved);

  const stats = mergeStatAccumulators(gearStats, marcoRollStats);



  const marcoDominance = resolveMarcoDominanceFlat(input.equippedSkillIds, marcoInput);

  const marcoBranchTotals = computeMarcoBranchTotals(input.equippedSkillIds, marcoInput);

  const estilo = getEstiloPersonagem(input.equippedSkillIds, marcoInput);



  const marcoCritPercent = Math.round(marcoResolved.passives.critChanceBonus * 100);

  const marcoAttackPercent = marcoResolved.passives.attackPercent;

  const marcoDefensePercent = marcoResolved.passives.defensePercent;

  const marcoDodgePercent = marcoResolved.passives.dodgePercent;

  const marcoDamageReductionPercent = marcoResolved.passives.damageReductionPercent;



  const combatStatSources: CombatStatSources = {

    ...emptyCombatStatSources(),

    attackArmorPercent: armor.attackArmorPercent,

    equipByBuff: armor.equipByBuff,

    amuletByBuff: armor.amuletByBuff,

    ringByBuff: armor.ringByBuff,

    defenseArmorPercent: armor.defenseArmorPercent,

    attackRunePercent: rune.attackRunePercent,

    defenseRunePercent: rune.defenseRunePercent,

    runeByBuff: rune.runeByBuff,

    attackBookPercent: book.attackBookPercent,

    defenseBookPercent: book.defenseBookPercent,

    bookByBuff: book.bookByBuff,

    attackMarcosFlat: marcoDominance.attackMarcosFlat,

    defenseMarcosFlat: marcoDominance.defenseMarcosFlat,

    attackMarcosPercent: marcoAttackPercent,

    defenseMarcosPercent: marcoDefensePercent,

    marcoCritPercent,

    marcoDodgePercent,

    marcoDamageReductionPercent,

  };



  const combatStats: CombatantCombatStats = {

    critChanceBonus: stats.critChanceBonus,

    critDamageBonus: stats.critDamageBonus,

    defensePercent: stats.defensePercent,

    attackPercent: stats.attackPercent,

    dodgePercent: stats.dodgePercent,

    damageReductionPercent: stats.damageReductionPercent,

    maxHpBonusPercent: stats.maxHpBonusPercent,

    agilityPercent: stats.agilityPercent,

  };



  const modifiers: CombatModifierStack = {

    attackPercent: stats.attackPercent,

    defensePercent: stats.defensePercent,

    critChanceBonus: stats.critChanceBonus,

    critDamageBonus: stats.critDamageBonus,

    dodgePercent: stats.dodgePercent,

    maxHpBonusPercent: stats.maxHpBonusPercent,

    equipSpeedFlat: stats.equipSpeedFlat,

    damageReductionPercent: stats.damageReductionPercent,

  };



  const marcoCombatFlags: MarcoCombatFlags = {

    beyondTimeStepsCharges: marcoResolved.flags.beyondTimeStepsCharges,

    precisionMasterReady: marcoResolved.flags.precisionMasterReady,

    invincibleBastionEnabled: marcoResolved.flags.invincibleBastionEnabled,

    stableFluxExhaustionReductionPercent: marcoResolved.passives.exhaustionReductionPercent,

  };



  return {

    combatStatSources,

    combatStats,

    modifiers,

    marcoBranchTotals,

    estilo,

    marcoSpeedFlat: marcoResolved.passives.speedFlat,

    marcoCombatFlags,

  };

}


