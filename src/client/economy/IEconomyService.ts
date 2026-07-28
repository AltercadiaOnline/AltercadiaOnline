import type { IDataStore } from '../../shared/IDataStore.js';
import type { InventoryStack } from '../../shared/character/equipmentState.js';
import type { ClientAction } from '../ActionDispatcher.js';

export type IntentHandleResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly reason: string };

/**
 * Backend de economia/progressão — leitura (IDataStore) + processamento de intenções.
 * MockEconomyService (localhost) carregado via dynamic import — nunca no bundle prod online.
 */
export interface IEconomyService extends IDataStore {
  handleIntent(action: ClientAction, intentId: string): void;
  requestFullState(): void;
  reset(): void;
}

/** Extensões do mock dev — não usar em caminhos online. */
export interface IDevMockEconomyService extends IEconomyService {
  consumeLastBattleLootDiscardedQuantity(): number;
  syncInventoryStacksFromClient(stacks: readonly InventoryStack[], notify?: boolean): void;
  syncWalletFromStore(): void;
  /** Espelha carteira autoritativa (fuga L1) no mock + localStorage. */
  syncWalletFromAuthoritative(dollarVolt: number, alterCoins: number): void;
  /** Liga identidade do slot e hidrata save local (GAME_MODE=local). */
  bindLocalCharacter(
    playerId: string,
    characterId: number,
    options?: {
      readonly displayName?: string;
      /** Classe do hub (SSOT da criação) — obrigatória para não cair em IMPETUS. */
      readonly classId?: import('../../shared/types/classes.js').ClassType;
    },
  ): void;
  /** Persiste o estado atual no localStorage (mesmo schema do servidor). */
  persistLocalSave(): boolean;
  /** Exploration fornece posição live para o CharacterPersistenceRecord.world. */
  setLocalWorldSnapshotProvider(
    provider: (() => {
      readonly mapId: string;
      readonly x: number;
      readonly y: number;
      readonly facing: import('../../shared/world/playerFacing.js').PlayerFacing;
    } | null) | null,
  ): void;
  /** Apaga save local do personagem ligado. */
  clearLocalSave(): void;
}
