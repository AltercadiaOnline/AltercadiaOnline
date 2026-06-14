import type { ClassType } from '../types/classes.js';
import {
  MoveCategory,
  type MoveCategory as MoveCategoryType,
  MoveScalingStat,
  type MoveScalingStat as MoveScalingStatType,
} from './moveTypes.js';

/** Alvo válido da skill — validado no loadout e no motor. */
export const MoveTarget = {
  Self: 'SELF',
  Enemy: 'ENEMY',
  AllEnemies: 'ALL_ENEMIES',
  AllyOrSelf: 'ALLY_OR_SELF',
} as const;

export type MoveTarget = (typeof MoveTarget)[keyof typeof MoveTarget];

/**
 * Identidade mecânica do move — o resolver do motor implementa cada kind.
 * Definimos params numéricos move a move neste catálogo.
 */
export const MoveEffectKind = {
  PureDamage: 'PURE_DAMAGE',
  StackingDamage: 'STACKING_DAMAGE',
  /** Golpe imediato + eco de ataque nos próximos turnos do ator (antes do move escolhido). */
  AttackEcho: 'ATTACK_ECHO',
  /** Acúmulo de buff de ataque — sem locomoção (batalha 2D estática). */
  AttackStack: 'ATTACK_STACK',
  ApplyBurn: 'APPLY_BURN',
  AoeDamage: 'AOE_DAMAGE',
  HighRiskBurst: 'HIGH_RISK_BURST',
  DebuffScalingDamage: 'DEBUFF_SCALING_DAMAGE',
  ApplyParalyze: 'APPLY_PARALYZE',
  PlaceTrap: 'PLACE_TRAP',
  /** Dano imediato menor + detonação amplificada após N turnos (batalha estática). */
  DelayedDetonation: 'DELAYED_DETONATION',
  PpDrain: 'PP_DRAIN',
  /** Reduz a eficácia global dos moves do alvo (dano, cura, buffs) por N turnos. */
  MovesetWeaken: 'MOVESET_WEAKEN',
  DamageMirror: 'DAMAGE_MIRROR',
  LockEnemyMoves: 'LOCK_ENEMY_MOVES',
  RetaliationStrike: 'RETALIATION_STRIKE',
  SelfShield: 'SELF_SHIELD',
  Heal: 'HEAL',
  StatusImmunity: 'STATUS_IMMUNITY',
  Thorns: 'THORNS',
  GroupShield: 'GROUP_SHIELD',
  IgnoreBarrier: 'IGNORE_BARRIER',
  InvertDebuff: 'INVERT_DEBUFF',
  OutOfTurn: 'OUT_OF_TURN',
  CopyLastMove: 'COPY_LAST_MOVE',
  Confuse: 'CONFUSE',
  RandomDamage: 'RANDOM_DAMAGE',
} as const;

export type MoveEffectKind = (typeof MoveEffectKind)[keyof typeof MoveEffectKind];

export type ImpetusMoveId = 'IMP_1' | 'IMP_2' | 'IMP_3' | 'IMP_4' | 'IMP_5' | 'IMP_6';
export type CogitorMoveId = 'COG_1' | 'COG_2' | 'COG_3' | 'COG_4' | 'COG_5' | 'COG_6';
export type TutatorMoveId = 'TUT_1' | 'TUT_2' | 'TUT_3' | 'TUT_4' | 'TUT_5' | 'TUT_6';
export type DissolutusMoveId = 'DIS_1' | 'DIS_2' | 'DIS_3' | 'DIS_4' | 'DIS_5' | 'DIS_6';

export type ClassMoveId = ImpetusMoveId | CogitorMoveId | TutatorMoveId | DissolutusMoveId;

/** Stats fechados na conversa — motor só consome quando `isDefined: true`. */
export type ClassMoveCombatStats = {
  readonly target: MoveTarget;
  readonly priority: 1 | 2 | 3;
  readonly category: MoveCategoryType;
  readonly scalingStat: MoveScalingStatType;
  readonly basePower: number;
  readonly basePp: number;
  readonly cooldown: number;
  readonly effectParams?: Readonly<Record<string, number>>;
};

