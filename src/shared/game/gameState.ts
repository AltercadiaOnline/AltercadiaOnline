import type { MapId } from '../world/mapRegistry.js';
import type { PlayerFacing } from '../world/playerFacing.js';

export const GameState = {
  Exploration: 'EXPLORATION',
  Battle: 'BATTLE',
  Transitioning: 'TRANSITIONING',
} as const;

export type GameState = (typeof GameState)[keyof typeof GameState];

/** Dados do encontro ao iniciar batalha a partir do world map. */
export type BattleEncounterData = {
  readonly monsterId: string;
  readonly monsterName: string;
  readonly mapId: MapId;
  readonly tileX: number;
  readonly tileY: number;
  readonly creatureId: string;
};

export type ExplorationSnapshot = {
  readonly mapId: MapId;
  readonly x: number;
  readonly y: number;
  readonly facing: PlayerFacing;
};

export type BattleRewardItem = {
  readonly itemId: string;
  readonly quantity: number;
};

export type BattleRewardSummary = {
  readonly xpGained: number;
  readonly items: readonly BattleRewardItem[];
  readonly dollarVoltGained: number;
};

export type BattleFinishedPayload = {
  readonly encounter: BattleEncounterData;
  readonly victory: boolean;
  readonly rewards: BattleRewardSummary;
};

export type { GameStateContextType } from './gameStateContext.js';
