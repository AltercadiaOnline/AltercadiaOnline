export const MESTRE_TRILHAS_NPC_ID = 'mestre_trilhas';

export const MARCOS_TRAIL_RESET_MAX_RANGE_TILES = 5;

export type MarcosTrailResetAccessCheck = {
  readonly mapId: string;
  readonly worldX: number;
  readonly worldY: number;
  readonly npcId: string;
};

export type MarcosTrailResetAccessResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly message: string };

function tileDistance(
  worldX: number,
  worldY: number,
  npcTileX: number,
  npcTileY: number,
  tileSize: number,
): number {
  const playerTileX = worldX / tileSize;
  const playerTileY = worldY / tileSize;
  return Math.hypot(playerTileX - npcTileX, playerTileY - npcTileY);
}

/** Servidor: jogador próximo ao Mestre de Trilhas. */
export function validateMarcosTrailResetProximity(
  check: MarcosTrailResetAccessCheck,
  npcTileX: number,
  npcTileY: number,
  tileSize: number,
): MarcosTrailResetAccessResult {
  if (check.npcId !== MESTRE_TRILHAS_NPC_ID) {
    return { ok: false, message: 'Somente o Mestre de Trilhas pode resetar sua trilha.' };
  }

  const distance = tileDistance(check.worldX, check.worldY, npcTileX, npcTileY, tileSize);
  if (distance > MARCOS_TRAIL_RESET_MAX_RANGE_TILES) {
    return { ok: false, message: 'Aproxime-se do Mestre de Trilhas para resetar a trilha.' };
  }

  return { ok: true };
}
