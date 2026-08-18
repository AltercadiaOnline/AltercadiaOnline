import {
  formatMarcoNodeBonusHudLine,
  formatMarcoNodeCombatBonus,
} from '../combat/marcoCombatEffectCatalog.js';
import {
  getMarcoTreeNode,
  getNodesForBranch,
  isMarcoBranchStarter,
  MARCO_TREE_NODES,
  normalizeRamificacao,
  resolveStarterFromRamificacao,
  type MarcoRamificacaoId,
  type MarcoTreeNodeDef,
} from './milestoneTreeCatalog.js';
import {
  formatMarcoTrailStepOrdinal,
  getMarcoNodeProgress,
  MARCO_NODE_MAX_LEVEL,
  resolveEffectiveMarcoAbilityLevel,
  requiredPlayerLevelForMarcoAbilityLevel,
  type MarcosNodeProgressionData,
} from './marcoProgression.js';

export type MarcoNodeStatus = 'active' | 'available' | 'locked';

export type MarcoTreePlayerContext = {
  readonly activeMarcos: readonly string[];
  readonly flowSpeedBase: number;
  readonly milestoneTotalProgress: number;
  /** Nível do personagem — libera degraus da trilha e cap do Nvl. da habilidade. */
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
    }
  }

  // Fluxo/progresso NÃO travam a árvore. Nó = nível do personagem + pai ativo.

  const treeTierLevel = node.layout.row + 1;
  const requiredPlayerLevel = requiredPlayerLevelForMarcoAbilityLevel(treeTierLevel);
  if (ctx.playerLevel < requiredPlayerLevel) {
    missing.push(`playerLevel:${requiredPlayerLevel}`);
  }

  return missing;
}

/** Trilha já confirmada (uma das 3) — bloqueia nova escolha até reset no NPC. */
export function hasConfirmedMarcoTrail(ctx: MarcoTreePlayerContext): boolean {
  return Boolean(ctx.trilhaTravada && ctx.ramificacaoSelecionada);
}

/**
 * Player novo / pós-reset: nenhuma trilha ativa.
 * As 3 starters (Nv.10) são mutuamente exclusivas — só uma pode estar ligada.
 */
export function hasNoActiveMarcoTrail(ctx: MarcoTreePlayerContext): boolean {
  if (hasConfirmedMarcoTrail(ctx)) return false;
  return !MARCO_TREE_NODES.some(
    (node) => isMarcoBranchStarter(node.id) && isMarcoActive(ctx.activeMarcos, node.id),
  );
}

/**
 * Trava a trilha (ramificação) — ainda sem ativar o starter.
 * Exige nível do personagem; bloqueia se já houver trilha confirmada ou outro starter ativo.
 */
