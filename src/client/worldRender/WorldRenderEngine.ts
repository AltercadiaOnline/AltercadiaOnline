import type { MapId } from '../../shared/world/mapRegistry.js';
import type { PlayerFacing } from '../../shared/world/playerFacing.js';
import type { ExplorationRenderFrame } from '../app/bridge/explorationRenderBridge.js';
import type { MinimapSnapshot } from '../world/minimap/minimapTypes.js';

export type WorldRenderEngineId = 'construct';

export type WorldRenderMode = 'exploration' | 'battle';

export type WorldRenderLoadMapOptions = {
  readonly spawn?: {
    readonly x: number;
    readonly y: number;
    readonly facing?: PlayerFacing;
  };
};

/**
 * Contrato único de renderização de cena.
 * Construct 3: tilemap, player, NPCs, criaturas — exploração apenas.
 * Batalha é renderizada fora deste motor (canvas DOM); HUD React à parte.
 */
export type WorldRenderEngine = {
  readonly id: WorldRenderEngineId;

  boot(host: HTMLElement): Promise<void>;
  shutdown(): void;

  loadMap(mapId: MapId, options?: WorldRenderLoadMapOptions): Promise<void>;

  applyFrame(frame: ExplorationRenderFrame): void;
  applyMinimap?(snapshot: MinimapSnapshot): void;

  setMode(mode: WorldRenderMode): void;
  getInputSurface(): HTMLElement | null;
};
