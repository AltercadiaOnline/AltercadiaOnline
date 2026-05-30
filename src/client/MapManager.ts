import {
  TILE_SIZE,
  MAP_TILES,
  TileType,
  type TileId,
  generateMapData,
  canWalkAt,
} from '../shared/world/worldMap.js';

export {
  TILE_SIZE,
  MAP_TILES,
  TileType,
  type TileId,
  generateMapData,
  generateMapData as createMapData,
  isTileBlocking,
  tileAt,
  canWalkAt,
} from '../shared/world/worldMap.js';

const TILE_COLORS: Record<TileId, string> = {
  [TileType.Floor]: '#2c3e50',
  [TileType.Stairs]: '#34495e',
  [TileType.Wall]: '#c0392b',
  [TileType.Obstacle]: '#27ae60',
};

export class MapManager {
  private readonly tileSize = TILE_SIZE;
  private readonly mapData: number[][];

  constructor(data: number[][]) {
    this.mapData = data;
  }

  get pixelWidth(): number {
    return (this.mapData[0]?.length ?? 0) * this.tileSize;
  }

  get pixelHeight(): number {
    return this.mapData.length * this.tileSize;
  }

  canWalkAt(worldX: number, worldY: number): boolean {
    return canWalkAt(this.mapData, worldX, worldY);
  }

  render(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number): void {
    for (let y = 0; y < this.mapData.length; y++) {
      const row = this.mapData[y];
      if (!row) continue;

      for (let x = 0; x < row.length; x++) {
        const tile = row[x] ?? TileType.Floor;
        const drawX = x * this.tileSize - cameraX;
        const drawY = y * this.tileSize - cameraY;

        ctx.fillStyle = TILE_COLORS[tile as TileId] ?? TILE_COLORS[TileType.Floor]!;
        ctx.fillRect(drawX, drawY, this.tileSize, this.tileSize);

        ctx.strokeStyle = 'rgba(0,0,0,0.1)';
        ctx.strokeRect(drawX, drawY, this.tileSize, this.tileSize);
      }
    }
  }
}