export function canSelectBranchStarter(nodeId: string, ctx: MarcoTreePlayerContext): boolean {
  if (!isMarcoBranchStarter(nodeId)) return false;
  if (hasConfirmedMarcoTrail(ctx)) return false;
  if (!hasNoActiveMarcoTrail(ctx)) return false;

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

export function resolveMarcoEffectLabel(
  node: MarcoTreeNodeDef,
  effectiveLevel: number = MARCO_NODE_MAX_LEVEL,
): string {
  const scaled = formatMarcoNodeCombatBonus(node.id, Math.max(1, effectiveLevel));
  if (scaled) return scaled;
  if (node.shortBonus) return node.shortBonus;
  if (node.speedFlat !== undefined) return `+${node.speedFlat} velocidade (combate)`;
  return node.description;
}

/** Próximo nó da trilha ainda não obtido (pode estar travado). */
export function resolveNextTrailNode(ctx: MarcoTreePlayerContext): MarcoTreeNodeDef | null {
  if (!hasConfirmedMarcoTrail(ctx) || !ctx.ramificacaoSelecionada) return null;
  for (const node of getNodesForBranch(ctx.ramificacaoSelecionada)) {
    if (!isMarcoActive(ctx.activeMarcos, node.id)) return node;
  }
  return null;
}

/** Próximo ○ que o clique consegue obter agora. */
export function resolveNextObtainableMarco(ctx: MarcoTreePlayerContext): MarcoTreeNodeDef | null {
  const next = resolveNextTrailNode(ctx);
  if (!next) return null;
  return canChooseMarco(next.id, ctx) ? next : null;
}

export function buildMarcoTrailStatusLine(
  ctx: MarcoTreePlayerContext,
  shortBranchLabel: string,
): string {
  const trailName = `TRILHA ${shortBranchLabel.toUpperCase()}`;
  const activeCount = ctx.activeMarcos.length;
  const nextObtainable = resolveNextObtainableMarco(ctx);
  if (nextObtainable) {
    const step = nextObtainable.layout.row + 1;
    const req = requiredPlayerLevelForMarcoAbilityLevel(step);
    return `${trailName} · ${activeCount}º ativo · clique em ${nextObtainable.name} (○) para o ${formatMarcoTrailStepOrdinal(step)} (Nv.${req})`;
  }

  const nextLocked = resolveNextTrailNode(ctx);
  if (nextLocked) {
    const step = nextLocked.layout.row + 1;
    const req = requiredPlayerLevelForMarcoAbilityLevel(step);
    if (ctx.playerLevel < req) {
      return `${trailName} · ${activeCount}º ativo · ${nextLocked.name} no personagem Nv.${req} (atual ${ctx.playerLevel})`;
    }
    const parentId = nextLocked.requires[0];
    const parent = parentId ? getMarcoTreeNode(parentId) : undefined;
    if (parent) {
      return `${trailName} · obtenha ${parent.name} antes de ${nextLocked.name}`;
    }
    return `${trailName} · ${nextLocked.name} ainda travado`;
  }

  if (activeCount > 0) {
    return `${trailName} · trilha completa · ${activeCount} degraus`;
  }
  return `Trilha ativa · ${trailName}`;
}

export function buildMarcoTooltipPayload(nodeView: MarcoNodeView): {
  readonly name: string;
  readonly effect: string;
  readonly requirement?: string;
  readonly hint?: string;
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
  const trailStep = def.layout.row + 1;
  const stepLabel = formatMarcoTrailStepOrdinal(trailStep);
  const gateSuffix = buildMarcoAbilityGateSuffix(progressionLevel, effectiveProgressionLevel);
  const currentBonus = formatMarcoNodeBonusHudLine(
    def.id,
    status === 'active' ? Math.max(1, effectiveProgressionLevel) : 1,
  );
  const effect = currentBonus ?? resolveMarcoEffectLabel(def, status === 'active' ? effectiveProgressionLevel : 1);

  if (status === 'active' && nextLevelThreshold > 0) {
    return {
      name: `${def.name} · ${stepLabel}`,
      effect: `${effect} · Nvl. ${progressionLevel} (${progressionXp}/${nextLevelThreshold} XP)${gateSuffix}`,
      hint: 'Nvl. da habilidade sobe com XP de combate. O próximo degrau da trilha é o ○ abaixo.',
    };
  }

  if (status === 'active') {
    return {
      name: `${def.name} · ${stepLabel}`,
      effect: `${effect} · Nvl. ${progressionLevel} (máx.)${gateSuffix}`,
      hint: 'Habilidade no Nvl. máximo. Avance pelo ○ do próximo degrau, se estiver livre.',
    };
  }

  if (status === 'available') {
    return {
      name: `${def.name} · ${stepLabel}`,
      effect,
      hint: `Clique no ○ para obter o ${stepLabel} da trilha.`,
    };
  }

  if (status !== 'locked' || missingRequirements.length === 0) {
    return { name: `${def.name} · ${stepLabel}`, effect };
  }

  return {
    name: `${def.name} · ${stepLabel}`,
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

/**
 * Ativa um nó **dentro** da trilha já confirmada (incluindo o starter Nv.1).
 * Trava de trilha = `SELECT_MARCO_BRANCH`; obter habilidade = `CHOOSE_MARCO`.
 */
export function canChooseMarco(nodeId: string, ctx: MarcoTreePlayerContext): boolean {
  const node = getMarcoTreeNode(nodeId);
  if (!node) return false;

  if (!hasConfirmedMarcoTrail(ctx)) return false;
  if (node.branch !== ctx.ramificacaoSelecionada) return false;
  if (isMarcoActive(ctx.activeMarcos, nodeId)) return false;

  // Starter: só nível do personagem (trilha já foi escolhida).
  if (isMarcoBranchStarter(nodeId)) {
    const requiredPlayerLevel = requiredPlayerLevelForMarcoAbilityLevel(node.layout.row + 1);
    return ctx.playerLevel >= requiredPlayerLevel;
  }

  const view = resolveMarcoNodeStatus(node, ctx);
  return view.status === 'available';
}

/**
 * Remove marcos órfãos: sem trilha confirmada → nenhum ativo;
 * com trilha → só nós da ramificação escolhida.
 * Se a trilha está travada mas o starter sumiu (save legado), reinsere o 1º nível.
 */
export function sanitizeActiveMarcosForTrail(
  activeMarcos: readonly string[],
  ramificacao: MarcoRamificacaoId | null,
  trilhaTravada: boolean,
): string[] {
  if (!trilhaTravada || !ramificacao) return [];
  const starter = resolveStarterFromRamificacao(ramificacao);
  const filtered = activeMarcos.filter((id) => {
    const node = getMarcoTreeNode(id);
    return node?.branch === ramificacao;
  });
  if (filtered.includes(starter)) return filtered;
  return [starter, ...filtered];
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

  if (!hasConfirmedMarcoTrail(ctx)) {
    if (isMarcoBranchStarter(nodeId)) {
      const view = resolveMarcoNodeStatus(node, ctx);
      const playerLevelReq = view.missingRequirements.find((token) => token.startsWith('playerLevel:'));
      if (playerLevelReq) {
        const required = Number(playerLevelReq.slice('playerLevel:'.length));
        if (Number.isFinite(required) && required > 0) {
          return `Trilha disponível a partir do nível ${required}. Continue evoluindo o personagem.`;
        }
      }
      if (!hasNoActiveMarcoTrail(ctx)) {
        return 'Já existe uma trilha em andamento. Fale com o Mestre de Trilhas para resetar.';
      }
      return 'Escolha uma das 3 trilhas (Agilidade, Defesa ou Crítico) e clique em Ativar trilha.';
    }
    return 'Ative uma das 3 trilhas Marcos (nível 10+) antes de avançar.';
  }

  if (isMarcoActive(ctx.activeMarcos, nodeId)) {
    const nextObtainable = resolveNextObtainableMarco(ctx);
    if (nextObtainable) {
      const step = nextObtainable.layout.row + 1;
      return (
        `Esta habilidade já está ativa. O Nvl. sobe com XP de combate, não pelo clique. `
        + `Próximo degrau: clique em ${nextObtainable.name} (○, ${formatMarcoTrailStepOrdinal(step)}).`
      );
    }
    const nextLocked = resolveNextTrailNode(ctx);
    if (nextLocked) {
      const step = nextLocked.layout.row + 1;
      const req = requiredPlayerLevelForMarcoAbilityLevel(step);
      if (ctx.playerLevel < req) {
        return (
          `Esta habilidade já está ativa. ${nextLocked.name} (${formatMarcoTrailStepOrdinal(step)}) `
          + `libera no personagem Nv.${req}.`
        );
      }
      return `Esta habilidade já está ativa. Obtenha o degrau anterior antes de ${nextLocked.name}.`;
    }
    return 'Esta habilidade já está ativa. O Nvl. sobe com XP de combate.';
  }

  if (isMarcoBranchStarter(nodeId) && node.branch === ctx.ramificacaoSelecionada) {
    const requiredPlayerLevel = requiredPlayerLevelForMarcoAbilityLevel(node.layout.row + 1);
    if (ctx.playerLevel < requiredPlayerLevel) {
      return `Obtenha o 1º degrau a partir do personagem Nv. ${requiredPlayerLevel}.`;
    }
  }

  const view = resolveMarcoNodeStatus(node, ctx);

  if (view.missingRequirements.includes('branch:foreign')) {
    return 'Esta habilidade pertence a outra trilha Marcos.';
  }

  const parentTokens = view.missingRequirements.filter((token) => Boolean(getMarcoTreeNode(token)));
  if (parentTokens[0]) {
    const parent = getMarcoTreeNode(parentTokens[0])!;
    const parentStep = parent.layout.row + 1;
    const targetStep = node.layout.row + 1;
    return (
      `Obtenha primeiro ${parent.name} (○, ${formatMarcoTrailStepOrdinal(parentStep)}) `
      + `antes do ${formatMarcoTrailStepOrdinal(targetStep)}.`
    );
  }

  const playerLevelReq = view.missingRequirements.find((token) => token.startsWith('playerLevel:'));
  if (playerLevelReq) {
    const required = Number(playerLevelReq.slice('playerLevel:'.length));
    if (Number.isFinite(required) && required > 0) {
      return (
        `O ${formatMarcoTrailStepOrdinal(node.layout.row + 1)} exige personagem Nv. ${required} ou superior `
        + `(atual ${ctx.playerLevel}).`
      );
    }
  }

  if (view.missingRequirements.length > 0) {
    const labels = view.missingRequirements.map(formatMissingRequirementLabel).join(' · ');
    return `Requisitos pendentes: ${labels}.`;
  }

  return 'Não é possível obter este degrau da trilha Marcos no momento.';
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
