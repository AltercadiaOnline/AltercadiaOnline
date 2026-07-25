import type { MapId } from '../../../shared/world/mapRegistry.js';
import type { PlayerFacing } from '../../../shared/world/playerFacing.js';
import type { ExplorationRenderFrame } from '../../app/bridge/explorationRenderBridge.js';
import type { WorldRenderMode } from '../WorldRenderEngine.js';

/**
 * DTOs enxutos para o Construct — espelho visual.
 * Autoridade (spawn real, movimento, combate) permanece neste repo.
 */

export type ConstructPlayerMirror = {
  readonly x: number;
  readonly y: number;
  readonly facing: PlayerFacing;
  readonly frameIndex: number;
  readonly animState: string;
  readonly direction: string;
};

export type ConstructNpcMirror = {
  readonly npcId: string;
  readonly x: number;
  readonly y: number;
  readonly depthY: number;
  readonly bobOffset: number;
  readonly drawWidth: number;
  readonly drawHeight: number;
};

export type ConstructCreatureMirror = {
  readonly instanceId: string;
  readonly creatureId: string;
  readonly x: number;
  readonly y: number;
  readonly depthY: number;
  readonly adjacent: boolean;
  readonly alertPulse: number;
};

export type ConstructExplorationMirror = {
  readonly mapId: MapId;
  readonly cameraX: number;
  readonly cameraY: number;
  readonly timestampMs: number;
  readonly player: ConstructPlayerMirror;
  readonly npcs: readonly ConstructNpcMirror[];
  readonly creatures: readonly ConstructCreatureMirror[];
  readonly pet: ExplorationRenderFrame['pet'];
};

/** Mensagens Altercadia → Construct (postMessage / Scripting). */
export type ConstructInboundMessage =
  | { readonly type: 'altercadia:hello'; readonly build?: string }
  | {
      readonly type: 'altercadia:load-map';
      readonly mapId: MapId;
      readonly layoutId?: string;
      readonly spawn?: { x: number; y: number; facing?: PlayerFacing };
    }
  | { readonly type: 'altercadia:exploration-frame'; readonly mirror: ConstructExplorationMirror }
  /** @deprecated Prefer altercadia:exploration-frame */
  | { readonly type: 'altercadia:frame'; readonly frame: ExplorationRenderFrame }
  | { readonly type: 'altercadia:set-mode'; readonly mode: WorldRenderMode };

/** Mensagens Construct → Altercadia. */
export type ConstructOutboundMessage =
  | {
      readonly type: 'construct:ready';
      /** Sempre `webgl` na política Altercadia; WebGPU dispara `construct:error`. */
      readonly renderer?: 'webgl' | 'webgpu';
      readonly viewport?: { readonly width: number; readonly height: number };
      readonly devicePixelRatio?: number;
    }
  | { readonly type: 'construct:layout-ready'; readonly mapId: MapId }
  | { readonly type: 'construct:input-move'; readonly dx: number; readonly dy: number }
  | { readonly type: 'construct:input-click'; readonly worldX: number; readonly worldY: number }
  | { readonly type: 'construct:error'; readonly message: string };

export const CONSTRUCT_EXPORT_BASE_URL = '/construct-world/';
export const CONSTRUCT_EXPORT_INDEX = `${CONSTRUCT_EXPORT_BASE_URL}index.html`;

export function isConstructOutboundMessage(value: unknown): value is ConstructOutboundMessage {
  if (!value || typeof value !== 'object') return false;
  const type = (value as { type?: unknown }).type;
  return typeof type === 'string' && type.startsWith('construct:');
}

export function toConstructExplorationMirror(
  frame: ExplorationRenderFrame,
): ConstructExplorationMirror {
  const npcs: ConstructNpcMirror[] = [];
  const creatures: ConstructCreatureMirror[] = [];

  for (const actor of frame.worldActors) {
    if (actor.kind === 'npc') {
      npcs.push({
        npcId: actor.npcId,
        x: actor.feetX,
        y: actor.feetY,
        depthY: actor.depthY,
        bobOffset: actor.bobOffset,
        drawWidth: actor.drawWidth,
        drawHeight: actor.drawHeight,
      });
      continue;
    }
    creatures.push({
      instanceId: actor.instanceId,
      creatureId: actor.creatureId,
      x: actor.feetX,
      y: actor.feetY,
      depthY: actor.depthY,
      adjacent: actor.adjacent,
      alertPulse: actor.alertPulse,
    });
  }

  return {
    mapId: frame.mapId,
    cameraX: frame.cameraX,
    cameraY: frame.cameraY,
    timestampMs: frame.timestampMs,
    player: {
      x: frame.playerX,
      y: frame.playerY,
      facing: frame.facing,
      frameIndex: frame.playerSprite.frameIndex,
      animState: frame.playerSprite.state,
      direction: frame.playerSprite.direction,
    },
    npcs,
    creatures,
    pet: frame.pet,
  };
}