/**
 * Entrada do catálogo por classe.
 * BASE do sistema: nome + buff + kind sempre presentes; números entram move a move.
 */
export type ClassMoveDefinition = {
  readonly id: ClassMoveId;
  readonly classId: ClassType;
  readonly name: string;
  readonly effectKind: MoveEffectKind;
  /** Buff / efeito em linguagem de design (tooltip, GDD). */
  readonly effectSummary: string;
  readonly isDefined: boolean;
  readonly combat?: ClassMoveCombatStats;
};

export const CLASS_MOVE_POOL_SIZE = 6;
export const CLASS_ACTIVE_LOADOUT_SIZE = 4;

/** Moveset de cura canônico por classe — exatamente 1 por classe. */
export const CLASS_HEAL_MOVE_ID: Readonly<Partial<Record<ClassType, ClassMoveId>>> = {
  IMPETUS: 'IMP_3',
  COGITOR: 'COG_5',
  TUTATOR: 'TUT_3',
  DISSOLUTUS: 'DIS_6',
};

const IMPETUS_MOVES: readonly ClassMoveDefinition[] = [
  {
    id: 'IMP_1',
    classId: 'IMPETUS',
    name: 'Golpe Direto',
    effectKind: MoveEffectKind.PureDamage,
    effectSummary: 'Dano puro no alvo — skill básica de referência da classe.',
    isDefined: true,
    combat: {
      target: MoveTarget.Enemy,
      priority: 1,
      category: MoveCategory.Attack,
      scalingStat: MoveScalingStat.STR,
      basePower: 15,
      basePp: 8,
      cooldown: 1,
    },
  },
  {
    id: 'IMP_2',
    classId: 'IMPETUS',
    name: 'Impulso Crescente',
    effectKind: MoveEffectKind.AttackEcho,
    effectSummary:
      'Preparação — eco +15% do golpe escolhido por 2 turnos seus e +5% crítico. Sem dano na hora. Reusar não renova o eco.',
    isDefined: true,
    combat: {
      target: MoveTarget.Enemy,
      priority: 1,
      category: MoveCategory.Attack,
      scalingStat: MoveScalingStat.STR,
      basePower: 0,
      basePp: 12,
      cooldown: 1,
      effectParams: {
        echoBonusPercent: 15,
        echoTurns: 2,
        critBonusPercent: 5,
      },
    },
  },
  {
    id: 'IMP_3',
    classId: 'IMPETUS',
    name: 'Fôlego Impulsivo',
    effectKind: MoveEffectKind.Heal,
    effectSummary: 'Cura canônica da classe — recuperação rápida em si, escala com STR.',
    isDefined: true,
    combat: {
      target: MoveTarget.Self,
      priority: 2,
      category: MoveCategory.Support,
      scalingStat: MoveScalingStat.STR,
      basePower: 10,
      basePp: 8,
      cooldown: 2,
      effectParams: {
        healScalingPercent: 100,
      },
    },
  },
  {
    id: 'IMP_4',
    classId: 'IMPETUS',
    name: 'Lâmina Ardente',
    effectKind: MoveEffectKind.ApplyBurn,
    effectSummary: 'Aplica Burn — dano contínuo por turno.',
    isDefined: true,
    combat: {
      target: MoveTarget.Enemy,
      priority: 1,
      category: MoveCategory.Attack,
      scalingStat: MoveScalingStat.STR,
      basePower: 16,
      basePp: 5,
      cooldown: 2,
      effectParams: {
        burnDamagePercent: 5,
        burnTurns: 3,
      },
    },
  },
  {
    id: 'IMP_5',
    classId: 'IMPETUS',
    name: 'Varredura de Impacto',
    effectKind: MoveEffectKind.AoeDamage,
    effectSummary:
      'Ataque em área — atinge todos os inimigos e gera bônus de ataque por 2 turnos sequenciais.',
    isDefined: true,
    combat: {
      target: MoveTarget.AllEnemies,
      priority: 1,
      category: MoveCategory.Attack,
      scalingStat: MoveScalingStat.STR,
      basePower: 14,
      basePp: 8,
      cooldown: 2,
      effectParams: {
        aoeDamageMultiplier: 0.85,
        nextTurnAttackBonusPercent: 5,
        nextTurnAttackBonusTurns: 2,
      },
    },
  },
  {
    id: 'IMP_6',
    classId: 'IMPETUS',
    name: 'Fúria Suicida',
    effectKind: MoveEffectKind.HighRiskBurst,
    effectSummary: 'Dano alto com custo em si (autodano / exposição).',
    isDefined: true,
    combat: {
      target: MoveTarget.Enemy,
      priority: 1,
      category: MoveCategory.Attack,
      scalingStat: MoveScalingStat.STR,
      basePower: 30,
      basePp: 6,
      cooldown: 3,
      effectParams: {
        selfDamagePercent: 35,
      },
    },
  },
];

