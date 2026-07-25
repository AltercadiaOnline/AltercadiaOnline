import { uiEvents, UIEventType } from '../ui/uiEvents.js';
import type { MarcoRamificacaoId, PlayerProgressionData } from '../../shared/progression/playerProgressionData.js';
import { ensureMovesetMasteryForPool } from '../../shared/progression/movesetMasterySeed.js';

export type PlayerProgressionSnapshot = PlayerProgressionData;

type Listener = (snapshot: PlayerProgressionSnapshot) => void;
const DEFAULT_MILESTONE_PROGRESS = 0;

class PlayerProgressionStore {
  private movesetMastery: Record<string, number> = {};
  private milestoneTotalProgress = DEFAULT_MILESTONE_PROGRESS;
  private ramificacaoSelecionada: MarcoRamificacaoId | null = null;
  private trilhaTravada = false;
  private readonly listeners = new Set<Listener>();

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.getSnapshot());
    return () => this.listeners.delete(listener);
  }

  getSnapshot(): PlayerProgressionSnapshot {
    return {
      movesetMastery: { ...this.movesetMastery },
      milestoneTotalProgress: this.milestoneTotalProgress,
      ramificacaoSelecionada: this.ramificacaoSelecionada,
      trilhaTravada: this.trilhaTravada,
    };
  }

  /** Persiste trilha escolhida (fluxo | resiliencia | precisao). */
  setRamificacaoSelecionada(ramificacao: MarcoRamificacaoId): void {
    this.ramificacaoSelecionada = ramificacao;
    this.publish();
  }

  setTrilhaTravada(locked: boolean): void {
    this.trilhaTravada = locked;
    this.publish();
  }

  /** Limpa trilha escolhida — usado pelo NPC de reset após validação externa. */
  clearMarcosTrailSelection(): void {
    this.ramificacaoSelecionada = null;
    this.trilhaTravada = false;
    this.publish();
  }

  getRamificacaoSelecionada(): string | null {
    return this.ramificacaoSelecionada;
  }

  loadFromProgressionData(data: Partial<PlayerProgressionData>): void {
    if (data.movesetMastery) this.movesetMastery = { ...data.movesetMastery };
    if (data.milestoneTotalProgress !== undefined) {
      this.milestoneTotalProgress = data.milestoneTotalProgress;
    }
    if (data.ramificacaoSelecionada !== undefined) {
      this.ramificacaoSelecionada = data.ramificacaoSelecionada;
    }
    if (data.trilhaTravada !== undefined) {
      this.trilhaTravada = data.trilhaTravada;
    }
    this.publish();
  }

  ensureMasteryForMovesets(movesetIds: readonly string[]): void {
    const hadMissing = movesetIds.some((id) => this.movesetMastery[id] === undefined);
    if (!hadMissing) return;
    this.movesetMastery = ensureMovesetMasteryForPool(this.movesetMastery, movesetIds);
    this.publish();
  }

  /** Debug / intent — define XP total de domínio de um move. */
  setMoveMasteryXp(moveId: string, masteryXp: number): void {
    const id = moveId.trim();
    if (!id) return;
    this.movesetMastery = {
      ...this.movesetMastery,
      [id]: Math.max(0, Math.floor(masteryXp)),
    };
    this.publish();
  }

  applyPenaltyResult(
    movesetMastery: Readonly<Record<string, number>>,
    milestoneTotalProgress: number,
  ): void {
    this.movesetMastery = { ...movesetMastery };
    this.milestoneTotalProgress = milestoneTotalProgress;
    this.publish();
  }

  applyBattleProgressionResult(
    movesetMastery: Readonly<Record<string, number>>,
    milestoneTotalProgress: number,
  ): void {
    this.movesetMastery = { ...movesetMastery };
    this.milestoneTotalProgress = milestoneTotalProgress;
    this.publish();
  }

  private publish(): void {
    const snapshot = this.getSnapshot();
    uiEvents.emit(UIEventType.PROGRESSION_UPDATED, snapshot);
    for (const listener of this.listeners) {
      listener(snapshot);
    }
  }
}

type GlobalWithProgressionStore = typeof globalThis & {
  __ALTERCADIA_PLAYER_PROGRESSION_STORE__?: PlayerProgressionStore | null;
};

function getProgressionStoreGlobal(): GlobalWithProgressionStore {
  return globalThis as GlobalWithProgressionStore;
}

/** Singleton cross-bundle (main.js + ui-runtime) — domínio de moves único na HUD. */
export function getPlayerProgressionStore(): PlayerProgressionStore {
  const g = getProgressionStoreGlobal();
  if (!g.__ALTERCADIA_PLAYER_PROGRESSION_STORE__) {
    g.__ALTERCADIA_PLAYER_PROGRESSION_STORE__ = new PlayerProgressionStore();
  }
  return g.__ALTERCADIA_PLAYER_PROGRESSION_STORE__;
}

export function resetPlayerProgressionStore(): void {
  const g = getProgressionStoreGlobal();
  g.__ALTERCADIA_PLAYER_PROGRESSION_STORE__ = null;
}
