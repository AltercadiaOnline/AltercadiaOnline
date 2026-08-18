/**
 * Fila PvP ranqueada 1x1 — espelho do snapshot autoritativo (online) + fallback local.
 */

import {
  PVP_RANKED_ACCEPT_COUNTDOWN_MS,
  PVP_RANKED_QUEUE_SLOT_COUNT,
  PVP_RANKED_STATION_ID,
  PVP_RANKED_STATION_LABEL,
} from '../../../shared/combat/pvp/pvpRankedQueueConfig.js';
import type { PvpRankedQueueSnapshot as WireSnapshot } from '../../../shared/combat/pvp/pvpRankedQueueProtocol.js';
import type { PlayerSkinBundleId } from '../../../shared/character/playerSkinBundle.js';
import { isLocalGameMode } from '../../runtime/gameMode.js';

export type PvpQueueSlot = {
  readonly playerId: string;
  readonly characterId?: number;
  readonly displayName: string;
  readonly ready: boolean;
  readonly isLocal: boolean;
  readonly skinBundleId: PlayerSkinBundleId;
  readonly stakeVolts: number;
  readonly stakeLocked: boolean;
};

export type PvpQueuePhase = 'idle' | 'waiting' | 'countdown' | 'starting' | 'in_battle';

export type PvpQueueSnapshot = {
  readonly objectId: string;
  readonly label: string;
  readonly phase: PvpQueuePhase;
  readonly slots: readonly [PvpQueueSlot | null, PvpQueueSlot | null];
  readonly statusMessage: string;
  readonly countdownEndsAtMs: number | null;
  readonly countdownSecondsRemaining: number | null;
  readonly exclusive: boolean;
  readonly matchId: string | null;
  readonly tableStakeVolts: number;
  readonly potVolts: number;
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
    matchId: null,
    tableStakeVolts: 0,
    potVolts: 0,
  };
}

function remainingSeconds(endsAtMs: number | null, now = Date.now()): number | null {
  if (endsAtMs === null) return null;
  return Math.max(0, Math.ceil((endsAtMs - now) / 1000));
}

function bothSlotsReady(slots: PvpQueueSnapshot['slots']): boolean {
  const filled = slots.filter(Boolean) as PvpQueueSlot[];
  return filled.length === PVP_RANKED_QUEUE_SLOT_COUNT && filled.every((slot) => slot.ready);
}

class PvpQueueStore {
  private snapshot: PvpQueueSnapshot = emptySnapshot();
  private readonly listeners = new Set<Listener>();
  private countdownInterval: ReturnType<typeof setInterval> | null = null;
  private readonly matchListeners = new Set<(snapshot: PvpQueueSnapshot) => void>();
  private readonly cancelListeners = new Set<() => void>();
  private localPlayerId: string | null = null;
  private localCharacterId: number | null = null;
  private lastMatchIdSeen: string | null = null;

  getSnapshot(): PvpQueueSnapshot {
    return this.snapshot;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  setLocalPlayerId(playerId: string, characterId?: number): void {
    this.localPlayerId = playerId;
    if (characterId !== undefined) this.localCharacterId = characterId;
  }

  private isLocalSlot(playerId: string, characterId?: number): boolean {
    if (this.localPlayerId === null || playerId !== this.localPlayerId) return false;
    if (this.localCharacterId !== null && characterId !== undefined) {
      return characterId === this.localCharacterId;
    }
    return true;
  }

  /** Online: aplica snapshot do servidor (fonte da verdade). */
  applyAuthoritativeSnapshot(
    wire: WireSnapshot,
    localPlayerId?: string,
    localCharacterId?: number,
  ): void {
    if (localPlayerId) this.localPlayerId = localPlayerId;
    if (localCharacterId !== undefined) this.localCharacterId = localCharacterId;

    const slots: PvpQueueSnapshot['slots'] = [
      wire.slots[0]
        ? {
            playerId: wire.slots[0].playerId,
            characterId: wire.slots[0].characterId,
            displayName: wire.slots[0].displayName,
            ready: wire.slots[0].ready,
            isLocal: this.isLocalSlot(wire.slots[0].playerId, wire.slots[0].characterId),
            skinBundleId: wire.slots[0].skinBundleId,
            stakeVolts: wire.slots[0].stakeVolts,
            stakeLocked: wire.slots[0].stakeLocked,
          }
        : null,
      wire.slots[1]
        ? {
            playerId: wire.slots[1].playerId,
            characterId: wire.slots[1].characterId,
            displayName: wire.slots[1].displayName,
            ready: wire.slots[1].ready,
            isLocal: this.isLocalSlot(wire.slots[1].playerId, wire.slots[1].characterId),
            skinBundleId: wire.slots[1].skinBundleId,
            stakeVolts: wire.slots[1].stakeVolts,
            stakeLocked: wire.slots[1].stakeLocked,
          }
        : null,
    ];

    const prevPhase = this.snapshot.phase;
    this.clearCountdownTimerOnly();
    this.snapshot = {
      objectId: wire.stationId,
      label: wire.label,
      phase: wire.phase,
      slots,
      statusMessage: wire.statusMessage,
      countdownEndsAtMs: wire.countdownEndsAtMs,
      countdownSecondsRemaining: remainingSeconds(wire.countdownEndsAtMs),
      exclusive: wire.exclusive,
      matchId: wire.matchId,
      tableStakeVolts: wire.tableStakeVolts,
      potVolts: wire.potVolts,
    };
    this.emit();

    if (wire.phase === 'countdown' && wire.countdownEndsAtMs !== null) {
      this.startDisplayCountdownTicks();
    }

    if (
      (wire.phase === 'starting' || wire.phase === 'in_battle')
      && wire.matchId
      && wire.matchId !== this.lastMatchIdSeen
      && (prevPhase === 'countdown' || prevPhase === 'waiting' || prevPhase === 'starting')
    ) {
      this.lastMatchIdSeen = wire.matchId;
      for (const listener of this.matchListeners) {
        listener(this.snapshot);
      }
    }
  }

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
    this.lastMatchIdSeen = null;
    this.emit();
  }

