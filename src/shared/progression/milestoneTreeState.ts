import {
  getMarcoTreeNode,
  isMarcoBranchStarter,
  MARCO_TREE_NODES,
  normalizeRamificacao,
  type MarcoRamificacaoId,
  type MarcoTreeNodeDef,
} from './milestoneTreeCatalog.js';
import { MARCO_UNLOCK_PARENT_LEVEL } from './marcoProgressCatalog.js';
import {
  getMarcoNodeProgress,
  resolveEffectiveMarcoAbilityLevel,
  requiredPlayerLevelForMarcoAbilityLevel,
  type MarcosNodeProgressionData,
} from './marcoProgression.js';

export type MarcoNodeStatus = 'active' | 'available' | 'locked';

export type MarcoTreePlayerContext = {
  readonly activeMarcos: readonly string[];
  readonly flowSpeedBase: number;
  readonly milestoneTotalProgress: number;
  /** Nível do personagem — limita níveis 1–5 de cada habilidade Marco ativa. */
  readonly playerLevel: number;
  /** Trilha escolhida — fluxo | resiliencia | precisao. */
  readonly ramificacaoSelecionada: MarcoRamificacaoId | null;
  /** Escolha inicial confirmada — impede troca de trilha na HUD. */
  readonly trilhaTravada: boolean;
  readonly nodeProgression: MarcosNodeProgressionData;
};

export type MarcoNodeView = {
  readonly def: MarcoTreeNodeDef;
  readonly status: MarcoNodeStatus;
  readonly missingRequirements: readonly string[];
  readonly isDimmedBranch: boolean;
  readonly isActiveBranch: boolean;
  /** Nível acumulado por XP (armazenado). */
  readonly progressionLevel: number;
  /** Nível aplicado em combate/Ficha (cap pelo nível do personagem). */
  readonly effectiveProgressionLevel: number;
  readonly progressionXp: number;
  readonly nextLevelThreshold: number;
};

export function isMarcoActive(activeMarcos: readonly string[], nodeId: string): boolean {
  return activeMarcos.includes(nodeId);
}

export function resolveMarcoNodeStatus(
  node: MarcoTreeNodeDef,
  ctx: MarcoTreePlayerContext,
): MarcoNodeView {
  const ramificacao = ctx.ramificacaoSelecionada;
  const isActiveBranch = ramificacao ? node.branch === ramificacao : false;
  const isDimmedBranch = ramificacao !== null && node.branch !== ramificacao;
  const prog = getMarcoNodeProgress(ctx.nodeProgression, node.id);
  const effectiveProgressionLevel = resolveEffectiveMarcoAbilityLevel(prog.level, ctx.playerLevel);
  const progressionFields = {
    progressionLevel: prog.level,
    effectiveProgressionLevel,
    progressionXp: prog.xp,
    nextLevelThreshold: prog.nextLevelThreshold,
  };

  if (isDimmedBranch) {
    return {
      def: node,
      status: 'locked',
      missingRequirements: ['branch:foreign'],
      isDimmedBranch: true,
      isActiveBranch: false,
      ...progressionFields,
    };
  }

  if (isMarcoActive(ctx.activeMarcos, node.id)) {
    return {
      def: node,
      status: 'active',
      missingRequirements: [],
      isDimmedBranch: false,
      isActiveBranch,
      ...progressionFields,
    };
  }

  const missing = collectMissingRequirements(node, ctx);
  if (missing.length === 0) {
    return {
      def: node,
      status: 'available',
      missingRequirements: [],
      isDimmedBranch: false,
      isActiveBranch,
      ...progressionFields,
    };
  }

  return {
    def: node,
    status: 'locked',
    missingRequirements: missing,
    isDimmedBranch: false,
    isActiveBranch,
    ...progressionFields,
  };
}

