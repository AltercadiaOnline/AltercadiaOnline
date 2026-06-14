import { MARCO_TREE_NODES } from '../progression/milestoneTreeCatalog.js';
import { MARCO_NODE_MAX_LEVEL } from '../progression/marcoProgression.js';

/**
 * Modificadores de combate por nó Marcos — mesma semântica que runas/livros/equip.
 * Valores em `atMaxLevel` são o teto com habilidade Marcos Nv. 5 (escala linear por nível efetivo).
 */
export const MarcoCombatModifierKind = {
  SpeedFlat: 'speed_flat',
  CritChance: 'crit_chance',
  CritDamage: 'crit_damage',
  DefensePercent: 'defense_percent',
  DodgePercent: 'dodge_percent',
  AttackPercent: 'attack_percent',
  DamageReduction: 'damage_reduction',
  ExhaustionReduction: 'exhaustion_reduction',
} as const;

export type MarcoCombatModifierKindId =
  (typeof MarcoCombatModifierKind)[keyof typeof MarcoCombatModifierKind];

export type MarcoCombatModifier = {
  readonly kind: MarcoCombatModifierKindId;
  /** Percentual inteiro (5 = +5%) ou flat de speed conforme o kind. */
  readonly atMaxLevel: number;
};

/** Procs de ápice — consumidos pelo CombatEngine em runtime. */
export const MarcoCombatProc = {
  BeyondTimeSteps: 'beyond_time_steps',
  InvincibleBastion: 'invincible_bastion',
  PrecisionMaster: 'precision_master',
} as const;

export type MarcoCombatProcId = (typeof MarcoCombatProc)[keyof typeof MarcoCombatProc];

export type MarcoCombatNodeEffect = {
  readonly nodeId: string;
  readonly modifiers: readonly MarcoCombatModifier[];
  readonly procsAtMaxLevel?: readonly MarcoCombatProcId[];
};

const NODE_EFFECTS: readonly MarcoCombatNodeEffect[] = [
  {
    nodeId: 'quickStep',
    modifiers: [{ kind: MarcoCombatModifierKind.SpeedFlat, atMaxLevel: 4 }],
  },
  {
    nodeId: 'fluxRush',
    modifiers: [{ kind: MarcoCombatModifierKind.SpeedFlat, atMaxLevel: 7 }],
  },
  {
    nodeId: 'timelessStride',
    modifiers: [{ kind: MarcoCombatModifierKind.SpeedFlat, atMaxLevel: 11 }],
  },
  {
    nodeId: 'stableFlux',
    modifiers: [{ kind: MarcoCombatModifierKind.ExhaustionReduction, atMaxLevel: 50 }],
  },
  {
    nodeId: 'beyondTimeSteps',
    modifiers: [{ kind: MarcoCombatModifierKind.SpeedFlat, atMaxLevel: 15 }],
    procsAtMaxLevel: [MarcoCombatProc.BeyondTimeSteps],
  },
  {
    nodeId: 'ironStance',
    modifiers: [{ kind: MarcoCombatModifierKind.DamageReduction, atMaxLevel: 5 }],
  },
  {
    nodeId: 'bastionWill',
    modifiers: [{ kind: MarcoCombatModifierKind.DefensePercent, atMaxLevel: 10 }],
  },
  {
    nodeId: 'enhancedBastion',
    modifiers: [{ kind: MarcoCombatModifierKind.DodgePercent, atMaxLevel: 5 }],
  },
  {
    nodeId: 'totalResilience',
    modifiers: [{ kind: MarcoCombatModifierKind.DamageReduction, atMaxLevel: 2 }],
  },
  {
    nodeId: 'invincibleBastion',
    modifiers: [{ kind: MarcoCombatModifierKind.DamageReduction, atMaxLevel: 1 }],
    procsAtMaxLevel: [MarcoCombatProc.InvincibleBastion],
  },
  {
    nodeId: 'keenEye',
    modifiers: [{ kind: MarcoCombatModifierKind.CritChance, atMaxLevel: 3 }],
  },
  {
    nodeId: 'lethalFocus',
    modifiers: [{ kind: MarcoCombatModifierKind.CritChance, atMaxLevel: 5 }],
  },
  {
    nodeId: 'lethalPrecision',
    modifiers: [{ kind: MarcoCombatModifierKind.CritDamage, atMaxLevel: 8 }],
  },
  {
    nodeId: 'criticalFocus',
    modifiers: [{ kind: MarcoCombatModifierKind.CritDamage, atMaxLevel: 10 }],
  },
  {
    nodeId: 'precisionMaster',
    modifiers: [{ kind: MarcoCombatModifierKind.CritChance, atMaxLevel: 2 }],
    procsAtMaxLevel: [MarcoCombatProc.PrecisionMaster],
  },
] as const;

const EFFECT_BY_NODE = new Map(NODE_EFFECTS.map((entry) => [entry.nodeId, entry]));

/** Garante paridade catálogo ↔ árvore de milestones (15 nós). */
export function assertMarcoCombatCatalogParity(): void {
  const treeIds = new Set(MARCO_TREE_NODES.map((n) => n.id));
  for (const entry of NODE_EFFECTS) {
    if (!treeIds.has(entry.nodeId)) {
      throw new Error(`[MarcoCombat] Efeito sem nó na árvore: ${entry.nodeId}`);
    }
  }
  if (NODE_EFFECTS.length !== MARCO_TREE_NODES.length) {
    throw new Error(
      `[MarcoCombat] Esperado ${MARCO_TREE_NODES.length} efeitos, encontrado ${NODE_EFFECTS.length}`,
    );
  }
}

assertMarcoCombatCatalogParity();

export function getMarcoCombatNodeEffect(nodeId: string): MarcoCombatNodeEffect | undefined {
  return EFFECT_BY_NODE.get(nodeId);
}

export function scaleMarcoModifierValue(atMaxLevel: number, effectiveLevel: number): number {
  if (effectiveLevel <= 0) return 0;
  const clamped = Math.min(effectiveLevel, MARCO_NODE_MAX_LEVEL);
  return (atMaxLevel * clamped) / MARCO_NODE_MAX_LEVEL;
}
