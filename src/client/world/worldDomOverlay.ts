import type { Camera } from '../scenes/Camera.js';
import {
  clearDomNametags,
  invalidateDomNametagLayoutCache,
  syncDomNametags,
  type DomLabelPlacement,
  type DomNametagEntry,
} from './domNametagLayer.js';
import {
  syncDomSpeechBubbles,
  type SpeechBubbleDomEntry,
} from './speech/speechBubbleDomLayer.js';

export type { DomNametagEntry, DomNametagEntry as WorldDomTextEntry, DomLabelPlacement };
export {
  clearDomNametags,
  invalidateDomNametagLayoutCache,
  syncDomNametags,
  formatNpcDomNametag,
} from './domNametagLayer.js';

/**
 * Auditoria — texto no mundo de exploração.
 *
 * Regra: buffer fixo 640×360 + `#game-stage-scale` (CSS transform).
 * `fillText` no canvas fica embassado — todo texto legível vai para DOM
 * irmão do scale host, mapeado via `mapBufferPointToFramePx`.
 *
 * | Categoria              | Camada DOM              | Produtor                              |
 * |------------------------|-------------------------|---------------------------------------|
 * | Nametags NPC/jogador   | #npc-names-layer        | NPCManager.buildDomNametagEntries     |
 * | Pet, prompt [E]        | #npc-names-layer        | NPCManager.buildDomNametagEntries     |
 * | Decals MKT/BET/★       | #npc-names-layer        | npcSpriteDecalAnchors                 |
 * | Labels de estrutura    | #npc-names-layer        | WorldMapRenderer.collectDomLabelEntries |
 * | Decals RANK/TOP        | #npc-names-layer        | WorldMapRenderer.collectDomLabelEntries |
 * | Portais / landmarks    | #npc-names-layer        | WorldMapRenderer.collectDomLabelEntries |
 * | Balões de fala         | #speech-bubbles-layer   | SpeechBubbleManager                   |
 *
 * Canvas `fillText` permitido apenas em:
 * - Debug (`showDebugLayout` via overlays autoritativos)
 * - Overlays de desenvolvimento (`authoritativeCreatureDebugDraw`)
 * - Minigames com canvas próprio (`refractionBooth/HitEffect`)
 * - Testes unitários
 */
export const WORLD_DOM_TEXT_AUDIT = {
  migrated: [
    'npc-nametags',
    'player-nametag',
    'pet-nametag',
    'interact-prompt',
    'structure-labels',
    'ranking-monitor-decals',
    'sprite-decals-mkt-bet-star',
    'speech-bubbles',
  ],
  canvasAllowed: [
    'debug-layout',
    'authoritative-creature-debug',
    'refraction-minigame-fx',
  ],
} as const;

export type WorldDomOverlaySyncInput = {
  readonly textEntries: readonly DomNametagEntry[];
  readonly speechBubbles: readonly SpeechBubbleDomEntry[];
  readonly camera: Camera;
  readonly timestampMs: number;
};

/** Ponto único de sincronização — chamado uma vez por frame após o draw do canvas. */
export function syncWorldDomOverlay(
  input: WorldDomOverlaySyncInput,
  root: ParentNode = document,
): void {
  syncDomNametags(input.textEntries, input.camera, root);
  syncDomSpeechBubbles(input.speechBubbles, input.camera, input.timestampMs, root);
}