  /**
   * Local-only: ocupa slot sem servidor.
   * Online: no-op (join via WS).
   */
  ensureLocalPresent(
    playerId: string,
    displayName: string,
    skinBundleId: PlayerSkinBundleId,
  ): void {
    this.localPlayerId = playerId;
    if (!isLocalGameMode()) return;

    const existingIndex = this.snapshot.slots.findIndex((slot) => slot?.playerId === playerId);
    if (existingIndex >= 0) {
      const current = this.snapshot.slots[existingIndex]!;
      const slots = [...this.snapshot.slots] as [PvpQueueSlot | null, PvpQueueSlot | null];
      slots[existingIndex] = { ...current, displayName, skinBundleId, isLocal: true };
      this.snapshot = { ...this.snapshot, slots, exclusive: true };
      this.emit();
      return;
    }

    if (this.snapshot.phase === 'countdown' || this.snapshot.phase === 'starting') return;
    const freeIndex = this.snapshot.slots.findIndex((slot) => slot === null);
    if (freeIndex < 0) return;

    const slots = [...this.snapshot.slots] as [PvpQueueSlot | null, PvpQueueSlot | null];
    slots[freeIndex] = {
      playerId,
      displayName,
      ready: false,
      isLocal: true,
      skinBundleId,
      stakeVolts: 0,
      stakeLocked: false,
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
      matchId: null,
    };
    this.emit();
  }

  leaveLocal(playerId: string): void {
    if (!isLocalGameMode()) {
      // Online: leave via WS; limpa espelho se o painel fechou sem snapshot.
      if (this.snapshot.slots.some((s) => s?.playerId === playerId)) {
        this.clearCountdownTimerOnly();
        this.snapshot = emptySnapshot(this.snapshot.objectId, this.snapshot.label);
        this.emit();
      }
      return;
    }

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
      for (const listener of this.cancelListeners) listener();
    }
  }

  requestEnterRanked(playerId: string): void {
    if (!isLocalGameMode()) return;
    const slots = this.snapshot.slots.map((slot) => {
      if (!slot || slot.playerId !== playerId) return slot;
      return { ...slot, ready: true };
    }) as [PvpQueueSlot | null, PvpQueueSlot | null];
    this.applyLocalReadyState(slots);
  }

  cancelEnterRanked(playerId: string): void {
    if (!isLocalGameMode()) return;
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
      exclusive: true,
      matchId: null,
    };
    this.emit();
  }

  /** Local/Dev only — simula oponente. */
  fillOpponentStub(
    displayName = 'Oponente',
    skinBundleId: PlayerSkinBundleId = 'player_male_2',
  ): void {
    if (!isLocalGameMode()) return;
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
        stakeVolts: this.snapshot.slots[0]?.stakeVolts ?? 0,
        stakeLocked: false,
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
      matchId: null,
    };
    this.emit();
  }

  setOpponentReady(ready = true): void {
    if (!isLocalGameMode()) return;
    const opponent = this.snapshot.slots[1];
    if (!opponent || opponent.isLocal) return;
    const slots: PvpQueueSnapshot['slots'] = [
      this.snapshot.slots[0],
      { ...opponent, ready },
    ];
    this.applyLocalReadyState(slots);
  }

  onRankedMatchStart(listener: (snapshot: PvpQueueSnapshot) => void): () => void {
    this.matchListeners.add(listener);
    return () => this.matchListeners.delete(listener);
  }

  onSessionCancelled(listener: () => void): () => void {
    this.cancelListeners.add(listener);
    return () => this.cancelListeners.delete(listener);
  }

  private applyLocalReadyState(slots: PvpQueueSnapshot['slots']): void {
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
        matchId: null,
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
      matchId: null,
    };
    this.emit();
    this.startLocalCountdownTicks();
  }

  private startDisplayCountdownTicks(): void {
    this.clearCountdownTimerOnly();
    this.countdownInterval = setInterval(() => {
      const endsAt = this.snapshot.countdownEndsAtMs;
      if (endsAt === null || this.snapshot.phase !== 'countdown') {
        this.clearCountdownTimerOnly();
        return;
      }
      const seconds = remainingSeconds(endsAt);
      this.snapshot = {
        ...this.snapshot,
        countdownSecondsRemaining: seconds,
      };
      this.emit();
    }, 200);
  }

  private startLocalCountdownTicks(): void {
    this.clearCountdownTimerOnly();
    this.countdownInterval = setInterval(() => {
      const endsAt = this.snapshot.countdownEndsAtMs;
      if (endsAt === null) {
        this.clearCountdownTimerOnly();
        return;
      }
      const seconds = remainingSeconds(endsAt);
      if (seconds === null || seconds <= 0) {
        this.finishLocalCountdown();
        return;
      }
      this.snapshot = {
        ...this.snapshot,
        phase: 'countdown',
        countdownSecondsRemaining: seconds,
      };
      this.emit();
    }, 200);
  }

  private finishLocalCountdown(): void {
    this.clearCountdownTimerOnly();
    this.snapshot = {
      ...this.snapshot,
      phase: 'starting',
      countdownEndsAtMs: null,
      countdownSecondsRemaining: 0,
      statusMessage: 'Entrando na batalha rankeada… (local — sem duelo online)',
      exclusive: true,
      matchId: `local-${Date.now()}`,
    };
    this.emit();
    for (const listener of this.matchListeners) {
      listener(this.snapshot);
    }
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
