import type { GridStep } from '../../shared/world/gridMovement.js';
import { tryGridStep } from '../../shared/world/gridMovement.js';
import type { PlayerPositionUpdate } from '../../shared/world/protocol.js';

export type PlayerSessionStatus = 'EXPLORATION' | 'BATTLE' | 'LOGOUT';

export class Player {
  public status: PlayerSessionStatus = 'EXPLORATION';

  constructor(
    public readonly id: string,
    public readonly characterId: number,
    public x: number,
    public y: number,
  ) {}

  enterExploration(): void {
    this.status = 'EXPLORATION';
  }

  enterCombat(): void {
    this.status = 'BATTLE';
    console.log(`Jogador ${this.id} entrou em combate. Movimento bloqueado.`);
  }

  exitCombat(): void {
    this.status = 'EXPLORATION';
    console.log(`Jogador ${this.id} saiu de combate. Movimento liberado.`);
  }

  startLogout(): void {
    this.status = 'LOGOUT';
  }

  isExploring(): boolean {
    return this.status === 'EXPLORATION';
  }

  processGridStep(step: GridStep, mapData: number[][]): void {
    const next = tryGridStep({ x: this.x, y: this.y }, step, mapData);
    if (!next) return;
    this.x = next.x;
    this.y = next.y;
  }

  toSnapshot(): PlayerPositionUpdate {
    return { x: this.x, y: this.y };
  }
}
