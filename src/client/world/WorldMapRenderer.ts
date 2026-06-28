import { DESIGN_CONFIG } from '../../config/designConstants.js';
import { mapPointerToRenderBuffer } from '../layout/gameLayout.js';
import { disableCanvasImageSmoothing } from '../layout/gamePixelScale.js';
import { drawSubdividedGroundCell } from './subTileGroundDraw.js';
import { getEntityVisualBounds } from '../../config/playerDesignAnchoring.js';
import { DESIGN_SPRITE_DIMENSIONS } from '../../config/spriteDimensions.js';
import type { Camera } from '../scenes/Camera.js';
import { screenToTile as pickScreenTile, screenToWorldPixel } from './screenCoords.js';
import { buildMapVisualLayout, type MapVisualLayout } from './mapVisualLayouts.js';
import type { MapId } from '../../shared/world/mapRegistry.js';
import { tileToWorldPixel, VisualTileKind, type VisualLandmark } from './city01VisualLayout.js';
import { FARM_ZONE_PALETTE } from './farmZone01VisualLayout.js';
import { collectFarmZone01DecorDrawables } from './farmZone01DecorRenderer.js';
import { collectPortalDrawables } from './portalRenderer.js';
import { drawGroundTileImage, preloadGroundTile, resolveGroundTileId } from './groundTileImageLoader.js';
import { PlaceholderType, resolveRankingMonitorDecalAnchors } from './placeholderRenderer.js';
import { CITY01_VISUAL_PALETTE } from './city01VisualLayout.js';
import { renderCity01PlaceholderGround, collectCity01PlaceholderStructureDrawables } from './city01PlaceholderRenderer.js';
import { sceneTileToWorld } from './city01PlaceholderLayout.js';
import type { DomNametagEntry } from './worldDomOverlay.js';
import { shouldUseLocalizedHeightStacking } from '../../shared/world/localizedHeight.js';
import type { WorldPoint } from '../../shared/world/playerEntity.js';
import { entityAtTile } from './city01PlaceholderLayout.js';
import {
  tileFootprintDepthY,
  type WorldDepthDrawable,
} from '../../shared/world/worldDepthSort.js';
import type { Disposable } from '../utils/Disposable.js';
import {
  collectMapGroundTileSnapshots,
  type WorldTerrainTileSnapshot,
} from './worldTerrainRenderSnapshot.js';
import {
  collectMapStructureSnapshots,
  type WorldStructureRenderSnapshot,
} from './worldStructureRenderSnapshot.js';

export type WorldMapClickOptions = {
  readonly doubleClick?: boolean;
};

