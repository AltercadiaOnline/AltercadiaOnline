import type { RefractionBoothCompletePayload } from '../../../shared/cityMinigames/refractionBoothTypes.js';
import { getRefractionBoothService } from '../../city/RefractionBoothService.js';
import { BaseIntentHandler } from '../../network/BaseIntentHandler.js';

export type RefractionBoothStartPayload = {
  readonly displayName: string;
};

export class RefractionBoothQuoteHandler extends BaseIntentHandler<Record<string, never>> {
  readonly actionType = 'REFRACTION_BOOTH_QUOTE';

  async execute(playerId: string, _payload: Record<string, never>, intentId: string): Promise<void> {
    const result = getRefractionBoothService().getQuote({
      playerId,
      characterId: this.characterId,
    });
    if (!result.ok) {
      this.sendResponse(playerId, intentId, false, result.reason);
      return;
    }
    this.sendResponse(playerId, intentId, true, result);
  }
}

export class RefractionBoothStartHandler extends BaseIntentHandler<RefractionBoothStartPayload> {
  readonly actionType = 'REFRACTION_BOOTH_START';

  async execute(playerId: string, payload: RefractionBoothStartPayload, intentId: string): Promise<void> {
    const result = await getRefractionBoothService().startSession({
      playerId,
      characterId: this.characterId,
      displayName: payload.displayName,
    });
    if (!result.ok) {
      this.sendResponse(playerId, intentId, false, result.reason);
      return;
    }
    this.sendResponse(playerId, intentId, true, result);
  }
}

export class RefractionBoothCompleteHandler extends BaseIntentHandler<RefractionBoothCompletePayload> {
  readonly actionType = 'REFRACTION_BOOTH_COMPLETE';

  async execute(
    playerId: string,
    payload: RefractionBoothCompletePayload,
    intentId: string,
  ): Promise<void> {
    const result = await getRefractionBoothService().completeSession({
      playerId,
      characterId: this.characterId,
      payload,
    });
    if (!result.ok) {
      this.sendResponse(playerId, intentId, false, result.reason);
      return;
    }
    this.sendResponse(playerId, intentId, true, result);
  }
}

let quoteHandler: RefractionBoothQuoteHandler | null = null;
let startHandler: RefractionBoothStartHandler | null = null;
let completeHandler: RefractionBoothCompleteHandler | null = null;

export function getRefractionBoothQuoteHandler(): RefractionBoothQuoteHandler {
  if (!quoteHandler) quoteHandler = new RefractionBoothQuoteHandler();
  return quoteHandler;
}

export function getRefractionBoothStartHandler(): RefractionBoothStartHandler {
  if (!startHandler) startHandler = new RefractionBoothStartHandler();
  return startHandler;
}

export function getRefractionBoothCompleteHandler(): RefractionBoothCompleteHandler {
  if (!completeHandler) completeHandler = new RefractionBoothCompleteHandler();
  return completeHandler;
}
