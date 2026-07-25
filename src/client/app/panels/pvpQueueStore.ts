/**
 * Fila PvP ranqueada 1x1 — espelho local no púlpito.
 *
 * Abrir sozinho = espera oponente. 1 sessão por vez (slots cheios / countdown = exclusivo).
 * Sair / fechar HUD = cancela o link. Ambos "Entrar" → countdown 10s → batalha.
 */

import {
  PVP_RANKED_ACCEPT_COUNTDOWN_MS,
  PVP_RANKED_QUEUE_SLOT_COUNT,
  PVP_RANKED_STATION_ID,
  PVP_RANKED_STATION_LABEL,
} from '../../../shared/combat/pvp/pvpRankedQueueConfig.js';
import type { PlayerSkinBundleId } from '../../../shared/character/playerSkinBundle.js';

export type PvpQueueSlot = {
  readonly playerId: string;
  readonly displayName: string;
  readonly ready: boolean;
  readonly isLocal: boolean;
  readonly skinBundleId: PlayerSkinBundleId;
};

export type PvpQueuePhase = 'idle' | 'waiting' | 'countdown' | 'starting';

export type PvpQueueSnapshot = {
  readonly objectId: string;
  readonly label: string;
  readonly phase: PvpQueuePhase;
  readonly slots: readonly [PvpQueueSlot | null, PvpQueueSlot | null];
  readonly statusMessage: string;
  readonly countdownEndsAtMs: number | null;
  readonly countdownSecondsRemaining: number | null;
  /** True enquanto a sessão está “rolando” — ninguém mais entra (base local). */
  readonly exclusive: boolean;
};

type Listener = (snapshot: PvpQueueSnapshot) => void;

const EMPTY_SLOTS: PvpQueueSnapshot['slots'] = [null, null];

function emptySnapshot(
  objectId = PVP_RANKED_STATION_ID,
  label = PVP_RANKED_STATION_LABEL,
): PvpQueueSnapshot {
  return {
    objectId,
    label,
    phase: 'idle',
    slots: EMPTY_SLOTS,
    statusMessage: 'Aguardando oponente no púlpito…',
    countdownEndsAtMs: null,
    countdownSecondsRemaining: null,
    exclusive: false,
  };
}

function bothSlotsReady(slots: PvpQueueSnapshot['slots']): boolean {
  const filled = slots.filter(Boolean) as PvpQueueSlot[];
  return filled.length === PVP_RANKED_QUEUE_SLOT_COUNT && filled.every((slot) => slot.ready);
}

function remainingSeconds(endsAtMs: number | null, now = Date.now()): number | null {
  if (endsAtMs === null) return null;
  return Math.max(0, Math.ceil((endsAtMs - now) / 1000));
}

function isExclusivePhase(phase: PvpQueuePhase, slots: PvpQueueSnapshot['slots']): boolean {
  if (phase === 'countdown' || phase === 'starting') return true;
  return slots.some(Boolean);
}

class PvpQueueStore {
  private snapshot: PvpQueueSnapshot = emptySnapshot();

  private readonly listeners = new Set<Listener>();

  private countdownInterval: ReturnType<typeof setInterval> | null = null;

  private readonly matchListeners = new Set<(snapshot: PvpQueueSnapshot) => void>();

  private readonly cancelListeners = new Set<() => void>();

