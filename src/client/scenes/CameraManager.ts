import { DESIGN_CONFIG } from '../../config/designConstants.js';
import type { SceneConfig } from '../../config/sceneConfig.js';
import type { WorldPoint } from '../../shared/world/playerEntity.js';
import { Camera } from './Camera.js';
import { computeCameraLerpFactor } from './cameraFollow.js';
import {
  clampCameraToPlayerFollowTiles,
  computeMapTotalPixels,
  type MapTotalPixels,
} from './cameraMapClamp.js';

/** Única fonte de viewport para clamp — nunca window, canvas CSS ou ResizeObserver. */
export const CAMERA_OFFICIAL_VIEWPORT_WIDTH = DESIGN_CONFIG.VIEWPORT.WIDTH;
export const CAMERA_OFFICIAL_VIEWPORT_HEIGHT = DESIGN_CONFIG.VIEWPORT.HEIGHT;

export type CameraManagerOptions = {
  readonly camera: Camera;
  readonly scene?: SceneConfig | null;
};

/** @deprecated Use clampCameraToPlayerFollow — mantido para testes legados. */
export function clampCameraToDesignViewport(
  playerX: number,
  playerY: number,
  limits: MapTotalPixels = computeMapTotalPixels(
    DESIGN_CONFIG.MAP.MAX_TILES_WIDTH,
    DESIGN_CONFIG.MAP.MAX_TILES_HEIGHT,
  ),
): WorldPoint {
  return clampCameraToPlayerFollowTiles(
    playerX,
    playerY,
    DESIGN_CONFIG.MAP.MAX_TILES_WIDTH,
    DESIGN_CONFIG.MAP.MAX_TILES_HEIGHT,
  );
}

/**
 * Câmera de exploração — segue o jogador e trava nos limites do mapa.
 * Clamp e recorte usam exclusivamente DESIGN_CONFIG.VIEWPORT (640×360).
 */
export class CameraManager {
  private readonly camera: Camera;
  private scene: SceneConfig | null;

  constructor(options: CameraManagerOptions) {
    this.camera = options.camera;
    this.scene = options.scene ?? null;
    this.applySceneBounds();
  }

  getCamera(): Camera {
    return this.camera;
  }

  applyScene(scene: SceneConfig | null): void {
    this.scene = scene;
    this.applySceneBounds();
  }

  updateCamera(playerPos: WorldPoint, deltaMs = 16.67): void {
    this.syncOfficialViewport();

    const target = this.clampForPlayer(playerPos);
    const t = computeCameraLerpFactor(deltaMs);
    let nextX = this.camera.x + (target.x - this.camera.x) * t;
    let nextY = this.camera.y + (target.y - this.camera.y) * t;

    if (Math.abs(nextX - target.x) < 0.5) nextX = target.x;
    if (Math.abs(nextY - target.y) < 0.5) nextY = target.y;

    this.camera.applyViewportPosition(nextX, nextY);
  }

  snapToPlayer(playerPos: WorldPoint): void {
    this.syncOfficialViewport();
    const position = this.clampForPlayer(playerPos);
    this.camera.applyViewportPosition(position.x, position.y);
  }

  private clampForPlayer(playerPos: WorldPoint): WorldPoint {
    const map = this.resolveMapTotalSize();
    if (this.scene) {
      return clampCameraToPlayerFollowTiles(
        playerPos.x,
        playerPos.y,
        this.scene.tilesWide,
        this.scene.tilesHigh,
      );
    }

    const tileSize = DESIGN_CONFIG.TILE.SIZE;
    return clampCameraToPlayerFollowTiles(
      playerPos.x,
      playerPos.y,
      Math.round(map.width / tileSize),
      Math.round(map.height / tileSize),
    );
  }

  private resolveMapTotalSize(): MapTotalPixels {
    if (this.scene) {
      return computeMapTotalPixels(this.scene.tilesWide, this.scene.tilesHigh, this.scene.tileSize);
    }

    return {
      width: this.camera.mapWidth,
      height: this.camera.mapHeight,
    };
  }

  /** Garante recorte 16×9 tiles (640×360) — sempre reaplica visibleWorldWidth/Height. */
  private syncOfficialViewport(): void {
    this.camera.setViewport(CAMERA_OFFICIAL_VIEWPORT_WIDTH, CAMERA_OFFICIAL_VIEWPORT_HEIGHT);
  }

  private applySceneBounds(): void {
    this.syncOfficialViewport();
    if (!this.scene) return;
    this.camera.setMapDimensions(this.scene.mapPixelWidth, this.scene.mapPixelHeight);
  }
}
