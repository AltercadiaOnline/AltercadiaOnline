import { DESIGN_CONFIG } from '../../config/designConstants.js';
import { snapToPixel } from '../render/pixelSnap.js';
import { WORLD_AXIS_IDENTITY, type WorldAxisBasis } from '../../shared/world/worldMovementAxis.js';
import {
  computeCameraZoom,
  computeViewportLetterbox,
  computeVisibleWorldSize,
} from './cameraConfig.js';
import {
  clampCameraToMapBounds,
  computeCameraFollowTarget,
  computeCameraLerpFactor,
  computeCameraSnapTarget,
  type CameraBounds,
  type CameraFollowState,
} from './cameraFollow.js';

/**
 * Câmera passiva — segue o protagonista com LERP e clamp nas bordas do mapa.
 * Sem pan manual; o foco é sempre o centro visual do jogador.
 */
export class Camera {
  /** Canto superior-esquerdo do retângulo visível (espaço do mundo). */
  x = 0;
  y = 0;
  width: number;
  height: number;
  zoom = 1;
  visibleWorldWidth = 0;
  visibleWorldHeight = 0;

  /** Offset de render — zero no buffer fixo 640×360 (letterbox só no CSS). */
  viewportOffsetX = 0;
  viewportOffsetY = 0;

  /**
   * Rotação visual em radianos (yaw). `applyTransform` usa apenas pan+zoom hoje.
   * Movimento WASD ignora rotação — ver `getKeyboardMovementBasis()`.
   */
  rotationRad = 0;

  private focusX = 0;
  private focusY = 0;
  private targetX = 0;
  private targetY = 0;

  mapWidth: number;
  mapHeight: number;

  constructor(width: number, height: number, mapWidth = 640, mapHeight = 640) {
    this.width = width;
    this.height = height;
    this.mapWidth = mapWidth;
    this.mapHeight = mapHeight;
    this.setViewport(width, height);
  }

  setMapDimensions(mapWidth: number, mapHeight: number): void {
    this.mapWidth = mapWidth;
    this.mapHeight = mapHeight;
    this.refreshVisibleSize();
    this.syncTargetToFocus();
    const clamped = clampCameraToMapBounds(this.x, this.y, this.getBounds());
    this.x = clamped.x;
    this.y = clamped.y;
    this.targetX = clamped.x;
    this.targetY = clamped.y;
  }

  /** Recorte fixo 640×360 sobre grade 40×40 @ 32px — ignora dimensões da janela. */
  setViewport(_width?: number, _height?: number): void {
    this.width = DESIGN_CONFIG.VIEWPORT.WIDTH;
    this.height = DESIGN_CONFIG.VIEWPORT.HEIGHT;
    this.zoom = computeCameraZoom(this.width, this.height);
    const letterbox = computeViewportLetterbox(this.width, this.height);
    this.viewportOffsetX = letterbox.offsetX;
    this.viewportOffsetY = letterbox.offsetY;
    this.refreshVisibleSize();
    this.syncTargetToFocus();
  }

  get effectiveZoom(): number {
    return this.zoom;
  }

  /**
   * Base de eixos para teclado — sempre identidade (norte = −Y).
   * Não deriva de transform/letterbox 16:9 da câmera.
   */
  getKeyboardMovementBasis(): WorldAxisBasis {
    return WORLD_AXIS_IDENTITY;
  }

  /** Define canto superior-esquerdo do recorte 640×360 (sincroniza alvo de LERP). */
  applyViewportPosition(x: number, y: number): void {
    this.x = x;
    this.y = y;
    this.targetX = x;
    this.targetY = y;
  }

  /** Reposiciona a câmera instantaneamente (teleporte / troca de mapa). */
  snapToFocus(focusX: number, focusY: number): void {
    this.focusX = focusX;
    this.focusY = focusY;
    const snap = computeCameraSnapTarget(this.buildFollowState());
    this.x = snap.x;
    this.y = snap.y;
    this.targetX = snap.x;
    this.targetY = snap.y;
  }

  /** @deprecated Use snapToFocus — mantido para compatibilidade. */
  snapToPlayer(playerX: number, playerY: number): void {
    this.snapToFocus(playerX, playerY);
  }

  /**
   * Segue o protagonista: target = player - viewport/2, depois LERP + clamp.
   * focusX/focusY = centro visual do sprite no mundo.
   */
  update(focusX: number, focusY: number, deltaMs = 16.67): void {
    this.focusX = focusX;
    this.focusY = focusY;
    this.syncTargetToFocus();

    const t = computeCameraLerpFactor(deltaMs);
    this.x += (this.targetX - this.x) * t;
    this.y += (this.targetY - this.y) * t;

    const clamped = clampCameraToMapBounds(this.x, this.y, this.getBounds());
    this.x = clamped.x;
    this.y = clamped.y;

    if (Math.abs(this.x - this.targetX) < 0.25) this.x = this.targetX;
    if (Math.abs(this.y - this.targetY) < 0.25) this.y = this.targetY;
  }

  private syncTargetToFocus(): void {
    const target = computeCameraFollowTarget(this.buildFollowState());
    this.targetX = target.x;
    this.targetY = target.y;
  }

  private buildFollowState(): CameraFollowState {
    return {
      focusX: this.focusX,
      focusY: this.focusY,
      bounds: this.getBounds(),
    };
  }

  private getBounds(): CameraBounds {
    return {
      mapWidth: this.mapWidth,
      mapHeight: this.mapHeight,
      viewWidth: this.visibleWorldWidth,
      viewHeight: this.visibleWorldHeight,
    };
  }

  private refreshVisibleSize(): void {
    const visible = computeVisibleWorldSize();
    this.visibleWorldWidth = visible.width;
    this.visibleWorldHeight = visible.height;
  }

  applyTransform(ctx: CanvasRenderingContext2D): void {
    const z = this.effectiveZoom;
    const snapX = snapToPixel(this.x);
    const snapY = snapToPixel(this.y);
    const tx = snapToPixel(this.viewportOffsetX - snapX * z);
    const ty = snapToPixel(this.viewportOffsetY - snapY * z);
    // Matriz afim sem rotação — escala uniforme + pan (16:9 não inclina eixos de input).
    ctx.setTransform(z, 0, 0, z, tx, ty);
  }

  resetTransform(ctx: CanvasRenderingContext2D): void {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }
}
