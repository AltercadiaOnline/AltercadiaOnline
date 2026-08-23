import { DESIGN_CONFIG } from '../../config/designConstants.js';
import { mapPointerToRenderBuffer } from '../layout/gameLayout.js';
import { getEntityVisualBounds } from '../../config/playerDesignAnchoring.js';
import { DESIGN_SPRITE_DIMENSIONS } from '../../config/spriteDimensions.js';
import type { Camera } from '../scenes/Camera.js';
import { screenToTile as pickScreenTile, screenToWorldPixel } from './screenCoords.js';
import { buildMapVisualLayout, type MapVisualLayout } from './mapVisualLayouts.js';
import type { MapId } from '../../shared/world/mapRegistry.js';
import type { DomNametagEntry } from './worldDomOverlay.js';
import type { Disposable } from '../utils/Disposable.js';

export type WorldMapClickOptions = {
  readonly doubleClick?: boolean;
};

export type WorldMapRendererOptions = {
  readonly inputSurface: HTMLElement;
  readonly camera: Camera;
  readonly onWorldClick?: (screenX: number, screenY: number, options?: WorldMapClickOptions) => void;
  readonly onWorldSecondaryClick?: (screenX: number, screenY: number, clientX: number, clientY: number) => void;
};

const CLICK_DRAG_THRESHOLD_PX = 5;
const DOUBLE_CLICK_WINDOW_MS = 320;
const DOUBLE_CLICK_DISTANCE_PX = 8;
const WORLD_INPUT_HIT_ID = 'world-input-hit';

export type WorldMapHoverState = {
  readonly tileX: number;
  readonly tileY: number;
};

/**
 * Um palco: `#world-input-hit` por cima do Construct.
 * Esquerdo = andar (duplo em NPC ainda abre o card). Direito no cursor = inspect personagem / pixo.
 */
export class WorldMapRenderer implements Disposable {
  private readonly inputSurface: HTMLElement;
  private readonly hitLayer: HTMLElement;
  private readonly camera: Camera;
  private readonly onWorldClick: ((screenX: number, screenY: number, options?: WorldMapClickOptions) => void) | undefined;
  private readonly onWorldSecondaryClick: ((screenX: number, screenY: number, clientX: number, clientY: number) => void) | undefined;
  private layout: MapVisualLayout;
  private hitLayerObserver: MutationObserver | null = null;

  private pointerDown = false;
  private pointerDragged = false;
  private pointerDownX = 0;
  private pointerDownY = 0;
  private lastClickAtMs = 0;
  private lastClickX = 0;
  private lastClickY = 0;
  private hover: WorldMapHoverState | null = null;
  private bound = false;
  private lastSecondaryAtMs = 0;

  constructor(options: WorldMapRendererOptions) {
    this.inputSurface = options.inputSurface;
    this.camera = options.camera;
    this.onWorldClick = options.onWorldClick;
    this.onWorldSecondaryClick = options.onWorldSecondaryClick;
    this.layout = buildMapVisualLayout('city_01');
    this.hitLayer = ensureWorldInputHitLayer(options.inputSurface);
    this.bindInput();
  }

  public getLayout(): MapVisualLayout {
    return this.layout;
  }

