// @ts-nocheck
import { getMoveById, MoveScalingStat } from '../combat/movesetCatalog.js';
import { getMarcoNodeProgress, } from './marcoProgression.js';
import { MARCO_TREE_NODES, } from './milestoneTreeCatalog.js';
export const ESTILO_LABELS = {
    AGIL: 'ÁGIL',
    BALUARTE: 'BALUARTE',
    PRECISO: 'PRECISO',
    TATICO: 'TÁTICO',
};
const BRANCH_TO_ESTILO = {
    fluxo: 'AGIL',
    resiliencia: 'BALUARTE',
    precisao: 'PRECISO',
};
const MOVE_STAT_TO_BRANCH = {
    [MoveScalingStat.AGI]: 'fluxo',
    [MoveScalingStat.DEF]: 'resiliencia',
    [MoveScalingStat.CRIT]: 'precisao',
};
const BRANCH_ORDER = ['fluxo', 'resiliencia', 'precisao'];
/** Limiar de diferença entre trilhas para considerar perfil tático/equilibrado. */
const TATICO_SPREAD_THRESHOLD = 2;
function scoreLoadoutBranch(branch, loadout) {
    let score = 0;
    for (const moveId of loadout) {
        const move = getMoveById(moveId);
        if (move && MOVE_STAT_TO_BRANCH[move.scalingStat] === branch) {
            score += 2;
        }
    }
    return score;
}
function scoreMarcosBranch(branch, marcosState) {
    let score = 0;
    const activeSet = new Set(marcosState.activeMarcos);
    for (const node of MARCO_TREE_NODES) {
        if (node.branch !== branch || !activeSet.has(node.id))
            continue;
        score += getMarcoNodeProgress(marcosState.nodeProgression, node.id).level;
    }
    if (marcosState.ramificacaoSelecionada === branch) {
        score += 3;
    }
    return score;
}
function scoreBranch(branch, loadout, marcosState) {
    return scoreLoadoutBranch(branch, loadout) + scoreMarcosBranch(branch, marcosState);
}
/**
 * Deriva o estilo de combate a partir do loadout equipado e trilha Marcos.
 * Leve — sem telemetria; pensado para rodar sob demanda ao abrir a ficha.
 */
export function getArquétipo(loadout, marcos) {
    const scores = BRANCH_ORDER.map((branch) => ({
        branch,
        score: scoreBranch(branch, loadout, marcos),
    })).sort((a, b) => b.score - a.score);
    const top = scores[0]?.score ?? 0;
    const second = scores[1]?.score ?? 0;
    if (top <= 0 || top - second <= TATICO_SPREAD_THRESHOLD) {
        return 'TATICO';
    }
    return BRANCH_TO_ESTILO[scores[0].branch];
}
export function getEstiloLabel(estilo) {
    return ESTILO_LABELS[estilo];
}
/** @deprecated Alias ASCII — prefira getArquétipo */
export const getArquetipo = getArquétipo;
