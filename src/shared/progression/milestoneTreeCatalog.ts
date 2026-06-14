/**
 * Catálogo data-driven — grade 3×5 (3 trilhas × 5 níveis).
 */
export type MarcoTreeBranch = 'fluxo' | 'resiliencia' | 'precisao';

export type MarcoRamificacaoId = MarcoTreeBranch;

export type MarcoTreeNodeDef = {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly branch: MarcoTreeBranch;
  readonly requires: readonly string[];
  readonly unlockAtFlowSpeed?: number;
  readonly unlockAtMilestoneProgress?: number;
  /** Nível mínimo do nó pai ativo para desbloquear este nó (padrão: 2). */
  readonly unlockAtParentLevel?: number;
  readonly layout: { readonly col: number; readonly row: number };
  readonly speedFlat?: number;
  readonly shortBonus?: string;
};

export const MARCO_TREE_LAYOUT = {
  cols: 3,
  rows: 5,
} as const;

export const MARCO_BRANCH_LABELS: Readonly<Record<MarcoTreeBranch, string>> = {
  fluxo: 'Trilha Fluxo (Velocidade)',
  resiliencia: 'Trilha Resiliência (Defesa)',
  precisao: 'Trilha Precisão (Crítico)',
};

export const MARCO_TREE_NODES: readonly MarcoTreeNodeDef[] = [
  {
    id: 'quickStep',
    name: 'Passo Rápido',
    description: 'Passivo de fluxo: +4 de velocidade de iniciativa em combate.',
    branch: 'fluxo',
    requires: [],
    unlockAtFlowSpeed: 25,
    layout: { col: 0, row: 0 },
    speedFlat: 4,
    shortBonus: '+4',
  },
  {
    id: 'fluxRush',
    name: 'Investida Flux',
    description: 'Passivo de fluxo: +7 de velocidade. Exige domínio do Passo Rápido.',
    branch: 'fluxo',
    requires: ['quickStep'],
    unlockAtFlowSpeed: 50,
    layout: { col: 0, row: 1 },
    speedFlat: 7,
    shortBonus: '+7',
  },
  {
    id: 'timelessStride',
    name: 'Passos Atemporais',
    description: 'Ápice intermediário do fluxo: +11 de velocidade.',
    branch: 'fluxo',
    requires: ['fluxRush'],
    unlockAtFlowSpeed: 75,
    layout: { col: 0, row: 2 },
    speedFlat: 11,
    shortBonus: '+11',
  },
  {
    id: 'stableFlux',
    name: 'Fluxo Estável',
    description: 'Reduz exaustão de movimento em combate prolongado.',
    branch: 'fluxo',
    requires: ['timelessStride'],
    unlockAtFlowSpeed: 90,
    layout: { col: 0, row: 3 },
    shortBonus: 'Reduz exaustão',
  },
  {
    id: 'beyondTimeSteps',
    name: 'Passos Além-Tempo',
    description: 'Marco final do fluxo: burst de iniciativa ativável.',
    branch: 'fluxo',
    requires: ['stableFlux'],
    unlockAtFlowSpeed: 100,
    layout: { col: 0, row: 4 },
    shortBonus: '+Ativa',
  },
  {
    id: 'ironStance',
    name: 'Postura de Ferro',
    description: 'Passivo defensivo: +5% de redução de dano recebido.',
    branch: 'resiliencia',
    requires: [],
    unlockAtMilestoneProgress: 10,
    layout: { col: 1, row: 0 },
    shortBonus: '+5% red',
  },
  {
    id: 'bastionWill',
    name: 'Vontade do Bastião',
    description: 'Fortalece a postura: +10% de defesa.',
    branch: 'resiliencia',
    requires: ['ironStance'],
    unlockAtMilestoneProgress: 25,
    layout: { col: 1, row: 1 },
    shortBonus: '+10% DEF',
  },
  {
    id: 'enhancedBastion',
    name: 'Bastião Aprimorado',
    description: 'Refina a defesa: +5% de esquiva.',
    branch: 'resiliencia',
    requires: ['bastionWill'],
    unlockAtMilestoneProgress: 40,
    layout: { col: 1, row: 2 },
    shortBonus: '+5% Esquiva',
  },
  {
    id: 'totalResilience',
    name: 'Resiliência Total',
    description: 'Redução adicional de dano recebido (+2%).',
    branch: 'resiliencia',
    requires: ['enhancedBastion'],
    unlockAtMilestoneProgress: 55,
    layout: { col: 1, row: 3 },
    shortBonus: 'Red. Dano +2%',
  },
  {
    id: 'invincibleBastion',
    name: 'Bastião Imbatível',
    description: 'Marco final: imunidade a CC por 1s após hit crítico recebido.',
    branch: 'resiliencia',
    requires: ['totalResilience'],
    unlockAtMilestoneProgress: 70,
    layout: { col: 1, row: 4 },
    shortBonus: 'Immune CC 1s',
  },
  {
    id: 'keenEye',
    name: 'Olho Atento',
    description: 'Passivo ofensivo: +3% de chance crítica.',
    branch: 'precisao',
    requires: [],
    unlockAtMilestoneProgress: 10,
    layout: { col: 2, row: 0 },
    shortBonus: '+3% crit',
  },
  {
    id: 'lethalFocus',
    name: 'Foco Letal',
    description: 'Amplifica precisão: +5% crítico.',
    branch: 'precisao',
    requires: ['keenEye'],
    unlockAtMilestoneProgress: 25,
    layout: { col: 2, row: 1 },
    shortBonus: '+5% crit',
  },
  {
    id: 'lethalPrecision',
    name: 'Precisão Letal',
    description: '+8% de dano em acertos críticos.',
    branch: 'precisao',
    requires: ['lethalFocus'],
    unlockAtMilestoneProgress: 40,
    layout: { col: 2, row: 2 },
    shortBonus: '+8% Dano Crit',
  },
  {
    id: 'criticalFocus',
    name: 'Foco Crítico',
    description: '+10% de dano crítico adicional.',
    branch: 'precisao',
    requires: ['lethalPrecision'],
    unlockAtMilestoneProgress: 55,
    layout: { col: 2, row: 3 },
    shortBonus: '+10% Dano Crit',
  },
  {
    id: 'precisionMaster',
    name: 'Mestre de Precisão',
    description: 'Marco final: próximo acerto crítico garantido.',
    branch: 'precisao',
    requires: ['criticalFocus'],
    unlockAtMilestoneProgress: 70,
    layout: { col: 2, row: 4 },
    shortBonus: 'Crítico garantido',
  },
] as const;