  public setMapId(mapId: string, cachedLayout?: MapVisualLayout): void {
    this.layout = cachedLayout ?? buildMapVisualLayout(mapId as MapId);
    this.hover = null;
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

  public collectDomLabelEntries(): DomNametagEntry[] {
    return [];
  }

  private bindInput(): void {
    this.unbindInput();
    this.bound = true;
    this.keepHitLayerOnTop();

    this.hitLayer.addEventListener('pointerdown', this.onSecondaryPointerDown);
    this.hitLayer.addEventListener('mousedown', this.onPointerDown);
    this.hitLayer.addEventListener('mousemove', this.onPointerMove);
    this.hitLayer.addEventListener('mouseleave', this.onPointerLeave);
    this.hitLayer.addEventListener('contextmenu', this.onContextMenu);
    this.hitLayer.addEventListener('selectstart', this.onSelectStart);
    this.hitLayer.addEventListener('dblclick', this.onNativeDoubleClick);
    window.addEventListener('mouseup', this.onPointerUp);
    window.addEventListener('contextmenu', this.onContextMenu, true);
  }

  private unbindInput(): void {
    if (!this.bound) return;
    this.bound = false;
    this.hitLayer.removeEventListener('pointerdown', this.onSecondaryPointerDown);
    this.hitLayer.removeEventListener('mousedown', this.onPointerDown);
    this.hitLayer.removeEventListener('mousemove', this.onPointerMove);
    this.hitLayer.removeEventListener('mouseleave', this.onPointerLeave);
    this.hitLayer.removeEventListener('contextmenu', this.onContextMenu);
    this.hitLayer.removeEventListener('selectstart', this.onSelectStart);
    this.hitLayer.removeEventListener('dblclick', this.onNativeDoubleClick);
    window.removeEventListener('mouseup', this.onPointerUp);
    window.removeEventListener('contextmenu', this.onContextMenu, true);
  }

  public dispose(): void {
    this.unbindInput();
    this.hitLayerObserver?.disconnect();
    this.hitLayerObserver = null;
  }

  private keepHitLayerOnTop(): void {
    this.hitLayerObserver?.disconnect();
    const host = this.inputSurface;
    const lift = (): void => {
      silenceConstructIframe(host);
      if (host.lastElementChild !== this.hitLayer) {
        host.appendChild(this.hitLayer);
      }
    };
    lift();
    this.hitLayerObserver = new MutationObserver(lift);
    this.hitLayerObserver.observe(host, { childList: true });
  }

  private readonly onSelectStart = (event: Event): void => {
    event.preventDefault();
  };

  private readonly onNativeDoubleClick = (event: MouseEvent): void => {
    event.preventDefault();
  };

  /** Direito no ponto do cursor: barra o menu nativo e abre a HUD. */
  private readonly onContextMenu = (event: MouseEvent): void => {
    if (!pointerOverlapsElement(this.hitLayer, event.clientX, event.clientY)) return;
    event.preventDefault();
    if (isInventoryContextTarget(event.target)) return;
    this.emitSecondary(event.clientX, event.clientY);
  };

  private readonly onSecondaryPointerDown = (event: PointerEvent): void => {
    if (event.button !== 2) return;
    event.preventDefault();
    this.emitSecondary(event.clientX, event.clientY);
  };

  private readonly onPointerDown = (event: MouseEvent): void => {
    if (event.button !== 0) return;
    if (performance.now() - this.lastSecondaryAtMs < 400) return;
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

    const suppressPrimary = performance.now() - this.lastSecondaryAtMs < 400;
    if (this.pointerDown && !this.pointerDragged && !suppressPrimary) {
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

  private emitSecondary(clientX: number, clientY: number): void {
    const now = performance.now();
    if (now - this.lastSecondaryAtMs < 400) return;
    this.lastSecondaryAtMs = now;

    const buffer = mapPointerToRenderBuffer(this.inputSurface, clientX, clientY);
    const viewport = this.clampToViewport(buffer.x, buffer.y);
    this.onWorldSecondaryClick?.(viewport.x, viewport.y, clientX, clientY);
  }

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

    return { tileX, tileY };
  }
}

function ensureWorldInputHitLayer(host: HTMLElement): HTMLElement {
  const existing = host.querySelector<HTMLElement>(`#${WORLD_INPUT_HIT_ID}`);
  if (existing) return existing;

  const layer = document.createElement('div');
  layer.id = WORLD_INPUT_HIT_ID;
  layer.setAttribute('aria-hidden', 'true');
  Object.assign(layer.style, {
    position: 'absolute',
    left: '0',
    top: '0',
    width: `${DESIGN_CONFIG.VIEWPORT.WIDTH}px`,
    height: `${DESIGN_CONFIG.VIEWPORT.HEIGHT}px`,
    zIndex: '30',
    pointerEvents: 'auto',
    background: 'transparent',
  });
  host.appendChild(layer);
  return layer;
}

function silenceConstructIframe(host: HTMLElement): void {
  const iframe = host.querySelector('iframe');
  if (iframe) {
    iframe.style.pointerEvents = 'none';
  }
  const viewport = host.querySelector<HTMLElement>('.construct-world-viewport');
  if (viewport) {
    viewport.style.pointerEvents = 'none';
  }
}

function pointerOverlapsElement(element: HTMLElement, clientX: number, clientY: number): boolean {
  const rect = element.getBoundingClientRect();
  return clientX >= rect.left
    && clientX <= rect.right
    && clientY >= rect.top
    && clientY <= rect.bottom;
}

function isInventoryContextTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return Boolean(target.closest('[data-context-menu-kind], [data-action-menu-kind]'));
}
