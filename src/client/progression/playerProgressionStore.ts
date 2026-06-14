import { uiEvents, UIEventType } from '../ui/uiEvents.js';
import type { MarcoRamificacaoId, PlayerProgressionData } from '../../shared/progression/playerProgressionData.js';
import { ensureMovesetMasteryForPool } from '../../shared/progression/movesetMasterySeed.js';

export type PlayerProgressionSnapshot = PlayerProgressionData;

type Listener = (snapshot: PlayerProgressionSnapshot) => void;
const DEFAULT_MILESTONE_PROGRESS = 18;

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

let store: PlayerProgressionStore | null = null;

export function getPlayerProgressionStore(): PlayerProgressionStore {
  if (!store) store = new PlayerProgressionStore();
  return store;
}

export function resetPlayerProgressionStore(): void {
  store = null;
}
