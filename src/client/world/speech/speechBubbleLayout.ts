import { getActiveMapTileSize } from '../../../shared/world/activeMapTileSize.js';
import { resolvePlayerVisualBounds } from '../../../shared/world/playerVisualContract.js';
import {
  SPEECH_BUBBLE_OFFSET_Y_PX,
  SPEECH_BUBBLE_STACK_STEP_PX,
} from '../../../shared/world/speechBubbleConstants.js';

export type SpeechBubbleAnchorInput = {
  readonly id: string;
  readonly worldX: number;
  readonly worldY: number;
};

/** Ancora vertical ao lado do ombro — abaixo do nametag, sem sobrepor nome/nível. */
export function resolveSpeechBubbleAnchorTopY(worldX: number, worldY: number): number {
  const bounds = resolvePlayerVisualBounds({ x: worldX, y: worldY });
  return bounds.y + SPEECH_BUBBLE_OFFSET_Y_PX;
}

export function worldPositionToTileKey(worldX: number, worldY: number): string {
  const tileSize = getActiveMapTileSize();
  const tileX = Math.floor(worldX / tileSize);
  const tileY = Math.floor(worldY / tileSize);
  return `${tileX}:${tileY}`;
}

/**
 * Índice de empilhamento por tile — evita sobreposição quando vários jogadores
 * ocupam o mesmo tile (ordem estável por id).
 */
export function resolveSpeechBubbleStackOffsets(
  anchors: readonly SpeechBubbleAnchorInput[],
): Map<string, number> {
  const byTile = new Map<string, SpeechBubbleAnchorInput[]>();

  for (const anchor of anchors) {
    const key = worldPositionToTileKey(anchor.worldX, anchor.worldY);
    const bucket = byTile.get(key) ?? [];
    bucket.push(anchor);
    byTile.set(key, bucket);
  }

  const offsets = new Map<string, number>();

  for (const group of byTile.values()) {
    const sorted = [...group].sort((a, b) => a.id.localeCompare(b.id));
    sorted.forEach((entry, index) => {
      offsets.set(entry.id, index * SPEECH_BUBBLE_STACK_STEP_PX);
    });
  }

  return offsets;
}
