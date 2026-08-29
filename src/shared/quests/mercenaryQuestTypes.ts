/** Contrato de missão do Quadro de Agente (Mercenário). Catálogo estático — progresso é persistido. */

/** Steps do cronograma — HUD já lista; mecânica de mundo ainda não. */
export const MERCENARY_QUEST_INTERACTION_TYPES = [
  'SCAN_TERMINAL',
  'RESCUE_CONTACT',
  'RETRIEVE_DRONE',
  'INJECT_VIRUS',
  'STEAL_BATTERIES',
  'DISCONNECT_CABLES',
  'TUNE_FREQUENCY',
  'FETCH_WATCH',
  'EXTRACT_SAMPLE',
  'LOCATE_TERMINAL',
  'DISABLE_NODE',
  'ACCESS_PORT_TERMINAL',
  'CRACK_SAFE',
  'RESTORE_POWER',
] as const;

export type MercenaryQuestInteractionType = (typeof MERCENARY_QUEST_INTERACTION_TYPES)[number];

/** Piloto: 3 faixas. Tiers 4–5 ficam para expansão. */
export type MercenaryQuestTier = 1 | 2 | 3;

export type MercenaryQuestRewards = {
  /** Reservado — não concedido no piloto MVP. */
  readonly reputation: number;
  readonly item?: string;
};

export type MercenaryQuestDefinition = {
  readonly id: string;
  readonly title: string;
  readonly minLevel: number;
  readonly maxLevel: number;
  readonly tier: MercenaryQuestTier;
  readonly npcGiver: string;
  /** Linha curta para o quadro compacto (loja do mercenário). */
  readonly loreSummary: string;
  /** História canônica do contrato. */
  readonly lore: string;
  /** Loop previsto do contrato (objetivo na HUD). */
  readonly interaction: string;
  readonly interactionType: MercenaryQuestInteractionType;
  readonly moralChoice: boolean;
  readonly rewardExp: number;
  /** VOLTS pagos no Completar (economyGateway). */
  readonly rewardVolts: number;
  readonly rewardBonds: MercenaryQuestRewards;
};

export type MercenaryQuestBand = {
  readonly tier: MercenaryQuestTier;
  readonly minLevel: number;
  readonly maxLevel: number;
  readonly title: string;
  readonly brief: string;
};

export type MercenaryQuestProgress = {
  readonly activeQuestId: string | null;
  readonly completedQuestIds: readonly string[];
};

export type MercenaryQuestBoardRow = MercenaryQuestDefinition & {
  readonly status: 'available' | 'active' | 'completed';
};

export const EMPTY_MERCENARY_QUEST_PROGRESS: MercenaryQuestProgress = {
  activeQuestId: null,
  completedQuestIds: [],
};
