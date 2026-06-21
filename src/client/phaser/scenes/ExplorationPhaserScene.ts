import { DESIGN_CONFIG, DESIGN_MAP_PIXEL_HEIGHT, DESIGN_MAP_PIXEL_WIDTH } from '../../../config/designConstants.js';
import { PHASER_EXPLORATION_SCENE_KEY } from '../PhaserConfig.js';
import { buildMinimapTerrain } from '../../world/minimap/buildMinimapTerrain.js';
import type { MinimapSnapshot } from '../../world/minimap/minimapTypes.js';
import type { ExplorationRenderFrame } from '../../app/bridge/explorationRenderBridge.js';
import { bindExplorationPhaserSync } from '../explorationPhaserSync.js';
import type { MapId } from '../../../shared/world/mapRegistry.js';

type PhaserGraphics = {
  clear: () => PhaserGraphics;
  fillStyle: (color: number, alpha?: number) => PhaserGraphics;
  fillRect: (x: number, y: number, width: number, height: number) => PhaserGraphics;
  fillCircle: (x: number, y: number, radius: number) => PhaserGraphics;
  lineStyle: (lineWidth: number, color: number, alpha?: number) => PhaserGraphics;
  strokeRect: (x: number, y: number, width: number, height: number) => PhaserGraphics;
  setDepth: (depth: number) => PhaserGraphics;
  destroy: () => void;
};

type PhaserText = {
  setText: (value: string) => PhaserText;
  setDepth: (depth: number) => PhaserText;
  destroy: () => void;
};

type PhaserCamera = {
  setBounds: (x: number, y: number, width: number, height: number) => void;
  setScroll: (x: number, y: number) => void;
};

type PhaserSceneBase = {
  add: {
    graphics: () => PhaserGraphics;
    text: (
      x: number,
      y: number,
      text: string,
      style?: Record<string, unknown>,
    ) => PhaserText & { setOrigin: (originX: number, originY: number) => PhaserText };
  };
  cameras: {
    main: PhaserCamera;
  };
  events: {
    on: (event: string, callback: () => void) => void;
  };
};

type PhaserNamespace = {
  Scene: new (config?: string | Record<string, unknown>) => PhaserSceneBase;
};

const TILE_SIZE = DESIGN_CONFIG.TILE.SIZE;
const PLAYER_WIDTH = DESIGN_CONFIG.PLAYER.WIDTH;
const PLAYER_HEIGHT = DESIGN_CONFIG.PLAYER.HEIGHT;
const PLAYER_PIVOT_X = DESIGN_CONFIG.PLAYER.PIVOT_X;
const PLAYER_PIVOT_Y = DESIGN_CONFIG.PLAYER.PIVOT_Y;

function hexToNumber(hex: string): number {
  const normalized = hex.startsWith('#') ? hex.slice(1) : hex;
  return Number.parseInt(normalized, 16);
}

function markerColor(kind: MinimapSnapshot['markers'][number]['kind']): number {
  if (kind === 'npc') return 0x6bdcff;
  if (kind === 'monster') return 0xff6b8a;
  return 0x9ef7e8;
}

/**
 * Cena Phaser híbrida — espelha posição/câmera/minimapa do loop legado.
 * Substitui gradualmente o GameRenderer canvas.
 */
