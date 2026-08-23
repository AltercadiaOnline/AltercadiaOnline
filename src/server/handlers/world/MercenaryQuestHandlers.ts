import { applyCharacterXpGain } from '../../../shared/character/characterLevelProgression.js';
import { getMercenaryQuestById } from '../../../shared/quests/mercenaryQuestCatalog.js';
import {
  acceptMercenaryQuest,
  abandonMercenaryQuest,
  completeMercenaryQuest,
} from '../../../shared/quests/mercenaryQuestProgress.js';
import { creditMercenaryQuestVolts } from '../../../Economy/economyGateway.js';
import { BaseIntentHandler } from '../../network/BaseIntentHandler.js';
import {
  getAuthoritativeProgression,
  patchAuthoritativeProgression,
} from '../../progression/authoritativeProgressionStore.js';
import {
  getMercenaryQuestProgress,
  setMercenaryQuestProgress,
} from '../../quests/mercenaryQuestStore.js';

export type AcceptMercenaryQuestPayload = {
  readonly taskId?: string;
  readonly questId?: string;
};

export type AbandonMercenaryQuestPayload = {
  readonly taskId?: string;
  readonly questId?: string;
};

export type CompleteMercenaryQuestPayload = {
  readonly taskId?: string;
  readonly questId?: string;
};

function resolveQuestId(payload: { readonly taskId?: string; readonly questId?: string }): string {
  const questId = payload.questId?.trim() || payload.taskId?.trim() || '';
  return questId;
}

function playerLevelOf(playerId: string, characterId: number): number {
  return Math.max(1, Math.floor(getAuthoritativeProgression(playerId, characterId).characterProfile.level || 1));
}

export class AcceptMercenaryQuestHandler extends BaseIntentHandler<AcceptMercenaryQuestPayload> {
  readonly actionType = 'ACCEPT_MERCENARY_TASK';

  async execute(playerId: string, payload: AcceptMercenaryQuestPayload, intentId: string): Promise<void> {
    const questId = resolveQuestId(payload);
    if (!questId) {
      this.sendResponse(playerId, intentId, false, 'QUEST_NOT_FOUND');
      return;
    }
    const current = getMercenaryQuestProgress(playerId, this.characterId);
    const result = acceptMercenaryQuest(current, questId, playerLevelOf(playerId, this.characterId));
    if (!result.ok) {
      this.sendResponse(playerId, intentId, false, result.code);
      return;
    }
    const progress = setMercenaryQuestProgress(playerId, this.characterId, result.progress);
    this.sendResponse(playerId, intentId, true, { mercenaryQuests: progress });
  }
}

export class AbandonMercenaryQuestHandler extends BaseIntentHandler<AbandonMercenaryQuestPayload> {
  readonly actionType = 'ABANDON_MERCENARY_TASK';

  async execute(playerId: string, payload: AbandonMercenaryQuestPayload, intentId: string): Promise<void> {
    const questId = resolveQuestId(payload);
    const current = getMercenaryQuestProgress(playerId, this.characterId);
    const result = abandonMercenaryQuest(current, questId || undefined);
    if (!result.ok) {
      this.sendResponse(playerId, intentId, false, result.code);
      return;
    }
    const progress = setMercenaryQuestProgress(playerId, this.characterId, result.progress);
    this.sendResponse(playerId, intentId, true, { mercenaryQuests: progress });
  }
}

export class CompleteMercenaryQuestHandler extends BaseIntentHandler<CompleteMercenaryQuestPayload> {
  readonly actionType = 'COMPLETE_MERCENARY_TASK';

  async execute(playerId: string, payload: CompleteMercenaryQuestPayload, intentId: string): Promise<void> {
    const questIdHint = resolveQuestId(payload);
    const current = getMercenaryQuestProgress(playerId, this.characterId);
    const activeId = current.activeQuestId;
    if (!activeId) {
      this.sendResponse(playerId, intentId, false, 'QUEST_NONE_ACTIVE');
      return;
    }

    const quest = getMercenaryQuestById(activeId);
    if (!quest) {
      this.sendResponse(playerId, intentId, false, 'QUEST_NOT_FOUND');
      return;
    }

    const completed = completeMercenaryQuest(current, questIdHint || undefined);
    if (!completed.ok) {
      this.sendResponse(playerId, intentId, false, completed.code);
      return;
    }

    // Pagamento antes de marcar concluído — evita “done” sem reward.
    const voltsResult = await creditMercenaryQuestVolts({
      playerId,
      characterId: this.characterId,
      amountVolts: quest.rewardVolts,
      intentId,
    });
    if (!voltsResult.ok) {
      this.sendResponse(playerId, intentId, false, voltsResult.message);
      return;
    }

    const progression = getAuthoritativeProgression(playerId, this.characterId);
    const xpApplied = applyCharacterXpGain(
      {
        level: progression.characterProfile.level,
        xpCurrent: progression.characterProfile.xpCurrent,
      },
      quest.rewardExp,
    );
    patchAuthoritativeProgression(playerId, this.characterId, {
      characterProfile: {
        level: xpApplied.level,
        xpCurrent: xpApplied.xpCurrent,
      },
    });

    const progress = setMercenaryQuestProgress(playerId, this.characterId, completed.progress);
    this.sendResponse(playerId, intentId, true, {
      mercenaryQuests: progress,
      characterLevel: { level: xpApplied.level, xpCurrent: xpApplied.xpCurrent },
      rewardExp: quest.rewardExp,
      rewardVolts: quest.rewardVolts,
      dollarVolt: voltsResult.dollarVolt,
    });
  }
}

let acceptHandler: AcceptMercenaryQuestHandler | null = null;
let abandonHandler: AbandonMercenaryQuestHandler | null = null;
let completeHandler: CompleteMercenaryQuestHandler | null = null;

export function getAcceptMercenaryQuestHandler(): AcceptMercenaryQuestHandler {
  if (!acceptHandler) acceptHandler = new AcceptMercenaryQuestHandler();
  return acceptHandler;
}

export function getAbandonMercenaryQuestHandler(): AbandonMercenaryQuestHandler {
  if (!abandonHandler) abandonHandler = new AbandonMercenaryQuestHandler();
  return abandonHandler;
}

export function getCompleteMercenaryQuestHandler(): CompleteMercenaryQuestHandler {
  if (!completeHandler) completeHandler = new CompleteMercenaryQuestHandler();
  return completeHandler;
}