const COGITOR_MOVES: readonly ClassMoveDefinition[] = [
  {
    id: 'COG_1',
    classId: 'COGITOR',
    name: 'Execução Geométrica',
    effectKind: MoveEffectKind.DebuffScalingDamage,
    effectSummary: 'Dano que escala com debuffs já aplicados no alvo.',
    isDefined: true,
    combat: {
      target: MoveTarget.Enemy,
      priority: 1,
      category: MoveCategory.Attack,
      scalingStat: MoveScalingStat.CRIT,
      basePower: 18,
      basePp: 12,
      cooldown: 1,
      effectParams: {
        debuffBonusPercent: 12,
        debuffBonusCap: 3,
      },
    },
  },
  {
    id: 'COG_2',
    classId: 'COGITOR',
    name: 'Sobrecarga Mental',
    effectKind: MoveEffectKind.ApplyParalyze,
    effectSummary:
      'Paralisia com chance de falha e debuff adicional: buffs jogados contra o player ficam 20% mais fracos por 3 turnos.',
    isDefined: true,
    combat: {
      target: MoveTarget.Enemy,
      priority: 2,
      category: MoveCategory.Support,
      scalingStat: MoveScalingStat.CRIT,
      basePower: 0,
      basePp: 10,
      cooldown: 2,
      effectParams: {
        paralyzeSkipTurnChance: 60,
        paralyzeTurns: 1,
        incomingBuffWeakenPercent: 20,
        incomingBuffWeakenTurns: 3,
      },
    },
  },
  {
    id: 'COG_3',
    classId: 'COGITOR',
    name: 'Mina Dimensional',
    effectKind: MoveEffectKind.DelayedDetonation,
    effectSummary:
      'Golpe inicial fraco no cast; após 2 turnos detona com dano 3× o valor inicial.',
    isDefined: true,
    combat: {
      target: MoveTarget.Enemy,
      priority: 2,
      category: MoveCategory.Attack,
      scalingStat: MoveScalingStat.CRIT,
      basePower: 12,
      basePp: 8,
      cooldown: 3,
      effectParams: {
        delayedTurns: 2,
        delayedDamageMultiplier: 3,
      },
    },
  },
  {
    id: 'COG_4',
    classId: 'COGITOR',
    name: 'Dreno Temporal',
    effectKind: MoveEffectKind.MovesetWeaken,
    effectSummary:
      'Drena HP leve no cast, −15% na eficácia inimiga por 3 turnos e marca debilitamento até o fim da partida (conta para Execução Geométrica).',
    isDefined: true,
    combat: {
      target: MoveTarget.Enemy,
      priority: 2,
      category: MoveCategory.Support,
      scalingStat: MoveScalingStat.CRIT,
      basePower: 8,
      basePp: 10,
      cooldown: 2,
      effectParams: {
        weakenPercent: 15,
        weakenTurns: 3,
        debuffUntilBattleEnd: 1,
        battleEndDebuffWeakenPercent: 15,
      },
    },
  },
  {
    id: 'COG_5',
    classId: 'COGITOR',
    name: 'Recalibração Causal',
    effectKind: MoveEffectKind.Heal,
    effectSummary:
      'Cura canônica da classe com eco temporal: cura base e, nos 2 turnos seguintes, recebe 10% da cura base.',
    isDefined: true,
    combat: {
      target: MoveTarget.Self,
      priority: 2,
      category: MoveCategory.Support,
      scalingStat: MoveScalingStat.CRIT,
      basePower: 18,
      basePp: 8,
      cooldown: 2,
      effectParams: {
        healScalingPercent: 100,
        nextTurnsBaseHealEchoPercent: 10,
        nextTurnsBaseHealEchoTurns: 2,
      },
    },
  },
  {
    id: 'COG_6',
    classId: 'COGITOR',
    name: 'Bloqueio Lógico',
    effectKind: MoveEffectKind.LockEnemyMoves,
    effectSummary:
      'Trava 2 moves do loadout inimigo no próximo turno e aplica debuff Bloqueio Lógico (conta para Execução Geométrica).',
    isDefined: true,
    combat: {
      target: MoveTarget.Enemy,
      priority: 2,
      category: MoveCategory.Support,
      scalingStat: MoveScalingStat.CRIT,
      basePower: 0,
      basePp: 6,
      cooldown: 3,
      effectParams: {
        lockMoveCount: 2,
        lockTurns: 1,
        debuffTurns: 2,
        debuffWeakenPercent: 15,
      },
    },
  },
];

