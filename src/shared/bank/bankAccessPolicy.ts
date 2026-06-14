import { BANK_CLIENT_REPORTED_RADIUS_TILES, BANK_NPC_ID } from './bankConstants.js';
import { NPC_INTERACTION_RADIUS_TILES, getResolvedNpcRegistry } from '../world/npcRegistry.js';
import { TILE_SIZE } from '../world/mapConstants.js';
import { getMapDefinition } from '../world/mapRegistry.js';

export type BankAccessCheck = {
  readonly mapId: string;
  readonly worldX: number;
  readonly worldY: number;
  readonly npcId?: string;
  readonly radiusTiles?: number;
};

export type BankAccessValidation = {
  readonly mapId: string;
  readonly serverX: number;
  readonly serverY: number;
  readonly clientReportedX?: number;
  readonly clientReportedY?: number;
  readonly npcId?: string;
};

function resolveMapTileSize(mapId: string): number {
  return getMapDefinition(mapId)?.tileSize ?? TILE_SIZE;
}

function tileDistanceToNpc(
  worldX: number,
  worldY: number,
  npcTileX: number,
  npcTileY: number,
  mapId: string,
): number {
  const tileSize = resolveMapTileSize(mapId);
  const playerTileX = worldX / tileSize;
  const playerTileY = worldY / tileSize;
  return Math.hypot(playerTileX - npcTileX, playerTileY - npcTileY);
}

/** Servidor: jogador precisa estar ao alcance do Banqueiro (mesma regra do cliente). */
export function isPlayerNearBankNpc(check: BankAccessCheck): boolean {
  const npcId = check.npcId ?? BANK_NPC_ID;
  const entry = getResolvedNpcRegistry().find((npc) => npc.id === npcId);
  if (!entry || entry.mapId !== check.mapId) return false;

  const radiusTiles = check.radiusTiles ?? NPC_INTERACTION_RADIUS_TILES;
  const distance = tileDistanceToNpc(
    check.worldX,
    check.worldY,
    entry.tileX,
    entry.tileY,
    check.mapId,
  );
  return distance <= radiusTiles;
}

function parseClientReportedPosition(
  x: unknown,
  y: unknown,
): { readonly x: number; readonly y: number } | null {
  if (typeof x !== 'number' || !Number.isFinite(x)) return null;
  if (typeof y !== 'number' || !Number.isFinite(y)) return null;
  return { x, y };
}

/**
 * Valida acesso ao banco: posição autoritativa primeiro; se falhar, aceita coordenadas
 * reportadas pelo cliente com raio tolerante (desync MOVE_INTENT vs movimento local).
 */
export function validateBankNpcAccess(check: BankAccessValidation): boolean {
  if (isPlayerNearBankNpc({
    mapId: check.mapId,
    worldX: check.serverX,
    worldY: check.serverY,
    ...(check.npcId !== undefined ? { npcId: check.npcId } : {}),
  })) {
    return true;
  }

  const clientPos = parseClientReportedPosition(check.clientReportedX, check.clientReportedY);
  if (!clientPos) return false;

  return isPlayerNearBankNpc({
    mapId: check.mapId,
    worldX: clientPos.x,
    worldY: clientPos.y,
    radiusTiles: BANK_CLIENT_REPORTED_RADIUS_TILES,
    ...(check.npcId !== undefined ? { npcId: check.npcId } : {}),
  });
}
