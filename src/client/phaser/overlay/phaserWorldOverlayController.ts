import { DESIGN_CONFIG } from '../../../config/designConstants.js';
import { drawAuthoritativeCreatureDebugOverlay } from '../../debug/authoritativeCreatureDebugDraw.js';
import { drawCollisionDebugOverlay } from '../../debug/collisionDebugDraw.js';
import { getActiveMapTileSize } from '../../../shared/world/activeMapTileSize.js';
import type { ExplorationRenderFrame } from '../../app/bridge/explorationRenderBridge.js';
import type { MinimapSnapshot } from '../../world/minimap/minimapTypes.js';

const OVERLAY_DEPTH = 9_000;
const DEBUG_OVERLAY_DEPTH = 9_500;

type PhaserOverlayGraphics = {
  clear: () => PhaserOverlayGraphics;
  lineStyle: (lineWidth: number, color: number, alpha?: number) => PhaserOverlayGraphics;
  fillStyle: (color: number, alpha?: number) => PhaserOverlayGraphics;
  strokeCircle: (x: number, y: number, radius: number) => PhaserOverlayGraphics;
  fillCircle: (x: number, y: number, radius: number) => PhaserOverlayGraphics;
  strokeRect: (x: number, y: number, width: number, height: number) => PhaserOverlayGraphics;
  fillRect: (x: number, y: number, width: number, height: number) => PhaserOverlayGraphics;
  beginPath: () => PhaserOverlayGraphics;
  moveTo: (x: number, y: number) => PhaserOverlayGraphics;
  lineTo: (x: number, y: number) => PhaserOverlayGraphics;
  strokePath: () => PhaserOverlayGraphics;
  setDepth: (depth: number) => PhaserOverlayGraphics;
  destroy: () => void;
};

type PhaserOverlayImage = {
  setPosition: (x: number, y: number) => PhaserOverlayImage;
  setOrigin: (x: number, y: number) => PhaserOverlayImage;
  setDepth: (depth: number) => PhaserOverlayImage;
  setDisplaySize: (width: number, height: number) => PhaserOverlayImage;
  setVisible: (visible: boolean) => PhaserOverlayImage;
  destroy: () => void;
};

type PhaserOverlayScene = {
  textures: {
    exists: (key: string) => boolean;
    addImage: (key: string, source: HTMLImageElement) => unknown;
    remove: (key: string) => void;
  };
  add: {
    graphics: () => PhaserOverlayGraphics;
    image: (x: number, y: number, textureKey: string) => PhaserOverlayImage;
  };
};

const DEBUG_TEXTURE_KEY = 'altercadia-debug-overlay';
const TILE_SIZE = DESIGN_CONFIG.TILE.SIZE;

function markerColor(kind: MinimapSnapshot['markers'][number]['kind']): number {
  if (kind === 'npc') return 0x6bdcff;
  if (kind === 'monster') return 0xff6b8a;
  return 0x9ef7e8;
}

function drawNavigationDestinationMarker(
  graphics: PhaserOverlayGraphics,
  worldX: number,
  worldY: number,
): void {
  const size = getActiveMapTileSize() * 0.35;
  const half = size / 2;

  graphics.lineStyle(4, 0x5eead4, 0.35);
  graphics.strokeCircle(worldX, worldY, half + 4);

  graphics.lineStyle(2.5, 0x5eead4, 0.95);
  graphics.beginPath();
  graphics.moveTo(worldX - half, worldY - half);
  graphics.lineTo(worldX + half, worldY + half);
  graphics.moveTo(worldX + half, worldY - half);
  graphics.lineTo(worldX - half, worldY + half);
  graphics.strokePath();
}

/**
 * Marcadores de mundo, minimapa e debug (F8/F9) — camada acima do Y-sort.
 */
export class PhaserWorldOverlayController {
  private scene: PhaserOverlayScene | null = null;

  private overlayLayer: PhaserOverlayGraphics | null = null;

  private debugImage: PhaserOverlayImage | null = null;

  private debugCanvas: HTMLCanvasElement | null = null;

  private lastDebugKey = '';

  mount(scene: PhaserOverlayScene): void {
    this.scene = scene;
    this.overlayLayer = scene.add.graphics().setDepth(OVERLAY_DEPTH);
  }

  sync(
    frame: ExplorationRenderFrame,
    minimap: MinimapSnapshot | null,
    options: {
      readonly drawPlayerPlaceholder: boolean;
      readonly playerWidth: number;
      readonly playerHeight: number;
      readonly playerPivotX: number;
      readonly playerPivotY: number;
      readonly skipActorMinimapMarkers: boolean;
    },
  ): void {
    this.redrawOverlay(frame, minimap, options);
    void this.syncDebugOverlay(frame);
  }

  destroy(): void {
    this.overlayLayer?.destroy();
    this.debugImage?.destroy();
    this.overlayLayer = null;
    this.debugImage = null;
    this.debugCanvas = null;
    this.lastDebugKey = '';
    this.scene = null;
  }