const TUTATOR_MOVES: readonly ClassMoveDefinition[] = [
  {
    id: 'TUT_1',
    classId: 'TUTATOR',
    name: 'Retribuição de Impacto',
    effectKind: MoveEffectKind.RetaliationStrike,
    effectSummary: 'Dano DEF que escala com o dano total recebido desde a última Retribuição.',
    isDefined: true,
    combat: {
      target: MoveTarget.Enemy,
      priority: 1,
      category: MoveCategory.Attack,
      scalingStat: MoveScalingStat.DEF,
      basePower: 16,
      basePp: 12,
      cooldown: 1,
      effectParams: {
        retaliationDamageStep: 10,
        retaliationBonusCapPercent: 30,
      },
    },
  },
  {
    id: 'TUT_2',
    classId: 'TUTATOR',
    name: 'Égide de Volts',
    effectKind: MoveEffectKind.SelfShield,
    effectSummary: 'Gera escudo temporário que absorve dano antes do HP.',
    isDefined: true,
    combat: {
      target: MoveTarget.Self,
      priority: 2,
      category: MoveCategory.Defense,
      scalingStat: MoveScalingStat.DEF,
      basePower: 0,
      basePp: 10,
      cooldown: 2,
      effectParams: {
        shieldPercent: 20,
        shieldTurns: 2,
      },
    },
  },
  {
    id: 'TUT_3',
    classId: 'TUTATOR',
    name: 'Pulso Vital',
    effectKind: MoveEffectKind.Heal,
    effectSummary: 'Cura canônica da classe — si ou aliado, escala com DEF.',
    isDefined: true,
    combat: {
      target: MoveTarget.AllyOrSelf,
      priority: 2,
      category: MoveCategory.Support,
      scalingStat: MoveScalingStat.DEF,
      basePower: 18,
      basePp: 10,
      cooldown: 2,
      effectParams: {
        healScalingPercent: 100,
      },
    },
  },
  {
    id: 'TUT_4',
    classId: 'TUTATOR',
    name: 'Campo Isolante',
    effectKind: MoveEffectKind.StatusImmunity,
    effectSummary:
      'Bloqueia novos debuffs por 2 turnos; no turno seguinte, todo dano recebido é reduzido em 50%.',
    isDefined: true,
    combat: {
      target: MoveTarget.Self,
      priority: 2,
      category: MoveCategory.Defense,
      scalingStat: MoveScalingStat.DEF,
      basePower: 0,
      basePp: 8,
      cooldown: 3,
      effectParams: {
        statusBlockTurns: 2,
        incomingDamageReductionPercent: 50,
        damageReductionTurns: 1,
      },
    },
  },
  {
    id: 'TUT_5',
    classId: 'TUTATOR',
    name: 'Casca de Espinhos',
    effectKind: MoveEffectKind.Thorns,
    effectSummary:
      'Devolve 50% do dano recebido; cada reflect concede +15% ATK por 2 turnos.',
    isDefined: true,
    combat: {
      target: MoveTarget.Self,
      priority: 3,
      category: MoveCategory.Defense,
      scalingStat: MoveScalingStat.DEF,
      basePower: 0,
      basePp: 8,
      cooldown: 2,
      effectParams: {
        thornsReflectPercent: 50,
        thornsTurns: 2,
        thornsAttackBonusPercent: 15,
        thornsAttackBonusTurns: 2,
      },
    },
  },
  {
    id: 'TUT_6',
    classId: 'TUTATOR',
    name: 'Surto Tectônico',
    effectKind: MoveEffectKind.ApplyBurn,
    effectSummary: 'Golpe DEF + queimadura leve — chip de HP ao longo dos turnos.',
    isDefined: true,
    combat: {
      target: MoveTarget.Enemy,
      priority: 1,
      category: MoveCategory.Attack,
      scalingStat: MoveScalingStat.DEF,
      basePower: 20,
      basePp: 8,
      cooldown: 2,
      effectParams: {
        burnDamagePercent: 4,
        burnTurns: 3,
      },
    },
  },
];

