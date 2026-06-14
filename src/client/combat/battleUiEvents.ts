import type { BattleEndReason } from '../../shared/combat/battleEnded.js';
import type { BattleRankingResult, BattleType } from '../../shared/combat/battleType.js';

/** Eventos primordiais da UI de combate — síncronos, sem promessas de backend. */
export const BattleUiEventType = {
  /** Batalha encerrou (phase ENDED); montar hub imediatamente. */
  BATTLE_VICTORY_UI_READY: 'BATTLE_VICTORY_UI_READY',
} as const;

export type BattleUiEventType = (typeof BattleUiEventType)[keyof typeof BattleUiEventType];

export type BattleVictoryUiReadyPayload = {
  readonly battleId: string;
  readonly victory: boolean;
  readonly xpGain: number;
  readonly endReason?: BattleEndReason;
  readonly surrenderVoltPenalty?: number;
  readonly monsterInstanceId?: string;
  readonly battleType: BattleType;
  readonly rankingResult?: BattleRankingResult;
  /** Servidor indica se haverá pacote de loot PVE (4 slots). */
  readonly hasLoot?: boolean;
};

export type BattleUiEventMap = {
  readonly BATTLE_VICTORY_UI_READY: BattleVictoryUiReadyPayload;
};

type Handler = (payload: BattleUiEventMap[BattleUiEventType]) => void;

/**
 * Barramento de UI de combate — primordialidade de eventos.
 * Emissores não aguardam loot, animações ou banco de dados.
 */
class BattleUiEventBus {
  private readonly listeners = new Map<BattleUiEventType, Set<Handler>>();

  on<T extends BattleUiEventType>(
    type: T,
    handler: (payload: BattleUiEventMap[T]) => void,
  ): () => void {
    const bucket = this.listeners.get(type) ?? new Set<Handler>();
    bucket.add(handler as Handler);
    this.listeners.set(type, bucket);
    return () => {
      bucket.delete(handler as Handler);
    };
  }

  emit<T extends BattleUiEventType>(type: T, payload: BattleUiEventMap[T]): void {
    const bucket = this.listeners.get(type);
    if (!bucket) return;
    for (const handler of bucket) {
      (handler as (payload: BattleUiEventMap[T]) => void)(payload);
    }
  }

  clear(): void {
    this.listeners.clear();
  }
}

export const battleUiEvents = new BattleUiEventBus();

/** Dispara montagem do hub — chamada síncrona ao detectar phase ENDED. */
export function emitBattleVictoryUiReady(payload: BattleVictoryUiReadyPayload): void {
  console.log('DEBUG: Evento BATTLE_ENDED disparado', { battleId: payload.battleId, victory: payload.victory });
  battleUiEvents.emit(BattleUiEventType.BATTLE_VICTORY_UI_READY, payload);
}
