import type { MinimapSnapshot, MinimapTerrain } from './minimapTypes.js';

const MARKER_COLORS = {
  player: '#5eead4',
  npc: '#fbbf24',
  monster: '#f87171',
} as const;

const VIEWPORT_STROKE = 'rgba(94, 234, 212, 0.55)';
const DESTINATION_STROKE = '#f1c40f';
const DESTINATION_FILL = 'rgba(241, 196, 15, 0.85)';

/**
 * Renderiza o minimapa em canvas 1px/tile — escalado via CSS sem distorção.
 */
export class MinimapRenderer {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private terrain: MinimapTerrain | null = null;
  private terrainImage: ImageData | null = null;

  constructor(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) {
      throw new Error('[MinimapRenderer] Contexto 2D indisponível.');
    }
    this.canvas = canvas;
    this.ctx = ctx;
    this.ctx.imageSmoothingEnabled = false;
  }

  setTerrain(terrain: MinimapTerrain): void {
    if (
      this.terrain?.mapId === terrain.mapId &&
      this.terrain.tilesWide === terrain.tilesWide &&
      this.terrain.tilesHigh === terrain.tilesHigh
    ) {
      return;
    }

    this.terrain = terrain;
    this.terrainImage = this.buildTerrainImage(terrain);
    this.canvas.width = terrain.tilesWide;
    this.canvas.height = terrain.tilesHigh;
  }

  render(snapshot: MinimapSnapshot): void {
    if (!this.terrain || !this.terrainImage) return;
    if (
      this.terrain.mapId !== snapshot.mapId ||
      this.terrain.tilesWide !== snapshot.tilesWide ||
      this.terrain.tilesHigh !== snapshot.tilesHigh
    ) {
      return;
    }

    const { ctx, canvas } = this;
    ctx.putImageData(this.terrainImage, 0, 0);

    if (snapshot.viewport) {
      const { minTileX, minTileY, maxTileX, maxTileY } = snapshot.viewport;
      ctx.strokeStyle = VIEWPORT_STROKE;
      ctx.lineWidth = 1;
      ctx.strokeRect(
        minTileX + 0.5,
        minTileY + 0.5,
        Math.max(1, maxTileX - minTileX),
        Math.max(1, maxTileY - minTileY),
      );
    }

    for (const marker of snapshot.markers) {
      if (!this.isTileInBounds(marker.tileX, marker.tileY)) continue;
      ctx.fillStyle = marker.color ?? MARKER_COLORS[marker.kind];
      ctx.fillRect(marker.tileX, marker.tileY, 1, 1);
    }

    if (snapshot.destination && this.isTileInBounds(snapshot.destination.tileX, snapshot.destination.tileY)) {
      this.drawDestinationMarker(ctx, snapshot.destination.tileX, snapshot.destination.tileY);
    }

    if (this.isTileInBounds(snapshot.playerTileX, snapshot.playerTileY)) {
      ctx.fillStyle = MARKER_COLORS.player;
      ctx.fillRect(snapshot.playerTileX, snapshot.playerTileY, 1, 1);
    }
  }

  private drawDestinationMarker(ctx: CanvasRenderingContext2D, tileX: number, tileY: number): void {
    const cx = tileX + 0.5;
    const cy = tileY + 0.5;
    const arm = 0.35;

    ctx.strokeStyle = DESTINATION_STROKE;
    ctx.fillStyle = DESTINATION_FILL;
    ctx.lineWidth = 1;

    ctx.beginPath();
    ctx.moveTo(cx - arm, cy - arm);
    ctx.lineTo(cx + arm, cy + arm);
    ctx.moveTo(cx + arm, cy - arm);
    ctx.lineTo(cx - arm, cy + arm);
    ctx.stroke();

    ctx.fillRect(tileX, tileY, 1, 1);
  }

  private isTileInBounds(tileX: number, tileY: number): boolean {
    if (!this.terrain) return false;
    return (
      tileX >= 0 &&
      tileY >= 0 &&
      tileX < this.terrain.tilesWide &&
      tileY < this.terrain.tilesHigh
    );
  }

  private buildTerrainImage(terrain: MinimapTerrain): ImageData {
    const image = new ImageData(terrain.tilesWide, terrain.tilesHigh);
    const { data } = image;

    for (let y = 0; y < terrain.tilesHigh; y++) {
      for (let x = 0; x < terrain.tilesWide; x++) {
        const hex = terrain.colors[y]?.[x] ?? '#2a4a32';
        const offset = (y * terrain.tilesWide + x) * 4;
        const rgb = parseHexColor(hex);
        data[offset] = rgb.r;
        data[offset + 1] = rgb.g;
        data[offset + 2] = rgb.b;
        data[offset + 3] = 255;
      }
    }

    return image;
  }
}

function parseHexColor(hex: string): { r: number; g: number; b: number } {
  const normalized = hex.replace('#', '');
  if (normalized.length === 3) {
    return {
      r: parseInt(normalized[0]! + normalized[0], 16),
      g: parseInt(normalized[1]! + normalized[1], 16),
      b: parseInt(normalized[2]! + normalized[2], 16),
    };
  }

  return {
    r: parseInt(normalized.slice(0, 2), 16),
    g: parseInt(normalized.slice(2, 4), 16),
    b: parseInt(normalized.slice(4, 6), 16),
  };
}