const DISSOLUTUS_MOVES: readonly ClassMoveDefinition[] = [
  {
    id: 'DIS_1',
    classId: 'DISSOLUTUS',
    name: 'Ruptura Dimensional',
    effectKind: MoveEffectKind.IgnoreBarrier,
    effectSummary: 'Dano direto que ignora 100% de escudo e barreira do alvo.',
    isDefined: true,
    combat: {
      target: MoveTarget.Enemy,
      priority: 1,
      category: MoveCategory.Attack,
      scalingStat: MoveScalingStat.CRIT,
      basePower: 20,
      basePp: 8,
      cooldown: 2,
      effectParams: {
        ignoreBarrierPercent: 100,
      },
    },
  },
  {
    id: 'DIS_2',
    classId: 'DISSOLUTUS',
    name: 'Paradoxo',
    effectKind: MoveEffectKind.InvertDebuff,
    effectSummary:
      'Aplica debuff — ataques inimigos causam 30% menos dano por 3 turnos.',
    isDefined: true,
    combat: {
      target: MoveTarget.Enemy,
      priority: 2,
      category: MoveCategory.Support,
      scalingStat: MoveScalingStat.CRIT,
      basePower: 0,
      basePp: 8,
      cooldown: 2,
      effectParams: {
        swapDebuffCount: 1,
        enemyAttackDamageReductionPercent: 30,
        enemyAttackWeakenTurns: 3,
      },
    },
  },
  {
    id: 'DIS_3',
    classId: 'DISSOLUTUS',
    name: 'Dobra Temporal',
    effectKind: MoveEffectKind.OutOfTurn,
    effectSummary: 'Reação dimensional — age antes do inimigo neste turno com golpe interruptor.',
    isDefined: true,
    combat: {
      target: MoveTarget.Enemy,
      priority: 3,
      category: MoveCategory.Utility,
      scalingStat: MoveScalingStat.AGI,
      basePower: 14,
      basePp: 12,
      cooldown: 3,
      effectParams: {
        reactBeforeEnemy: 1,
      },
    },
  },
  {
    id: 'DIS_4',
    classId: 'DISSOLUTUS',
    name: 'Mímica de Frequência',
    effectKind: MoveEffectKind.CopyLastMove,
    effectSummary:
      'Copia e executa a última skill do alvo no mesmo turno (90% do poder) e aplica debuff no inimigo.',
    isDefined: true,
    combat: {
      target: MoveTarget.Enemy,
      priority: 2,
      category: MoveCategory.Utility,
      scalingStat: MoveScalingStat.CRIT,
      basePower: 0,
      basePp: 8,
      cooldown: 2,
      effectParams: {
        copyLastMove: 1,
        copyPowerMultiplier: 0.9,
        copiedMoveWeakenPercent: 15,
        debuffTurns: 2,
      },
    },
  },
  {
    id: 'DIS_5',
    classId: 'DISSOLUTUS',
    name: 'Distorção Cognitiva',
    effectKind: MoveEffectKind.Confuse,
    effectSummary:
      'Dano na hora + confusão 45% de falha e dano residual 10% HP máx./turno por 2 turnos.',
    isDefined: true,
    combat: {
      target: MoveTarget.Enemy,
      priority: 2,
      category: MoveCategory.Support,
      scalingStat: MoveScalingStat.CRIT,
      basePower: 10,
      basePp: 8,
      cooldown: 2,
      effectParams: {
        confuseFailChance: 45,
        residualDamageFromEnemyAttackPercent: 10,
        residualTurns: 2,
      },
    },
  },
  {
    id: 'DIS_6',
    classId: 'DISSOLUTUS',
    name: 'Instabilidade Quântica',
    effectKind: MoveEffectKind.Heal,
    effectSummary:
      'Cura base com chance de proc: 30% para receber +40% de cura extra sobre o valor base.',
    isDefined: true,
    combat: {
      target: MoveTarget.Self,
      priority: 2,
      category: MoveCategory.Support,
      scalingStat: MoveScalingStat.CRIT,
      basePower: 16,
      basePp: 10,
      cooldown: 2,
      effectParams: {
        bonusHealChancePercent: 30,
        bonusHealPercent: 40,
      },
    },
  },
];

