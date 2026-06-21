import type { BattleEndReason } from '../combat/battleEnded.js';
import type { BattleRankingResult } from '../combat/battleType.js';
import type { BattleType } from '../combat/battleType.js';

/** Resumo exibido no hub pós-batalha (PVE vitória/derrota, PVP duelo). */
export type PostBattleHubSummary = {
  readonly battleType: BattleType;
  readonly victory: boolean;
  readonly xpGain?: number;
  readonly endReason?: BattleEndReason;
  readonly rankingResult?: BattleRankingResult;
};

/** Estado do botão Recompensas enquanto aguarda pacote de loot do servidor. */
export type PostBattleRewardsLootStatus = 'unavailable' | 'waiting_for_server' | 'ready';

/** Handlers imperativos registrados pelo bridge legado → disparados pelo React. */
export type PostBattleHubHandlers = {
  readonly onStatistics: () => void;
  readonly onRewards?: () => void | Promise<void>;
  readonly onViewOpponent?: () => void;
  readonly onExit: () => void | Promise<void>;
  readonly rewardsLootStatus?: PostBattleRewardsLootStatus;
  readonly battleId?: string;
};

export const POST_BATTLE_HUB_ROOT_CLASS = 'post-battle-hub';
export const POST_BATTLE_HUB_FORCE_CLASS = 'post-battle-hub--force-viewport';
