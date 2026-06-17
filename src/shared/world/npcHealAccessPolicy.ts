import { NPC_HEAL_PROVIDER_ANCIAO_CAEL } from './npcHealService.js';
import { getResolvedNpcRegistry } from './npcRegistry.js';
import { TILE_SIZE } from './mapConstants.js';

/** Alcance máximo (tiles) para cura no Ancião Cael — validação autoritativa. */
export const HEAL_AT_NPC_MAX_RANGE_TILES = 5;

export type HealNpcAccessCheck = {
  readonly mapId: string;
  readonly worldX: number;
  readonly worldY: number;
  readonly npcId: string;
};

export type HealNpcAccessResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly code: 'OUT_OF_RANGE'; readonly message: string };

function tileDistanceToNpc(
  worldX: number,
  worldY: number,
  npcTileX: number,
  npcTileY: number,
): number {
  const playerTileX = worldX / TILE_SIZE;
  const playerTileY = worldY / TILE_SIZE;
  return Math.hypot(playerTileX - npcTileX, playerTileY - npcTileY);
}

/** Servidor: jogador dentro do raio do NPC de cura autorizado. */
export function validateHealNpcProximity(check: HealNpcAccessCheck): HealNpcAccessResult {
  if (check.npcId !== NPC_HEAL_PROVIDER_ANCIAO_CAEL) {
    return { ok: false, code: 'OUT_OF_RANGE', message: 'OUT_OF_RANGE: Este NPC não oferece cura.' };
  }

  const entry = getResolvedNpcRegistry().find((npc) => npc.id === check.npcId);
  if (!entry || entry.mapId !== check.mapId) {
    return {
      ok: false,
      code: 'OUT_OF_RANGE',
      message: 'OUT_OF_RANGE: Ancião Cael não está neste mapa.',
    };
  }

  const distance = tileDistanceToNpc(
    check.worldX,
    check.worldY,
    entry.tileX,
    entry.tileY,
  );

  if (distance > HEAL_AT_NPC_MAX_RANGE_TILES) {
    return {
      ok: false,
      code: 'OUT_OF_RANGE',
      message: 'OUT_OF_RANGE: Aproxime-se do Ancião Cael para receber cura.',
    };
  }

  return { ok: true };
}

/** Valida proximidade no servidor; aceita espelho do cliente se o perfil estiver defasado. */
export function validateHealNpcProximityWithClientMirror(
  server: HealNpcAccessCheck,
  client?: {
    readonly mapId?: string;
    readonly worldX?: number;
    readonly worldY?: number;
  },
): HealNpcAccessResult {
  const authoritative = validateHealNpcProximity(server);
  if (authoritative.ok) return authoritative;

  if (
    client?.mapId
    && typeof client.worldX === 'number'
    && Number.isFinite(client.worldX)
    && typeof client.worldY === 'number'
    && Number.isFinite(client.worldY)
  ) {
    return validateHealNpcProximity({
      mapId: client.mapId,
      worldX: client.worldX,
      worldY: client.worldY,
      npcId: server.npcId,
    });
  }

  return authoritative;
}
