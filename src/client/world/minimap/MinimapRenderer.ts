import {
  CRT_RADAR_COLORS,
  CRT_RADAR_RADIUS_TILES,
  CRT_RADAR_SIZE_PX,
} from './crtRadarConfig.js';
import type { MinimapSnapshot } from './minimapTypes.js';

/**
 * Radar CRT tático — canvas 2D leve, jogador no centro, blips vetoriais.
 * Sem texturas de terreno / overview WebP.
 */
export class MinimapRenderer {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private sweepAngleRad = -Math.PI / 2;
  private blinkPhase = 0;

  constructor(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) {
      throw new Error('[MinimapRenderer] Contexto 2D indisponível.');
    }
    this.canvas = canvas;
    this.ctx = ctx;
    this.ctx.imageSmoothingEnabled = false;
    this.ensureSize();
  }

  /** Compat — radar não usa terreno; no-op. */
  setTerrain(_terrain: unknown, _overviewImage: HTMLImageElement | null = null): void {
    this.ensureSize();
  }

  render(snapshot: MinimapSnapshot): void {
    this.ensureSize();
    const { ctx, canvas } = this;
    const size = canvas.width;
    const cx = size / 2;
    const cy = size / 2;
    const radiusPx = size * 0.46;
    const tilesToPx = radiusPx / CRT_RADAR_RADIUS_TILES;

    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = CRT_RADAR_COLORS.background;
    ctx.fillRect(0, 0, size, size);

    this.drawStaticGrid(ctx, cx, cy, radiusPx, size);
    this.drawSweep(ctx, cx, cy, radiusPx);

    const px = snapshot.playerTileX;
    const py = snapshot.playerTileY;

    for (const marker of snapshot.markers) {
      const dx = marker.tileX - px;
      const dy = marker.tileY - py;
      if (dx * dx + dy * dy > CRT_RADAR_RADIUS_TILES * CRT_RADAR_RADIUS_TILES) continue;

      const mx = cx + dx * tilesToPx;
      const my = cy + dy * tilesToPx;
      ctx.fillStyle = marker.color
        ?? (marker.kind === 'npc' ? CRT_RADAR_COLORS.npc : CRT_RADAR_COLORS.monster);
      ctx.beginPath();
      ctx.arc(mx, my, marker.kind === 'monster' ? 2.2 : 1.8, 0, Math.PI * 2);
      ctx.fill();
    }

    if (snapshot.destination) {
      const dx = snapshot.destination.tileX - px;
      const dy = snapshot.destination.tileY - py;
      if (dx * dx + dy * dy <= CRT_RADAR_RADIUS_TILES * CRT_RADAR_RADIUS_TILES) {
        const mx = cx + dx * tilesToPx;
        const my = cy + dy * tilesToPx;
        ctx.strokeStyle = CRT_RADAR_COLORS.destination;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(mx - 3, my);
        ctx.lineTo(mx + 3, my);
        ctx.moveTo(mx, my - 3);
        ctx.lineTo(mx, my + 3);
        ctx.stroke();
      }
    }

    this.drawPlayerBlip(ctx, cx, cy);
    this.advanceSweep();
  }

  private ensureSize(): void {
    if (this.canvas.width !== CRT_RADAR_SIZE_PX || this.canvas.height !== CRT_RADAR_SIZE_PX) {
      this.canvas.width = CRT_RADAR_SIZE_PX;
      this.canvas.height = CRT_RADAR_SIZE_PX;
    }
  }

  private drawStaticGrid(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    radiusPx: number,
    size: number,
  ): void {
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, radiusPx, 0, Math.PI * 2);
    ctx.clip();

    ctx.strokeStyle = CRT_RADAR_COLORS.grid;
    ctx.lineWidth = 1;
    const step = size / 8;
    for (let x = step; x < size; x += step) {
      ctx.beginPath();
      ctx.moveTo(x + 0.5, 0);
      ctx.lineTo(x + 0.5, size);
      ctx.stroke();
    }
    for (let y = step; y < size; y += step) {
      ctx.beginPath();
      ctx.moveTo(0, y + 0.5);
      ctx.lineTo(size, y + 0.5);
      ctx.stroke();
    }

    ctx.strokeStyle = CRT_RADAR_COLORS.ring;
    for (const t of [0.33, 0.66, 1]) {
      ctx.beginPath();
      ctx.arc(cx, cy, radiusPx * t, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.strokeStyle = CRT_RADAR_COLORS.crosshair;
    ctx.beginPath();
    ctx.moveTo(cx - radiusPx, cy + 0.5);
    ctx.lineTo(cx + radiusPx, cy + 0.5);
    ctx.moveTo(cx + 0.5, cy - radiusPx);
    ctx.lineTo(cx + 0.5, cy + radiusPx);
    ctx.stroke();

    ctx.restore();

    ctx.strokeStyle = CRT_RADAR_COLORS.ring;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, radiusPx, 0, Math.PI * 2);
    ctx.stroke();
  }

  private drawSweep(ctx: CanvasRenderingContext2D, cx: number, cy: number, radiusPx: number): void {
    const wedge = Math.PI / 5;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, radiusPx, this.sweepAngleRad - wedge, this.sweepAngleRad);
    ctx.closePath();
    ctx.fillStyle = CRT_RADAR_COLORS.sweep;
    ctx.fill();

    ctx.strokeStyle = CRT_RADAR_COLORS.sweepEdge;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(
      cx + Math.cos(this.sweepAngleRad) * radiusPx,
      cy + Math.sin(this.sweepAngleRad) * radiusPx,
    );
    ctx.stroke();
    ctx.restore();
  }

  private drawPlayerBlip(ctx: CanvasRenderingContext2D, cx: number, cy: number): void {
    this.blinkPhase = (this.blinkPhase + 1) % 8;
    const lit = this.blinkPhase < 5;

    if (lit) {
      ctx.fillStyle = CRT_RADAR_COLORS.playerGlow;
      ctx.beginPath();
      ctx.arc(cx, cy, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.strokeStyle = CRT_RADAR_COLORS.player;
    ctx.fillStyle = lit ? CRT_RADAR_COLORS.player : 'rgba(94, 234, 212, 0.35)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx - 4, cy);
    ctx.lineTo(cx + 4, cy);
    ctx.moveTo(cx, cy - 4);
    ctx.lineTo(cx, cy + 4);
    ctx.stroke();
    ctx.fillRect(cx - 1, cy - 1, 2, 2);
  }

  private advanceSweep(): void {
    this.sweepAngleRad += Math.PI / 10;
    if (this.sweepAngleRad > Math.PI * 2) {
      this.sweepAngleRad -= Math.PI * 2;
    }
  }
}
