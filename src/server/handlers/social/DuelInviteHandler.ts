import { BaseIntentHandler } from '../../network/BaseIntentHandler.js';
import { getWorldGameState } from '../../world/WorldGameState.js';
import { resolveNearbyPeerAppearance } from '../../world/nearbyPlayerAppearance.js';
import { DEFAULT_PLAYER_SKIN_BUNDLE_ID } from '../../../shared/character/playerSkinBundle.js';
import type { DuelInvitePayload } from '../../../shared/social/casualDuelTypes.js';
import { getCasualDuelInviteStore } from '../../social/casualDuelInviteStore.js';

export class DuelInviteHandler extends BaseIntentHandler<DuelInvitePayload> {
  readonly actionType = 'DUEL_INVITE';

  async execute(playerId: string, payload: DuelInvitePayload, intentId: string): Promise<void> {
    const targetPlayerId = typeof payload.targetPlayerId === 'string' ? payload.targetPlayerId.trim() : '';
    const targetCharacterId = Number(payload.targetCharacterId);
    if (!targetPlayerId || !Number.isFinite(targetCharacterId) || targetCharacterId < 1) {
      this.sendResponse(playerId, intentId, false, 'Alvo de duelo inválido.');
      return;
    }

    const fromWorld = getWorldGameState().getByPlayer(playerId, this.characterId);
    const toWorld = getWorldGameState().getByPlayer(targetPlayerId, targetCharacterId);
    if (!fromWorld) {
      this.sendResponse(playerId, intentId, false, 'Você precisa estar no mundo para desafiar.');
      return;
    }
    if (!toWorld) {
      this.sendResponse(playerId, intentId, false, 'Jogador indisponível ou offline.');
      return;
    }

    const fromAppearance = resolveNearbyPeerAppearance(playerId, this.characterId);
    const toAppearance = resolveNearbyPeerAppearance(targetPlayerId, targetCharacterId);
    const result = getCasualDuelInviteStore().createInvite(
      {
        connectionId: fromWorld.connectionId,
        playerId,
        characterId: this.characterId,
        displayName: fromWorld.displayName.trim() || 'Operative',
        skinBundleId: fromAppearance.skinBundleId || DEFAULT_PLAYER_SKIN_BUNDLE_ID,
        ready: false,
        stakeVolts: 0,
        stakeLocked: false,
      },
      {
        connectionId: toWorld.connectionId,
        playerId: targetPlayerId,
        characterId: targetCharacterId,
        displayName: toWorld.displayName.trim() || 'Operative',
        skinBundleId: toAppearance.skinBundleId || DEFAULT_PLAYER_SKIN_BUNDLE_ID,
        ready: false,
        stakeVolts: 0,
        stakeLocked: false,
      },
    );

    if (!result.ok) {
      this.sendResponse(playerId, intentId, false, result.reason);
      return;
    }

    this.sendResponse(playerId, intentId, true, {
      inviteId: result.snapshot.inviteId,
      message: `Desafio enviado para ${result.snapshot.toDisplayName}.`,
    });
  }
}

let handler: DuelInviteHandler | null = null;

export function getDuelInviteHandler(): DuelInviteHandler {
  if (!handler) handler = new DuelInviteHandler();
  return handler;
}
