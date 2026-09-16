/**
 * Torre de Poder — tipos públicos (contrato).
 * Autoridade: servidor. Cliente só espelha.
 */

export const TOWER_MIN_LEVEL = 10;
export const TOWER_PARTY_SIZE_MIN = 1;
export const TOWER_PARTY_SIZE_MAX = 4;
/** Janela após o 1º enter: demais membros da party devem entrar no spawn. */
export const TOWER_ENTRY_WINDOW_MS = 10 * 1000;
/** Cooldown para criar party de novo após sair da torre (quem entrou). */
export const TOWER_PARTY_CREATE_COOLDOWN_MS = 5 * 60 * 1000;
/** AFK nos andares → deporta pro gate. */
export const TOWER_AFK_DEPORT_MS = 3 * 60 * 1000;
export const TOWER_CHECKPOINT_FLOOR_INTERVAL = 5;
export const TOWER_MVP_MAX_FLOOR = 5;

/** @deprecated Removido — entrada via spawn + janela 10s. Mantido só p/ imports legados. */
export const TOWER_ENTRY_UNLOCK_MS = TOWER_ENTRY_WINDOW_MS;

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

/** Espelho público da run (state-sync / intent / tower-run-sync). */
export type TowerRunPublicState = {
  readonly towerId: string;
  readonly partyRunId: string;
  readonly floorIndex: number;
  /**
   * Compat UI: true enquanto a party pode entrar (janela aberta) ou já está na run.
   * @deprecated Preferir entryWindowEndsAtServerMs + membersInRun.
   */
  readonly spawnUnlocked: boolean;
  /** @deprecated Alias de entryWindowEndsAtServerMs. */
  readonly unlockExpiresAtServerMs: number | null;
  readonly entryWindowEndsAtServerMs: number | null;
  readonly membersInRun: readonly string[];
  readonly rosterLocked: boolean;
  readonly floorCleared: boolean;
  readonly canEvacuate: boolean;
  readonly memberIds: readonly string[];
};

/** Snapshot HUD (PC / spawn / timer SINAL). */
export type TowerWorldSpawnMirror = {
  readonly currentMapId: string;
  readonly lastPosition: { readonly x: number; readonly y: number };
  readonly facing: string;
};

export type TowerHudPublicSnapshot = {
  readonly party: {
    readonly partyId: string;
    readonly leaderPlayerId: string;
    readonly members: readonly {
      readonly playerId: string;
      readonly characterId: number;
      readonly displayName: string;
      readonly ready: boolean;
      readonly inRun: boolean;
    }[];
    readonly run: TowerRunPublicState | null;
  } | null;
  readonly progress: TowerPlayerProgress | null;
  readonly fame: number;
  readonly xpBuff: TowerXpBuffState | null;
  readonly leaderboard: readonly TowerLeaderboardRow[];
  readonly towerBusy: boolean;
  readonly partyCreateCooldownEndsAtServerMs: number | null;
  /** Quando presente, cliente aplica transição de mapa (enter / leave / AFK). */
  readonly worldSpawn?: TowerWorldSpawnMirror;
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
