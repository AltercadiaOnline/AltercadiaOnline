/**
 * InteractiveEntity — criatura clicável/interagível no mapa.
 */

import { getActiveMapTileSize } from '../../shared/world/activeMapTileSize.js';
import { isAdjacentTile } from '../../shared/world/tileAdjacency.js';
import { tileFootprintDepthY, type WorldDepthDrawable } from '../../shared/world/worldDepthSort.js';
import type { PlayerFacing } from '../../shared/world/playerFacing.js';
import { renderCreatureOnWorldMap } from './creatureWorldRenderer.js';

export type InteractiveEntityProps = {
  readonly monsterId: string;
  readonly creatureId: string;
  readonly name: string;
  readonly tileX: number;
  readonly tileY: number;
  /** Pés em px (Construct) — se ausente, usa centro do tile. */
  readonly worldX?: number;
  readonly worldY?: number;
  readonly facing?: PlayerFacing;
};

export class InteractiveEntity {
  readonly monsterId: string;
  readonly creatureId: string;
  readonly name: string;
  readonly tileX: number;
  readonly tileY: number;
  readonly worldX: number | undefined;
  readonly worldY: number | undefined;
  readonly facing: PlayerFacing;

  private adjacent = false;
  private alertPulse = 0;

  constructor(props: InteractiveEntityProps) {
    this.monsterId = props.monsterId;
    this.creatureId = props.creatureId;
    this.name = props.name;
    this.tileX = props.tileX;
    this.tileY = props.tileY;
    this.worldX = props.worldX;
    this.worldY = props.worldY;
    this.facing = props.facing ?? 'south';
  }

  isAdjacentToPlayer(playerTileX: number, playerTileY: number): boolean {
    return isAdjacentTile(playerTileX, playerTileY, this.tileX, this.tileY);
  }

  isAdjacent(): boolean {
    return this.adjacent;
  }

  setAdjacent(value: boolean): void {
    this.adjacent = value;
  }

  tick(deltaMs: number): void {
    if (!this.adjacent) {
      this.alertPulse = 0;
      return;
    }
    this.alertPulse += deltaMs * 0.006;
  }

  get depthY(): number {
    const tileSize = getActiveMapTileSize();
    return tileFootprintDepthY(this.tileY, 1, tileSize);
  }

  getAlertPulse(): number {
    return this.alertPulse;
  }

  collectDrawable(ctx: CanvasRenderingContext2D): WorldDepthDrawable {
    return {
      depthY: this.depthY,
      draw: () => this.render(ctx),
    };
  }

  render(ctx: CanvasRenderingContext2D): void {
    renderCreatureOnWorldMap(ctx, {
      creatureId: this.creatureId,
      tileX: this.tileX,
      tileY: this.tileY,
      adjacent: this.adjacent,
      alertPulse: this.alertPulse,
      facing: this.facing,
      ...(this.worldX !== undefined ? { worldX: this.worldX } : {}),
      ...(this.worldY !== undefined ? { worldY: this.worldY } : {}),
    });
  }
}
