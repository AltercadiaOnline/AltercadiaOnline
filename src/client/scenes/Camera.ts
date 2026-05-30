export class Camera {
  x = 0;
  y = 0;
  width: number;
  height: number;

  /** Dimensões do mapa em pixels (40 tiles × 32px). */
  readonly mapWidth = 40 * 32;
  readonly mapHeight = 40 * 32;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
  }

  setViewport(width: number, height: number): void {
    this.width = width;
    this.height = height;
  }

  update(playerX: number, playerY: number): void {
    this.x = playerX - this.width / 2;
    this.y = playerY - this.height / 2;

    this.x = Math.max(0, Math.min(this.x, this.mapWidth - this.width));
    this.y = Math.max(0, Math.min(this.y, this.mapHeight - this.height));
  }
}