function collectMissingRequirements(
  node: MarcoTreeNodeDef,
  ctx: MarcoTreePlayerContext,
): string[] {
  const missing: string[] = [];

  for (const reqId of node.requires) {
    if (!isMarcoActive(ctx.activeMarcos, reqId)) {
      missing.push(reqId);
      continue;
    }

    const parentStored = getMarcoNodeProgress(ctx.nodeProgression, reqId).level;
    const parentLevel = resolveEffectiveMarcoAbilityLevel(parentStored, ctx.playerLevel);
    const requiredLevel = node.unlockAtParentLevel ?? MARCO_UNLOCK_PARENT_LEVEL;
    if (parentLevel < requiredLevel) {
      missing.push(`parentLevel:${reqId}:${requiredLevel}`);
    }
  }

  if (node.unlockAtFlowSpeed !== undefined && ctx.flowSpeedBase < node.unlockAtFlowSpeed) {
    missing.push(`flow:${node.unlockAtFlowSpeed}`);
  }

  if (
    node.unlockAtMilestoneProgress !== undefined &&
    ctx.milestoneTotalProgress < node.unlockAtMilestoneProgress
  ) {
    missing.push(`milestone:${node.unlockAtMilestoneProgress}`);
  }

  const treeTierLevel = node.layout.row + 1;
  const requiredPlayerLevel = requiredPlayerLevelForMarcoAbilityLevel(treeTierLevel);
  if (ctx.playerLevel < requiredPlayerLevel) {
    missing.push(`playerLevel:${requiredPlayerLevel}`);
  }

  return missing;
}

export function canSelectBranchStarter(nodeId: string, ctx: MarcoTreePlayerContext): boolean {
  if (!isMarcoBranchStarter(nodeId) || ctx.trilhaTravada || ctx.ramificacaoSelecionada) {
    return false;
  }

  const node = getMarcoTreeNode(nodeId);
  if (!node) return false;

  const requiredPlayerLevel = requiredPlayerLevelForMarcoAbilityLevel(node.layout.row + 1);
  return ctx.playerLevel >= requiredPlayerLevel;
}

function buildMarcoAbilityGateSuffix(
  storedLevel: number,
  effectiveLevel: number,
): string {
  if (effectiveLevel >= storedLevel) return '';
  if (effectiveLevel < 1) {
    return ` · ativo no personagem Nv. ${requiredPlayerLevelForMarcoAbilityLevel(1)}`;
  }
  const nextLevel = effectiveLevel + 1;
  return ` · efetivo Nv.${effectiveLevel} (Nv.${nextLevel} no personagem Nv. ${requiredPlayerLevelForMarcoAbilityLevel(nextLevel)})`;
}

export function resolveMarcoEffectLabel(node: MarcoTreeNodeDef): string {
  if (node.shortBonus) return node.shortBonus;
  if (node.speedFlat !== undefined) return `+${node.speedFlat} velocidade (combate)`;
  return node.description;
}

export function buildMarcoTooltipPayload(nodeView: MarcoNodeView): {
  readonly name: string;
  readonly effect: string;
  readonly requirement?: string;
} {
  const {
    def,
    status,
    missingRequirements,
    progressionLevel,
    effectiveProgressionLevel,
    progressionXp,
    nextLevelThreshold,
  } = nodeView;
  const effect = resolveMarcoEffectLabel(def);
  const gateSuffix = buildMarcoAbilityGateSuffix(progressionLevel, effectiveProgressionLevel);

  if (status === 'active' && nextLevelThreshold > 0) {
    return {
      name: def.name,
      effect: `${effect} · Nvl. ${progressionLevel} (${progressionXp}/${nextLevelThreshold} XP)${gateSuffix}`,
    };
  }

  if (status === 'active') {
    return {
      name: def.name,
      effect: `${effect} · Nvl. ${progressionLevel} (máx.)${gateSuffix}`,
    };
  }

  if (status !== 'locked' || missingRequirements.length === 0) {
    return { name: def.name, effect };
  }

  return {
    name: def.name,
    effect,
    requirement: missingRequirements.map(formatMissingRequirementLabel).join(' · '),
  };
}

