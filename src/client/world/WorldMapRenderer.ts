import { DESIGN_CONFIG } from '../../config/designConstants.js';
import { mapPointerToRenderBuffer } from '../layout/gameLayout.js';
import { getEntityVisualBounds } from '../../config/playerDesignAnchoring.js';
import { DESIGN_SPRITE_DIMENSIONS } from '../../config/spriteDimensions.js';
import type { Camera } from '../scenes/Camera.js';
import { screenToTile as pickScreenTile, screenToWorldPixel } from './screenCoords.js';
import { buildMapVisualLayout, type MapVisualLayout } from './mapVisualLayouts.js';
import type { MapId } from '../../shared/world/mapRegistry.js';
import { tileToWorldPixel, type VisualLandmark } from './city01VisualLayout.js';
import { PlaceholderType, resolveRankingMonitorDecalAnchors } from './placeholderRenderer.js';
import { sceneTileToWorld } from './city01PlaceholderLayout.js';
import type { DomNametagEntry } from './worldDomOverlay.js';
import type { Disposable } from '../utils/Disposable.js';
import { entityAtTile } from './city01PlaceholderLayout.js';

export type WorldMapClickOptions = {
  readonly doubleClick?: boolean;
};

export type WorldMapRendererOptions = {
  readonly inputSurface: HTMLElement;
  readonly camera: Camera;
  readonly onWorldClick?: (screenX: number, screenY: number, options?: WorldMapClickOptions) => void;
};

const CLICK_DRAG_THRESHOLD_PX = 5;
const DOUBLE_CLICK_WINDOW_MS = 320;
const DOUBLE_CLICK_DISTANCE_PX = 8;

export type WorldMapHoverState = {
  readonly tileX: number;
  readonly tileY: number;
  readonly landmark: VisualLandmark | null;
};

/**
 * Input + overlays DOM do mundo — render visual exclusivo do Phaser (Tiled).
 * Colisão/rede permanecem no mapa autoritativo (MapManager / servidor).
 */
export class WorldMapRenderer implements Disposable {
  private readonly inputSurface: HTMLElement;
  private readonly camera: Camera;
  private readonly onWorldClick: ((screenX: number, screenY: number, options?: WorldMapClickOptions) => void) | undefined;
  private layout: MapVisualLayout;

  private pointerDown = false;
  private pointerDragged = false;
  private pointerDownX = 0;
  private pointerDownY = 0;
  private lastClickAtMs = 0;
  private lastClickX = 0;
  private lastClickY = 0;
  private hover: WorldMapHoverState | null = null;
  private bound = false;

  constructor(options: WorldMapRendererOptions) {
    this.inputSurface = options.inputSurface;
    this.camera = options.camera;
    this.onWorldClick = options.onWorldClick;
    this.layout = buildMapVisualLayout('city_01');
    this.bindInput();
  }

  public getLayout(): MapVisualLayout {
    return this.layout;
  }

  public setMapId(mapId: string, cachedLayout?: MapVisualLayout): void {
    this.layout = cachedLayout ?? buildMapVisualLayout(mapId as MapId);
    this.hover = null;
  }

  public getBackgroundColor(): string {
    return this.layout.background;
  }

  public getHoverState(): WorldMapHoverState | null {
    return this.hover;
  }

  public screenToTile(screenX: number, screenY: number): { tileX: number; tileY: number } | null {
    const viewport = this.clampToViewport(screenX, screenY);
    const pick = pickScreenTile(
      this.camera,
      viewport.x,
      viewport.y,
      this.layout.mapTilesWide,
      this.layout.mapTilesHigh,
    );
    return pick ? { tileX: pick.tileX, tileY: pick.tileY } : null;
  }

  private clampToViewport(screenX: number, screenY: number): { x: number; y: number } {
    const w = DESIGN_CONFIG.VIEWPORT.WIDTH;
    const h = DESIGN_CONFIG.VIEWPORT.HEIGHT;
    return {
      x: Math.max(0, Math.min(screenX, w)),
      y: Math.max(0, Math.min(screenY, h)),
    };
  }

