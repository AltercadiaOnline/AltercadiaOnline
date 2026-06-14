import type { ChatGlobalPayload } from '../../../shared/world/globalChatTypes.js';
import { normalizeSpeechBubbleText } from '../../../shared/world/speechBubbleText.js';
import { SpeechBubble } from './SpeechBubble.js';
import {
  resolveSpeechBubbleAnchorTopY,
  resolveSpeechBubbleStackOffsets,
  type SpeechBubbleAnchorInput,
} from './speechBubbleLayout.js';
import { clearDomSpeechBubbles } from './speechBubbleDomLayer.js';

export type SpeechBubbleEntityRef = {
  readonly playerId: string;
  readonly characterId: number;
  readonly worldX: number;
  readonly worldY: number;
  readonly mapId: string;
};

function entityKey(playerId: string, characterId: number): string {
  return `${playerId}:${characterId}`;
}

/**
 * Um balão ativo por jogador — substitui a mensagem anterior.
 * Empilha verticalmente quando vários jogadores compartilham o mesmo tile.
 */
export class SpeechBubbleManager {
  private readonly bubbles = new Map<string, SpeechBubble>();
  private readonly entities = new Map<string, SpeechBubbleEntityRef>();

  registerEntity(ref: SpeechBubbleEntityRef): void {
    const key = entityKey(ref.playerId, ref.characterId);
    this.entities.set(key, { ...ref });
  }

  unregisterEntity(playerId: string, characterId: number): void {
    const key = entityKey(playerId, characterId);
    this.entities.delete(key);
    this.bubbles.delete(key);
  }

  updateLocalEntity(ref: Omit<SpeechBubbleEntityRef, 'playerId' | 'characterId'> & {
    readonly playerId: string;
    readonly characterId: number;
  }): void {
    this.registerEntity(ref);
    this.syncBubblePositionsFromEntities();
  }

  applyChatGlobal(payload: ChatGlobalPayload, currentMapId: string): void {
    if (payload.mapId !== currentMapId) return;

    const key = entityKey(payload.playerId, payload.characterId);
    this.registerEntity({
      playerId: payload.playerId,
      characterId: payload.characterId,
      worldX: payload.x,
      worldY: payload.y,
      mapId: payload.mapId,
    });

    this.setMessageForKey(key, payload.text, payload.x, payload.y, payload.sentAt);
  }

  setMessageForKey(
    key: string,
    text: string,
    worldX: number,
    worldY: number,
    createdAt = Date.now(),
  ): void {
    const trimmed = normalizeSpeechBubbleText(text);
    if (!trimmed) return;

    const anchorTopY = resolveSpeechBubbleAnchorTopY(worldX, worldY);
    this.bubbles.set(
      key,
      new SpeechBubble({
        text: trimmed,
        worldX,
        worldY,
        anchorTopY,
        createdAt,
      }),
    );
    this.recomputeStackOffsets();
  }

  purgeExpired(now = Date.now()): void {
    for (const [key, bubble] of this.bubbles) {
      if (bubble.isExpired(now)) {
        this.bubbles.delete(key);
      }
    }
  }

  getActiveBubbles(now = Date.now()): readonly SpeechBubble[] {
    return this.getActiveBubbleEntries(now).map((entry) => entry.bubble);
  }

  getActiveBubbleEntries(now = Date.now()): ReadonlyArray<{ readonly id: string; readonly bubble: SpeechBubble }> {
    this.syncBubblePositionsFromEntities();
    this.purgeExpired(now);
    return [...this.bubbles.entries()].map(([id, bubble]) => ({ id, bubble }));
  }

  clear(): void {
    this.bubbles.clear();
    this.entities.clear();
  }

  /** Mantém balões ancorados na posição atual de cada entidade (ex.: jogador andando). */
  private syncBubblePositionsFromEntities(): void {
    let moved = false;

    for (const [key, bubble] of this.bubbles) {
      const entity = this.entities.get(key);
      if (!entity) continue;

      const anchorTopY = resolveSpeechBubbleAnchorTopY(entity.worldX, entity.worldY);
      if (
        bubble.worldX === entity.worldX
        && bubble.worldY === entity.worldY
        && bubble.anchorTopY === anchorTopY
      ) {
        continue;
      }

      moved = true;
      this.bubbles.set(
        key,
        new SpeechBubble({
          text: bubble.text,
          worldX: entity.worldX,
          worldY: entity.worldY,
          anchorTopY,
          stackOffsetY: bubble.stackOffsetY,
          lifetimeMs: bubble.lifetimeMs,
          fadeMs: bubble.fadeMs,
          createdAt: bubble.createdAt,
        }),
      );
    }

    if (moved) {
      this.recomputeStackOffsets();
    }
  }

  private recomputeStackOffsets(): void {
    const anchors: SpeechBubbleAnchorInput[] = [];

    for (const [key, bubble] of this.bubbles) {
      const entity = this.entities.get(key);
      anchors.push({
        id: key,
        worldX: entity?.worldX ?? bubble.worldX,
        worldY: entity?.worldY ?? bubble.worldY,
      });
    }

    const stackOffsets = resolveSpeechBubbleStackOffsets(anchors);

    for (const [key, bubble] of this.bubbles) {
      const offset = stackOffsets.get(key) ?? 0;
      this.bubbles.set(
        key,
        new SpeechBubble({
          text: bubble.text,
          worldX: bubble.worldX,
          worldY: bubble.worldY,
          anchorTopY: bubble.anchorTopY,
          stackOffsetY: offset,
          lifetimeMs: bubble.lifetimeMs,
          fadeMs: bubble.fadeMs,
          createdAt: bubble.createdAt,
        }),
      );
    }
  }
}

let activeManager: SpeechBubbleManager | null = null;

export function getSpeechBubbleManager(): SpeechBubbleManager {
  if (!activeManager) {
    activeManager = new SpeechBubbleManager();
  }
  return activeManager;
}

export function resetSpeechBubbleManager(): void {
  activeManager?.clear();
  activeManager = null;
  clearDomSpeechBubbles();
}
