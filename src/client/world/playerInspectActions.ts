import { getActionDispatcher } from '../ActionDispatcher.js';
import { postSystemNotification } from '../ui/logService.js';
import { closeSprayInspectHud } from './sprayInspectStore.js';
import {
  closePlayerInspectHud,
  getPlayerInspectHudState,
  openPlayerInspectHudPending,
  setPlayerInspectPending,
} from './playerInspectStore.js';
import {
  pickNearestWorldPlayerOnScreen,
  pickWorldPlayerAt,
  pickWorldPlayerAtWorldPixel,
  pickWorldPlayerSpriteOnScreen,
} from './worldPlayerPickRegistry.js';
import { screenToWorldPixel, worldPixelToTile } from './screenCoords.js';
import type { Camera } from '../scenes/Camera.js';

export function inspectWorldPlayerAt(
  camera: Camera,
  screenX: number,
  screenY: number,
  clientX: number,
  clientY: number,
): boolean {
  const { worldX, worldY } = screenToWorldPixel(camera, screenX, screenY);
  const tile = worldPixelToTile(worldX, worldY);
  const target =
    pickWorldPlayerAt(tile.tileX, tile.tileY)
    ?? pickWorldPlayerAtWorldPixel(worldX, worldY)
    ?? pickWorldPlayerSpriteOnScreen(camera, screenX, screenY)
    ?? pickNearestWorldPlayerOnScreen(camera, screenX, screenY);
  if (!target) return false;
  closeSprayInspectHud();
  openPlayerInspectHudPending({
    playerId: target.playerId,
    characterId: target.characterId,
    displayName: target.displayName,
    screenX: clientX,
    screenY: clientY,
  });
  const result = getActionDispatcher().dispatch({
    type: 'INSPECT_PLAYER',
    payload: {
      targetPlayerId: target.playerId,
      targetCharacterId: target.characterId,
      screenX: clientX,
      screenY: clientY,
    },
  });
  if (!result.ok) {
    setPlayerInspectPending(false, result.reason);
    postSystemNotification(result.reason);
  }
  return true;
}

export function dispatchPlayerFriendRequest(targetPlayerId: string, targetCharacterId: number): void {
  setPlayerInspectPending(true);
  const result = getActionDispatcher().dispatch({
    type: 'ADD_FRIEND',
    payload: { targetPlayerId, targetCharacterId },
  });
  if (!result.ok) {
    setPlayerInspectPending(false, result.reason);
    postSystemNotification(result.reason);
  }
}

export function dispatchDuelInvite(targetPlayerId: string, targetCharacterId: number): void {
  setPlayerInspectPending(true);
  const result = getActionDispatcher().dispatch({
    type: 'DUEL_INVITE',
    payload: { targetPlayerId, targetCharacterId },
  });
  if (!result.ok) {
    setPlayerInspectPending(false, result.reason);
    postSystemNotification(result.reason);
  }
}

/** Revalida a ficha aberta (ex.: chegou mais perto) — servidor atualiza canInviteDuel. */
export function refreshOpenPlayerInspect(): void {
  const hud = getPlayerInspectHudState();
  const view = hud.view;
  if (!view || hud.pending || hud.loadingInspect) return;
  openPlayerInspectHudPending({
    playerId: view.playerId,
    characterId: view.characterId,
    displayName: view.displayName,
    screenX: hud.screenX,
    screenY: hud.screenY,
  });
  const result = getActionDispatcher().dispatch({
    type: 'INSPECT_PLAYER',
    payload: {
      targetPlayerId: view.playerId,
      targetCharacterId: view.characterId,
      screenX: hud.screenX,
      screenY: hud.screenY,
    },
  });
  if (!result.ok) {
    setPlayerInspectPending(false, result.reason);
    postSystemNotification(result.reason);
  }
}

export function dispatchDuelInviteRespond(inviteId: string, accept: boolean): void {
  const result = getActionDispatcher().dispatch({
    type: 'DUEL_INVITE_RESPOND',
    payload: { inviteId, accept },
  });
  if (!result.ok) {
    postSystemNotification(result.reason);
  }
}

export function dispatchTradeRequest(targetPlayerId: string, targetCharacterId: number): void {
  setPlayerInspectPending(true);
  const result = getActionDispatcher().dispatch({
    type: 'TRADE_REQUEST',
    payload: { targetPlayerId, targetCharacterId },
  });
  if (!result.ok) {
    setPlayerInspectPending(false, result.reason);
    postSystemNotification(result.reason);
  }
}

export function dispatchTradeRespond(tradeId: string, accept: boolean): void {
  const result = getActionDispatcher().dispatch({
    type: 'TRADE_RESPOND',
    payload: { tradeId, accept },
  });
  if (!result.ok) {
    postSystemNotification(result.reason);
  }
}

export function dispatchTradeOfferSet(
  tradeId: string,
  payload: {
    readonly slotIndex?: number;
    readonly itemId?: string | null;
    readonly quantity?: number;
    readonly volts?: number;
  },
): void {
  const result = getActionDispatcher().dispatch({
    type: 'TRADE_OFFER_SET',
    payload: { tradeId, ...payload },
  });
  if (!result.ok) {
    postSystemNotification(result.reason);
  }
}

export function dispatchTradeLock(tradeId: string, ready: boolean): void {
  const result = getActionDispatcher().dispatch({
    type: 'TRADE_LOCK',
    payload: { tradeId, ready },
  });
  if (!result.ok) {
    postSystemNotification(result.reason);
  }
}

export function dispatchTradeCancel(tradeId: string): void {
  const result = getActionDispatcher().dispatch({
    type: 'TRADE_CANCEL',
    payload: { tradeId },
  });
  if (!result.ok) {
    postSystemNotification(result.reason);
  }
}

export function closePinnedPlayerInspectHud(): void {
  closePlayerInspectHud();
}