export type WorldMapRendererOptions = {
  readonly canvas: HTMLCanvasElement;
  readonly camera: Camera;
  readonly onCanvasClick?: (screenX: number, screenY: number, options?: WorldMapClickOptions) => void;
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
 * Renderizador visual da Cidade 01 — puramente cliente.
 * Colisão/rede permanecem no mapa autoritativo (MapManager / servidor).
 *
 * Offset do mundo: camera.x / camera.y (canto superior-esquerdo do recorte 640×360).
 * NPCs humanóides: 35×54 (box) — mesmo contrato do jogador.
 * Profundidade Y-sort usa pés na base do tile — mesmo contrato do jogador.
 */
export class WorldMapRenderer implements Disposable {
  private readonly canvas: HTMLCanvasElement;
  private readonly camera: Camera;
  private readonly onCanvasClick: ((screenX: number, screenY: number, options?: WorldMapClickOptions) => void) | undefined;
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
    this.canvas = options.canvas;
    this.camera = options.camera;
    this.onCanvasClick = options.onCanvasClick;
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

  /** Tiles de chão visíveis — espelha renderGroundLayer para a camada Phaser. */
  public collectGroundTileSnapshots(): readonly WorldTerrainTileSnapshot[] {
    return collectMapGroundTileSnapshots(this.layout, {
      x: this.camera.x,
      y: this.camera.y,
      visibleWorldWidth: this.camera.visibleWorldWidth,
      visibleWorldHeight: this.camera.visibleWorldHeight,
    });
  }

  /** Estruturas/props visíveis — espelha collectStructureDrawables para Phaser. */
  public collectStructureSnapshots(
    playerWorld?: WorldPoint,
  ): readonly WorldStructureRenderSnapshot[] {
    return collectMapStructureSnapshots(this.layout, playerWorld);
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

  /** Coordenadas do ponteiro no buffer fixo 640×360 — ignora escala CSS do navegador. */
  private clampToViewport(screenX: number, screenY: number): { x: number; y: number } {
    const w = DESIGN_CONFIG.VIEWPORT.WIDTH;
    const h = DESIGN_CONFIG.VIEWPORT.HEIGHT;
    return {
      x: Math.max(0, Math.min(screenX, w)),
      y: Math.max(0, Math.min(screenY, h)),
    };
  }

  /** Retângulo de tiles visíveis — derivado da grade oficial 32px (+1 margem de desenho). */
  private getVisibleTileBounds(): {
    readonly startX: number;
    readonly startY: number;
    readonly endX: number;
    readonly endY: number;
  } {
    const tileSize = this.layout.tileSize;
    if (tileSize !== DESIGN_CONFIG.TILE.SIZE) {
      console.warn(
        `[WorldMapRenderer] tileSize ${tileSize} ≠ design ${DESIGN_CONFIG.TILE.SIZE} — câmera pode mostrar contagem errada de tiles.`,
      );
    }
    const pad = 2;
    const startX = Math.max(0, Math.floor(this.camera.x / tileSize) - pad);
    const startY = Math.max(0, Math.floor(this.camera.y / tileSize) - pad);
    const endX = Math.min(
      this.layout.mapTilesWide,
      startX + DESIGN_CONFIG.VISIBLE_TILES.WIDTH + pad * 2,
    );
    const endY = Math.min(
      this.layout.mapTilesHigh,
      startY + DESIGN_CONFIG.VISIBLE_TILES.HEIGHT + pad * 2,
    );
    return { startX, startY, endX, endY };
  }

  /** Ancoragem oficial — DESIGN_CONFIG.PLAYER (35×54), pés na base do tile do mapa. */
  public resolvePlayerDrawBounds(worldX: number, worldY: number): ReturnType<typeof getEntityVisualBounds> {
    return getEntityVisualBounds(
      { x: worldX, y: worldY },
      this.layout.tileSize,
      DESIGN_SPRITE_DIMENSIONS,
    );
  }

  /** Recorta ao buffer fixo 640×360. */
  private clipToCameraViewport(ctx: CanvasRenderingContext2D): void {
    const prior = ctx.getTransform();
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.beginPath();
    ctx.rect(0, 0, DESIGN_CONFIG.VIEWPORT.WIDTH, DESIGN_CONFIG.VIEWPORT.HEIGHT);
    ctx.clip();
    ctx.setTransform(prior);
  }

  /** Camada 0 — chão (grama, ruas, praça). Estruturas entram no Y-sort separado. */
  public renderGroundLayer(ctx: CanvasRenderingContext2D): void {
    disableCanvasImageSmoothing(ctx);
    this.clipToCameraViewport(ctx);

    if (this.layout.placeholderScene) {
      renderCity01PlaceholderGround(ctx, this.layout.placeholderScene, this.camera);
      ctx.restore();
      return;
    }

    const { tiles, tileSize } = this.layout;
    const palette = this.resolvePalette();
    const { startX, startY, endX, endY } = this.getVisibleTileBounds();

    for (let y = startY; y < endY; y++) {
      const row = tiles[y];
      if (!row) continue;

      for (let x = startX; x < endX; x++) {
        const cell = row[x];
        if (!cell) continue;

        const { x: px, y: py } = tileToWorldPixel(x, y, tileSize);
        const kind = cell.kind;
        drawSubdividedGroundCell(ctx, px, py, tileSize, (drawCtx, subX, subY, subSize) => {
          const useFarmTiles = this.layout.mapId === 'farm_zone_01';
          const groundType =
            kind === VisualTileKind.Road
              ? PlaceholderType.ROAD_TILE
              : kind === VisualTileKind.Plaza
                ? PlaceholderType.PLAZA
                : null;

          if (useFarmTiles && groundType) {
            const tileId = resolveGroundTileId(groundType);
            if (tileId) void preloadGroundTile(tileId);
            if (drawGroundTileImage(drawCtx, groundType, subX, subY, subSize)) {
              return;
            }
          }

          drawCtx.fillStyle = this.groundColor(kind, palette);
          drawCtx.fillRect(subX, subY, subSize, subSize);

          if (kind === VisualTileKind.Road || kind === VisualTileKind.Plaza) {
            drawCtx.strokeStyle = palette.gridLine;
            drawCtx.lineWidth = 1;
            drawCtx.strokeRect(subX + 0.5, subY + 0.5, subSize - 1, subSize - 1);
          }
        });
      }
    }

    ctx.restore();
  }

  /** Objetos do mapa como drawables ordenáveis por profundidade (Y). */
  public collectStructureDrawables(
    ctx: CanvasRenderingContext2D,
    playerWorld?: WorldPoint,
  ): WorldDepthDrawable[] {
    if (this.layout.placeholderScene) {
      const useLocalizedHeightStacking =
        playerWorld !== undefined &&
        shouldUseLocalizedHeightStacking(playerWorld.x, playerWorld.y);
      return collectCity01PlaceholderStructureDrawables(ctx, this.layout.placeholderScene, {
        useLocalizedHeightStacking,
      });
    }

    const drawables = this.collectLegacyObjectDrawables(ctx);
    drawables.push(...collectPortalDrawables(ctx, this.layout, performance.now()));
    if (this.layout.mapId === 'farm_zone_01') {
      drawables.push(...collectFarmZone01DecorDrawables(ctx, this.layout.tileSize));
    }
    return drawables;
  }

  private collectLegacyObjectDrawables(ctx: CanvasRenderingContext2D): WorldDepthDrawable[] {
    const { tiles, tileSize } = this.layout;
    const palette = this.resolvePalette();
    const pad = tileSize * 0.08;
    const drawables: WorldDepthDrawable[] = [];
    const { startX, startY, endX, endY } = this.getVisibleTileBounds();

    for (let y = startY; y < endY; y++) {
      const row = tiles[y];
      if (!row) continue;

      for (let x = startX; x < endX; x++) {
        const cell = row[x];
        if (!cell) continue;

        const { x: px, y: py } = tileToWorldPixel(x, y, tileSize);
        const depthY = tileFootprintDepthY(y, 1, tileSize);

        switch (cell.kind) {
          case VisualTileKind.Building:
            drawables.push({
              depthY,
              draw: () => {
                ctx.fillStyle = palette.building;
                ctx.fillRect(px + pad, py + pad, tileSize - pad * 2, tileSize - pad * 2);
                ctx.strokeStyle = palette.buildingEdge;
                ctx.lineWidth = 2;
                ctx.strokeRect(px + pad + 0.5, py + pad + 0.5, tileSize - pad * 2 - 1, tileSize - pad * 2 - 1);
              },
            });
            break;

          case VisualTileKind.Arena:
            drawables.push({
              depthY,
              draw: () => {
                const isFarmAlley = this.layout.mapId === 'farm_zone_01';
                const padX = pad * 0.5;
                const signH = tileSize * 0.22;
                ctx.fillStyle = isFarmAlley ? FARM_ZONE_PALETTE.wallAccent : palette.arena;
                ctx.fillRect(px + padX, py + pad, tileSize - padX * 2, tileSize - pad * 2);
                if (isFarmAlley) {
                  const neonColor = (x + y) % 2 === 0 ? FARM_ZONE_PALETTE.neonTeal : FARM_ZONE_PALETTE.neonMagenta;
                  ctx.fillStyle = neonColor;
                  ctx.globalAlpha = 0.85;
                  ctx.fillRect(px + padX + 4, py + pad + 6, tileSize - padX * 2 - 8, signH);
                  ctx.globalAlpha = 1;
                } else {
                  const size = tileSize * 0.5;
                  const offset = (tileSize - size) / 2;
                  ctx.strokeStyle = palette.arenaGlow;
                  ctx.lineWidth = 2;
                  ctx.strokeRect(px + offset + 0.5, py + offset + 0.5, size - 1, size - 1);
                }
              },
            });
            break;

          case VisualTileKind.Cabana: {
            const roofH = tileSize * 0.28;
            drawables.push({
              depthY,
              draw: () => {
                ctx.fillStyle = palette.cabana;
                ctx.fillRect(px + pad, py + pad + roofH * 0.4, tileSize - pad * 2, tileSize - pad * 2 - roofH * 0.4);
                ctx.fillStyle = palette.cabanaRoof;
                ctx.beginPath();
                ctx.moveTo(px + pad, py + pad + roofH);
                ctx.lineTo(px + tileSize / 2, py + pad);
                ctx.lineTo(px + tileSize - pad, py + pad + roofH);
                ctx.closePath();
                ctx.fill();
              },
            });
            break;
          }

          default:
            break;
        }
      }
    }

    return drawables;
  }

  /**
   * Labels de estruturas e portais em DOM — texto nítido fora do canvas escalado.
   */
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

  private groundColor(
    kind: string,
    palette: ReturnType<WorldMapRenderer['resolvePalette']>,
  ): string {
    switch (kind) {
      case VisualTileKind.Road:
        return palette.road;
      case VisualTileKind.Plaza:
        return palette.plaza;
      case VisualTileKind.Grass:
      default:
        return palette.grass;
    }
  }

  private resolvePalette() {
    if (this.layout.mapId === 'farm_zone_01') {
      return {
        grass: FARM_ZONE_PALETTE.alleyWet,
        road: FARM_ZONE_PALETTE.alley,
        plaza: FARM_ZONE_PALETTE.sidewalk,
        building: FARM_ZONE_PALETTE.wall,
        buildingEdge: FARM_ZONE_PALETTE.wallAccent,
        arena: FARM_ZONE_PALETTE.wallAccent,
        arenaGlow: FARM_ZONE_PALETTE.neonTeal,
        cabana: FARM_ZONE_PALETTE.wall,
        cabanaRoof: FARM_ZONE_PALETTE.wall,
        gridLine: FARM_ZONE_PALETTE.gridLine,
      };
    }
    return CITY01_VISUAL_PALETTE;
  }
  private bindInput(): void {
    if (this.bound) return;
    this.bound = true;

    this.canvas.addEventListener('mousedown', this.onPointerDown);
    this.canvas.addEventListener('mousemove', this.onPointerMove);
    window.addEventListener('mouseup', this.onPointerUp);
    this.canvas.addEventListener('mouseleave', this.onPointerLeave);
  }

  public dispose(): void {
    if (!this.bound) return;
    this.bound = false;
    this.canvas.removeEventListener('mousedown', this.onPointerDown);
    this.canvas.removeEventListener('mousemove', this.onPointerMove);
    window.removeEventListener('mouseup', this.onPointerUp);
    this.canvas.removeEventListener('mouseleave', this.onPointerLeave);
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

    const buffer = mapPointerToRenderBuffer(this.canvas, event.clientX, event.clientY);
    this.hover = this.pickHover(buffer.x, buffer.y);
  };

  private readonly onPointerUp = (event: MouseEvent): void => {
    if (event.button !== 0) return;

    if (this.pointerDown && !this.pointerDragged) {
      const now = performance.now();
      const buffer = mapPointerToRenderBuffer(this.canvas, event.clientX, event.clientY);
      const isDoubleClick =
        now - this.lastClickAtMs <= DOUBLE_CLICK_WINDOW_MS
        && Math.hypot(buffer.x - this.lastClickX, buffer.y - this.lastClickY)
          <= DOUBLE_CLICK_DISTANCE_PX;
      const viewport = this.clampToViewport(buffer.x, buffer.y);
      this.onCanvasClick?.(viewport.x, viewport.y, { doubleClick: isDoubleClick });
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