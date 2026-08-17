/** Contrato de missão do Quadro de Agente (Mercenário). Catálogo estático — progresso é persistido. */

export const MERCENARY_QUEST_INTERACTION_TYPES = [
  'investigation_bribe',
  'investigation_npc_trade',
  'investigation_spray',
  'item_inspection',
  'escort_moral',
  'investigation_branch',
  'infiltration',
  'spray_trail',
  'negotiation',
  'timed_bribe',
  'moral_expose',
  'forensic_investigation',
  'tracking_negotiate',
  'base_defense',
  'vault_infiltrate',
  'evidence_blackmail',
  'urban_treasure',
  'system_choice',
  'narrative_reckoning',
] as const;

export type MercenaryQuestInteractionType = (typeof MERCENARY_QUEST_INTERACTION_TYPES)[number];

export type MercenaryQuestTier = 1 | 2 | 3 | 4 | 5;

export type MercenaryQuestRewards = {
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
  /** Mecânica / interação do contrato. */
  readonly interaction: string;
  readonly interactionType: MercenaryQuestInteractionType;
  readonly moralChoice: boolean;
  readonly rewardExp: number;
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
