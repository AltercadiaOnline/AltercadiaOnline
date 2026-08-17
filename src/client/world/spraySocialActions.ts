import { getActionDispatcher } from '../ActionDispatcher.js';
import { postSystemNotification } from '../ui/logService.js';
import { getPendingIntentRegistry } from '../sync/pendingIntentRegistry.js';
import {
  closeSprayInspectHud,
  getOwnSprayLegacyMessage,
  openSprayInspectHud,
  setSprayInspectPending,
} from './sprayInspectStore.js';
import { pickWorldSprayAt } from './worldSpraySyncBridge.js';
import { getActiveCharacterIdentity } from '../character/activeCharacterIdentity.js';
import { getLocalSession } from '../services/localSessionStore.js';
import { isOfficialSprayItemId } from '../../shared/social/spraySocialTypes.js';
import { getPlayerItemStore } from '../ui/items/playerItemStore.js';
import { sanitizeSprayLegacyMessage } from '../../shared/social/spraySocialTypes.js';
import { getPlayerEquipmentStore } from '../ui/equipment/playerEquipmentStore.js';

function resolveActivePlayerId(): string | null {
  return getLocalSession()?.id ?? null;
}

export function dispatchPlaceSpray(sprayAssetId?: string): void {
  const itemId = sprayAssetId ?? findOwnedSprayItemId();
  if (!itemId) {
    postSystemNotification('Você não possui uma lata de spray tático no inventário.');
    return;
  }
  if (getPendingIntentRegistry().isInventoryItemMutationPending(itemId)) {
    return;
  }
  const result = getActionDispatcher().dispatch({
    type: 'PLACE_SPRAY',
    payload: { sprayAssetId: itemId },
  });
  if (!result.ok) {
    postSystemNotification(result.reason);
  }
}

export function findOwnedSprayItemId(): string | null {
  const inv = getPlayerItemStore().getInventorySnapshot();
  const slot = inv.slots.find((s) => s.itemId && s.quantity > 0 && isOfficialSprayItemId(s.itemId));
  return slot?.itemId ?? null;
}

export function inspectWorldSprayAt(
  mapId: string,
  worldX: number,
  worldY: number,
  screenX: number,
  screenY: number,
): boolean {
  const spray = pickWorldSprayAt(mapId, worldX, worldY);
  if (!spray) {
    closeSprayInspectHud();
    return false;
  }
  dispatchInspectSpray(spray.id, screenX, screenY);
  return true;
}

export function dispatchInspectSpray(sprayId: string, screenX: number, screenY: number): void {
  const result = getActionDispatcher().dispatch({
    type: 'INSPECT_SPRAY',
    payload: { sprayId, screenX, screenY },
  });
  if (!result.ok) {
    postSystemNotification(result.reason);
  }
}

export function dispatchUpdateSprayLegacy(message: string, sprayId?: string): void {
  const sanitized = sanitizeSprayLegacyMessage(message);
  setSprayInspectPending(true);
  const result = getActionDispatcher().dispatch({
    type: 'UPDATE_SPRAY_LEGACY',
    payload: {
      message: sanitized,
      ...(sprayId ? { sprayId } : {}),
    },
  });
  if (!result.ok) {
    setSprayInspectPending(false, result.reason);
    postSystemNotification(result.reason);
  }
}

export function dispatchSendFriendRequest(targetPlayerId: string, targetCharacterId: number): void {
  const identity = getActiveCharacterIdentity();
  const playerId = resolveActivePlayerId();
  if (identity && playerId && playerId === targetPlayerId && identity.characterId === targetCharacterId) {
    postSystemNotification('Não é possível adicionar a si mesmo.');
    return;
  }
  setSprayInspectPending(true);
  const result = getActionDispatcher().dispatch({
    type: 'ADD_FRIEND',
    payload: { targetPlayerId, targetCharacterId },
  });
  if (!result.ok) {
    setSprayInspectPending(false, result.reason);
    postSystemNotification(result.reason);
  }
}

export function openOwnLegacyEditor(screenX: number, screenY: number): void {
  const identity = getActiveCharacterIdentity();
  const playerId = resolveActivePlayerId() ?? 'local_player';
  if (!identity) {
    postSystemNotification('Selecione um personagem para editar o legado.');
    return;
  }
  const equipment = getPlayerEquipmentStore().getSnapshot();
  openSprayInspectHud(
    {
      sprayId: '',
      mapId: '',
      tileX: 0,
      tileY: 0,
      sprayAssetId: findOwnedSprayItemId() ?? 'spray_alerta_binario',
      author: {
        playerId,
        characterId: identity.characterId,
        displayName: identity.displayName || equipment.displayName,
        level: Math.max(1, equipment.level),
        online: true,
        legacyMessage: getOwnSprayLegacyMessage(),
      },
      canEditLegacy: true,
      canAddFriend: false,
    },
    screenX,
    screenY,
  );
}

export { closeSprayInspectHud };
