import { ZoneId, type ZoneId as ZoneIdType } from '../items/itemTypes.js';
import { getCreatureDropEntry } from '../items/creatureDrops.js';
import { RuntimeStatusId } from '../types/combat.js';
import { MoveEffectKind, type MoveEffectKind as MoveEffectKindType } from './classMovesetCatalog.js';

/**
 * Catálogo de debuffs de monstros — réplica dos status/effectKinds do moveset do jogador.
 * Slots por zona: Z1=1, Z2=2, Z3=3 (Z4+ cap 3).
 */

export type MonsterDebuffSlotCount = 1 | 2 | 3;

export type MonsterDebuffCandidate = {
  readonly skillId: string;
  readonly statusId: string;
  readonly effectKind: MoveEffectKindType;
  /** Rótulo de lore (PT) — UI / debug. */
  readonly loreLabel: string;
};

export type MonsterDebuffProfile = {
  readonly creatureId: string;
  readonly zoneId: ZoneIdType;
  /** Nível de jogador alvo (teto sugerido da zona). */
  readonly recommendedPlayerLevelMax: number;
  readonly candidates: readonly MonsterDebuffCandidate[];
};

const ZONE_DEBUFF_SLOTS: Record<ZoneIdType, MonsterDebuffSlotCount> = {
  [ZoneId.Zone1]: 1,
  [ZoneId.Zone2]: 2,
  [ZoneId.Zone3]: 3,
  [ZoneId.Zone4]: 3,
  [ZoneId.Zone5]: 3,
};

const ZONE_LEVEL_MAX: Record<ZoneIdType, number> = {
  [ZoneId.Zone1]: 10,
  [ZoneId.Zone2]: 20,
  [ZoneId.Zone3]: 30,
  [ZoneId.Zone4]: 40,
  [ZoneId.Zone5]: 99,
};

/** Status que contam como debuff de monstro (subset do moveset). */
export const MONSTER_DEBUFF_STATUS_IDS: ReadonlySet<string> = new Set([
  RuntimeStatusId.Burn,
  RuntimeStatusId.Paralyze,
  RuntimeStatusId.Confuse,
  RuntimeStatusId.DelayedDetonation,
  RuntimeStatusId.MovesetWeaken,
  RuntimeStatusId.LockEnemyMoves,
]);

export function zoneMonsterDebuffSlots(zoneId: ZoneIdType): MonsterDebuffSlotCount {
  return ZONE_DEBUFF_SLOTS[zoneId] ?? 1;
}

export function zoneRecommendedPlayerLevelMax(zoneId: ZoneIdType): number {
  return ZONE_LEVEL_MAX[zoneId] ?? 10;
}

/**
 * Perfis lore-coerentes. Zone 1 completo (1 slot ativo).
 * Zone 2/3: candidatos prontos — skills entram quando a zona for wired no mundo.
 */