export function createExplorationPhaserScene(Phaser: PhaserNamespace): new () => PhaserSceneBase {
  const { Scene } = Phaser;

  return class ExplorationPhaserScene extends Scene {
    private terrainLayer: PhaserGraphics | null = null;

    private overlayLayer: PhaserGraphics | null = null;

    private hudLabel: PhaserText | null = null;

    private terrainMapId: MapId | null = null;

    private lastFrame: ExplorationRenderFrame | null = null;

    private lastMinimap: MinimapSnapshot | null = null;

    private teardownSync: (() => void) | null = null;

    constructor() {
      super(PHASER_EXPLORATION_SCENE_KEY);
    }

    create(): void {
      this.cameras.main.setBounds(0, 0, DESIGN_MAP_PIXEL_WIDTH, DESIGN_MAP_PIXEL_HEIGHT);

      this.terrainLayer = this.add.graphics().setDepth(0);
      this.overlayLayer = this.add.graphics().setDepth(10);
      this.hudLabel = this.add
        .text(8, 8, 'Phaser · aguardando mundo…', {
          fontFamily: 'monospace',
          fontSize: '10px',
          color: '#7aa89f',
        })
        .setOrigin(0, 0)
        .setDepth(100);

      this.teardownSync = bindExplorationPhaserSync({
        onFrame: (frame) => this.applyExplorationFrame(frame),
        onMinimap: (snapshot) => this.applyMinimapOverlay(snapshot),
      });

      this.events.on('shutdown', () => {
        this.teardownSync?.();
        this.teardownSync = null;
      });
    }

    private ensureTerrain(mapId: MapId): void {
      if (!this.terrainLayer || this.terrainMapId === mapId) return;

      const terrain = buildMinimapTerrain(mapId);
      this.terrainLayer.clear();

      for (let tileY = 0; tileY < terrain.tilesHigh; tileY += 1) {
        const row = terrain.colors[tileY];
        if (!row) continue;
        for (let tileX = 0; tileX < terrain.tilesWide; tileX += 1) {
          const color = row[tileX];
          if (!color) continue;
          this.terrainLayer.fillStyle(hexToNumber(color), 1);
          this.terrainLayer.fillRect(tileX * TILE_SIZE, tileY * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        }
      }

      this.terrainMapId = mapId;
    }

    private applyExplorationFrame(frame: ExplorationRenderFrame): void {
      this.lastFrame = frame;
      this.ensureTerrain(frame.mapId);
      this.cameras.main.setScroll(frame.cameraX, frame.cameraY);
      this.redrawOverlay();

      this.hudLabel?.setText(
        `Phaser · ${frame.mapId} · (${Math.round(frame.playerX)}, ${Math.round(frame.playerY)})`,
      );
    }

    private applyMinimapOverlay(snapshot: MinimapSnapshot): void {
      this.lastMinimap = snapshot;
      this.redrawOverlay();
    }

    private redrawOverlay(): void {
      if (!this.overlayLayer) return;

      this.overlayLayer.clear();

      const frame = this.lastFrame;
      if (frame) {
        const playerLeft = frame.playerX - PLAYER_PIVOT_X;
        const playerTop = frame.playerY - PLAYER_PIVOT_Y;
        this.overlayLayer.fillStyle(0x9ef7e8, 1);
        this.overlayLayer.fillRect(playerLeft, playerTop, PLAYER_WIDTH, PLAYER_HEIGHT);
        this.overlayLayer.lineStyle(1, 0x042824, 0.85);
        this.overlayLayer.strokeRect(playerLeft, playerTop, PLAYER_WIDTH, PLAYER_HEIGHT);
      }

      const snapshot = this.lastMinimap;
      if (!snapshot) return;

      for (const marker of snapshot.markers) {
        if (marker.kind === 'player') continue;
        const centerX = marker.tileX * TILE_SIZE + TILE_SIZE / 2;
        const centerY = marker.tileY * TILE_SIZE + TILE_SIZE / 2;
        const color = marker.color ? hexToNumber(marker.color) : markerColor(marker.kind);
        this.overlayLayer.fillStyle(color, marker.kind === 'monster' ? 0.95 : 0.85);
        this.overlayLayer.fillCircle(centerX, centerY, marker.kind === 'monster' ? 5 : 4);
      }

      if (snapshot.destination) {
        const destX = snapshot.destination.tileX * TILE_SIZE + TILE_SIZE / 2;
        const destY = snapshot.destination.tileY * TILE_SIZE + TILE_SIZE / 2;
        this.overlayLayer.lineStyle(1, 0xf7d774, 0.9);
        this.overlayLayer.strokeRect(
          snapshot.destination.tileX * TILE_SIZE + 4,
          snapshot.destination.tileY * TILE_SIZE + 4,
          TILE_SIZE - 8,
          TILE_SIZE - 8,
        );
        this.overlayLayer.fillStyle(0xf7d774, 0.35);
        this.overlayLayer.fillCircle(destX, destY, 3);
      }
    }
  };
}
