import type { SubZoneTransitionId } from '../../../shared/types/zoneBypass.js';
import { isSubZoneTransitionId } from '../../../shared/types/zoneBypassGuards.js';
import { BaseIntentHandler } from '../../network/BaseIntentHandler.js';
import { getAuthoritativeZoneBypassGateway } from '../../world/AuthoritativeZoneBypassGateway.js';
import { getAuthoritativeProgression } from '../../progression/authoritativeProgressionStore.js';

export type ZoneBypassInitPayload = {
  readonly transitionId: SubZoneTransitionId;
};

export class ZoneBypassInitHandler extends BaseIntentHandler<ZoneBypassInitPayload> {
  readonly actionType = 'ZONE_BYPASS_INIT';

  async execute(
    playerId: string,
    payload: ZoneBypassInitPayload,
    intentId: string,
  ): Promise<void> {
    if (!isSubZoneTransitionId(payload?.transitionId)) {
      this.sendResponse(playerId, intentId, false, 'TRANSITION_INVALID');
      return;
    }

    const characterId = this.characterId;
    if (!characterId || characterId < 1) {
      this.sendResponse(playerId, intentId, false, 'NO_WORLD_SESSION');
      return;
    }

    const gateway = getAuthoritativeZoneBypassGateway();
    await gateway.ensureBootstrapped();

    try {
      const result = gateway.initSession(playerId, characterId, payload.transitionId);
      this.sendResponse(playerId, intentId, true, result);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Falha ao iniciar terminal.';
      this.sendResponse(playerId, intentId, false, message);
    }
  }
}

export type ZoneBypassSubmitPayload = {
  readonly sessionId: string;
  readonly inputCode: string;
};

export class ZoneBypassSubmitHandler extends BaseIntentHandler<ZoneBypassSubmitPayload> {
  readonly actionType = 'ZONE_BYPASS_SUBMIT';

  async execute(
    playerId: string,
    payload: ZoneBypassSubmitPayload,
    intentId: string,
  ): Promise<void> {
    const sessionId = payload?.sessionId?.trim();
    const inputCode = payload?.inputCode?.trim();
    if (!sessionId || !inputCode) {
      this.sendResponse(playerId, intentId, false, 'PAYLOAD_INVALID');
      return;
    }

    const characterId = this.characterId;
    if (!characterId || characterId < 1) {
      this.sendResponse(playerId, intentId, false, 'NO_WORLD_SESSION');
      return;
    }

    const gateway = getAuthoritativeZoneBypassGateway();
    await gateway.ensureBootstrapped();

    const profile = getAuthoritativeProgression(playerId, characterId).characterProfile;
    const displayName = profile.displayName?.trim() || 'Operador';
    const result = gateway.submitAnswer(
      playerId,
      characterId,
      sessionId,
      inputCode,
      displayName,
    );

    if (!result.success) {
      this.sendResponse(playerId, intentId, false, result.errorMessage ?? 'Falha no terminal.');
      return;
    }

    this.sendResponse(playerId, intentId, true, {
      ...result,
      zoneDomain: gateway.getDomainSnapshot(playerId, characterId),
    });
  }
}

let initHandler: ZoneBypassInitHandler | null = null;
let submitHandler: ZoneBypassSubmitHandler | null = null;

export function getZoneBypassInitHandler(): ZoneBypassInitHandler {
  if (!initHandler) initHandler = new ZoneBypassInitHandler();
  return initHandler;
}

export function getZoneBypassSubmitHandler(): ZoneBypassSubmitHandler {
  if (!submitHandler) submitHandler = new ZoneBypassSubmitHandler();
  return submitHandler;
}