export const MONSTER_DEBUFF_PROFILES: Readonly<Record<string, MonsterDebuffProfile>> = {
  // ── Zone 1 (Beco) — 1 debuff ──────────────────────────────────────────
  rat: {
    creatureId: 'rat',
    zoneId: ZoneId.Zone1,
    recommendedPlayerLevelMax: 10,
    candidates: [
      {
        skillId: 'rat_septic',
        statusId: RuntimeStatusId.MovesetWeaken,
        effectKind: MoveEffectKind.MovesetWeaken,
        loreLabel: 'Mordida séptica — enfraquece o moveset',
      },
    ],
  },
  spider: {
    creatureId: 'spider',
    zoneId: ZoneId.Zone1,
    recommendedPlayerLevelMax: 10,
    candidates: [
      {
        skillId: 'spider_venom',
        statusId: RuntimeStatusId.Paralyze,
        effectKind: MoveEffectKind.ApplyParalyze,
        loreLabel: 'Peçonha — paralisia',
      },
    ],
  },
  bat: {
    creatureId: 'bat',
    zoneId: ZoneId.Zone1,
    recommendedPlayerLevelMax: 10,
    candidates: [
      {
        skillId: 'bat_screech',
        statusId: RuntimeStatusId.Confuse,
        effectKind: MoveEffectKind.Confuse,
        loreLabel: 'Guincho ultrassônico — confusão',
      },
    ],
  },
  crow: {
    creatureId: 'crow',
    zoneId: ZoneId.Zone1,
    recommendedPlayerLevelMax: 10,
    candidates: [
      {
        skillId: 'crow_peck',
        statusId: RuntimeStatusId.MovesetWeaken,
        effectKind: MoveEffectKind.MovesetWeaken,
        loreLabel: 'Bicada debilitante',
      },
    ],
  },
  wild_dog: {
    creatureId: 'wild_dog',
    zoneId: ZoneId.Zone1,
    recommendedPlayerLevelMax: 10,
    candidates: [
      {
        skillId: 'wild_dog_bite',
        statusId: RuntimeStatusId.Burn,
        effectKind: MoveEffectKind.ApplyBurn,
        loreLabel: 'Ferida aberta — DoT (Burn)',
      },
    ],
  },

  // ── Zone 2 (Metrô) — até 2 slots ─────────────────────────────────────
  centipede: {
    creatureId: 'centipede',
    zoneId: ZoneId.Zone2,
    recommendedPlayerLevelMax: 20,
    candidates: [
      {
        skillId: 'centipede_sting',
        statusId: RuntimeStatusId.Paralyze,
        effectKind: MoveEffectKind.ApplyParalyze,
        loreLabel: 'Ferrão centopéia',
      },
      {
        skillId: 'centipede_toxin',
        statusId: RuntimeStatusId.MovesetWeaken,
        effectKind: MoveEffectKind.MovesetWeaken,
        loreLabel: 'Toxina lenta',
      },
    ],
  },
  slime: {
    creatureId: 'slime',
    zoneId: ZoneId.Zone2,
    recommendedPlayerLevelMax: 20,
    candidates: [
      {
        skillId: 'slime_acid',
        statusId: RuntimeStatusId.Burn,
        effectKind: MoveEffectKind.ApplyBurn,
        loreLabel: 'Ácido corrosivo',
      },
      {
        skillId: 'slime_glue',
        statusId: RuntimeStatusId.LockEnemyMoves,
        effectKind: MoveEffectKind.LockEnemyMoves,
        loreLabel: 'Lodo grudento — trava moves',
      },
    ],
  },
  humanoid: {
    creatureId: 'humanoid',
    zoneId: ZoneId.Zone2,
    recommendedPlayerLevelMax: 20,
    candidates: [
      {
        skillId: 'humanoid_hex',
        statusId: RuntimeStatusId.Confuse,
        effectKind: MoveEffectKind.Confuse,
        loreLabel: 'Hex dimensional',
      },
      {
        skillId: 'humanoid_drain',
        statusId: RuntimeStatusId.MovesetWeaken,
        effectKind: MoveEffectKind.MovesetWeaken,
        loreLabel: 'Dreno de frequência',
      },
    ],
  },
  golem: {
    creatureId: 'golem',
    zoneId: ZoneId.Zone2,
    recommendedPlayerLevelMax: 20,
    candidates: [
      {
        skillId: 'golem_crush',
        statusId: RuntimeStatusId.MovesetWeaken,
        effectKind: MoveEffectKind.MovesetWeaken,
        loreLabel: 'Impacto entorpecente',
      },
      {
        skillId: 'golem_quake',
        statusId: RuntimeStatusId.DelayedDetonation,
        effectKind: MoveEffectKind.DelayedDetonation,
        loreLabel: 'Tremor retardado',
      },
    ],
  },
  specter: {
    creatureId: 'specter',
    zoneId: ZoneId.Zone2,
    recommendedPlayerLevelMax: 20,
    candidates: [
      {
        skillId: 'specter_wail',
        statusId: RuntimeStatusId.Confuse,
        effectKind: MoveEffectKind.Confuse,
        loreLabel: 'Lamento espectral',
      },
      {
        skillId: 'specter_chill',
        statusId: RuntimeStatusId.MovesetWeaken,
        effectKind: MoveEffectKind.MovesetWeaken,
        loreLabel: 'Frio do véu',
      },
    ],
  },

  // ── Zone 3 (Estacionamento) — até 3 slots ────────────────────────────
  minotaur: {
    creatureId: 'minotaur',
    zoneId: ZoneId.Zone3,
    recommendedPlayerLevelMax: 30,
    candidates: [
      {
        skillId: 'minotaur_gore',
        statusId: RuntimeStatusId.Burn,
        effectKind: MoveEffectKind.ApplyBurn,
        loreLabel: 'Chifres dilacerantes',
      },
      {
        skillId: 'minotaur_roar',
        statusId: RuntimeStatusId.Confuse,
        effectKind: MoveEffectKind.Confuse,
        loreLabel: 'Rugido atordoante',
      },
      {
        skillId: 'minotaur_stomp',
        statusId: RuntimeStatusId.MovesetWeaken,
        effectKind: MoveEffectKind.MovesetWeaken,
        loreLabel: 'Pisada esmagadora',
      },
    ],
  },
  metal_spider: {
    creatureId: 'metal_spider',
    zoneId: ZoneId.Zone3,
    recommendedPlayerLevelMax: 30,
    candidates: [
      {
        skillId: 'metal_spider_shock',
        statusId: RuntimeStatusId.Paralyze,
        effectKind: MoveEffectKind.ApplyParalyze,
        loreLabel: 'Choque metálico',
      },
      {
        skillId: 'metal_spider_burn',
        statusId: RuntimeStatusId.Burn,
        effectKind: MoveEffectKind.ApplyBurn,
        loreLabel: 'Faísca abrasiva',
      },
      {
        skillId: 'metal_spider_web',
        statusId: RuntimeStatusId.LockEnemyMoves,
        effectKind: MoveEffectKind.LockEnemyMoves,
        loreLabel: 'Teia de cabo',
      },
    ],
  },
  gargoyle: {
    creatureId: 'gargoyle',
    zoneId: ZoneId.Zone3,
    recommendedPlayerLevelMax: 30,
    candidates: [
      {
        skillId: 'gargoyle_gaze',
        statusId: RuntimeStatusId.Paralyze,
        effectKind: MoveEffectKind.ApplyParalyze,
        loreLabel: 'Olhar petrificante',
      },
      {
        skillId: 'gargoyle_scree',
        statusId: RuntimeStatusId.Confuse,
        effectKind: MoveEffectKind.Confuse,
        loreLabel: 'Grito de pedra',
      },
      {
        skillId: 'gargoyle_dust',
        statusId: RuntimeStatusId.MovesetWeaken,
        effectKind: MoveEffectKind.MovesetWeaken,
        loreLabel: 'Poeira asfixiante',
      },
    ],
  },
  scorpion: {
    creatureId: 'scorpion',
    zoneId: ZoneId.Zone3,
    recommendedPlayerLevelMax: 30,
    candidates: [
      {
        skillId: 'scorpion_sting',
        statusId: RuntimeStatusId.Paralyze,
        effectKind: MoveEffectKind.ApplyParalyze,
        loreLabel: 'Ferrão',
      },
      {
        skillId: 'scorpion_acid',
        statusId: RuntimeStatusId.Burn,
        effectKind: MoveEffectKind.ApplyBurn,
        loreLabel: 'Ácido',
      },
      {
        skillId: 'scorpion_clamp',
        statusId: RuntimeStatusId.LockEnemyMoves,
        effectKind: MoveEffectKind.LockEnemyMoves,
        loreLabel: 'Pinça travante',
      },
    ],
  },
  lizard: {
    creatureId: 'lizard',
    zoneId: ZoneId.Zone3,
    recommendedPlayerLevelMax: 30,
    candidates: [
      {
        skillId: 'lizard_tongue',
        statusId: RuntimeStatusId.Paralyze,
        effectKind: MoveEffectKind.ApplyParalyze,
        loreLabel: 'Língua paralisante',
      },
      {
        skillId: 'lizard_spit',
        statusId: RuntimeStatusId.Burn,
        effectKind: MoveEffectKind.ApplyBurn,
        loreLabel: 'Cuspe cáustico',
      },
      {
        skillId: 'lizard_daze',
        statusId: RuntimeStatusId.Confuse,
        effectKind: MoveEffectKind.Confuse,
        loreLabel: 'Olhar hipnótico',
      },
    ],
  },
};

