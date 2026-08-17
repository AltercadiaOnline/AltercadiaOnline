import { BaseIntentHandler } from '../../network/BaseIntentHandler.js';
import { getAuthoritativeProgression } from '../../progression/authoritativeProgressionStore.js';
import {
  acceptMercenaryQuest,
  abandonMercenaryQuest,
} from '../../../shared/quests/mercenaryQuestProgress.js';
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

let acceptHandler: AcceptMercenaryQuestHandler | null = null;
let abandonHandler: AbandonMercenaryQuestHandler | null = null;

export function getAcceptMercenaryQuestHandler(): AcceptMercenaryQuestHandler {
  if (!acceptHandler) acceptHandler = new AcceptMercenaryQuestHandler();
  return acceptHandler;
}

export function getAbandonMercenaryQuestHandler(): AbandonMercenaryQuestHandler {
  if (!abandonHandler) abandonHandler = new AbandonMercenaryQuestHandler();
  return abandonHandler;
}