export const CLASS_MOVESET_CATALOG: readonly ClassMoveDefinition[] = [
  ...IMPETUS_MOVES,
  ...COGITOR_MOVES,
  ...TUTATOR_MOVES,
  ...DISSOLUTUS_MOVES,
];

const CLASS_MOVE_MAP: Readonly<Record<ClassMoveId, ClassMoveDefinition>> = Object.fromEntries(
  CLASS_MOVESET_CATALOG.map((move) => [move.id, move]),
) as Record<ClassMoveId, ClassMoveDefinition>;

const POOL_BY_CLASS: Readonly<Record<ClassType, readonly ClassMoveId[]>> = {
  IMPETUS: IMPETUS_MOVES.map((m) => m.id),
  COGITOR: COGITOR_MOVES.map((m) => m.id),
  TUTATOR: TUTATOR_MOVES.map((m) => m.id),
  DISSOLUTUS: DISSOLUTUS_MOVES.map((m) => m.id),
};

export function getClassMoveById(id: ClassMoveId): ClassMoveDefinition {
  return CLASS_MOVE_MAP[id];
}

export function getClassMovePool(classId: ClassType): readonly ClassMoveId[] {
  return POOL_BY_CLASS[classId];
}

export function getClassMoves(classId: ClassType): readonly ClassMoveDefinition[] {
  return CLASS_MOVESET_CATALOG.filter((move) => move.classId === classId);
}

export function isClassMoveId(id: string): id is ClassMoveId {
  return id in CLASS_MOVE_MAP;
}

export function belongsToClass(id: ClassMoveId, classId: ClassType): boolean {
  return getClassMoveById(id).classId === classId;
}

/** Moves com stats de combate já fechados na conversa. */
export function getDefinedClassMoves(classId: ClassType): readonly ClassMoveDefinition[] {
  return getClassMoves(classId).filter((move) => move.isDefined);
}
