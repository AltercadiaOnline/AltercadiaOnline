/**
 * InteractiveEntity — criatura clicável/interagível no mapa.
 */

import { getActiveMapTileSize } from '../../shared/world/activeMapTileSize.js';
import { isAdjacentTile } from '../../shared/world/tileAdjacency.js';
import { tileFootprintDepthY, type WorldDepthDrawable } from '../../shared/world/worldDepthSort.js';
import { renderCreatureOnWorldMap } from './creatureWorldRenderer.js';

export type InteractiveEntityProps = {
  readonly monsterId: string;
  readonly creatureId: string;
  readonly name: string;
  readonly tileX: number;
  readonly tileY: number;
};

export class InteractiveEntity {
  readonly monsterId: string;
  readonly creatureId: string;
  readonly name: string;
  readonly tileX: number;
  readonly tileY: number;

  private adjacent = false;
  private alertPulse = 0;

  constructor(props: InteractiveEntityProps) {
    this.monsterId = props.monsterId;
    this.creatureId = props.creatureId;
    this.name = props.name;
    this.tileX = props.tileX;
    this.tileY = props.tileY;
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
    });
  }
}
