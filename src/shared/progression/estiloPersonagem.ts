import { resolveMoveScalingStat } from '../combat/resolveMoveCombatMeta.js';
import { MoveScalingStat } from '../combat/moveTypes.js';
import { getMarcoNodeProgress, resolveEffectiveMarcoAbilityLevel } from './marcoProgression.js';
import { MARCO_TREE_NODES, type MarcoTreeBranch } from './milestoneTreeCatalog.js';
import type { MarcosStateSnapshot } from '../playerDataSnapshots.js';

export type EstiloPersonagem = 'AGIL' | 'BALUARTE' | 'PRECISO' | 'TATICO';

export const ESTILO_PERSONAGEM_LABELS: Readonly<Record<EstiloPersonagem, string>> = {
  AGIL: 'ÁGIL',
  BALUARTE: 'BALUARTE',
  PRECISO: 'PRECISO',
  TATICO: 'TÁTICO',
};

const BRANCH_ORDER: readonly MarcoTreeBranch[] = ['fluxo', 'resiliencia', 'precisao'];

const BRANCH_TO_ESTILO: Readonly<Record<MarcoTreeBranch, EstiloPersonagem>> = {
  fluxo: 'AGIL',
  resiliencia: 'BALUARTE',
  precisao: 'PRECISO',
};

const MOVE_STAT_TO_BRANCH: Partial<Record<MoveScalingStat, MarcoTreeBranch>> = {
  [MoveScalingStat.AGI]: 'fluxo',
  [MoveScalingStat.DEF]: 'resiliencia',
  [MoveScalingStat.CRIT]: 'precisao',
};

/** Peso por move equipado alinhado à trilha. */
const LOADOUT_MOVE_WEIGHT = 2;

/** Diferença máxima entre trilhas para considerar equilíbrio tático. */
const TATICO_BALANCE_THRESHOLD = 2;

/** Entrada mínima para domínio Marcos — mesma fonte usada na Ficha e no combate. */
export type MarcoDominanceInput = Pick<MarcosStateSnapshot, 'activeMarcos' | 'nodeProgression'> & {
  /** Sem valor, assume Nv. 100 (testes legados / snapshot incompleto). */
  readonly playerLevel?: number;
};

export type MarcoBranchTotals = Readonly<Record<MarcoTreeBranch, number>>;

function sumActiveNodeLevels(branch: MarcoTreeBranch, marcos: MarcoDominanceInput): number {
  const activeSet = new Set(marcos.activeMarcos);
  const playerLevel = marcos.playerLevel ?? 100;
  let total = 0;

  for (const node of MARCO_TREE_NODES) {
    if (node.branch !== branch || !activeSet.has(node.id)) continue;
    const stored = getMarcoNodeProgress(marcos.nodeProgression, node.id).level;
    total += resolveEffectiveMarcoAbilityLevel(stored, playerLevel);
  }

  return total;
}

function sumLoadoutWeight(branch: MarcoTreeBranch, loadout: readonly string[]): number {
  let total = 0;

  for (const moveId of loadout) {
    const scalingStat = resolveMoveScalingStat(moveId);
    if (scalingStat && MOVE_STAT_TO_BRANCH[scalingStat] === branch) {
      total += LOADOUT_MOVE_WEIGHT;
    }
  }

  return total;
}

/**
 * Totais por trilha (níveis dos nós ativos + peso do loadout).
 * Fonte única para ESTILO na Ficha e bônus Marcos no combate.
 */
export function computeMarcoBranchTotals(
  loadout: readonly string[],
  marcos: MarcoDominanceInput,
): MarcoBranchTotals {
  return {
    fluxo: sumActiveNodeLevels('fluxo', marcos) + sumLoadoutWeight('fluxo', loadout),
    resiliencia: sumActiveNodeLevels('resiliencia', marcos) + sumLoadoutWeight('resiliencia', loadout),
    precisao: sumActiveNodeLevels('precisao', marcos) + sumLoadoutWeight('precisao', loadout),
  };
}

/**
 * Estilo derivado apenas do loadout atual e níveis dos nós Marcos ativos.
 * Função pura — sem telemetria ou persistência.
 */
export function getEstiloPersonagem(
  loadout: readonly string[],
  marcos: MarcoDominanceInput,
): EstiloPersonagem {
  const branchTotals = computeMarcoBranchTotals(loadout, marcos);
  const totals = BRANCH_ORDER.map((branch) => ({
    branch,
    total: branchTotals[branch],
  })).sort((a, b) => b.total - a.total);

  const top = totals[0]?.total ?? 0;
  const second = totals[1]?.total ?? 0;

  if (top <= 0 || top - second <= TATICO_BALANCE_THRESHOLD) {
    return 'TATICO';
  }

  return BRANCH_TO_ESTILO[totals[0]!.branch];
}

export function getEstiloPersonagemLabel(estilo: EstiloPersonagem): string {
  return ESTILO_PERSONAGEM_LABELS[estilo];
}
