// @ts-nocheck
import { getMoveById, MoveScalingStat } from '../combat/movesetCatalog.js';
import { MarcoProgressTrigger } from './marcoProgressCatalog.js';
import { getMarcoNodeProgress, } from './marcoProgression.js';
import { MARCO_TREE_NODES, } from './milestoneTreeCatalog.js';
const BRANCH_ORDER = ['fluxo', 'resiliencia', 'precisao'];
const SHORT_LABELS = {
    fluxo: 'Velocidade',
    resiliencia: 'Defesa',
    precisao: 'Crítico',
};
const ARCHETYPE_LABELS = {
    equilibrado: 'Operativo Equilibrado',
    velocista: 'Mestre da Velocidade',
    tanque: 'Especialista em Defesa',
    critico: 'Especialista em Crítico',
    hibrido: 'Estilo Híbrido',
};
const MOVE_STAT_TO_BRANCH = {
    [MoveScalingStat.AGI]: 'fluxo',
    [MoveScalingStat.DEF]: 'resiliencia',
    [MoveScalingStat.CRIT]: 'precisao',
};
const TRIGGER_TO_BRANCH = {
    [MarcoProgressTrigger.FLUX_MOVE_USED]: 'fluxo',
    [MarcoProgressTrigger.DAMAGE_TAKEN]: 'resiliencia',
    [MarcoProgressTrigger.CRIT_LANDED]: 'precisao',
    [MarcoProgressTrigger.DAMAGE_DEALT]: 'precisao',
    [MarcoProgressTrigger.BATTLE_WON]: 'fluxo',
};
const PRACTICE_WEIGHTS = {
    moveUse: 8,
    trigger: 4,
    damageDealt: 0.04,
    damageTaken: 0.05,
    crit: 12,
};
const EMPTY_PRACTICE = {
    moveUsage: {},
    triggers: {},
    damageDealt: 0,
    damageTaken: 0,
    critsLanded: 0,
    battlesPlayed: 0,
};
function branchFromMoveId(moveId) {
    const move = getMoveById(moveId);
    if (!move)
        return null;
    return MOVE_STAT_TO_BRANCH[move.scalingStat] ?? null;
}
function scorePracticeOnBranch(branch, practice) {
    let score = 0;
    for (const [moveId, count] of Object.entries(practice.moveUsage)) {
        if (branchFromMoveId(moveId) === branch) {
            score += count * PRACTICE_WEIGHTS.moveUse;
        }
    }
    for (const [trigger, count] of Object.entries(practice.triggers)) {
        if (TRIGGER_TO_BRANCH[trigger] === branch) {
            score += (count ?? 0) * PRACTICE_WEIGHTS.trigger;
        }
    }
    if (branch === 'precisao') {
        score += practice.critsLanded * PRACTICE_WEIGHTS.crit;
        score += practice.damageDealt * PRACTICE_WEIGHTS.damageDealt * 0.35;
    }
    if (branch === 'resiliencia') {
        score += practice.damageTaken * PRACTICE_WEIGHTS.damageTaken;
    }
    if (branch === 'fluxo') {
        score += practice.damageDealt * PRACTICE_WEIGHTS.damageDealt * 0.65;
        score += practice.battlesPlayed * 6;
    }
    return score;
}
function scorePotentialOnBranch(branch, marcosState, equippedMoveIds) {
    const activeSet = new Set(marcosState.activeMarcos);
    let score = 0;
    for (const node of MARCO_TREE_NODES) {
        if (node.branch !== branch)
            continue;
        const progress = getMarcoNodeProgress(marcosState.nodeProgression, node.id);
        if (progress.level <= 1 && !activeSet.has(node.id))
            continue;
        score += progress.level * 18 + progress.xp * 0.25;
        if (activeSet.has(node.id))
            score += 20;
    }
    for (const moveId of equippedMoveIds) {
        if (branchFromMoveId(moveId) === branch)
            score += 24;
    }
    if (marcosState.ramificacaoSelecionada === branch) {
        score += marcosState.milestoneTotalProgress * 0.2;
    }
    return score;
}
function normalizeScores(values) {
    const max = Math.max(1, ...values);
    return values.map((value) => Math.round((value / max) * 100));
}
function resolveArchetype(combined) {
    const [fluxo, resiliencia, precisao] = combined;
    const sorted = [
        { branch: 'fluxo', score: fluxo },
        { branch: 'resiliencia', score: resiliencia },
        { branch: 'precisao', score: precisao },
    ].sort((a, b) => b.score - a.score);
    const top = sorted[0].score;
    const second = sorted[1].score;
    const spread = top - (sorted[2]?.score ?? 0);
    if (top <= 0) {
        return { archetype: 'hibrido', label: ARCHETYPE_LABELS.hibrido };
    }
    if (spread < 12 && top - second < 8) {
        return { archetype: 'equilibrado', label: ARCHETYPE_LABELS.equilibrado };
    }
    switch (sorted[0].branch) {
        case 'fluxo':
            return { archetype: 'velocista', label: ARCHETYPE_LABELS.velocista };
        case 'resiliencia':
            return { archetype: 'tanque', label: ARCHETYPE_LABELS.tanque };
        case 'precisao':
            return { archetype: 'critico', label: ARCHETYPE_LABELS.critico };
        default:
            return { archetype: 'hibrido', label: ARCHETYPE_LABELS.hibrido };
    }
}
function resolveLoadoutBranchWeights(equippedMoveIds) {
    const weights = {
        fluxo: 0,
        resiliencia: 0,
        precisao: 0,
    };
    for (const moveId of equippedMoveIds) {
        const branch = branchFromMoveId(moveId);
        if (branch)
            weights[branch] += 1;
    }
    return weights;
}
function resolveMarcoBranchWeights(marcosState) {
    const weights = {
        fluxo: 0,
        resiliencia: 0,
        precisao: 0,
    };
    for (const nodeId of marcosState.activeMarcos) {
        const node = MARCO_TREE_NODES.find((entry) => entry.id === nodeId);
        if (node)
            weights[node.branch] += getMarcoNodeProgress(marcosState.nodeProgression, nodeId).level;
    }
    if (marcosState.ramificacaoSelecionada) {
        weights[marcosState.ramificacaoSelecionada] += 2;
    }
    return weights;
}
/** Sinergia entre loadout equipado e trilha Marcos ativa (0–100). */
export function resolveLoadoutMarcoSynergy(marcosState, equippedMoveIds) {
    const loadout = resolveLoadoutBranchWeights(equippedMoveIds);
    const marcos = resolveMarcoBranchWeights(marcosState);
    const loadoutTotal = loadout.fluxo + loadout.resiliencia + loadout.precisao;
    const marcoTotal = marcos.fluxo + marcos.resiliencia + marcos.precisao;
    if (loadoutTotal <= 0 || marcoTotal <= 0)
        return 0;
    let dot = 0;
    for (const branch of BRANCH_ORDER) {
        const loadoutNorm = loadout[branch] / loadoutTotal;
        const marcoNorm = marcos[branch] / marcoTotal;
        dot += loadoutNorm * marcoNorm;
    }
    return Math.round(Math.min(100, dot * 100 * 1.35));
}
function resolveInsight(profile, practice) {
    if (practice.battlesPlayed <= 0) {
        return 'Sem dados de combate — domínio estimado pelo loadout e Marcos.';
    }
    if (profile.synergyPercent < 45) {
        return 'Loadout diverge da trilha Marcos — ajuste moves ou invista na trilha ativa.';
    }
    if (profile.efficiencyPercent >= 75) {
        return 'Alta eficiência: prática alinhada ao potencial desbloqueado.';
    }
    const top = [...profile.axes].sort((a, b) => b.combinedScore - a.combinedScore)[0];
    if (top && top.practiceScore < top.potentialScore * 0.4) {
        return `Potencial em ${top.shortLabel} subutilizado — use mais habilidades dessa trilha.`;
    }
    return 'Perfil estável — continue refinando o loadout ativo.';
}
export function formatDominanceArchetypeBadge(archetypeLabel) {
    return `ARQUÉTIPO: ${archetypeLabel}`;
}
/** Domínio dinâmico: 60% prática recente + 40% potencial (Marcos + loadout). */
export function resolveSkillDominanceProfile(input) {
    const practice = input.practice ?? EMPTY_PRACTICE;
    const practiceRaw = BRANCH_ORDER.map((branch) => scorePracticeOnBranch(branch, practice));
    const potentialRaw = BRANCH_ORDER.map((branch) => scorePotentialOnBranch(branch, input.marcosState, input.equippedMoveIds));
    const practiceNorm = normalizeScores(practiceRaw);
    const potentialNorm = normalizeScores(potentialRaw);
    const combinedRaw = practiceRaw.map((practiceScore, index) => practiceScore * 0.6 + potentialRaw[index] * 0.4);
    const combinedNorm = normalizeScores(combinedRaw);
    const axes = BRANCH_ORDER.map((branch, index) => ({
        branch,
        shortLabel: SHORT_LABELS[branch],
        practiceScore: practiceNorm[index],
        potentialScore: potentialNorm[index],
        combinedScore: combinedRaw[index],
        percent: combinedNorm[index],
    }));
    const { archetype, label: archetypeLabel } = resolveArchetype(combinedNorm);
    const synergyPercent = resolveLoadoutMarcoSynergy(input.marcosState, input.equippedMoveIds);
    const practiceTotal = practiceRaw.reduce((sum, value) => sum + value, 0);
    const potentialTotal = potentialRaw.reduce((sum, value) => sum + value, 0);
    const efficiencyPercent = potentialTotal <= 0
        ? 0
        : Math.round(Math.min(100, (practiceTotal / potentialTotal) * 100));
    const base = {
        axes,
        archetype,
        archetypeLabel,
        synergyPercent,
        efficiencyPercent,
    };
    return {
        ...base,
        insight: resolveInsight(base, practice),
    };
}
