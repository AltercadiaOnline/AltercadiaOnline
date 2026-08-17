import { BaseIntentHandler } from '../../network/BaseIntentHandler.js';
import { getWorldGameState } from '../../world/WorldGameState.js';
import { getAuthoritativeProgression } from '../../progression/authoritativeProgressionStore.js';
import { getCharacterProfile } from '../../../Economy/economyStore.js';
import { getItemById } from '../../../shared/items/itemCatalog.js';
import { EQUIPMENT_UI_SLOT_ORDER, createEmptyEquipmentUiGrid } from '../../../shared/character/equipmentUiSlots.js';
import { hasFriend } from '../../social/friendListStore.js';
import { isWithinPlayerInspectRange } from '../../../shared/social/playerSocialRange.js';
import type { InspectPlayerPayload, PlayerInspectView } from '../../../shared/social/playerInspectTypes.js';

function findExploring(playerId: string, characterId: number) {
  return getWorldGameState().getByPlayer(playerId, characterId);
}

export function buildPlayerInspectView(
  viewerPlayerId: string,
  viewerCharacterId: number,
  targetPlayerId: string,
  targetCharacterId: number,
): { readonly ok: true; readonly view: PlayerInspectView } | { readonly ok: false; readonly reason: string } {
  if (!targetPlayerId || !Number.isFinite(targetCharacterId) || targetCharacterId < 1) {
    return { ok: false, reason: 'Alvo inválido.' };
  }
  if (targetPlayerId === viewerPlayerId && targetCharacterId === viewerCharacterId) {
    return { ok: false, reason: 'Não é possível inspecionar a si mesmo.' };
  }

  const viewer = findExploring(viewerPlayerId, viewerCharacterId);
  if (!viewer || viewer.status !== 'exploring') {
    return { ok: false, reason: 'Você precisa estar no mundo para inspecionar.' };
  }

  const target = findExploring(targetPlayerId, targetCharacterId);
  const online = Boolean(target && target.status === 'exploring');
  if (!target || !online) {
    return { ok: false, reason: 'Jogador indisponível ou fora do mundo.' };
  }
  if (target.mapId !== viewer.mapId) {
    return { ok: false, reason: 'O jogador não está no mesmo mapa.' };
  }
  if (!isWithinPlayerInspectRange(viewer.x, viewer.y, target.x, target.y)) {
    return { ok: false, reason: 'O jogador não está na sua tela.' };
  }

  const progression = getAuthoritativeProgression(targetPlayerId, targetCharacterId);
  const profile = getCharacterProfile(targetPlayerId, targetCharacterId);
  const displayName =
    progression.characterProfile.displayName?.trim()
    || target.displayName.trim()
    || 'Operative';
  const level = Math.max(1, Math.floor(progression.characterProfile.level || 1));
  const grid = profile.equipmentUiGrid ?? createEmptyEquipmentUiGrid();

  return {
    ok: true,
    view: {
      playerId: targetPlayerId,
      characterId: targetCharacterId,
      displayName,
      level,
      online: true,
      equipment: EQUIPMENT_UI_SLOT_ORDER.map((slotId) => {
        const itemId = grid[slotId] ?? null;
        const itemName = itemId ? (getItemById(itemId)?.name ?? itemId) : null;
        return { slotId, itemId, itemName };
      }),
      canAddFriend: !hasFriend(viewerPlayerId, viewerCharacterId, targetPlayerId, targetCharacterId),
      canInviteDuel: true,
      canTrade: true,
    },
  };
}

export class InspectPlayerHandler extends BaseIntentHandler<InspectPlayerPayload> {
  readonly actionType = 'INSPECT_PLAYER';

  async execute(playerId: string, payload: InspectPlayerPayload, intentId: string): Promise<void> {
    const targetPlayerId = typeof payload.targetPlayerId === 'string' ? payload.targetPlayerId.trim() : '';
    const targetCharacterId = Number(payload.targetCharacterId);
    const built = buildPlayerInspectView(playerId, this.characterId, targetPlayerId, targetCharacterId);
    if (!built.ok) {
      this.sendResponse(playerId, intentId, false, built.reason);
      return;
    }
    this.sendResponse(playerId, intentId, true, { inspect: built.view });
  }
}

let handler: InspectPlayerHandler | null = null;

export function getInspectPlayerHandler(): InspectPlayerHandler {
  if (!handler) handler = new InspectPlayerHandler();
  return handler;
}