const NODE_BY_ID = new Map(MARCO_TREE_NODES.map((node) => [node.id, node]));

/** Nós de nível 1 — escolha inicial de ramificação. */
export const MARCO_BRANCH_STARTER_IDS = ['quickStep', 'ironStance', 'keenEye'] as const;

export type MarcoBranchStarterId = (typeof MARCO_BRANCH_STARTER_IDS)[number];

const STARTER_TO_RAMIFICACAO: Readonly<Record<MarcoBranchStarterId, MarcoRamificacaoId>> = {
  quickStep: 'fluxo',
  ironStance: 'resiliencia',
  keenEye: 'precisao',
};

const LEGACY_RAMIFICACAO_ALIASES: Readonly<Record<string, MarcoRamificacaoId>> = {
  ...STARTER_TO_RAMIFICACAO,
};

export function getMarcoTreeNode(id: string): MarcoTreeNodeDef | undefined {
  return NODE_BY_ID.get(id);
}

export function getNodesForBranch(branch: MarcoRamificacaoId): readonly MarcoTreeNodeDef[] {
  return MARCO_TREE_NODES.filter((node) => node.branch === branch)
    .sort((a, b) => a.layout.row - b.layout.row);
}

export function getMarcoTreeEdges(): readonly (readonly [string, string])[] {
  const edges: Array<[string, string]> = [];
  for (const node of MARCO_TREE_NODES) {
    for (const parentId of node.requires) {
      edges.push([parentId, node.id]);
    }
  }
  return edges;
}

export function isMarcoBranchStarter(nodeId: string): nodeId is MarcoBranchStarterId {
  return (MARCO_BRANCH_STARTER_IDS as readonly string[]).includes(nodeId);
}

export function resolveRamificacaoFromStarter(starterId: string): MarcoRamificacaoId | null {
  if (!isMarcoBranchStarter(starterId)) return null;
  return STARTER_TO_RAMIFICACAO[starterId];
}

export function resolveStarterFromRamificacao(ramificacao: MarcoRamificacaoId): MarcoBranchStarterId {
  switch (ramificacao) {
    case 'fluxo':
      return 'quickStep';
    case 'resiliencia':
      return 'ironStance';
    case 'precisao':
      return 'keenEye';
  }
}

/** Normaliza valor persistido (trilha ou ID legado de nó tier-1). */
export function normalizeRamificacao(value: string | null | undefined): MarcoRamificacaoId | null {
  if (!value) return null;
  if (value === 'fluxo' || value === 'resiliencia' || value === 'precisao') return value;
  return LEGACY_RAMIFICACAO_ALIASES[value] ?? null;
}

export function resolveBranchStarterId(nodeId: string): MarcoBranchStarterId | null {
  const node = getMarcoTreeNode(nodeId);
  if (!node) return null;
  return resolveStarterFromRamificacao(node.branch);
}

/** Arestas verticais da trilha completa (membrana persistente). */
export function resolveBranchMembraneEdges(ramificacao: MarcoRamificacaoId): ReadonlySet<string> {
  const branchNodes = getNodesForBranch(ramificacao);
  const edges = new Set<string>();
  for (const node of branchNodes) {
    for (const parentId of node.requires) {
      edges.add(`${parentId}->${node.id}`);
    }
  }
  return edges;
}

export function isNodeOnRamificacao(nodeId: string, ramificacao: MarcoRamificacaoId): boolean {
  const node = getMarcoTreeNode(nodeId);
  return node?.branch === ramificacao;
}