export function buildMarcoTreeView(ctx: MarcoTreePlayerContext): readonly MarcoNodeView[] {
  return MARCO_TREE_NODES.map((node) => resolveMarcoNodeStatus(node, ctx));
}

export function resolvePrerequisitePath(nodeId: string): readonly string[] {
  const path: string[] = [];
  let current = getMarcoTreeNode(nodeId);
  const visited = new Set<string>();

  while (current && !visited.has(current.id)) {
    visited.add(current.id);
    path.unshift(current.id);
    const parentId = current.requires[0];
    if (!parentId) break;
    current = getMarcoTreeNode(parentId);
  }

  return path;
}

export function resolveHighlightedEdges(pathNodeIds: readonly string[]): ReadonlySet<string> {
  const highlighted = new Set<string>();
  for (let i = 0; i < pathNodeIds.length - 1; i++) {
    const from = pathNodeIds[i];
    const to = pathNodeIds[i + 1];
    if (from && to) highlighted.add(`${from}->${to}`);
  }
  return highlighted;
}

export function canChooseMarco(nodeId: string, ctx: MarcoTreePlayerContext): boolean {
  const node = getMarcoTreeNode(nodeId);
  if (!node) return false;

  if (ctx.ramificacaoSelecionada) {
    if (node.branch !== ctx.ramificacaoSelecionada) return false;
  } else if (!isMarcoBranchStarter(nodeId)) {
    return false;
  }

  const view = resolveMarcoNodeStatus(node, ctx);
  return view.status === 'available';
}

/** Mensagem para HUD quando o jogador tenta ativar um Marco sem cumprir requisitos. */
export function resolveMarcoChooseBlockedMessage(
  nodeId: string,
  ctx: MarcoTreePlayerContext,
): string | null {
  if (canChooseMarco(nodeId, ctx) || canSelectBranchStarter(nodeId, ctx)) {
    return null;
  }

  const node = getMarcoTreeNode(nodeId);
  if (!node) return 'Habilidade Marcos inválida.';

  const view = resolveMarcoNodeStatus(node, ctx);
  const playerLevelReq = view.missingRequirements.find((token) => token.startsWith('playerLevel:'));
  if (playerLevelReq) {
    const required = Number(playerLevelReq.slice('playerLevel:'.length));
    if (Number.isFinite(required) && required > 0) {
      return `Não é possível utilizar esta habilidade: seu personagem precisa estar no nível ${required} ou superior.`;
    }
  }

  if (view.missingRequirements.includes('branch:foreign')) {
    return 'Esta habilidade pertence a outra trilha Marcos.';
  }

  if (view.missingRequirements.length > 0) {
    const labels = view.missingRequirements.map(formatMissingRequirementLabel).join(' · ');
    return `Requisitos pendentes: ${labels}.`;
  }

  return 'Não é possível ativar esta habilidade Marcos no momento.';
}

export function formatMissingRequirementLabel(token: string): string {
  if (token === 'branch:foreign') {
    return 'Outra trilha selecionada';
  }
  if (token.startsWith('flow:')) {
    return `Fluxo ${token.slice(5)}+`;
  }
  if (token.startsWith('milestone:')) {
    return `Progresso ${token.slice(10)}+`;
  }
  if (token.startsWith('parentLevel:')) {
    const parts = token.split(':');
    const nodeId = parts[1];
    const level = parts[2];
    const node = nodeId ? getMarcoTreeNode(nodeId) : undefined;
    return node ? `${node.name} Nvl. ${level}+` : token;
  }
  if (token.startsWith('playerLevel:')) {
    return `Personagem Nv. ${token.slice(12)}+`;
  }
  const node = getMarcoTreeNode(token);
  return node ? node.name : token;
}

/** Converte snapshot persistido para contexto de UI. */
export function resolveRamificacaoFromContext(
  rawRamificacao: string | null,
): MarcoRamificacaoId | null {
  return normalizeRamificacao(rawRamificacao);
}