/** Ataque básico puro por criatura Zone 1 (variedade de IA). */
export const ZONE1_BASIC_ATTACK_SKILL_IDS: Readonly<Record<string, string>> = {
  rat: 'rat_bite',
  spider: 'spider_bite',
  bat: 'bat_strike',
  crow: 'crow_slash',
  wild_dog: 'wild_dog_snap',
};

export function getMonsterDebuffProfile(creatureId: string): MonsterDebuffProfile | null {
  return MONSTER_DEBUFF_PROFILES[creatureId] ?? null;
}

/** Debuffs ativos = primeiros N candidatos do perfil (N = slots da zona). */
export function resolveActiveMonsterDebuffs(
  creatureId: string,
): readonly MonsterDebuffCandidate[] {
  const profile = getMonsterDebuffProfile(creatureId);
  if (!profile) return [];
  const slots = zoneMonsterDebuffSlots(profile.zoneId);
  return profile.candidates.slice(0, slots);
}

export function resolveActiveMonsterDebuffSkillIds(creatureId: string): readonly string[] {
  return resolveActiveMonsterDebuffs(creatureId).map((row) => row.skillId);
}

/**
 * skillIds de combate: básico (se houver) + debuffs ativos da zona.
 * Specter/minotaur mantêm skills especiais no MonsterCatalog handcrafted.
 */
export function resolveMonsterCombatSkillIds(creatureId: string): readonly string[] {
  const drop = getCreatureDropEntry(creatureId);
  const profile = getMonsterDebuffProfile(creatureId);
  const zoneId = profile?.zoneId ?? drop?.zoneId ?? ZoneId.Zone1;

  const basic = ZONE1_BASIC_ATTACK_SKILL_IDS[creatureId];
  const debuffs = resolveActiveMonsterDebuffSkillIds(creatureId);

  if (basic || debuffs.length > 0) {
    const ids: string[] = [];
    if (basic) ids.push(basic);
    for (const id of debuffs) {
      if (!ids.includes(id)) ids.push(id);
    }
    return ids;
  }

  // Fallback zona sem perfil — ataque genérico.
  void zoneId;
  return ['rat_bite'];
}

export function isMonsterDebuffSkillId(skillId: string): boolean {
  for (const profile of Object.values(MONSTER_DEBUFF_PROFILES)) {
    if (profile.candidates.some((c) => c.skillId === skillId)) return true;
  }
  return false;
}

export function resolveMonsterDebuffLoreLabel(skillId: string): string | null {
  for (const profile of Object.values(MONSTER_DEBUFF_PROFILES)) {
    const hit = profile.candidates.find((c) => c.skillId === skillId);
    if (hit) return hit.loreLabel;
  }
  return null;
}