  private redrawOverlay(
    frame: ExplorationRenderFrame,
    minimap: MinimapSnapshot | null,
    options: {
      readonly drawPlayerPlaceholder: boolean;
      readonly playerWidth: number;
      readonly playerHeight: number;
      readonly playerPivotX: number;
      readonly playerPivotY: number;
      readonly skipActorMinimapMarkers: boolean;
    },
  ): void {
    const layer = this.overlayLayer;
    if (!layer) return;

    layer.clear();

    if (options.drawPlayerPlaceholder) {
      const playerLeft = frame.playerX - options.playerPivotX;
      const playerTop = frame.playerY - options.playerPivotY;
      layer.fillStyle(0x9ef7e8, 1);
      layer.fillRect(playerLeft, playerTop, options.playerWidth, options.playerHeight);
      layer.lineStyle(1, 0x042824, 0.85);
      layer.strokeRect(playerLeft, playerTop, options.playerWidth, options.playerHeight);
    }

    if (frame.navigationDestination) {
      drawNavigationDestinationMarker(
        layer,
        frame.navigationDestination.worldX,
        frame.navigationDestination.worldY,
      );
    }

    if (!minimap) return;

    for (const marker of minimap.markers) {
      if (marker.kind === 'player') continue;
      if (options.skipActorMinimapMarkers && (marker.kind === 'npc' || marker.kind === 'monster')) {
        continue;
      }

      const centerX = marker.tileX * TILE_SIZE + TILE_SIZE / 2;
      const centerY = marker.tileY * TILE_SIZE + TILE_SIZE / 2;
      const color = marker.color ? Number.parseInt(marker.color.replace('#', ''), 16) : markerColor(marker.kind);
      layer.fillStyle(color, marker.kind === 'monster' ? 0.95 : 0.85);
      layer.fillCircle(centerX, centerY, marker.kind === 'monster' ? 5 : 4);
    }

    if (minimap.destination) {
      const destX = minimap.destination.tileX * TILE_SIZE + TILE_SIZE / 2;
      const destY = minimap.destination.tileY * TILE_SIZE + TILE_SIZE / 2;
      layer.lineStyle(1, 0xf7d774, 0.9);
      layer.strokeRect(
        minimap.destination.tileX * TILE_SIZE + 4,
        minimap.destination.tileY * TILE_SIZE + 4,
        TILE_SIZE - 8,
        TILE_SIZE - 8,
      );
      layer.fillStyle(0xf7d774, 0.35);
      layer.fillCircle(destX, destY, 3);
    }
  }

  private async syncDebugOverlay(frame: ExplorationRenderFrame): Promise<void> {
    const scene = this.scene;
    const snapshot = frame.debugOverlay;
    if (!scene || !snapshot) {
      this.debugImage?.setVisible(false);
      this.lastDebugKey = '';
      return;
    }

    const debugKey = [
      frame.cameraX,
      frame.cameraY,
      frame.playerX,
      frame.playerY,
      snapshot.showCollisionDebug,
      snapshot.showCreatureDebug,
      snapshot.creatureSnapshots.length,
    ].join(':');

    if (debugKey === this.lastDebugKey && scene.textures.exists(DEBUG_TEXTURE_KEY)) {
      this.debugImage?.setVisible(true);
      return;
    }

    if (typeof document === 'undefined') {
      return;
    }

    if (!this.debugCanvas) {
      this.debugCanvas = document.createElement('canvas');
    }

    const canvas = this.debugCanvas;
    const width = DESIGN_CONFIG.VIEWPORT.WIDTH;
    const height = DESIGN_CONFIG.VIEWPORT.HEIGHT;
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }

    ctx.clearRect(0, 0, width, height);
    ctx.save();
    ctx.translate(-frame.cameraX, -frame.cameraY);

    if (snapshot.showCollisionDebug) {
      drawCollisionDebugOverlay(ctx, snapshot.collision);
    }
    if (snapshot.showCreatureDebug && snapshot.creatureSnapshots.length > 0) {
      drawAuthoritativeCreatureDebugOverlay(ctx, snapshot.creatureSnapshots);
    }

    ctx.restore();

    const img = await canvasToImage(canvas);
    if (scene.textures.exists(DEBUG_TEXTURE_KEY)) {
      scene.textures.remove(DEBUG_TEXTURE_KEY);
    }
    scene.textures.addImage(DEBUG_TEXTURE_KEY, img);

    if (!this.debugImage) {
      this.debugImage = scene.add.image(frame.cameraX, frame.cameraY, DEBUG_TEXTURE_KEY);
      this.debugImage.setOrigin(0, 0);
      this.debugImage.setDepth(DEBUG_OVERLAY_DEPTH);
    } else {
      this.debugImage.setPosition(Math.floor(frame.cameraX), Math.floor(frame.cameraY));
    }

    this.debugImage.setDisplaySize(width, height);
    this.debugImage.setVisible(true);
    this.lastDebugKey = debugKey;
  }
}

function canvasToImage(canvas: HTMLCanvasElement): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = canvas.toDataURL('image/png');
  });
}
