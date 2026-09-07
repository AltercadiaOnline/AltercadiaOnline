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
    const session = this.captureSession();

    if (!isSubZoneTransitionId(payload?.transitionId)) {
      session.sendResponse(playerId, intentId, false, 'TRANSITION_INVALID');
      return;
    }

    const characterId = session.characterId;
    if (!characterId || characterId < 1) {
      session.sendResponse(playerId, intentId, false, 'NO_WORLD_SESSION');
      return;
    }

    const gateway = getAuthoritativeZoneBypassGateway();
    try {
      await gateway.ensureBootstrapped();
      const result = gateway.initSession(playerId, characterId, payload.transitionId);
      session.sendResponse(playerId, intentId, true, result);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Falha ao iniciar terminal.';
      session.sendResponse(playerId, intentId, false, message);
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
    const session = this.captureSession();
    const sessionId = payload?.sessionId?.trim();
    const inputCode = payload?.inputCode?.trim();
    if (!sessionId || !inputCode) {
      session.sendResponse(playerId, intentId, false, 'PAYLOAD_INVALID');
      return;
    }

    const characterId = session.characterId;
    if (!characterId || characterId < 1) {
      session.sendResponse(playerId, intentId, false, 'NO_WORLD_SESSION');
      return;
    }

    const gateway = getAuthoritativeZoneBypassGateway();
    try {
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
        session.sendResponse(playerId, intentId, false, result.errorMessage ?? 'Falha no terminal.');
        return;
      }

      session.sendResponse(playerId, intentId, true, {
        ...result,
        zoneDomain: gateway.getDomainSnapshot(playerId, characterId),
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Falha ao validar terminal.';
      session.sendResponse(playerId, intentId, false, message);
    }
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