  public resolvePlayerDrawBounds(worldX: number, worldY: number): ReturnType<typeof getEntityVisualBounds> {
    return getEntityVisualBounds(
      { x: worldX, y: worldY },
      this.layout.tileSize,
      DESIGN_SPRITE_DIMENSIONS,
    );
  }

  /** Labels de estruturas e portais em DOM — texto nítido acima do Phaser. */
  public collectDomLabelEntries(): DomNametagEntry[] {
    const tileSize = this.layout.tileSize;
    const entries: DomNametagEntry[] = [];

    if (this.layout.placeholderScene) {
      const labelTypes = new Set<string>([
        PlaceholderType.BUILDING,
        PlaceholderType.INTERACTIVE_OBJ,
        PlaceholderType.ARENA,
        PlaceholderType.TOWER_BUILDING,
        PlaceholderType.RANKING_MONITOR,
        PlaceholderType.REFRACTION_BOOTH,
      ]);

      for (const entity of this.layout.placeholderScene.entities) {
        if (!entity.label || !labelTypes.has(entity.type)) continue;
        const { x, y } = sceneTileToWorld(entity.tileX, entity.tileY, tileSize);
        const widthPx = entity.tileW * tileSize;
        const heightPx = entity.tileH * tileSize;
        entries.push({
          id: `structure-${entity.assetKey}`,
          label: entity.label,
          anchor: {
            worldX: x + widthPx / 2,
            anchorTopY: y + heightPx / 2,
          },
          className: 'structure-label-tag',
          placement: 'center',
        });

        if (entity.type === PlaceholderType.RANKING_MONITOR) {
          const decals = resolveRankingMonitorDecalAnchors(x, y, widthPx, heightPx);
          entries.push(
            {
              id: `structure-decal-${entity.assetKey}-rank`,
              label: 'RANK',
              anchor: {
                worldX: decals.rank.worldX,
                anchorTopY: decals.rank.anchorTopY,
              },
              className: 'structure-decal-tag',
              placement: 'center',
            },
            {
              id: `structure-decal-${entity.assetKey}-top`,
              label: 'TOP',
              anchor: {
                worldX: decals.top.worldX,
                anchorTopY: decals.top.anchorTopY,
              },
              className: 'structure-decal-tag structure-decal-tag--muted',
              placement: 'center',
            },
          );
        }
      }
    }

    for (const landmark of this.uniquePortalLandmarks()) {
      const { x: wx, y: wy } = tileToWorldPixel(landmark.tileX, landmark.tileY, tileSize);
      entries.push({
        id: `landmark-${landmark.id}`,
        label: landmark.label,
        anchor: {
          worldX: wx + tileSize / 2,
          anchorTopY: wy,
        },
        className: 'portal-label-tag',
      });
    }

    if (this.hover?.landmark && this.hover.landmark.kind !== 'portal') {
      const landmark = this.hover.landmark;
      const { x: wx, y: wy } = tileToWorldPixel(landmark.tileX, landmark.tileY, tileSize);
      entries.push({
        id: `landmark-hover-${landmark.id}`,
        label: landmark.label,
        anchor: {
          worldX: wx + tileSize / 2,
          anchorTopY: wy,
        },
        className: 'landmark-hover-label-tag',
      });
    }

    return entries;
  }

  private uniquePortalLandmarks(): VisualLandmark[] {
    const seen = new Set<string>();
    const result: VisualLandmark[] = [];
    for (const landmark of this.layout.landmarks) {
      if (landmark.kind !== 'portal' || seen.has(landmark.id)) continue;
      seen.add(landmark.id);
      result.push(landmark);
    }
    return result;
  }

  private bindInput(): void {
    if (this.bound) return;
    this.bound = true;

    this.inputSurface.addEventListener('mousedown', this.onPointerDown);
    this.inputSurface.addEventListener('mousemove', this.onPointerMove);
    window.addEventListener('mouseup', this.onPointerUp);
    this.inputSurface.addEventListener('mouseleave', this.onPointerLeave);
  }