  getSnapshot(): PvpQueueSnapshot {
    return this.snapshot;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Abre / foca a estação sem resetar fila ativa (evita Strict Mode limpar o slot).
   */
  openStation(objectId: string, label: string): void {
    if (
      this.snapshot.objectId === objectId
      && (this.snapshot.phase !== 'idle' || this.snapshot.slots.some(Boolean))
    ) {
      if (this.snapshot.label !== label) {
        this.snapshot = { ...this.snapshot, label };
        this.emit();
      }
      return;
    }

    this.clearCountdownTimerOnly();
    this.snapshot = {
      ...emptySnapshot(objectId, label),
      phase: 'waiting',
      statusMessage: 'Entre sozinho e espere — o oponente aparece do outro lado.',
      exclusive: false,
    };
    this.emit();
  }

  reset(): void {
    this.clearCountdownTimerOnly();
    this.snapshot = emptySnapshot(this.snapshot.objectId, this.snapshot.label);
    this.emit();
  }

  /** Ocupa slot (espelho local) — skin de exploração + nome. */
  ensureLocalPresent(
    playerId: string,
    displayName: string,
    skinBundleId: PlayerSkinBundleId,
  ): void {
    const existingIndex = this.snapshot.slots.findIndex((slot) => slot?.playerId === playerId);
    if (existingIndex >= 0) {
      const current = this.snapshot.slots[existingIndex]!;
      const slots = [...this.snapshot.slots] as [PvpQueueSlot | null, PvpQueueSlot | null];
      slots[existingIndex] = { ...current, displayName, skinBundleId };
      this.snapshot = { ...this.snapshot, slots, exclusive: isExclusivePhase(this.snapshot.phase, slots) };
      this.emit();
      return;
    }

    if (this.snapshot.phase === 'countdown' || this.snapshot.phase === 'starting') {
      return;
    }

    const freeIndex = this.snapshot.slots.findIndex((slot) => slot === null);
    if (freeIndex < 0) return;

    const slots = [...this.snapshot.slots] as [PvpQueueSlot | null, PvpQueueSlot | null];
    slots[freeIndex] = {
      playerId,
      displayName,
      ready: false,
      isLocal: true,
      skinBundleId,
    };
    this.snapshot = {
      ...this.snapshot,
      phase: 'waiting',
      slots,
      statusMessage: slots[0] && slots[1]
        ? 'Os dois estão aqui — ambos devem clicar em Entrar na batalha rankeada.'
        : 'Aguardando oponente… Ninguém mais entra enquanto a sessão estiver ativa.',
      exclusive: true,
      countdownEndsAtMs: null,
      countdownSecondsRemaining: null,
    };
    this.emit();
  }

  leaveLocal(playerId: string): void {
    const wasPresent = this.snapshot.slots.some((slot) => slot?.playerId === playerId);
    if (!wasPresent) return;

    const hadLinkedSession =
      this.snapshot.phase === 'countdown'
      || this.snapshot.phase === 'starting'
      || this.snapshot.slots.filter(Boolean).length >= 2;

    this.clearCountdownTimerOnly();
    this.snapshot = emptySnapshot(this.snapshot.objectId, this.snapshot.label);
    this.emit();

    if (hadLinkedSession) {
      for (const listener of this.cancelListeners) {
        listener();
      }
    }
  }

  /** Clica "Entrar na batalha rankeada" — marca aceite local. */
  requestEnterRanked(playerId: string): void {
    const slots = this.snapshot.slots.map((slot) => {
      if (!slot || slot.playerId !== playerId) return slot;
      return { ...slot, ready: true };
    }) as [PvpQueueSlot | null, PvpQueueSlot | null];

    this.applyReadyState(slots);
  }

  cancelEnterRanked(playerId: string): void {
    const slots = this.snapshot.slots.map((slot) => {
      if (!slot || slot.playerId !== playerId) return slot;
      return { ...slot, ready: false };
    }) as [PvpQueueSlot | null, PvpQueueSlot | null];

    this.clearCountdownTimerOnly();
    this.snapshot = {
      ...this.snapshot,
      phase: 'waiting',
      slots,
      statusMessage: 'Aceite cancelado — ambos precisam clicar em Entrar na batalha rankeada.',
      countdownEndsAtMs: null,
      countdownSecondsRemaining: null,
      exclusive: isExclusivePhase('waiting', slots),
    };
    this.emit();
  }

  /**
   * Stub local do oponente — testa HUD 2 lados sem matchmaking online.
   */
  fillOpponentStub(
    displayName = 'Oponente',
    skinBundleId: PlayerSkinBundleId = 'player_male_2',
  ): void {
    if (this.snapshot.slots[1]) return;
    if (this.snapshot.phase === 'countdown' || this.snapshot.phase === 'starting') return;

    const slots: PvpQueueSnapshot['slots'] = [
      this.snapshot.slots[0],
      {
        playerId: 'p_opponent_stub',
        displayName,
        ready: false,
        isLocal: false,
        skinBundleId,
      },
    ];
    this.snapshot = {
      ...this.snapshot,
      phase: 'waiting',
      slots,
      statusMessage: 'Oponente entrou. Ambos devem clicar em Entrar na batalha rankeada.',
      exclusive: true,
      countdownEndsAtMs: null,
      countdownSecondsRemaining: null,
    };
    this.emit();
  }

  setOpponentReady(ready = true): void {
    const opponent = this.snapshot.slots[1];
    if (!opponent || opponent.isLocal) return;
    const slots: PvpQueueSnapshot['slots'] = [
      this.snapshot.slots[0],
      { ...opponent, ready },
    ];
    this.applyReadyState(slots);
  }

  onRankedMatchStart(listener: (snapshot: PvpQueueSnapshot) => void): () => void {
    this.matchListeners.add(listener);
    return () => this.matchListeners.delete(listener);
  }

  onSessionCancelled(listener: () => void): () => void {
    this.cancelListeners.add(listener);
    return () => this.cancelListeners.delete(listener);
  }

  private applyReadyState(slots: PvpQueueSnapshot['slots']): void {
    const filled = slots.filter(Boolean) as PvpQueueSlot[];
    const ready = bothSlotsReady(slots);

    if (!ready) {
      this.clearCountdownTimerOnly();
      this.snapshot = {
        ...this.snapshot,
        phase: 'waiting',
        slots,
        statusMessage: filled.length < PVP_RANKED_QUEUE_SLOT_COUNT
          ? 'Aguardando oponente…'
          : 'Aguardando o outro jogador clicar em Entrar na batalha rankeada…',
        countdownEndsAtMs: null,
        countdownSecondsRemaining: null,
        exclusive: true,
      };
      this.emit();
      return;
    }

    const endsAt = Date.now() + PVP_RANKED_ACCEPT_COUNTDOWN_MS;
    this.snapshot = {
      ...this.snapshot,
      phase: 'countdown',
      slots,
      statusMessage: 'Ambos aceitaram — entrando na batalha rankeada…',
      countdownEndsAtMs: endsAt,
      countdownSecondsRemaining: remainingSeconds(endsAt),
      exclusive: true,
    };
    this.emit();
    this.startCountdownTicks();
  }

  private startCountdownTicks(): void {
    this.clearCountdownTimerOnly();
    this.countdownInterval = setInterval(() => {
      const endsAt = this.snapshot.countdownEndsAtMs;
      if (endsAt === null) {
        this.clearCountdownTimerOnly();
        return;
      }

      const seconds = remainingSeconds(endsAt);
      if (seconds === null || seconds <= 0) {
        this.finishCountdown();
        return;
      }

      this.snapshot = {
        ...this.snapshot,
        phase: 'countdown',
        countdownSecondsRemaining: seconds,
        statusMessage: 'Ambos aceitaram — entrando na batalha rankeada…',
      };
      this.emit();
    }, 200);
  }

  private finishCountdown(): void {
    this.clearCountdownTimerOnly();
    this.snapshot = {
      ...this.snapshot,
      phase: 'starting',
      countdownEndsAtMs: null,
      countdownSecondsRemaining: 0,
      statusMessage: 'Entrando na batalha rankeada…',
      exclusive: true,
    };
    this.emit();
    for (const listener of this.matchListeners) {
      listener(this.snapshot);
    }
    // Limpa sessão local após disparar — servidor fará a autoridade depois.
    this.snapshot = emptySnapshot(this.snapshot.objectId, this.snapshot.label);
    this.emit();
  }

  private clearCountdownTimerOnly(): void {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }
  }

  private emit(): void {
    for (const listener of this.listeners) {
      listener(this.snapshot);
    }
  }
}

type GlobalWithPvpQueue = typeof globalThis & {
  __ALTERCADIA_PVP_QUEUE_STORE__?: PvpQueueStore;
};

export function getPvpQueueStore(): PvpQueueStore {
  const g = globalThis as GlobalWithPvpQueue;
  if (!g.__ALTERCADIA_PVP_QUEUE_STORE__) {
    g.__ALTERCADIA_PVP_QUEUE_STORE__ = new PvpQueueStore();
  }
  return g.__ALTERCADIA_PVP_QUEUE_STORE__;
}
