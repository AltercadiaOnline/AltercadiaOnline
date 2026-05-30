import type { MoveDirection } from '../../shared/world/protocol.js';
import type { PlayerPositionUpdate } from '../../shared/world/protocol.js';
import { applyMove } from '../../shared/world/movement.js';

export class Player {
  constructor(
    public x: number,
    public y: number,
  ) {}

  processMove(direction: MoveDirection, mapData: number[][]): void {
    const next = applyMove({ x: this.x, y: this.y }, direction, mapData);
    this.x = next.x;
    this.y = next.y;
  }

  toSnapshot(): PlayerPositionUpdate {
    return { x: this.x, y: this.y };
  }
}
