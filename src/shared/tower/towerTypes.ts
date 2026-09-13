/**
 * Torre de Poder — tipos públicos (contrato).
 * Autoridade: servidor. Cliente só espelha.
 */

export const TOWER_MIN_LEVEL = 10;
export const TOWER_PARTY_SIZE_MIN = 1;
export const TOWER_PARTY_SIZE_MAX = 4;
export const TOWER_ENTRY_UNLOCK_MS = 5 * 60 * 1000;
export const TOWER_CHECKPOINT_FLOOR_INTERVAL = 5;
export const TOWER_MVP_MAX_FLOOR = 5;

export type TowerFloorIndex = 1 | 2 | 3 | 4 | 5;

export type TowerMapId =
  | 'tower_gate'
  | 'tower_floor_1'
  | 'tower_floor_2'
  | 'tower_floor_3'
  | 'tower_floor_4'
  | 'tower_floor_5';

export type TowerCombatMode = 'tower_pve_squad';

/** Progressão persistida / ranking. */
export type TowerPlayerProgress = {
  readonly highestFloorCleared: number;
  /** Vezes que venceu o boss daquele andar (chave = floorIndex string). */
  readonly floorClearCounts: Readonly<Record<string, number>>;
};

/** Buff de XP de nível após sair da run (leave ou morte). */
export type TowerXpBuffState = {
  readonly percent: number;
  readonly expiresAtServerMs: number;
  /** Andares já contabilizados neste buff (não reinicia timer ao somar). */
  readonly creditedFloors: readonly number[];
};

/** Espelho público da run (state-sync). */
export type TowerRunPublicState = {
  readonly towerId: string;
  readonly partyRunId: string;
  readonly floorIndex: number;
  readonly spawnUnlocked: boolean;
  readonly unlockExpiresAtServerMs: number | null;
  readonly floorCleared: boolean;
  readonly canEvacuate: boolean;
  readonly memberIds: readonly string[];
};

export type TowerLeaderboardRow = {
  readonly characterId: string;
  readonly displayName: string;
  readonly highestFloorCleared: number;
  readonly winsAtHighestFloor: number;
};

export function isTowerCheckpointFloor(floorIndex: number): boolean {
  return floorIndex > 0 && floorIndex % TOWER_CHECKPOINT_FLOOR_INTERVAL === 0;
}

export function towerXpBuffPercentForClearedFloors(clearedFloorCount: number): number {
  return Math.max(0, Math.floor(clearedFloorCount)) * 10;
}