  public dispose(): void {
    if (!this.bound) return;
    this.bound = false;
    this.inputSurface.removeEventListener('mousedown', this.onPointerDown);
    this.inputSurface.removeEventListener('mousemove', this.onPointerMove);
    window.removeEventListener('mouseup', this.onPointerUp);
    this.inputSurface.removeEventListener('mouseleave', this.onPointerLeave);
  }

  private readonly onPointerDown = (event: MouseEvent): void => {
    if (event.button !== 0) return;
    this.pointerDown = true;
    this.pointerDragged = false;
    this.pointerDownX = event.clientX;
    this.pointerDownY = event.clientY;
  };

  private readonly onPointerMove = (event: MouseEvent): void => {
    if (this.pointerDown) {
      const totalDx = event.clientX - this.pointerDownX;
      const totalDy = event.clientY - this.pointerDownY;
      if (!this.pointerDragged && Math.hypot(totalDx, totalDy) >= CLICK_DRAG_THRESHOLD_PX) {
        this.pointerDragged = true;
      }
      return;
    }

    const buffer = mapPointerToRenderBuffer(this.inputSurface, event.clientX, event.clientY);
    this.hover = this.pickHover(buffer.x, buffer.y);
  };

  private readonly onPointerUp = (event: MouseEvent): void => {
    if (event.button !== 0) return;

    if (this.pointerDown && !this.pointerDragged) {
      const now = performance.now();
      const buffer = mapPointerToRenderBuffer(this.inputSurface, event.clientX, event.clientY);
      const isDoubleClick =
        now - this.lastClickAtMs <= DOUBLE_CLICK_WINDOW_MS
        && Math.hypot(buffer.x - this.lastClickX, buffer.y - this.lastClickY)
          <= DOUBLE_CLICK_DISTANCE_PX;
      const viewport = this.clampToViewport(buffer.x, buffer.y);
      this.onWorldClick?.(viewport.x, viewport.y, { doubleClick: isDoubleClick });
      this.lastClickAtMs = now;
      this.lastClickX = viewport.x;
      this.lastClickY = viewport.y;
    }

    this.pointerDown = false;
    this.pointerDragged = false;
  };

  private readonly onPointerLeave = (): void => {
    this.pointerDown = false;
    this.pointerDragged = false;
    this.hover = null;
  };

  private pickHover(screenX: number, screenY: number): WorldMapHoverState | null {
    const viewport = this.clampToViewport(screenX, screenY);
    const { worldX, worldY } = screenToWorldPixel(this.camera, viewport.x, viewport.y);
    const tileSize = this.layout.tileSize;
    const tileX = Math.floor(worldX / tileSize);
    const tileY = Math.floor(worldY / tileSize);

    if (
      tileX < 0 ||
      tileY < 0 ||
      tileX >= this.layout.mapTilesWide ||
      tileY >= this.layout.mapTilesHigh
    ) {
      return null;
    }

    if (this.layout.placeholderScene) {
      const entity = entityAtTile(this.layout.placeholderScene, tileX, tileY);
      if (!entity) return null;
      return {
        tileX,
        tileY,
        landmark: {
          id: entity.assetKey,
          label: entity.label,
          kind: 'structure',
          tileX: entity.tileX + Math.floor(entity.tileW / 2),
          tileY: entity.tileY + Math.floor(entity.tileH / 2),
        },
      };
    }

    const cell = this.layout.tiles[tileY]?.[tileX];
    if (!cell?.landmarkId) return null;

    const landmark = this.layout.landmarks.find((entry) => entry.id === cell.landmarkId) ?? null;
    return { tileX, tileY, landmark };
  }
}

export { CITY01_VISUAL_PALETTE } from './city01VisualLayout.js';
export type { VisualLandmark } from './city01VisualLayout.js';
